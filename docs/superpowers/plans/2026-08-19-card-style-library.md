# Card Style Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在左侧 Markdown 编辑器中提供 10 张固定内置卡片，支持选中完整文本块后套用、光标处直接插入、换卡和无损移除，并让预览及微信公众号复制结果跟随当前文章主题色。

**Architecture:** Markdown 是唯一数据源，卡片以白名单 `:::ogzh-card <styleId>` 块指令持久化。一个注册表统一提供样式元数据、源码编辑、主题语义色和内联展示；markdown-it 只负责把合法指令转成安全 DOM 标记，现有渲染管线在主题样式完成后追加卡片内联样式。编辑器继续复用已有选区缓存，不增加存储字段或运行时依赖。

**Tech Stack:** 原生 ES Modules、Vue 3 CDN、markdown-it 14 CDN、DOMParser、Vitest 3、静态 HTML/CSS

---

## 实施边界

设计依据：`docs/superpowers/specs/2026-08-19-card-style-library-design.md`。

当前主工作区包含尚未提交的全文样式覆盖、排版和 DepthCarousel 改动。本功能必须从已确认的干净基线 `e9f241c` 建立隔离 worktree；不得整文件回退主工作区，也不得把下列文件中与卡片无关的现有改动带入功能提交：

- `assets/scripts/core/style-override.js`
- `assets/scripts/core/__tests__/style-override.test.js`
- `assets/scripts/core/__tests__/typography-picker.test.js`
- `assets/scripts/components/`
- `assets/styles/depth-carousel.css`
- `depth-carousel-demo.html`

本计划不实现全文样式覆盖、自定义 CSS、搜索、收藏、分类、参数面板、右侧预览反选或持久化卡片偏好。

## 文件结构

| 文件 | 动作 | 单一职责 |
| --- | --- | --- |
| `assets/scripts/core/card-styles.js` | 新增 | 10 张卡片注册表、指令源码编辑、选区校验、主题 token、展示描述和 DOM 内联化 |
| `assets/scripts/core/__tests__/card-styles.test.js` | 新增 | 注册表、源码往返、选区边界、容错、主题和展示纯函数测试 |
| `assets/scripts/core/__tests__/card-picker.test.js` | 新增 | 工具栏、面板、解析器和渲染链路的静态契约测试 |
| `assets/scripts/core/markdown-engine.js` | 修改 | 注册轻量 `ogzh-card` markdown-it 块规则 |
| `assets/scripts/core/render-pipeline.js` | 修改 | 主题处理后调用卡片 DOM 内联化 |
| `assets/scripts/main.js` | 修改 | 卡片面板状态、选择分析、套用、插入、换卡、移除和焦点恢复 |
| `index.html` | 修改 | 工具栏入口、两列真实预览、非法原因和移除入口 |
| `assets/styles/editor.css` | 修改 | 仅卡片选择面板自身的响应式与可访问样式 |
| `assets/scripts/xhs/__tests__/semantic-parser.test.js` | 修改 | 卡片标记不泄漏到图片模式且正文不丢失的回归 |
| `README.md` | 修改 | 在功能清单中说明 10 张局部卡片及用法 |
| `docs/PRD.md` | 修改 | 将卡片样式库记录为已交付的窄范围能力，不宣称全文自由定制 |

明确不修改：`assets/scripts/storage/preferences.js`、`assets/scripts/export/clipboard-exporter.js`。卡片状态写入 Markdown，预览与复制继续共享 `renderedHTML`。

## Task 0: 创建隔离执行环境并锁定基线

**Files:**

- Verify: `docs/superpowers/specs/2026-08-19-card-style-library-design.md`
- Verify: `package.json`

- [ ] **Step 1: 从已确认基线创建独立 worktree**

先使用 `using-git-worktrees` skill 按其目录约定创建 worktree。若该 skill 未指定路径，则执行：

```bash
git worktree add ../OpenGZH-card-style-library -b codex/card-style-library e9f241c
cd ../OpenGZH-card-style-library
```

Expected: 当前分支为 `codex/card-style-library`，`git status --short` 无输出。

- [ ] **Step 2: 验证设计文档和依赖边界**

Run:

```bash
test -f docs/superpowers/specs/2026-08-19-card-style-library-design.md
npm ls markdown-it --depth=0
```

Expected: 设计文档存在；`markdown-it` 不在本地依赖树中。不要因此安装它，浏览器继续使用 CDN 版本。

- [ ] **Step 3: 跑基线测试**

Run:

```bash
npm test
```

Expected: 基线全量通过。如果失败，先记录为基线问题并停止实施，不在卡片提交中顺手修复。

## Task 1: 建立唯一卡片注册表和确定性片段生成器

**Files:**

- Create: `assets/scripts/core/card-styles.js`
- Create: `assets/scripts/core/__tests__/card-styles.test.js`

- [ ] **Step 1: 写注册表和片段契约的失败测试**

Create the first test block:

