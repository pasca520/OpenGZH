# Card Library and Selection Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver 18 selectable theme-aware cards, five copyable GIF decorations, a single-line historical-document card, and a selection-anchored card popover that replaces the toolbar entry.

**Architecture:** Keep `card-styles.js` as the card registry and Markdown/rendering source of truth, while retaining three removed IDs in a separate legacy-only registry. Add a focused GIF renderer beside the existing end-divider renderer and a focused textarea-position helper beside the UI code; `main.js` only orchestrates Vue state and lifecycle. Preview CSS animations are converted to small transparent GIF images late in the existing clipboard pipeline.

**Tech Stack:** Vue 3 CDN, native ES modules, markdown-it, DOM inline styles, existing GIF encoder, Vitest, CSS.

---

## File map

- Modify `assets/scripts/core/card-styles.js`: public/legacy registries, 11 new cards, decorations, history rows, compact previews.
- Modify `assets/scripts/core/__tests__/card-styles.test.js`: registry, snippets, rendering, history row, theme, legacy tests.
- Create `assets/scripts/export/card-decoration-gif.js`: pure layouts plus browser GIF encoding for five decorations.
- Create `assets/scripts/export/__tests__/card-decoration-gif.test.js`: layout and encoded GIF tests.
- Modify `assets/scripts/export/clipboard-exporter.js`: late replacement of card decorations by GIF images.
- Modify `assets/scripts/export/__tests__/clipboard-exporter.test.js`: replacement and fallback tests.
- Create `assets/scripts/ui/selection-popover-position.js`: textarea mirror measurement and viewport clamping.
- Create `assets/scripts/ui/__tests__/selection-popover-position.test.js`: pure clamping/fallback tests.
- Modify `assets/scripts/main.js`: selection direction, auto-open, filters, positioning and lifecycle.
- Modify `index.html`: remove toolbar card entry and render the fixed popover.
- Modify `assets/styles/editor.css`: popover, filters, animations, reduced motion and mobile sheet.
- Modify `assets/scripts/core/__tests__/card-picker.test.js`: DOM/source contracts and regression expectations.

### Task 1: Public and legacy card registries

**Files:**
- Modify: `assets/scripts/core/card-styles.js:17-55`
- Test: `assets/scripts/core/__tests__/card-styles.test.js`

- [ ] **Step 1: Write the failing registry tests**

Add assertions that distinguish the public catalog from render-only legacy definitions:

```js
it('publishes 18 cards while retaining three removed ids for old documents', () => {
  expect(CARD_STYLES).toHaveLength(18);
  expect(new Set(CARD_STYLES.map(({ id }) => id)).size).toBe(18);
  expect(CARD_STYLES.filter(({ animated }) => animated)).toHaveLength(5);
  expect(CARD_STYLES.filter(({ animated }) => !animated)).toHaveLength(13);

  for (const legacyId of ['accent-bar', 'double-frame', 'label-title']) {
    expect(CARD_STYLES.some(({ id }) => id === legacyId)).toBe(false);
    expect(getCardStyle(legacyId)).toMatchObject({ id: legacyId, legacy: true });
  }
});

it('contains the confirmed eleven new ids and Chinese names', () => {
  expect(CARD_STYLES.map(({ id, name }) => [id, name])).toEqual(expect.arrayContaining([
    ['soft-halo', '柔光晕染卡'],
    ['paper-grid', '细格纸纹卡'],
    ['diagonal-note', '斜纹注释卡'],
    ['folded-note', '折角便签卡'],
    ['bracket-focus', '括号观点卡'],
    ['split-index', '双色索引卡'],
    ['highlight-sweep', '高光摘录卡'],
    ['step-relay', '步骤接力卡'],
    ['relationship-weave', '关系编织卡'],
    ['bookmark-reminder', '书签提醒卡'],
    ['history-document', '历史文档卡']
  ]));
});
```

- [ ] **Step 2: Run the targeted test and confirm failure**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js
```

Expected: FAIL because the public catalog still has 10 entries and the new IDs do not exist.

- [ ] **Step 3: Split active and legacy definitions with no migration**

Replace the current list/map setup with the confirmed catalog and a combined lookup:

```js
const defineCard = (item) => Object.freeze({ animated: false, ...item });

