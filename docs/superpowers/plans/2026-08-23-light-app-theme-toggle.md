# Light App Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make A「纸墨暖白」the default OpenGZH application theme, retain the current dark「墨岩珊瑚」theme, and provide a persistent header toggle without changing content or export colors.

**Architecture:** Define light tokens in `:root` and dark overrides in `:root[data-app-theme="dark"]`. A focused ES module owns normalization, storage, root-attribute application, and toggling; a tiny synchronous head script restores saved dark mode before CSS paints. Vue only exposes the current app theme and header action, while the existing article-preview dark mode remains independent.

**Tech Stack:** CSS custom properties, Vue 3 CDN, native ES Modules, localStorage, Vitest, agent-browser

---

## File Map

- Create `assets/scripts/ui/app-theme.js`: pure, testable application-theme state helpers.
- Create `assets/scripts/ui/__tests__/app-theme.test.js`: normalization, read/write failure, root application, persistence, and toggle tests.
- Modify `assets/scripts/core/__tests__/app-theme.test.js`: light/dark CSS palettes, contrast, bootstrap order, and UI contract.
- Modify `assets/styles/base.css`: light default tokens, dark override tokens, semantic danger/warning tokens, shadows, and header toggle styling.
- Modify `assets/styles/xhs.css`: replace app-shell warning/error text literals with semantic tokens; do not touch `.xhs-card` theme definitions.
- Modify `assets/scripts/main.js`: import helpers, initialize from the early root attribute, switch and persist.
- Modify `index.html`: early bootstrap, header button, clarified article-preview labels, and cache versions.

### Task 1: Build the testable application-theme state module

**Files:**
- Create: `assets/scripts/ui/app-theme.js`
- Create: `assets/scripts/ui/__tests__/app-theme.test.js`

- [ ] **Step 1: Write the state behavior tests**

Create the test file with these cases:

```js
import { describe, expect, it, vi } from 'vitest';
import {
  APP_THEME_STORAGE_KEY,
  DEFAULT_APP_THEME,
  applyAppTheme,
  normalizeAppTheme,
  readStoredAppTheme,
  toggleAppTheme,
} from '../app-theme.js';

describe('application theme state', () => {
  it('defaults missing or invalid values to light', () => {
    expect(DEFAULT_APP_THEME).toBe('light');
    expect(normalizeAppTheme(null)).toBe('light');
    expect(normalizeAppTheme('system')).toBe('light');
    expect(normalizeAppTheme('light')).toBe('light');
    expect(normalizeAppTheme('dark')).toBe('dark');
  });

  it('reads a stored dark choice and survives unavailable storage', () => {
    expect(readStoredAppTheme({ getItem: () => 'dark' })).toBe('dark');
    expect(readStoredAppTheme({ getItem: () => 'invalid' })).toBe('light');
    expect(readStoredAppTheme({ getItem: () => { throw new Error('blocked'); } })).toBe('light');
  });

  it('applies and persists a normalized theme', () => {
    const root = { dataset: {} };
    const storage = { setItem: vi.fn() };
    expect(applyAppTheme('dark', { root, storage })).toBe('dark');
    expect(root.dataset.appTheme).toBe('dark');
    expect(storage.setItem).toHaveBeenCalledWith(APP_THEME_STORAGE_KEY, 'dark');
  });

  it('keeps the visual switch when persistence fails', () => {
    const root = { dataset: {} };
    const storage = { setItem: () => { throw new Error('blocked'); } };
    expect(applyAppTheme('dark', { root, storage })).toBe('dark');
    expect(root.dataset.appTheme).toBe('dark');
  });

  it('toggles between the two supported themes', () => {
    expect(toggleAppTheme('light')).toBe('dark');
    expect(toggleAppTheme('dark')).toBe('light');
    expect(toggleAppTheme('invalid')).toBe('dark');
  });
});
```

- [ ] **Step 2: Run the test and verify the missing module is detected**

Run:

```bash
npx vitest run assets/scripts/ui/__tests__/app-theme.test.js
```

Expected: FAIL because `../app-theme.js` does not exist.

- [ ] **Step 3: Add the exported API skeleton and verify assertion RED**

Create `app-theme.js` with the correct exports but deliberately minimal light-only behavior:

```js
export const APP_THEME_STORAGE_KEY = 'opengzh-app-theme';
export const DEFAULT_APP_THEME = 'light';
export const normalizeAppTheme = () => DEFAULT_APP_THEME;
export const readStoredAppTheme = () => DEFAULT_APP_THEME;
export const applyAppTheme = () => DEFAULT_APP_THEME;
export const toggleAppTheme = () => DEFAULT_APP_THEME;
```

Run the targeted test again. Expected: assertion failures for stored dark, applying dark, and toggling light.

- [ ] **Step 4: Implement the minimal state helpers**

Replace the skeleton with:

