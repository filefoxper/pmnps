import { program } from 'commander';
import { initialAction } from './commands/initial';
import { commandRefresh, fullRefreshAction } from './commands/refresh';
import { commandStart, startAction } from './commands/start';
import { buildAction, commandBuild } from './commands/build';
import execa from 'execa';
import { desc, error, log } from './info';
import { commandTemplate, templateAction } from './commands/template';
import inquirer from 'inquirer';
import { commandConfig, configAction } from './commands/config';
import { readConfig, readConfigAsync } from './root';
import { usePlugins } from './plugins';
import { commandCreate, createAction } from './commands/create.command';
import { versionCheck } from './resource';
import { commandPublish, publishAction } from './commands/publish.command';

const actions: Record<string, (...args: any[]) => Promise<any>> = {
  start: startAction,
  refresh: fullRefreshAction,
  create: createAction,
  template: templateAction,
  build: buildAction,
  config: configAction,
  publish: publishAction
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
            'create',
            'template',
            'build',
            'publish'
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
  const [nodeV, npmV, config] = await Promise.all([
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
  if (config) {
    usePlugins(config);
  }
  defineCommander();
  commandRefresh(program);
  commandCreate(program);
  commandStart(program);
  commandBuild(program);
  commandTemplate(program);
  commandConfig(program);
  commandPublish(program);
  program.parse();
}

export { startup };
