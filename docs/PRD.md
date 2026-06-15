# OpenGZH PRD

> 版本: vCurrent  
> 更新日期: 2026-05-12

## 1. 产品定位

OpenGZH 是一个面向微信公众号写作与排版的纯前端 Markdown 编辑器。

核心目标有三件事:

1. 让用户能高效完成长文写作与排版。
2. 让预览结果尽量接近最终粘贴到公众号后台后的效果。
3. 在不依赖后端和构建系统的前提下，保证本地可用、可保存、可导出。

## 2. 当前核心能力

### 编辑与预览

- 左侧 Markdown 编辑，右侧实时预览
- 支持桌面 / 手机预览模式切换
- 支持常用工具栏操作:
  - 标题
  - 加粗 / 斜体 / 下划线
  - 链接
  - 行内代码 / 代码块
  - 引用
  - 有序 / 无序列表
  - 分割线
  - 图片
  - 表格

### 文档管理

- 多文档创建、切换、复制、删除
- 文档搜索
- 独立文档标题输入
- 自动保存与保存状态显示
- 本地持久化恢复

### 主题与排版

- 多套公众号正文主题（20 套，按风格分类）
- 独立代码块主题（16 套）
- 代码主题侧栏预览卡片

### 图片处理

- 支持粘贴、拖拽、上传图片
- 图片压缩后存入 IndexedDB
- 编辑器内使用 `img://` 协议引用
- 复制到公众号时自动转为 Base64

### 导出与复制

- 导出 Markdown
- 导出 HTML
- 一键复制到公众号
- X / Twitter 复制链路

### 公式渲染

- 预览阶段使用 KaTeX
- 复制到公众号时导出 MathJax SVG，避免公众号中公式失真
- 长块级公式支持横向滚动
- 纯文本剪贴板回退保留紧凑 LaTeX

## 3. 技术实现说明

### 技术栈

- Vue 3（CDN 引入，无需构建）
- markdown-it（Markdown 解析）
- highlight.js（代码高亮）
- KaTeX / MathJax SVG（公式渲染）
- IndexedDB（图片持久化）
- Canvas API（图片压缩）
- 原生 CSS（CSS Variables + 模块化文件）

### 文件结构

```
OpenGZH/
├── index.html                    # 主页面（编辑器）
├── about.html                    # 关于页面
├── start.sh                      # 一键启动脚本
├── assets/
│   ├── images/                   # 图片资源
│   ├── scripts/
│   │   ├── main.js               # 应用入口
│   │   ├── core/                 # 核心模块
│   │   │   ├── image-compressor.js
│   │   │   ├── image-store.js
│   │   │   ├── markdown-engine.js
│   │   │   ├── paste-handler.js
│   │   │   ├── render-pipeline.js
│   │   │   └── code-highlight.js
│   │   ├── export/               # 导出模块
│   │   │   ├── clipboard-exporter.js
│   │   │   ├── math-exporter.js
│   │   │   └── x-clipboard-exporter.js
│   │   ├── storage/
│   │   │   └── preferences.js
│   │   └── ui/                   # 界面模块
│   │       ├── code-themes.js
│   │       ├── panel-manager.js
│   │       ├── theme-manager.js
│   │       └── toast.js
│   └── styles/
│       ├── base.css
│       ├── editor.css
│       ├── panel.css
│       ├── about.css
│       └── themes/               # 正文主题定义
└── docs/
    ├── PRD.md
    ├── CLAUDE.md
    ├── AGENTS.md
    ├── DESIGN.md
    └── CONTRIBUTING.md
```

### 图片系统架构

```
用户粘贴图片
  → image-compressor.js（Canvas 压缩，最大 1920px，质量 85%）
  → image-store.js（存入 IndexedDB，数据库名 WechatEditorImages）
  → 编辑器插入短链接 img://img-xxx（避免 Base64 卡顿）

渲染预览时：
  render-pipeline.js 从 IndexedDB 读取 → 创建 blob URL → 替换 img://

复制到公众号时：
  clipboard-exporter.js 从 IndexedDB 读取 → 转 Base64 → 替换 img src
```

### 复制到公众号流程

```
渲染后 HTML
  → Grid 转 Table（公众号不支持 CSS Grid）
  → 样式全部内联化
  → 图片 img:// 转 Base64
  → 公式 KaTeX 转 MathJax SVG
  → 写入剪贴板（text/html + text/plain）
```

### 主题系统架构

- **正文主题**：`styles/themes/` 目录下独立 JS 文件，`ui/theme-manager.js` 负责加载和切换
- **代码块主题**：`ui/code-themes.js` 统一管理，采用"容器样式 + token 调色板"模型
- 两套主题独立运作，互不影响

### 文档管理机制

- 文档数据存储在 localStorage（键 `documents`）
- 自动保存：5 秒防抖，状态栏显示 saving / saved / error
- 删除保护：最后一篇文档删除后自动新建空白文档，确保 `documents.length >= 1`
- 当前激活文档 ID 存储在 localStorage（键 `activeDocumentId`）

## 4. 产品约束

