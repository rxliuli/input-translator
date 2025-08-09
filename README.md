# Browser Extension Template

这是一个浏览器扩展开发模版，使用 React/Shadcn/WXT，支持构建 Chrome/Edge/Firefox/Safari（需要 Mac 环境）兼容的浏览器扩展。

## Init

```sh
git clone https://github.com/<your-github-username>/<your-project-name>.git
cd <your-project-name>
pnpm i
pnpm init-project
```

然后根据提示输入项目名称，即可完成项目初始化。

## Dev

将 Chrome 作为基准版本，Edge/Firefox/Safari 仅在需要发布时构建和测试，以及调试一些它们的**专属**问题。

```sh
pnpm dev
```

然后在 _.output/chrome-mv3-dev_ 找到扩展编译后的文件，在 chrome://extensions 页面将这个目录拖拽进去，即可加载 Debug 扩展。

## Build

### Build Chrome/Edge/Firefox

捆绑 Chrome/Edge/Firefox 版本，生成 zip 文件。

```sh
pnpm zip && pnpm zip:firefox
```

## Safari

Safari 需要 Mac 环境，使用 XCode 构建和发布。使用以下步骤构建 Safari 版本

1. 创建 .env.local 文件，添加 DEVELOPMENT_TEAM
2. 运行 `pnpm build:safari` 会自动构建并打开 XCode
3. 在 XCode 中 Build 并在 Safari 中测试
4. 在 XCode 中选择 Product -> Archive 发布到 App Store
