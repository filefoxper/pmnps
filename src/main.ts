import { program } from 'commander';
import { commandInitial } from './commands/initial';
import { commandRefresh } from './commands/refresh';
import { commandPack } from './commands/pack';
import { commandPlat } from './commands/plat';
import { commandStart } from './commands/start';
import { commandBuild } from './commands/build';
import execa from 'execa';
import { error } from './info';

function defineCommander() {
  program
    .name('mnp')
    .description('This is a tool to build monorepo platforms.')
    .version('1.0.2');
}

function npmSupport() {
  const { stdout } = execa.sync('npm', ['-v']);
  const validVersions = [7, 7, 0];
  const currentVersions = stdout.split('.').map(d => Number(d));
  const result = validVersions.reduce((r: number, v: number, i: number) => {
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

function startup() {
  defineCommander();
  if (!npmSupport()) {
    error('The npm version should >= 7.7.0');
    return;
  }
  commandInitial(program);
  commandRefresh(program);
  commandPack(program);
  commandPlat(program);
  commandStart(program);
  commandBuild(program);
  program.parse();
}

export { startup };