- 纯前端静态项目，不引入后端
- 不依赖 Vite / Webpack / npm 构建链路
- 保持本地打开或静态服务器运行即可使用
- 保持现有本地存储与图片协议兼容:
  - `currentStyle`
  - `markdownInput`
  - `documents`
  - `activeDocumentId`
  - `codeBlockSettings`
  - IndexedDB `WechatEditorImages`
  - `img://` 图片引用格式

## 5. 关键体验要求

### 公众号兼容性

- 粘贴到公众号后台后，正文结构应尽量稳定
- 公式不能出现重复文本、碎片化 TeX 或不可控的 MathML 泄露
- 代码块不能只剩背景色，必须尽量保留语法高亮与滚动行为
- 图片、表格、引用、列表在复制链路中应保持基本可用

### 可读性优先

- 长公式优先横向滚动，不优先缩小字号
- 长代码优先横向滚动，不优先强制换行
- 浅色主题下代码 token 必须通过对比度保护保持可读

### 写作效率

- 常用 Markdown 结构要能通过工具栏快速插入
- 文档切换、重命名、复制、删除要足够轻量
- 自动保存状态要可见、可感知

## 6. 当前实现边界

本阶段不包含以下能力:

- 多人协作
- 云同步
- 历史版本 / 时间回退
- 图片资源管理面板
- AI 写作辅助
- 可视化公式编辑器

## 7. 验收标准

### 编辑与保存

- 文档创建、切换、删除、复制可正常工作
- 自动保存状态能正确显示 `saving / saved / error`
- 刷新页面后文档与当前状态能恢复

### 公式

- 复杂块级公式在预览中正常显示
- 复制到公众号后不出现重复 TeX / MathML 文本
- 长公式能横向滚动查看完整内容

### 代码块

- 切换不同代码主题时，背景和 token 颜色都发生变化
- 侧栏预览卡片能反映各主题差异
- 复制到公众号后代码块尽量保留高亮与横向滚动
- 浅色主题下不出现不可读白字

### 图片与复制

- 图片粘贴、拖拽、上传后能正常预览
- 复制到公众号时图片能正常带出
- 表格、引用、列表在复制后保持基本结构

## 8. 迭代记录

### 第一轮：项目重构

**目标**：将早期单文件实现重构为模块化结构

- 从 `app.js`（3279 行）按职责拆分为 `core/`、`export/`、`storage/`、`ui/` 四个目录
- 内联样式从 `index.html` 抽离为独立 CSS 文件（base / editor / panel）
- 验证：所有功能与重构前一致，本地存储正常读取

### 第二轮：文档管理 + 协作文档

**目标**：完善编辑器核心能力，同时建立 AI 协作文档体系

文档管理功能：
- 多文档创建、切换、复制、删除
- 文档搜索、独立文档标题输入
- 自动保存（5 秒防抖）与状态显示（saving / saved / error）
- 本地持久化恢复（localStorage 键 documents / activeDocumentId）
- 删除保护：最后一篇文档删除后自动新建空白文档

协作文档体系：
- 编写 PRD.md（本文档）
- 使用 Claude Code 过程中生成 CLAUDE.md
- 使用 Codex 过程中生成 AGENTS.md

### 第三轮：主题系统扩展

**目标**：丰富排版选择，满足不同写作场景

- 正文主题从 13 套扩展到 20 套，按风格分类（简约主义 / 技术阅读 / 传统质感 / 设计灵感）
- 代码块主题独立为 16 套，支持侧栏迷你预览
- 代码块主题采用"容器样式 + token 调色板"模型，统一管理

### 第四轮：图片处理优化

**目标**：解决图片粘贴的常见痛点

- 实现 `img://` 自定义协议（编辑器内短链接，避免 Base64 卡顿）
- Canvas 压缩（最大 1920px，质量 85%，GIF/SVG 不压缩）
- IndexedDB 持久化存储（刷新不丢失）
- 复制时自动从 IndexedDB 读取 → 转 Base64

### 第五轮：公式渲染支持

**目标**：支持数学公式在预览和公众号中正确显示

- 预览用 KaTeX（轻量快速）
- 复制到公众号时转 MathJax SVG（兼容公众号渲染环境）
- 长块级公式支持横向滚动

### 第六轮：导出能力扩展

**目标**：支持更多导出场景

- X / Twitter 复制链路（`x-clipboard-exporter.js`）
- HTML / Markdown 文件导出

### 第七轮：UI/交互优化

**目标**：基于 DESIGN.md 优化界面

- About 页面独立（`about.html` + `about.css`）
- 暗色模式全局适配
- 移动端响应式优化
- Toast 提示规范化

## 9. Todo 与后续规划

### P0（近期优先）

- [ ] 文档备份 / 恢复能力（导出/导入 JSON）
- [ ] 更稳定的公众号复制验证与回归测试
- [ ] 移动端体验打磨（工具栏、面板交互）

### P1（中期）

- [ ] 图片管理面板（可视化管理 IndexedDB 中的图片）
- [ ] 自定义正文主题（用户可编辑主题配置）
- [ ] 自定义代码块主题
- [ ] 撤销 / 重做功能

### P2（远期）

- [ ] AI 写作辅助（接入 LLM API）
- [ ] 可视化公式编辑器
- [ ] 历史版本 / 时间回退
- [ ] 导出为长图
