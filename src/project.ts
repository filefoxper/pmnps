import {Project} from "pmnps-plugin";
import { rootPath } from './file';
import path from 'path';
import {
  PackageJson,
  PlatPackageJson,
} from './type';
import fs from 'fs';
import { readPackageJson } from './resource';

const packagePath = path.join(rootPath, 'packages');

const platformPath = path.join(rootPath, 'plats');

function packageDetect(
  dirPath: string
): Promise<(PackageJson | undefined)[]> {
  if (!fs.existsSync(dirPath)) {
    return Promise.resolve([]);
  }
  const list = fs.readdirSync(dirPath);
  const fetches = list.map(dirName =>
    (async function pack() {
      const packageDirPath = path.join(dirPath, dirName);
      return readPackageJson<PackageJson>(
        path.join(packageDirPath, 'package.json')
      );
    })()
  );
  return Promise.all(fetches) as Promise<
    (PackageJson|undefined)[]
  >;
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
