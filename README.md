# OpenGZH · 公众号 Markdown 编辑器

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Vanilla JS](https://img.shields.io/badge/JS-ES_Modules-f7df1e?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-2ea44f)]()

面向微信公众号写作与排版的纯前端 Markdown 编辑器——实时预览、代码高亮、图片本地持久化、一键复制富文本，**零构建、零依赖**，部署即用。

<p align="center">
  <img src="https://opengzh.pasca.fun/screenshot.png" alt="OpenGZH 编辑器截图" width="800">
</p>

---

## 功能

<table>
<tr>
<td width="50%">

---

## 技术栈

| 层             | 方案                                     |
| -------------- | ---------------------------------------- |
| 框架           | Vue 3（CDN）                             |
| Markdown 渲染  | markdown-it                              |
| 代码高亮       | highlight.js                             |
| HTML→Markdown | turndown                                 |
| 图片存储       | IndexedDB + Canvas API                   |
| 模块化         | 原生 ES Modules                          |
| 样式           | 纯 CSS（CSS Variables 主题系统）         |
| 部署           | 纯静态，GitHub Actions → rsync → Nginx |

---

## 本地运行

```bash
# 启动静态服务
python3 -m http.server 8080

# 或使用内置脚本
./start.sh
```

浏览器打开 `http://localhost:8080` 即可。

---

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
│       └── themes/         # 微信公众号主题（6+ 套）
└── docs/                   # 设计文档 & PRD
```

---

## 兼容性

需现代浏览器支持：ES Modules · Clipboard API · Fetch · IndexedDB · Canvas API
