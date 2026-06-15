# OpenGZH - 公众号 Markdown 编辑器

一个面向微信公众号写作与排版的纯前端 Markdown 编辑器，支持实时预览、代码块主题、图片本地持久化与一键复制富文本。

## 核心能力

### 1. 编辑与预览
- 左侧 Markdown 编辑，右侧实时预览。
- 支持常用编辑快捷操作（标题、加粗、斜体、引用、代码块、分割线、表格等）。
- 支持桌面/手机预览模式切换。

### 2. 文档管理
- 支持多文档创建、切换、复制、删除。
- 删除操作使用确认弹窗，避免误删。
- 文档与当前激活状态持久化到 `localStorage`。

### 3. 自动保存与保存状态
- 输入后采用固定 5 秒防抖自动保存。
- 状态栏显示 `保存中 / 已保存 / 保存失败` 与最后保存时间。
- 保留显式保存快捷键：`Ctrl/Cmd + S`。

### 4. 主题与代码面板
- 内置多套公众号排版主题，按风格分类。
- 代码面板支持独立代码主题。

### 5. 图片处理（本地优先）
- 支持粘贴、拖拽、工具栏上传图片。
- 使用 Canvas 压缩后写入 IndexedDB。
- 复制到公众号时自动转换为 Base64。

### 6. 导出与复制
- 一键复制到公众号（富文本 HTML）。
- 支持导出 `.md` 与 `.html`。
- 导入 Markdown 文件。

## 技术栈

- Vue 3（CDN）
- markdown-it
- highlight.js
- turndown
- IndexedDB
- Canvas API
- 原生 ES Modules + 纯 CSS

## 本地运行

```bash
# 启动本地静态服务
python -m http.server 8080

# 访问
# http://localhost:8080
```

也可使用仓库内脚本：

```bash
./start.sh
```

## 项目结构

```text
OpenGZH/
├── index.html
├── about.html
├── README.md
├── start.sh
├── assets/
│   ├── images/
│   ├── scripts/
│   │   ├── main.js
│   │   ├── core/
│   │   ├── export/
│   │   ├── storage/
│   │   └── ui/
│   └── styles/
│       ├── base.css
│       ├── editor.css
│       ├── panel.css
│       └── themes/
└── docs/
```

## 兼容性说明

- 纯前端静态项目，无构建步骤。
- 需要现代浏览器支持：ES Modules、Clipboard API、Fetch、IndexedDB。
