import { Config } from './type';
import fs from 'fs';
import path from 'path';
import {
  createFileIfNotExist,
  readFileAsync,
  rootPath,
  writeFileAsync,
  writeJsonAsync
} from './file';
import {
  basicDevDependencies,
  readPackageJson,
  writePackageJson
} from './resource';

declare global{
  var pmnpsConfig:string | null
}

const rootPackageJsonPath = path.join(rootPath, 'package.json');

const rootConfigName = '.pmnpsrc.json';

const configPath = path.join(rootPath, rootConfigName);

function getPmnpsConfig(): Config | null {
  const configString = global.pmnpsConfig;
  if (configString == null) {
    return null;
  }
  return JSON.parse(configString) as Config;
}

function setPmnpsConfig(pmnpsConfig: Config | string) {
  global.pmnpsConfig =
    typeof pmnpsConfig === 'string' ? pmnpsConfig : JSON.stringify(pmnpsConfig);
}

async function readConfigAsync(): Promise<Config | null> {
  if (!fs.existsSync(configPath)) {
    return null;
  }
  const content = await readFileAsync(configPath);
  setPmnpsConfig(content);
  return JSON.parse(content);
}

function readConfig(): Config | null {
  const config = getPmnpsConfig();
  if (config) {
    return config;
  }
  if (!fs.existsSync(configPath)) {
    return null;
  }
  const data = fs.readFileSync(configPath);
  const content = data.toString('utf-8');
  setPmnpsConfig(content);
  return JSON.parse(content);
}

function writeConfig(config: Partial<Config>) {
  const source = readConfig();
  const content = JSON.stringify(source ? { ...source, ...config } : config);
  setPmnpsConfig(content);
}

async function flushConfig() {
  const content = getPmnpsConfig();
  if (content == null) {
    return;
  }
  return writeJsonAsync(configPath, content);
}

function readRootPackageJson() {
  return readPackageJson(rootPackageJsonPath);
}

async function writeRootPackageJson(workspace: string) {
  function generateNewDevDep(packageJson: Record<string, any> | undefined) {
    if (!packageJson) {
      return basicDevDependencies;
    }
    const sourceDev = packageJson.devDependencies;
    return { ...basicDevDependencies, ...sourceDev };
  }
  const preAddition = {
    version: '1.0.0',
    description: 'project of monorepo platforms',
    dependencies: {}
  };
  const addition = {
    name: workspace,
    workspaces: ['packages/*']
  };
  const packageJson = await readPackageJson(rootPackageJsonPath);
  const newDev = generateNewDevDep(packageJson);
  const content = {
    ...preAddition,
    ...packageJson,
    ...addition,
    devDependencies: newDev
  };
  return writePackageJson(rootPackageJsonPath, content,true);
}

export {
  rootConfigName,
  readConfigAsync,
  readConfig,
  writeConfig,
  flushConfig,
  readRootPackageJson,
  writeRootPackageJson
};
