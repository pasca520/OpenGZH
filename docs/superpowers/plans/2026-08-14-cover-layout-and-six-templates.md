# Cover Layout and Six Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair text overflow, overlap, and fragile glyph rendering across all existing covers, then add six distinct production-ready cover templates.

**Architecture:** Keep each SVG template independent, but move wrapping and title-to-subtitle flow into `renderCover()` using per-template `textBox` width metadata. Preserve the existing `renderTextLines()` field markup so inline editing and drag offsets continue to work. Add only native SVG artwork and reuse the current categories and test suite.

**Tech Stack:** JavaScript ES modules, Vue 3 browser app, SVG, Canvas PNG export, Vitest.

---

## File Map

- Modify `assets/scripts/cover/renderer.js`: normalize content with template text bounds and wait-free pure layout calculations.
- Modify `assets/scripts/cover/templates.js`: declare text bounds for 40 existing templates; replace fragile glyph; define and register six new SVG templates and metadata.
- Modify `assets/scripts/main.js`: add complete Chinese fallback stacks to cover font choices.
- Modify `assets/scripts/cover/export-png.js`: wait for the document font set before SVG-to-image conversion.
- Modify `assets/scripts/cover/__tests__/templates.test.js`: extend structural and long-copy coverage from 10 to all 46 templates.
- Create `assets/scripts/cover/__tests__/export-png.test.js`: verify the font-ready gate without a DOM fixture.

### Task 1: Lock the regressions with failing tests

**Files:**
- Modify: `assets/scripts/cover/__tests__/templates.test.js`
- Create: `assets/scripts/cover/__tests__/export-png.test.js`

- [ ] **Step 1: Change the expected catalog contract and define new IDs**

```js
const NEW_TEMPLATE_IDS = [
  'editorial-depth',
  'data-brief',
  'product-launch',
  'prism-spectrum',
  'paper-cut-window',
  'pixel-future'
];

expect(COVER_TEMPLATES.length).toBe(46);
for (const id of NEW_TEMPLATE_IDS) {
  expect(getTemplate(id), id).toBeTruthy();
  expect(TEMPLATE_META[id], `${id} metadata`).toBeTruthy();
}
```

- [ ] **Step 2: Expand the realistic-copy geometry test to all templates**

```js
for (const tpl of COVER_TEMPLATES) {
  const svg = renderCover(tpl.id, LONG, DEFAULT_TYPOGRAPHY);
  const titleLines = fieldLines(svg, 'title');
  const subtitleLines = fieldLines(svg, 'subtitle');

  expect(titleLines.length, `${tpl.id} wraps title`).toBeGreaterThan(1);
  for (const line of [...titleLines, ...subtitleLines]) {
    expect(line.left, `${tpl.id} left edge`).toBeGreaterThanOrEqual(0);
    expect(line.right, `${tpl.id} right edge`).toBeLessThanOrEqual(1200);
    expect(line.y, `${tpl.id} vertical edge`).toBeGreaterThan(0);
    expect(line.y, `${tpl.id} vertical edge`).toBeLessThan(510);
  }
  expect(Math.min(...subtitleLines.map(line => line.y)), `${tpl.id} subtitle flow`)
    .toBeGreaterThan(Math.max(...titleLines.map(line => line.y)));
}
```

The `fieldLines()` helper parses `x`, `y`, `font-size`, `text-anchor`, and text content from each `<text data-field="…">`, then estimates left/right edges using the same CJK/Latin width rule as production.

- [ ] **Step 3: Add escaping and fragile-glyph checks**

```js
const svg = renderCover('mag-swiss', {
  ...SAMPLE,
  tag: 'A&B <产品>',
  title: '标题 "安全" & 可读'
});
expect(svg).toContain('A&amp;B &lt;产品&gt;');
expect(svg).toContain('标题 &quot;安全&quot; &amp; 可读');
expect(COVER_TEMPLATES.map(t => t.render.toString()).join('\n')).not.toContain('№');
```

- [ ] **Step 4: Add a font-ready unit test**

```js
import { waitForDocumentFonts } from '../export-png.js';

it('waits for the supplied font set before export', async () => {
  let resolveReady;
  const ready = new Promise(resolve => { resolveReady = resolve; });
  let settled = false;
  const waiting = waitForDocumentFonts({ ready }).then(() => { settled = true; });
  await Promise.resolve();
  expect(settled).toBe(false);
  resolveReady();
  await waiting;
  expect(settled).toBe(true);
});

it('does not fail when the font API is unavailable', async () => {
  await expect(waitForDocumentFonts(undefined)).resolves.toBeUndefined();
});
```

