import fs from 'fs';
import { Config } from './type';
import path from 'path';
import { error } from './info';
import { basicDevDependencies, prettier } from './resource';

const actualRootPath = process.cwd();

const rootPath =
  process.env.NODE_ENV === 'development'
    ? path.join(actualRootPath, 'test')
    : actualRootPath;

const configPath = path.join(rootPath, 'pmnps.json');

const packageJsonPath = path.join(rootPath, 'package.json');

function mkdirIfNotExist(dirPath: string) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    fs.mkdirSync(dirPath);
  }
}

function writeTsConfig(configPath: string, tsConfig: Record<string, any>) {
  if (fs.existsSync(configPath)) {
    return;
  }
  fs.writeFileSync(configPath, JSON.stringify(tsConfig));
}

function writeConfig(config: Partial<Config>) {
  const source = readConfig(true);
  const content = JSON.stringify(source ? { ...source, ...config } : config);
  fs.writeFileSync(configPath, content);
}

function writePackageJson(
  locationPath: string,
  packageJson: Record<string, any>
) {
  const { name, ...prev } = packageJson;
  const end = { name };
  const source = readPackageJson(locationPath);
  const content = JSON.stringify({ ...prev, ...source, ...end });
  fs.writeFileSync(locationPath, content);
}

function generateNewDevDep(packageJson: Record<string, any> | undefined) {
  if (!packageJson) {
    return basicDevDependencies;
  }
  const sourceDev = packageJson.devDependencies;
  const e = Object.entries(basicDevDependencies);
  const entries = e.map(([k, v]) =>
    sourceDev[k] ? [k, sourceDev[k]] : [k, v]
  );
  return Object.fromEntries(entries);
}

function writeRootPackageJson(workspace: string) {
  const preAddition = {
    version: '1.0.0',
    description: 'project of monorepo platforms',
    dependencies: {},
    devDependencies: {
      ...basicDevDependencies
    }
  };
  const addition = {
    name: workspace,
    workspaces: ['packages/*']
  };
  const packageJson = readRootPackageJson();
  const newDev = generateNewDevDep(packageJson);
  const content = JSON.stringify({
    ...preAddition,
    ...packageJson,
    ...addition,
    devDependencies: newDev
  });
  fs.writeFileSync(packageJsonPath, content);
}

function readPackageJson(locationPath: string) {
  if (!fs.existsSync(locationPath)) {
    return undefined;
  }
  try {
    const data = fs.readFileSync(locationPath);
    const content = data.toString('utf-8');
    return JSON.parse(content);
  } catch (e) {
    error('The `package.json` file is invalidate, please check the format.');
    return undefined;
  }
}

function readRootPackageJson() {
  return readPackageJson(packageJsonPath);
}

function readConfig(silence?: boolean): Config | undefined {
  if (!fs.existsSync(configPath)) {
    if (!silence) {
      error('Please use `initial` command to initial workspace first!');
    }
    return undefined;
  }
  try {
    const data = fs.readFileSync(configPath);
    const content = data.toString('utf-8');
    return JSON.parse(content);
  } catch (e) {
    if (!silence) {
      throw new Error(
        'Parse `pmnps.json` failed, please check this file, or use `initial` command to regenerate this file!'
      );
    }
    return undefined;
  }
}

function createFile(filePath: string, content: string = '') {
  fs.writeFileSync(filePath, content);
}

function createFileIfNotExist(filePath: string, content: string = '') {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    createFile(filePath, content);
  }
}
// TODO copy resource file from sourceDirPath to targetDirPath
function copyResource(targetDirPath: string, sourceDirPath?: string) {
  createFileIfNotExist(
    path.join(targetDirPath, '.prettierrc.json'),
    JSON.stringify(prettier)
  );
}

function createFileIntoDirIfNotExist(
  dirPath: string,
  filename: string,
  ends?: string[]
) {
  const [name] = filename.split('.');
  const allNotExist = (ends || []).every(
    end => !fs.existsSync(path.join(dirPath, `${name}.${end}`))
  );
  if (!fs.existsSync(path.join(dirPath, filename)) && allNotExist) {
    createFile(path.join(dirPath, filename));
  }
}

export {
  mkdirIfNotExist,
  writeTsConfig,
  writeConfig,
  readConfig,
  writePackageJson,
  readPackageJson,
  readRootPackageJson,
  writeRootPackageJson,
  createFile,
  createFileIfNotExist,
  createFileIntoDirIfNotExist,
  copyResource,
  rootPath
};
