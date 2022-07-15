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
import { log, success, warn } from '../info';

const configName = 'pmnp.pack.json';

const packsPath = path.join(rootPath, 'packages');

function createPackPackageJson(name: string, fileEnd: string) {
  const isTs = fileEnd.startsWith('ts');
  const isReact = fileEnd.endsWith('x');
  const packageJsonPath = path.join(packsPath, name, 'package.json');
  const tsDep = isTs ? { typescript: '4.5.5' } : {};
  const reactDep = isReact
    ? {
        react: '16.14.0',
        'react-dom': '16.14.0'
      }
    : {};
  const moduleFile = `index.${fileEnd}`;
  const json = {
    name,
    description: 'This is a package in monorepo project',
    module: moduleFile,
    version: '1.0.0',
    files: ['src', moduleFile],
    dependencies: reactDep,
    devDependencies: {
      ...basicDevDependencies,
      ...tsDep
    }
  };
  writePackageJson(packageJsonPath, json);
}

function createTsConfig(name: string, fileEnd: 'ts' | 'tsx' | 'js' | 'jsx') {
  const packRootPath = path.join(packsPath, name);
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
      [`${name}/src/*`]: ['src/*'],
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

function readPackConfig(name: string) {
  if (!fs.existsSync(path.join(packsPath, name, configName))) {
    return undefined;
  }
  const content = fs.readFileSync(path.join(packsPath, name, configName));
  const data = JSON.parse(content.toString('utf-8'));
  return data as PackConfig;
}

function writePackConfig(
  name: string,
  jsFormats: ('ts' | 'tsx' | 'js' | 'jsx')[]
) {
  const config = { name, jsFormats };
  fs.writeFileSync(
    path.join(packsPath, name, configName),
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
    return type === 'package';
  });
}

async function copyProject(name: string, tempName: string) {
  await copyFolder(
    path.join(rootPath, 'templates', tempName),
    path.join(packsPath, name)
  );
  writePackageJson(path.join(packsPath, name, 'package.json'), { name });
  fs.unlinkSync(path.join(packsPath, name, 'pmnps.template.json'));
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

function createPack(name: string, formats: ('ts' | 'tsx' | 'js' | 'jsx')[]) {
  mkdirIfNotExist(path.join(packsPath, name));
  mkdirIfNotExist(path.join(packsPath, name, 'src'));
  const fileEnd = selectJsFormat(formats);
  createFileIntoDirIfNotExist(path.join(packsPath, name), `index.${fileEnd}`, [
    'ts',
    'tsx',
    'js',
    'jsx'
  ]);
  createPackPackageJson(name, fileEnd);
  createTsConfig(name, fileEnd);
}

async function prettierProject(name: string, isNew: boolean) {
  if (isNew) {
    await execa('prettier', ['--write', path.join(packsPath, name)], {
      cwd: rootPath
    });
  } else {
    await execa(
      'prettier',
      [
        '--write',
        path.join(packsPath, name, 'package.json'),
        path.join(packsPath, name, configName)
      ],
      {
        cwd: rootPath
      }
    );
  }
}

async function gitAddition(
  name: string,
  git?: boolean
): Promise<void> {
  if (git) {
    await execa('git', ['add', path.join(packsPath, name)], {
      cwd: rootPath
    });
  }
}

async function packAction({ name: n }: { name?: string } | undefined = {}) {
  const rootConfig = readConfig();
  if (!rootConfig) {
    return;
  }
  if (!fs.existsSync(packsPath)){
    fs.mkdirSync(packsPath);
  }
  let name = n && n.trim() ? n.trim() : null;
  if (!name) {
    const { name: nm } = await inquirer.prompt([
      {
        name: 'name',
        type: 'input',
        message: 'Please enter the package name'
      }
    ]);
    name = nm;
  }
  if (!name) {
    warn('The name of package should not be null');
    return;
  }
  const copied = await copyTemplate(name);
  const config = readPackConfig(name);
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
    log('config package...');
    createPack(name, formats!);
    const fileEnd = selectJsFormat(formats!);
    if (fileEnd.startsWith('ts')) {
      copyResource(path.join(packsPath, name));
    }
  } else {
    log('config package...');
  }
  const { git } = rootConfig;
  writePackConfig(name, formats || ['js']);
  const isNew = !config;
  await Promise.all([
    prettierProject(name, isNew),
    gitAddition(name, git)
  ]);
  await refreshAction();
  success(`create package "${name}" success`);
}

function commandPack(program: Command) {
  program
    .command('pack')
    .description('Create a package, and add into `packages` folder')
    .option('-n, --name <char>', 'Define the package name you want to create.')
    .action(packAction);
}

export { commandPack, packAction };
