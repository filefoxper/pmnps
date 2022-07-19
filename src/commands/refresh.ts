import { Command } from 'commander';
import execa from 'execa';
import { mkdirIfNotExist, rootPath } from '../file';
import { desc, error, info, log, success, warn } from '../info';
import path from 'path';
import fs from 'fs';
import { readPackageJson, writeUnForbiddenManualInstall } from '../resource';
import {
  InvalidDetectResult,
  PackageJson,
  PlatPackageJson,
  ValidDetectResult
} from '../type';
import {getPluginBundle} from "../plugins";
import {readConfig} from "../root";

const projectPath = rootPath;

const packsPath = path.join(projectPath, 'packages');

const platsPath = path.join(projectPath, 'plats');

function removeDepPacks(
  packageJson: Record<string, any>,
  packs: string[]
): Record<string, any> {
  const packSet = new Set(packs);
  const { dependencies } = packageJson;
  const e = Object.entries(dependencies).filter(([k]) => !packSet.has(k));
  const newDep = Object.fromEntries(e);
  return { ...packageJson, dependencies: newDep };
}

function packageDetect<T extends PackageJson | PlatPackageJson>(
  dirPath: string
): Promise<(ValidDetectResult<T> | InvalidDetectResult)[]> {
  if (!fs.existsSync(dirPath)) {
    return Promise.resolve([]);
  }
  const list = fs.readdirSync(dirPath);
  const fetches = list.map(dirName =>
    (async function pack() {
      const packageDirPath = path.join(dirPath, dirName);
      const packageJson = await readPackageJson<T>(
        path.join(packageDirPath, 'package.json')
      );
      return { packageJson, dirName, dirPath: packageDirPath };
    })()
  );
  return Promise.all(fetches) as Promise<
    (ValidDetectResult<T> | InvalidDetectResult)[]
  >;
}

function isOwnRootPlat(json: Record<string, any>): boolean {
  const { pmnps = {} } = json;
  const { ownRoot } = pmnps;
  return !!ownRoot;
}

async function combineDeps(): Promise<
  [ValidDetectResult<PackageJson>[], ValidDetectResult<PlatPackageJson>[]]
> {
  const [root, packs, plats] = await Promise.all([
    readPackageJson<PackageJson>(path.join(projectPath, 'package.json')),
    packageDetect<PackageJson>(packsPath),
    packageDetect<PlatPackageJson>(platsPath)
  ]);
  const packageJson = packs.reduce((data: PackageJson, pack) => {
    const { packageJson } = pack;
    if (!packageJson) {
      return data;
    }
    const { dependencies, devDependencies } = packageJson;
    return {
      ...data,
      dependencies: { ...dependencies, ...data.dependencies },
      devDependencies: { ...devDependencies, ...data.devDependencies }
    };
  }, root as PackageJson);
  const validPacks = packs.filter(
    (d): d is ValidDetectResult<PackageJson> => !!d.packageJson
  );
  const list: string[] = validPacks.map(({ packageJson }) => packageJson.name);
  const finalPackageJson = plats.reduce((data, pack) => {
    const current = pack.packageJson;
    if (!current || isOwnRootPlat(current)) {
      return data;
    }
    const { dependencies, devDependencies } = current;
    return {
      ...data,
      dependencies: { ...dependencies, ...data.dependencies },
      devDependencies: { ...devDependencies, ...data.devDependencies }
    };
  }, packageJson);
  const validPackageJson = removeDepPacks(finalPackageJson, list);
  fs.writeFileSync(
    path.join(projectPath, 'package.json'),
    JSON.stringify(validPackageJson)
  );
  return [
    validPacks,
    plats.filter(
      (d): d is ValidDetectResult<PlatPackageJson> => !!d.packageJson
    )
  ];
}

async function installOwnRootPlats(
  plats: {
    packageJson: Record<string, any> | undefined;
    dirName: string;
    dirPath: string;
  }[]
): Promise<void> {
  if (!plats.length) {
    return;
  }
  const [current, ...rest] = plats;
  const { dirPath, packageJson } = current;
  await writeUnForbiddenManualInstall(dirPath);
  log(
    `==================== install own root platform ${
      (packageJson || { name: 'unknown' }).name
    } dependencies ====================`
  );
  const subprocess = execa('npm', ['install'], {
    cwd: dirPath
  });
  // @ts-ignore
  subprocess.stderr.pipe(process.stderr);
  // @ts-ignore
  subprocess.stdout.pipe(process.stdout);
  await subprocess;
  if (!rest.length) {
    return;
  }
  return installOwnRootPlats(rest);
}

async function installAction(plats: ValidDetectResult<PlatPackageJson>[]) {
  const ownRoots = plats.filter(({ packageJson }) => {
    if (!packageJson) {
      return false;
    }
    const { pmnps } = packageJson;
    return pmnps && pmnps.ownRoot;
  });
  log(
    '==================== install project root dependencies ===================='
  );
  const subprocess = execa('npm', ['install'], {
    cwd: rootPath
  });
  // @ts-ignore
  subprocess.stderr.pipe(process.stderr);
  // @ts-ignore
  subprocess.stdout.pipe(process.stdout);
  await subprocess;
  await installOwnRootPlats(ownRoots);
  return ownRoots;
}

async function refreshAction():Promise<boolean> {
  const config = readConfig();
  if(!config){
    return false;
  }
  info('detect and install dependencies...');
  await Promise.all([mkdirIfNotExist(packsPath), mkdirIfNotExist(platsPath)]);
  const [packs, plats] = await combineDeps();
  const {refresh:{before,after}} = getPluginBundle();
  const conti = await before();
  if(!conti){
    return false;
  }
  await installAction(plats);
  await execa('prettier', ['--write', path.join(rootPath, 'package.json')], {
    cwd: projectPath
  });
  return after();
}

async function fullRefreshAction() {
  const result = await refreshAction();
  if(!result){
    return;
  }
  success('refresh success');
}

function commandRefresh(program: Command) {
  program
    .command('refresh')
    .description('Refresh `packages & plats` to link the unlink packages.')
    .action(fullRefreshAction);
}

export {
  commandRefresh,
  refreshAction,
  installAction,
  packageDetect,
  fullRefreshAction
};