```js
export const APP_THEME_STORAGE_KEY = 'opengzh-app-theme';
export const DEFAULT_APP_THEME = 'light';

export function normalizeAppTheme(value) {
  return value === 'dark' ? 'dark' : DEFAULT_APP_THEME;
}

export function readStoredAppTheme(storage = globalThis.localStorage) {
  try {
    return normalizeAppTheme(storage?.getItem(APP_THEME_STORAGE_KEY));
  } catch (_error) {
    return DEFAULT_APP_THEME;
  }
}

export function applyAppTheme(
  value,
  { root = globalThis.document?.documentElement, storage = globalThis.localStorage, persist = true } = {},
) {
  const theme = normalizeAppTheme(value);
  if (root?.dataset) root.dataset.appTheme = theme;
  if (persist) {
    try {
      storage?.setItem(APP_THEME_STORAGE_KEY, theme);
    } catch (_error) {
      // Persistence is optional; the current page still keeps the selected theme.
    }
  }
  return theme;
}

export function toggleAppTheme(value) {
  return normalizeAppTheme(value) === 'dark' ? 'light' : 'dark';
}
```

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
npx vitest run assets/scripts/ui/__tests__/app-theme.test.js
node --check assets/scripts/ui/app-theme.js
```

Expected: `1` file and `5` tests pass; syntax check exits `0`.

Commit:

```bash
git add assets/scripts/ui/app-theme.js assets/scripts/ui/__tests__/app-theme.test.js
git commit -m "feat: add persistent app theme state"
```

### Task 2: Add light and dark CSS contracts

**Files:**
- Modify: `assets/scripts/core/__tests__/app-theme.test.js`
- Modify: `assets/styles/base.css`
- Modify: `assets/styles/xhs.css`

- [ ] **Step 1: Write the dual-palette failing tests**

Extend the existing contract so it reads tokens from a selector block, then assert:

```js
const lightPalette = {
  base: '#F7F1E8', muted: '#EFE6DB', raised: '#FFFDF8', border: '#D8C8B8',
  text: '#332821', inverse: '#FFF7ED', secondary: '#6F5E52', tertiary: '#766354',
  accent: '#B64B39', onAccent: '#FFF7ED', danger: '#B33D30', warning: '#8A5700',
};

const darkPalette = {
  base: '#181512', muted: '#211D19', raised: '#29231E', border: '#4A3D35',
  text: '#FFF7ED', inverse: '#FFF7ED', secondary: '#D7C7B8', tertiary: '#B9A494',
  accent: '#FF8A76', onAccent: '#26120F', danger: '#FF9A9A', warning: '#FBBF70',
};
```

Assert the light object comes from `:root`, the dark object from `:root[data-app-theme="dark"]`, and both palettes pass the existing text/accent contrast checks. Assert `base.css` and the application-shell section of `xhs.css` use `var(--color-danger)` / `var(--color-warning)` instead of `#FF9A9A` / `#FBBF70`.

- [ ] **Step 2: Run the CSS contract and verify RED**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/app-theme.test.js
```

Expected: FAIL because `:root` is still dark, the dark override block is missing, and semantic state tokens are missing.

- [ ] **Step 3: Make `:root` the light paper-ivory palette**

Use the approved light values, including:

```css
  color-scheme: light;
  --color-text-primary: #332821;
  --color-text-secondary: #6F5E52;
  --color-text-tertiary: #766354;
  --color-text-inverse: #FFF7ED;
  --color-on-accent: #FFF7ED;
  --color-surface-base: #F7F1E8;
  --color-surface-muted: #EFE6DB;
  --color-surface-raised: #FFFDF8;
  --color-surface-strong: #E7D8CA;
  --color-border-default: #D8C8B8;
  --color-border-strong: #BDA896;
  --color-accent: #B64B39;
  --color-accent-hover: #A94333;
  --color-accent-light: rgba(182, 75, 57, 0.12);
  --color-danger: #B33D30;
  --color-warning: #8A5700;
```

Point all legacy aliases at the same light values and use warm, low-opacity light-theme shadows.

- [ ] **Step 4: Add the complete dark override**

After the root token block, add `:root[data-app-theme="dark"]` restoring the current Inkstone Coral colors, aliases, dark shadows, `color-scheme: dark`, `--color-danger: #FF9A9A`, and `--color-warning: #FBBF70`.

- [ ] **Step 5: Replace only app-shell semantic text literals**

In `base.css`, replace sidebar/status `#FF9A9A` text with `var(--color-danger)`. In the UI portion of `xhs.css`, replace warning `#FBBF70` with `var(--color-warning)` and error/clear-action `#FF9A9A` with `var(--color-danger)`. Leave `.xhs-card` theme definitions and danger-fill backgrounds unchanged.