```js
import { describe, expect, it } from 'vitest';
import {
  CARD_STYLES,
  buildCardSnippet,
  getCardStyle
} from '../card-styles.js';

describe('card style registry', () => {
  it('contains exactly the approved 7 body and 3 title-body cards', () => {
    expect(CARD_STYLES.map(({ id, slots }) => ({ id, slots }))).toEqual([
      { id: 'accent-bar', slots: 'body' },
      { id: 'minimal-outline', slots: 'body' },
      { id: 'soft-fill', slots: 'body' },
      { id: 'quote-frame', slots: 'body' },
      { id: 'top-rule', slots: 'body' },
      { id: 'double-frame', slots: 'body' },
      { id: 'solid-contrast', slots: 'body' },
      { id: 'capsule-title', slots: 'title-body' },
      { id: 'label-title', slots: 'title-body' },
      { id: 'numbered-conclusion', slots: 'title-body' }
    ]);
    expect(new Set(CARD_STYLES.map((item) => item.id)).size).toBe(10);
    expect(CARD_STYLES.every((item) => item.name && item.preview)).toBe(true);
  });

  it('rejects unknown ids', () => {
    expect(getCardStyle('user-css')).toBeNull();
  });

  it('builds a body snippet and selects only its body placeholder', () => {
    const result = buildCardSnippet('accent-bar');
    expect(result.markdown).toBe(
      ':::ogzh-card accent-bar\n在这里输入卡片内容\n:::'
    );
    expect(result.markdown.slice(result.focusStart, result.focusEnd)).toBe(
      '在这里输入卡片内容'
    );
  });

  it('builds a title-body snippet and selects only its title placeholder', () => {
    const result = buildCardSnippet('numbered-conclusion');
    expect(result.markdown).toBe(
      ':::ogzh-card numbered-conclusion\n#### 01 阶段结论\n\n在这里输入卡片内容\n:::'
    );
    expect(result.markdown.slice(result.focusStart, result.focusEnd)).toBe(
      '01 阶段结论'
    );
  });

  it('preserves selected body bytes', () => {
    const selected = '第一段 **重点**。\n\n- A\n- B';
    const result = buildCardSnippet('capsule-title', selected);
    expect(result.markdown).toContain(selected);
    expect(result.markdown.slice(result.focusStart, result.focusEnd)).toBe('核心观点');
  });
});
```

- [ ] **Step 2: 确认测试因模块缺失而失败**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js
```

Expected: FAIL with module resolution error for `../card-styles.js`.

- [ ] **Step 3: 实现最小注册表和片段生成器**

Create these public contracts in `card-styles.js`:

```js
const BODY_PLACEHOLDER = '在这里输入卡片内容';

export const CARD_STYLES = Object.freeze([
  { id: 'accent-bar', name: '左线强调卡', slots: 'body', preview: '重点内容' },
  { id: 'minimal-outline', name: '极简框线卡', slots: 'body', preview: '清晰陈述' },
  { id: 'soft-fill', name: '柔和底色卡', slots: 'body', preview: '温和提示' },
  { id: 'quote-frame', name: '引号金句卡', slots: 'body', preview: '一句值得记住的话' },
  { id: 'top-rule', name: '顶线观点卡', slots: 'body', preview: '核心观点' },
  { id: 'double-frame', name: '双层框线卡', slots: 'body', preview: '重点信息' },
  { id: 'solid-contrast', name: '实色反差卡', slots: 'body', preview: '强提醒' },
  { id: 'capsule-title', name: '胶囊标题卡', slots: 'title-body', defaultTitle: '核心观点', preview: '标题与正文' },
  { id: 'label-title', name: '标签标题卡', slots: 'title-body', defaultTitle: '核心观点', preview: '标签与正文' },
  { id: 'numbered-conclusion', name: '编号结论卡', slots: 'title-body', defaultTitle: '01 阶段结论', preview: '01 阶段结论' }
]);

const CARD_STYLE_BY_ID = new Map(CARD_STYLES.map((item) => [item.id, item]));

export function getCardStyle(styleId) {
  return CARD_STYLE_BY_ID.get(styleId) || null;
}

export function buildCardSnippet(styleId, selectedBody = '') {
  const card = getCardStyle(styleId);
  if (!card) throw new Error(`Unknown card style: ${styleId}`);

  const body = selectedBody || BODY_PLACEHOLDER;
  const titleLine = card.slots === 'title-body' ? `#### ${card.defaultTitle}\n\n` : '';
  const markdown = `:::ogzh-card ${card.id}\n${titleLine}${body}\n:::`;
  const focusedText = card.slots === 'title-body' ? card.defaultTitle : body;
  const focusStart = markdown.indexOf(focusedText);
  return { markdown, focusStart, focusEnd: focusStart + focusedText.length };
}
```

Do not add configurable fields, user CSS, categories or persistence.

- [ ] **Step 4: 跑目标测试并提交**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js
git diff --check
git add assets/scripts/core/card-styles.js assets/scripts/core/__tests__/card-styles.test.js
git commit -m "feat: define built-in card styles"
```

Expected: target test PASS; commit contains only the new registry and its tests.

## Task 2: 实现卡片源码识别、换卡和无损移除

**Files:**

- Modify: `assets/scripts/core/card-styles.js`
- Modify: `assets/scripts/core/__tests__/card-styles.test.js`

- [ ] **Step 1: 写源码范围和逐字符往返的失败测试**

Append:

```js
import {
  findCardAtSelection,
  removeCardEdit,
  replaceCardStyleEdit,
  scanCardRanges
} from '../card-styles.js';

describe('card source editing', () => {
  const source = [
    '前文',
    '',
    ':::ogzh-card accent-bar',
    '正文 **不改**',
    ':::',
    '',
    '后文'
  ].join('\n');

  it('finds a complete card from a cursor inside its body', () => {
    const cursor = source.indexOf('不改');
    const card = findCardAtSelection(source, cursor, cursor);
    expect(card).toMatchObject({ styleId: 'accent-bar' });
    expect(source.slice(card.contentStart, card.contentEnd)).toBe('正文 **不改**');
  });

  it('replaces the outer id without nesting or changing content', () => {
    const cursor = source.indexOf('不改');
    const result = replaceCardStyleEdit(source, cursor, cursor, 'soft-fill');
    expect(result.ok).toBe(true);
    expect(result.markdown).toBe(source.replace('accent-bar', 'soft-fill'));
    expect(result.markdown.match(/:::ogzh-card/g)).toHaveLength(1);
  });

  it('adds a default title when moving from body-only to title-body', () => {
    const cursor = source.indexOf('不改');
    const result = replaceCardStyleEdit(source, cursor, cursor, 'capsule-title');
    expect(result.markdown).toContain(
      ':::ogzh-card capsule-title\n#### 核心观点\n\n正文 **不改**\n:::'
    );
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe('核心观点');
  });

  it('keeps an existing heading when moving from title-body to body-only', () => {
    const titled = source
      .replace('accent-bar', 'label-title')
      .replace('正文 **不改**', '#### 原标题\n\n正文 **不改**');
    const cursor = titled.indexOf('不改');
    const result = replaceCardStyleEdit(titled, cursor, cursor, 'top-rule');
    expect(result.markdown).toContain('#### 原标题\n\n正文 **不改**');
  });

  it('removes only directive lines and preserves inner bytes', () => {
    const cursor = source.indexOf('不改');
    const result = removeCardEdit(source, cursor, cursor);
    expect(result.ok).toBe(true);
    expect(result.markdown).toBe('前文\n\n正文 **不改**\n\n后文');
  });

  it('does not accept a selection crossing a card boundary', () => {
    const ranges = scanCardRanges(source);
    const result = findCardAtSelection(source, source.indexOf('前文'), source.indexOf('后文'));
    expect(ranges).toHaveLength(1);
    expect(result).toBeNull();
  });

  it('does not treat an unclosed directive as a card', () => {
    expect(scanCardRanges(':::ogzh-card accent-bar\n正文')).toEqual([]);
  });
});
```

