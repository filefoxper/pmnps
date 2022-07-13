import { Command } from 'commander';
import execa from 'execa';
import {
  readConfig,
  readPackageJson,
  readPackageJsonAsync,
  readRootPackageJson,
  rootPath,
  writeConfig,
  writeRootPackageJson
} from '../file';
import { desc, error, info, success, warn } from '../info';
import path from 'path';
import fs from 'fs';
import inquirer from 'inquirer';
import {installAction, packageDetect} from "./refresh";

const platsPath = path.join(rootPath, 'plats');

function validPlatform(forms: string[], platform: string): boolean {
  return forms.includes(platform);
}

function fetchPlatforms(mode?: string) {
  const formDirPath = path.join(platsPath);
  const list = fs.readdirSync(formDirPath);
  const buildKey = mode ? `build-${mode}` : 'build';
  return list.filter(n => {
    const isValid = fs.existsSync(path.join(platsPath, n, 'pmnp.plat.json'));
    if (!isValid) {
      return false;
    }
    const json =
      readPackageJson(path.join(platsPath, n, 'package.json'), true) || {};
    const { scripts = {} } = json;
    return !!scripts[buildKey];
  });
}

type PlatPackage = {
  name: string;
  pmnps?: { platDependencies: string[] };
  deps: PlatPackage[];
  dets: PlatPackage[];
  level: number;
};

function analyzePlatDependencies(packages: PlatPackage[]) {
  const packMap = new Map(packages.map(pack => [pack.name, pack]));
  packages.forEach(pack => {
    const { pmnps } = pack;
    if (!pmnps) {
      return;
    }
    const { platDependencies = [] } = pmnps;
    const sources = platDependencies
      .map(plat => packMap.get(plat))
      .filter((d): d is PlatPackage => !!d);
    pack.deps = sources;
    sources.forEach(sourcePack => {
      const dets = sourcePack.dets || [];
      sourcePack.dets = [...new Set([...dets, pack])];
    });
  });
  return packages.filter(({ deps }) => !deps || !deps.length);
}

function computeTasks(packs: PlatPackage[]): PlatPackage[][] {
  const currents = packs;
  const detSet = new Set(packs.flatMap(({ dets }) => dets || []));
  const dets = [...detSet];
  if (!dets.length) {
    return [currents];
  }
  const deps = computeTasks(dets);
  return [currents, ...deps];
}

function computeTaskDeps(
  deps: PlatPackage[] = [],
  level: number = 0
): PlatPackage[] {
  const result = deps.flatMap(pack => {
    pack.level = level;
    if (pack.deps && pack.deps.length) {
      const currentDeps = computeTaskDeps(pack.deps, level + 1);
      return [...currentDeps, pack];
    }
    return pack;
  });
  return [...new Set(result)];
}

async function resortForms(
  formRange: string[],
  form?: string
): Promise<Array<PlatPackage[]>> {
  const fetches = formRange.map(n =>
    readPackageJsonAsync(path.join(platsPath, n, 'package.json'))
  );
  const allPackages = await Promise.all(fetches);
  const roots = analyzePlatDependencies(allPackages as PlatPackage[]);
  const all = computeTasks(roots);
  if (!form) {
    return all;
  }
  const allTasks = all.flat();
  const found = allTasks.find(({ name }) => name === form);
  if (!found) {
    return [];
  }
  const deps = computeTaskDeps([found]);
  const levels: Array<PlatPackage[]> = [];
  deps.forEach(dep => {
    const index = dep.level;
    levels[index] = Array.isArray(levels[index]) ? levels[index] : [];
    levels[index].push(dep);
  });
  return levels.reverse();
}

async function batchBuild(
  packGroups: PlatPackage[][],
  mode?: string
): Promise<void> {
  if (!packGroups.length) {
    return;
  }
  const [packs, ...rest] = packGroups;
  const runners = packs.map(pf => {
    return execa('npm', ['run', mode ? `build-${mode}` : 'build'], {
      cwd: path.join(platsPath, pf.name)
    });
  });
  const results = await Promise.all(runners);
  results.forEach((r, i) => {
    const pf = packs[i];
    const { name } = pf;
    const { stdout, stderr } = r;
    info(`==================== ${name} ====================`);
    if (stderr) {
      warn(stderr);
    } else {
      desc(stdout);
    }
  });
  if (!rest.length) {
    return;
  }
  return batchBuild(rest,mode);
}

async function buildAction({
  plat: startPlat,
  mode,
  install
}: { plat?: string; mode?: string; install?: boolean } | undefined = {}) {
  const rootConfig = readConfig();
  if (!rootConfig) {
    return;
  }
  let platform = startPlat;
  const forms = fetchPlatforms(mode);
  if (!forms.length) {
    error('Please create a platform first.');
    return;
  }
  if (platform && !validPlatform(forms, platform)) {
    const { plat } = await inquirer.prompt([
      {
        name: 'plat',
        type: 'list',
        message: 'Choice the platform for building.',
        choices: forms
      }
    ]);
    platform = plat;
  }
  info(
    platform
      ? `start building platform: ${platform}`
      : `start building platforms`
  );
  if (install){
    const plats = await packageDetect(platsPath);
    await installAction(plats);
  }
  const pfs = await resortForms(forms, platform || undefined);
  await batchBuild(pfs,mode);
}

function commandBuild(program: Command) {
  program
    .command('build')
    .description('build `platform` for production.')
    .option('-p, --plat <char>', 'Enter the platform for development')
    .option(
      '-m, --mode <char>',
      'Use a customized build mode in package.json, like `scripts["build-${mode}"]`'
    )
    .option('-i, --install', 'Install before build')
    .action(buildAction);
}

export { commandBuild, buildAction };
