export type Config = {
  workspace: string;
  git?: boolean;
  buildModes?:string[]
};

export type PackConfig = {
  name: string;
  jsFormats: ('ts' | 'tsx' | 'js' | 'jsx')[];
};

export type TemplateConfig = {
  type:'package'|'platform',
  name:string
}
