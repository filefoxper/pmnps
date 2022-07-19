import {Plugin,Actions} from 'pmnps-plugin';

export type Config = {
  workspace: string;
  git?: boolean;
  buildModes?: string[];
  lock?: boolean;
  plugins?: Plugin[];
};

export type PmnpsConfig = {
  platDependencies?: string[];
  ownRoot?: boolean;
  alias?: string;
  buildHook?: { before?: string; after?: string };
};

export type PackageJson = {
  name: string;
  scripts?: Record<string, string>;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type PlatPackageJson = PackageJson & {
  pmnps?: PmnpsConfig;
};

export type TemplateConfig = {
  type: 'package' | 'platform';
  name: string;
};

export type ValidDetectResult<T> = {
  packageJson: T;
  dirName: string;
  dirPath: string;
};

export type InvalidDetectResult = ValidDetectResult<undefined>;

export type FullActionHook = {
  before: () => Promise<boolean>;
  after: () => Promise<boolean>;
}

export type FullPluginResult={
  [key in Actions]:FullActionHook;
}
