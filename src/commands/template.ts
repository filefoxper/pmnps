import { Command } from 'commander';
import inquirer from 'inquirer';
import { mkdirIfNotExist, readConfig, rootPath, writeConfig } from '../file';
import path from 'path';
import { TemplateConfig } from '../type';
import fs from 'fs';
import execa from 'execa';
import {desc, error, success, warn} from '../info';

const templateConfigName = 'pmnps.template.json';

function readTemplateConfig(dirPath: string): TemplateConfig | undefined {
  const filePath = path.join(dirPath, templateConfigName);
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  const content = fs.readFileSync(filePath);
  return JSON.parse(content.toString('utf-8'));
}

async function writeTemplateConfig(
  dirPath: string,
  object: TemplateConfig
): Promise<boolean> {
  const filePath = path.join(dirPath, templateConfigName);
  const data = readTemplateConfig(dirPath);
  if (!data) {
    fs.writeFileSync(filePath, JSON.stringify(object));
    return true;
  }
  if (data.type === object.type) {
    return true;
  }
  const { name } = data;
  const { confirm } = await inquirer.prompt([
    {
      name: 'confirm',
      type: 'confirm',
      message: `Do you want to change the template \`${name}\` type to \`${object.type}\`?`
    }
  ]);
  if (!confirm) {
    return false;
  }
  fs.writeFileSync(filePath, JSON.stringify(object));
  return true;
}

async function templateAction({ name: n }: { name?: string }|undefined = {}) {
  const rootConfig = readConfig();
  if (!rootConfig) {
    return;
  }
  const { git } = rootConfig;
  const templatesPath = path.join(rootPath, 'templates');
  mkdirIfNotExist(templatesPath);
  let name = n;
  if (!n) {
    const { name: nm } = await inquirer.prompt([
      {
        name: 'name',
        type: 'input',
        message: 'Please enter the template name.',
      }
    ]);
    name = nm;
  }

  if (!name) {
    warn('The template name should not be null');
    return;
  }

  const { type: templateType } = await inquirer.prompt([
    {
      name: 'type',
      type: 'list',
      message: 'Please choice the template type:',
      choices: ['platform', 'package'],
      default: 'platform'
    }
  ]);

  const creatingTemplatePath = path.join(templatesPath, name);
  mkdirIfNotExist(creatingTemplatePath);
  const result = await writeTemplateConfig(creatingTemplatePath, { name, type: templateType });
  if(!result){
    desc('The template creation is canceled.');
    return;
  }
  if (git) {
    await execa('git', ['add', creatingTemplatePath], { cwd: rootPath });
  }
  success(`create template ${name} success`);
}

function commandTemplate(program: Command) {
  program
    .command('template')
    .description('Create `template` for `packages` and `platforms` creation.')
    .option('-n, --name <char>', 'The creating template name')
    .action(templateAction);
}

export { commandTemplate, templateAction };
