import { Command } from 'commander';
import execa from 'execa';
import {
  readPackageJson,
  readRootPackageJson,
  rootPath,
  writeRootPackageJson
} from '../file';
import { desc, error, info, success } from '../info';
import path from 'path';
import fs from 'fs';
import inquirer from 'inquirer';

const platsPath = path.join(rootPath, 'plats');

function validPlatform(platform: string): boolean {
  const formDirPath = path.join(platsPath, platform);
  return fs.existsSync(formDirPath) && fs.statSync(formDirPath).isDirectory();
}

function fetchPlatforms() {
  const formDirPath = path.join(platsPath);
  const list = fs.readdirSync(formDirPath);
  return list.filter(n =>{
    const isValid = fs.existsSync(path.join(platsPath, n, 'pmnp.plat.json'));
    if (!isValid) {
      return false;
    }
    const json =
        readPackageJson(path.join(platsPath, n, 'package.json'), true) || {};
    const { scripts = {} } = json;
    return !!scripts.start;
  });
}

async function startAction({ plat: startPlat }: { plat?: string }|undefined = {}) {
  let platform = startPlat;
  const forms = fetchPlatforms();
  if (!forms.length) {
    error('Please create a platform first.');
    return;
  }
  if (!platform || !validPlatform(platform)) {
    const { plat } = await inquirer.prompt([
      {
        name: 'plat',
        type: 'list',
        message: 'Choice the platform for development.',
        choices: forms
      }
    ]);
    platform = plat;
  }
  if (!platform){
    error('The platform name should not be null, when use command `start`');
    return;
  }
  const platPath = path.join(platsPath, platform);
  info(`start developing platform: ${platform}`);
  const subprocess = execa('npm', ['start'], {
    cwd: platPath
  });
  // @ts-ignore
  subprocess.stderr.pipe(process.stderr);
  // @ts-ignore
  subprocess.stdout.pipe(process.stdout);
}

function commandStart(program: Command) {
  program
    .command('start')
    .description('start `platform` for development.')
    .option('-p, --plat <char>', 'Enter the platform for development')
    .action(startAction);
}

export { commandStart, startAction };