export const CARD_STYLES = Object.freeze([
  { id: 'minimal-outline', name: '极简框线卡', slots: 'body', preview: '清晰陈述' },
  { id: 'soft-fill', name: '柔和底色卡', slots: 'body', preview: '温和提示' },
  { id: 'quote-frame', name: '引号金句卡', slots: 'body', preview: '一句值得记住的话' },
  { id: 'top-rule', name: '顶线观点卡', slots: 'body', preview: '核心观点' },
  { id: 'solid-contrast', name: '实色反差卡', slots: 'body', preview: '强提醒' },
  { id: 'capsule-title', name: '胶囊标题卡', slots: 'title-body', defaultTitle: '核心观点', preview: '标题与正文' },
  { id: 'numbered-conclusion', name: '编号结论卡', slots: 'title-body', defaultTitle: '01 阶段结论', preview: '01 阶段结论' },
  { id: 'soft-halo', name: '柔光晕染卡', slots: 'body', preview: '让结论先被看见' },
  { id: 'paper-grid', name: '细格纸纹卡', slots: 'body', preview: '拆成可以验证的步骤' },
  { id: 'diagonal-note', name: '斜纹注释卡', slots: 'body', preview: '这里有一个重要边界' },
  { id: 'folded-note', name: '折角便签卡', slots: 'body', preview: '记住这一件事' },
  { id: 'bracket-focus', name: '括号观点卡', slots: 'body', preview: '产品不是功能的集合' },
  { id: 'split-index', name: '双色索引卡', slots: 'title-body', defaultTitle: '01 阶段复盘', preview: '阶段摘要' },
  { id: 'highlight-sweep', name: '高光摘录卡', slots: 'title-body', defaultTitle: '关键结论', preview: '先定义问题，再讨论答案', animated: true },
  { id: 'step-relay', name: '步骤接力卡', slots: 'title-body', defaultTitle: '三步完成', preview: '从洞察走到验证', animated: true },
  { id: 'relationship-weave', name: '关系编织卡', slots: 'title-body', defaultTitle: '系统关系', preview: '真正的价值来自系统协同', animated: true },
  { id: 'bookmark-reminder', name: '书签提醒卡', slots: 'title-body', defaultTitle: '请注意', preview: '请先确认这个前置条件', animated: true },
  { id: 'history-document', name: '历史文档卡', slots: 'title-list', defaultTitle: '历史文档', preview: '第一版方案 ｜ 2026.08.12', animated: true }
].map(defineCard));

const LEGACY_CARD_STYLES = Object.freeze([
  { id: 'accent-bar', name: '左线强调卡', slots: 'body', preview: '重点内容', legacy: true },
  { id: 'double-frame', name: '双层框线卡', slots: 'body', preview: '重点信息', legacy: true },
  { id: 'label-title', name: '标签标题卡', slots: 'title-body', defaultTitle: '核心观点', preview: '标签与正文', legacy: true }
].map(defineCard));

const CARD_STYLE_BY_ID = new Map(
  [...CARD_STYLES, ...LEGACY_CARD_STYLES].map((item) => [item.id, item])
);
```

- [ ] **Step 4: Run only the new registry assertions**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js -t "publishes 18 cards|contains the confirmed eleven"
```

Expected: the two focused assertions PASS. Do not commit yet: the full card suite remains red until Task 2 supplies presentations for every newly published ID.

### Task 2: Static card presentations and historical-document rows

**Files:**
- Modify: `assets/scripts/core/card-styles.js:312-730,906-929`
- Test: `assets/scripts/core/__tests__/card-styles.test.js`

- [ ] **Step 1: Add failing presentation and history tests**

```js
it.each(['soft-halo', 'paper-grid', 'diagonal-note', 'folded-note', 'bracket-focus', 'split-index'])(
  'builds a copy-safe presentation for %s',
  (styleId) => {
    const presentation = buildCardPresentation(styleId, resolveCardTokens(STYLES['latepost-depth']));
    expect(presentation.containerStyle).toContain('box-sizing: border-box');
    expect(JSON.stringify(presentation)).not.toMatch(/javascript:|expression\(|url\(https?:/i);
  }
);

it('builds the historical-document default snippet without English or note text', () => {
  expect(buildCardSnippet('history-document')).toContain([
    '#### 历史文档',
    '- 第一版方案 ｜ 2026.08.12',
    '- 第二版方案 ｜ 2026.08.18',
    '- 当前版本 ｜ 2026.08.22'
  ].join('\n'));
  expect(buildCardSnippet('history-document')).not.toMatch(/DOCUMENT|HISTORY|版本说明/i);
});

it.each([
  ['第一版方案 ｜ 2026.08.12', { name: '第一版方案', meta: '2026.08.12' }],
  ['设计规范 | 设计团队', { name: '设计规范', meta: '设计团队' }],
  ['没有元信息', { name: '没有元信息', meta: '' }],
  ['名称 | 中间 | 作者', { name: '名称 | 中间', meta: '作者' }]
])('splits one historical-document row: %s', (source, expected) => {
  expect(splitHistoryDocumentItem(source)).toEqual(expected);
});
```

- [ ] **Step 2: Run the targeted tests and confirm failure**

Run `npx vitest run assets/scripts/core/__tests__/card-styles.test.js`.

Expected: FAIL for missing presentations, missing history snippet and missing `splitHistoryDocumentItem` export.

- [ ] **Step 3: Implement the six static presentations and history contract**

Add presentation cases that use theme tokens and real decoration kinds:

```js
case 'soft-halo':
  return presentationResult({
    containerStyle: `${common} border: 1px solid ${tokens.line}; background-color: ${tokens.soft}; border-radius: 20px 6px 20px 6px; color: ${bodyOnSoft} !important;`,
    bodyStyle: bodyStyle(bodyOnSoft),
    decoration: 'soft-halo',
    contrastPairs: [bodyPair(bodyOnSoft, tokens.soft)]
  });
case 'paper-grid':
  return presentationResult({
    containerStyle: `${common} border: 1px solid ${tokens.line}; background-color: ${tokens.surface}; border-radius: 10px; color: ${bodyOnSurface} !important;`,
    bodyStyle: bodyStyle(bodyOnSurface),
    decoration: 'paper-grid',
    contrastPairs: [bodyPair(bodyOnSurface, tokens.surface)]
  });
case 'diagonal-note':
  return presentationResult({
    containerStyle: `${common} border-left: 7px solid ${tokens.accent}; border-top: 1px solid ${tokens.line}; border-right: 1px solid ${tokens.line}; border-bottom: 1px solid ${tokens.line}; background-color: ${tokens.soft}; border-radius: 3px 14px 14px 3px; color: ${bodyOnSoft} !important;`,
    bodyStyle: bodyStyle(bodyOnSoft),
    decoration: 'diagonal-note',
    contrastPairs: [bodyPair(bodyOnSoft, tokens.soft)]
  });
case 'folded-note':
  return presentationResult({
    containerStyle: `${common} border: 1px solid ${tokens.line}; background-color: ${tokens.soft}; border-radius: 6px; color: ${bodyOnSoft} !important; box-shadow: 4px 5px 0 ${tokens.line};`,
    bodyStyle: bodyStyle(bodyOnSoft),
    decoration: 'folded-note',
    contrastPairs: [bodyPair(bodyOnSoft, tokens.soft)]
  });
case 'bracket-focus':
  return presentationResult({
    containerStyle: `${common} padding-left: 30px; padding-right: 30px; border: none; background-color: ${tokens.surface}; color: ${bodyOnSurface} !important;`,
    bodyStyle: bodyStyle(bodyOnSurface),
    decoration: 'bracket-focus',
    contrastPairs: [bodyPair(bodyOnSurface, tokens.surface)]
  });
```

For `split-index`, use the existing numbered-title path with a new `split-index` decoration and a two-color title/body presentation. Add the history split helper and default body:

```js
export function splitHistoryDocumentItem(value) {
  const source = String(value || '').trim();
  const fullWidth = source.lastIndexOf('｜');
  const ascii = source.lastIndexOf('|');
  const separator = Math.max(fullWidth, ascii);
  if (separator < 0) return { name: source, meta: '' };
  return {
    name: source.slice(0, separator).trim(),
    meta: source.slice(separator + 1).trim()
  };
}

const HISTORY_DOCUMENT_BODY = [
  '- 第一版方案 ｜ 2026.08.12',
  '- 第二版方案 ｜ 2026.08.18',
  '- 当前版本 ｜ 2026.08.22'
].join('\n');
```

When applying `history-document`, call a focused DOM helper with this output contract:

```js
function applyHistoryDocumentRows(doc, section, bodyStyle) {
  const list = Array.from(section.children).find((child) => child.tagName === 'UL');
  if (!list) return;
  Array.from(list.children).forEach((item, itemIndex) => {
    const { meta } = splitHistoryDocumentItem(item.textContent || '');
    if (meta) {
      const tail = Array.from(item.childNodes).findLast((node) =>
        node.nodeType === 3 && /[｜|]/.test(node.nodeValue || '')
      );
      if (tail) tail.nodeValue = (tail.nodeValue || '').replace(/\s*[｜|][^｜|]*$/, '');
    }
    const index = doc.createElement('span');
    index.setAttribute('aria-hidden', 'true');
    index.setAttribute('data-ogzh-history-index', 'true');
    index.textContent = String(itemIndex + 1).padStart(2, '0');
    const metadata = doc.createElement('span');
    metadata.setAttribute('data-ogzh-history-meta', 'true');
    metadata.textContent = meta;
    item.insertBefore(index, item.firstChild);
    item.appendChild(metadata);
    applyTrustedStyle(item, `${bodyStyle} list-style: none; white-space: nowrap; overflow: hidden;`);
  });
}
```