- [ ] **Step 5: Run tests and verify they fail for the intended reasons**

Run: `npx vitest run assets/scripts/cover/__tests__/templates.test.js assets/scripts/cover/__tests__/export-png.test.js`

Expected: FAIL because the catalog still contains 40 templates, old templates overflow, `№` remains, and `waitForDocumentFonts` is not exported.

### Task 2: Centralize wrapping and vertical flow

**Files:**
- Modify: `assets/scripts/cover/renderer.js`
- Modify: `assets/scripts/cover/templates.js`
- Test: `assets/scripts/cover/__tests__/templates.test.js`

- [ ] **Step 1: Export the existing width-aware wrapper and add renderer layout normalization**

Move the wrapper to a reusable export in `templates.js`:

```js
export function wrapText(text, fontSize, maxWidth) {
  // Preserve the existing CJK-aware implementation unchanged.
}
```

Add this pure helper to `renderer.js`:

```js
function flowCoverText(template, content, typography) {
  const box = template.textBox;
  if (!box) return { content, typography };

  const title = wrapText(content.title, typography.titleSize, box.titleWidth);
  const subtitle = wrapText(content.subtitle, typography.subtitleSize, box.subtitleWidth || box.titleWidth);
  const lineCount = title ? title.split('\n').length : 0;
  const titleLineHeight = typography.titleLineHeight <= 4
    ? typography.titleSize * typography.titleLineHeight
    : typography.titleLineHeight;

  return {
    content: { ...content, title, subtitle },
    typography: {
      ...typography,
      subtitleOffsetY: typography.subtitleOffsetY + Math.max(0, lineCount - 1) * titleLineHeight
    }
  };
}
```

Call it once inside `renderCover()` before `template.render()`.

- [ ] **Step 2: Give every existing template a text box matching its composition**

Add `textBox` beside `id`, `name`, and `category`. Use `titleWidth: 1040` for full-width layouts, `620–820` for layouts with right-side artwork, and `620` for `split-screen`. Use the same width for subtitles unless the template has a visibly narrower subtitle rule.

```js
const pureWhite = {
  id: 'pure-white', name: '素白纯净', category: 'solid-light',
  textBox: { titleWidth: 820, subtitleWidth: 820 },
  // existing template body remains unchanged
};
```

- [ ] **Step 3: Remove local wrapping duplication from the ten newest templates**

For each `mag-*` and `abs-*` template, replace locally wrapped title/subtitle variables with `content.title` and `content.subtitle`. Set the fixed one-line subtitle baseline to:

```js
const SUB_Y = TITLE_Y + lineHeightPx(typo.titleSize, typo.titleLineHeight) + GAP;
```

The renderer-provided `subtitleOffsetY` then adds exactly one line height for each additional wrapped title line.

- [ ] **Step 4: Run the geometry tests**

Run: `npx vitest run assets/scripts/cover/__tests__/templates.test.js`

Expected: existing-template geometry tests PASS; catalog-count tests remain FAIL until Task 4.

### Task 3: Stabilize glyph and font export behavior

**Files:**
- Modify: `assets/scripts/cover/templates.js`
- Modify: `assets/scripts/main.js`
- Modify: `assets/scripts/cover/export-png.js`
- Test: `assets/scripts/cover/__tests__/export-png.test.js`

- [ ] **Step 1: Replace the fragile special glyph**

```svg
<text x="108" y="96" ...>NO.</text>
```

Adjust its size to fit the existing red square without changing the square geometry.

- [ ] **Step 2: Add stable Chinese fallbacks to every font option**

Use these endings consistently:

```js
const SANS_CJK = "'PingFang SC', 'Microsoft YaHei', sans-serif";
const SERIF_CJK = "'Noto Serif SC', 'Songti SC', 'SimSun', serif";

{ label: '霞鹜文楷', value: `'LXGW WenKai', ${SANS_CJK}` },
{ label: 'Fraunces', value: `'Fraunces', ${SERIF_CJK}` }
```

- [ ] **Step 3: Gate PNG serialization on font readiness**

```js
export async function waitForDocumentFonts(fontSet = globalThis.document?.fonts) {
  if (fontSet?.ready) await fontSet.ready;
}

export async function exportCoverPng(svgString, filename = 'cover') {
  await waitForDocumentFonts();
  // existing DOMParser, SVG image load, canvas and download flow
}
```

- [ ] **Step 4: Run the focused export tests**

Run: `npx vitest run assets/scripts/cover/__tests__/export-png.test.js assets/scripts/cover/__tests__/templates.test.js`

Expected: font-gate and fragile-glyph tests PASS.

