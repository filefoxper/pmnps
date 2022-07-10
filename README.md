[![npm][npm-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/pmnps.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/pmnps
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard

# pmnps

`pmnps` is a monorepo tool, it uses `npm workspaces` to manage packages and platforms.

## Other language

[中文](https://github.com/filefoxper/pmnps/blob/master/README_zh.md)

## Install

```
npm install pmnps -g
```

or

```
npm install pmnps --save-dev
```

## Basic usage

### use initial command

```
$ pmnps initial
```

after running:

```
- project
  - node_modules
  - packages
  - plats
  package.json
  pmnps.json
```

This command can create a monorepo project and install the dependencies and devDependencies into root `node_modules`.

### use pack command

```
$ pmnps pack -n test
```

after running:

```
- project
  - node_modules
  - packages
    - test
      - src
      index.ts
      package.json
      pmnps.pack.json
  - plats
  package.json
  pmnps.json
```

This command can add a package and install the dependencies and devDependencies into root `node_modules`.

### use plat command

```
$ pmnps plat -n web-test
```

after running:

```
- project
  - node_modules
  - packages
    - test
      - src
      index.ts
      package.json
      pmnps.pack.json
  - plats
    - web-test
      -src
        index.tsx
      package.json
      pmnps.plat.json
  package.json
  pmnps.json
```

This command can add a platform and install the dependencies and devDependencies into root `node_modules`.

### use refresh command

```
$ pmnps refresh
```

after running:

```
- project
  - node_modules
  - packages
    - test
      - src
      index.ts
      package.json
      pmnps.pack.json
  - plats
    - web-test
      -src
        index.tsx
      package.json
      pmnps.plat.json
  package.json
  pmnps.json
```

This command can install all the dependencies and devDependencies from `packages` and `plats` into the root `node_modules`.

### use start command

The `start` command can start a platform development. It runs `npm start` command in platform `package.json > scripts.start`.

```
$ pmnps start
```

or

```
$ pmnps start -p <platform>
```

### use build command

The `build` command can build platforms. It runs `npm run build` command in platform `package.json > scripts.build`.

```
# build all platforms
$ pmnps build
```

or

```
# build a special platform
$ pmnps build -p <platform>
```
