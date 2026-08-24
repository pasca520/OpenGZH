# ISSUE-001 自托管全部 CDN 依赖，消除大陆可用性单点风险

- **优先级**: P0
- **类别**: 可靠性 / 生产风险
- **状态**: completed（本地 vendor、字体、静态入口与断网资源检查已完成）

## 问题

[index.html](../../index.html) 从 jsdelivr 加载 vue、markdown-it、katex、texmath、MathJax、highlight.js、turndown 七个库，从 fonts.googleapis.com 加载 12 个字族。目标用户是中国大陆公众号作者：Google Fonts 在大陆被阻断（阻塞渲染），jsdelivr 间歇性不可达。任一库加载失败 = 应用白屏或无功能。且无 SRI 校验。

## 要求

1. 新建 `assets/vendor/` 目录，下载以下库的生产版并本地化：
   - markdown-it@14.0.0 (dist/markdown-it.min.js)
   - katex@0.16.25 (dist/katex.min.js + dist/katex.min.css + dist/fonts/*)
   - markdown-it-texmath@1.0.0 (texmath.min.js + css/texmath.min.css)
   - mathjax@3 (es5/tex-svg-full.js)
   - highlight.js@11.9.0 (highlight.min.js)
   - turndown@7.2.0 (dist/turndown.js)
   - vue@3.4.15 (dist/vue.global.prod.js)
2. Google Fonts 全部字族改为自托管：下载 woff2（中文字族只需覆盖项目实际用到的字符集即可，用 `fonttools`/`glyphhanger` 或直接取 Google Fonts 的分片子集 CSS），放入 `assets/fonts/`，写 `assets/styles/fonts.css` 用 `@font-face` 声明（带 `font-display: swap`）。
3. index.html 所有 `<script src>` 与 `<link href>` 改为相对路径本地引用；KaTeX 字体路径在 katex.min.css 内部是 `fonts/` 相对引用，保持 css 与 fonts 目录结构一致即可。
4. 不引入构建步骤、不引入 npm runtime 依赖——就是纯文件下载 + 路径替换。
5. 完成后 grep 确认 index.html 中不再有任何 `cdn.jsdelivr.net` / `fonts.googleapis.com` / `fonts.gstatic.com` 引用。

## 验收

- 断网（或屏蔽外网）情况下 `python3 -m http.server` 打开应用，编辑、预览、代码高亮、公式渲染全部正常。
- Network 面板无任何第三方域名请求。
