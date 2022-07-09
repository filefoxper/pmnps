const jsFormat = 0b00000001;

const jsxFormat = 0b00000011;

const tsFormat = 0b00000100;

const tsxFormat = 0b00000110;

const formatMap = new Map<"js" | "jsx" | "ts" | "tsx", number>([
  ["js", jsFormat],
  ["jsx", jsxFormat],
  ["ts", tsFormat],
  ["tsx", tsxFormat],
]);

function selectJsFormat(
  formats: ("js" | "jsx" | "ts" | "tsx")[]
): "js" | "jsx" | "ts" | "tsx" {
  const result = formats.reduce(
    (r, format) => (formatMap.get(format) || 0) | r,
    0
  );
  const e: Array<["js" | "jsx" | "ts" | "tsx", number]> = [
    ...formatMap.entries(),
  ].reverse();
  const found = e.find(([k, v]) => (v & result) === v);
  if (!found) {
    return "js";
  }
  return found[0];
}

const packageJsonDevDependencies = {
  eslint: "^7.30.0",
  "eslint-config-airbnb": "^18.2.1",
  "eslint-config-prettier": "^8.3.0",
  "eslint-import-resolver-typescript": "^2.4.0",
  "eslint-plugin-import": "^2.22.1",
  "eslint-plugin-jsx-a11y": "^6.4.1",
  "eslint-plugin-react": "^7.23.1",
  "eslint-plugin-react-hooks": "^4.2.0",
  prettier: "2.3.2",
  "prettier-eslint": "^12.0.0",
  "prettier-eslint-cli": "^5.0.1",
};

const prettier = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: "none",
  arrowParens: "avoid",
};

const eslint = {
  env: {
    browser: true,
    es6: true,
  },
  extends: ["airbnb", "plugin:@typescript-eslint/recommended", "prettier"],
  globals: {
    Atomics: "readonly",
    SharedArrayBuffer: "readonly",
    self: "readonly",
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    tsconfigRootDir: ".",
    project: ["./tsconfig.json"],
  },
  plugins: ["@typescript-eslint"],
  settings: {
    "import/resolver": {
      typescript: {},
    },
  },
  rules: {
    "import/extensions": "off",
    "import/order": "off",
    "no-param-reassign": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": ["off"],
    "react/jsx-filename-extension": [
      "off",
      { extensions: [".js", ".jsx", ".ts", ".tsx"] },
    ],
    "react/jsx-props-no-spreading": "off",
    "import/prefer-default-export": "off",
    "max-classes-per-file": "off",
    "no-plusplus": ["error", { allowForLoopAfterthoughts: true }],
    "react/require-default-props": "off",
    camelcase: "off",
    "no-use-before-define": "off",
    "@typescript-eslint/no-use-before-define": [
      "error",
      { functions: false, classes: true },
    ],
    "react/no-did-update-set-state": "error",
    "no-shadow": "off",
    "class-methods-use-this": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "jsx-a11y/no-static-element-interactions": "off",
    "jsx-a11y/click-events-have-key-events": "off",
    "jsx-a11y/mouse-events-have-key-events": "off",
    "jsx-a11y/alt-text": "off",
    "jsx-a11y/no-noninteractive-element-interactions": "off",
    "no-bitwise": "off",
    "@typescript-eslint/no-shadow": "warn",
    "jsx-a11y/media-has-caption": "off",
  },
};

export { selectJsFormat, packageJsonDevDependencies, prettier,eslint };
