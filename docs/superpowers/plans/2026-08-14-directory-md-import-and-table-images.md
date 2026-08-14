# Directory-first Markdown Import and Table Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import a Markdown article and its local images from one authorized directory, request a supplemental image directory only for unresolved assets, and copy theme-styled Markdown tables to WeChat as 2× PNG images without silent image loss.

**Architecture:** Extend the existing Markdown image resolver with two small file-source adapters: one traverses a granted `FileSystemDirectoryHandle`, and one reads a `webkitdirectory` file map. Keep UI orchestration in `main.js`. Add a dependency-free table renderer beside the clipboard exporter, then make clipboard export fail closed before writing when an image or table cannot be materialized.

**Tech Stack:** Vue 3 CDN, native ES modules, File System Access API, `webkitdirectory`, IndexedDB, SVG `foreignObject`, Canvas API, Clipboard API, Vitest.

---

## File map

- Modify `assets/scripts/core/markdown-image-resolver.js`: image syntax scanning, safe path normalization, directory/file-map sources, exact/unique fallback matching, IndexedDB rewrite.
- Modify `assets/scripts/core/__tests__/markdown-image-resolver.test.js`: resolver red/green coverage.
- Modify `assets/scripts/main.js`: directory-first selection, multi-MD choice, supplemental directory orchestration.
- Modify `index.html`: directory input and accessible Markdown-choice modal.
- Modify `assets/styles/base.css`: minimal select styling for the existing modal system.
- Create `assets/scripts/export/table-image-renderer.js`: native theme table to 2× PNG conversion.
- Create `assets/scripts/export/__tests__/table-image-renderer.test.js`: pure SVG/size/alt tests plus mocked rasterization.
- Modify `assets/scripts/export/clipboard-exporter.js`: mark Markdown tables, fail closed for images, rasterize marked tables, preserve plain text.
- Create `assets/scripts/export/__tests__/clipboard-exporter.test.js`: exported fail-closed helper tests without adding a DOM dependency.

### Task 1: Safe directory-backed Markdown image resolution

**Files:**
- Modify: `assets/scripts/core/markdown-image-resolver.js`
- Modify: `assets/scripts/core/__tests__/markdown-image-resolver.test.js`

- [ ] **Step 1: Replace the basename-only success test with failing exact-path tests**

Add tests that build nested mock directory handles and assert exact traversal, percent-decoding, Windows separator normalization, boundary rejection, and unique supplemental basename matching:

```js
it('resolves a nested path from the Markdown directory', async () => {
  const source = createDirectoryFileSource(makeTree({ images: { 'photo.png': makeMockFile('photo.png') } }));
  const result = await resolveLocalImages('![p](images/photo.png)', deps({ source }));
  expect(result.unmatched).toEqual([]);
  expect(result.resolvedMarkdown).toContain('img://img-test-1');
});

it('does not resolve outside the granted root', async () => {
  const source = createDirectoryFileSource(makeTree({ 'photo.png': makeMockFile('photo.png') }));
  const result = await resolveLocalImages('![p](../photo.png)', deps({ source }));
  expect(result.unmatched).toEqual([{ path: '../photo.png', reason: 'outside-root' }]);
});

it('reports duplicate supplemental basenames as a conflict', async () => {
  const source = createFileMapSource([
    { path: 'a/photo.png', file: makeMockFile('photo.png') },
    { path: 'b/photo.png', file: makeMockFile('photo.png') }
  ]);
  const result = await resolveLocalImages('![p](missing/photo.png)', deps({ source, allowBasenameFallback: true }));
  expect(result.conflicts[0].candidates).toEqual(['a/photo.png', 'b/photo.png']);
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/markdown-image-resolver.test.js
```

Expected: FAIL because `createDirectoryFileSource`, `createFileMapSource`, safe normalization, and conflicts do not exist.

- [ ] **Step 3: Implement the smallest shared file-source contract**

Export these functions and use them inside `resolveLocalImages`:

