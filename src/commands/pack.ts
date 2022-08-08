import { Command } from 'commander';
import execa from 'execa';
import inquirer from 'inquirer';
import {
  createFileIntoDirIfNotExist,
  mkdirIfNotExist,
  rootPath,
  copyFolder,
  writeJsonAsync,
  readdir,
  isDirectory,
  isFile,
  readJsonAsync,
  unlink,
  mkdir,
  createFileIfNotExist
} from '../file';
import path from 'path';
import {
  basicDevDependencies,
  readPackageJson,
  readPmnpsConfig,
  writeBuildContent,
  writeForbiddenManualInstall,
  writeGitIgnore,
  writePackageJson,
  writePmnpsConfig,
  writePrettier
} from '../resource';
import fs from 'fs';
import { refreshAction } from './refresh';
import { info, success, warn } from '../info';
import { readConfig } from '../root';

const packsPath = path.join(rootPath, 'packages');

async function createPackPackageJson(
  scope: string | null,
  name: string,
  fileEnd: string,
  useReact: boolean,
  modeParts: Record<string, any> = {}
) {
  const { private: pri } = readConfig() || {};
  const isTs = fileEnd.startsWith('ts');
  const packageJsonPath = pathJoin(packsPath, scope, name, 'package.json');
  const tsDep = isTs ? { typescript: '4.5.5' } : {};
  const reactDep = useReact
    ? {
        react: '16.14.0',
        'react-dom': '16.14.0'
      }
    : {};
  const json = {
    private: !!pri,
    name: buildScopedName(scope, name),
    description: 'This is a package in monorepo project',
    version: '1.0.0',
    dependencies: reactDep,
    devDependencies: {
      ...basicDevDependencies,
      ...tsDep
    },
    ...modeParts
  };
  return writePackageJson(packageJsonPath, json);
}

async function createIndexDFile(
  scope: string | null,
  name: string,
  fileEnd: 'ts' | 'tsx' | 'js' | 'jsx'
) {
  const packRootPath = pathJoin(packsPath, scope, name);
  const isNotTs = fileEnd.startsWith('j');
  if (isNotTs) {
    return;
  }
  const tsPath = path.join(packRootPath, 'index.d.ts');
  const file = await isFile(tsPath);
  if (file) {
    return;
  }
  await createFileIntoDirIfNotExist(packRootPath, 'index.d.ts');
}

async function createTsConfig(
  scope: string | null,
  name: string,
  fileEnd: 'ts' | 'tsx' | 'js' | 'jsx',
  useReact: boolean
) {
  const packRootPath = pathJoin(packsPath, scope, name);
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
      [`${buildScopedName(scope, name)}/src/*`]: ['src/*'],
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
    return [d, type === 'package'];
  });
  const listEntries = await Promise.all(fetchers);
  const validListEntries = listEntries.filter(([, v]) => v);
  return validListEntries.map(([d]) => d);
}

function buildScopedName(scope: string | null, name: string) {
  return scope == null ? name : `${scope}/${name}`;
}

async function copyProject(
  scope: string | null,
  name: string,
  tempName: string
) {
  await copyFolder(
    pathJoin(rootPath, 'templates', tempName),
    pathJoin(packsPath, scope, name)
  );
  return Promise.all([
    writePackageJson(pathJoin(packsPath, scope, name, 'package.json'), {
      name: buildScopedName(scope, name)
    }),
    unlink(pathJoin(packsPath, scope, name, 'pmnps.template.json'))
  ]);
}

async function copyTemplate(
  scope: string | null,
  name: string
): Promise<boolean> {
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
      await copyProject(scope, name, tempName);
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
    await copyProject(scope, name, temp);
    return true;
  }
  return false;
}

function parseModuleMode(
  moduleMode: 'main' | 'module' | 'tool',
  indexFile: string,
  strictPackage?: boolean
) {
  const isTs = indexFile.endsWith('.ts') || indexFile.endsWith('tsx');
  const scriptsPart = strictPackage
    ? {
        scripts: {
          build: 'echo Please edit a build script.'
        }
      }
    : undefined;
  const typingPart =
    strictPackage && isTs
      ? {
          typings: 'index.d.ts'
        }
      : undefined;
  const binPart =
    strictPackage && moduleMode === 'tool'
      ? {
          bin: 'bin/index.js'
        }
      : undefined;
  const mainPart =
    strictPackage && moduleMode === 'main'
      ? {
          main: 'dist/index.js'
        }
      : undefined;
  const modulePart =
    strictPackage && moduleMode === 'module'
      ? {
          module: 'esm/index.js'
        }
      : undefined;
  const dirs: string[] = [
    binPart ? 'bin' : undefined,
    mainPart ? 'dist' : undefined,
    modulePart ? 'esm' : undefined
  ].filter((d): d is string => !!d);
  const files: string[] = [typingPart ? 'index.d.ts' : undefined]
    .filter((d): d is string => !!d)
    .concat(dirs);
  const packageJson = {
    ...binPart,
    ...mainPart,
    module: strictPackage ? `src/${indexFile}` : indexFile,
    ...modulePart,
    ...typingPart,
    ...scriptsPart,
    files
  };

  return { dirs, packageJson };
}

