import { Command } from 'commander';
import inquirer from 'inquirer';
import {mkdirIfNotExist, rootPath, writeJsonAsync} from '../file';
import path from 'path';
import { TemplateConfig } from '../type';
import fs from 'fs';
import execa from 'execa';
import {desc, success, warn} from '../info';
import {readConfig} from "../root";

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
    await writeJsonAsync(filePath, object);
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
  await writeJsonAsync(filePath, object);
  return true;
}

async function templateAction({ name: n }: { name?: string }|undefined = {}) {
  const rootConfig = readConfig();
  if (!rootConfig) {
    return;
  }
  const { git } = rootConfig;
  const templatesPath = path.join(rootPath, 'templates');
  const mkTemplateRooting = mkdirIfNotExist(templatesPath);
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
  await mkTemplateRooting;
  const creatingTemplatePath = path.join(templatesPath, name);
  const mkTemplateDirWorking =  mkdirIfNotExist(creatingTemplatePath);
  const { type: templateType } = await inquirer.prompt([
    {
      name: 'type',
      type: 'list',
      message: 'Please choice the template type:',
      choices: ['platform', 'package'],
      default: 'platform'
    }
  ]);

  await mkTemplateDirWorking;
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
