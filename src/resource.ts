const jsFormat = 0b00000001;

const jsxFormat = 0b00000011;

const tsFormat = 0b00000100;

const tsxFormat = 0b00000110;

const formatMap = new Map<'js' | 'jsx' | 'ts' | 'tsx', number>([
  ['js', jsFormat],
  ['jsx', jsxFormat],
  ['ts', tsFormat],
  ['tsx', tsxFormat]
]);

function selectJsFormat(
  formats: ('js' | 'jsx' | 'ts' | 'tsx')[]
): 'js' | 'jsx' | 'ts' | 'tsx' {
  const result = formats.reduce(
    (r, format) => (formatMap.get(format) || 0) | r,
    0
  );
  const e: Array<['js' | 'jsx' | 'ts' | 'tsx', number]> = [
    ...formatMap.entries()
  ].reverse();
  const found = e.find(([k, v]) => (v & result) === v);
  if (!found) {
    return 'js';
  }
  return found[0];
}

const prettier = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'none',
  arrowParens: 'avoid'
};

const gitignore =`
node_modules/
/.idea/
/.vscode/
`;

const basicDevDependencies = {
  prettier: '^2.7.0'
};

export { selectJsFormat, basicDevDependencies, prettier,gitignore };
