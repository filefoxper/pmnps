import { Command } from "commander";
import inquirer from "inquirer";
import {
  mkdirIfNotExist,
  rootPath,
  writeConfig,
  writeRootPackageJson,
  copyResource
} from "../file";
import {desc, error, info, success, warn} from "../info";
import path from "path";
import execa from "execa";
import {refreshAction} from "./refresh";

const projectPath = rootPath;

const packsPath = path.join(projectPath, "packages");

const platsPath = path.join(projectPath, "plats");

function commandInitial(program: Command) {
  program
    .command("initial")
    .description("Initial monorepo platforms workspace.")
    .action(async () => {
      const { workspace } = await inquirer.prompt([
        {
          name: "workspace",
          type: "input",
          message: "Please enter the workspace name",
          default() {
            return "workspace";
          },
        },
      ]);
      try {
        info("build project...");
        writeConfig({ workspace });
        mkdirIfNotExist(packsPath);
        mkdirIfNotExist(platsPath);
        writeRootPackageJson(workspace);
        const { install } = await inquirer.prompt([
          {
            name: "install",
            type: "confirm",
            message: "Do you want to install packages immediately?",
          },
        ]);
        if (install) {
          await refreshAction();
        }
        success("initial success!");
      } catch (e) {
        error("initial failed!");
      }
    });
}

export { commandInitial };
