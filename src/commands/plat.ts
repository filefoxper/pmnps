import { Command } from 'commander';
import execa from 'execa';
import inquirer from 'inquirer';
import {
  createFileIntoDirIfNotExist,
  mkdirIfNotExist,
  rootPath,
  copyFolder,
  writeJsonAsync,
  isFile,
  readdir,
  isDirectory,
  readJsonAsync,
  unlink
} from '../file';
import path from 'path';
import {
  basicDevDependencies,
  readPackageJson,
  writeForbiddenManualInstall,
  writePackageJson,
  writePrettier
} from '../resource';
import fs from 'fs';
import { Config } from '../type';
import { refreshAction } from './refresh';
import {info, log, success, warn} from '../info';
import { readConfig } from '../root';

const platsPath = path.join(rootPath, 'plats');

async function createPlatPackageJson(
  name: string,
  fileEnd: string,
  useReact: boolean,
  rootConfig: Config
) {
  const isTs = fileEnd.startsWith('ts');
  const packageJsonPath = path.join(platsPath, name, 'package.json');
  const tsDep = isTs ? { typescript: '4.5.5' } : {};
  const reactDep = useReact
    ? {
        react: '16.14.0',
        'react-dom': '16.14.0'
      }
    : {};
  const { buildModes = [] } = rootConfig;
  const modeEntries = buildModes.map((mode: string) => [
    `build-${mode}`,
    'echo Please edit a build script.'
  ]);
  const buildModeScripts = Object.fromEntries(modeEntries);
  const json = {
    name,
    description: 'This is a package in monorepo project',
    version: '1.0.0',
    scripts: {
      start: 'echo Please edit a start script.',
      build: 'echo Please edit a build script.',
      ...buildModeScripts
    },
    dependencies: reactDep,
    devDependencies: {
      ...basicDevDependencies,
      ...tsDep
    }
  };
  return writePackageJson(packageJsonPath, json);
}

async function createTsConfig(
  name: string,
  fileEnd: 'ts' | 'tsx' | 'js' | 'jsx',
  useReact: boolean
) {
  const packRootPath = path.join(platsPath, name);
  const noTsConfig = fileEnd.startsWith('j');
  if (noTsConfig) {
    return;
  }
  const compilerOptions = {
    target: 'esnext',
    module: 'esnext',
    lib: ['es2019', 'dom'],
    moduleResolution: 'node',
    resolveJsonModule: true,
    importHelpers: true,
    esModuleInterop: true,
    baseUrl: './',
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    paths: {
      '@/*': ['src/*'],
      '@test/*': ['test/*']
    },
    noImplicitAny: false,
    allowSyntheticDefaultImports: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true
  };
  const tsConfig = {
    compilerOptions: useReact
      ? { ...compilerOptions, jsx: 'react' }
      : compilerOptions,
    exclude: ['node_modules']
  };
  const tsPath = path.join(packRootPath, 'tsconfig.json');
  const file = await isFile(tsPath);
  if (file) {
    return;
  }
  return writeJsonAsync(tsPath, tsConfig);
}

async function readTemplates(): Promise<string[]> {
  const templatesPath = path.join(rootPath, 'templates');
  if (
    !fs.existsSync(templatesPath) ||
    !fs.statSync(templatesPath).isDirectory()
  ) {
    return [];
  }
  const list = await readdir(templatesPath);
  const fetchers = list.map(async (d): Promise<[string, boolean]> => {
    const detailPath = path.join(templatesPath, d);
    const detailConfigPath = path.join(detailPath, 'pmnps.template.json');
    const [dir, file] = await Promise.all([
      isDirectory(detailPath),
      isFile(detailConfigPath)
    ]);
    if (!dir || !file) {
      return [d, false];
    }
    const { type } = await readJsonAsync(detailConfigPath);
    return [d, type === 'platform'];
  });
  const listEntries = await Promise.all(fetchers);
  const validListEntries = listEntries.filter(([, v]) => v);
  return validListEntries.map(([d]) => d);
}

async function copyProject(name: string, tempName: string) {
  await copyFolder(
    path.join(rootPath, 'templates', tempName),
    path.join(platsPath, name)
  );
  return Promise.all([
    writePackageJson(path.join(platsPath, name, 'package.json'), { name }),
    unlink(path.join(platsPath, name, 'pmnps.template.json'))
  ]);
}

