import chalk from "chalk";

function error(message: string) {
  console.log(chalk.red(message));
}

function info(message: string) {
  console.log(chalk.black.bold(message));
}

function success(message: string) {
  console.log(chalk.green(message));
}

function desc(message: string) {
  console.log(chalk.gray(message));
}

function warn(message: string) {
  console.log(chalk.magenta(message));
}

export { error, info, success, desc, warn };