### Task 4: Add and register six cover templates

**Files:**
- Modify: `assets/scripts/cover/templates.js`
- Test: `assets/scripts/cover/__tests__/templates.test.js`

- [ ] **Step 1: Add the professional templates with explicit safe regions**

Use these contracts:

```js
const editorialDepth = {
  id: 'editorial-depth', name: '深度社论', category: 'editorial',
  textBox: { titleWidth: 720, subtitleWidth: 720 },
  elements: { tag: true, title: true, subtitle: true, author: true, image: false }
};
const dataBrief = {
  id: 'data-brief', name: '数据简报', category: 'solid-dark',
  textBox: { titleWidth: 700, subtitleWidth: 700 },
  elements: { tag: true, title: true, subtitle: true, author: false, image: false }
};
const productLaunch = {
  id: 'product-launch', name: '产品发布', category: 'geometric',
  textBox: { titleWidth: 700, subtitleWidth: 700 },
  elements: { tag: true, title: true, subtitle: true, author: false, issue: true, image: false }
};
```

Render each at `1200×510` using native SVG primitives. Keep text on the left and the editorial columns, data tracks, or launch window on the right so their 700–720 pixel text regions remain visually honest.

- [ ] **Step 2: Add the creative templates with explicit safe regions**

```js
const prismSpectrum = {
  id: 'prism-spectrum', name: '棱镜光谱', category: 'gradient',
  textBox: { titleWidth: 760, subtitleWidth: 760 },
  elements: { tag: true, title: true, subtitle: true, author: false, image: false }
};
const paperCutWindow = {
  id: 'paper-cut-window', name: '纸雕窗口', category: 'abstract-art',
  textBox: { titleWidth: 720, subtitleWidth: 720 },
  elements: { tag: true, title: true, subtitle: true, author: false, image: false }
};
const pixelFuture = {
  id: 'pixel-future', name: '像素未来', category: 'solid-dark',
  textBox: { titleWidth: 700, subtitleWidth: 700 },
  elements: { tag: true, title: true, subtitle: true, author: false, image: false }
};
```

Use polygonal translucent spectrum planes, nested rounded paper-cut layers, and square pixel modules respectively. All labels use ASCII plus escaped user content; no decorative Unicode glyphs.

- [ ] **Step 3: Add metadata and append templates to their categories**

```js
'editorial-depth': { scenario: '行业观点、深度评论', styleTags: ['编辑', '克制', '深度'] },
'data-brief': { scenario: '数据复盘、研究摘要', styleTags: ['数据', '深色', '理性'] },
'product-launch': { scenario: '产品更新、功能发布', styleTags: ['产品', '发布', '网格'] },
'prism-spectrum': { scenario: 'AI 趋势、设计前沿', styleTags: ['光谱', '棱镜', '未来'] },
'paper-cut-window': { scenario: '品牌故事、生活方式', styleTags: ['纸雕', '层次', '柔和'] },
'pixel-future': { scenario: '科技内容、游戏文化', styleTags: ['像素', '高对比', '未来'] }
```

- [ ] **Step 4: Run all cover tests**

Run: `npx vitest run assets/scripts/cover/__tests__/templates.test.js assets/scripts/cover/__tests__/export-png.test.js`

Expected: all focused tests PASS with exactly 46 unique templates.

### Task 5: Browser and repository verification

**Files:**
- Verify only; do not add a permanent audit page.

- [ ] **Step 1: Run the full suite**

Run: `npm test`

Expected: all test files and tests PASS.

- [ ] **Step 2: Run static checks**

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 3: Render a temporary 46-template contact sheet**

Generate an ignored temporary HTML audit page that imports `COVER_TEMPLATES` and `renderCover`, renders `LONG` content into one card per template, then open it through the repository HTTP server in headless Chrome. Capture the entire contact sheet and inspect for blank SVGs, clipping, overlap, broken gradients, duplicate SVG IDs, and unreadable text. Delete the temporary page after inspection.

- [ ] **Step 4: Verify the application preview and PNG path**

Open the normal cover editor, select at least one repaired old template and each of the six new templates, and inspect the large preview. Export one system-font cover and one network-font cover; confirm both PNGs contain readable Chinese text and match the preview geometry.

- [ ] **Step 5: Commit the implementation**

```bash
git add assets/scripts/cover/templates.js \
  assets/scripts/cover/renderer.js \
  assets/scripts/cover/export-png.js \
  assets/scripts/cover/__tests__/templates.test.js \
  assets/scripts/cover/__tests__/export-png.test.js \
  assets/scripts/main.js
git commit -m "feat: 修复封面排版并新增六套模板"
```