```js
export function normalizeLocalImagePath(path) {
  const decoded = decodeURIComponent(path.replace(/\\/g, '/'));
  if (/^(?:[a-zA-Z]:\/|\/|file:)/.test(decoded)) return null;
  const parts = [];
  for (const part of decoded.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (parts.length === 0) return null;
      parts.pop();
    } else {
      parts.push(part);
    }
  }
  return parts.join('/');
}

export function createFileMapSource(entries) {
  const files = new Map(entries.map(({ path, file }) => [normalizeLocalImagePath(path), file]));
  return {
    getFile: async (path) => files.get(path) || null,
    findByFilename: async (name) => [...files.entries()]
      .filter(([path]) => path.split('/').pop() === name)
      .map(([path, file]) => ({ path, file }))
  };
}
```

`createDirectoryFileSource` must walk exact path segments for `getFile`; only `findByFilename` recursively enumerates a supplemental directory. Reject non-image `File` objects before compression. Return `conflicts` separately from `unmatched`; never create an `img://` path until both compression and `saveImage` succeed.

- [ ] **Step 4: Extend syntax coverage without changing surrounding Markdown**

Update scanning/replacement for inline images with optional title, reference definitions, and HTML `<img src>` values. Each match records `path`, `alt`, `index`, and a replacement function or source range, so rewriting changes only the URL token. Keep remote/data/`img://` sources untouched.

- [ ] **Step 5: Run resolver tests**

Run:

```bash
npx vitest run assets/scripts/core/__tests__/markdown-image-resolver.test.js
```

Expected: all resolver tests PASS.

- [ ] **Step 6: Commit resolver work**

```bash
git add assets/scripts/core/markdown-image-resolver.js assets/scripts/core/__tests__/markdown-image-resolver.test.js
git commit -m "feat: resolve Markdown images from authorized directories"
```

### Task 2: Directory-first import UI and fallback orchestration

**Files:**
- Modify: `assets/scripts/main.js`
- Modify: `index.html`
- Modify: `assets/styles/base.css`

- [ ] **Step 1: Add directory import state and helpers in `main.js`**

Add a reactive chooser and keep pending candidates outside Vue reactivity:

```js
const markdownImportDialog = reactive({ show: false, names: [], selectedIndex: 0 });
let pendingMarkdownImports = [];

async function listRootMarkdownHandles(directoryHandle) {
  const candidates = [];
  for await (const [name, handle] of directoryHandle.entries()) {
    if (handle.kind === 'file' && /\.(?:md|markdown)$/i.test(name)) {
      candidates.push({ name, read: () => handle.getFile(), source: createDirectoryFileSource(directoryHandle) });
    }
  }
  return candidates.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}
```

For `webkitdirectory`, remove the common top-level folder from `webkitRelativePath`, find root-level Markdown files, and build one `createFileMapSource` from all entries.

- [ ] **Step 2: Implement one import path for directory handles and directory file lists**

`startMarkdownImport(directoryInput, supplementalInput)` uses `showDirectoryPicker({ mode: 'read' })` when available and clicks `directoryInput` otherwise. Zero Markdown files produces an error Toast; one imports immediately; multiple open the chooser. `confirmMarkdownImport()` imports the selected candidate.

The shared importer reads the Markdown, calls `resolveLocalImages` with its primary source, and only when `unmatched` or `conflicts` remain asks for a supplemental directory. It retries only unresolved Markdown paths with `allowBasenameFallback: true`, combines counts, creates the document once, and reports remaining paths.

- [ ] **Step 3: Replace the single-file control and add the chooser modal**

Use this button/input contract in `index.html`:

```html
<button class="copy-btn export-btn" @click="startMarkdownImport($refs.mdDirectoryUpload, $refs.mdSupplementalDirectoryUpload)">导入 MD</button>
<input ref="mdDirectoryUpload" type="file" webkitdirectory multiple @change="handleMarkdownDirectoryUpload" style="display:none">
<input ref="mdSupplementalDirectoryUpload" type="file" webkitdirectory multiple @change="handleSupplementalDirectoryUpload" @cancel="cancelSupplementalDirectoryUpload" style="display:none">
```

