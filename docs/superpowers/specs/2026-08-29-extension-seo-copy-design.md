# OpenGZH 插件 SEO 文案设计

**状态：** 文案方向已确认，等待书面规格复核
**日期：** 2026-08-29

## 1. 目标

从运营发现和用户理解两个角度重写插件主标题与副标题：

- 主标题直接覆盖 `Markdown`、`文章同步`、`多平台` 三个核心搜索意图。
- 副标题说清用户在 OpenGZH 完成排版后，可一键生成各平台草稿。
- 不使用“一键发布”等会让用户误以为自动正式发布的表述。

## 2. 定稿文案

| 位置 | 文案 |
| --- | --- |
| Manifest 主标题 `name` | `OpenGZH - Markdown 文章多平台同步` |
| Manifest 短名 `short_name` | `OpenGZH` |
| Manifest 副标题 `description` | `在 OpenGZH 完成 Markdown 排版后，一键同步到微信公众号、知乎、掘金和人人都是产品经理草稿箱。` |
| 扩展按钮提示 `action.default_title` | `OpenGZH - Markdown 文章多平台同步` |
| 同步弹层主标题 | `Markdown 文章多平台同步` |
| 同步弹层说明 | `在 OpenGZH 完成排版后，一键同步到所选平台草稿箱。` |

Manifest 副标题保留四个平台名称，用于商店搜索结果中快速说明覆盖范围；弹层说明使用“所选平台”，避免在紧凑界面里重复罗列平台。

## 3. 改动边界

- 修改 `extension/manifest.json`。
- 修改 `extension/src/content/open-gzh.js` 中的弹层主标题与说明。
- 同步修改 Manifest、构建锁定和内容脚本的回归测试。
- 更新 `extension/REAL-BROWSER-ACCEPTANCE.md` 中的当前身份文案；旧设计稿和历史实施计划保持不变。
- 不改动插件功能、权限、平台适配器或商店后台的详细描述。

## 4. 验收

- Manifest 和构建脚本锁定新主标题、副标题与按钮提示。
- 弹层主标题和说明使用上表文案，并有自动化断言。
- `npm test`、`node --check`、`git diff --check` 和 `npm run build:extension` 通过。
- 构建出的 ZIP 中 Manifest 与源码一致。
