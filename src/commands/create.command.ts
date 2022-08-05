import { Command } from 'commander';
import { packAction } from './pack';
import { platAction } from './plat';
import inquirer from 'inquirer';

async function createAction(
  argument: string | null,
  options: { name?: string }
) {
  let type = argument;
  if (!(['package', 'platform'] as (string | null)[]).includes(argument)) {
    const { type: t } = await inquirer.prompt([
      {
        name: 'type',
        type: 'list',
        message: 'Select the creating type:',
        choices: ['package', 'platform']
      }
    ]);
    type = t;
  }
  if (type === 'package') {
    await packAction(options);
  } else if (type === 'platform') {
    await platAction(options);
  }
}

function commandCreate(program: Command) {
  program
    .command('create')
    .argument('[string]', 'Choose `package` or `platform`', null)
    .description('Create a package or a platform')
    .option('-n, --name <char>', 'Define the package name you want to create.')
    .action(createAction);
}

export { commandCreate, createAction };
