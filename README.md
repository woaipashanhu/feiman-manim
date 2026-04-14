# Manim 数学动画课堂

手机端优化的数学 Manim 动画视频教学网站，按年级分类展示，支持全屏沉浸式滑动播放。

## 功能特点

- 首页按年级分类展示视频，卡片式横向滚动浏览（Apple TV 风格）
- 全屏沉浸式视频播放，支持触摸左右滑动切换视频
- 响应式设计，手机/平板/桌面端均可访问
- 深色主题，科技感视觉风格

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装与运行

```bash
npm install
npm run dev
```

构建生产版本：

```bash
npm run build
```

构建产物在 `dist/` 目录下，可部署到 GitHub Pages、Vercel 等任意静态托管平台。

## 添加视频

编辑 `src/data/videos.ts` 文件，在对应年级的 `videos` 数组中添加视频信息：

1. 将 Manim 视频上传到腾讯视频
2. 从视频链接中提取 vid，例如 `https://v.qq.com/x/page/w0041abc123.html` 中的 vid 为 `w0041abc123`
3. 添加到配置中：

```typescript
{
  title: "你的视频标题",
  vid: "w0041abc123",  // 腾讯视频 vid
  cover: "https://...",  // 可选，自定义封面图
}
```

## 目录结构

```
src/
  components/       # 共享组件（视频卡片、年级分区）
  pages/            # 页面（首页、播放页）
  data/             # 视频数据配置
  App.tsx           # 路由配置
  main.tsx          # 应用入口
  index.css         # 全局样式
```

## 技术栈

- React 18 + TypeScript
- Tailwind CSS 3
- Vite 6
- React Router 7
- 腾讯视频 iframe 嵌入播放

## 部署到 GitHub Pages

1. 修改 `vite.config.ts` 中的 `base` 为你的仓库名，如 `base: '/manim-video-site/'`
2. 运行 `npm run build`
3. 将 `dist/` 目录推送到 `gh-pages` 分支，或在仓库设置中指定 `dist/` 为 GitHub Pages 源目录
4. 也可以使用 GitHub Actions 自动部署（推荐）：

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```