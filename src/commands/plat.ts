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

const configName = "pmnp.plat.json";

const platsPath = path.join(rootPath, "plats");

function createPlatPackageJson(name: string, fileEnd: string) {
  const isTs = fileEnd.startsWith("ts");
  const isReact = fileEnd.endsWith("x");
  const packageJsonPath = path.join(platsPath, name, "package.json");
  const tsDep = isTs ? { typescript: "4.5.5" } : {};
  const reactDep = isReact
    ? {
        react: "16.14.0",
        "react-dom": "16.14.0",
      }
    : {};
  const json = {
    name,
    description: "This is a package in monorepo project",
    version: "1.0.0",
    scripts:{
      start:'node -v',
      build:'node -v'
    },
    dependencies: reactDep,
    devDependencies: {
      ...basicDevDependencies,
      ...tsDep,
    },
  };
  writePackageJson(packageJsonPath, json);
}

function createTsConfig(name: string, fileEnd: "ts" | "tsx" | "js" | "jsx") {
  const packRootPath = path.join(platsPath, name);
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

function readPlatConfig(name: string) {
  if (!fs.existsSync(path.join(platsPath, name, configName))) {
    return undefined;
  }
  const content = fs.readFileSync(path.join(platsPath, name, configName));
  const data = JSON.parse(content.toString("utf-8"));
  return data as PackConfig;
}

function writePlatConfig(
  name: string,
  jsFormats: ("ts" | "tsx" | "js" | "jsx")[]
) {
  const config = { name, jsFormats };
  fs.writeFileSync(
    path.join(platsPath, name, configName),
    JSON.stringify(config)
  );
}

function createPlat(name: string, formats: ("ts" | "tsx" | "js" | "jsx")[]) {
  mkdirIfNotExist(path.join(platsPath, name));
  mkdirIfNotExist(path.join(platsPath, name, "src"));
  const fileEnd = selectJsFormat(formats);
  createFileIntoDirIfNotExist(
    path.join(platsPath, name, "src"),
    `index.${fileEnd}`,
    ["ts", "tsx", "js", "jsx"]
  );
  createPlatPackageJson(name, fileEnd);
  createTsConfig(name, fileEnd);
}

function commandPlat(program: Command) {
  program
    .command("plat")
    .description("Create a platform, and add into `plats` folder")
    .option("-n, --name <char>", "Define the platform name you want to create.")
    .action(async ({ name: n }) => {
      let name = n && n.trim() ? n.trim() : null;
      if (!name) {
        const { name: nm } = await inquirer.prompt([
          {
            name: "name",
            type: "input",
            message: "Please enter the platform name",
          },
        ]);
        name = nm;
      }

      const config = readPlatConfig(name);
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
      createPlat(name, formats!);
      writePlatConfig(name, formats!);
      const fileEnd = selectJsFormat(formats!);
      if (fileEnd.startsWith("ts")) {
        copyResource(path.join(platsPath, name));
      }
      await execa("prettier", ["--write", path.join(platsPath, name)], {
        cwd: rootPath,
      });
      await refreshAction();
      success(`create platform "${name}" success`);
    });
}

export { commandPlat };
