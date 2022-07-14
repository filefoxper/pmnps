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

### 使用 start 命令

`start` 命令用于启动单个平台的 `npm start` 脚本，请在启用前配置 `package.json > scripts.start`。

```
$ pmnps start
```

或

```
$ pmnps start -p <platform>
```

### 使用 build 命令

`build` 命令用于启动多个或单个平台的 `npm run build` 脚本，请在启用前配置 `package.json > scripts.build`。

```
# 编译所有平台
$ pmnps build
```

或

```
# 编译指定平台
$ pmnps build -n <platform name>
```

如果想要使用通过命令 `config` 预先设置的 build 模式来代替当前的 `npm run build` 脚本，我们可以使用 `-m <mode>` 选项。

```
$ pmnps build -m <mode>
```

如果想要在 build 之前进行安装依赖项操作，可以使用 `-i` 选项。

```
$ pmnps build -i
```

如果想要使用 npm 脚本传参，可使用 `-p <param>` 选项。

```
$ pmnps build -p "-i -e <param desc>"
```

注意：以上写法，参数会传给所有 `npm build` 脚本运行，如果希望指定平台可以用：

```
# 就像 url 参数一样，“?平台名=参数&平台名=参数”
$ pmnps build -p "?platA= -i -e <param desc>&platB= -i"
```


### 使用 config 命令

`config` 命令用于配置部分 pmnp 设置，如：启用 git、重命名 workspace、设置 build 模式。build 模式，可以在 build 命令中通过选项 `-m <mode>` 来使用。当我们使用 `plat` 或 `pack` 命令新建项目包时，`packaghe.json > scripts` 中会自动加入所有的 build 模式脚本，`"build-<mode>":"......"`

```
$ pmnps config
```

### 使用 template 命令

`template` 命令可以帮助我们创建相关 package 和 platform 的模版项目，在我们使用 `plat` 或 `pack` 命令时，能获取到它的帮助。

## 配置 package.json

我们可以通过添加 "pmnps" 属性来使用 pmnps 的增强功能。

### platform 配置 platDependencies

通过使用 `pmnps.platDependencies` 配置可以描述出平台项目之间的 build 依赖关系，在我们运行 `build` 命令时， pmnps 会按照我们的描述逐一编译。

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

通过运行 `build` 命令，我们可以观察到 `build platC -> build platB -> build platA` 这样的编译顺序。

### platform 配置 ownRoot

通过在平台项目的 package.json 文件中配置 `pmnps.ownRoot` 可以让该平台使用自己的 `node_modules` 依赖目录。

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

### platform 配置 alias

项目别名配置，目前只对 `build -p` 命令起作用。

package.json

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
    "alias": “pb”
  }
}
```

build

```
# 使用 name
$ pmnps build -p "?platB= -i -e <word>"
# 使用 alias
$ pmnps build -p "?pb= -i -e <word>"
```

### platform 配置 alias

`pmnps.buildHook` 提供了 `before` 和 `after` 两种编译介入模式，并可通过脚本的形式执行他们。在每一个平台编译前后都会检查平台 package.json 中是否有这一项，如有则按照编译的前后设定执行他们。

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
    "buildHook": {
      "before":"echo build start...",
      "after":"echo build end..."
    }
  }
}
```