async function copyTemplate(name: string): Promise<boolean> {
  let useTemplate = false;
  const templates = await readTemplates();
  if (templates.length) {
    const { useTemp } = await inquirer.prompt([
      {
        name: 'useTemp',
        type: 'confirm',
        message: 'There are some templates, do you want to use them?'
      }
    ]);
    useTemplate = useTemp;
  }
  if (useTemplate && templates.length) {
    if (templates.length === 1) {
      const [tempName] = templates;
      await copyProject(name, tempName);
      return true;
    }
    const { temp } = await inquirer.prompt([
      {
        name: 'temp',
        type: 'list',
        message: 'Please choice your template:',
        choices: templates,
        default: templates[0]
      }
    ]);
    await copyProject(name, temp);
    return true;
  }
  return false;
}

async function createPlat(
  name: string,
  fileEnd: 'ts' | 'tsx' | 'js' | 'jsx',
  useReact: boolean,
  rootConfig: Config
) {
  await mkdirIfNotExist(path.join(platsPath, name));
  await Promise.all([
    mkdirIfNotExist(path.join(platsPath, name, 'src')),
    createPlatPackageJson(name, fileEnd, useReact, rootConfig),
    createTsConfig(name, fileEnd, useReact),
    writePrettier(path.join(platsPath, name))
  ]);
  return createFileIntoDirIfNotExist(
    path.join(platsPath, name, 'src'),
    `index.${fileEnd}`,
    ['ts', 'tsx', 'js', 'jsx']
  );
}

async function prettierProject(name: string, isNew: boolean) {
  if (isNew) {
    await execa('prettier', ['--write', path.join(platsPath, name)], {
      cwd: rootPath
    });
  } else {
    await execa(
      'prettier',
      [
        '--write',
        path.join(platsPath, name, 'package.json')
      ],
      {
        cwd: rootPath
      }
    );
  }
}

async function gitAddition(name: string, git?: boolean): Promise<void> {
  if (git) {
    await execa('git', ['add', path.join(platsPath, name)], {
      cwd: rootPath
    });
  }
}

async function createPlatAction(name:string,rootConfig:Config){
  const { format: ft } = await inquirer.prompt([
    {
      name: 'format',
      type: 'list',
      message: 'Select code formats:',
      choices: ['ts', 'tsx', 'js', 'jsx']
    }
  ]);
  const format = ft || 'js';
  let useReact = false;
  if (format && format.endsWith('x')) {
    const { react } = await inquirer.prompt([
      {
        name: 'react',
        type: 'confirm',
        message:
            'You have selected a `x` end format, do you want to use `React`?'
      }
    ]);
    useReact = react;
  }
  info('config plat...');
  await createPlat(name, format, useReact, rootConfig);
}

async function flushPlatAction(name:string,rootConfig:Config,isNew:boolean){
  const { git } = rootConfig;
  return Promise.all([
    refreshAction(),
    prettierProject(name, isNew),
    gitAddition(name, git),
  ]);
}

async function platAction({ name: n }: { name?: string } | undefined = {}) {
  const rootConfig = readConfig();
  if (!rootConfig) {
    return;
  }
  const mkPlatRooting = mkdirIfNotExist(platsPath);
  let name = n && n.trim() ? n.trim() : null;
  if (!name) {
    const { name: nm } = await inquirer.prompt([
      {
        name: 'name',
        type: 'input',
        message: 'Please enter the platform name'
      }
    ]);
    name = nm;
  }
  if (!name) {
    warn('The name of platform should not be null');
    return;
  }
  const [config] = await Promise.all([
    readPackageJson(path.join(platsPath, name, 'package.json')),
    mkPlatRooting
  ]);
  const copied = await copyTemplate(name);
  if (!copied && !config) {
    await createPlatAction(name,rootConfig);
  } else {
    info('config plat...');
  }
  await writeForbiddenManualInstall(path.join(platsPath, name));
  const isNew = !config;
  const [result] = await flushPlatAction(name,rootConfig,isNew);
  if(!result){
    return;
  }
  success(`create platform "${name}" success`);
}

function commandPlat(program: Command) {
  program
    .command('platform')
    .description('Create a platform, and add into `plats` folder')
    .option('-n, --name <char>', 'Define the platform name you want to create.')
    .action(platAction);
}

export { commandPlat, platAction,createPlatAction,flushPlatAction };
