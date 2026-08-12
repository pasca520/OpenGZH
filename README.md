<p align="center">
  <img src="./assets/readme/hero.svg" width="100%"
       alt="OpenGZH · 为公众号写作而生的 Markdown 编辑器——所见即所得、零构建、零依赖、部署即用">
</p>

> 面向微信公众号写作与排版的纯前端 Markdown 编辑器。左侧写 Markdown，右侧实时预览最终排版；图片本地持久化、一键复制富文本，**零构建、零依赖，部署即用**。

---

## 界面一览

<p align="center">
  <img src="./assets/readme/editor.webp" width="100%" alt="OpenGZH 编辑器：左侧 Markdown 源码，右侧公众号排版实时预览">
</p>

<p align="center">
  <img src="./assets/readme/cover.webp" width="49%" alt="封面图设计：40 套封面模板，按场景挑选">
  <img src="./assets/readme/phone.webp" width="49%" alt="手机预览：29 款机型，所见即所得">
</p>

## 核心亮点

| 能力 | 说明 |
| --- | --- |
| 文章主题 | 27 套风格主题，按五类写作场景分类，预览即最终效果 |
| 代码高亮 | 17 种高亮方案，随文章主题自动联动 |
| 封面模板 | 40 套封面 + 73 幅 SVG 插画，场景标签辅助选择 |
| 手机预览 | 29 款机型（含折叠屏），桌面 / 手机一键切换 |
| 数学公式 | LaTeX 渲染，导出自动转 SVG |
| 图片管理 | 拖拽 / 粘贴 / 上传，IndexedDB 本地持久化，不依赖图床 |
| 一键发布 | 复制富文本直达公众号后台，粘贴即发布 |
| 文档管理 | 多文档切换、搜索、自动保存 |

## 工作流程

<p align="center">
  <img src="./assets/readme/workflow.svg" width="100%" alt="从 Markdown 到公众号：编辑 → markdown-it 实时渲染 → 主题排版与封面模板 → 一键复制富文本">
</p>

所有能力都在浏览器内完成：Markdown 经 `markdown-it` 实时渲染，叠加主题与封面后，一键把富文本复制到公众号后台，全程不经过任何服务器。

## 为什么是 OpenGZH

- **所见即所得** —— 预览区就是你粘贴到公众号后的样子，不用反复调试样式。
- **零构建、零依赖** —— 没有 Node、没有构建步骤、没有后端，静态托管即可上线。
- **图片本地化** —— 图片入库自动保存，不依赖图床与外链，防失效。
- **一键发布** —— 富文本带样式直达公众号后台，省去手动排版。

## 快速开始

```bash
# 启动静态服务
python3 -m http.server 8080

# 或使用内置脚本
./start.sh
```

浏览器打开 <http://localhost:8080> 即可使用。

> 在线体验：[opengzh.pasca.fun](https://opengzh.pasca.fun)

## 项目结构

```text
OpenGZH/
├── index.html              # 主编辑器
├── about.html              # 关于页面
├── start.sh                # 本地启动脚本
├── assets/
│   ├── images/             # 图标、Logo、封面插图（200+ SVG）
│   ├── scripts/
│   │   ├── main.js         # Vue 应用入口
│   │   ├── core/           # Markdown 渲染管线
│   │   ├── storage/        # IndexedDB 持久化
│   │   ├── export/         # 导出 / 复制模块
│   │   ├── ui/             # 主题管理、代码主题
│   │   └── cover/          # 封面插图系统
│   └── styles/
│       ├── base.css        # 基础样式 & CSS Variables
│       ├── editor.css      # 编辑器布局
│       ├── panel.css       # 侧边面板
│       ├── cover.css       # 封面插图样式
│       └── themes/         # 微信公众号主题
└── docs/                   # 设计文档 & PRD
```

## 技术栈

| 层 | 方案 |
| --- | --- |
| 框架 | Vue 3（CDN） |
| Markdown 渲染 | markdown-it |
| 代码高亮 | highlight.js |
| HTML → Markdown | turndown |
| 图片存储 | IndexedDB + Canvas API |
| 模块化 | 原生 ES Modules |
| 样式 | 纯 CSS（CSS Variables 主题系统） |
| 部署 | 纯静态，GitHub Actions → rsync → Nginx |

## 兼容性

需现代浏览器支持：ES Modules · Clipboard API · Fetch · IndexedDB · Canvas API

## License

MIT