- [ ] **Step 2: 确认新增导出缺失**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js
```

Expected: FAIL because the source-edit helpers are not exported.

- [ ] **Step 3: 实现行级扫描和最小文本编辑**

Use these public shapes:

```js
// Half-open offsets: start <= offset < end.
export function scanCardRanges(source) {}
export function findCardAtSelection(source, selectionStart, selectionEnd) {}
export function replaceCardStyleEdit(source, selectionStart, selectionEnd, nextStyleId) {}
export function removeCardEdit(source, selectionStart, selectionEnd) {}
```

Each scanned range must contain:

```js
{
  styleId,
  start,
  end,
  openerStart,
  openerEnd,
  contentStart,
  contentEnd,
  closerStart,
  closerEnd
}
```

Implementation rules:

1. Opening line must match `^:::ogzh-card\s+([a-z0-9-]+)\s*$` and closing line `^:::\s*$`.
2. A nested opening line invalidates that outer range; never guess which closer belongs to it.
3. `findCardAtSelection` returns a card only when both selection endpoints are inside the same range.
4. Replacing within an existing card never validates its inner heading as a new illegal selection.
5. Body-only to title-body inserts `#### <defaultTitle>` without deleting content; title-body to body-only retains the heading.
6. Removal deletes only opener, closer and their structural newlines. It preserves the inner substring byte-for-byte and returns a selection over the unwrapped content.
7. Every edit returns `{ ok, markdown, selectionStart, selectionEnd, kind, reason? }`; failure returns the original `markdown` and original selection.

- [ ] **Step 4: 跑目标测试并提交**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js
git diff --check
git add assets/scripts/core/card-styles.js assets/scripts/core/__tests__/card-styles.test.js
git commit -m "feat: edit card directives without data loss"
```

## Task 3: 用 markdown-it token 映射约束新选区

**Files:**

- Modify: `assets/scripts/core/card-styles.js`
- Modify: `assets/scripts/core/__tests__/card-styles.test.js`

- [ ] **Step 1: 写合法块扩展和拒绝边界测试**

Append tests around one exported action:

```js
import { applyCardEdit, inspectCardTarget } from '../card-styles.js';

describe('new card target validation', () => {
  const source = '前文\n\n第一段 **重点**。\n\n- A\n- B\n\n后文';
  const tokens = [
    { type: 'paragraph_open', level: 0, map: [0, 1] },
    { type: 'inline', level: 1, map: [0, 1], children: [] },
    { type: 'paragraph_close', level: 0 },
    { type: 'paragraph_open', level: 0, map: [2, 3] },
    { type: 'inline', level: 1, map: [2, 3], children: [{ type: 'strong_open' }, { type: 'text' }] },
    { type: 'paragraph_close', level: 0 },
    { type: 'bullet_list_open', level: 0, map: [4, 6] },
    { type: 'list_item_open', level: 1, map: [4, 5] },
    { type: 'list_item_close', level: 1 },
    { type: 'list_item_open', level: 1, map: [5, 6] },
    { type: 'list_item_close', level: 1 },
    { type: 'bullet_list_close', level: 0 },
    { type: 'paragraph_open', level: 0, map: [7, 8] },
    { type: 'inline', level: 1, map: [7, 8], children: [] },
    { type: 'paragraph_close', level: 0 }
  ];

  it('expands a partial selection to its complete paragraph', () => {
    const start = source.indexOf('重点');
    const target = inspectCardTarget(source, start, start + 2, tokens);
    expect(source.slice(target.start, target.end)).toBe('第一段 **重点**。');
  });

  it('expands a selection touching two items to the complete list items', () => {
    const start = source.indexOf('A');
    const end = source.indexOf('B') + 1;
    const target = inspectCardTarget(source, start, end, tokens);
    expect(source.slice(target.start, target.end)).toBe('- A\n- B');
  });

  it.each([
    ['heading_open', '标题'],
    ['image', '图片'],
    ['table_open', '表格'],
    ['fence', '代码块'],
    ['html_block', '原始 HTML'],
    ['blockquote_open', '引用块'],
    ['math_block', '公式块'],
    ['hr', '分割线']
  ])('rejects %s with a specific reason', (type, label) => {
    const invalidTokens = [{ type, level: 0, map: [0, 1], children: type === 'image' ? [{ type: 'image' }] : undefined }];
    const target = inspectCardTarget('内容', 0, 2, invalidTokens);
    expect(target).toMatchObject({ ok: false });
    expect(target.reason).toContain(label);
  });

  it('leaves markdown unchanged when action validation fails', () => {
    const invalidTokens = [{ type: 'heading_open', level: 0, map: [0, 1] }];
    const result = applyCardEdit('## 标题', 0, 5, 'accent-bar', invalidTokens);
    expect(result).toMatchObject({ ok: false, markdown: '## 标题' });
  });
});
```

Add separate cases for a selection crossing a complete card range and for inline children containing `image` or `html_inline`.

- [ ] **Step 2: 确认测试失败**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js
```

