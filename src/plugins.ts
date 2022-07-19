import { Config, PackageJson, FullPluginResult } from './type';
import {
  Plugin,
  Project,
  Tools,
  PluginResult,
  Actions,
  ActionHook
} from 'pmnps-plugin';
import project from './project';
import { desc, error, info, log, success, warn } from './info';

declare global {
  var pmnpsPluginBundle: FullPluginResult;
}

function parsePlugin(plugin: Plugin) {
  if (typeof plugin === 'string') {
    return [plugin, undefined];
  }
  if (!Array.isArray(plugin)) {
    return undefined;
  }
  const [name, query] = plugin;
  return [name, query];
}

const defaultCallback = () => Promise.resolve(true);
const defaults: FullPluginResult = {
  refresh: {
    before: defaultCallback,
    after: defaultCallback
  }
};

const tools:Tools = {message:{ desc, error, info, log, success, warn }};

function usePlugins(config: Config) {
  const { plugins } = config;
  if (!Array.isArray(plugins)) {
    return;
  }
  const ps = plugins
    .map(parsePlugin)
    .filter((d): d is [string, Record<string, any>] => !!d);
  const results = ps.map(plugin => {
    const [name, query] = plugin;
    const pluginEntry = require(name).default;
    return pluginEntry(project, tools, query) as PluginResult;
  });
  global.pmnpsPluginBundle = results.reduce((r, c) => {
    const e = Object.entries(r) as Array<[Actions, ActionHook]>;
    const newE = e.map(([k, v]) => {
      const data = c[k];
      if (!data) {
        return [k, v];
      }
      const {
        before: rBefore = defaultCallback,
        after: rAfter = defaultCallback
      } = v;
      const { before = defaultCallback, after = defaultCallback } = data;
      const currentBefore = async () => {
        const rB = await rBefore();
        if (!rB) {
          return rB;
        }
        return before();
      };
      const currentAfter = async () => {
        const rA = await rAfter();
        if (!rA) {
          return rA;
        }
        return after();
      };
      return [k, { before: currentBefore, after: currentAfter }];
    });
    return Object.fromEntries(newE);
  }, defaults) as FullPluginResult;
}

function getPluginBundle(): FullPluginResult {
  return global.pmnpsPluginBundle || defaults;
}

export { usePlugins, getPluginBundle };
