import { program } from 'commander';
import { commandInitial, initialAction } from './commands/initial';
import {
  commandRefresh,
  fullRefreshAction,
  refreshAction
} from './commands/refresh';
import { commandPack, packAction } from './commands/pack';
import { commandPlat, platAction } from './commands/plat';
import { commandStart, startAction } from './commands/start';
import { buildAction, commandBuild } from './commands/build';
import execa from 'execa';
import { desc, error, log } from './info';
import { commandTemplate, templateAction } from './commands/template';
import inquirer from 'inquirer';
import { commandConfig, configAction } from './commands/config';
import { readConfig, readConfigAsync } from './root';
import {usePlugins} from "./plugins";

const actions: Record<string, (...args: any[]) => Promise<any>> = {
  start: startAction,
  refresh: fullRefreshAction,
  pack: packAction,
  plat: platAction,
  template: templateAction,
  build: buildAction,
  config: configAction
};

function defineCommander() {
  program
    .name('pmnps')
    .description('This is a tool to build monorepo platforms.')
    .version('1.1.0')
    .action(async () => {
      const rootConfig = readConfig();
      if (!rootConfig) {
        await initialAction();
        return;
      }
      const { action } = await inquirer.prompt([
        {
          name: 'action',
          type: 'list',
          message: 'Choice the action you want to do:',
          choices: [
            'start',
            'refresh',
            'config',
            'package',
            'platform',
            'template',
            'build'
          ],
          default: 'start'
        }
      ]);
      if (!action) {
        desc('You have choice no action to run.');
        return;
      }
      const actionCall = actions[action];
      if (!actionCall) {
        error('There is an action choice bug happen in pmnps.');
        return;
      }
      await actionCall();
    });
}

function versionCheck(current: string, limit: [number, number, number]) {
  const currentVersions = current.split('.').map(d => Number(d));
  const result = limit.reduce((r: number, v: number, i: number) => {
    const c = currentVersions[i];
    if (r !== 0) {
      return r;
    }
    if (c > v) {
      return 1;
    }
    if (c < v) {
      return -1;
    }
    return 0;
  }, 0);
  return result >= 0;
}

function nodeSupport(stdout: string) {
  const validVersions = [16, 7, 0] as [number, number, number];
  return versionCheck(
    stdout.startsWith('v') ? stdout.slice(1) : stdout,
    validVersions
  );
}

function npmSupport(stdout: string) {
  const validVersions = [7, 7, 0] as [number, number, number];
  return versionCheck(
    stdout.startsWith('v') ? stdout.slice(1) : stdout,
    validVersions
  );
}

async function startup() {
  desc('initial pmnps...');
  const [nodeV, npmV,config] = await Promise.all([
    execa('node', ['-v']),
    execa('npm', ['-v']),
    readConfigAsync()
  ]);
  if (!nodeSupport(nodeV.stdout)) {
    error('The nodejs version should >= 16.7.0');
    return;
  }
  if (!npmSupport(npmV.stdout)) {
    error('The npm version should >= 7.7.0');
    return;
  }
  if(config){
    usePlugins(config);
  }
  defineCommander();
  commandInitial(program);
  commandRefresh(program);
  commandPack(program);
  commandPlat(program);
  commandStart(program);
  commandBuild(program);
  commandTemplate(program);
  commandConfig(program);
  program.parse();
}

export { startup };
