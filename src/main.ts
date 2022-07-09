import { program } from "commander";
import { commandInitial } from "./commands/initial";
import { commandRefresh } from "./commands/refresh";
import { commandPack } from "./commands/pack";
import {commandPlat} from "./commands/plat";

function defineCommander() {
  program
    .name("mnp")
    .description("This is a tool to build monorepo platforms.")
    .version("1.0.0");
}

function startup() {
  defineCommander();
  commandInitial(program);
  commandRefresh(program);
  commandPack(program);
  commandPlat(program);
  program.parse();
}

export { startup };
