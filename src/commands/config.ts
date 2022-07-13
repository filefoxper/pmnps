import { Command } from 'commander';
import execa from 'execa';
import {
  readConfig,
  readPackageJson,
  readRootPackageJson,
  rootPath,
  writeConfig,
  writeRootPackageJson
} from '../file';
import { desc, error, success, warn } from '../info';
import path from 'path';
import fs from 'fs';
import inquirer from 'inquirer';
import { refreshAction } from './refresh';

const projectPath = rootPath;

const packsPath = path.join(projectPath, 'packages');

const platsPath = path.join(projectPath, 'plats');

const RENAME = 0b00000001;

const RE_GIT = 0b00000010;

const ADD_BUILD_MODE = 0b00000100;

const configOptionMap = new Map([
  ['rename workspace', RENAME],
  ['config git', RE_GIT],
  ['add build mode', ADD_BUILD_MODE]
]);

async function configAction() {
  const rootConfig = readConfig();
  if (!rootConfig) {
    return;
  }
  let { workspace, git, buildModes } = rootConfig;
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
  if ((code & ADD_BUILD_MODE) === ADD_BUILD_MODE) {
    const { buildMode } = await inquirer.prompt([
      {
        name: 'buildMode',
        type: 'input',
        message: 'Please enter the build mode.'
      }
    ]);
    const set = new Set([...(buildModes || []), buildMode]);
    buildModes = [...set];
  }
  writeConfig({ workspace, git, buildModes });
  await refreshAction();
  success('config success');
}

function commandConfig(program: Command) {
  program.command('config').description('Config pmnps.').action(configAction);
}

export { commandConfig, configAction };
