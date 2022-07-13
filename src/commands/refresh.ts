import { Command } from 'commander';
import execa from 'execa';
import {
  readPackageJson,
  readRootPackageJson,
  rootPath,
  writeRootPackageJson
} from '../file';
import { desc, error, success, warn } from '../info';
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

function combineDeps() {
  const root = readRootPackageJson();
  const list = fs.readdirSync(packsPath);
  const packageJson = list.reduce((data, name) => {
    const current = readPackageJson(path.join(packsPath, name, 'package.json'));
    if (!current) {
      return data;
    }
    const { dependencies, devDependencies } = current;
    return {
      ...data,
      dependencies: { ...data.dependencies, ...dependencies },
      devDependencies: { ...data.devDependencies, ...devDependencies }
    };
  }, root);
  const plats = fs.readdirSync(platsPath);
  const finalPackageJson = plats.reduce((data, name) => {
    const current = readPackageJson(path.join(platsPath, name, 'package.json'));
    if (!current) {
      return data;
    }
    const { dependencies, devDependencies } = current;
    return {
      ...data,
      dependencies: { ...data.dependencies, ...dependencies },
      devDependencies: { ...data.devDependencies, ...devDependencies }
    };
  }, packageJson);
  const validPackageJson = removeDepPacks(finalPackageJson, list);
  fs.writeFileSync(
    path.join(projectPath, 'package.json'),
    JSON.stringify(validPackageJson)
  );
}

async function refreshAction() {
  combineDeps();
  const { stdout, stderr } = await execa('npm', ['install'], {
    cwd: rootPath
  });
  if (stderr) {
    warn(stderr);
  } else {
    desc(stdout);
  }
  await execa('prettier', ['--write', path.join(rootPath, 'package.json')], {
    cwd: projectPath
  });
}

async function fullRefreshAction(){
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