async function createPack(
  scope: string | null,
  name: string,
  fileEnd: 'ts' | 'tsx' | 'js' | 'jsx',
  useReact: boolean,
  moduleMode: 'main' | 'module' | 'tool'
) {
  const { strictPackage } = readConfig() || {};
  await mkdirIfNotExist(pathJoin(packsPath, scope, name));
  const fileName = `index.${fileEnd}`;
  const { dirs, packageJson } = parseModuleMode(
    moduleMode,
    fileName,
    strictPackage
  );
  if (strictPackage) {
    const mks = dirs.map(async d => {
      const dirPath = pathJoin(packsPath, scope, name, d);
      await mkdirIfNotExist(dirPath);
      await writeBuildContent(dirPath);
    });
    await Promise.all([
      Promise.all(mks),
      mkdirIfNotExist(pathJoin(packsPath, scope, name, 'src')),
      createPackPackageJson(scope, name, fileEnd, useReact, packageJson),
      createTsConfig(scope, name, fileEnd, useReact),
      createIndexDFile(scope, name, fileEnd),
      writePrettier(pathJoin(packsPath, scope, name))
    ]);
    return createFileIntoDirIfNotExist(
      pathJoin(packsPath, scope, name, 'src'),
      fileName,
      ['ts', 'tsx', 'js', 'jsx']
    );
  }
  return Promise.all([
    createFileIntoDirIfNotExist(pathJoin(packsPath, scope, name), fileName, [
      'ts',
      'tsx',
      'js',
      'jsx'
    ]),
    createPackPackageJson(scope, name, fileEnd, useReact, packageJson),
    createTsConfig(scope, name, fileEnd, useReact),
    writePrettier(pathJoin(packsPath, scope, name))
  ]);
}

async function prettierProject(
  scope: string | null,
  name: string,
  isNew: boolean
) {
  if (isNew) {
    await execa('prettier', ['--write', pathJoin(packsPath, scope, name)], {
      cwd: rootPath
    });
  } else {
    await execa(
      'prettier',
      ['--write', pathJoin(packsPath, scope, name, 'package.json')],
      {
        cwd: rootPath
      }
    );
  }
}

async function gitAddition(
  scope: string | null,
  name: string,
  git?: boolean
): Promise<void> {
  if (git) {
    await writeGitIgnore(pathJoin(packsPath, scope, name));
    await execa('git', ['add', pathJoin(packsPath, scope, name)], {
      cwd: rootPath
    });
  }
}

function parseName(name: string): [string | null, string] {
  if (name.startsWith('@')) {
    const data = name.split('/');
    const [scope, child] = data.map(d => d.trim()).filter(d => d);
    return [scope, child];
  }
  return [null, name];
}

function pathJoin(...args: (string | null | undefined)[]): string {
  const params = args.filter((d): d is string => d != null);
  return path.join(...params);
}

async function packAction({ name: n }: { name?: string } | undefined = {}) {
  const rootConfig = readConfig();
  if (!rootConfig) {
    return;
  }
  const mkPackRooting = mkdirIfNotExist(packsPath);
  let name = n && n.trim() ? n.trim() : null;
  if (!name) {
    const { name: nm } = await inquirer.prompt([
      {
        name: 'name',
        type: 'input',
        message: 'Please enter the package name'
      }
    ]);
    name = (nm || '').trim();
  }
  const [scope, packName] = parseName(name || '');
  if (!packName) {
    warn('The name of package should not be null');
    return;
  }
  await mkdirIfNotExist(pathJoin(packsPath, scope));
  const [config] = await Promise.all([
    readPackageJson(pathJoin(packsPath, scope, packName, 'package.json')),
    mkPackRooting
  ]);
  const copied = await copyTemplate(scope, packName);
  if (!copied && !config) {
    const { format: ft } = await inquirer.prompt([
      {
        name: 'format',
        type: 'list',
        message: 'Select code formats:',
        choices: ['ts', 'tsx', 'js', 'jsx']
      }
    ]);
    const format = ft || 'js';
    let moduleMode: 'main' | 'module' | 'tool' = 'main';
    if (rootConfig.strictPackage) {
      const { mode } = await inquirer.prompt([
        {
          name: 'mode',
          type: 'list',
          message: 'Is this package a module or a node tool?',
          choices: ['main', 'module', 'tool'],
          default: 'main'
        }
      ]);
      moduleMode = mode;
    }
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
    info('config package...');
    await createPack(scope, packName, format, useReact, moduleMode);
  } else {
    info('config package...');
  }
  const { git, publishable } = rootConfig;
  if (!publishable) {
    await writeForbiddenManualInstall(pathJoin(packsPath, scope, packName));
  }
  const isNew = !config;
  const [result] = await Promise.all([
    refreshAction(),
    prettierProject(scope, packName, isNew),
    gitAddition(scope, packName, git)
  ]);
  if (!result) {
    return;
  }
  success(`create package "${buildScopedName(scope, packName)}" success`);
}

export { packAction };