The existing modal classes wrap a labelled `<select v-model.number="markdownImportDialog.selectedIndex">`; cancel clears pending candidates, confirm imports the selected candidate, and Escape cancels. Add only select width/border/focus styles to `assets/styles/base.css`.

- [ ] **Step 4: Run the full test suite and manually smoke the two chooser branches**

Run:

```bash
npm test
```

Expected: all tests PASS. On localhost, selecting a folder with one MD imports immediately; a folder with two MD files shows the chooser.

- [ ] **Step 5: Commit import UI work**

```bash
git add assets/scripts/main.js index.html assets/styles/base.css
git commit -m "feat: import Markdown from its article directory"
```

### Task 3: Dependency-free 2× table image renderer

**Files:**
- Create: `assets/scripts/export/table-image-renderer.js`
- Create: `assets/scripts/export/__tests__/table-image-renderer.test.js`

- [ ] **Step 1: Write failing pure and mocked rasterization tests**

Cover logical width resolution, table alt summary, escaped SVG markup, 2× canvas dimensions, font waiting, cleanup after image decode failure, and null Canvas Blob rejection:

```js
it('uses 2x canvas dimensions', async () => {
  expect(getTableCanvasSize(750, 120)).toEqual({ width: 1500, height: 240 });
});

it('builds an accessible summary from headers and row count', () => {
  const table = {
    querySelectorAll(selector) {
      if (selector === 'th') return [{ textContent: '名称' }, { textContent: '状态' }];
      if (selector === 'tbody tr') return [{}, {}, {}];
      return [];
    }
  };
  expect(buildTableImageAlt(table)).toBe('表格：名称、状态，共 3 行');
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npx vitest run assets/scripts/export/__tests__/table-image-renderer.test.js
```

Expected: FAIL because the renderer module does not exist.

- [ ] **Step 3: Implement focused renderer exports**

The module exports:

