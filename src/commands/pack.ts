import { Command } from "commander";
import execa from "execa";
import inquirer from "inquirer";
import {
  createFileIntoDirIfNotExist,
  mkdirIfNotExist,
  rootPath,
  writePackageJson,
  writeTsConfig,
  copyResource,
} from "../file";
import path from "path";
import {basicDevDependencies, selectJsFormat} from "../resource";
import fs from "fs";
import { PackConfig } from "../type";
import { refreshAction } from "./refresh";
import { success } from "../info";

const configName = "pmnp.pack.json";

const packsPath = path.join(rootPath, "packages");

function createPackPackageJson(name: string, fileEnd: string) {
  const isTs = fileEnd.startsWith("ts");
  const isReact = fileEnd.endsWith("x");
  const packageJsonPath = path.join(packsPath, name, "package.json");
  const tsDep = isTs ? { typescript: "4.5.5" } : {};
  const reactDep = isReact
    ? {
        react: "16.14.0",
        "react-dom": "16.14.0",
      }
    : {};
  const moduleFile = `index.${fileEnd}`;
  const json = {
    name,
    description: "This is a package in monorepo project",
    module: moduleFile,
    version: "1.0.0",
    files: ["src", moduleFile],
    dependencies: reactDep,
    devDependencies: {
      ...basicDevDependencies,
      ...tsDep,
    },
  };
  writePackageJson(packageJsonPath, json);
}

function createTsConfig(name: string, fileEnd: "ts" | "tsx" | "js" | "jsx") {
  const packRootPath = path.join(packsPath, name);
  const noTsConfig = fileEnd.startsWith("j");
  if (noTsConfig) {
    return;
  }
  const usingReact = fileEnd.endsWith("x");
  const compilerOptions = {
    target: "esnext",
    module: "esnext",
    lib: ["es2019", "dom"],
    moduleResolution: "node",
    resolveJsonModule: true,
    importHelpers: true,
    esModuleInterop: true,
    baseUrl: "./",
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    paths: {
      [`${name}/src/*`]: ["src/*"],
      "@test/*": ["test/*"],
    },
    noImplicitAny: false,
    allowSyntheticDefaultImports: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
  };
  const tsConfig = {
    compilerOptions: usingReact
      ? { ...compilerOptions, jsx: "react" }
      : compilerOptions,
    exclude: ["node_modules"],
  };
  writeTsConfig(path.join(packRootPath, "tsconfig.json"), tsConfig);
}

function readPackConfig(name: string) {
  if (!fs.existsSync(path.join(packsPath, name, configName))) {
    return undefined;
  }
  const content = fs.readFileSync(path.join(packsPath, name, configName));
  const data = JSON.parse(content.toString("utf-8"));
  return data as PackConfig;
}

function writePackConfig(
  name: string,
  jsFormats: ("ts" | "tsx" | "js" | "jsx")[]
) {
  const config = { name, jsFormats };
  fs.writeFileSync(
    path.join(packsPath, name, configName),
    JSON.stringify(config)
  );
}

function createPack(name: string, formats: ("ts" | "tsx" | "js" | "jsx")[]) {
  mkdirIfNotExist(path.join(packsPath, name));
  mkdirIfNotExist(path.join(packsPath, name, "src"));
  const fileEnd = selectJsFormat(formats);
  createFileIntoDirIfNotExist(path.join(packsPath, name), `index.${fileEnd}`, [
    "ts",
    "tsx",
    "js",
    "jsx",
  ]);
  createPackPackageJson(name, fileEnd);
  createTsConfig(name, fileEnd);
}

function commandPack(program: Command) {
  program
    .command("pack")
    .description("Create a package, and add into `packages` folder")
    .option("-n, --name <char>", "Define the package name you want to create.")
    .action(async ({ name: n }) => {
      let name = n && n.trim() ? n.trim() : null;
      if (!name) {
        const { name: nm } = await inquirer.prompt([
          {
            name: "name",
            type: "input",
            message: "Please enter the package name",
          },
        ]);
        name = nm;
      }

      const config = readPackConfig(name);
      let formats = config ? config.jsFormats : null;
      if (!formats) {
        const { formats: f } = await inquirer.prompt([
          {
            name: "formats",
            type: "checkbox",
            message: "Choice code formats:",
            choices: ["ts", "tsx", "js", "jsx"],
          },
        ]);
        formats = f;
      }
      createPack(name, formats!);
      writePackConfig(name, formats!);
      const fileEnd = selectJsFormat(formats!);
      if (fileEnd.startsWith("ts")) {
        copyResource(path.join(packsPath, name));
      }
      await execa("prettier", ["--write", path.join(packsPath, name)], {
        cwd: rootPath,
      });
      await refreshAction();
      success(`create package "${name}" success`);
    });
}

export { commandPack };
