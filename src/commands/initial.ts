import { Command } from 'commander';
import inquirer from 'inquirer';
import {
  mkdirIfNotExist,
  rootPath,
  writeConfig,
  writeRootPackageJson,
  copyResource,
  createFileIfNotExist, readConfig
} from '../file';
import { desc, error, info, success, warn } from '../info';
import path from 'path';
import execa from 'execa';
import { refreshAction } from './refresh';
import {gitignore, prettier} from '../resource';

const projectPath = rootPath;

const packsPath = path.join(projectPath, 'packages');

const platsPath = path.join(projectPath, 'plats');

async function initialAction(){
  const {lock} = readConfig(true)||{};
  if (lock){
    info('The pmnps config is locked, if you want to config it, please use command `config`');
    return;
  }
  const { workspace } = await inquirer.prompt([
    {
      name: 'workspace',
      type: 'input',
      message: 'Please enter the workspace name',
      default() {
        return 'workspace';
      }
    }
  ]);
  try {
    info('build project...');
    writeConfig({ workspace });
    mkdirIfNotExist(packsPath);
    mkdirIfNotExist(platsPath);
    writeRootPackageJson(workspace);
    const { git } = await inquirer.prompt([
      {
        name: 'git',
        type: 'confirm',
        message: 'Is that a git project?'
      }
    ]);
    createFileIfNotExist(
        path.join(rootPath, '.prettierrc.json'),
        JSON.stringify(prettier)
    );
    if (git) {
      createFileIfNotExist(
          path.join(rootPath, '.gitignore'),
          gitignore
      );
      await execa(
          'git',
          [
            'add',
            path.join(rootPath, 'package.json'),
            path.join(rootPath, 'pmnps.json'),
            path.join(rootPath, '.prettierrc.json'),
            path.join(rootPath, '.gitignore')
          ],
          {
            cwd: rootPath
          }
      );
      writeConfig({ git: true });
    }
    const { lock } = await inquirer.prompt([
      {
        name: 'lock',
        type: 'confirm',
        message: 'Do you want to lock pmnps config?',
      }
    ]);
    if (lock){
      writeConfig({lock:true});
    }
    await refreshAction();
    success('initial success!');
  } catch (e) {
    error('initial failed!');
  }
}

function commandInitial(program: Command) {
  program
    .command('initial')
    .description('Initial monorepo platforms workspace.')
    .action(initialAction);
}

export { commandInitial,initialAction };