- [ ] **Step 4: Run card tests and inspect generated previews**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js assets/scripts/core/__tests__/card-picker.test.js
```

Expected: PASS; generated HTML contains no remote pattern URL, no English history labels, and no lost link nodes.

- [ ] **Step 5: Commit static cards and history rows**

```bash
git add assets/scripts/core/card-styles.js assets/scripts/core/__tests__/card-styles.test.js
git commit -m "feat: add editorial and history cards"
```

### Task 3: Five semantic preview animations

**Files:**
- Modify: `assets/scripts/core/card-styles.js`
- Modify: `assets/styles/editor.css`
- Test: `assets/scripts/core/__tests__/card-styles.test.js`

- [ ] **Step 1: Add failing decoration tests**

```js
it.each([
  ['highlight-sweep', 'highlight'],
  ['step-relay', 'steps'],
  ['relationship-weave', 'relationship'],
  ['bookmark-reminder', 'bookmark'],
  ['history-document', 'documents']
])('renders an accessible animation hook for %s', (styleId, kind) => {
  const html = renderCardPreviewHtml(styleId, STYLES['latepost-depth']);
  expect(html).toContain(`data-ogzh-card-animation="${kind}"`);
  expect(html).toContain('aria-hidden="true"');
});
```

- [ ] **Step 2: Run the test and confirm failure**

Run `npx vitest run assets/scripts/core/__tests__/card-styles.test.js`.

Expected: FAIL because the five hooks are absent.

- [ ] **Step 3: Render real decoration elements and preview animations**

Add one real wrapper per animated style, for example:

```js
function createAnimationDecoration(doc, kind) {
  const decoration = doc.createElement('span');
  decoration.setAttribute('data-ogzh-card-decoration', kind);
  decoration.setAttribute('data-ogzh-card-animation', kind);
  decoration.setAttribute('aria-hidden', 'true');
  return decoration;
}
```

Populate the children through a fixed count map so preview and GIF kinds cannot drift:

```js
const ANIMATION_CHILDREN = Object.freeze({
  highlight: ['highlight'],
  steps: ['step-1', 'step-2', 'step-3'],
  relationship: ['node-1', 'node-2', 'node-3', 'line-1', 'line-2', 'line-3'],
  bookmark: ['bookmark'],
  documents: ['page-back', 'page-front']
});

for (const part of ANIMATION_CHILDREN[kind]) {
  const child = doc.createElement('i');
  child.setAttribute('data-ogzh-card-animation-part', part);
  decoration.appendChild(child);
}
```

Add scoped keyframes under `[data-ogzh-card-animation]` and this exact reduced-motion fallback:

```css
@media (prefers-reduced-motion: reduce) {
  [data-ogzh-card-animation],
  [data-ogzh-card-animation] * {
    animation: none !important;
  }
}
```

All container/body colors remain inline; CSS controls only preview motion transforms and opacity.

- [ ] **Step 4: Run tests and commit animations**

```bash
npx vitest run assets/scripts/core/__tests__/card-styles.test.js
git add assets/scripts/core/card-styles.js assets/styles/editor.css assets/scripts/core/__tests__/card-styles.test.js
git commit -m "feat: animate semantic card decorations"
```

Expected: PASS; no text node carries animation styles.

### Task 4: Transparent GIF generation and clipboard replacement

**Files:**
- Create: `assets/scripts/export/card-decoration-gif.js`
- Create: `assets/scripts/export/__tests__/card-decoration-gif.test.js`
- Modify: `assets/scripts/export/clipboard-exporter.js`
- Modify: `assets/scripts/export/__tests__/clipboard-exporter.test.js`

- [ ] **Step 1: Write failing pure layout tests**

```js
import { CARD_DECORATION_META, layoutCardDecoration } from '../card-decoration-gif.js';

it('defines exactly five animated decorations with compact canvases', () => {
  expect(Object.keys(CARD_DECORATION_META)).toEqual([
    'highlight', 'steps', 'relationship', 'bookmark', 'documents'
  ]);
  for (const kind of Object.keys(CARD_DECORATION_META)) {
    const layout = layoutCardDecoration(kind, { accent: '#315b4d', line: '#a69c89', soft: '#faf8f1' }, 0);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
    expect(layout.width * layout.height).toBeLessThan(20000);
  }
});

it.each(['highlight', 'steps', 'relationship', 'bookmark', 'documents'])(
  'changes %s during its active phase and reaches a resting phase',
  (kind) => {
    const colors = { accent: '#315b4d', line: '#a69c89', soft: '#faf8f1' };
    expect(layoutCardDecoration(kind, colors, 0).primitives)
      .not.toEqual(layoutCardDecoration(kind, colors, 1).primitives);
    expect(layoutCardDecoration(kind, colors, 3.5).resting).toBe(true);
  }
);
```

- [ ] **Step 2: Run tests and confirm the module is missing**

Run `npx vitest run assets/scripts/export/__tests__/card-decoration-gif.test.js`.

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement layouts and GIF encoding by reusing `encodeGif`**

Create the module with this interface:

```js
import { encodeGif } from './gif-encoder.js';

export const CARD_DECORATION_META = Object.freeze({
  highlight: { width: 176, height: 28, duration: 3.6 },
  steps: { width: 40, height: 96, duration: 4.2 },
  relationship: { width: 128, height: 118, duration: 5 },
  bookmark: { width: 48, height: 96, duration: 4.2 },
  documents: { width: 32, height: 32, duration: 4.6 }
});