Expected: FAIL because `inspectCardTarget` and `applyCardEdit` do not exist.

- [ ] **Step 3: 实现以 token `.map` 为准的选区计划器**

Implement these rules without writing a second Markdown parser:

```js
export function inspectCardTarget(source, selectionStart, selectionEnd, tokens) {}

export function applyCardEdit(source, selectionStart, selectionEnd, styleId, tokens) {
  const existing = findCardAtSelection(source, selectionStart, selectionEnd);
  if (existing) return replaceCardStyleEdit(source, selectionStart, selectionEnd, styleId);
  if (selectionStart === selectionEnd) return insertCardEdit(source, selectionStart, styleId);

  const target = inspectCardTarget(source, selectionStart, selectionEnd, tokens);
  if (!target.ok) return unchangedEdit(source, selectionStart, selectionEnd, target.reason);
  return wrapCardEdit(source, target.start, target.end, styleId);
}
```

The helper that converts token line maps to offsets must preserve original CRLF/LF bytes and exclude blank separator lines outside the selected blocks. Eligible roots are top-level paragraphs and complete `list_item_open` ranges. Reject when any covered token or inline child is heading, image, table, fence/code block, blockquote, raw HTML, math block, horizontal rule, or another card boundary.

`insertCardEdit` must add at most the newlines required to keep the directive block valid; it must not trim adjacent user content. It returns focus offsets translated from `buildCardSnippet`.

- [ ] **Step 4: 跑目标测试并提交**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js
git diff --check
git add assets/scripts/core/card-styles.js assets/scripts/core/__tests__/card-styles.test.js
git commit -m "feat: validate card selections by markdown blocks"
```

## Task 4: 注册安全的 markdown-it 卡片块指令

**Files:**

- Modify: `assets/scripts/core/card-styles.js`
- Modify: `assets/scripts/core/markdown-engine.js`
- Modify: `assets/scripts/core/__tests__/card-styles.test.js`
- Create: `assets/scripts/core/__tests__/card-picker.test.js`

- [ ] **Step 1: 写指令扫描与注册链路的失败测试**

Add pure parser tests:

```js
import { parseCardFence } from '../card-styles.js';

describe('card directive parsing', () => {
  it('parses a known directive and preserves inner markdown', () => {
    expect(parseCardFence(':::ogzh-card accent-bar\n正文 **重点**\n:::', 0)).toMatchObject({
      styleId: 'accent-bar',
      known: true,
      content: '正文 **重点**'
    });
  });

  it('parses an unknown id only as an unstyled content container', () => {
    expect(parseCardFence(':::ogzh-card future-card\n正文\n:::', 0)).toMatchObject({
      styleId: 'future-card',
      known: false,
      content: '正文'
    });
  });

  it('refuses malformed and nested directives', () => {
    expect(parseCardFence(':::ogzh-card accent-bar\n正文', 0)).toBeNull();
    expect(parseCardFence(':::ogzh-card accent-bar\n:::ogzh-card soft-fill\n正文\n:::\n:::', 0)).toBeNull();
  });
});
```

Create a source-contract test in `card-picker.test.js`:

```js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../..', import.meta.url));
const read = (path) => readFileSync(`${root}/${path}`, 'utf8');

describe('card parser integration', () => {
  it('registers the directive on the browser markdown engine', () => {
    const source = read('assets/scripts/core/markdown-engine.js');
    expect(source).toContain("import { registerCardDirective } from './card-styles.js'");
    expect(source).toContain('registerCardDirective(md)');
  });
});
```

- [ ] **Step 2: 确认测试失败**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js assets/scripts/core/__tests__/card-picker.test.js
```

Expected: FAIL for the missing parser and registration.

- [ ] **Step 3: 实现纯 fence 识别和 markdown-it block rule**

Export:

```js
export function parseCardFence(source, startLine) {}
export function registerCardDirective(md) {}
```

The block rule must:

1. Register before `fence` with paragraph/list/blockquote alternate chains enabled.
2. Locate the exact closing `:::` line before mutating markdown-it state and put `[startLine, closingLine + 1]` in the opening token's `map`.
3. Return `false` for unclosed or nested directives so malformed source stays visible as ordinary text.
4. Push an opening `section` token, tokenize the inner lines with the existing block tokenizer, then push a closing token.
5. Set `data-ogzh-card="<whitelisted id>"` only when `getCardStyle(styleId)` succeeds. For unknown IDs, emit a plain `<section>` so markers disappear but inner content remains visible.
6. Restore `state.parentType` and `state.lineMax` after inner tokenization.
7. Never copy an unknown ID into `class`, `style`, or any other executable attribute.

Wire it in `markdown-engine.js`:

```js
import { registerCardDirective } from './card-styles.js';

// inside createMarkdownEngine, after registerMathPlugin(md)
registerCardDirective(md);
```

Do not install `markdown-it-container` or add `markdown-it` to `package.json`.

- [ ] **Step 4: 跑目标测试并提交**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js assets/scripts/core/__tests__/card-picker.test.js
git diff --check
git add assets/scripts/core/card-styles.js assets/scripts/core/markdown-engine.js assets/scripts/core/__tests__/card-styles.test.js assets/scripts/core/__tests__/card-picker.test.js
git commit -m "feat: parse card directives in markdown"
```

## Task 5: 解析主题语义色并生成 10 套可复制展示

**Files:**

- Modify: `assets/scripts/core/card-styles.js`
- Modify: `assets/scripts/core/__tests__/card-styles.test.js`

- [ ] **Step 1: 写主题 token、对比度和展示限制的失败测试**

Append:

```js
import {
  buildCardPresentation,
  contrastRatio,
  renderCardPreviewHtml,
  resolveCardTokens
} from '../card-styles.js';
import { STYLES } from '../../../styles/themes/index.js';