- [ ] **Step 6: Verify GREEN and commit**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/app-theme.test.js
```

Expected: all application-theme contract tests pass.

Commit:

```bash
git add assets/styles/base.css assets/styles/xhs.css assets/scripts/core/__tests__/app-theme.test.js
git commit -m "style: add paper ivory light theme"
```

### Task 3: Wire the header toggle, bootstrap, and independent preview labels

**Files:**
- Modify: `assets/scripts/core/__tests__/app-theme.test.js`
- Modify: `assets/scripts/main.js`
- Modify: `index.html`
- Modify: `assets/styles/base.css`

- [ ] **Step 1: Add failing HTML and runtime contracts**

Assert that:

- `opengzh-app-theme` appears before the first application stylesheet in `index.html`;
- the head script assigns `document.documentElement.dataset.appTheme` and defaults to light;
- `.header-right` contains `.app-theme-toggle` with dynamic `title` and `aria-label` mentioning “界面”;
- the preview toggle labels contain “文章预览”;
- `main.js` imports `applyAppTheme`, `normalizeAppTheme`, and `toggleAppTheme`, initializes from `document.documentElement.dataset.appTheme`, and exposes `appTheme` / `switchAppTheme`.

Run the targeted contract. Expected: FAIL because none of the UI wiring exists.

- [ ] **Step 2: Add the pre-CSS bootstrap**

Before the first application stylesheet in `index.html`, add:

```html
<script>
  (() => {
    // ponytail: synchronous two-state bootstrap prevents a saved dark theme from flashing light.
    // If app themes grow beyond light/dark, replace this with a shared blocking bootstrap file.
    let theme = 'light';
    try {
      theme = localStorage.getItem('opengzh-app-theme') === 'dark' ? 'dark' : 'light';
    } catch (_error) {
      // Storage can be unavailable; light remains the product default.
    }
    document.documentElement.dataset.appTheme = theme;
  })();
</script>
```

- [ ] **Step 3: Add Vue theme state and switching**

Import the three helpers, then add:

```js
const appTheme = ref(normalizeAppTheme(document.documentElement.dataset.appTheme));

function switchAppTheme() {
  appTheme.value = applyAppTheme(toggleAppTheme(appTheme.value));
}
```

Expose `appTheme` and `switchAppTheme` from `setup()`.

- [ ] **Step 4: Add the header control and clarify preview labels**

Place one icon button in `.header-right`. In light mode it shows a moon and says “切换到深色界面”; in dark mode it shows a sun and says “切换到浅色界面”. Bind both `title` and `aria-label` to that action.

Change the existing preview button title and aria-label to “文章预览切换到深色/浅色”; do not connect it to `appTheme`.

- [ ] **Step 5: Style the header control**

Add `.app-theme-toggle` styles in `base.css` using existing header dimensions, semantic surfaces, borders, hover accent, and the shared focus-visible rule. Do not add layout or typography changes.

- [ ] **Step 6: Verify targeted contracts and commit**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/app-theme.test.js assets/scripts/ui/__tests__/app-theme.test.js
node --check assets/scripts/main.js
```

Expected: both test files pass and syntax check exits `0`.

Commit:

```bash
git add index.html assets/scripts/main.js assets/styles/base.css assets/scripts/core/__tests__/app-theme.test.js
git commit -m "feat: add app theme toggle"
```

### Task 4: Refresh caches and verify both themes end to end

**Files:**
- Modify: `index.html`
- Test: full repository and real browser

- [ ] **Step 1: Increment changed asset versions**

Update `base.css?v=3` to `v=4`, `xhs.css?v=7` to `v=8`, and `main.js?v=15` to `v=16`.

- [ ] **Step 2: Run fresh automated verification**

Run:

```bash
npm test
node --check assets/scripts/ui/app-theme.js
node --check assets/scripts/main.js
git diff --check
```

Expected: all tests pass, both JavaScript files parse, and diff check exits `0`.

- [ ] **Step 3: Verify first-load and persistence behavior**

In a real browser:

1. Remove `opengzh-app-theme`, reload, and confirm `html[data-app-theme="light"]`.
2. Toggle to dark, confirm the root attribute and stored value are `dark`, reload, and confirm dark remains.
3. Toggle back to light, reload, and confirm light remains.
4. Verify the app toggle and article-preview toggle change independent state.

- [ ] **Step 4: Verify visual boundaries**

At `1440×900` and `390×844`, inspect cover, text, and image workspaces in both themes. Check dropdowns, form controls, warnings/errors, keyboard focus, article paper, cover SVG, and XHS cards. Confirm content surfaces retain identical colors across app-theme switches and browser error/console logs are empty.

- [ ] **Step 5: Commit caches and confirm repository state**

```bash
git add index.html
git commit -m "chore: refresh app theme assets"
git status --short --branch
git log --oneline --decorate -7
```

Expected: current branch is `main`, worktree is clean, and the design, plan, state, style, UI, and cache commits are visible. Do not push unless separately requested.
