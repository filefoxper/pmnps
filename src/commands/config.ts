import { Command } from 'commander';
import { rootPath } from '../file';
import { log, success } from '../info';
import path from 'path';
import inquirer from 'inquirer';
import { refreshAction } from './refresh';
import { flushConfig, readConfig, writeConfig } from '../root';
import project from '../project';
import { writePackageJson } from '../resource';
import { PackageJson, PlatPackageJson } from 'pmnps-plugin';
import execa from "execa";

const projectPath = rootPath;

const packsPath = path.join(projectPath, 'packages');

const platsPath = path.join(projectPath, 'plats');

async function prettierPackageJsons(
  packages: PackageJson[],
  platforms: PlatPackageJson[]
) {
  const packagePathArray =packages.map(({name})=>{
    const names = name.split('/');
    return path.join(packsPath,...names,'package.json');
  });
  const platformPathArray =platforms.map(({name})=>{
    return path.join(platsPath,name,'package.json');
  });
  const pathArray = [path.join(rootPath,'package.json'),...packagePathArray,...platformPathArray];
  await execa(
      'prettier',
      [
        '--write',
          ...pathArray
      ],
      {
        cwd: projectPath
      }
  );
}

async function setPrivate(privateValue: boolean) {
  log(`writing project to ${privateValue ? 'private' : 'public'}`);
  const { root, packages, platforms } = await project.packageJsons();
  const writingRoot = writePackageJson(path.join(rootPath, 'package.json'), {
    private: privateValue
  });
  const modifyPackages = packages.map(async pack => {
    const { name } = pack;
    const pathArray = name.split('/');
    return writePackageJson(
      path.join(packsPath, ...pathArray, 'package.json'),
      { private: privateValue }
    );
  });
  const modifyPlatforms = platforms.map(async pack => {
    const { name } = pack;
    return writePackageJson(path.join(platsPath, name, 'package.json'), {
      private: privateValue
    });
  });
  await Promise.all([
    writingRoot,
    Promise.all(modifyPackages),
    Promise.all(modifyPlatforms)
  ]);
  await prettierPackageJsons(packages,platforms);
}

const RENAME = 0b00000001;

const RE_GIT = 0b00000010;

const LOCK_OR_UNLOCK = 0b00001000;

const PACKAGE_STRICT = 0b00010000;

const PRIVATE_OR_PUBLIC = 0b00100000;

const configOptionMap = new Map([
  ['rename workspace', RENAME],
  ['active/disable git', RE_GIT],
  ['lock/unlock', LOCK_OR_UNLOCK],
  ['package build strict/loose', PACKAGE_STRICT],
  ['private/public project', PRIVATE_OR_PUBLIC]
]);

async function configAction() {
  const rootConfig = readConfig();
  if (!rootConfig) {
    return;
  }
  let {
    workspace,
    git,
    lock,
    strictPackage,
    private: pri
  } = rootConfig;
  const sourcePri = pri;
  const { configs } = await inquirer.prompt([
    {
      name: 'configs',
      type: 'checkbox',
      message: 'Please choice the config options',
      choices: [...configOptionMap.keys()]
    }
  ]);
  const codes = configs.map((k: string) => configOptionMap.get(k));
  const code = codes.reduce((r: number, c: number) => r | c, 0 as number);
  if ((code & RENAME) === RENAME) {
    const { workspace: ws } = await inquirer.prompt([
      {
        name: 'workspace',
        type: 'input',
        message: 'Please enter the workspace.'
      }
    ]);
    workspace = ws || workspace;
  }
  if ((code & RE_GIT) === RE_GIT) {
    const { git: g } = await inquirer.prompt([
      {
        name: 'git',
        type: 'confirm',
        message: `Do you want to ${git ? 'close' : 'open'} git?`
      }
    ]);
    git = g ? !git : git;
  }
  if ((code & LOCK_OR_UNLOCK) === LOCK_OR_UNLOCK) {
    const { lock: l } = await inquirer.prompt([
      {
        name: 'lock',
        type: 'confirm',
        message: `Do you want to ${lock ? 'unlock' : 'lock'} pmnps config?`
      }
    ]);
    lock = l ? !lock : lock;
  }
  if ((code & PACKAGE_STRICT) === PACKAGE_STRICT) {
    const { strictPackage: s } = await inquirer.prompt([
      {
        name: 'strictPackage',
        type: 'confirm',
        message: `Do you want to use ${
          strictPackage ? 'loose' : 'strict'
        } package build mode? (make package build-able)`,
        default: true
      }
    ]);
    strictPackage = s ? !strictPackage : strictPackage;
  }
  if ((code & PRIVATE_OR_PUBLIC) === PRIVATE_OR_PUBLIC) {
    const { private: p } = await inquirer.prompt([
      {
        name: 'private',
        type: 'confirm',
        message: `Do you want to set project ${pri ? 'public' : 'private'}?`,
        default: true
      }
    ]);
    pri = p?!pri:pri;
  }
  writeConfig({
    workspace,
    git,
    lock,
    strictPackage,
    private: pri
  });
  if (pri !== sourcePri) {
    await setPrivate(!!pri);
  }
  const [result] = await Promise.all([refreshAction(), flushConfig()]);
  if (!result) {
    return;
  }
  success('config success');
}

function commandConfig(program: Command) {
  program.command('config').description('Config pmnps.').action(configAction);
}

export { commandConfig, configAction };
