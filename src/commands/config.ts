import { Command } from 'commander';
import { rootPath } from '../file';
import { success } from '../info';
import path from 'path';
import inquirer from 'inquirer';
import { refreshAction } from './refresh';
import { flushConfig, readConfig, writeConfig } from '../root';

const projectPath = rootPath;

const packsPath = path.join(projectPath, 'packages');

const platsPath = path.join(projectPath, 'plats');

const RENAME = 0b00000001;

const RE_GIT = 0b00000010;

const ADD_BUILD_MODE = 0b00000100;

const LOCK_OR_UNLOCK = 0b00001000;

const configOptionMap = new Map([
  ['rename workspace', RENAME],
  ['config git', RE_GIT],
  ['add build mode', ADD_BUILD_MODE],
  ['lock/unlock', LOCK_OR_UNLOCK]
]);

async function configAction() {
  const rootConfig = readConfig();
  if (!rootConfig) {
    return;
  }
  let { workspace, git, buildModes, lock } = rootConfig;
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
  writeConfig({ workspace, git, buildModes, lock });
  const [result] = await Promise.all([refreshAction(), flushConfig()]);
  if(!result){
    return;
  }
  success('config success');
}

function commandConfig(program: Command) {
  program.command('config').description('Config pmnps.').action(configAction);
}

export { commandConfig, configAction };