export function layoutCardDecoration(kind, colors, tSeconds) {
  const meta = CARD_DECORATION_META[kind];
  if (!meta) return { width: 0, height: 0, primitives: [], resting: true };
  const phase = Math.min(1, Math.max(0, tSeconds / meta.duration));
  const progress = phase < 0.5 ? phase / 0.5 : 1;
  const resting = phase >= 0.5;
  const layouts = {
    highlight: () => [{ type: 'rect', x: 0, y: 4, width: 176 * progress, height: 20, radius: 4, color: colors.accent, alpha: 0.45 }],
    steps: () => [0, 1, 2].map((index) => ({ type: 'circle', x: 20, y: 16 + index * 32, radius: 7, color: index <= Math.floor(progress * 2) ? colors.accent : colors.line })),
    relationship: () => [
      { type: 'line', x1: 22, y1: 22, x2: 104, y2: 58, progress, color: colors.line },
      { type: 'line', x1: 20, y1: 94, x2: 104, y2: 58, progress, color: colors.line },
      { type: 'circle', x: 22, y: 22, radius: 6, color: colors.accent },
      { type: 'circle', x: 20, y: 94, radius: 6, color: colors.accent },
      { type: 'circle', x: 104, y: 58, radius: 7, color: colors.accent }
    ],
    bookmark: () => [{ type: 'bookmark', x: 4, y: -48 + 48 * progress, width: 40, height: 82, color: colors.accent }],
    documents: () => [
      { type: 'rect', x: 9 + 2 * progress, y: 2 - 3 * progress, width: 20, height: 24, radius: 3, color: colors.line },
      { type: 'rect', x: 2, y: 6, width: 20, height: 24, radius: 3, color: colors.soft, stroke: colors.accent }
    ]
  };
  return { width: meta.width, height: meta.height, primitives: layouts[kind](), resting };
}

