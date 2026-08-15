# Centered Layout Background Series Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace four duplicate centered templates with one centered layout template that offers 16 selectable backgrounds, a standalone top tag, and a bottom-right `@author` signature.

**Architecture:** `templates.js` owns a `CENTERED_BACKGROUNDS` data set and one `centeredLayout` renderer. The Vue layer owns the selected background ID and exposes a generic selector only when the current template declares backgrounds; the existing renderer passes the ID through without introducing persistence keys.

**Tech Stack:** Native ES modules, Vue 3 CDN runtime, SVG strings, CSS Grid, Vitest, Playwright.

---

### Task 1: Specify the single-template contract

**Files:**
- Modify: `assets/scripts/cover/__tests__/templates.test.js`

- [x] **Step 1: Replace the four-template assertions**

Assert exactly 41 unique templates and exactly one template in the `centered` category:

```js
const CENTERED_BACKGROUND_IDS = [
  'midnight-prism', 'editorial-seal', 'circuit-grid', 'orbit-glow',
  'cobalt-radar', 'vermilion-fold', 'ink-wash', 'emerald-contour',
  'amber-horizon', 'graphite-grid', 'cyan-blueprint', 'coral-ripple',
  'forest-window', 'silver-glass', 'burgundy-lines', 'ultraviolet-noise'
];

it('uses one centered layout with 16 selectable backgrounds', () => {
  const centered = getTemplates('centered');
  expect(centered.map(template => template.id)).toEqual(['centered-layout']);
  expect(centered[0].backgrounds.map(background => background.id)).toEqual(CENTERED_BACKGROUND_IDS);
});
```

- [x] **Step 2: Lock the new label and author placement**

For every background, render `centered-layout` with `{ tag: '技术分享', author: 'AI产品零度', backgroundId }` and assert:

```js
expect(svg).toContain(`data-background="${backgroundId}"`);
expect(svg).toContain('data-field="tag"');
expect(svg).toContain('技术分享');
expect(svg).not.toContain('类型');
expect(svg).not.toContain('>作者<');
expect(svg).toContain('@AI产品零度');
expect(svg.match(/@AI产品零度/g)).toHaveLength(1);
```

Also render with `author: '@AI产品零度'` and assert the output still contains one `@`.

- [x] **Step 3: Run the focused test in the red state**

Run: `npm test -- assets/scripts/cover/__tests__/templates.test.js`

Expected: FAIL because four centered templates still exist, no template owns 16 backgrounds, and fixed “类型/作者” labels remain.

### Task 2: Replace duplicate templates with one layout and 16 backgrounds

**Files:**
- Modify: `assets/scripts/cover/templates.js`
- Modify: `assets/scripts/cover/renderer.js`
- Test: `assets/scripts/cover/__tests__/templates.test.js`

- [x] **Step 1: Define the background data contract**

Create and export `CENTERED_BACKGROUNDS`; every item has this exact shape:

```js
{
  id: 'midnight-prism',
  name: '午夜棱镜',
  preview: 'linear-gradient(135deg, #111827, #312E81)',
  palette: {
    title: '#F7F8FB',
    subtitle: '#B8C3D5',
    tagFill: '#1A2740',
    tagStroke: '#536A95',
    tagText: '#E5EAF2',
    author: '#9EACC2'
  },
  artwork: () => `<rect width="1200" height="510" fill="#111827"/>
    <polygon points="0,0 360,0 0,242" fill="#312E81" opacity="0.24"/>
    <polygon points="1200,510 905,510 1102,332" fill="#4338CA" opacity="0.22"/>`
}
```

Declare all 16 IDs from Task 1. Each `artwork()` returns a complete background layer and must use its own SVG definition IDs.

- [x] **Step 2: Implement the one shared layout**

Replace `renderCenteredMetaRow` and the four centered template objects with:

```js
function renderCenteredTag(content, typo, y, palette) {
  if (!content.tag) return '';
  const width = tagW(content.tag, typo.tagSize) + 40;
  return `<rect x="${600 - width / 2}" y="${y - typo.tagSize - 10}" width="${width}" height="${typo.tagSize + 22}" rx="${(typo.tagSize + 22) / 2}" fill="${palette.tagFill}" stroke="${palette.tagStroke}"/>
  ${renderTextLines(content.tag, 600, y, typo.tagSize, typo.tagSize * 1.2, 1, 'center', palette.tagText, '600', typo.subtitleFontFamily, 'tag')}`;
}

function renderAuthorHandle(author) {
  const handle = String(author || '').trim().replace(/^@+\s*/, '');
  return handle ? `@${handle}` : '';
}
```

