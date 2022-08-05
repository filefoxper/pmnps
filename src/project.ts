import {Project} from "pmnps-plugin";
import {isDirectory, rootPath} from './file';
import path from 'path';
import {
  PackageJson,
  PlatPackageJson,
} from './type';
import fs from 'fs';
import { readPackageJson } from './resource';

const packagePath = path.join(rootPath, 'packages');

const platformPath = path.join(rootPath, 'plats');

function scopeDetect(packageDirPath:string):Promise<(PackageJson|undefined)[]>{
  const list = fs.readdirSync(packageDirPath);
  const fetches = list.map(async (name)=>{
    const dirPath = path.join(packageDirPath, name);
    const isDir = await isDirectory(dirPath);
    if(!isDir){
      return undefined;
    }
    const json = await readPackageJson<PackageJson>(
        path.join(dirPath, 'package.json')
    );
    if(json){
      return json;
    }
    return undefined;
  });
  return Promise.all(fetches);
}

async function packageDetect(
  dirPath: string
): Promise<(PackageJson | undefined)[]> {
  if (!fs.existsSync(dirPath)) {
    return Promise.resolve([]);
  }
  const list = fs.readdirSync(dirPath);
  const fetches = list.map(dirName =>
    (async function pack():Promise<PackageJson|undefined|(PackageJson|undefined)[]> {
      const packageDirPath = path.join(dirPath, dirName);
      const isDir = await isDirectory(packageDirPath);
      if(!isDir){
        return undefined;
      }
      const json = await readPackageJson<PackageJson>(
        path.join(packageDirPath, 'package.json')
      );
      if(json){
        return json;
      }
      if(!dirName.startsWith('@')){
        return undefined;
      }
      return scopeDetect(packageDirPath);
    })()
  );
  const results = await Promise.all(fetches);
  return results.flat();
}

const project: Project = {
  packagePath,
  platformPath,
  async packageJsons(): Promise<
      {
        root: PackageJson;
        packages: PackageJson[];
        platforms: PlatPackageJson[];
      }
  > {
    const [root, packages, platforms] = await Promise.all([
      readPackageJson<PackageJson>(path.join(rootPath, 'package.json')),
      packageDetect(packagePath),
      packageDetect(platformPath)
    ]);
    const validPacks = packages.filter(
      (d): d is PackageJson => !!d
    );
    const validPlats = platforms.filter(
      (d): d is PlatPackageJson => !!d
    );
    if (!root) {
      throw new Error('No root package.json!');
    }
    return {
      root,
      packages:validPacks,
      platforms:validPlats
    };
  }
};

export default project;
