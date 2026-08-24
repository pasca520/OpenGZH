# ISSUE-002 文档数据迁移至 IndexedDB，废除危险迁移模式

- **优先级**: P0
- **类别**: 数据安全 / 性能
- **状态**: completed（IndexedDB、兼容迁移、崩溃镜像与浏览器启动/保存链路已验收）

## 问题

[preferences.js](../../assets/scripts/storage/preferences.js) 把全部文档（含正文）序列化为一个 localStorage 键：

1. localStorage 5MB 上限，重度用户必然撞墙，撞墙后仅显示"保存失败"无降级。
2. 每次保存全量 `JSON.stringify(documents)`，主线程同步执行。
3. `loadPreferences()` 的 `storedVersion < APP_VERSION → 返回空再写版本号` 模式（L199-214）：未来任何版本号递增都会**静默清空用户全部文档**。

图片已用 IndexedDB（见 [image-store.js](../../assets/scripts/core/image-store.js)，成熟模式可复刻）。

## 要求

1. 新建 `assets/scripts/storage/document-store.js`：IndexedDB 库 `OpenGZHDocuments` v1，object store `documents`（keyPath `id`），索引 `updatedAt`；另存一条 `meta` 记录（activeDocumentId、currentStyle、codeBlockSettings、tocVisible、displaySettings）。
2. `savePreferences` 重构为异步写入 IndexedDB：
   - 单文档粒度保存（`putDocument(doc)`），不再全量序列化；
   - 删除文档时 `deleteDocument(id)`；
   - meta 单独保存。
3. 兼容迁移：首次启动时若 IndexedDB 无数据而 localStorage 有旧 `documents` 键，则导入到 IndexedDB，成功后**保留** localStorage 原键不删（作为只读备份，防迁移 bug 丢数据）。旧 `markdownInput` 内容若无对应文档也导入为一个新文档。
4. **彻底删除**"版本号小于当前则返回空"的丢弃式迁移逻辑。迁移必须是显式的、增量的、可失败的（失败时回退读 localStorage）。
5. main.js 中所有 `persistDocumentState` / `debounceSaveContent` / `handleSaveSuccess/Error` 调用点适配异步保存；保存状态灯逻辑保留。
6. `beforeunload` + `visibilitychange(hidden)` 时同步冲刷未落盘变更（IndexedDB 写是异步的，unload 里尽力触发即可，另配合将最新内容镜像一份到 localStorage 作为崩溃恢复兜底——允许这个镜像超限时静默失败）。
7. 更新 [preferences.js] 现有导出签名时保持向后兼容（main.js 之外无人 import 它，但 vitest 测试可能引用 normalize 函数——先跑 `npx vitest run` 确认基线，改后测试必须全绿；如需给 document-store 补单测更好）。

## 验收

- `npx vitest run` 全绿。
- 手动：创建 3 个文档 → 刷新 → 文档与当前文档均恢复；Application 面板可见 IndexedDB 数据。
- 手动：预置旧格式 localStorage 数据 → 首次打开自动迁入 IndexedDB 且内容无损。