Create `centeredLayout` with `id: 'centered-layout'`, `backgrounds: CENTERED_BACKGROUNDS`, and one render function. It resolves unknown background IDs to the first background, emits `data-background`, keeps title/subtitle centered, renders the tag at the top, and renders the author handle at x=1120 / y=456 with `text-anchor="end"`.

- [x] **Step 3: Update registration and pass-through**

Remove the four old centered IDs and their metadata, register one `centered-layout` meta entry, set the top file comment to 41 templates / 9 categories, and add this field to `safeContent` in `renderer.js`:

```js
backgroundId: content.backgroundId || ''
```

- [x] **Step 4: Verify the template green state**

Run: `npm test -- assets/scripts/cover/__tests__/templates.test.js`

Expected: every cover-template test passes with 41 templates, one centered layout, and 16 backgrounds.

### Task 3: Add the background selector and state integration

**Files:**
- Modify: `assets/scripts/main.js`
- Modify: `index.html`
- Modify: `assets/styles/cover.css`
- Test: `assets/scripts/cover/__tests__/templates.test.js`

- [x] **Step 1: Add background state and validation**

In `main.js`, add:

```js
const DEFAULT_COVER_BACKGROUND_ID = 'midnight-prism';
const coverBackgroundId = ref(DEFAULT_COVER_BACKGROUND_ID);
const currentTemplateBackgrounds = computed(() => {
  const template = getTemplate(coverTemplateId.value);
  return template?.backgrounds || [];
});

function selectCoverBackground(id) {
  if (!currentTemplateBackgrounds.value.some(background => background.id === id)) return;
  pushCoverUndo();
  coverBackgroundId.value = id;
}
```

Import `getTemplate`, pass `backgroundId` into `renderCover`, reset the background to the first valid value when changing templates, and return the new state/functions from `setup()`.

- [x] **Step 2: Integrate undo, redo, restore, and reset**

Add `backgroundId` to `getCoverStateSnapshot()`. In `restoreCoverState()`, accept the saved ID only when it belongs to the restored template; otherwise use the template's first background or `DEFAULT_COVER_BACKGROUND_ID`. Reset both reset paths to the default ID.

- [x] **Step 3: Render the 4 × 4 selector**

In `index.html`, insert this section above typography controls:

```html
<div class="cover-editor-section" v-if="currentTemplateBackgrounds.length">
  <div class="cover-typo-section-title">背景 Background</div>
  <div class="cover-background-grid" role="radiogroup" aria-label="封面背景">
    <button
      v-for="background in currentTemplateBackgrounds"
      :key="background.id"
      type="button"
      class="cover-background-option"
      :class="{ active: coverBackgroundId === background.id }"
      :aria-checked="coverBackgroundId === background.id"
      :title="background.name"
      role="radio"
      @click="selectCoverBackground(background.id)"
    >
      <span class="cover-background-swatch" :style="{ background: background.preview }"></span>
      <span class="cover-background-name">{{ background.name }}</span>
    </button>
  </div>
</div>
```

- [x] **Step 4: Style the selector**

Add a four-column grid with 8px gaps. Each option is a compact accessible button with a 16:7 swatch, 10px Chinese label, visible hover/focus, and an accent outline for the active option. Do not add animations or dependencies.

### Task 4: Update counts and verify the complete UI

**Files:**
- Modify: `README.md`
- Modify: `assets/scripts/main.js`
- Verify: `assets/scripts/cover/export-png.js`

- [x] **Step 1: Update visible template counts**

Replace current `44 套` claims with `41 套`; mention the centered template's 16 selectable backgrounds in the cover feature copy without changing unrelated claims.

- [x] **Step 2: Run the full automated suite**

Run: `npm test`

Expected: all tests pass with zero failures.

- [x] **Step 3: Run browser interaction and export checks**

Using the real local app, select “居中布局”, assert 16 background radio buttons, cycle through all 16, verify the same title/tag/subtitle/author coordinates, exercise undo/redo/reset, and export all 16 backgrounds.

Expected: `BACKGROUND_OPTIONS_OK 16/16`, `UNDO_REDO_RESET_OK`, `LONG_LAYOUT_OK 16/16`, and 16 PNG files of `2400 × 1020`.

- [x] **Step 4: Validate SVG and repository scope**

Render all 16 backgrounds with long Chinese text, pipe each SVG through `xmllint --noout`, then run `git diff --check` and inspect `git status --short`.

Expected: `SVG_XML_OK 56/56`, no whitespace errors, and only the planned source/doc files modified.