function drawCardPrimitives(context, width, height, primitives) {
  context.clearRect(0, 0, width, height);
  for (const item of primitives) {
    context.globalAlpha = item.alpha ?? 1;
    context.fillStyle = item.color || 'transparent';
    context.strokeStyle = item.stroke || item.color || 'transparent';
    if (item.type === 'circle') {
      context.beginPath();
      context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      context.fill();
    } else if (item.type === 'line') {
      context.beginPath();
      context.moveTo(item.x1, item.y1);
      context.lineTo(item.x1 + (item.x2 - item.x1) * item.progress, item.y1 + (item.y2 - item.y1) * item.progress);
      context.stroke();
    } else {
      context.fillRect(item.x, item.y, item.width, item.height);
      if (item.stroke) context.strokeRect(item.x, item.y, item.width, item.height);
    }
  }
  context.globalAlpha = 1;
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function buildCardDecorationGif({ kind, colors, fps = 12 }) {
  if (typeof document === 'undefined' || !CARD_DECORATION_META[kind]) return null;
  try {
    const { width, height, duration } = CARD_DECORATION_META[kind];
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    const frames = [];
    for (let frame = 0; frame < Math.max(2, Math.round(duration * fps)); frame += 1) {
      const layout = layoutCardDecoration(kind, colors, frame / fps);
      drawCardPrimitives(context, width, height, layout.primitives);
      frames.push(context.getImageData(0, 0, width, height).data);
    }
    const bytes = encodeGif(frames, width, height, {
      delayCs: Math.max(1, Math.round(100 / fps)),
      transparent: true,
      repeat: 0
    });
    return { dataUrl: `data:image/gif;base64,${bytesToBase64(bytes)}`, width, height };
  } catch (error) {
    console.warn('卡片动图生成失败，保留静态装饰:', error);
    return null;
  }
}
```

Use the same primitive vocabulary already proven by `end-divider-gif.js`: circles, lines, rectangles and polygons. Use 12fps because these are small, low-frequency editorial motions; preserve a long final-state hold instead of encoding continuous movement.

- [ ] **Step 4: Add and test late clipboard replacement**

Export a focused helper from `clipboard-exporter.js`:

```js
export function materializeAnimatedCardDecorations(doc, {
  styleConfig,
  build = buildCardDecorationGif
} = {}) {
  const colors = resolveCardTokens(styleConfig);
  const cache = new Map();
  for (const decoration of doc.querySelectorAll('[data-ogzh-card-animation]')) {
    const kind = decoration.getAttribute('data-ogzh-card-animation');
    const cacheKey = `${kind}:${colors.accent}:${colors.line}:${colors.soft}`;
    if (!cache.has(cacheKey)) cache.set(cacheKey, build({ kind, colors }));
    const gif = cache.get(cacheKey);
    if (!gif) continue;
    const image = doc.createElement('img');
    image.setAttribute('src', gif.dataUrl);
    image.setAttribute('alt', '');
    image.setAttribute('aria-hidden', 'true');
    image.setAttribute('data-ogzh-card-gif', kind);
    image.setAttribute('style', `display:block;width:${gif.width}px;max-width:100%;height:auto;border:0;`);
    decoration.replaceWith(image);
  }
}
```

Call it after normal image materialization and immediately before plain-text/HTML serialization, beside `maybeReplaceAnimatedEndWithGif`. Add tests that inject a fake builder, verify one build per cache key, verify five replacements, and verify a null result leaves the static node untouched.

- [ ] **Step 5: Run export tests and commit**

```bash
npx vitest run assets/scripts/export/__tests__/card-decoration-gif.test.js assets/scripts/export/__tests__/clipboard-exporter.test.js
git add assets/scripts/export/card-decoration-gif.js assets/scripts/export/clipboard-exporter.js assets/scripts/export/__tests__/card-decoration-gif.test.js assets/scripts/export/__tests__/clipboard-exporter.test.js
git commit -m "feat: preserve card animations as gif"
```

### Task 5: Selection position helper

**Files:**
- Create: `assets/scripts/ui/selection-popover-position.js`
- Create: `assets/scripts/ui/__tests__/selection-popover-position.test.js`

- [ ] **Step 1: Write failing clamping tests**

```js
import { placeSelectionPopover } from '../selection-popover-position.js';

it('places right first, flips left, then clamps to safe bounds', () => {
  const bounds = { left: 100, right: 900, top: 50, bottom: 750 };
  const size = { width: 340, height: 420 };
  expect(placeSelectionPopover({ x: 400, y: 200 }, size, bounds)).toMatchObject({ side: 'right', left: 412 });
  expect(placeSelectionPopover({ x: 800, y: 200 }, size, bounds)).toMatchObject({ side: 'left', left: 448 });
  expect(placeSelectionPopover({ x: 500, y: 720 }, size, bounds).top).toBe(318);
});

it('returns the editor top-right fallback for an invalid anchor', () => {
  expect(placeSelectionPopover(null, { width: 340, height: 420 }, { left: 100, right: 900, top: 50, bottom: 750 }))
    .toEqual({ side: 'fallback', left: 548, top: 62 });
});
```

- [ ] **Step 2: Run tests and confirm module-not-found**

Run `npx vitest run assets/scripts/ui/__tests__/selection-popover-position.test.js`.

- [ ] **Step 3: Implement the pure placement function and browser mirror helper**

```js
const GAP = 12;

export function placeSelectionPopover(anchor, size, bounds) {
  const minLeft = bounds.left + GAP;
  const maxLeft = bounds.right - size.width - GAP;
  const minTop = bounds.top + GAP;
  const maxTop = bounds.bottom - size.height - GAP;
  if (!anchor || !Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) {
    return { side: 'fallback', left: maxLeft, top: minTop };
  }
  const right = anchor.x + GAP;
  const left = anchor.x - size.width - GAP;
  const side = right <= maxLeft ? 'right' : left >= minLeft ? 'left' : 'clamped';
  const candidate = side === 'right' ? right : side === 'left' ? left : anchor.x;
  return {
    side,
    left: Math.min(maxLeft, Math.max(minLeft, candidate)),
    top: Math.min(maxTop, Math.max(minTop, anchor.y - 24))
  };
}
```

Also export `measureTextareaSelectionFocus(textarea)`: create one off-screen mirror, copy `boxSizing`, `width`, four paddings, four borders, `font`, `letterSpacing`, `lineHeight`, `textTransform`, `textIndent`, `whiteSpace`, `wordBreak`, `overflowWrap` and `tabSize`; append text through the focus offset plus a one-character marker; return `textareaRect.left + marker.offsetLeft - textarea.scrollLeft` and `textareaRect.top + marker.offsetTop - textarea.scrollTop + lineHeight`. Remove the mirror in `finally`.

- [ ] **Step 4: Run tests and commit**

```bash
npx vitest run assets/scripts/ui/__tests__/selection-popover-position.test.js
git add assets/scripts/ui/selection-popover-position.js assets/scripts/ui/__tests__/selection-popover-position.test.js
git commit -m "feat: measure selection popover position"
```

### Task 6: Replace the toolbar picker with the automatic popover

**Files:**
- Modify: `assets/scripts/main.js:145,329,2176-2365,3260-3320,3500-3650`
- Modify: `index.html:498-555`
- Modify: `assets/styles/editor.css:80-240,1045-1110`
- Test: `assets/scripts/core/__tests__/card-picker.test.js`

- [ ] **Step 1: Write failing source-contract tests**

```js
it('uses an automatic selection popover instead of the toolbar trigger', () => {
  const html = read('index.html');
  const main = read('assets/scripts/main.js');
  expect(html).not.toContain('class="editor-tool-btn card-picker-trigger"');
  expect(html).toContain('class="selection-card-popover"');
  expect(html).toContain('应用卡片样式');
  expect(html).toContain('已选 {{ selectedCardTextLength }} 字');
  expect(main).toContain('measureTextareaSelectionFocus');
  expect(main).toContain('placeSelectionPopover');
});

it('derives filter totals from the registry', () => {
  const main = read('assets/scripts/main.js');
  expect(main).toContain("const cardStyleFilter = ref('all')");
  expect(main).toContain('filteredCardStyles');
  expect(main).not.toContain('全部 18');
});
```

- [ ] **Step 2: Run the picker tests and confirm failure**

Run `npx vitest run assets/scripts/core/__tests__/card-picker.test.js`.

Expected: FAIL because the toolbar trigger remains and no fixed popover exists.

- [ ] **Step 3: Add Vue state and selection lifecycle**

Import the helper and add only the required state:

```js
import {
  measureTextareaSelectionFocus,
  placeSelectionPopover
} from './ui/selection-popover-position.js';

const cardStyleFilter = ref('all');
const cardPopoverPosition = ref({ left: 0, top: 0, side: 'right' });
const editorSelection = ref({ start: 0, end: 0, direction: 'none' });
const selectedCardTextLength = computed(() =>
  Math.max(0, editorSelection.value.end - editorSelection.value.start)
);
const filteredCardStyles = computed(() => CARD_STYLES.filter((card) =>
  cardStyleFilter.value === 'all' ||
  (cardStyleFilter.value === 'animated') === Boolean(card.animated)
));
const cardStyleFilters = computed(() => [
  { value: 'all', label: '全部', count: CARD_STYLES.length },
  { value: 'static', label: '静态', count: CARD_STYLES.filter(({ animated }) => !animated).length },
  { value: 'animated', label: '动效', count: CARD_STYLES.filter(({ animated }) => animated).length }
]);
const isMobileCardPopover = computed(() => window.innerWidth <= 768);
const cardPopoverStyle = computed(() => isMobileCardPopover.value
  ? { left: '12px', right: '12px', bottom: '12px' }
  : { left: `${cardPopoverPosition.value.left}px`, top: `${cardPopoverPosition.value.top}px` }
);
```

Change `syncEditorSelection` to cache `selectionDirection`. Add `handleEditorSelectionChange(event)` that syncs, closes on a collapsed selection, otherwise analyzes and opens after `nextTick`. Use one `requestAnimationFrame`-coalesced `positionCardPopover()` for selection, textarea scroll, resize and `visualViewport` events.

- [ ] **Step 4: Replace the HTML template**

Remove `.card-picker-anchor` and its button. Add a fixed dialog after `.markdown-input-container`:

```html
<div
  v-if="showCardPicker"
  class="selection-card-popover"
  :class="['side-' + cardPopoverPosition.side, { 'is-mobile': isMobileCardPopover }]"
  :style="cardPopoverStyle"
  role="dialog"
  aria-label="应用卡片样式"
  @mousedown.prevent
>
  <header class="selection-card-popover-header">
    <div class="selection-card-popover-title">
      <strong>应用卡片样式</strong>
      <span>已选 {{ selectedCardTextLength }} 字</span>
    </div>
    <button type="button" aria-label="关闭卡片样式" @click="closeCardPicker(false)">×</button>
  </header>
  <p v-if="!cardTargetState.ok" class="card-picker-reason" role="status">{{ cardTargetState.reason }}</p>
  <template v-else>
    <div class="selection-card-filters" role="tablist" aria-label="卡片类型">
      <button v-for="filter in cardStyleFilters" :key="filter.value" type="button" :class="{ active: cardStyleFilter === filter.value }" @click="cardStyleFilter = filter.value">{{ filter.label }} {{ filter.count }}</button>
    </div>
    <div class="card-picker-grid">
      <button v-for="card in filteredCardStyles" :key="card.id" type="button" class="card-picker-item" @click="applySelectedCard(card.id)">
        <span class="card-picker-preview" aria-hidden="true" v-html="getCardPreviewHtml(card.id)"></span>
        <span class="card-picker-name">{{ card.name }}</span>
      </button>
    </div>
    <button v-if="cardTargetState.existing" type="button" class="card-picker-remove" @click="removeSelectedCard">移除卡片样式</button>
  </template>
</div>
```

- [ ] **Step 5: Add scoped desktop/mobile CSS and cleanup listeners**

Use this scoped shell and retain the existing item/preview styles inside it:

```css
.selection-card-popover {
  position: fixed;
  z-index: 500;
  width: min(360px, calc(100vw - 24px));
  max-height: min(560px, calc(100vh - 24px));
  overflow: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-4);
}
.selection-card-popover-header,
.selection-card-filters {
  position: sticky;
  z-index: 2;
  background: var(--color-surface);
}
.selection-card-popover-header { top: 0; display: flex; align-items: center; justify-content: space-between; }
.selection-card-popover-title { display: flex; align-items: center; gap: 8px; }
.selection-card-popover-title span { padding: 3px 6px; border-radius: 5px; background: var(--color-surface-raised); }
.selection-card-filters { top: 42px; display: flex; gap: 4px; }
@media (max-width: 768px) {
  .selection-card-popover { top: auto !important; width: auto; max-height: min(54vh, 440px); border-radius: var(--radius-lg) var(--radius-lg) 0 0; }
  .selection-card-popover .card-picker-grid { grid-template-columns: 1fr; }
}
```

Preserve visible focus and add no global toolbar changes beyond removing the obsolete trigger. Disconnect `ResizeObserver`, cancel animation frames, and remove `visualViewport` listeners in `onBeforeUnmount`.

Update the two changed browser entry resources in `index.html` from `v=14` to `v=15`:

```html
<link rel="stylesheet" href="assets/styles/editor.css?v=15">
<script type="module" src="assets/scripts/main.js?v=15"></script>
```

- [ ] **Step 6: Run picker/core tests and commit**

```bash
npx vitest run assets/scripts/core/__tests__/card-picker.test.js assets/scripts/core/__tests__/card-styles.test.js assets/scripts/ui/__tests__/selection-popover-position.test.js
node --check assets/scripts/main.js
git add index.html assets/scripts/main.js assets/styles/editor.css assets/scripts/core/__tests__/card-picker.test.js
git commit -m "feat: open card styles beside text selection"
```

### Task 7: Full regression and browser verification

**Files:**
- Do not modify production files unless a test or browser check demonstrates a requirement regression.
- Verify: all files changed in Tasks 1–6.

- [ ] **Step 1: Run the full automated suite and syntax checks**

```bash
npm test
node --check assets/scripts/core/card-styles.js
node --check assets/scripts/export/card-decoration-gif.js
node --check assets/scripts/export/clipboard-exporter.js
node --check assets/scripts/ui/selection-popover-position.js
node --check assets/scripts/main.js
git diff --check b277941
```

Expected: all Vitest files pass, all syntax checks exit 0, no whitespace errors.

- [ ] **Step 2: Verify desktop selection behavior in a real browser**

At 1440×900 and 1000×800 verify:

1. Mouse forward selection, mouse reverse selection and Shift+Arrow selection open the popover at the focus end.
2. Right-edge selections flip the popover left; long-document and textarea scrolling keep it anchored.
3. Valid selection applies each filter category; invalid heading/image/table/code selections show a reason without mutation.
4. Existing active and legacy cards can be replaced or removed.
5. Apply/replace/remove retain the textarea `scrollTop` and selected content.
6. `Esc`, outside click and collapsed selection close the popover.

- [ ] **Step 3: Verify mobile and reduced-motion behavior**

At 390×844 and 360×800 verify:

1. Selection opens a bottom half-sheet inside the visual viewport.
2. The list scrolls to the 18th card and the remove action.
3. Soft keyboard resize does not hide header/close controls.
4. No horizontal page overflow occurs.
5. With reduced motion enabled, the five decorations show a stable final state.

- [ ] **Step 4: Verify copy output locally**

Copy an article containing all five animated cards and inspect clipboard HTML:

```js
const html = await navigator.clipboard.read().then((items) => items[0].getType('text/html')).then((blob) => blob.text());
console.assert((html.match(/data-ogzh-card-gif=/g) || []).length === 5);
console.assert(html.includes('第一版方案'));
console.assert(html.includes('2026.08.12'));
console.assert(!html.includes('DOCUMENT ARCHIVE'));
```

Expected: five GIF images, editable text and links, no English archive label. Record that actual WeChat backend paste still requires manual verification if credentials/session are unavailable.

- [ ] **Step 5: Final review commit if verification required fixes**

If verification produced scoped fixes, list them with `git diff --name-only b277941`, stage each explicit in-scope path from that list, then commit:

```bash
git add assets/scripts/core/card-styles.js assets/scripts/export/card-decoration-gif.js assets/scripts/export/clipboard-exporter.js assets/scripts/ui/selection-popover-position.js assets/scripts/main.js assets/styles/editor.css index.html
git commit -m "fix: harden card popover regressions"
```

If no fixes were required, do not create an empty commit.

## Plan self-review

- Spec coverage: Tasks 1–3 cover the 18-card catalog, legacy rendering, six static designs, five semantic preview animations and the single-line historical-document contract. Task 4 covers transparent GIF copy and fallback. Tasks 5–6 cover textarea measurement, desktop/mobile positioning, filters, accessibility and removal of the toolbar entry. Task 7 covers full regression and manual acceptance.
- Placeholder scan: no `TBD`, `TODO`, unresolved file name, unspecified test command or deferred implementation remains.
- Interface consistency: animation kinds are `highlight`, `steps`, `relationship`, `bookmark`, `documents` in DOM hooks, GIF metadata and clipboard replacement; selection positioning exports are `measureTextareaSelectionFocus` and `placeSelectionPopover` in both helper and caller.
