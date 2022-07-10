export type Config = {
  workspace: string;
  git?: boolean;
};

export type PackConfig = {
  name: string;
  jsFormats: ('ts' | 'tsx' | 'js' | 'jsx')[];
};
