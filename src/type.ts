export type Config = {
  workspace: string;
};

export type PackConfig = {
  name:string,
  jsFormats:("ts" | "tsx" | "js" | "jsx")[]
}
