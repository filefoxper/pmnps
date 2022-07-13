import { Command } from 'commander';
import execa from 'execa';
import {
  readPackageJson,
  readPackageJsonAsync,
  readRootPackageJson,
  rootPath,
  writeRootPackageJson
} from '../file';
import { desc, error, log, success, warn } from '../info';
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
    if (!current) {
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
}

async function refreshAction() {
  log('detect and install dependencies...');
  await combineDeps();
  const subprocess = execa('npm', ['install'], {
    cwd: rootPath
  });
  // @ts-ignore
  subprocess.stderr.pipe(process.stderr);
  // @ts-ignore
  subprocess.stdout.pipe(process.stdout);
  await subprocess;
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

export { commandRefresh, refreshAction, fullRefreshAction };
