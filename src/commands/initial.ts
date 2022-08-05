import { Command } from 'commander';
import inquirer from 'inquirer';
import { createFileIfNotExist, mkdirIfNotExist, rootPath } from '../file';
import {error, info, log, success, warn} from '../info';
import path from 'path';
import execa from 'execa';
import { refreshAction } from './refresh';
import { writeGitIgnore, writePrettier } from '../resource';
import {
  flushConfig,
  readConfig,
  rootConfigName,
  writeConfig,
  writeRootPackageJson
} from '../root';

const projectPath = rootPath;

const packsPath = path.join(projectPath, 'packages');

const platsPath = path.join(projectPath, 'plats');

async function initialAction() {
  const { lock: isLocked } = readConfig() || {};
  if (isLocked) {
    warn(
      'The pmnps config is locked, if you want to config it, please use command `config`'
    );
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
  info('build project...');
  writeConfig({ workspace });
  const writing = Promise.all([
    mkdirIfNotExist(packsPath),
    mkdirIfNotExist(platsPath),
    writeRootPackageJson(workspace),
    writePrettier(rootPath)
  ]);
  const { git,strictPackage,private:pri } = await inquirer.prompt([
    {
      name: 'git',
      type: 'confirm',
      message: 'Is that a git project?'
    },
    {
      name:'strictPackage',
      type:'confirm',
      message:'Do you want to use strict package build mode? (make package build-able)',
      default:false
    },
    {
      name:'private',
      type:'confirm',
      message:'Is it a private project?',
      default:true
    }
  ]);
  writeConfig({strictPackage,private:pri});
  // waiting for git opening operation optimize
  await Promise.all([writing, flushConfig()]);
  if (git) {
    await writeGitIgnore(rootPath);
    await execa(
      'git',
      [
        'add',
        path.join(rootPath, 'package.json'),
        path.join(rootPath, rootConfigName),
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
      message: 'Do you want to lock pmnps config?'
    }
  ]);
  if (lock) {
    writeConfig({ lock: true });
  }
  const [result] = await Promise.all([refreshAction(), flushConfig()]);
  if(!result){
    return;
  }
  success('initial success!');
}

function commandInitial(program: Command) {
  program
    .command('initial')
    .description('Initial monorepo platforms workspace.')
    .action(initialAction);
}

export { commandInitial, initialAction };
