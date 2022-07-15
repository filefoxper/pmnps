import { Command } from 'commander';
import execa from 'execa';
import {
  readPackageJson,
  readPackageJsonAsync,
  readRootPackageJson,
  rootPath,
  writeRootPackageJson, writeUnForbiddenManualInstall
} from '../file';
import { desc, error, info, log, success, warn } from '../info';
import path from 'path';
import fs from 'fs';

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

function packageDetect(dirPath: string): Promise<
  {
    packageJson: Record<string, any> | undefined;
    dirName: string;
    dirPath: string;
  }[]
> {
  if (!fs.existsSync(dirPath)){
    return Promise.resolve([]);
  }
  const list = fs.readdirSync(dirPath);
  const fetches = list.map(dirName =>
    (async function pack() {
      const packageDirPath = path.join(dirPath, dirName);
      const packageJson = await readPackageJsonAsync(
        path.join(packageDirPath, 'package.json')
      );
      return { packageJson, dirName, dirPath: packageDirPath };
    })()
  );
  return Promise.all(fetches);
}

function isOwnRootPlat(json: Record<string, any>): boolean {
  const { pmnps = {} } = json;
  const { ownRoot } = pmnps;
  return !!ownRoot;
}

async function combineDeps() {
  const [root, packs, plats] = await Promise.all([
    readPackageJsonAsync(path.join(projectPath, 'package.json')),
    packageDetect(packsPath),
    packageDetect(platsPath)
  ]);
  const packageJson = packs.reduce((data: Record<string, any>, pack) => {
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
  }, root as Record<string, any>);
  const list: string[] = packs
    .map(({ packageJson }) => (packageJson ? packageJson.name : null))
    .filter((d): d is string => d);
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
  return plats;
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
  info(
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

async function installAction(plats:{
  packageJson: Record<string, any> | undefined;
  dirName: string;
  dirPath: string;
}[]){
  const ownRoots = plats.filter(({ packageJson }) => {
    if (!packageJson) {
      return false;
    }
    const { pmnps } = packageJson;
    return pmnps && pmnps.ownRoot;
  });
  info(
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
}

async function refreshAction() {
  log('detect and install dependencies...');
  if (!fs.existsSync(packsPath)){
    fs.mkdirSync(packsPath);
  }
  if (!fs.existsSync(platsPath)){
    fs.mkdirSync(platsPath);
  }
  const plats = await combineDeps();
  await installAction(plats);
  await execa('prettier', ['--write', path.join(rootPath, 'package.json')], {
    cwd: projectPath
  });
}

async function fullRefreshAction() {
  await refreshAction();
  success('refresh success');
}

function commandRefresh(program: Command) {
  program
    .command('refresh')
    .description('Refresh `packages & plats` to link the unlink packages.')
    .action(fullRefreshAction);
}

export { commandRefresh, refreshAction, installAction, packageDetect, fullRefreshAction };
