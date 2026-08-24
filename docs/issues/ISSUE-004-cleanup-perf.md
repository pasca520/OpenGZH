# ISSUE-004 illustration-registry 动态加载 + 工具函数去重 + 缓存版本号自动化

- **优先级**: P1
- **类别**: 性能 / 维护性
- **状态**: completed（插画注册表按封面 Tab 延迟加载，工具函数已合并，静态资源版本集中管理）

## 问题（三个小项，同属低风险清理）

1. [illustration-registry.js](../../assets/scripts/cover/illustration-registry.js) 12113 行静态 import，应用启动即解析，但只有封面 Tab 才用。1240 条数据应以 JSON 形式按需 fetch。
2. 工具函数三处重复：`clampNumber` 在 [main.js:1777](../../assets/scripts/main.js#L1777)、[preferences.js:125](../../assets/scripts/storage/preferences.js#L125)、[render-pipeline.js:356](../../assets/scripts/core/render-pipeline.js#L356)；`hexToRgba` 在 [main.js:2145](../../assets/scripts/main.js#L2145)（hexToRgbaLocal）与 [render-pipeline.js:372](../../assets/scripts/core/render-pipeline.js#L372)。语义略有差异（precision 参数），统一到一个新模块 `assets/scripts/core/format-utils.js`，各处改为 import，行为保持逐字节一致（先写快照测试锁定现行为再重构）。
3. index.html 手工缓存版本号 `?v=17/18...` 散落多处，git log 已有多次 "refresh caches" 补救提交。方案：新增 `assets/scripts/ui/asset-versions.js` 导出单一版本常量，index.html 头部内联脚本读取它并批量重写 stylesheet/script 的 query 参数（零构建下最简做法：内联一小段脚本按 `data-asset` 标注重写 href，或直接把版本号集中写在 HTML 顶部一个 JS 对象里由同一脚本应用）。**不要**引入 service worker（超出本 issue 范围）。

## 约束

- item 1：JSON 放 `assets/images/cover-illustrations/registry.json`；illustration-registry.js 改为 `loadIllustrationRegistry()` 异步初始化 + 内存缓存；main.js 封面 Tab 首次激活时 await 初始化；所有消费方（getIllustration/getIllustrationsByCategory/getAllIllustrations/ILLUSTRATION_CATEGORIES 等）接口形状不变。ILLUSTRATION_CATEGORIES/MARKETS 这类小常量可以留在 JS 里同步导出，只有 1240 条大数组进 JSON。
- item 2：**禁止**顺手改任何行为；diff 必须是纯移动。

## 验收

- `npx vitest run` 全绿（为 format-utils 新增单测）。
- 首屏加载的 JS 总字节显著下降（记录前后数字写进 PR 描述）；封面 Tab 功能不回归（选插画、换色、分类过滤正常）。
