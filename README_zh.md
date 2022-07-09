[![npm][npm-image]][npm-url]
[![standard][standard-image]][standard-url]

[npm-image]: https://img.shields.io/npm/v/pmnps.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/pmnps
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard

# pmnps

`pmnps` 是一个基于 `npm workspaces` 的 `monorepo` 多平台管理工具。

## 安装

```
npm install pmnps -g
```

或

```
npm install pmnps --save-dev
```

## 基本用法

### 使用 initial 命令

```
$ pmnps initial
```

生成目录文件如下:

```
- project
  - node_modules
  - packages
  - plats
  package.json
  pmnps.json
```

该命令用于生成基本 `monorepo` 多平台管理项目目录。

### 使用 pack 命令

```
$ pmnps pack -n test
```

生成目录文件如下:

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

该命令用于添加一个 package 平台依赖包，并将依赖安装至根 `node_modules` 目录。

### 使用 plat 命令

```
$ pmnps plat -n web-test
```

生成目录文件如下:

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

该命令用于添加一个 platform 平台项目入口，并将依赖安装至根 `node_modules` 目录。

### 使用 refresh 命令

```
$ pmnps refresh
```

生成目录文件如下:

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

  该命令用于刷新项目，并将所有第三方依赖安装至根 `node_modules` 目录。


