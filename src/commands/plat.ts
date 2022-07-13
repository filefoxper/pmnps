import { Command } from 'commander';
import execa from 'execa';
import inquirer from 'inquirer';
import {
  createFileIntoDirIfNotExist,
  mkdirIfNotExist,
  rootPath,
  writePackageJson,
  writeTsConfig,
  copyResource,
  readConfig,
  writeConfig,
  copyFolder
} from '../file';
import path from 'path';
import { basicDevDependencies, selectJsFormat } from '../resource';
import fs from 'fs';
import { Config, PackConfig, TemplateConfig } from '../type';
import { refreshAction } from './refresh';
import { error, log, success, warn } from '../info';

const configName = 'pmnp.plat.json';

const platsPath = path.join(rootPath, 'plats');

function createPlatPackageJson(
  name: string,
  fileEnd: string,
  rootConfig: Config
) {
  const isTs = fileEnd.startsWith('ts');
  const isReact = fileEnd.endsWith('x');
  const packageJsonPath = path.join(platsPath, name, 'package.json');
  const tsDep = isTs ? { typescript: '4.5.5' } : {};
  const reactDep = isReact
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
  writePackageJson(packageJsonPath, json);
}

function createTsConfig(name: string, fileEnd: 'ts' | 'tsx' | 'js' | 'jsx') {
  const packRootPath = path.join(platsPath, name);
  const noTsConfig = fileEnd.startsWith('j');
  if (noTsConfig) {
    return;
  }
  const usingReact = fileEnd.endsWith('x');
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
    compilerOptions: usingReact
      ? { ...compilerOptions, jsx: 'react' }
      : compilerOptions,
    exclude: ['node_modules']
  };
  writeTsConfig(path.join(packRootPath, 'tsconfig.json'), tsConfig);
}

function readPlatConfig(name: string) {
  if (!fs.existsSync(path.join(platsPath, name, configName))) {
    return undefined;
  }
  const content = fs.readFileSync(path.join(platsPath, name, configName));
  const data = JSON.parse(content.toString('utf-8'));
  return data as PackConfig;
}

function writePlatConfig(
  name: string,
  jsFormats: ('ts' | 'tsx' | 'js' | 'jsx')[]
) {
  const config = { name, jsFormats };
  fs.writeFileSync(
    path.join(platsPath, name, configName),
    JSON.stringify(config)
  );
}

function readTemplates(): string[] {
  const templatesPath = path.join(rootPath, 'templates');
  if (
    !fs.existsSync(templatesPath) ||
    !fs.statSync(templatesPath).isDirectory()
  ) {
    return [];
  }
  const list = fs.readdirSync(templatesPath);
  return list.filter(d => {
    const detailPath = path.join(templatesPath, d);
    const detailConfigPath = path.join(detailPath, 'pmnps.template.json');
    if (
      !fs.existsSync(detailPath) ||
      !fs.statSync(detailPath).isDirectory() ||
      !fs.existsSync(detailConfigPath)
    ) {
      return false;
    }
    const buffer = fs.readFileSync(detailConfigPath);
    const { type } = JSON.parse(buffer.toString('utf-8')) as TemplateConfig;
    return type === 'platform';
  });
}

async function copyProject(name: string, tempName: string) {
  await copyFolder(
    path.join(rootPath, 'templates', tempName),
    path.join(platsPath, name)
  );
  writePackageJson(path.join(platsPath, name, 'package.json'), { name });
  fs.unlinkSync(path.join(platsPath, name, 'pmnps.template.json'));
}

async function copyTemplate(name: string): Promise<boolean> {
  let useTemplate = false;
  const templates = readTemplates();
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

function createPlat(
  name: string,
  formats: ('ts' | 'tsx' | 'js' | 'jsx')[],
  rootConfig: Config
) {
  mkdirIfNotExist(path.join(platsPath, name));
  mkdirIfNotExist(path.join(platsPath, name, 'src'));
  const fileEnd = selectJsFormat(formats);
  createFileIntoDirIfNotExist(
    path.join(platsPath, name, 'src'),
    `index.${fileEnd}`,
    ['ts', 'tsx', 'js', 'jsx']
  );
  createPlatPackageJson(name, fileEnd, rootConfig);
  createTsConfig(name, fileEnd);
}

async function prettierProject(name: string, isNew: boolean) {
  if (isNew) {
    await execa('prettier', ['--write', path.join(platsPath, name)], {
      cwd: rootPath
    });
  }
}

async function gitAddition(
  name: string,
  isNew: boolean,
  git?: boolean
): Promise<void> {
  if (git) {
    await execa('git', ['add', path.join(platsPath, name)], {
      cwd: rootPath
    });
  }
}

async function platAction({ name: n }: { name?: string } | undefined = {}) {
  const rootConfig = readConfig();
  if (!rootConfig) {
    return;
  }
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
  const copied = await copyTemplate(name);
  const config = readPlatConfig(name);
  let formats = config ? config.jsFormats : null;
  if (!copied) {
    if (!formats) {
      const { formats: f } = await inquirer.prompt([
        {
          name: 'formats',
          type: 'checkbox',
          message: 'Choice code formats:',
          choices: ['ts', 'tsx', 'js', 'jsx']
        }
      ]);
      formats = f;
    }
    log('config plat...');
    createPlat(name, formats || ['js'], rootConfig);
    const fileEnd = selectJsFormat(formats!);
    if (fileEnd.startsWith('ts')) {
      copyResource(path.join(platsPath, name));
    }
  } else {
    log('config plat...');
  }
  writePlatConfig(name, formats || ['js']);
  const { git } = rootConfig;
  const isNew = !config;
  await Promise.all([
    prettierProject(name, isNew),
    gitAddition(name, isNew, git)
  ]);
  await refreshAction();
  success(`create platform "${name}" success`);
}

function commandPlat(program: Command) {
  program
    .command('plat')
    .description('Create a platform, and add into `plats` folder')
    .option('-n, --name <char>', 'Define the platform name you want to create.')
    .action(platAction);
}

export { commandPlat, platAction };
