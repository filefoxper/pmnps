import fs from 'fs';
import {
  createFileIfNotExist, isFile,
  readFileAsync,
  readJsonAsync,
  rootPath,
  writeFileAsync,
  writeJsonAsync
} from './file';
import path from 'path';
import {info, log, warn} from './info';
import {PackageJson, PlatPackageJson, PmnpsConfig} from "./type";

const prettier = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'none',
  arrowParens: 'avoid'
};

const gitignore = `node_modules/
/.idea/
/.vscode/
`;

const basicDevDependencies = {
  prettier: '^2.7.0'
};

async function readPackageJson<T extends PackageJson|PlatPackageJson>(locationPath: string):Promise<undefined|T> {
  const file = await isFile(locationPath);
  if (!file) {
    return undefined;
  }
  return readJsonAsync<T>(locationPath);
}

function writePackageJson(
  locationPath: string,
  packageJson: Record<string, any>
) {
  const { name, ...prev } = packageJson;
  const end = { name };
  const source = readPackageJson(locationPath);
  const content = { ...prev, ...source, ...end };
  return writeJsonAsync(locationPath, content);
}

function writePrettier(targetDirPath: string) {
  return createFileIfNotExist(
    path.join(targetDirPath, '.prettierrc.json'),
    JSON.stringify(prettier)
  );
}

function writeGitIgnore(targetDirPath: string) {
  return createFileIfNotExist(
    path.join(targetDirPath, '.gitignore'),
    JSON.stringify(gitignore)
  );
}

const forbiddenUrl = 'registry=https://forbidden.manual.install';

async function writeForbiddenManualInstall(dirPath: string) {
  const npmConfigPath = path.join(dirPath, '.npmrc');
  if (fs.existsSync(npmConfigPath)) {
    warn('Has detected `.npmrc` file, `npm install` will not be forbidden.');
    return;
  }
  const json = await readPackageJson(dirPath);
  if (!json) {
    info('Has forbidden manual `npm install`');
    return writeFileAsync(npmConfigPath, forbiddenUrl);
  }
  const { pmnps = {} } = json as PlatPackageJson;
  const { ownRoot } = pmnps;
  if (ownRoot) {
    info('Has detected `ownRoot` config, `npm install` will not be forbidden.');
    return;
  }
  info('Has forbidden manual `npm install`');
  return writeFileAsync(npmConfigPath, forbiddenUrl);
}

async function writeUnForbiddenManualInstall(dirPath: string) {
  const npmConfigPath = path.join(dirPath, '.npmrc');
  if (!fs.existsSync(npmConfigPath)) {
    return;
  }
  const data = await readFileAsync(npmConfigPath);
  if (!data.includes(forbiddenUrl)) {
    return;
  }
  info('Has detected `ownRoot` config, allow manual `npm install`');
  return writeFileAsync(npmConfigPath, data.replace(forbiddenUrl, ''));
}

async function readPmnpsConfig(packageJsonPath:string):Promise<PmnpsConfig|undefined>{
  const json = await readPackageJson<PlatPackageJson>(packageJsonPath);
  if(!json){
    return undefined;
  }
  const {pmnps} = json;
  return pmnps as PmnpsConfig|undefined;
}

async function writePmnpsConfig(packageJsonPath:string,config:PmnpsConfig){
  const json = await readPackageJson<PlatPackageJson>(packageJsonPath);
  if(!json){
    return undefined;
  }
  const {pmnps={}} = json;
  const newJson = {...json,pmnps:{...config,...pmnps}};
  return writePackageJson(packageJsonPath,newJson);
}

export {
  basicDevDependencies,
  writePrettier,
  writeGitIgnore,
  writeForbiddenManualInstall,
  writeUnForbiddenManualInstall,
  readPackageJson,
  writePackageJson,
  readPmnpsConfig,
  writePmnpsConfig
};
