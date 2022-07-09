import { Command } from "commander";
import execa from "execa";
import {
  readPackageJson,
  readRootPackageJson,
  rootPath,
  writeRootPackageJson,
} from "../file";
import { desc, error } from "../info";
import path from "path";
import fs from "fs";

const projectPath = rootPath;

const packsPath = path.join(projectPath, "packages");

const platsPath = path.join(projectPath, "plats");

function removeDepPacks(packageJson:Record<string, any>,packs:string[]):Record<string, any>{
  const packSet = new Set(packs);
  const {dependencies} = packageJson;
  const e = Object.entries(dependencies).filter(([k])=>!packSet.has(k));
  const newDep = Object.fromEntries(e);
  return {...packageJson,dependencies:newDep};
}

function combineDeps() {
  const root = readRootPackageJson();
  const list = fs.readdirSync(packsPath);
  const packageJson = list.reduce((data, name) => {
    const current = readPackageJson(path.join(packsPath, name, "package.json"));
    if (!current) {
      return data;
    }
    const { dependencies, devDependencies } = current;
    return {
      ...data,
      dependencies: { ...data.dependencies, ...dependencies },
      devDependencies: { ...data.devDependencies, ...devDependencies },
    };
  }, root);
  const validPackageJson = removeDepPacks(packageJson,list);
  const finalPackageJson = list.reduce((data, name) => {
    const current = readPackageJson(path.join(platsPath, name, "package.json"));
    if (!current) {
      return data;
    }
    const { dependencies, devDependencies } = current;
    return {
      ...data,
      dependencies: { ...data.dependencies, ...dependencies },
      devDependencies: { ...data.devDependencies, ...devDependencies },
    };
  }, validPackageJson);
  fs.writeFileSync(
    path.join(projectPath, "package.json"),
    JSON.stringify(finalPackageJson)
  );
}

async function refreshAction() {
  combineDeps();
  const { stdout, stderr } = await execa("npm", ["install"], {
    cwd: rootPath,
  });
  if (stderr) {
    error(stderr);
  } else {
    desc(stdout);
  }
  await execa("prettier", ["--write", "."], { cwd: projectPath });
}

function commandRefresh(program: Command) {
  program
    .command("refresh")
    .description("Refresh `packages & plats` to link the unlink packages.")
    .action(refreshAction);
}

export { commandRefresh, refreshAction };
