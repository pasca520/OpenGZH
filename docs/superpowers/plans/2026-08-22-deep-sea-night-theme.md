# Deep Sea Night Editor Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Ink & Jade application chrome with the confirmed Deep Sea Night theme while keeping WeChat article, cover, table-image, and Xiaohongshu output rendering unchanged.

**Architecture:** Reuse the existing semantic CSS variables in `base.css` as the single theme source and add only the missing `on-accent`/legacy aliases required by current controls. Update light-only shell declarations in the four component stylesheets, but do not add runtime theme state or touch output-theme variables. Lock the palette and accessible control contrast with one source-reading Vitest contract, then verify all three workspaces in a real browser.

**Tech Stack:** Static HTML, CSS custom properties, Vue 3 CDN, native ES modules, Vitest 3.

---

## File Map

- Create `assets/scripts/core/__tests__/app-theme.test.js`: application-theme token, contrast, and filled-control contract.
- Modify `assets/styles/base.css`: Deep Sea Night semantic tokens, dark shadows, shared shell surfaces, filled-control foregrounds, and focus contract.
- Modify `assets/styles/editor.css`: Markdown/editor chrome, preview chrome, picker/popover surfaces, and primary editor actions.
- Modify `assets/styles/panel.css`: theme/typography/settings dropdown surfaces and control states.
- Modify `assets/styles/cover.css`: cover workspace chrome, controls, cards, and overlays; SVG preview output remains untouched.
- Modify `assets/styles/xhs.css`: image-workspace chrome and controls only; `.xhs-card` output-theme rules remain untouched.
- Modify `index.html`: bump cache query versions for every changed stylesheet.

### Task 1: Lock and apply the global Deep Sea Night token contract

**Files:**
- Create: `assets/scripts/core/__tests__/app-theme.test.js`
- Modify: `assets/styles/base.css:12-87`
- Modify: `assets/styles/base.css:190-224`
- Modify: `assets/styles/base.css:540-557`
- Modify: `assets/styles/base.css:725-734`
- Modify: `assets/styles/base.css:809-852`

- [ ] **Step 1: Write the failing theme contract test**

Create `assets/scripts/core/__tests__/app-theme.test.js` with the complete contract below:

```js
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, 'utf8');
const baseCss = read('assets/styles/base.css');

function token(name) {
  const match = baseCss.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})\\s*;`));
  if (!match) throw new Error(`Missing hex token: ${name}`);
  return match[1].toUpperCase();
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16) / 255);
  const linear = channels.map((value) => value <= 0.03928
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function selectorBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  if (!match) throw new Error(`Missing selector: ${selector}`);
  return match[1];
}

