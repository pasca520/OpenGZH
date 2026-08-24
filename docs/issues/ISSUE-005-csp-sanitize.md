# ISSUE-005 CSP 与 XSS 面收敛

- **优先级**: P1
- **类别**: 安全
- **状态**: completed（DOM/无 DOMParser 回退 sanitizer、渲染接入、CSP 与内联脚本外置已完成）

## 问题

markdown-it 开启 `html: true`（[markdown-engine.js:107](../../assets/scripts/core/markdown-engine.js#L107)），渲染结果经 5 处 `v-html` 直插 DOM，无 DOMPurify、无 CSP。「导入他人的 .md 文件」是正常使用场景，内嵌 `<img onerror=...>` 即可在应用源内执行任意脚本——自伤升级为社工向量。

## 要求（分层防御，不破坏合法 HTML 排版能力）

1. **sanitize 层**：新建 `assets/scripts/core/html-sanitizer.js`。基于 DOMParser 白名单过滤：
   - 允许：排版相关标签（p/h1-h6/ul/ol/li/blockquote/table/thead/tbody/tr/th/td/pre/code/span/div/img/a/strong/em/del/u/hr/br/section/sup/sub/figure/figcaption/input(仅 checkbox 只读)/details/summary/font）+ KaTeX/MathJax 输出所需的全套标签（span 带 class、svg/path/g/semantics/annotation/math/mrow/mi/mo/mn/msup 等——以 sanitize 后 KaTeX 公式渲染不变为准，用默认示例文档里的公式做回归）；
   - 属性白名单：style/class/id(href/target/alt/src/data-* 仅限既有管线使用的 data-image-id、data-code-block、data-language、data-formula-source 等)；
   - 剥离所有事件处理器属性（on*）、javascript: URL、`<script>/<iframe>/<object>/<embed>/<link>/<meta>`；
   - a 标签强制 `rel="noopener noreferrer"`，target=_blank 保留。
   - 导出单测：恶意样本向量集（onerror、javascript:href、svg onload、嵌套逃逸、大小写混淆、data:text/html）全部被剥离，且合法样例（含公式/表格/卡片 HTML）结构无损。
2. **接入点**：renderPipeline 在 md.render 之后、processImageProtocol 之前调用 sanitize（预览与复制共用上游，一处接入两端生效）。
3. **CSP**：index.html 加 `<meta http-equiv="Content-Security-Policy">`：`default-src 'self'`、`img-src 'self' data: blob: https:`、`style-src 'self' 'unsafe-inline'`（内联 style 是本产品的核心输出形式，必须保留）、`script-src 'self' 'unsafe-eval'`（无构建模式下 Vue 全量浏览器构建需要编译 index.html 模板，后续引入预编译构建后应移除 `'unsafe-eval'`）、`connect-src 'self'`、`font-src 'self' data:`。注意：v-html 注入的内联样式与 SVG 内联事件为零的现状要在审查时验证。
4. **不动** markdown-it 的 `html: true` 开关本身（关闭会破坏粘贴富文本往返场景），sanitize 在下游兜底。

## 验收

- `npx vitest run` 全绿，新增 sanitizer 测试通过。
- 手动：导入含 `<img src=x onerror=alert(1)>` 的 md → 预览显示裂图但不弹窗；默认示例文档（含公式、表格、卡片、代码块）渲染与改动前逐像素级一致（目测）。
