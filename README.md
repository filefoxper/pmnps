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

This command can create a monorepo project and install the `dependencies & devDependencies` into root `node_modules`.

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

This command can add a package and install the `dependencies & devDependencies` into root `node_modules`.

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
$ pmnps build -n <platform name>
```

If you want to build with a mode you set with command `config`, you can use option param `-m <mode>`.

```
$ pmnps build -n <platform name> -m <mode>
```

If you want to install dependencies before build, you can use option param `-i`.

```
$ pmnps build -n <platform name> -m <mode> -i
```

If you want to add param to npm build script, you can use option param `-p <param>`.

```
$ pmnps build -p "-i -e <param desc>"
```

### use config command

The `config` command allows you to do more configs. You can open `git usage`, `rename workspace` and add `build mode` for your project. The `build mode` is a string word which will be added into your `package.json > scripts` like `scripts.build-<mode>`, when you use command `build` with option `-m <mode>`, it runs `npm run build-<mode>` script.

```
$ pmnps config
```

### use template command

The `template` command can help you build some templates for `packages` and `plats`. When you use `pack` or `plat` command to build a project, it can be helpful.

```
$ pmnps template
```

## Package.json config

Now, you can add `pmnps` property into your package.json in platforms or packages.

### platform config platDependencies

Add `pmnps.platDependencies` config to describe the build dependencies in platforms.

platA -> package.json

```
{
  "private": true,
  "name": "platA",
  "version": "0.0.1",
  "scripts": {
    "start": "...start",
    "build": "... build",
    "build-inside": ".... build inside mode" 
  },
  "pmnps": {
    "platDependencies": [
      "platB"
    ]
  }
}
```

platB -> package.json

```
{
  "private": true,
  "name": "platB",
  "version": "0.0.1",
  "scripts": {
    "start": "...start",
    "build": "... build",
    "build-inside": ".... build inside mode" 
  },
  "pmnps": {
    "platDependencies": [
      "platC"
    ]
  }
}
```

platC -> package.json

```
{
  "private": true,
  "name": "platC",
  "version": "0.0.1",
  "scripts": {
    "start": "...start",
    "build": "... build",
    "build-inside": ".... build inside mode" 
  }
}
```

So, when use command `build`, it will follow the `platDependencies` build one by one, `build platC -> build platB -> build platA`.

### platform config ownRoot

Add `pmnps.ownRoot` config to describe a platform which installs `node_modules` in own root folder.

```
{
  "private": true,
  "name": "platB",
  "version": "0.0.1",
  "scripts": {
    "start": "...start",
    "build": "... build",
    "build-inside": ".... build inside mode" 
  },
  "pmnps": {
    "ownRoot": true
  }
}
```