describe('Deep Sea Night application theme', () => {
  it('locks the approved semantic palette', () => {
    expect({
      base: token('--color-surface-base'),
      muted: token('--color-surface-muted'),
      raised: token('--color-surface-raised'),
      border: token('--color-border-default'),
      text: token('--color-text-primary'),
      secondary: token('--color-text-secondary'),
      tertiary: token('--color-text-tertiary'),
      accent: token('--color-accent'),
      onAccent: token('--color-on-accent'),
    }).toEqual({
      base: '#0D1420',
      muted: '#111927',
      raised: '#151E2C',
      border: '#29364B',
      text: '#EDF3FF',
      secondary: '#B7C3D7',
      tertiary: '#91A0B7',
      accent: '#7895FF',
      onAccent: '#09111F',
    });
  });

  it('keeps normal text and filled actions at WCAG AA contrast', () => {
    expect(contrast(token('--color-text-primary'), token('--color-surface-raised'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--color-text-tertiary'), token('--color-surface-raised'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--color-accent'), token('--color-surface-base'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--color-on-accent'), token('--color-accent'))).toBeGreaterThanOrEqual(4.5);
  });

  it('uses the on-accent token for shared filled actions', () => {
    for (const selector of ['.header-tab.active', '.sidebar-action-btn.primary', '.toast-success', '.modal-btn-primary']) {
      expect(selectorBlock(baseCss, selector)).toMatch(/color:\s*var\(--color-on-accent\)/);
    }
  });
});
```

- [ ] **Step 2: Run the targeted test and verify it fails for the old palette**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/app-theme.test.js
```

Expected: FAIL because `--color-on-accent` is missing and the old Ink & Jade values do not match.

- [ ] **Step 3: Replace the color and shadow tokens with the minimal approved palette**

Replace only the color/shadow portion of `:root` in `assets/styles/base.css`; leave typography, spacing, radii, motion, layout, fonts, and preview widths unchanged:

```css
  /* ── Colors (Deep Sea Night) ── */
  --color-text-primary: #EDF3FF;
  --color-text-secondary: #B7C3D7;
  --color-text-tertiary: #91A0B7;
  --color-text-inverse: #09111F;
  --color-on-accent: #09111F;
  --color-surface-base: #0D1420;
  --color-surface-muted: #111927;
  --color-surface-raised: #151E2C;
  --color-surface-strong: #26365E;
  --color-border-default: #29364B;
  --color-border-strong: #3A4962;

  /* Legacy aliases retained for current stylesheets */
  --color-primary: #EDF3FF;
  --color-secondary: #B7C3D7;
  --color-tertiary: #91A0B7;
  --color-text: #EDF3FF;
  --color-accent: #7895FF;
  --color-accent-hover: #8AA4FF;
  --color-accent-light: rgba(120, 149, 255, 0.16);
  --color-bg: #0D1420;
  --color-bg-secondary: #111927;
  --color-surface: #151E2C;
  --color-border: #29364B;
  --color-border-light: #29364B;
  --color-light-border: #29364B;

  /* ── Shadows (dark, neutral) ── */
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.24);
  --shadow-2: 0 2px 8px rgba(0, 0, 0, 0.30);
  --shadow-3: 0 4px 16px rgba(0, 0, 0, 0.36);
  --shadow-4: 0 8px 28px rgba(0, 0, 0, 0.42);
  --shadow-jade: 0 1px 3px rgba(120, 149, 255, 0.32);
  --shadow-inset: rgba(255,255,255,0.08) 0px 0.5px 0px 0px inset, rgba(0,0,0,0.32) 0px 0px 0px 0.5px inset, rgba(0,0,0,0.24) 0px 1px 2px 0px;
  --shadow-sm: var(--shadow-1);
  --shadow-md: var(--shadow-2);
  --shadow-lg: var(--shadow-3);
```

- [ ] **Step 4: Give shared filled actions the accessible foreground and focus ring**

Change the existing filled-action declarations instead of adding a new component layer:

```css
.header-tab.active {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.sidebar-action-btn.primary {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.toast-success {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.modal-btn-primary {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

button:focus-visible,
a:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
```

Keep each selector's existing background, layout, radius, and hover behavior; replace its local `color: white/#fff` declaration with `var(--color-on-accent)` so the grouped contract is true without duplicated overrides.

- [ ] **Step 5: Run the targeted test and verify it passes**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/app-theme.test.js
```

Expected: 3 tests PASS.

- [ ] **Step 6: Commit the base theme contract**

```bash
git add assets/styles/base.css assets/scripts/core/__tests__/app-theme.test.js
git commit -m "style: add deep sea night base theme"
```

### Task 2: Apply the theme to editor, panels, cover, and image-workspace chrome

**Files:**
- Modify: `assets/styles/editor.css:1-1165`
- Modify: `assets/styles/panel.css:1-990`
- Modify: `assets/styles/cover.css:1-970`
- Modify: `assets/styles/xhs.css:803-1490`
- Test: `assets/scripts/core/__tests__/app-theme.test.js`

- [ ] **Step 1: Extend the contract to every filled application action**

Append this test inside the existing `describe` block in `app-theme.test.js`:

```js
  it('uses the on-accent token for workspace filled actions', () => {
    const contracts = [
      ['assets/styles/editor.css', ['.copy-btn', '.cover-header-export-btn']],
      ['assets/styles/panel.css', ['.theme-card-badge']],
      ['assets/styles/cover.css', ['.cover-export-btn', '.cover-illust-cat-btn.active']],
      ['assets/styles/xhs.css', ['.xhs-download-btn']],
    ];

    for (const [path, selectors] of contracts) {
      const css = read(path);
      for (const selector of selectors) {
        expect(selectorBlock(css, selector)).toMatch(/color:\s*var\(--color-on-accent\)/);
      }
    }
  });
```

- [ ] **Step 2: Run the test and verify the old white foregrounds fail**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/app-theme.test.js
```

Expected: FAIL on the first workspace selector that still uses `white` or `#fff`.

- [ ] **Step 3: Convert editor and preview chrome without touching rendered article themes**

In `assets/styles/editor.css`:

```css
.copy-btn {
  color: var(--color-on-accent);
}

.cover-header-export-btn {
  color: var(--color-on-accent);
}

.editor-toolbar,
.preview-toolbar,
.preview-picker-dropdown,
.export-dropdown,
.device-model-dropdown,
.selection-card-popover {
  background: var(--color-surface-raised);
  border-color: var(--color-border-default);
  color: var(--color-text-primary);
}

.markdown-input,
.preview-content {
  background: var(--color-surface-muted);
  color: var(--color-text-primary);
}
```

Apply these values in the selectors' existing declarations, not as a duplicate override at the end of the file. Preserve `.preview-container`, `.dark-preview`, native dark article themes, code-theme previews, and the existing content filter logic exactly.

- [ ] **Step 4: Replace light-only panel gradients and inset highlights**

In `assets/styles/panel.css`, update the existing declarations to the following variable-backed surfaces:

```css
.theme-card-badge { color: var(--color-on-accent); }

.segmented-option-btn {
  background: var(--color-surface-muted);
  box-shadow: var(--shadow-1);
}

.segmented-option-btn:hover {
  box-shadow: var(--shadow-2);
}

.segmented-option-btn.active {
  background: var(--color-surface-raised);
  box-shadow: 0 0 0 1px var(--color-accent-light);
}

.misc-shadow-preview {
  background: var(--color-surface-muted);
}

.toggle-switch::after {
  background: var(--color-text-primary);
}
```

Remove the corresponding white/beige gradients and white inset highlights; do not change code-theme preview colors because those previews represent selectable output styles.

- [ ] **Step 5: Convert cover-workspace controls while preserving cover artwork**

In `assets/styles/cover.css`:

```css
.cover-export-btn {
  color: var(--color-on-accent);
}

.cover-illust-cat-btn.active {
  color: var(--color-on-accent);
}

.cover-template-name,
.cover-template-actions,
.cover-inline-editor {
  background: color-mix(in srgb, var(--color-surface-raised) 94%, transparent);
}
```

Use these values in the current declarations. Do not edit SVG strings, template palettes, `coverPreviewStyle`, or `.cover-preview-frame svg` output rules.

- [ ] **Step 6: Convert only Xiaohongshu workspace controls**

In the UI section of `assets/styles/xhs.css` beginning at `图片模式工作区 UI（不进捕获节点）`, make the existing controls use the application variables:

```css
.xhs-download-btn { color: var(--color-on-accent); }
.xhs-view-switch { background: var(--color-surface-muted); }
.xhs-view-switch-btn.active,
.xhs-select,
.xhs-shell-edit,
.xhs-shell-download { background: var(--color-surface-raised); }
.xhs-settings-row-btn:hover { background: var(--color-accent-light); }
.xhs-issue { color: #FF9A9A; }
```

Do not modify any selector rooted at `.xhs-card`, the five `--xhs-*` theme token blocks, the hidden measurement stage, or capture/export dimensions.

- [ ] **Step 7: Run the targeted theme contract and existing style-sensitive tests**

Run:

```bash
npx vitest run \
  assets/scripts/core/__tests__/app-theme.test.js \
  assets/scripts/core/__tests__/theme-contrast.test.js \
  assets/scripts/xhs/__tests__/preview-workspace.test.js \
  assets/scripts/cover/__tests__/templates.test.js
```

Expected: all selected tests PASS; no existing output-theme assertion changes.

- [ ] **Step 8: Commit the workspace theme conversion**

```bash
git add assets/styles/editor.css assets/styles/panel.css assets/styles/cover.css assets/styles/xhs.css assets/scripts/core/__tests__/app-theme.test.js
git commit -m "style: apply deep sea night across editor workspaces"
```

### Task 3: Bust stylesheet caches and verify all user-visible paths

**Files:**
- Modify: `index.html:13-17,32`

- [ ] **Step 1: Bump only the changed stylesheet query versions**

Update the stylesheet links in `index.html`:

```html
<link rel="stylesheet" href="assets/styles/base.css?v=2">
<link rel="stylesheet" href="assets/styles/editor.css?v=16">
<link rel="stylesheet" href="assets/styles/panel.css?v=2">
<link rel="stylesheet" href="assets/styles/cover.css?v=2">
<link rel="stylesheet" href="assets/styles/xhs.css?v=7">
```

- [ ] **Step 2: Run the full automated verification**

Run:

```bash
npm test
git diff --check
```

Expected: the full Vitest suite passes and `git diff --check` prints no errors.

- [ ] **Step 3: Verify desktop browser states at 1440×900**

Serve the repository through the existing static workflow and inspect:

1. Header and all three mode tabs.
2. Text mode editor toolbar, Markdown input, theme picker, typography picker, device picker, selection-card popover, export dropdown, modal, and toast.
3. Cover template list, toolbar, content fields, illustration picker, inline editor, and export button.
4. Image mode toolbar, settings dropdown, cover editor, pagination controls, issue panel, and download actions.
5. Hover, active, disabled, and `:focus-visible` states for the primary controls.

Expected: all application chrome uses Deep Sea Night; no white/beige shell panel remains except an intentional output truth surface.

- [ ] **Step 4: Verify responsive and output-truth boundaries**

At 390px width, confirm no toolbar, focus ring, picker, or panel adds horizontal page overflow. Then compare before/after behavior for:

- a normal light article theme;
- a native dark article theme and the article dark-preview toggle;
- at least one cover template;
- all five Xiaohongshu output themes;
- copied WeChat HTML and one exported image.

Expected: application chrome changes only; rendered/exported content structure, inline styles, dimensions, and output palettes remain unchanged.

- [ ] **Step 5: Commit the cache versions and any verification-only correction**

```bash
git add index.html assets/styles/base.css assets/styles/editor.css assets/styles/panel.css assets/styles/cover.css assets/styles/xhs.css assets/scripts/core/__tests__/app-theme.test.js
git commit -m "chore: refresh deep sea night stylesheet caches"
```

If browser verification required no correction, stage and commit only `index.html`.
