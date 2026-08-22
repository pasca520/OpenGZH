# Inkstone Coral Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the OpenGZH application shell's Deep Sea Night palette with the approved warm Inkstone Coral palette while preserving all article, cover, XHS card, and export colors.

**Architecture:** Keep the existing CSS-variable theme contract and change only the semantic tokens in `base.css`. Workspace styles already consume these variables and contain no Deep Sea Night palette literals, so no runtime theme layer or workspace-specific recoloring is needed. Lock the new palette and contrast rules in the existing Vitest contract, then refresh only the changed stylesheet's cache key.

**Tech Stack:** CSS custom properties, static HTML, Vitest, agent-browser

---

## File Map

- Modify `assets/scripts/core/__tests__/app-theme.test.js`: rename the theme contract and replace the expected palette.
- Modify `assets/styles/base.css`: replace the semantic tokens, accent transparency, and accent shadow.
- Modify `index.html`: increment only the `base.css` query version.
- Do not modify `editor.css`, `panel.css`, `cover.css`, or `xhs.css`: a repository search confirms they contain no Deep Sea Night palette literals and already consume the shared tokens.

### Task 1: Lock the Inkstone Coral palette with a failing test

**Files:**
- Modify: `assets/scripts/core/__tests__/app-theme.test.js:38-61`
- Test: `assets/scripts/core/__tests__/app-theme.test.js`

- [ ] **Step 1: Replace the approved palette expectation**

Change the suite name and expected object to:

```js
describe('Inkstone Coral application theme', () => {
  it('locks the approved semantic palette', () => {
    expect({
      base: token('--color-surface-base'),
      muted: token('--color-surface-muted'),
      raised: token('--color-surface-raised'),
      border: token('--color-border-default'),
      text: token('--color-text-primary'),
      inverse: token('--color-text-inverse'),
      secondary: token('--color-text-secondary'),
      tertiary: token('--color-text-tertiary'),
      accent: token('--color-accent'),
      onAccent: token('--color-on-accent'),
    }).toEqual({
      base: '#181512',
      muted: '#211D19',
      raised: '#29231E',
      border: '#4A3D35',
      text: '#FFF7ED',
      inverse: '#FFF7ED',
      secondary: '#D7C7B8',
      tertiary: '#B9A494',
      accent: '#FF8A76',
      onAccent: '#26120F',
    });
  });
```

Keep the existing contrast and filled-action tests unchanged; they validate the new values through the same token API.

- [ ] **Step 2: Run the targeted test and verify RED**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/app-theme.test.js
```

Expected: one palette test fails because `base.css` still returns the Deep Sea Night values; the remaining contract tests pass.

### Task 2: Apply the semantic palette

**Files:**
- Modify: `assets/styles/base.css:12-39,74-82`
- Test: `assets/scripts/core/__tests__/app-theme.test.js`

- [ ] **Step 1: Replace the root color tokens**

Use this token block:

```css
  /* ── Colors (Inkstone Coral) ── */
  --color-text-primary: #FFF7ED;
  --color-text-secondary: #D7C7B8;
  --color-text-tertiary: #B9A494;
  --color-text-inverse: #FFF7ED;
  --color-on-accent: #26120F;
  --color-surface-base: #181512;
  --color-surface-muted: #211D19;
  --color-surface-raised: #29231E;
  --color-surface-strong: #3A2E28;
  --color-border-default: #4A3D35;
  --color-border-strong: #655246;

  /* Legacy aliases retained for current stylesheets */
  --color-primary: #FFF7ED;
  --color-secondary: #D7C7B8;
  --color-tertiary: #B9A494;
  --color-text: #FFF7ED;
  --color-accent: #FF8A76;
  --color-accent-hover: #FF9B89;
  --color-accent-light: rgba(255, 138, 118, 0.16);
  --color-bg: #181512;
  --color-bg-secondary: #211D19;
  --color-surface: #29231E;
  --color-border: #4A3D35;
  --color-border-light: #4A3D35;
  --color-light-border: #4A3D35;
```

- [ ] **Step 2: Warm the accent shadow without changing elevation geometry**

Replace only the accent-colored shadow:

```css
  --shadow-jade: 0 1px 3px rgba(255, 138, 118, 0.32);
```

Keep the legacy variable name because workspace components already reference it and renaming adds no user value.

- [ ] **Step 3: Run the targeted test and verify GREEN**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/app-theme.test.js
```

Expected: `1` test file and `4` tests pass with no warnings.

- [ ] **Step 4: Confirm no old palette literal remains in application styles**

Run:

```bash
rg -n '#(?:0D1420|111927|151E2C|26365E|29364B|3A4962|EDF3FF|B7C3D7|91A0B7|7895FF|8AA4FF|09111F)|rgba\\(120,\\s*149,\\s*255' assets/styles assets/scripts/core/__tests__/app-theme.test.js
```

Expected: no matches.

- [ ] **Step 5: Commit the tested theme replacement**

```bash
git add assets/styles/base.css assets/scripts/core/__tests__/app-theme.test.js
git commit -m "style: switch editor to inkstone coral theme"
```

### Task 3: Refresh cache and verify the complete editor

**Files:**
- Modify: `index.html:12`
- Test: full repository and browser UI

- [ ] **Step 1: Increment only the changed stylesheet version**

Change:

```html
<link rel="stylesheet" href="assets/styles/base.css?v=2">
```

to:

```html
<link rel="stylesheet" href="assets/styles/base.css?v=3">
```

- [ ] **Step 2: Run the full automated suite**

Run:

```bash
npm test
git diff --check
```

Expected: all Vitest files and tests pass; `git diff --check` prints nothing and exits `0`.

- [ ] **Step 3: Verify the three workspaces in a real browser**

Serve the repository locally, open it at `1440x900`, and inspect 封面图、文本、图片. Confirm:

- application shell and controls use warm charcoal surfaces and coral active/focus states;
- article paper, cover SVG, and XHS cards retain their own colors;
- keyboard focus remains visible;
- browser console and page-error logs are empty.

Repeat a theme-readability spot check at `390x844`; do not expand scope into existing responsive-layout changes.

- [ ] **Step 4: Commit the cache version**

```bash
git add index.html
git commit -m "chore: refresh inkstone coral theme cache"
```

- [ ] **Step 5: Confirm final repository state**

Run:

```bash
git status --short --branch
git log --oneline --decorate -5
```

Expected: current branch is `main`, the worktree is clean, and the design, theme, and cache commits are visible. Do not push unless separately requested.
