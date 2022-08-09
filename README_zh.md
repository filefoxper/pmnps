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

### 使用 pmnps

```
$ pmnps
```

生成目录文件如下:

```
- project
  - node_modules
  - packages
  - plats
  package.json
  .pmnpsrc.json
```

该命令用于生成基本 `monorepo` 多平台管理项目目录。

### 使用 create 命令

#### create package

```
$ pmnps create package -n test
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
  - plats
  package.json
  .pmnpsrc.json
```

#### create platform

```
$ pmnps create platform -n web-test
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
  - plats
    - web-test
      -src
        index.tsx
      package.json
  package.json
  .pmnpsrc.json
```

该命令可用于添加一个 package 平台依赖包或 platform 平台，并将依赖安装至根 `node_modules` 目录。

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
  - plats
    - web-test
      -src
        index.tsx
      package.json
  package.json
  .pmnpsrc.json
```

该命令用于刷新项目，并将所有第三方依赖安装至根 `node_modules` 目录。

### 使用 start 命令

`start` 命令用于启动单个平台的 `npm start` 脚本，请在启用前配置 `package.json > scripts.start`。

```
$ pmnps start
```

或

```
$ pmnps start -n <platform>
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

选项：

```
rename workspace              # 重命名 workspace
active/disable git            # 激活或禁用 git
lock/unlock                   # 锁定或解锁 pmnps 配置
package build strict/loose    # 选择 package 创建模式
private/public project        # 限定 package.json 'private' 字段
```

关于 package 创建模式的说明：

`loose` 模式创建的 package ，拥有一个直接生成在 package 根目录的 `index` 文件，这便于大多数代码编辑器识别，并可以直接在 platform 平台中无缝关联引用到的 package 中的代码，该模式生成的 package 可将编译任务直接外包给 platform 平台来完成，就像当前包就是平台代码的一部分一样。

`strict` 模式创建的 package 中，`index` 文件是存放在根目录的 `src` 目录下的，与 `loose` 模式不同，它虽然也能被直接关联到 platform 平台中使用，但绝大部分编译器并不能识别，所以往往会出现编译提示爆红，实际却可以正常使用的情况，这就需要 typescript 使用者在完成代码编写任务的同时去完善 `index.d.ts` 文件了。该模式相对 `loose` 模式的好处是，包组织更加规范，在开发过程中可以和 `loose` 模式一样，无缝开发（除了要完善声明文件），但在项目编译时，项目会根据包依赖去编译 `strict` 模式下创建的包。

### 使用 template 命令

`template` 命令可以帮助我们创建相关 package 和 platform 的模版项目，在我们使用 `plat` 或 `pack` 命令时，能获取到它的帮助。

### 使用 publish 命令

该命令用于发布所有修改了版本号的 package 和 platform。

```
$ pmnps publish
```

如果发布账号设置了一次性安全密码，可以使用 `-o` 参数带入密码。

```
$ pmnps publish -o 123456
```

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

可配合 `build -p` 命令进行传参操作。

```
$ pmnps build -p "?platB.before= -i -e <word>"
```

## .pmnpsrc.json

`.pmnpsrc.json` 文件是项目的入口配置文件，它包含了 `workspace`、`git`、`lock`、`plugins` 等配置信息。

```
{
  "workspace": "workspace",
  "git": true,
  "lock": true,
  "plugins": ["pmnps-dependencies-detect-plugin"]
}
```

## plugins

plugin 插件系统是自 `pmnps@2.0.0` 加入的，我们可以通过配置 `.pmnpsrc.json` 文件的方式使用它们。在配置它们之前，请先将你需要使用的插件加入 `package.json` 文件的 `devDependencies` 中。

## 更新

### v2.0.0

* `start` 命令参数 `-p` 统一改为 `-n`。
* `pack` 命令更改为 `package` 命令。
* `plat` 命令更改为 `platform` 命令。
* `pmnps.config.json` 文件更改为 `.pmnpsrc.json`。
* 包和平台中的 `pmnps.pack.json`、`pmnps.plat.json` 被废止。
* 添加了简单的插件系统

### v2.0.1

* 使全部编译过程更加平滑

### v2.0.2

* 调整全部编译的开始位置

### v2.0.3

* 修复全部编译日志错位问题

### v2.0.4

* 支持子路径启动 pmnps 命令，自动向上查找 .pmnpsrc.json 文件。

### v2.1.0

* 废弃 initial 命令
* package 和 platform 命令合成为 create 命令
* 去除了全局 build 模式设置项
* 增加了 package build 模式设置

### v2.1.1

* 添加了 `publish` 命令

### v2.1.2

* 修复初始化时 prettier 无法加入 devDependencies 的问题。

### v2.1.3

* 为创建 platform 提供编译模型选择。

### v2.1.4

* 修复 ctrl + c 无法退出子进程的问题