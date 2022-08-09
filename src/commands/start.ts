import { Command } from 'commander';
import execa from 'execa';
import {
  isDirectory,
  mkdirIfNotExist, readdir,
  rootPath,
} from '../file';
import {error, info, log} from '../info';
import path from 'path';
import inquirer from 'inquirer';
import {readPackageJson} from "../resource";

const platsPath = path.join(rootPath, 'plats');

function validPlatform(forms:string[],platform: string): boolean {
  return forms.includes(platform);
}

async function fetchPlatforms() {
  const formDirPath = path.join(platsPath);
  const list = await readdir(formDirPath);
  const fetchers = list.map(async (n):Promise<[string,boolean]>=>{
    const isDir = await isDirectory(path.join(platsPath, n));
    if(!isDir){
      return [n,false];
    }
    const json = await readPackageJson(path.join(platsPath, n, 'package.json'));
    if(!json){
      return [n,false];
    }
    const {scripts={}} = json;
    return [n,!!scripts.start];
  })
  const listEntries = await Promise.all(fetchers);
  return listEntries.filter(([,v])=>v).map(([n])=>n);
}

async function startAction({ name: startPlat }: { name?: string }|undefined = {}) {
  let platform = startPlat;
  await mkdirIfNotExist(platsPath);
  const forms = await fetchPlatforms();
  if (!forms.length) {
    error('Please create a platform first.');
    return;
  }
  if (!platform || !validPlatform(forms,platform)) {
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

  // exist when cancelled.
  process.on('SIGINT',()=>{
    subprocess.cancel();
  });
}

function commandStart(program: Command) {
  program
    .command('start')
    .description('start `platform` for development.')
    .option('-n, --name <char>', 'Enter the platform for development')
    .action(startAction);
}

export { commandStart, startAction };
