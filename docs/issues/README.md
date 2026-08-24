# Issues — 架构优化跟踪

来源：2026-08-23 全项目架构审查。执行顺序按优先级；并行派发时以文件所有权矩阵避免冲突。

| Issue | 优先级 | 类别 | 状态 | 所有权文件 |
|---|---|---|---|---|
| [001 自托管 CDN 依赖](ISSUE-001-self-host-vendor-deps.md) | P0 | 可靠性 | completed | index.html, assets/vendor/*, assets/fonts/*, assets/styles/fonts.css |
| [002 文档迁移 IndexedDB](ISSUE-002-docs-to-indexeddb.md) | P0 | 数据安全 | completed | storage/*, (main.js 持久化调用点) |
| [003 渲染防抖与冲刷](ISSUE-003-render-debounce.md) | P0 | 性能 | completed | main.js watch 区 |
| [004 注册表动态加载+去重](ISSUE-004-cleanup-perf.md) | P1 | 性能/维护 | completed | cover/illustration-registry.js, core/format-utils.js, ui/asset-loader.js |
| [005 CSP 与 sanitize](ISSUE-005-csp-sanitize.md) | P1 | 安全 | completed | core/html-sanitizer.js, render-pipeline.js, index.html |

## 并行冲突规则

- ISSUE-002 与 ISSUE-003 都碰 main.js：002 改持久化调用点，003 改 watch 区——**002 先合并**，003 rebase 后再做 unload 冲刷接线。
- ISSUE-001 与 ISSUE-005 都碰 index.html：001 改资源引用行，005 加 CSP meta 行——不同区域，rebase 冲突手工合。
