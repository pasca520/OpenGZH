# Four Centered Cover Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four centered WeChat cover templates with editable type and author labels, defaulting to “技术分享” and “AI产品零度”.

**Architecture:** Keep the existing template-object registry and SVG renderer. Add one small shared renderer for the repeated centered metadata row, then register four independent SVG templates under a new `centered` category; do not alter existing template output or persisted data shape.

**Tech Stack:** Native ES modules, SVG strings, Vue 3 CDN runtime, Vitest.

---

### Task 1: Lock the new template contract with failing tests

**Files:**
- Modify: `assets/scripts/cover/__tests__/templates.test.js`
- Test: `assets/scripts/cover/__tests__/templates.test.js`

- [ ] **Step 1: Add the centered-template fixtures and assertions**

```js
const CENTERED_IDS = [
  'center-midnight-prism',
  'center-editorial-seal',
  'center-circuit-grid',
  'center-orbit-glow'
];

it('includes 4 editable centered covers', () => {
  const centered = getTemplates('centered');
  expect(centered.map(t => t.id)).toEqual(CENTERED_IDS);
  expect(getCategories().find(c => c.id === 'centered')?.label).toBe('居中布局');
  for (const tpl of centered) {
    expect(tpl.elements).toMatchObject({ tag: true, title: true, subtitle: true, author: true });
    const svg = renderCover(tpl.id, { ...SAMPLE, tag: '技术分享', author: 'AI产品零度' }, DEFAULT_TYPOGRAPHY);
    expect(svg).toContain('类型');
    expect(svg).toContain('作者');
    expect(svg).toContain('data-field="tag"');
    expect(svg).toContain('data-field="author"');
  }
});
```

Update the exact total from `40` to `44`, and include the four centered IDs in the long-copy layout test.

- [ ] **Step 2: Run the focused test and confirm the red state**

Run: `npm test -- assets/scripts/cover/__tests__/templates.test.js`

Expected: FAIL because the total is still 40, the `centered` category does not exist, and the four IDs are not registered.

### Task 2: Implement the four centered SVG templates

**Files:**
- Modify: `assets/scripts/cover/templates.js`
- Modify: `assets/scripts/cover/renderer.js`
- Test: `assets/scripts/cover/__tests__/templates.test.js`

- [ ] **Step 1: Add a narrow shared metadata-row renderer**

Add `renderCenteredMetaRow(content, typo, y, palette)` next to the existing text helpers. It must:

```js
function renderCenteredMetaRow(content, typo, y, palette) {
  // Measure the two dynamic values with tagW, center the combined row at x=600,
  // render static “类型” and “作者” labels, and render the values through
  // renderTextLines(..., 'tag') / renderTextLines(..., 'author').
}
```

The helper accepts only colors needed by all four variants. It must not add a new data field or state object.

- [ ] **Step 2: Add the four template objects**

Use this complete text-layout contract in each object, changing only the ID, name, palette, and decorative SVG primitives listed below:

```js
{
  id: 'center-midnight-prism',
  name: '午夜棱镜',
  category: 'centered',
  elements: { tag: true, title: true, subtitle: true, author: true, image: false },
  render(content, typo) {
    const TITLE_X = 600, TITLE_Y = 220, TITLE_W = 900, SUB_W = 900;
    const titleWrapped = wrapText(content.title, typo.titleSize, TITLE_W);
    const titleLines = titleWrapped ? titleWrapped.split('\n').length : 0;
    const subtitleY = TITLE_Y + titleLines * lineHeightPx(typo.titleSize, typo.titleLineHeight) + 26;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="510" fill="#101827"/>
      <polygon points="0,0 350,0 0,250" fill="#312E81" opacity="0.25"/>
      <polygon points="1200,510 910,510 1100,330" fill="#4338CA" opacity="0.2"/>
      <path d="M0 510 L430 120 L1200 510" fill="none" stroke="#64748B" opacity="0.3"/>
      ${renderCenteredMetaRow(content, typo, 94, { label: '#94A3B8', value: '#E2E8F0', line: '#6366F1' })}
      ${renderTextLines(titleWrapped, TITLE_X, TITLE_Y, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#F8FAFC', '800', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
      ${content.subtitle ? renderTextLines(wrapText(content.subtitle, typo.subtitleSize, SUB_W), TITLE_X, subtitleY, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#CBD5E1', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
    </svg>`;
  }
}
```

The remaining objects use the same complete field calls with these exact identity pairs: `center-editorial-seal` / `编辑印记`, `center-circuit-grid` / `电路网格`, and `center-orbit-glow` / `环形微光`.

Use these bounded visual primitives:

- `center-midnight-prism`: `#101827` background, indigo translucent triangles and thin diagonal rules.
- `center-editorial-seal`: `#F4EFE6` background, black keylines, red circular stamp and sparse registration marks.
- `center-circuit-grid`: `#071B24` background, cyan grid/nodes and corner circuit traces.
- `center-orbit-glow`: `#120D24` background, violet radial glow, concentric rings and small orbit dots.

All text is `text-anchor="middle"`; title and subtitle use `renderTextLines`, and decorative primitives stay outside the text-safe rectangle bounded by x=150–1050 and y=150–440.

- [ ] **Step 3: Register metadata and templates**

Add four `TEMPLATE_META` entries with centered/scenario tags, append the four objects to `COVER_TEMPLATES`, update the top comments to 44 templates / 9 categories, and add this category label in `renderer.js`:

```js
'centered': '居中布局'
```

- [ ] **Step 4: Run the focused tests**

Run: `npm test -- assets/scripts/cover/__tests__/templates.test.js`

Expected: all template tests pass, including 44 unique IDs and four centered covers.

### Task 3: Update defaults and visible template counts

**Files:**
- Modify: `assets/scripts/main.js`
- Modify: `README.md`
- Test: `assets/scripts/cover/__tests__/templates.test.js`

- [ ] **Step 1: Change only the new-user/reset author default**

Replace both occurrences in cover initialization and `resetToDefault()`:

```js
author: 'AI产品零度'
```

Keep `tag: '技术分享'` and every persistence key unchanged.

- [ ] **Step 2: Update user-visible counts**

Replace the three visible `40 套` cover-template claims in `README.md` and `assets/scripts/main.js` with `44 套`. Do not change unrelated copy or export behavior.

- [ ] **Step 3: Verify the focused contract again**

Run: `npm test -- assets/scripts/cover/__tests__/templates.test.js`

Expected: PASS.

### Task 4: Verify the real render and export path

**Files:**
- Verify: `assets/scripts/cover/templates.js`
- Verify: `assets/scripts/cover/export-png.js`

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: every Vitest test passes with zero failures.

- [ ] **Step 2: Validate generated SVG as XML**

Render each new template with long Chinese content, write only the temporary outputs to a `mktemp -d` directory, and run `xmllint --noout` on all four files.

Expected: `4/4` SVG files parse successfully.

- [ ] **Step 3: Export and inspect 2× PNGs**

Serve the repository root locally, load the four templates through the real cover UI/export path, and export each at 2×.

Expected: four `2400 × 1020` PNG files; no missing glyphs, text overlap, clipping, or decoration crossing the title/subtitle safe area.

- [ ] **Step 4: Run the final repository checks**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; status contains only the planned files.
