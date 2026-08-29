# OpenGZH Extension SEO Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将插件主标题、副标题和同步弹层文案统一为已确认的 Markdown 文章多平台同步定位。

**Architecture:** 不新增文案层或运行时配置；直接替换 Manifest 和内容脚本中现有常量，并由现有 Manifest/构建/内容脚本测试锁定。历史设计文档不回写，只更新当前真实浏览器验收清单。

**Tech Stack:** Chrome Manifest V3、原生 JavaScript、Vitest、Node.js 构建脚本

---

### Task 1: 锁定 Manifest 与扩展按钮文案

**Files:**
- Modify: `extension/tests/manifest.test.js`
- Modify: `scripts/__tests__/build-extension.test.js`
- Modify: `extension/manifest.json`
- Modify: `scripts/build-extension.mjs`

- [ ] **Step 1: 先更新 Manifest 与构建测试的期望文案**

```js
name: 'OpenGZH - Markdown 文章多平台同步',
short_name: 'OpenGZH',
description: '在 OpenGZH 完成 Markdown 排版后，一键同步到微信公众号、知乎、掘金和人人都是产品经理草稿箱。',
action: {
  default_title: 'OpenGZH - Markdown 文章多平台同步',
},
```

在 `scripts/__tests__/build-extension.test.js` 的安全身份测试中再加一个反例：

```js
expect(() => validateExtensionManifest({
  ...manifest,
  action: { ...manifest.action, default_title: '旧标题' },
})).toThrowError(/按钮标题/);
```

- [ ] **Step 2: 运行定向测试，确认旧 Manifest 与构建锁定导致失败**

Run: `npm test -- extension/tests/manifest.test.js scripts/__tests__/build-extension.test.js`

Expected: FAIL，差异指向旧 `name`、`description`、`action.default_title` 或构建身份校验。

- [ ] **Step 3: 最小替换 Manifest 文案并补齐构建锁定**

`extension/manifest.json` 使用 Step 1 的四个字段。`scripts/build-extension.mjs` 对三类字段做精确比较：

```js
if (manifest.name !== 'OpenGZH - Markdown 文章多平台同步' || manifest.short_name !== 'OpenGZH') {
  throw new Error('插件名称错误');
}
if (manifest.description !== '在 OpenGZH 完成 Markdown 排版后，一键同步到微信公众号、知乎、掘金和人人都是产品经理草稿箱。') {
  throw new Error('插件副标题错误');
}
if (manifest.action?.default_title !== 'OpenGZH - Markdown 文章多平台同步') {
  throw new Error('插件按钮标题错误');
}
```

- [ ] **Step 4: 重跑定向测试**

Run: `npm test -- extension/tests/manifest.test.js scripts/__tests__/build-extension.test.js`

Expected: PASS，两个测试文件零失败。

- [ ] **Step 5: 提交 Manifest 文案改动**

```bash
git add extension/manifest.json extension/tests/manifest.test.js scripts/build-extension.mjs scripts/__tests__/build-extension.test.js
git commit -m "feat: clarify extension sync positioning"
```

### Task 2: 统一同步弹层文案

**Files:**
- Modify: `extension/tests/content-script.test.js`
- Modify: `extension/src/content/open-gzh.js`

- [ ] **Step 1: 先更新内容脚本测试中的主标题和说明断言**

```js
expect(ui.title.textContent).toBe('Markdown 文章多平台同步');
expect(ui.subtitle.textContent).toBe('在 OpenGZH 完成排版后，一键同步到所选平台草稿箱。');
```

只修改对弹层标题/说明的断言；主操作按钮继续使用“同步到草稿”，不改动操作语义。

- [ ] **Step 2: 运行定向测试，确认旧弹层文案导致失败**

Run: `npm test -- extension/tests/content-script.test.js`

Expected: FAIL，差异为“同步到草稿”/旧说明与新文案不一致。

- [ ] **Step 3: 替换弹层文案常量与标题创建值**

```js
const SUBTITLE = '在 OpenGZH 完成排版后，一键同步到所选平台草稿箱。';
// ...
const title = textElement(doc, 'h2', 'Markdown 文章多平台同步', 'opengzh-title');
```

- [ ] **Step 4: 重跑内容脚本测试**

Run: `npm test -- extension/tests/content-script.test.js`

Expected: PASS，该文件全部测试通过。

- [ ] **Step 5: 提交弹层文案改动**

```bash
git add extension/src/content/open-gzh.js extension/tests/content-script.test.js
git commit -m "feat: align sync dialog copy"
```

### Task 3: 更新验收文档并重建产物

**Files:**
- Modify: `extension/REAL-BROWSER-ACCEPTANCE.md`
- Build: `dist/OpenGZH-extension-v0.1.0.zip`

- [ ] **Step 1: 更新当前真实浏览器验收清单的身份文案**

将文档中的旧插件描述替换为：

```markdown
`OpenGZH - Markdown 文章多平台同步`
`在 OpenGZH 完成 Markdown 排版后，一键同步到微信公众号、知乎、掘金和人人都是产品经理草稿箱。`
```

- [ ] **Step 2: 执行全量验证**

Run:

```bash
npm test
node --check extension/src/content/open-gzh.js
node --check scripts/build-extension.mjs
git diff --check
npm run build:extension
unzip -t dist/OpenGZH-extension-v0.1.0.zip
```

Expected: 全量测试零失败，语法/差异检查通过，构建成功，ZIP 无损坏条目。

- [ ] **Step 3: 核对 ZIP 内 Manifest 文案**

Run:

```bash
unzip -p dist/OpenGZH-extension-v0.1.0.zip manifest.json
```

Expected: `name`、`short_name`、`description`、`action.default_title` 与 Task 1 完全一致。

- [ ] **Step 4: 提交验收文档**

```bash
git add extension/REAL-BROWSER-ACCEPTANCE.md
git commit -m "docs: refresh extension identity acceptance"
```