```js
export const TABLE_IMAGE_SCALE = 2;
export const TABLE_LOGICAL_WIDTH_FALLBACK = 750;
export function getTableCanvasSize(width, height) {
  return { width: Math.ceil(width * TABLE_IMAGE_SCALE), height: Math.ceil(height * TABLE_IMAGE_SCALE) };
}
export function buildTableImageAlt(table) {
  const headers = Array.from(table.querySelectorAll('th'))
    .map((cell) => (cell.textContent || '').trim()).filter(Boolean);
  const rows = table.querySelectorAll('tbody tr').length;
  return `表格${headers.length ? `：${headers.join('、')}` : ''}，共 ${rows} 行`;
}
export function buildTableSvgMarkup(xhtml, width, height, background) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:${background};">${xhtml}</div></foreignObject></svg>`;
}
export async function renderTableToPng(table, options = {}) {
  const runtime = resolveTableRuntime(options);
  await runtime.fontsReady;
  const capture = runtime.mount(table);
  const size = getTableCanvasSize(capture.width, capture.height);
  const svg = buildTableSvgMarkup(capture.xhtml, capture.width, capture.height, runtime.background);
  try {
    return await runtime.rasterize(svg, size);
  } finally {
    capture.cleanup();
  }
}
```

Use `--preview-width-tablet` when it parses to a positive number, otherwise 750. Clone the table into a fixed offscreen wrapper, force only capture geometry (`margin:0`, `width:100%`, `table-layout:fixed`), wait for fonts, rasterize through an SVG Blob URL, and release the wrapper/Object URL in `finally`. Throw descriptive errors instead of returning an empty image.

- [ ] **Step 4: Run renderer tests**

Run:

```bash
npx vitest run assets/scripts/export/__tests__/table-image-renderer.test.js
```

Expected: all renderer tests PASS.

- [ ] **Step 5: Commit renderer work**

```bash
git add assets/scripts/export/table-image-renderer.js assets/scripts/export/__tests__/table-image-renderer.test.js
git commit -m "feat: render themed tables as retina PNGs"
```

### Task 4: Fail-closed WeChat copy integration

**Files:**
- Modify: `assets/scripts/export/clipboard-exporter.js`
- Create: `assets/scripts/export/__tests__/clipboard-exporter.test.js`

- [ ] **Step 1: Write failing helper tests for image failure and table replacement**

Extract and test a small helper that returns structured counts and failures instead of swallowing errors:

```js
it('reports failed images without claiming success', async () => {
  const image = { getAttribute: (name) => name === 'src' ? 'missing.png' : null };
  const result = await materializeClipboardImages([image], {
    isGif: async () => false,
    convert: async () => { throw new Error('missing'); }
  });
  expect(result.failures).toHaveLength(1);
  expect(result.successCount).toBe(0);
});
```

Test `replaceMarkdownTablesWithImages` with injected `renderTableToPng` and `blobToDataURL` functions so no DOM package is required.

- [ ] **Step 2: Run focused tests and verify failure**

Run:

```bash
npx vitest run assets/scripts/export/__tests__/clipboard-exporter.test.js
```

Expected: FAIL because the structured helpers are not exported.

- [ ] **Step 3: Integrate table marking and fail-closed materialization**

Before `convertGridToTable`, mark existing Markdown tables with `data-markdown-table="true"`; image-grid tables created later remain unmarked. Convert existing images to Data URLs. If any image fails, show `图片处理失败：N 张，请修复后重试`, return `false`, and never call `navigator.clipboard.write`.

After math/code/list normalization, build `text/plain` while table text still exists. For each marked table, call `renderTableToPng`, convert the returned PNG Blob to a Data URL, and replace it with:

```html
<img src="data:image/png;base64,iVBORw0KGgo=" alt="表格：列名，共 3 行" style="display:block;width:100%;height:auto;margin:16px auto;">
```

Any table failure shows its one-based table number, returns `false`, and leaves the live preview unchanged. Only after all transformations succeed should the exporter write HTML/plain clipboard types and show `复制成功`.

- [ ] **Step 4: Run clipboard tests and the full suite**

Run:

```bash
npx vitest run assets/scripts/export/__tests__/clipboard-exporter.test.js
npm test
git diff --check
```

Expected: all tests PASS and `git diff --check` has no output.

- [ ] **Step 5: Commit clipboard integration**

```bash
git add assets/scripts/export/clipboard-exporter.js assets/scripts/export/__tests__/clipboard-exporter.test.js
git commit -m "feat: copy tables as images without silent asset loss"
```

### Task 5: Browser and WeChat acceptance

**Files:**
- Modify only if a verified defect is found in files already listed above.

- [ ] **Step 1: Start the static app and import fixtures**

Run:

```bash
./start.sh
```

Verify one-MD, multi-MD, sibling image, nested image, percent-encoded filename, missing image, and duplicate supplemental basename cases. Expected: automatic exact imports need one directory selection; missing/ambiguous assets are visible and block copy.

- [ ] **Step 2: Verify theme table images in browser**

Use a Markdown fixture containing a normal table, a wide table, Chinese long text, and an image inside one cell. Check a light theme, a dark native theme, and a theme with distinctive table borders. Expected: preview stays HTML; copied HTML contains one 2× PNG per Markdown table and does not rasterize image grids.

- [ ] **Step 3: Paste into the live WeChat editor**

Expected: all non-GIF images appear, table PNGs are sharp and match the selected article theme, and no final success message appears after a forced missing-image or Canvas failure. If live WeChat access is unavailable, record that exact gap and do not claim platform acceptance.

- [ ] **Step 4: Final verification**

Run:

```bash
npm test
git diff --check
git status --short
```

Expected: tests PASS, no whitespace errors, and the worktree contains only intentional implementation changes or is clean after commits.
