import project from '../project';
import { PackageJson } from '../type';
import execa from 'execa';
import { versionCheck } from '../resource';
import path from 'path';
import { rootPath } from '../file';
import { error, log, warn } from '../info';
import { Command } from 'commander';
import {readConfig} from "@/root";

type PackageType = 'package' | 'platform';

type PackageInfo = { packageJson: PackageJson; type: PackageType };

const platsPath = path.join(rootPath, 'plats');

const packagesPath = path.join(rootPath, 'packages');

function markPackage(
  range: Array<PackageJson>,
  packs: Array<PackageJson>
): Array<PackageJson> {
  const rangeMap = new Map<string, PackageJson>(range.map(p => [p.name, p]));
  packs.forEach(p => {
    const { dependencies, devDependencies } = p;
    const allDeps = { ...dependencies, ...devDependencies };
    const deps = Object.keys(allDeps)
      .map(n => rangeMap.get(n))
      .filter((pa): pa is PackageJson => !!pa);
    p.deps = deps;
    p.used = true;
    deps.forEach(sourcePack => {
      const dets = sourcePack.dets || [];
      sourcePack.used = true;
      sourcePack.dets = [...new Set([...dets, p])];
    });
  });
  return range.filter(({ used }) => used);
}

function computeTasks<T extends { dets?: T[] }>(packs: T[]): T[][] {
  const currents = packs;
  const detSet = new Set(packs.flatMap(({ dets }) => dets || []));
  const dets = [...detSet];
  if (!dets.length) {
    return [currents];
  }
  const deps = computeTasks(dets);
  return [currents, ...deps];
}

function logBuffer(buffer: execa.ExecaSyncReturnValue | undefined) {
  if (!buffer) {
    return;
  }
  const { stdout, stderr } = buffer;
  if (stderr) {
    console.log(stderr);
  } else {
    console.log(stdout);
  }
}

async function publishPackageTask(
  tasks: PackageJson[][],
  option: { otp?: string }
) {
  if (!tasks.length) {
    return;
  }
  const [task, ...rest] = tasks;
  const builds = task.map(packageJson =>
    publishPack({ packageJson, type: 'package' }, option)
  );
  const results = await Promise.all(builds);
  results.forEach((buffer, index) => {
    const { name } = task[index];
    log(`==================== package ${name} ====================`);
    logBuffer(buffer);
  });
  if (!rest.length) {
    return;
  }
  await publishPackageTask(rest, option);
}

async function batchPublishPackages(
  range: Array<PackageJson>,
  packs: Array<PackageJson>,
  option: { otp?: string }
) {
  if (!range.length || !packs.length) {
    return;
  }
  const marked = markPackage(range, range);
  const roots = marked.filter(({ deps }) => !deps || !deps.length);
  const tasks = computeTasks(roots);
  const taskSet = new Set(packs.map(({name})=>name));
  const validTasks = tasks.map((ts)=>ts.filter(({name})=>taskSet.has(name)));
  return publishPackageTask(validTasks, option);
}

async function fetchVersion(pack: PackageJson): Promise<PackageJson | null> {
  const { name, version, private: pri } = pack;
  if (pri || !version || !name) {
    return null;
  }
  try {
    const { stdout, stderr } = await execa('npm', ['view', name, 'version']);
    if (stderr) {
      return pack;
    }
    const remoteVersion = stdout.trim();
    const isNotGreater = versionCheck(remoteVersion, version);
    if (!isNotGreater) {
      return pack;
    }
    return null;
  }catch (e){
    if(!e.toString().includes('404')){
      return null;
    }
    return pack;
  }
}

async function publishPack(info: PackageInfo, option: { otp?: string }) {
  const { otp } = option;
  const { packageJson, type } = info;
  const { name } = packageJson;
  const packEnds = name.split('/');
  const isScope =
    type === 'package' && name.startsWith('@') && packEnds.length > 1;
  const packPath = path.join(
    rootPath,
    type === 'package' ? 'packages' : 'plats',
    ...packEnds
  );
  const scopeParams = isScope ? ['--access=public'] : [];
  const otpParams = otp ? ['--otp', otp] : [];
  return execa('npm', ['publish', ...scopeParams, ...otpParams], {
    cwd: packPath
  });
}

async function publishAction(option: { otp?: string }) {
  const {publishable} = readConfig()||{};
  if (!publishable){
    warn('Please use command `config` to enable publish action first.');
    return;
  }
  const { root, packages, platforms } = await project.packageJsons();
  log('start publishing');
  const packFetches = packages.map(fetchVersion);
  const platFetches = platforms.map(fetchVersion);
  const packs = await Promise.all(packFetches);
  const validPacks = packs.filter((d): d is PackageJson => !!d);
  await batchPublishPackages(packages, validPacks, option);
  const plats = await Promise.all(platFetches);
  const validPlats = plats.filter((d): d is PackageJson => !!d);
  const publishes = validPlats.map(packageJson =>
    publishPack({ packageJson, type: 'platform' }, option)
  );
  const publishResults = await Promise.all(publishes);
  if (!validPacks.length && !validPlats.length) {
    log('nothing for publishing');
  } else {
    publishResults.forEach((d,i) => {
      const {name} = validPlats[i];
      log(`==================== platform ${name} ====================`);
      logBuffer(d);
    });
  }
}

function commandPublish(program: Command) {
  program
    .command('publish')
    .description('Publish all packages and platforms')
    .option('-o, --otp <char>', 'Set the one-time passwd for publishing')
    .action(publishAction);
}

export { commandPublish, publishAction };
