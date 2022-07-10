import { Command } from 'commander';
import execa from 'execa';
import {
  readPackageJson,
  readRootPackageJson,
  rootPath,
  writeRootPackageJson
} from '../file';
import { desc, error, info, success, warn } from '../info';
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
  return list.filter(n =>
    fs.existsSync(path.join(platsPath, n, 'pmnp.plat.json'))
  );
}

async function buildAction({ plat: startPlat }: { plat?: string }) {
  let platform = startPlat;
  const forms = fetchPlatforms();
  if (!forms.length) {
    error('Please create a platform first.');
    return;
  }
  info(
    platform
      ? `start building platform: ${platform}`
      : `start building platforms`
  );
  if (!platform) {
    const buildings = forms.map(pf => {
      return execa('npm', ['run', 'build'], { cwd: path.join(platsPath, pf) });
    });
    const results = await Promise.all(buildings);
    results.forEach((r, i) => {
      const pf = forms[i];
      const { stdout, stderr } = r;
      info(`==================== ${pf} ====================`);
      if (stderr) {
        warn(stderr);
      } else {
        desc(stdout);
      }
    });
    return;
  }
  if (!validPlatform(platform)) {
    const { plat } = await inquirer.prompt([
      {
        name: 'plat',
        type: 'list',
        message: 'Choice the platform for building.',
        choices: forms
      }
    ]);
    platform = plat;
  }
  info(`==================== ${platform || ''} ====================`);
  const subprocess = execa('npm', ['run', 'build'], {
    cwd: path.join(platsPath, platform || '')
  });
  // @ts-ignore
  subprocess.stdout.pipe(process.stdout);
}

function commandBuild(program: Command) {
  program
    .command('build')
    .description('build `platform` for production.')
    .option('-p, --plat <char>', 'Enter the platform for development')
    .action(buildAction);
}

export { commandBuild, buildAction };
