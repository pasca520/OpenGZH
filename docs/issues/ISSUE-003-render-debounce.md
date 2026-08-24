# ISSUE-003 渲染管线防抖 + 统计节流 + beforeunload 冲刷

- **优先级**: P0
- **类别**: 性能
- **状态**: completed（防抖、revision、flush 与浏览器回归已验收）

## 问题

[main.js:3353](../../assets/scripts/main.js#L3353) `watch(markdownInput)` 同步执行 `renderMarkdown()` + `updateStats()`。renderPipeline 每次按键都全量跑：markdown 解析 → DOMParser → 全 selector 内联样式 → 序列化。万字长文每键延迟线性恶化。xhs 分页已有 450ms 防抖 + revision 竞态保护，主预览没有。另外防抖保存延迟 5 秒且无 unload 冲刷（该部分若 ISSUE-002 未合并则在本 issue 先以现有 savePreferences 实现）。

## 要求

1. `renderMarkdown()` 加尾沿防抖 180ms（新建 `scheduleRender()` 包装；切换主题/代码主题等离散操作仍立即渲染，不受防抖影响）。注意 `doCopy`、`exportHTML` 等依赖 renderedContent 的路径必须拿到的渲染结果是新鲜的——在这些入口前 flush 待执行的渲染（暴露 `flushPendingRender(): Promise<void>`）。
2. 渲染加 revision 号竞态保护（仿照 xhsPaginationRevision）：慢渲染完成后若 revision 已过期则丢弃结果。
3. `updateStats()` 用独立 300ms 节流（与渲染防抖解耦，避免统计阻塞渲染调度）。
4. `beforeunload` / `visibilitychange→hidden` 冲刷：立即执行一次待处理的渲染调度跳过（不必等）+ 触发持久化保存（若 ISSUE-002 已合并则调用其冲刷 API；否则调用现有 `persistDocumentState()` 同步路径）。
5. 不改动 render-pipeline.js 本身的算法（其优化不在本 issue 范围）。

## 验收

- `npx vitest run` 全绿（本 issue 主要改 main.js，现有测试应不受影响）。
- 快速连续输入时 Network/Performance 面板确认渲染合并为尾沿一次；停止输入 ~200ms 后预览更新。