describe('card theme presentation', () => {
  const theme = {
    gzh: { accent: '#8b1e2d', body: '#24191b', muted: '#78666a', line: '#d8c4c8', soft: '#f9eef0', bg: '#ffffff' },
    styles: { p: 'color: #24191b;', blockquote: 'border-left-color: #8b1e2d;' }
  };

  it('prefers semantic gzh colors', () => {
    expect(resolveCardTokens(theme)).toEqual({
      accent: '#8b1e2d',
      body: '#24191b',
      muted: '#78666a',
      line: '#d8c4c8',
      soft: '#f9eef0',
      surface: '#ffffff'
    });
  });

  it('falls back to style declarations and then neutral defaults', () => {
    const tokens = resolveCardTokens({ styles: { p: 'color:#123456;', h2: 'color:#aa2244;' } });
    expect(tokens.body).toBe('#123456');
    expect(tokens.accent).toBe('#aa2244');
    expect(Object.values(tokens).every(Boolean)).toBe(true);
  });

  it('builds all ten distinct, inline-only presentations', () => {
    const tokens = resolveCardTokens(theme);
    const presentations = CARD_STYLES.map(({ id }) => buildCardPresentation(id, tokens));
    expect(presentations).toHaveLength(10);
    expect(new Set(presentations.map((item) => item.containerStyle)).size).toBe(10);
    const serialized = JSON.stringify(presentations);
    expect(serialized).not.toMatch(/display:\s*(flex|grid)|position:|::before|::after|<table/i);
  });

  it('renders a trusted thumbnail from the same presentation recipe', () => {
    const html = renderCardPreviewHtml('accent-bar', theme);
    expect(html).toContain('style=');
    expect(html).toContain('重点内容');
    expect(html).not.toContain(':::ogzh-card');
  });

  it('keeps solid backgrounds at a 4.5 contrast ratio', () => {
    const presentation = buildCardPresentation('solid-contrast', resolveCardTokens(theme));
    expect(contrastRatio(presentation.solidText, presentation.solidBackground)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps every card text surface readable across every current theme', () => {
    const failures = [];
    Object.entries(STYLES).forEach(([themeId, styleConfig]) => {
      const tokens = resolveCardTokens(styleConfig);
      CARD_STYLES.forEach(({ id }) => {
        buildCardPresentation(id, tokens).contrastPairs.forEach(({ foreground, background, minimum, role }) => {
          const ratio = contrastRatio(foreground, background);
          if (ratio < minimum) failures.push(`${themeId}/${id}/${role}=${ratio.toFixed(2)}`);
        });
      });
    });
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
```

- [ ] **Step 2: 确认测试失败**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js
```

Expected: FAIL for missing theme and presentation exports.

- [ ] **Step 3: 实现小型本地颜色工具和精确样式配方**

Keep the color helper in `card-styles.js`; do not import from `ui/code-themes.js` and do not refactor unrelated color code. Export `contrastRatio` only for deterministic tests.

`resolveCardTokens(styleConfig)` priority:

1. Map `styleConfig.gzh.accent/body/muted/line/soft/bg` when valid hex colors exist; `bg` supplies `surface`.
2. Extract the first hex color from `styles.h2`, `styles.p`, `styles.blockquote`, `styles.table`, and `styles.container` as appropriate.
3. Fall back to `{ accent:'#576b95', body:'#262626', muted:'#666666', line:'#d9d9d9', soft:'#f6f7f9', surface:'#ffffff' }`.

`buildCardPresentation(styleId, tokens)` returns only trusted strings and semantic flags:

```js
{
  containerStyle,
  titleStyle,
  bodyStyle,
  decoration: 'none' | 'quote' | 'number',
  solidBackground,
  solidText,
  contrastPairs: [{ role, foreground, background, minimum }]
}
```

`renderCardPreviewHtml(styleId, styleConfig)` resolves the same tokens and presentation, then renders only registry-owned preview text. It returns an empty string for an unknown ID and never accepts arbitrary HTML or CSS from the caller.

Implement all ten recipes with these exact structural differences:

| ID | Required container recipe |
| --- | --- |
| `accent-bar` | `border-left: 4px solid accent`, `background: soft`, `border-radius: 6px` |
| `minimal-outline` | `border: 1px solid line`, `background: transparent`, `border-radius: 6px` |
| `soft-fill` | no border, `background: soft`, `border-radius: 14px` |
| `quote-frame` | `border: 1px solid line`, quote decoration flag, `border-radius: 10px` |
| `top-rule` | `border-top: 4px solid accent`, `background: soft`, `border-radius: 0 0 8px 8px` |
| `double-frame` | `border: 3px double line`, `background: surface`, `border-radius: 8px` |
| `solid-contrast` | `background: accent`, readable black/white text, `border-radius: 10px` |
| `capsule-title` | outline body plus centered capsule `titleStyle` |
| `label-title` | soft body plus solid accent title strip |
| `numbered-conclusion` | outline body plus inline-block number badge; never an actual table |

Every recipe includes `margin: 20px 0`, `padding: 18px 20px`, `box-sizing: border-box`, `max-width: 100%`, `overflow-wrap: break-word`, and body color. For every body, solid fill, title strip and number badge, keep the semantic theme color when it already reaches 4.5:1; otherwise choose the higher-contrast black or white fallback and record the effective pair in `contrastPairs`. Use `!important` only on declarations that must win over theme selectors already carrying `!important`; do not blanket-copy arbitrary theme CSS.

- [ ] **Step 4: 跑主题测试并提交**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js
git diff --check
git add assets/scripts/core/card-styles.js assets/scripts/core/__tests__/card-styles.test.js
git commit -m "feat: derive theme-aware card presentations"
```

## Task 6: 在统一渲染链路中内联卡片结构和样式

**Files:**

- Modify: `assets/scripts/core/card-styles.js`
- Modify: `assets/scripts/core/render-pipeline.js`
- Modify: `assets/scripts/core/__tests__/card-picker.test.js`

- [ ] **Step 1: 写渲染接入和公众号安全结构的失败契约**

Append to `card-picker.test.js`:

```js
describe('card rendering integration', () => {
  it('applies cards after theme structure and before the end divider', () => {
    const source = read('assets/scripts/core/render-pipeline.js');
    const gzh = source.indexOf('applyGzhStructure(doc, styleConfig.gzh)');
    const cards = source.indexOf('applyCardStyles(doc, styleConfig)');
    const divider = source.indexOf('applyEndDivider(doc');
    expect(gzh).toBeGreaterThan(-1);
    expect(cards).toBeGreaterThan(gzh);
    expect(divider).toBeGreaterThan(cards);
  });

  it('does not add a clipboard-only card path', () => {
    const source = read('assets/scripts/export/clipboard-exporter.js');
    expect(source).not.toContain('data-ogzh-card');
  });

  it('does not render cards with table, flex, grid, pseudo elements, or external css', () => {
    const source = read('assets/scripts/core/card-styles.js');
    expect(source).not.toMatch(/createElement\(['\"]table['\"]\)/);
    expect(source).not.toMatch(/display\s*:\s*(flex|grid)/);
    expect(source).not.toMatch(/::before|::after/);
  });
});
```

- [ ] **Step 2: 确认链路测试失败**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-picker.test.js
```

Expected: FAIL because `applyCardStyles` is not imported or called.

- [ ] **Step 3: 实现 DOM 内联化**

Export and call:

```js
export function applyCardStyles(doc, styleConfig) {}
```

In `render-pipeline.js`:

```js
import { applyCardStyles } from './card-styles.js';

// after applyGzhStructure, before applyEndDivider
applyCardStyles(doc, styleConfig);
```

`applyCardStyles` behavior:

1. Query only `section[data-ogzh-card]` and revalidate every ID with `getCardStyle`.
2. Append `containerStyle`; then append controlled margin/color styles to immediate paragraphs, lists and list items so theme `!important` values cannot break the card.
3. For title-body cards, treat the first immediate `h4` as the editable title. If absent, leave the card body intact; do not fabricate a title at render time.
4. `quote-frame` inserts real `span` quote characters with `aria-hidden="true"` and inline styles. Mark inserted decoration with `data-ogzh-card-decoration` and make the operation idempotent.
5. `numbered-conclusion` extracts a leading one- or two-digit prefix from the first `h4` into an `aria-hidden` inline-block badge while retaining an accessible full title in `aria-label`. If no prefix exists, show the unchanged heading without a badge.
6. Use block/inline-block flow only. The existing clipboard exporter treats every actual `<table>` as a Markdown table and may rasterize it, so never emit `<table>` for layout.
7. Do not add handlers, external classes required for appearance, `position`, Flex, Grid or pseudo-elements.

- [ ] **Step 4: 跑核心测试并提交**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js assets/scripts/core/__tests__/card-picker.test.js
git diff --check
git add assets/scripts/core/card-styles.js assets/scripts/core/render-pipeline.js assets/scripts/core/__tests__/card-picker.test.js
git commit -m "feat: inline card styles in render pipeline"
```

## Task 7: 接入编辑器选区、套用、插入、换卡和移除

**Files:**

- Modify: `assets/scripts/main.js`
- Modify: `assets/scripts/core/__tests__/card-picker.test.js`

- [ ] **Step 1: 写编辑器动作的静态契约测试**

Append:

```js
describe('card editor actions', () => {
  it('reuses the cached textarea selection and parses only on demand', () => {
    const source = read('assets/scripts/main.js');
    expect(source).toContain('showCardPicker');
    expect(source).toContain('cardTargetState');
    expect(source).toContain('getEditorSelection()');
    expect(source).toContain('md.parse(markdownInput.value, {})');
    expect(source).toContain('applyCardEdit(');
    expect(source).toContain('removeCardEdit(');
    expect(source).not.toMatch(/watch\([^)]*markdownInput[^)]*md\.parse/s);
  });

  it('restores selection after Vue updates the textarea', () => {
    const source = read('assets/scripts/main.js');
    expect(source).toContain('await nextTick()');
    expect(source).toContain('textarea.setSelectionRange(');
    expect(source).toContain('textarea.focus()');
  });
});
```

- [ ] **Step 2: 确认动作测试失败**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-picker.test.js
```

Expected: FAIL for missing card state and actions.

- [ ] **Step 3: 增加最小 Vue 状态和动作**

Import only the required core functions:

```js
import {
  CARD_STYLES,
  applyCardEdit,
  findCardAtSelection,
  inspectCardTarget,
  removeCardEdit,
  renderCardPreviewHtml
} from './core/card-styles.js';
```

Add setup state:

```js
const showCardPicker = ref(false);
const cardTargetState = ref({ ok: true, existing: false, reason: '' });
```

Implement and return these functions from `setup()`:

```js
function analyzeCardTarget() {}
function openCardPicker() {}
function closeCardPicker() {}
async function applySelectedCard(styleId) {}
async function removeSelectedCard() {}
async function restoreEditorSelection(start, end) {}
function getCardPreviewHtml(styleId) {}
```

Action contract:

1. `openCardPicker()` calls existing `getEditorSelection()`, then `findCardAtSelection`. Only for a new non-empty selection does it call `md.parse(markdownInput.value, {})` and `inspectCardTarget`.
2. Empty selection is always eligible for direct insertion. Cursor inside a card is eligible for replace/remove.
3. `applySelectedCard()` re-reads the cached selection, reparses and revalidates at the action boundary, then assigns `markdownInput.value` only when `result.ok` is true.
4. Failure keeps Markdown and selection unchanged and uses the existing notification mechanism with `result.reason`.
5. Success closes the panel, awaits `nextTick`, focuses the actual textarea, restores `result.selectionStart/result.selectionEnd`, syncs `editorSelection`, and triggers the existing preview update path.
6. `removeSelectedCard()` is enabled only when the current selection is in one complete card and follows the same revalidation/focus sequence.
7. The existing document `editorSelection`, `getEditorSelection`, `syncEditorSelection` and textarea lookup remain the source of cursor truth; do not create a second global selection store.
8. Add `showCardPicker = false` to the existing outside-click and Escape close logic without changing other pickers.

`getCardPreviewHtml(styleId)` must call the trusted registry/presentation helper; it may return built-in `v-html` because neither IDs nor strings are user-controlled. It must not reimplement the ten styles in `main.js`.

- [ ] **Step 4: 跑动作测试并提交**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-picker.test.js
git diff --check
git add assets/scripts/main.js assets/scripts/core/__tests__/card-picker.test.js
git commit -m "feat: add card editor actions"
```

## Task 8: 增加两列卡片面板和可访问交互

**Files:**

- Modify: `index.html`
- Modify: `assets/styles/editor.css`
- Modify: `assets/scripts/core/__tests__/card-picker.test.js`

- [ ] **Step 1: 写 UI 数量、选区保护和响应式契约测试**

Append:

```js
describe('card picker UI', () => {
  it('renders one toolbar trigger and the registry-driven card list', () => {
    const html = read('index.html');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain(':aria-expanded="showCardPicker"');
    expect(html).toContain('v-for="card in cardStyles"');
    expect(html).toContain('@mousedown.prevent');
    expect(html).toContain('@click="applySelectedCard(card.id)"');
    expect(html).toContain('@click="removeSelectedCard"');
  });

  it('has two desktop columns, one mobile column, and visible focus', () => {
    const css = read('assets/styles/editor.css');
    expect(css).toMatch(/\.card-picker-grid[^{]*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
    expect(css).toMatch(/@media[^{}]*max-width:\s*640px[\s\S]*\.card-picker-grid[^{]*\{[^}]*grid-template-columns:\s*1fr/s);
    expect(css).toMatch(/\.card-picker-item:focus-visible/);
  });
});
```

The test deliberately allows CSS Grid in the editor-only picker. The “no Grid” restriction applies to exported article card DOM, not application chrome.

- [ ] **Step 2: 确认 UI 测试失败**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-picker.test.js
```

Expected: FAIL for missing trigger, list and styles.

- [ ] **Step 3: 添加工具栏入口和面板**

Insert the trigger beside the existing Markdown formatting controls and retain their selection-safe mouse behavior:

```html
<button
  type="button"
  class="editor-toolbar-button"
  aria-haspopup="dialog"
  :aria-expanded="showCardPicker"
  @mousedown.prevent
  @click="openCardPicker"
>卡片</button>
```

Panel requirements:

```html
<div v-if="showCardPicker" class="card-picker" role="dialog" aria-label="卡片样式">
  <p v-if="!cardTargetState.ok" class="card-picker-reason" role="status">
    {{ cardTargetState.reason }}
  </p>
  <div class="card-picker-grid">
    <button
      v-for="card in cardStyles"
      :key="card.id"
      type="button"
      class="card-picker-item"
      :disabled="!cardTargetState.ok"
      @mousedown.prevent
      @click="applySelectedCard(card.id)"
    >
      <span class="card-picker-preview" v-html="getCardPreviewHtml(card.id)"></span>
      <span class="card-picker-name">{{ card.name }}</span>
    </button>
  </div>
  <button
    type="button"
    class="card-picker-remove"
    :disabled="!cardTargetState.existing"
    @mousedown.prevent
    @click="removeSelectedCard"
  >移除卡片</button>
</div>
```

Expose `cardStyles: CARD_STYLES` from `setup()`. Ensure the actual template nesting follows the existing toolbar wrapper; do not introduce a new full-screen panel component.

- [ ] **Step 4: 添加最小编辑器面板 CSS**

Add only application-chrome styles under `.card-picker*`:

- `position: absolute` anchored to the toolbar, constrained by `max-width` and viewport width.
- `.card-picker-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); }`.
- Each preview has a stable minimum height and `overflow:hidden`; its article styles remain inline.
- Disabled, hover and `:focus-visible` states are distinguishable without color alone.
- At `max-width: 640px`, use one column and avoid horizontal overflow.
- Keep exported card styles out of `editor.css`.

- [ ] **Step 5: 跑 UI 测试并提交**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-picker.test.js
git diff --check
git add index.html assets/styles/editor.css assets/scripts/core/__tests__/card-picker.test.js
git commit -m "feat: add accessible card picker"
```

## Task 9: 完成模式回归、浏览器验收和窄范围文档

**Files:**

- Modify: `assets/scripts/xhs/__tests__/semantic-parser.test.js`
- Modify: `README.md`
- Modify: `docs/PRD.md`
- Verify: all files changed by Tasks 1-8

- [ ] **Step 1: 锁定图片模式的卡片降级回归**

Append inside the existing `describe('xhs semantic parser', ...)` block. Reuse its `token()` helper:

```js
it('keeps card contents but never exposes directive markers in xhs pages', () => {
  const markdown = [
    ':::ogzh-card accent-bar',
    '卡片正文 **重点**',
    ':::'
  ].join('\n');
  const fakeMd = {
    parse: () => [
      token('ogzh_card_open', [0, 3], {
        tag: 'section',
        nesting: 1,
        attrs: [['data-ogzh-card', 'accent-bar']]
      }),
      token('paragraph_open', [1, 2], { level: 1, tag: 'p', nesting: 1 }),
      token('inline', [1, 2], {
        level: 2,
        content: '卡片正文 重点',
        children: [token('text', null, { content: '卡片正文 重点' })]
      }),
      token('paragraph_close', null, { level: 1, tag: 'p', nesting: -1 }),
      token('ogzh_card_close', null, { tag: 'section', nesting: -1 })
    ],
    renderer: {
      render: () => '<section data-ogzh-card="accent-bar"><p>卡片正文 <strong>重点</strong></p></section>'
    }
  };

  const result = parseXhsDocument(markdown, fakeMd);
  expect(result.blocks).toHaveLength(1);
  expect(result.blocks[0]).toMatchObject({ type: 'html', sourceStart: 0 });
  expect(result.blocks[0].html).toContain('卡片正文');
  expect(JSON.stringify(result)).not.toContain(':::ogzh-card');
});
```

The acceptance rule is fixed: text-mode card appearance is not required in XHS image mode, but content must survive and directive markers must not leak.

- [ ] **Step 2: 运行 XHS 语义回归**

Run:

```bash
npx vitest run assets/scripts/xhs/__tests__/semantic-parser.test.js
```

Expected: PASS. The card block is deliberately classified by the existing fallback as one `html` semantic block; no XHS runtime edit is required.

- [ ] **Step 3: 验证真实 markdown-it 输出与回归 fixture 一致**

During the browser check in Step 5, switch once to XHS image mode with the same fixture. Confirm the body remains and neither opener nor closer is visible. If the real token stream differs from the fixture, stop, capture the actual token array in a new failing test, and make the smallest correction in `xhs/semantic-parser.js`; do not reproduce the ten card designs or change pagination semantics.

- [ ] **Step 4: 跑全量自动检查**

Run:

```bash
npm test
git diff --check
git status --short
```

Expected: all tests PASS; no whitespace errors; only planned feature files are modified.

- [ ] **Step 5: 在本地浏览器完成行为验收**

Serve the static app with a fixed command:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/` and verify:

1. Partial text selection expands to the complete paragraph; a selection spanning list items wraps complete items.
2. Empty selection inserts at the cached cursor, not document end; body card selects body placeholder, title card selects title placeholder.
3. Heading/image/table/fenced-code/raw-HTML selections disable all ten cards and show a specific reason; Markdown is unchanged.
4. Reapplying a style replaces one outer ID; body-to-title adds one default heading; title-to-body retains the heading; remove strips only fences.
5. Ten thumbnails use current theme colors and match actual cards.
6. Escape and outside click close the panel; keyboard focus is visible; toolbar clicks do not destroy selection.
7. At viewport widths 390px and 360px, the picker is single-column and neither picker nor rendered cards overflow horizontally.
8. Switch among a light theme, a colorful theme and a native dark theme; text stays readable and dark theme is not double-inverted.

Record the tested theme names and viewport widths in the implementation handoff. A local visual pass does not substitute for the next WeChat checkpoint.

- [ ] **Step 6: 完成微信公众号粘贴 checkpoint**

Create one article containing all ten cards, copy through the existing copy action, and paste into the WeChat Official Account editor. Verify borders, fills, radii, headings, quote marks, number badge, desktop preview and phone preview. Confirm no card becomes an image merely because of its layout.

If access to the WeChat editor is unavailable, stop and report this exact checkpoint as unverified; do not declare the feature fully complete.

- [ ] **Step 7: 更新窄范围文档**

Update `README.md` with one feature row/paragraph: “编辑器内置 10 张主题联动卡片，可选区套用、直接插入、换卡和无损移除”。

Update `docs/PRD.md` so the delivered capability is “局部卡片样式库”。Do not mark “全文颜色/字号/间距自由覆盖” or custom CSS as delivered.

- [ ] **Step 8: 自审规格覆盖和占位文本**

Run:

```bash
rg -n "TBD|FIXME|implement later|similar to|appropriate error handling|add validation|write tests for" assets README.md docs/PRD.md
git diff --stat e9f241c
git diff --name-only e9f241c
```

Expected: no implementation placeholders; changed paths match this plan; no storage, style-override, DepthCarousel or clipboard-exporter changes.

- [ ] **Step 9: 提交回归和文档**

Run:

```bash
git add assets/scripts/xhs/__tests__/semantic-parser.test.js README.md docs/PRD.md
git commit -m "test: verify card style workflow"
```

## 最终验收与发布判定

- [ ] `CARD_STYLES` 恰好 10 项、ID 唯一，7 张正文卡、3 张标题正文卡。
- [ ] 选区套用、光标插入、换卡、移除均有自动测试，失败操作逐字符保持原文。
- [ ] 未知 ID 显示内部内容，未闭合/嵌套指令不吞内容。
- [ ] 10 张卡的文章内容样式全部内联，不依赖 `editor.css`，不用实际 `<table>`、Flex、Grid、伪元素或外部 CSS。
- [ ] 所有当前主题的实色文字区域达到 4.5:1 对比度目标。
- [ ] 预览与复制继续消费同一 `renderedHTML`，没有 clipboard-only 分支。
- [ ] 图片模式不泄漏指令标记且不丢正文。
- [ ] 桌面两列、移动端单列，鼠标和键盘操作均通过。
- [ ] `npm test`、`git diff --check` 和 360/390px 浏览器验收通过。
- [ ] 微信公众号后台粘贴验收通过，或明确列为尚未验证的发布阻塞项。
- [ ] 主工作区原有未提交改动未被修改、清理或带入本功能分支。

## 回滚策略

发布前发现问题时，按功能分支的原子提交逆序 `git revert`，不操作主工作区未提交文件。若已有文章保存了卡片指令，只隐藏工具栏并停止新建；保留 markdown-it 指令解析和“未知/停用样式仍显示内部内容”的降级路径，避免历史文档暴露标记或丢正文。
