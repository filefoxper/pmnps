import { Command } from 'commander';
import execa from 'execa';
import { isDirectory, mkdirIfNotExist, readdir, rootPath } from '../file';
import {desc, error, info, log, warn} from '../info';
import path from 'path';
import inquirer from 'inquirer';
import { installAction, packageDetect } from './refresh';
import { readConfig } from '../root';
import { readPackageJson } from '../resource';
import { ValidDetectResult } from '@/type';

const platsPath = path.join(rootPath, 'plats');

function validPlatform(forms: string[], platform: string): boolean {
  return forms.includes(platform);
}

async function fetchPlatforms(mode?: string) {
  const formDirPath = path.join(platsPath);
  const list = await readdir(formDirPath);
  const buildKey = mode ? `build-${mode}` : 'build';
  const fetchers = list.map(async (n): Promise<[string, boolean]> => {
    const isDir = await isDirectory(path.join(platsPath, n));
    if (!isDir) {
      return [n, false];
    }
    const json = await readPackageJson(path.join(platsPath, n, 'package.json'));
    if (!json) {
      return [n, false];
    }
    const { scripts = {} } = json;
    return [n, !!scripts[buildKey]];
  });
  const listEntries = await Promise.all(fetchers);
  return listEntries.filter(([, v]) => v).map(([n]) => n);
}

type PlatPackage = {
  name: string;
  pmnps?: {
    platDependencies?: string[];
    ownRoot?: boolean;
    alias?: string;
    buildHook?: { before?: string; after?: string };
  };
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
    readPackageJson(path.join(platsPath, n, 'package.json'))
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

function parseParam(
  pf: PlatPackage,
  param?: string,
  fix?: 'before' | 'after'
): string | undefined {
  if (!param) {
    return undefined;
  }
  const trimParam = param.trim();
  if (!trimParam.startsWith('?')) {
    return trimParam;
  }
  const paramString = trimParam.slice(1);
  const parts = paramString.split('&');
  const entries = parts
    .map(part => {
      const [key, value] = part.split('=');
      if (!value || !value.trim()) {
        return undefined;
      }
      return [key, value];
    })
    .filter((d): d is [string, string] => !!d);
  const { name, pmnps = {} } = pf;
  const { alias } = pmnps;
  const map = Object.fromEntries(entries);
  const nameKey = fix ? `${name}.${fix}` : name;
  if (map[nameKey]) {
    return map[nameKey];
  }
  if (!alias) {
    return undefined;
  }
  const aliasKey = fix ? `${alias}.${fix}` : alias;
  if (map[aliasKey]) {
    return map[aliasKey];
  }
  return undefined;
}

async function execBuildSmooth(pf: PlatPackage, mode?: string, param?: string) {
  const { name, pmnps = {} } = pf;
  const { buildHook = {} } = pmnps;
  const { before, after } = buildHook;
  log(`==================== ${name} ====================`);
  if (before) {
    const beforeParam = parseParam(pf, param, 'before') || '';
    const beforeBufferProcess = execa.command(before + beforeParam, {
      cwd: path.join(platsPath, name)
    });
    // @ts-ignore
    beforeBufferProcess.stderr.pipe(process.stderr);
    // @ts-ignore
    beforeBufferProcess.stdout.pipe(process.stdout);
    await beforeBufferProcess;
  }
  const pam = parseParam(pf, param);
  const bufferProcess = execa.command(
    `npm run build${mode ? '-' + mode : ''} ${pam ? '-- ' + pam : ''}`,
    {
      cwd: path.join(platsPath, name)
    }
  );
  // @ts-ignore
  bufferProcess.stderr.pipe(process.stderr);
  // @ts-ignore
  bufferProcess.stdout.pipe(process.stdout);
  await bufferProcess;
  if (after) {
    const afterParam = parseParam(pf, param, 'after') || '';
    const afterBufferProcess = execa.command(after + afterParam, {
      cwd: path.join(platsPath, name)
    });
    // @ts-ignore
    afterBufferProcess.stderr.pipe(process.stderr);
    // @ts-ignore
    afterBufferProcess.stdout.pipe(process.stdout);
    await afterBufferProcess;
  }
}

async function execBuild(pf: PlatPackage, mode?: string, param?: string) {
  const { name, pmnps = {} } = pf;
  const { buildHook = {} } = pmnps;
  const { before, after } = buildHook;
  let beforeBuffer;
  let afterBuffer;
  if (before) {
    const beforeParam = parseParam(pf, param, 'before') || '';
    beforeBuffer = await execa.command(before + beforeParam, {
      cwd: path.join(platsPath, name)
    });
  }
  const pam = parseParam(pf, param);
  const buffer = await execa.command(
    `npm run build${mode ? '-' + mode : ''} ${pam ? '-- ' + pam : ''}`,
    {
      cwd: path.join(platsPath, name)
    }
  );
  if (after) {
    const afterParam = parseParam(pf, param, 'after') || '';
    afterBuffer = await execa.command(after + afterParam, {
      cwd: path.join(platsPath, name)
    });
  }
  return {
    beforeBuffer,
    buffer,
    afterBuffer
  };
}

function logBuffer(buffer: execa.ExecaSyncReturnValue | undefined) {
  if (!buffer) {
    return;
  }
  const { stdout, stderr } = buffer;
  if (stderr) {
    warn(stderr);
  } else {
    console.log(stdout);
  }
}

async function batchBuild(
  packGroups: PlatPackage[][],
  mode?: string,
  param?: string
): Promise<void> {
  if (!packGroups.length) {
    return;
  }
  const [packs, ...rest] = packGroups;
  if (packs.length === 1) {
    await execBuildSmooth(packs[0], mode, param);
  } else {
    const runners = packs.map(pf => {
      return execBuild(pf, mode, param);
    });
    const results = await Promise.all(runners);
    results.forEach((r, i) => {
      const { beforeBuffer, buffer, afterBuffer } = r;
      const pf = packs[i];
      const { name } = pf;
      log(`==================== ${name} ====================`);
      logBuffer(beforeBuffer);
      logBuffer(buffer);
      logBuffer(afterBuffer);
    });
  }
  if (!rest.length) {
    return;
  }
  return batchBuild(rest, mode, param);
}

async function buildAction({
  name: startPlat,
  mode,
  install,
  param
}:
  | { name?: string; mode?: string; install?: boolean; param?: string }
  | undefined = {}) {
  const rootConfig = readConfig();
  if (!rootConfig) {
    return;
  }
  let platform = startPlat;
  await mkdirIfNotExist(platsPath);
  const forms = await fetchPlatforms(mode);
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
  const pfs = await resortForms(forms, platform || undefined);
  if (install) {
    const platNameSet = new Set(
      pfs.flatMap(pks => pks.map(({ name }) => name))
    );
    const plats = await packageDetect(platsPath);
    await installAction(
      plats.filter(
        (d): d is ValidDetectResult<PlatPackage> =>
          !!d.packageJson && platNameSet.has(d.packageJson.name)
      )
    );
  }
  await batchBuild(pfs, mode, param);
}

function commandBuild(program: Command) {
  program
    .command('build')
    .description('build `platform` for production.')
    .option('-n, --name <char>', 'Enter the platform name for building')
    .option('-p, --param <char>', 'Enter the platform building params')
    .option(
      '-m, --mode <char>',
      'Use a customized build mode in package.json, like `scripts["build-${mode}"]`'
    )
    .option('-i, --install', 'Install before build')
    .action(buildAction);
}

export { commandBuild, buildAction };
