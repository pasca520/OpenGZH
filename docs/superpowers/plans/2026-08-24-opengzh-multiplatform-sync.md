# OpenGZH Multi-Platform Draft Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `OpenGZH` Chrome MV3 extension that snapshots the current OpenGZH article, saves image-complete drafts to WeChat Official Accounts, Zhihu, Juejin, and 人人都是产品经理, and opens successful draft editors without publishing or storing credentials.

**Architecture:** Keep OpenGZH a static Vue 3 CDN/native-ES-module application: the page exposes one fixed-event `DistributionPackage` bridge and reuses the existing WeChat export preparation path. A self-contained Shadow DOM content script validates the snapshot and streams one image at a time over a named `chrome.runtime.Port`; a module service worker verifies the extension's exact required host grants, executes four fail-closed adapters serially, and stores only sanitized task results in `chrome.storage.session`. Platform URLs, methods, headers, state transitions, retry rules, and tab-opening behavior remain fixed in extension code.

**Tech Stack:** Vue 3 CDN, native JavaScript ES modules, IndexedDB (`WechatEditorImages/images`), Chrome Manifest V3 (`storage`, exact required `host_permissions`, `declarativeNetRequestWithHostAccess`, module service worker), Fetch/FormData/Web Crypto, Vitest 3, Node.js build script, macOS `sips` and `/usr/bin/zip`.

---

## Scope and implementation rules

- Work in the current checkout; do not create a new build-runtime layer for the website.
- Use `gpt-5.6-luna` at `xhigh` reasoning for every implementation worker, as explicitly requested; plan review remains on `gpt-5.6-sol` at `xhigh`.
- Preserve all existing `localStorage` keys and the IndexedDB database/store names `WechatEditorImages/images`.
- Do not touch the unrelated `.claude/settings.json` change. Stage only paths named in each commit step.
- The website must remain fully usable when the extension is absent. The bridge is read-only and performs no network request.
- Wechatsync is behavioral research only. Do not import, vendor, copy, or dynamically load its runtime source.
- The platform APIs are private and can change. Each adapter increment must first compare its fixed request/response fixtures against an authenticated DevTools capture made on 2026-08-24 or later. A mismatch is a `PLATFORM_CHANGED` failure and blocks that adapter's live acceptance; it does not justify widening permissions or guessing parameters.
- No step publishes, submits for review, deletes a draft, opens a login page without an explicit click, stores a credential, or sends article data to an OpenGZH server.

## Technical correction to the approved specification

The approved design asked for per-platform `optional_host_permissions` requested on first use. Chrome's supported execution model makes the original Task 5 design invalid: content scripts do not expose `chrome.permissions`, while [`permissions.request()` must run inside the calling extension context's own user gesture](https://developer.chrome.com/docs/extensions/reference/api/permissions). Chrome does not document user activation surviving a content-script `runtime.Port` message into a service worker. Treating that relay as a grant gesture would therefore be browser-version-dependent and untestable as a release contract.

This plan makes one explicit technical correction: declare only the ten fixed platform patterns in required `host_permissions`, so the only grant action is the user's explicit acceptance of Chrome's install permission surface. The tradeoff is a larger install-time permission disclosure instead of per-platform first-use prompts; the gain is an executable MV3 architecture with no permission escalation message. It remains least-privilege by using no `<all_urls>`, `cookies`, runtime-discovered origin, or user-supplied URL. The selected-platform list still controls which adapters execute and is not treated as an authorization boundary.

Only the service worker may call `chrome.permissions.contains()`, solely to fail closed with `PERMISSION_DENIED` if Chrome, enterprise policy, or the user has withheld/revoked one of those required hosts. Neither the content script nor a message handler calls `permissions.request()`. Permission preflight accepts platform IDs only; the service worker validates them and derives their origins from an immutable map before checking grants. Restoring withheld host access is an explicit action in Chrome's extension details, after which “重新检测” retries the selected platform.

## Locked shared contracts

Use these names and values unchanged across all tasks:

```js
export const DISTRIBUTION_SCHEMA_VERSION = 1;
export const PORT_NAME = 'opengzh-distribution-v1';
export const PLATFORM_IDS = ['weixin', 'zhihu', 'juejin', 'woshipm'];
export const PAGE_EVENTS = {
  request: 'opengzh:distribution:request',
  ready: 'opengzh:distribution:ready',
  error: 'opengzh:distribution:error',
};
export const PLATFORM_STATES = [
  'idle', 'checking-auth', 'auth-required', 'uploading-images',
  'saving-draft', 'success', 'failed', 'unknown',
];
```

The immutable article snapshot has this runtime shape:

```js
{
  schemaVersion: 1,
  documentId: 'doc-123',
  title: '文章标题',
  markdown: '# 文章标题\n\n正文',
  portableMarkdown: '# 文章标题\n\n正文',
  semanticHtml: '<h1>文章标题</h1><p>正文</p>',
  wechatHtml: '<section><h1>文章标题</h1><p>正文</p></section>',
  images: [{
    ref: 'img://hero',
    kind: 'indexed-db',
    imageId: 'hero',
    mimeType: 'image/png',
    filename: 'hero.png',
    alt: '头图',
  }],
  createdAt: 1787529600000,
}
```

`DistributionImage.ref` is the exact source string appearing in the relevant content field. IndexedDB images use `img://<imageId>`; generated images use their exact `data:image/*` URL. Ordinary `blob:` URLs, unresolved relative paths, and non-target external images never cross the service-worker trust boundary.

## File map

### Website files

- Create `assets/scripts/distribution/article-package.js` — portable Markdown cleanup, semantic HTML cleanup, stable image references, image inventory, immutable package construction.
- Create `assets/scripts/distribution/extension-bridge.js` — fixed CustomEvent request/ready/error bridge and lifecycle cleanup.
- Create `assets/scripts/distribution/__tests__/article-package.test.js` — package, marker cleanup, semantics, and image inventory tests.
- Create `assets/scripts/distribution/__tests__/extension-bridge.test.js` — fixed event names and sanitized error behavior.
- Modify `assets/scripts/export/clipboard-exporter.js` — extract `prepareWechatContent()` while leaving `copyToWechat()` behavior intact.
- Modify `assets/scripts/export/__tests__/clipboard-exporter.test.js` — preparation/clipboard equivalence and deferred-image regression coverage.
- Modify `assets/scripts/main.js` — install the read-only package factory after current render/image-store initialization.
- Modify `index.html` — add only `data-opengzh-copy-button` to the existing copy button as the stable injection anchor.

### Extension runtime files

- Create `extension/manifest.json` — MV3 identity, minimum API permissions, exact required platform hosts, fixed content-script matches, module service worker.
- Create `extension/src/content/open-gzh.js` — one self-contained content script containing Shadow DOM UI, port protocol, and one-image-at-a-time IndexedDB reads; it never accesses `chrome.permissions`.
- Create `extension/src/background/service-worker.js` — origin/frame/schema validation, port message routing, session result storage, auth/retry entry points, and successful-draft tab opening.
- Create `extension/src/background/distribution-runner.js` — fixed serial order, platform state machine, image upload phase, partial success, and retry protections.
- Create `extension/src/core/adapter-contract.js` — platform metadata, adapter shape assertion, image-reference replacement, and per-platform content selection.
- Create `extension/src/core/article-validator.js` — strict package/message validation and per-selected-platform local/CDN image preflight.
- Create `extension/src/core/data-url.js` — strict image Data URL parsing to `Blob`.
- Create `extension/src/core/header-rules.js` — fixed DNR session rule IDs and `finally` cleanup.
- Create `extension/src/core/platform-errors.js` — exact error codes, safe serialization, remote response summaries, and credential redaction.
- Create `extension/src/core/request-runtime.js` — fixed-host fetch, credentials policy, per-image broker, and sanitized logger.
- Create `extension/src/core/md5.js` — dependency-free MD5 needed by Zhihu upload negotiation.
- Create `extension/src/core/aws4.js` — Web Crypto SigV4 needed by Juejin ImageX.
- Create `extension/src/core/crc32.js` — TOS body checksum needed by Juejin ImageX.
- Create `extension/src/adapters/weixin.js` — WeChat bootstrap/auth, material upload, draft creation, edit URL.
- Create `extension/src/adapters/zhihu.js` — auth, OSS image upload, empty-draft create, update-resume, edit URL.
- Create `extension/src/adapters/juejin.js` — auth/CSRF, ImageX upload, Markdown draft create, edit URL.
- Create `extension/src/adapters/woshipm.js` — writing-page auth/token, image upload, draft create, edit URL.
- Create `extension/assets/icon-16.png`, `extension/assets/icon-48.png`, `extension/assets/icon-128.png` — local OpenGZH icons generated from the repository logo.

### Tests, fixtures, build, and release files

- Create `extension/tests/manifest.test.js` — identity and forbidden-permission assertions.
- Create `extension/tests/article-validator.test.js` — schema/origin/image trust-boundary assertions.
- Create `extension/tests/content-script.test.js` — injection anchor, selected-platform persistence, absence of permission API calls, and one-at-a-time image replies.
- Create `extension/tests/platform-errors.test.js` — secret redaction and safe error summaries.
- Create `extension/tests/header-rules.test.js` — session-rule cleanup on success and throw.
- Create `extension/tests/distribution-runner.test.js` — serial execution, progress, partial failure, retry and unknown-state behavior.
- Create `extension/tests/service-worker.test.js` — sender validation, sanitized session storage, and tab activation.
- Create `extension/tests/core-crypto.test.js` — MD5, CRC32, and fixed-time SigV4 vectors.
- Create `extension/tests/adapters/weixin.test.js`, `zhihu.test.js`, `juejin.test.js`, `woshipm.test.js` — fixture-driven requests and mapped failures.
- Create `extension/tests/fixtures/weixin-home.html` and four sanitized JSON fixtures under `extension/tests/fixtures/` — deterministic response shapes with synthetic values only.
- Create `scripts/build-extension.mjs` — validate, clean the exact `dist/extension` target, copy runtime files, zip, and inspect the archive.
- Create `scripts/__tests__/build-extension.test.js` — build allowlist and archive metadata tests.
- Modify `vitest.config.js` — include website, extension, and build-script tests.
- Modify `package.json` — add `test:extension` and `build:extension`, without adding a dependency.
- Create `extension/REAL-BROWSER-ACCEPTANCE.md` — dated, account-safe acceptance record and captured evidence checklist.

## Working increment order

1. Article snapshot contract.
2. WeChat preparation extraction with clipboard regression protection.
3. Page bridge wired into the live editor.
4. MV3 security skeleton and core runtime.
5. Shadow DOM content UI and image streaming.
6. Serial task runner and service-worker lifecycle.
7. WeChat adapter.
8. Zhihu adapter.
9. Juejin adapter.
10. 人人都是产品经理 adapter.
11. Reproducible build/package.
12. Automated and real-browser acceptance.

### Task 1: Build the immutable article/export contract

**Files:**
- Create: `assets/scripts/distribution/article-package.js`
- Test: `assets/scripts/distribution/__tests__/article-package.test.js`

- [ ] **Step 1: Write failing contract tests**

```js
import { describe, expect, it, vi } from 'vitest';
import {
  buildDistributionPackage,
  toPortableMarkdown,
  toSemanticHtml,
} from '../article-package.js';

describe('toPortableMarkdown', () => {
  it('removes OpenGZH card wrappers and XHS page markers but keeps card content', () => {
    const source = '# 标题\n\n:::ogzh-card history-document\n卡片正文\n:::\n\n<!-- xhs-page -->\n下一页';
    expect(toPortableMarkdown(source)).toBe('# 标题\n\n卡片正文\n\n下一页');
  });

  it('preserves non-OpenGZH fenced directives', () => {
    expect(toPortableMarkdown(':::note\n正文\n:::')).toBe(':::note\n正文\n:::');
  });
});

describe('toSemanticHtml', () => {
  it('removes presentation attributes and restores IndexedDB image refs', () => {
    const html = '<section class="theme" style="color:red"><h2 id="h">标题</h2><img src="blob:test" data-image-id="hero" alt="头图"></section>';
    expect(toSemanticHtml(html)).toBe('<section><h2>标题</h2><img src="img://hero" alt="头图"></section>');
  });

  it('drops OpenGZH-only data attributes without dropping semantic table structure', () => {
    const html = '<table data-markdown-table="true" style="width:100%"><tbody><tr><th>A</th><td>B</td></tr></tbody></table>';
    expect(toSemanticHtml(html)).toBe('<table><tbody><tr><th>A</th><td>B</td></tr></tbody></table>');
  });

  it('unwraps an OpenGZH-only card container while preserving its semantic children', () => {
    expect(toSemanticHtml('<section data-ogzh-card="history-document"><h2>标题</h2><p>正文</p></section>'))
      .toBe('<h2>标题</h2><p>正文</p>');
  });
});

describe('buildDistributionPackage', () => {
  it('uses one timestamped immutable snapshot and inventories IDB/data images', async () => {
    const dataUrl = 'data:image/png;base64,cG5n';
    const imageStore = {
      getImageRecord: vi.fn(async (id) => ({
        id,
        blob: new Blob(['png'], { type: 'image/png' }),
        name: 'hero.png',
      })),
    };
    const prepareWechatContent = vi.fn(async () => ({
      html: `<p><img src="img://hero" alt="头图"><img src="${dataUrl}" alt="表格"></p>`,
      text: '正文',
      imageFailures: [],
    }));

    const result = await buildDistributionPackage({
      documentId: 'doc-1',
      title: '文章标题',
      markdown: `# 文章标题\n\n![头图](img://hero)\n\n<img src="${dataUrl}" alt="表格">`,
      renderedHtml: '<h1 style="color:red">文章标题</h1><img src="blob:hero" data-image-id="hero" alt="头图">',
      imageStore,
      prepareWechatContent,
      now: () => 1787529600000,
    });

    expect(result).toMatchObject({
      schemaVersion: 1,
      documentId: 'doc-1',
      title: '文章标题',
      createdAt: 1787529600000,
      semanticHtml: '<h1>文章标题</h1><img src="img://hero" alt="头图">',
    });
    expect(result.images).toEqual([
      { ref: 'img://hero', kind: 'indexed-db', imageId: 'hero', mimeType: 'image/png', filename: 'hero.png', alt: '头图' },
      { ref: dataUrl, kind: 'data-url', dataUrl, mimeType: 'image/png', filename: 'generated-2.png', alt: '表格' },
    ]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(prepareWechatContent).toHaveBeenCalledWith(expect.objectContaining({ imagePolicy: 'defer-local' }));
  });

  it('fails closed when WeChat preparation reports an unreadable image', async () => {
    await expect(buildDistributionPackage({
      documentId: 'doc-1',
      title: '标题',
      markdown: '正文',
      renderedHtml: '<p>正文</p>',
      imageStore: {},
      prepareWechatContent: async () => ({ html: '', text: '', imageFailures: ['blob:missing'] }),
    })).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
  });
});
```

- [ ] **Step 2: Run the new test and verify the module is absent**

Run: `npm test -- --run assets/scripts/distribution/__tests__/article-package.test.js`

Expected: FAIL with `Failed to load url ../article-package.js`.

- [ ] **Step 3: Implement portable Markdown, semantic HTML, and image inventory**

```js
// assets/scripts/distribution/article-package.js
export const DISTRIBUTION_SCHEMA_VERSION = 1;

const MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

export function toPortableMarkdown(markdown) {
  let insideCard = false;
  const lines = [];
  for (const line of String(markdown || '').split('\n')) {
    if (!insideCard && /^\s*:::\s*ogzh-card(?:\s+.*)?\s*$/i.test(line)) {
      insideCard = true;
      continue;
    }
    if (insideCard && /^\s*:::\s*$/.test(line)) {
      insideCard = false;
      continue;
    }
    lines.push(line);
  }
  return lines.join('\n')
    .replace(/^\s*<!--\s*xhs-page\s*-->\s*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeImageRefs(html) {
  return String(html || '').replace(/<img\b([^>]*)>/gi, (tag, attributes) => {
    const imageId = attributes.match(/\sdata-image-id=(['"])(.*?)\1/i)?.[2];
    let next = attributes;
    if (imageId) {
      if (/\ssrc=(['"])(.*?)\1/i.test(next)) {
        next = next.replace(/\ssrc=(['"])(.*?)\1/i, ` src="img://${imageId}"`);
      } else {
        next += ` src="img://${imageId}"`;
      }
    }
    return `<img${next}>`;
  });
}

export function toSemanticHtml(renderedHtml) {
  let html = normalizeImageRefs(renderedHtml);
  let previous;
  do {
    previous = html;
    html = html.replace(/<(div|section)\b[^>]*(?:data-ogzh-card|data-xhs-page)[^>]*>([\s\S]*?)<\/\1>/gi, '$2');
  } while (html !== previous);
  return html
    .replace(/\s(?:style|class|id)=(['"])[\s\S]*?\1/gi, '')
    .replace(/\sdata-[\w-]+=(['"])[\s\S]*?\1/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+>/g, '>')
    .trim();
}

function decodeDataMime(dataUrl) {
  return String(dataUrl).match(/^data:(image\/[a-z0-9.+-]+);base64,/i)?.[1]?.toLowerCase() || '';
}

function collectImageOccurrences(content) {
  const occurrences = [];
  const add = (ref, alt = '') => {
    if (!ref || occurrences.some((item) => item.ref === ref)) return;
    occurrences.push({ ref, alt: String(alt || '') });
  };
  for (const match of String(content || '').matchAll(/!\[([^\]]*)\]\((img:\/\/[^\s)]+|data:image\/[^\s)]+)\)/gi)) {
    add(match[2], match[1]);
  }
  for (const match of String(content || '').matchAll(/<img\b[^>]*\bsrc=(['"])(.*?)\1[^>]*>/gi)) {
    const alt = match[0].match(/\balt=(['"])(.*?)\1/i)?.[2] || '';
    add(match[2], alt);
  }
  return occurrences;
}

async function createImageRecord(occurrence, index, imageStore) {
  if (occurrence.ref.startsWith('img://')) {
    const imageId = occurrence.ref.slice('img://'.length);
    const stored = await imageStore.getImageRecord(imageId);
    if (!stored?.blob) {
      throw Object.assign(new Error(`图片不存在: ${imageId}`), { code: 'IMAGE_READ_FAILED' });
    }
    const mimeType = stored.blob.type || 'application/octet-stream';
    return {
      ref: occurrence.ref,
      kind: 'indexed-db',
      imageId,
      mimeType,
      filename: stored.name || `image-${index + 1}.${MIME_EXTENSIONS[mimeType] || 'bin'}`,
      alt: occurrence.alt,
    };
  }
  const mimeType = decodeDataMime(occurrence.ref);
  if (!mimeType) {
    throw Object.assign(new Error('仅允许 Base64 图片 Data URL'), { code: 'ARTICLE_INVALID' });
  }
  return {
    ref: occurrence.ref,
    kind: 'data-url',
    dataUrl: occurrence.ref,
    mimeType,
    filename: `generated-${index + 1}.${MIME_EXTENSIONS[mimeType] || 'bin'}`,
    alt: occurrence.alt,
  };
}

export async function buildDistributionPackage({
  documentId,
  title,
  markdown,
  renderedHtml,
  imageStore,
  prepareWechatContent,
  styleConfig,
  codeTheme,
  displaySettings,
  now = Date.now,
}) {
  const prepared = await prepareWechatContent({
    renderedHTML: renderedHtml,
    styleConfig,
    imageStore,
    codeTheme,
    displaySettings,
    imagePolicy: 'defer-local',
    showToast: () => {},
  });
  if (prepared.imageFailures?.length) {
    throw Object.assign(new Error('微信内容准备时存在不可读取图片'), { code: 'IMAGE_READ_FAILED' });
  }

  const portableMarkdown = toPortableMarkdown(markdown);
  const semanticHtml = toSemanticHtml(renderedHtml);
  const occurrences = collectImageOccurrences(`${portableMarkdown}\n${semanticHtml}\n${prepared.html}`);
  const images = [];
  for (const [index, occurrence] of occurrences.entries()) {
    images.push(await createImageRecord(occurrence, index, imageStore));
  }

  const snapshot = {
    schemaVersion: DISTRIBUTION_SCHEMA_VERSION,
    documentId: String(documentId || ''),
    title: String(title || '').trim(),
    markdown: String(markdown || ''),
    portableMarkdown,
    semanticHtml,
    wechatHtml: prepared.html,
    images: Object.freeze(images.map((image) => Object.freeze(image))),
    createdAt: now(),
  };
  return Object.freeze(snapshot);
}
```

- [ ] **Step 4: Run the focused contract tests**

Run: `npm test -- --run assets/scripts/distribution/__tests__/article-package.test.js`

Expected: PASS with `7 passed`.

- [ ] **Step 5: Commit the article contract**

```bash
git add assets/scripts/distribution/article-package.js assets/scripts/distribution/__tests__/article-package.test.js
git commit -m "feat: add article distribution contract"
```

### Task 2: Extract WeChat preparation without changing clipboard behavior

**Files:**
- Modify: `assets/scripts/export/clipboard-exporter.js:983-1070`
- Modify: `assets/scripts/export/__tests__/clipboard-exporter.test.js`

- [ ] **Step 1: Write failing preparation and clipboard-writer tests**

Add these imports and tests to `assets/scripts/export/__tests__/clipboard-exporter.test.js`:

```js
import {
  deferLocalImages,
  prepareWechatContent,
  writeWechatClipboard,
} from '../clipboard-exporter.js';

describe('WeChat preparation boundary', () => {
  it('retains IDB references for extension streaming and rejects anonymous blob URLs', () => {
    const make = (src, imageId = '') => {
      const values = new Map([['src', src], ['data-image-id', imageId]]);
      return {
        getAttribute: (name) => values.get(name) || null,
        setAttribute: (name, value) => values.set(name, value),
      };
    };
    const stored = make('blob:rendered', 'hero');
    const generated = make('data:image/png;base64,cG5n');
    const unreadable = make('blob:anonymous');

    const result = deferLocalImages([stored, generated, unreadable]);

    expect(stored.getAttribute('src')).toBe('img://hero');
    expect(generated.getAttribute('src')).toBe('data:image/png;base64,cG5n');
    expect(result.failures).toEqual(['blob:anonymous']);
  });

  it('writes exactly the prepared html and plain text', async () => {
    const write = vi.fn(async () => {});
    class TestClipboardItem {
      constructor(value) { this.value = value; }
    }
    await writeWechatClipboard(
      { html: '<p>正文</p>', text: '正文' },
      { clipboard: { write }, ClipboardItemCtor: TestClipboardItem, BlobCtor: Blob },
    );

    expect(write).toHaveBeenCalledTimes(1);
    const item = write.mock.calls[0][0][0];
    expect(await item.value['text/html'].text()).toBe('<p>正文</p>');
    expect(await item.value['text/plain'].text()).toBe('正文');
  });

  it('exports preparation separately from Clipboard writing', () => {
    expect(typeof prepareWechatContent).toBe('function');
  });
});
```

- [ ] **Step 2: Run the focused test and verify exports are missing**

Run: `npm test -- --run assets/scripts/export/__tests__/clipboard-exporter.test.js`

Expected: FAIL because `deferLocalImages`, `prepareWechatContent`, and `writeWechatClipboard` are not exported.

- [ ] **Step 3: Extract the existing transformation body and add deferred local-image mode**

Replace the current `copyToWechat()` function with the following functions. All helper calls shown already exist above the current function and remain unchanged.

```js
export function deferLocalImages(images) {
  const failures = [];
  for (const image of images) {
    const src = image.getAttribute('src') || '';
    const imageId = image.getAttribute('data-image-id') || '';
    if (imageId) {
      image.setAttribute('src', `img://${imageId}`);
    } else if (src.startsWith('blob:')) {
      failures.push(src);
    }
  }
  return { failures };
}

export async function prepareWechatContent({
  renderedHTML,
  styleConfig,
  imageStore,
  showToast = () => {},
  codeTheme,
  displaySettings,
  imagePolicy = 'clipboard',
}) {
  if (!renderedHTML) {
    throw Object.assign(new Error('没有内容可处理'), { code: 'ARTICLE_INVALID' });
  }

  const fontScale = Number(displaySettings?.fontScale) || 1;
  const effectiveStyleConfig = scaleStyleConfigFontSizes(styleConfig, fontScale);
  const parser = new DOMParser();
  const doc = parser.parseFromString(renderedHTML, 'text/html');

  doc.querySelectorAll('table').forEach((table) => {
    table.setAttribute('data-markdown-table', 'true');
  });
  convertGridToTable(doc);
  normalizeTablesForWechat(doc);

  const images = Array.from(doc.querySelectorAll('img'));
  let imageFailureCount = 0;
  let imageFailures = [];
  if (imagePolicy === 'defer-local') {
    imageFailures = deferLocalImages(images).failures;
    imageFailureCount = imageFailures.length;
  } else if (images.length > 0) {
    showToast(`正在处理 ${images.length} 张图片...`, 'success');
    const imageResult = await materializeClipboardImages(images, { imageStore });
    imageFailures = imageResult.failures.map((failure) => failure.src);
    imageFailureCount = imageFailures.length;
    if (imageFailureCount > 0) {
      console.warn('Clipboard image conversion failed:', imageResult.failures);
      imageResult.failures.forEach((failure) => {
        if (failure.element) replaceFailedImageWithPlaceholder(failure.element, failure.src);
      });
      showToast(`有 ${imageFailureCount} 张图片无法自动导入：${imageFailures.join('、')}`, 'error');
    } else if (imageResult.gifCount > 0) {
      showToast(`图片处理完成：成功 ${imageResult.successCount} 张，GIF ${imageResult.gifCount} 张`, 'success');
    }
  }

  await convertMathForWechat(doc);
  applyCodeHighlighting(doc, { codeTheme, styleConfig: effectiveStyleConfig });
  convertCodeBlocks(doc, effectiveStyleConfig, codeTheme);
  flattenListItems(doc);
  convertOrderedListsToWechatParagraphs(doc, effectiveStyleConfig);
  normalizeListTypographyForWechat(doc, effectiveStyleConfig);
  inlineContainerTypographyForWechat(doc, effectiveStyleConfig);
  normalizeBlockquotes(doc);
  wrapSectionIfNeeded(doc, effectiveStyleConfig);
  maybeReplaceAnimatedEndWithGif(doc, { styleConfig, displaySettings });
  materializeAnimatedCardDecorations(doc, { styleConfig: effectiveStyleConfig });

  const text = buildClipboardPlainText(doc);
  const tableBackground = extractBackgroundColor(effectiveStyleConfig.styles.container) || '#ffffff';
  await materializeMarkdownTables(
    Array.from(doc.querySelectorAll('table[data-markdown-table="true"]')),
    { background: tableBackground },
  );
  stripFormulaExportMetadata(doc.body);
  const html = doc.body.innerHTML;
  return {
    html,
    text,
    images: Array.from(doc.querySelectorAll('img')).map((image) => image.getAttribute('src') || ''),
    imageFailures,
    imageFailureCount,
  };
}

export async function writeWechatClipboard(
  prepared,
  {
    clipboard = navigator.clipboard,
    ClipboardItemCtor = ClipboardItem,
    BlobCtor = Blob,
  } = {},
) {
  const item = new ClipboardItemCtor({
    'text/html': new BlobCtor([prepared.html], { type: 'text/html' }),
    'text/plain': new BlobCtor([prepared.text], { type: 'text/plain' }),
  });
  await clipboard.write([item]);
}

export async function copyToWechat(options) {
  const showToast = options.showToast || (() => {});
  if (!options.renderedHTML) {
    showToast('没有内容可复制', 'error');
    return false;
  }
  try {
    const prepared = await prepareWechatContent({ ...options, imagePolicy: 'clipboard' });
    await writeWechatClipboard(prepared);
    if (prepared.imageFailureCount > 0) {
      showToast(
        `复制成功，但有 ${prepared.imageFailureCount} 张图片未能自动导入，已替换为占位提示，请在公众号后台手动上传`,
        'error',
      );
    } else {
      showToast('复制成功', 'success');
    }
    return true;
  } catch (error) {
    console.error('复制失败:', error);
    showToast(error.message?.startsWith('第 ') ? error.message : '复制失败', 'error');
    return false;
  }
}
```

- [ ] **Step 4: Run clipboard regression tests**

Run: `npm test -- --run assets/scripts/export/__tests__/clipboard-exporter.test.js assets/scripts/export/__tests__/table-image-renderer.test.js assets/scripts/export/__tests__/card-decoration-gif.test.js assets/scripts/export/__tests__/end-divider-gif.test.js`

Expected: PASS; the existing image, table, list, formula, card-decoration, and GIF cases remain green together with the three new boundary tests.

- [ ] **Step 5: Run a syntax check and commit only the extraction**

Run: `node --check assets/scripts/export/clipboard-exporter.js`

Expected: exit 0 with no output.

```bash
git add assets/scripts/export/clipboard-exporter.js assets/scripts/export/__tests__/clipboard-exporter.test.js
git commit -m "refactor: separate wechat content preparation"
```

### Task 3: Expose the fixed page bridge from the live editor

**Files:**
- Create: `assets/scripts/distribution/extension-bridge.js`
- Create: `assets/scripts/distribution/__tests__/extension-bridge.test.js`
- Modify: `assets/scripts/main.js:31-55,2673-2820`
- Modify: `index.html:962`

- [ ] **Step 1: Write the failing bridge lifecycle tests**

```js
// assets/scripts/distribution/__tests__/extension-bridge.test.js
import { describe, expect, it, vi } from 'vitest';
import { installDistributionBridge, PAGE_EVENTS } from '../extension-bridge.js';

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: (name, listener) => {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
    dispatchEvent: vi.fn((event) => listeners.get(event.type)?.(event)),
    listeners,
  };
}

describe('installDistributionBridge', () => {
  it('returns a package only for the fixed request event and preserves requestId', async () => {
    const target = createEventTarget();
    const createPackage = vi.fn(async () => ({ schemaVersion: 1, title: '标题' }));
    const dispose = installDistributionBridge({ target, createPackage, CustomEventCtor: class {
      constructor(type, init) { this.type = type; this.detail = init.detail; }
    }});

    target.dispatchEvent({ type: PAGE_EVENTS.request, detail: { requestId: 'request-1', ignoredUrl: 'https://evil.example' } });
    await Promise.resolve();
    await Promise.resolve();

    expect(createPackage).toHaveBeenCalledWith();
    expect(target.dispatchEvent).toHaveBeenLastCalledWith(expect.objectContaining({
      type: PAGE_EVENTS.ready,
      detail: { requestId: 'request-1', article: { schemaVersion: 1, title: '标题' } },
    }));
    dispose();
    expect(target.listeners.has(PAGE_EVENTS.request)).toBe(false);
  });

  it('exposes only a code and safe message when package construction fails', async () => {
    const target = createEventTarget();
    installDistributionBridge({
      target,
      createPackage: async () => { throw Object.assign(new Error('读取失败'), { code: 'IMAGE_READ_FAILED', token: 'secret' }); },
      CustomEventCtor: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
    });
    target.dispatchEvent({ type: PAGE_EVENTS.request, detail: { requestId: 'request-2' } });
    await Promise.resolve();
    await Promise.resolve();
    expect(target.dispatchEvent).toHaveBeenLastCalledWith(expect.objectContaining({
      type: PAGE_EVENTS.error,
      detail: { requestId: 'request-2', code: 'IMAGE_READ_FAILED', message: '读取失败' },
    }));
  });
});
```

- [ ] **Step 2: Run the bridge test and verify the module is absent**

Run: `npm test -- --run assets/scripts/distribution/__tests__/extension-bridge.test.js`

Expected: FAIL with `Failed to load url ../extension-bridge.js`.

- [ ] **Step 3: Implement the fixed-event bridge**

```js
// assets/scripts/distribution/extension-bridge.js
export const PAGE_EVENTS = Object.freeze({
  request: 'opengzh:distribution:request',
  ready: 'opengzh:distribution:ready',
  error: 'opengzh:distribution:error',
});

export function installDistributionBridge({
  target = document,
  createPackage,
  CustomEventCtor = CustomEvent,
}) {
  const onRequest = async (event) => {
    const requestId = typeof event.detail?.requestId === 'string' ? event.detail.requestId : '';
    if (!requestId) return;
    try {
      const article = await createPackage();
      target.dispatchEvent(new CustomEventCtor(PAGE_EVENTS.ready, {
        detail: { requestId, article },
      }));
    } catch (error) {
      target.dispatchEvent(new CustomEventCtor(PAGE_EVENTS.error, {
        detail: {
          requestId,
          code: typeof error?.code === 'string' ? error.code : 'ARTICLE_INVALID',
          message: typeof error?.message === 'string' ? error.message : '文章快照生成失败',
        },
      }));
    }
  };
  target.addEventListener(PAGE_EVENTS.request, onRequest);
  return () => target.removeEventListener(PAGE_EVENTS.request, onRequest);
}
```

- [ ] **Step 4: Wire snapshot creation to the existing render and document state**

Add imports in `assets/scripts/main.js`:

```js
import { prepareWechatContent, copyToWechat } from './export/clipboard-exporter.js';
import { buildDistributionPackage } from './distribution/article-package.js';
import { installDistributionBridge } from './distribution/extension-bridge.js';
```

Replace the old single `copyToWechat` import with the combined import above. Add a module variable next to the other lifecycle handles:

```js
let disposeDistributionBridge = null;
```

After `imageStore`, `md`, documents, and the initial render are ready in `onMounted`, immediately after `await persistDocumentState();`, add:

```js
      disposeDistributionBridge = installDistributionBridge({
        createPackage: async () => {
          await flushPendingRender();
          const activeDocument = getActiveDocument();
          return buildDistributionPackage({
            documentId: activeDocument?.id || '',
            title: resolveDocumentDisplayTitle(activeDocument),
            markdown: markdownInput.value,
            renderedHtml: renderedContent.value,
            imageStore,
            prepareWechatContent,
            styleConfig: mergeTheme(STYLES[currentStyle.value], activeDocument?.styleOverride),
            codeTheme: getResolvedCodeTheme(),
            displaySettings: displaySettings.value,
          });
        },
      });
```

Add bridge cleanup at the start of `onBeforeUnmount`:

```js
      disposeDistributionBridge?.();
      disposeDistributionBridge = null;
```

- [ ] **Step 5: Add a stable, inert injection anchor to the existing button**

Change only the opening tag of the existing `复制到公众号` button in `index.html`:

```html
<button data-opengzh-copy-button class="copy-btn" :class="{ success: copySuccess }" :disabled="!renderedContent" @click="doCopy">
```

- [ ] **Step 6: Run website tests and syntax checks**

Run:

```bash
npm test -- --run assets/scripts/distribution/__tests__/article-package.test.js assets/scripts/distribution/__tests__/extension-bridge.test.js assets/scripts/export/__tests__/clipboard-exporter.test.js
node --check assets/scripts/distribution/article-package.js
node --check assets/scripts/distribution/extension-bridge.js
node --check assets/scripts/main.js
```

Expected: all focused tests PASS and all three `node --check` commands exit 0.

- [ ] **Step 7: Commit the read-only page bridge**

```bash
git add index.html assets/scripts/main.js assets/scripts/distribution/extension-bridge.js assets/scripts/distribution/__tests__/extension-bridge.test.js
git commit -m "feat: expose article snapshot bridge"
```

### Task 4: Create the MV3 security skeleton and trust-boundary core

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/src/core/adapter-contract.js`
- Create: `extension/src/core/article-validator.js`
- Create: `extension/src/core/data-url.js`
- Create: `extension/src/core/header-rules.js`
- Create: `extension/src/core/platform-errors.js`
- Create: `extension/tests/manifest.test.js`
- Create: `extension/tests/article-validator.test.js`
- Create: `extension/tests/header-rules.test.js`
- Create: `extension/tests/platform-errors.test.js`
- Modify: `vitest.config.js`

- [ ] **Step 1: Extend the existing Vitest include list and write the failing Manifest test**

Replace `vitest.config.js` with:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'assets/scripts/**/*.test.js',
      'extension/tests/**/*.test.js',
      'scripts/**/*.test.js',
    ],
  },
});
```

Create `extension/tests/manifest.test.js`:

```js
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));

describe('OpenGZH MV3 manifest', () => {
  it('locks identity and version', () => {
    expect(manifest).toMatchObject({
      manifest_version: 3,
      name: 'OpenGZH',
      short_name: 'OpenGZH',
      version: '0.1.0',
      description: '微信公众号、知乎、掘金、人人都是产品经理文章同步助手',
      background: { service_worker: 'src/background/service-worker.js', type: 'module' },
    });
  });

  it('has only the two base API permissions and exact required hosts', () => {
    expect(manifest.permissions).toEqual(['storage', 'declarativeNetRequestWithHostAccess']);
    expect(manifest.host_permissions).toEqual([
      'https://mp.weixin.qq.com/*',
      'https://www.zhihu.com/*',
      'https://zhuanlan.zhihu.com/*',
      'https://api.zhihu.com/*',
      'https://zhihu-pics-upload.zhimg.com/*',
      'https://juejin.cn/*',
      'https://api.juejin.cn/*',
      'https://imagex.bytedanceapi.com/*',
      'https://*.volces.com/*',
      'https://www.woshipm.com/*',
    ]);
    expect(manifest.optional_host_permissions).toBeUndefined();
    const serialized = JSON.stringify(manifest);
    for (const forbidden of ['<all_urls>', 'cookies', 'unlimitedStorage', 'externally_connectable']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('injects only into OpenGZH production and loopback development pages', () => {
    expect(manifest.content_scripts).toEqual([expect.objectContaining({
      matches: [
        'https://opengzh.pasca.fun/*',
        'http://localhost/*',
        'http://127.0.0.1/*',
      ],
      js: ['src/content/open-gzh.js'],
      all_frames: false,
    })]);
  });
});
```

- [ ] **Step 2: Run the Manifest test and verify the file is absent**

Run: `npm test -- --run extension/tests/manifest.test.js`

Expected: FAIL with `ENOENT` for `extension/manifest.json`.

- [ ] **Step 3: Add the least-privilege Manifest**

```json
{
  "manifest_version": 3,
  "name": "OpenGZH",
  "short_name": "OpenGZH",
  "description": "微信公众号、知乎、掘金、人人都是产品经理文章同步助手",
  "version": "0.1.0",
  "minimum_chrome_version": "116",
  "icons": {
    "16": "assets/icon-16.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  },
  "action": {
    "default_title": "OpenGZH 文章同步助手",
    "default_icon": {
      "16": "assets/icon-16.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    }
  },
  "permissions": [
    "storage",
    "declarativeNetRequestWithHostAccess"
  ],
  "host_permissions": [
    "https://mp.weixin.qq.com/*",
    "https://www.zhihu.com/*",
    "https://zhuanlan.zhihu.com/*",
    "https://api.zhihu.com/*",
    "https://zhihu-pics-upload.zhimg.com/*",
    "https://juejin.cn/*",
    "https://api.juejin.cn/*",
    "https://imagex.bytedanceapi.com/*",
    "https://*.volces.com/*",
    "https://www.woshipm.com/*"
  ],
  "background": {
    "service_worker": "src/background/service-worker.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": [
        "https://opengzh.pasca.fun/*",
        "http://localhost/*",
        "http://127.0.0.1/*"
      ],
      "js": ["src/content/open-gzh.js"],
      "run_at": "document_idle",
      "all_frames": false
    }
  ]
}
```

- [ ] **Step 4: Write failing error/redaction, Data URL, and header-rule tests**

Create `extension/tests/platform-errors.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { PlatformError, redactSecrets, serializeError, summarizeRemote } from '../src/core/platform-errors.js';
import { dataUrlToBlob } from '../src/core/data-url.js';

describe('platform errors', () => {
  it('redacts credential fields and sensitive query parameters recursively', () => {
    const value = redactSecrets({
      token: 'token-value',
      nested: { SessionToken: 'session-value', ticket: 'ticket-value' },
      url: 'https://example.test/?csrf=csrf-value&safe=1',
    });
    expect(JSON.stringify(value)).not.toMatch(/token-value|session-value|ticket-value|csrf-value/);
    expect(value.url).toContain('safe=1');
  });

  it('serializes only the safe task fields', () => {
    const error = new PlatformError('PLATFORM_CHANGED', '响应字段变化', {
      httpStatus: 200,
      remoteSummary: '<script>secret</script>',
      draftId: 'draft-1',
    });
    expect(serializeError(error)).toEqual({
      code: 'PLATFORM_CHANGED',
      message: '响应字段变化',
      httpStatus: 200,
      remoteSummary: 'secret',
      draftId: 'draft-1',
      retryable: false,
    });
  });

  it('redacts credentials embedded in raw response text', () => {
    expect(summarizeRemote('{"token":"live-token","SessionToken":"live-session"} Authorization: Bearer live-bearer'))
      .toBe('{"token":"[REDACTED]","SessionToken":"[REDACTED]"} Authorization: Bearer [REDACTED]');
  });
});

describe('dataUrlToBlob', () => {
  it('parses an approved base64 image', async () => {
    const blob = dataUrlToBlob('data:image/png;base64,cG5n');
    expect(blob.type).toBe('image/png');
    expect(await blob.text()).toBe('png');
  });

  it('rejects text and non-base64 data URLs', () => {
    expect(() => dataUrlToBlob('data:text/plain;base64,dGV4dA==')).toThrowError(/图片/);
    expect(() => dataUrlToBlob('data:image/png,png')).toThrowError(/Base64/);
  });
});
```

Create `extension/tests/header-rules.test.js`:

```js
import { describe, expect, it, vi } from 'vitest';
import { withSessionHeaderRules } from '../src/core/header-rules.js';

describe('withSessionHeaderRules', () => {
  it.each(['success', 'throw'])('removes rules after %s', async (mode) => {
    const updateSessionRules = vi.fn(async () => {});
    const work = mode === 'success'
      ? vi.fn(async () => 'done')
      : vi.fn(async () => { throw new Error('network'); });
    const promise = withSessionHeaderRules(
      { updateSessionRules },
      [{ id: 1001, priority: 1, action: { type: 'modifyHeaders', requestHeaders: [] }, condition: { urlFilter: '*://example.test/*' } }],
      work,
    );
    if (mode === 'success') await expect(promise).resolves.toBe('done');
    else await expect(promise).rejects.toThrow('network');
    expect(updateSessionRules).toHaveBeenNthCalledWith(1, {
      removeRuleIds: [1001],
      addRules: [expect.objectContaining({ id: 1001 })],
    });
    expect(updateSessionRules).toHaveBeenLastCalledWith({ removeRuleIds: [1001] });
  });
});
```

- [ ] **Step 5: Run the focused core tests and verify the modules are absent**

Run: `npm test -- --run extension/tests/platform-errors.test.js extension/tests/header-rules.test.js`

Expected: FAIL because the three core modules do not exist.

- [ ] **Step 6: Implement exact error codes, redaction, Data URL parsing, and DNR cleanup**

```js
// extension/src/core/platform-errors.js
export const ERROR_CODES = Object.freeze([
  'AUTH_REQUIRED', 'PERMISSION_DENIED', 'ARTICLE_INVALID', 'IMAGE_NOT_LOCAL',
  'IMAGE_READ_FAILED', 'IMAGE_UPLOAD_FAILED', 'DRAFT_CREATE_FAILED',
  'DRAFT_UPDATE_FAILED', 'PLATFORM_CHANGED', 'RATE_LIMITED', 'NETWORK_ERROR',
  'UNKNOWN_REMOTE_STATE',
]);

const SECRET_KEYS = /^(?:token|ticket|csrf|jltoken|accesskeyid|secretaccesskey|sessiontoken|access_id|access_key|access_token|authorization)$/i;
const SECRET_QUERY = /([?&](?:token|ticket|csrf|access_key|session_token)=)[^&#]*/gi;

export class PlatformError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'PlatformError';
    this.code = ERROR_CODES.includes(code) ? code : 'PLATFORM_CHANGED';
    Object.assign(this, details);
  }
}

export function redactSecrets(value) {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEYS.test(key) ? '[REDACTED]' : redactSecrets(entry),
    ]));
  }
  if (typeof value === 'string') return value.replace(SECRET_QUERY, '$1[REDACTED]');
  return value;
}

export function summarizeRemote(value, maxLength = 160) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .replace(SECRET_QUERY, '$1[REDACTED]')
    .replace(/(["']?(?:token|ticket|csrf|jltoken|accesskeyid|secretaccesskey|sessiontoken|access_id|access_key|access_token)["']?\s*[:=]\s*["']?)[^"',}\s&]+/gi, '$1[REDACTED]')
    .replace(/(Authorization\s*:\s*Bearer\s+)\S+/gi, '$1[REDACTED]')
    .trim()
    .slice(0, maxLength);
}

export function serializeError(error) {
  return {
    code: ERROR_CODES.includes(error?.code) ? error.code : 'PLATFORM_CHANGED',
    message: summarizeRemote(error?.message || '平台响应异常'),
    ...(Number.isInteger(error?.httpStatus) ? { httpStatus: error.httpStatus } : {}),
    ...(error?.remoteSummary ? { remoteSummary: summarizeRemote(error.remoteSummary) } : {}),
    ...(error?.draftId ? { draftId: String(error.draftId) } : {}),
    retryable: Boolean(error?.retryable),
  };
}

export function remoteStateError(error, message = '无法确认远端是否已创建草稿') {
  if (error instanceof PlatformError) return error;
  return new PlatformError('UNKNOWN_REMOTE_STATE', message, { retryable: false });
}
```

```js
// extension/src/core/data-url.js
const IMAGE_DATA_URL = /^data:(image\/(?:png|jpe?g|gif|webp|avif|svg\+xml));base64,([a-z0-9+/=\s]+)$/i;

export function dataUrlToBlob(dataUrl) {
  const match = String(dataUrl || '').match(IMAGE_DATA_URL);
  if (!match) {
    const message = String(dataUrl || '').startsWith('data:image/')
      ? '图片 Data URL 必须使用 Base64'
      : '仅允许图片 Data URL';
    throw new TypeError(message);
  }
  const binary = atob(match[2].replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: match[1].toLowerCase() });
}
```

```js
// extension/src/core/header-rules.js
export const HEADER_RULE_IDS = Object.freeze({
  weixin: [1001],
  zhihu: [2001, 2002],
  juejin: [3001, 3002],
  woshipm: [4001],
});

export async function withSessionHeaderRules(declarativeNetRequest, rules, work) {
  const ruleIds = rules.map((rule) => rule.id);
  await declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds, addRules: rules });
  try {
    return await work();
  } finally {
    await declarativeNetRequest.updateSessionRules({ removeRuleIds: ruleIds });
  }
}
```

- [ ] **Step 7: Write failing article-schema and image-preflight tests**

```js
// extension/tests/article-validator.test.js
import { describe, expect, it } from 'vitest';
import { validateArticle, validateSelectedPlatformImages } from '../src/core/article-validator.js';

const article = {
  schemaVersion: 1,
  documentId: 'doc-1',
  title: '标题',
  markdown: '# 标题',
  portableMarkdown: '# 标题\n\n![图](img://hero)',
  semanticHtml: '<h1>标题</h1><img src="img://hero">',
  wechatHtml: '<h1>标题</h1><img src="img://hero">',
  images: [{ ref: 'img://hero', kind: 'indexed-db', imageId: 'hero', mimeType: 'image/png', filename: 'hero.png', alt: '' }],
  createdAt: 1787529600000,
};

describe('validateArticle', () => {
  it('accepts the locked schema and returns a deep clone', () => {
    const result = validateArticle(article);
    expect(result).toEqual(article);
    expect(result).not.toBe(article);
  });

  it.each([
    [{ ...article, schemaVersion: 2 }, 'ARTICLE_INVALID'],
    [{ ...article, title: '' }, 'ARTICLE_INVALID'],
    [{ ...article, images: [{ ...article.images[0], kind: 'remote' }] }, 'ARTICLE_INVALID'],
  ])('rejects invalid package %#', (input, code) => {
    expect(() => validateArticle(input)).toThrowError(expect.objectContaining({ code }));
  });
});

describe('validateSelectedPlatformImages', () => {
  it('allows exact local refs for all selected platforms', () => {
    expect(() => validateSelectedPlatformImages(article, ['weixin', 'zhihu', 'juejin', 'woshipm'])).not.toThrow();
  });

  it('allows a platform CDN only for that platform', () => {
    const weixinArticle = { ...article, wechatHtml: '<img src="https://mmbiz.qpic.cn/a.png">', images: [] };
    expect(() => validateSelectedPlatformImages(weixinArticle, ['weixin'])).not.toThrow();
    expect(() => validateSelectedPlatformImages(
      { ...weixinArticle, semanticHtml: weixinArticle.wechatHtml },
      ['zhihu'],
    )).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
  });

  it.each(['blob:missing', 'https://images.example.com/a.png', '../a.png'])('blocks unresolved source %s', (src) => {
    expect(() => validateSelectedPlatformImages(
      { ...article, semanticHtml: `<img src="${src}">`, images: [] },
      ['zhihu'],
    )).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
  });
});
```

- [ ] **Step 8: Implement adapter metadata, strict package validation, and per-platform CDN policy**

```js
// extension/src/core/adapter-contract.js
export const PLATFORM_IDS = Object.freeze(['weixin', 'zhihu', 'juejin', 'woshipm']);

export const PLATFORMS = Object.freeze({
  weixin: { name: '微信公众号', loginUrl: 'https://mp.weixin.qq.com/' },
  zhihu: { name: '知乎', loginUrl: 'https://www.zhihu.com/signin' },
  juejin: { name: '掘金', loginUrl: 'https://juejin.cn/login' },
  woshipm: { name: '人人都是产品经理', loginUrl: 'https://www.woshipm.com/login.html' },
});

export function assertAdapter(adapter) {
  if (!PLATFORM_IDS.includes(adapter?.id)) throw new TypeError('未知平台适配器');
  for (const method of ['checkAuth', 'uploadImage', 'saveDraft']) {
    if (typeof adapter[method] !== 'function') throw new TypeError(`${adapter.id}.${method} 必须是函数`);
  }
  return adapter;
}

export function articleContentForPlatform(article, platformId) {
  if (platformId === 'weixin') return article.wechatHtml;
  if (platformId === 'juejin') return article.portableMarkdown;
  return article.semanticHtml;
}

export function applyImageMap(content, imageMap) {
  let output = String(content || '');
  for (const [source, target] of imageMap) output = output.split(source).join(target);
  return output;
}
```

```js
// extension/src/core/article-validator.js
import { PLATFORM_IDS, articleContentForPlatform } from './adapter-contract.js';
import { PlatformError } from './platform-errors.js';

const CDN_HOSTS = Object.freeze({
  weixin: ['mmbiz.qpic.cn', 'mmbiz.qlogo.cn'],
  zhihu: ['zhimg.com'],
  juejin: ['byteimg.com', 'juejin.cn'],
  woshipm: ['woshipm.com'],
});

function invalid(message) {
  throw new PlatformError('ARTICLE_INVALID', message, { retryable: false });
}

function isString(value, allowEmpty = true) {
  return typeof value === 'string' && (allowEmpty || value.trim().length > 0);
}

function validateImage(image) {
  if (!image || !isString(image.ref, false) || !['indexed-db', 'data-url'].includes(image.kind)) invalid('图片清单格式错误');
  if (!isString(image.mimeType, false) || !image.mimeType.startsWith('image/')) invalid('图片 MIME 类型错误');
  if (!isString(image.filename, false) || !isString(image.alt)) invalid('图片元数据错误');
  if (image.kind === 'indexed-db' && (!isString(image.imageId, false) || image.ref !== `img://${image.imageId}`)) invalid('IndexedDB 图片引用错误');
  if (image.kind === 'data-url' && (!isString(image.dataUrl, false) || image.ref !== image.dataUrl || !image.ref.startsWith('data:image/'))) invalid('Data URL 图片引用错误');
}

export function validateArticle(value) {
  if (!value || value.schemaVersion !== 1) invalid('不支持的文章数据版本');
  for (const key of ['documentId', 'title', 'markdown', 'portableMarkdown', 'semanticHtml', 'wechatHtml']) {
    if (!isString(value[key], !['documentId', 'title'].includes(key))) invalid(`文章字段 ${key} 无效`);
  }
  if (!value.portableMarkdown.trim() && !value.semanticHtml.trim() && !value.wechatHtml.trim()) invalid('文章正文为空');
  if (!Array.isArray(value.images) || !Number.isFinite(value.createdAt)) invalid('文章图片或时间字段无效');
  value.images.forEach(validateImage);
  if (new Set(value.images.map((image) => image.ref)).size !== value.images.length) invalid('图片引用重复');
  return structuredClone(value);
}

function extractSources(content, markdown) {
  const values = [];
  const add = (value) => { if (value && !values.includes(value)) values.push(value); };
  if (markdown) {
    for (const match of String(content).matchAll(/!\[[^\]]*\]\(([^\s)]+)\)/g)) add(match[1]);
  }
  for (const match of String(content).matchAll(/<img\b[^>]*\bsrc=(['"])(.*?)\1/gi)) add(match[2]);
  return values;
}

function hostMatches(hostname, suffix) {
  return hostname === suffix || hostname.endsWith(`.${suffix}`);
}

function isPlatformCdn(platformId, source) {
  try {
    const url = new URL(source);
    return url.protocol === 'https:' && CDN_HOSTS[platformId].some((suffix) => hostMatches(url.hostname, suffix));
  } catch (_error) {
    return false;
  }
}

export function validateSelectedPlatformImages(article, platformIds) {
  const refs = new Set(article.images.map((image) => image.ref));
  for (const platformId of platformIds) {
    if (!PLATFORM_IDS.includes(platformId)) invalid('包含未知平台');
    const sources = extractSources(articleContentForPlatform(article, platformId), platformId === 'juejin');
    for (const source of sources) {
      if (refs.has(source) || isPlatformCdn(platformId, source)) continue;
      throw new PlatformError('IMAGE_NOT_LOCAL', `图片必须先导入本地图片库: ${source.slice(0, 120)}`, { retryable: false });
    }
  }
}
```

- [ ] **Step 9: Run the entire security-core test set**

Run: `npm test -- --run extension/tests/manifest.test.js extension/tests/platform-errors.test.js extension/tests/header-rules.test.js extension/tests/article-validator.test.js`

Expected: all tests PASS.

- [ ] **Step 10: Commit the MV3 trust boundary**

```bash
git add vitest.config.js extension/manifest.json extension/src/core/adapter-contract.js extension/src/core/article-validator.js extension/src/core/data-url.js extension/src/core/header-rules.js extension/src/core/platform-errors.js extension/tests/manifest.test.js extension/tests/article-validator.test.js extension/tests/header-rules.test.js extension/tests/platform-errors.test.js
git commit -m "feat: add mv3 security boundary"
```

### Task 5: Add the Shadow DOM content UI and image streaming

**Files:**
- Create: `extension/src/content/open-gzh.js`
- Create: `extension/tests/content-script.test.js`

- [ ] **Step 1: Write failing tests for selection, snapshot validation, and serial image replies**

```js
// extension/tests/content-script.test.js
import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it, vi } from 'vitest';

let api;
beforeAll(async () => {
  await import('../src/content/open-gzh.js');
  api = globalThis.__OPENGZH_CONTENT_TEST__;
});

describe('content script trust boundary', () => {
  it('defaults to all platforms and restores a persisted subset in fixed order', () => {
    expect(api.normalizeSelection(undefined)).toEqual(['weixin', 'zhihu', 'juejin', 'woshipm']);
    expect(api.normalizeSelection(['woshipm', 'weixin'])).toEqual(['weixin', 'woshipm']);
  });

  it('accepts only the locked snapshot schema', () => {
    const valid = {
      schemaVersion: 1,
      documentId: 'doc-1',
      title: '标题',
      markdown: '# 标题',
      portableMarkdown: '# 标题',
      semanticHtml: '<h1>标题</h1>',
      wechatHtml: '<h1>标题</h1>',
      images: [],
      createdAt: 1787529600000,
    };
    expect(api.validateSnapshot(valid)).toEqual(valid);
    expect(() => api.validateSnapshot({ ...valid, schemaVersion: 2 })).toThrowError(/版本/);
  });

  it('replies to IMAGE_REQUIRED in arrival order, never concurrently', async () => {
    let active = 0;
    let maxActive = 0;
    const postMessage = vi.fn();
    const respond = api.createImageResponder({
      postMessage,
      readImageData: async (image) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await Promise.resolve();
        active -= 1;
        return image.dataUrl;
      },
    });
    respond({ type: 'IMAGE_REQUIRED', taskId: 't', platformId: 'weixin', requestId: '1', image: { dataUrl: 'data:image/png;base64,MQ==' } });
    respond({ type: 'IMAGE_REQUIRED', taskId: 't', platformId: 'weixin', requestId: '2', image: { dataUrl: 'data:image/png;base64,Mg==' } });
    await respond.drain();
    expect(maxActive).toBe(1);
    expect(postMessage.mock.calls.map(([message]) => message.requestId)).toEqual(['1', '2']);
  });

  it('contains one Shadow DOM host and the stable website anchor', async () => {
    const source = await readFile(new URL('../src/content/open-gzh.js', import.meta.url), 'utf8');
    expect(source).toContain('[data-opengzh-copy-button]');
    expect(source).toContain("attachShadow({ mode: 'open' })");
    expect(source).toContain('class="platform-icon"');
    expect(source).toContain('class="link draft"');
    expect(source).toContain("type: 'RETRY_PLATFORM'");
    expect(source).not.toContain('chrome.permissions');
    expect(source).not.toContain('permissions.request');
    expect(source).not.toContain('innerHTML = message');
  });
});
```

- [ ] **Step 2: Run the content-script test and verify the file is absent**

Run: `npm test -- --run extension/tests/content-script.test.js`

Expected: FAIL with `Failed to load url ../src/content/open-gzh.js`.

- [ ] **Step 3: Implement the self-contained protocol and image reader**

Create `extension/src/content/open-gzh.js` with this complete self-contained script:

```js
(() => {
  const PLATFORM_IDS = Object.freeze(['weixin', 'zhihu', 'juejin', 'woshipm']);
  const PORT_NAME = 'opengzh-distribution-v1';
  const STORAGE_KEY = 'opengzh.selectedPlatformIds';
  const EVENTS = Object.freeze({
    request: 'opengzh:distribution:request',
    ready: 'opengzh:distribution:ready',
    error: 'opengzh:distribution:error',
  });
  const PLATFORMS = Object.freeze({
    weixin: { name: '微信公众号', icon: '微', loginUrl: 'https://mp.weixin.qq.com/' },
    zhihu: { name: '知乎', icon: '知', loginUrl: 'https://www.zhihu.com/signin' },
    juejin: { name: '掘金', icon: '掘', loginUrl: 'https://juejin.cn/login' },
    woshipm: { name: '人人都是产品经理', icon: '人', loginUrl: 'https://www.woshipm.com/login.html' },
  });

  function contentError(code, message) {
    return Object.assign(new Error(message), { code });
  }

  function normalizeSelection(value) {
    if (!Array.isArray(value)) return [...PLATFORM_IDS];
    const selected = PLATFORM_IDS.filter((id) => value.includes(id));
    return selected.length ? selected : [...PLATFORM_IDS];
  }

  function validateSnapshot(article) {
    if (!article || article.schemaVersion !== 1) throw contentError('ARTICLE_INVALID', '文章数据版本不受支持');
    for (const key of ['documentId', 'title', 'markdown', 'portableMarkdown', 'semanticHtml', 'wechatHtml']) {
      if (typeof article[key] !== 'string') throw contentError('ARTICLE_INVALID', `文章字段 ${key} 无效`);
    }
    if (!article.documentId || !article.title.trim() || !Array.isArray(article.images) || !Number.isFinite(article.createdAt)) {
      throw contentError('ARTICLE_INVALID', '文章快照不完整');
    }
    return structuredClone(article);
  }

  function blobToDataUrl(blob, FileReaderCtor = FileReader) {
    return new Promise((resolve, reject) => {
      const reader = new FileReaderCtor();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(contentError('IMAGE_READ_FAILED', '图片读取失败'));
      reader.readAsDataURL(blob);
    });
  }

  function readImageRecord(imageId, indexedDb = indexedDB) {
    return new Promise((resolve, reject) => {
      const open = indexedDb.open('WechatEditorImages', 1);
      open.onerror = () => reject(contentError('IMAGE_READ_FAILED', '无法打开图片库'));
      open.onsuccess = () => {
        const request = open.result.transaction(['images'], 'readonly').objectStore('images').get(imageId);
        request.onsuccess = () => request.result?.blob
          ? resolve(request.result.blob)
          : reject(contentError('IMAGE_READ_FAILED', `图片不存在: ${imageId}`));
        request.onerror = () => reject(contentError('IMAGE_READ_FAILED', `图片读取失败: ${imageId}`));
      };
    });
  }

  async function readImageData(image, dependencies = {}) {
    if (image.kind === 'data-url' && typeof image.dataUrl === 'string') return image.dataUrl;
    if (image.kind !== 'indexed-db' || typeof image.imageId !== 'string') {
      throw contentError('IMAGE_READ_FAILED', '图片引用无效');
    }
    const blob = await readImageRecord(image.imageId, dependencies.indexedDB || indexedDB);
    return blobToDataUrl(blob, dependencies.FileReaderCtor || FileReader);
  }

  function createImageResponder({ postMessage, readImageData: read = readImageData }) {
    let queue = Promise.resolve();
    const respond = (message) => {
      if (message?.type !== 'IMAGE_REQUIRED') return;
      queue = queue.then(async () => {
        try {
          const dataUrl = await read(message.image);
          postMessage({
            type: 'IMAGE_DATA',
            taskId: message.taskId,
            platformId: message.platformId,
            requestId: message.requestId,
            ref: message.image.ref,
            dataUrl,
          });
        } catch (error) {
          postMessage({
            type: 'IMAGE_ERROR',
            taskId: message.taskId,
            platformId: message.platformId,
            requestId: message.requestId,
            ref: message.image?.ref || '',
            code: error?.code || 'IMAGE_READ_FAILED',
            message: error?.message || '图片读取失败',
          });
        }
      });
    };
    respond.drain = () => queue;
    return respond;
  }

  function requestSnapshot(target = document, timeoutMs = 15000) {
    const requestId = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(reject, contentError('ARTICLE_INVALID', '文章快照请求超时')), timeoutMs);
      const onReady = (event) => {
        if (event.detail?.requestId === requestId) finish(resolve, validateSnapshot(event.detail.article));
      };
      const onError = (event) => {
        if (event.detail?.requestId === requestId) finish(reject, contentError(event.detail.code || 'ARTICLE_INVALID', event.detail.message || '文章快照失败'));
      };
      const finish = (callback, value) => {
        clearTimeout(timer);
        target.removeEventListener(EVENTS.ready, onReady);
        target.removeEventListener(EVENTS.error, onError);
        callback(value);
      };
      target.addEventListener(EVENTS.ready, onReady);
      target.addEventListener(EVENTS.error, onError);
      target.dispatchEvent(new CustomEvent(EVENTS.request, { detail: { requestId } }));
    });
  }

  function createUi() {
    const anchor = document.querySelector('[data-opengzh-copy-button]');
    if (!anchor || document.querySelector('[data-opengzh-extension-host]')) return null;
    const host = document.createElement('span');
    host.dataset.opengzhExtensionHost = 'true';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host{display:inline-flex;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#172033}
        button{font:inherit;cursor:pointer}.trigger{height:36px;padding:0 14px;border:1px solid #d8deea;border-radius:8px;background:#fff;color:#31415f}
        .panel[hidden]{display:none}.panel{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:rgba(10,18,32,.42)}
        .dialog{width:min(440px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;border-radius:16px;background:#fff;box-shadow:0 24px 70px rgba(4,12,28,.25);padding:20px}
        h2{margin:0;font-size:18px}.subtitle{margin:4px 0 16px;color:#65718a}.row{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:11px 0;border-top:1px solid #edf0f5}
        .platform-icon{display:inline-grid;width:24px;height:24px;margin-right:8px;place-items:center;border-radius:7px;background:#eef3ff;color:#315fd5;font-size:12px;font-style:normal}
        .status{display:block;color:#6b7280;font-size:12px}.row-actions{display:flex;gap:6px}.link{border:0;background:transparent;color:#315fd5;padding:3px}.link[hidden]{display:none}
        .footer{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.secondary,.primary{border-radius:8px;padding:8px 12px}.secondary{border:1px solid #d8deea;background:#fff}.primary{border:1px solid #315fd5;background:#315fd5;color:#fff}
        .error{min-height:20px;margin:10px 0 0;color:#b42318}.progress{color:#315fd5}
      </style>
      <button class="trigger" type="button">同步到平台</button>
      <div class="panel" hidden>
        <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="opengzh-sync-title">
          <h2 id="opengzh-sync-title">OpenGZH</h2>
          <p class="subtitle">微信公众号、知乎、掘金、人人都是产品经理文章同步助手</p>
          <div class="rows"></div>
          <p class="error" role="alert"></p>
          <div class="footer"><button class="secondary close" type="button">关闭</button><button class="primary start" type="button">保存草稿并打开</button></div>
        </section>
      </div>`;
    anchor.insertAdjacentElement('afterend', host);
    const rows = shadow.querySelector('.rows');
    for (const platformId of PLATFORM_IDS) {
      const row = document.createElement('div');
      row.className = 'row';
      row.dataset.platformId = platformId;
      row.innerHTML = `<input type="checkbox" checked aria-label="同步到${PLATFORMS[platformId].name}"><span><strong><span class="platform-icon" aria-hidden="true"></span><span class="platform-name"></span></strong><small class="status" aria-live="polite">待检测</small></span><span class="row-actions"><button class="link draft" type="button" hidden>打开草稿</button><button class="link login" type="button">前往登录</button><button class="link recheck" type="button">重新检测</button></span>`;
      row.querySelector('.platform-icon').textContent = PLATFORMS[platformId].icon;
      row.querySelector('.platform-name').textContent = PLATFORMS[platformId].name;
      rows.append(row);
    }
    return { host, shadow };
  }

  function bootstrap() {
    const ui = createUi();
    if (!ui) return;
    const { shadow } = ui;
    const panel = shadow.querySelector('.panel');
    const errorNode = shadow.querySelector('.error');
    const startButton = shadow.querySelector('.start');
    const port = chrome.runtime.connect({ name: PORT_NAME });
    const responder = createImageResponder({ postMessage: (message) => port.postMessage(message) });
    let taskId = '';

    const selectedIds = () => PLATFORM_IDS.filter((id) => shadow.querySelector(`[data-platform-id="${id}"] input`).checked);
    const setStatus = (id, text, progress = false, draftUrl = '') => {
      const row = shadow.querySelector(`[data-platform-id="${id}"]`);
      const node = row?.querySelector('.status');
      if (!node) return;
      node.textContent = text;
      node.classList.toggle('progress', progress);
      if (draftUrl) {
        row.dataset.draftUrl = draftUrl;
        row.querySelector('.draft').hidden = false;
      }
    };
    const setLocked = (locked) => {
      startButton.disabled = locked;
      for (const input of shadow.querySelectorAll('input[type="checkbox"]')) input.disabled = locked;
    };
    const persistSelection = () => chrome.storage.local.set({ [STORAGE_KEY]: selectedIds() });

    chrome.storage.local.get(STORAGE_KEY).then((stored) => {
      const selected = normalizeSelection(stored[STORAGE_KEY]);
      for (const id of PLATFORM_IDS) shadow.querySelector(`[data-platform-id="${id}"] input`).checked = selected.includes(id);
    });
    shadow.addEventListener('change', (event) => {
      if (event.target.matches('input[type="checkbox"]')) persistSelection();
    });
    shadow.querySelector('.trigger').addEventListener('click', async () => {
      panel.hidden = false;
      shadow.querySelector('.close').focus();
      const platformIds = selectedIds();
      if (platformIds.length) port.postMessage({ type: 'CHECK_AUTH', platformIds });
    });
    shadow.querySelector('.close').addEventListener('click', () => { panel.hidden = true; });
    panel.addEventListener('click', (event) => { if (event.target === panel) panel.hidden = true; });
    shadow.addEventListener('keydown', (event) => { if (event.key === 'Escape') panel.hidden = true; });
    shadow.addEventListener('click', async (event) => {
      const row = event.target.closest('[data-platform-id]');
      if (!row) return;
      const platformId = row.dataset.platformId;
      if (event.target.closest('.login')) window.open(PLATFORMS[platformId].loginUrl, '_blank', 'noopener');
      if (event.target.closest('.draft') && row.dataset.draftUrl) window.open(row.dataset.draftUrl, '_blank', 'noopener');
      if (event.target.closest('.recheck')) {
        port.postMessage(taskId
          ? { type: 'RETRY_PLATFORM', taskId, platformId }
          : { type: 'CHECK_AUTH', platformIds: [platformId] });
      }
    });
    startButton.addEventListener('click', async () => {
      errorNode.textContent = '';
      setLocked(true);
      const platformIds = selectedIds();
      try {
        if (!platformIds.length) throw contentError('ARTICLE_INVALID', '至少选择一个平台');
        const article = await requestSnapshot();
        taskId = crypto.randomUUID();
        port.postMessage({ type: 'START_BATCH', taskId, platformIds, article });
      } catch (error) {
        errorNode.textContent = error.message || '同步启动失败';
        setLocked(false);
      }
    });
    port.onMessage.addListener((message) => {
      if (message.type === 'IMAGE_REQUIRED') return responder(message);
      if (message.type === 'AUTH_RESULT') {
        setStatus(message.platformId, message.authenticated ? '已登录' : '需要登录');
      } else if (message.type === 'PLATFORM_STATE') {
        const labels = {
          'checking-auth': '检测登录状态', 'auth-required': '需要登录',
          'uploading-images': `上传图片 ${message.completed || 0}/${message.total || 0}`,
          'saving-draft': '保存草稿', success: '成功', failed: message.error?.message || '失败', unknown: '请检查平台草稿箱',
        };
        setStatus(message.platformId, labels[message.state] || message.state, ['checking-auth', 'uploading-images', 'saving-draft'].includes(message.state), message.state === 'success' ? message.draftUrl : '');
      } else if (message.type === 'BATCH_COMPLETE' && message.taskId === taskId) {
        setLocked(false);
      } else if (message.type === 'FATAL_ERROR') {
        errorNode.textContent = message.message || '同步任务失败';
        setLocked(false);
      }
    });
  }

  globalThis.__OPENGZH_CONTENT_TEST__ = Object.freeze({
    createImageResponder,
    normalizeSelection,
    readImageData,
    validateSnapshot,
  });
  if (typeof document !== 'undefined' && globalThis.chrome?.runtime?.connect) bootstrap();
})();
```

- [ ] **Step 4: Run the content-script and Manifest tests**

Run: `npm test -- --run extension/tests/content-script.test.js extension/tests/manifest.test.js`

Expected: both files PASS.

- [ ] **Step 5: Syntax-check and commit the content increment**

Run: `node --check extension/src/content/open-gzh.js`

Expected: exit 0 with no output.

```bash
git add extension/src/content/open-gzh.js extension/tests/content-script.test.js
git commit -m "feat: add extension sync panel and image streaming"
```

### Task 6: Implement the fixed-host runtime, serial runner, and service-worker lifecycle

**Files:**
- Create: `extension/src/core/request-runtime.js`
- Create: `extension/src/background/distribution-runner.js`
- Create: `extension/src/background/service-worker.js`
- Create: `extension/tests/distribution-runner.test.js`
- Create: `extension/tests/service-worker.test.js`

- [ ] **Step 1: Write failing serial-runner tests**

```js
// extension/tests/distribution-runner.test.js
import { describe, expect, it, vi } from 'vitest';
import { createDistributionRunner } from '../src/background/distribution-runner.js';
import { PlatformError } from '../src/core/platform-errors.js';

const article = {
  schemaVersion: 1,
  documentId: 'doc-1', title: '标题', markdown: '# 标题', portableMarkdown: '# 标题',
  semanticHtml: '<p>正文</p><img src="img://hero">',
  wechatHtml: '<p>正文</p><img src="img://hero">',
  images: [{ ref: 'img://hero', kind: 'indexed-db', imageId: 'hero', mimeType: 'image/png', filename: 'hero.png', alt: '' }],
  createdAt: 1787529600000,
};

function adapter(id, calls, failure) {
  return {
    id,
    checkAuth: vi.fn(async () => ({ authenticated: true })),
    uploadImage: vi.fn(async () => { calls.push(`${id}:upload`); return `https://${id}.cdn/hero.png`; }),
    saveDraft: vi.fn(async () => {
      calls.push(`${id}:save`);
      if (failure) throw failure;
      return { draftId: `${id}-draft`, draftUrl: `https://${id}.example/draft` };
    }),
  };
}

describe('distribution runner', () => {
  it('runs selected platforms in fixed serial order and emits image progress', async () => {
    const calls = [];
    const states = [];
    const adapters = Object.fromEntries(['weixin', 'zhihu', 'juejin', 'woshipm'].map((id) => [id, () => adapter(id, calls)]));
    const runner = createDistributionRunner({
      adapterFactories: adapters,
      runtimeFactory: (platformId) => ({ requestImage: async () => new Blob([platformId], { type: 'image/png' }) }),
      onState: (state) => states.push(state),
      persist: vi.fn(async () => {}),
    });

    const result = await runner.runBatch({ taskId: 'task-1', article, platformIds: ['woshipm', 'weixin', 'zhihu'] });

    expect(calls).toEqual(['weixin:upload', 'weixin:save', 'zhihu:upload', 'zhihu:save', 'woshipm:upload', 'woshipm:save']);
    expect(result.results.map((entry) => entry.platformId)).toEqual(['weixin', 'zhihu', 'woshipm']);
    expect(states).toContainEqual(expect.objectContaining({ platformId: 'weixin', state: 'uploading-images', completed: 1, total: 1 }));
  });

  it('keeps earlier success when a later platform fails', async () => {
    const calls = [];
    const runner = createDistributionRunner({
      adapterFactories: {
        weixin: () => adapter('weixin', calls),
        zhihu: () => adapter('zhihu', calls, new PlatformError('DRAFT_CREATE_FAILED', '创建失败', { retryable: true })),
      },
      runtimeFactory: () => ({ requestImage: async () => new Blob(['png'], { type: 'image/png' }) }),
      onState: vi.fn(),
      persist: vi.fn(async () => {}),
    });
    const result = await runner.runBatch({ taskId: 'task-2', article, platformIds: ['weixin', 'zhihu'] });
    expect(result.results).toEqual([
      expect.objectContaining({ platformId: 'weixin', state: 'success' }),
      expect.objectContaining({ platformId: 'zhihu', state: 'failed', error: expect.objectContaining({ code: 'DRAFT_CREATE_FAILED' }) }),
    ]);
  });

  it('never reruns success or unknown remote state', async () => {
    const calls = [];
    const runner = createDistributionRunner({
      adapterFactories: { weixin: () => adapter('weixin', calls) },
      runtimeFactory: () => ({ requestImage: async () => new Blob(['png']) }),
      onState: vi.fn(),
      persist: vi.fn(async () => {}),
    });
    await expect(runner.retryPlatform({ taskId: 'task-3', article, platformId: 'weixin', previous: { state: 'success' } }))
      .rejects.toMatchObject({ code: 'ARTICLE_INVALID' });
    await expect(runner.retryPlatform({ taskId: 'task-3', article, platformId: 'weixin', previous: { state: 'unknown' } }))
      .rejects.toMatchObject({ code: 'UNKNOWN_REMOTE_STATE' });
    expect(calls).toEqual([]);
  });

  it('rejects duplicate selections and maps auth fetch failures to NETWORK_ERROR', async () => {
    const persist = vi.fn(async () => {});
    const duplicateRunner = createDistributionRunner({
      adapterFactories: { weixin: () => adapter('weixin', []) },
      runtimeFactory: () => ({}), onState: vi.fn(), persist,
    });
    await expect(duplicateRunner.runBatch({ taskId: 'task-4', article, platformIds: ['weixin', 'weixin'] }))
      .rejects.toMatchObject({ code: 'ARTICLE_INVALID' });

    const networkRunner = createDistributionRunner({
      adapterFactories: { weixin: () => ({
        id: 'weixin',
        checkAuth: async () => { throw new TypeError('Failed to fetch'); },
        uploadImage: vi.fn(), saveDraft: vi.fn(),
      }) },
      runtimeFactory: () => ({}), onState: vi.fn(), persist,
    });
    const result = await networkRunner.runBatch({ taskId: 'task-5', article, platformIds: ['weixin'] });
    expect(result.results[0]).toMatchObject({ state: 'failed', error: { code: 'NETWORK_ERROR', retryable: true } });
  });
});
```

- [ ] **Step 2: Run the runner tests and verify the module is absent**

Run: `npm test -- --run extension/tests/distribution-runner.test.js`

Expected: FAIL with `Failed to load url ../src/background/distribution-runner.js`.

- [ ] **Step 3: Implement the fixed-host request runtime and image broker**

```js
// extension/src/core/request-runtime.js
import { dataUrlToBlob } from './data-url.js';
import { withSessionHeaderRules } from './header-rules.js';
import { PlatformError, redactSecrets } from './platform-errors.js';

const ALLOWED_HOSTS = Object.freeze({
  weixin: ['mp.weixin.qq.com'],
  zhihu: ['www.zhihu.com', 'zhuanlan.zhihu.com', 'api.zhihu.com', 'zhihu-pics-upload.zhimg.com'],
  juejin: ['juejin.cn', 'api.juejin.cn', 'imagex.bytedanceapi.com', '*.volces.com'],
  woshipm: ['www.woshipm.com'],
});

function hostAllowed(platformId, hostname) {
  return ALLOWED_HOSTS[platformId]?.some((rule) => rule.startsWith('*.')
    ? hostname.endsWith(rule.slice(1)) && hostname !== rule.slice(2)
    : hostname === rule);
}

export function assertFixedUrl(platformId, input) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || !hostAllowed(platformId, url.hostname)) {
    throw new PlatformError('PLATFORM_CHANGED', `平台返回了未批准地址: ${url.origin}`, { retryable: false });
  }
  return url;
}

export function createPortImageBroker(port, { timeoutMs = 30000 } = {}) {
  const pending = new Map();
  const onMessage = (message) => {
    const entry = pending.get(message?.requestId);
    if (!entry || message.taskId !== entry.taskId || message.platformId !== entry.platformId || message.ref !== entry.image.ref) return;
    clearTimeout(entry.timer);
    pending.delete(message.requestId);
    if (message.type === 'IMAGE_DATA') {
      try { entry.resolve(dataUrlToBlob(message.dataUrl)); }
      catch (error) { entry.reject(new PlatformError('IMAGE_READ_FAILED', error.message)); }
    } else if (message.type === 'IMAGE_ERROR') {
      entry.reject(new PlatformError('IMAGE_READ_FAILED', message.message || '图片读取失败'));
    }
  };
  port.onMessage.addListener(onMessage);
  return {
    requestImage(image, { taskId, platformId }) {
      const requestId = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(requestId);
          reject(new PlatformError('IMAGE_READ_FAILED', '图片读取超时'));
        }, timeoutMs);
        pending.set(requestId, { resolve, reject, timer, taskId, platformId, image });
        port.postMessage({ type: 'IMAGE_REQUIRED', taskId, platformId, requestId, image });
      });
    },
    dispose() {
      port.onMessage.removeListener(onMessage);
      for (const entry of pending.values()) {
        clearTimeout(entry.timer);
        entry.reject(new PlatformError('IMAGE_READ_FAILED', '页面连接已断开'));
      }
      pending.clear();
    },
  };
}

export function createRequestRuntime({
  platformId,
  taskId,
  imageBroker,
  fetchImpl = fetch,
  declarativeNetRequest = chrome.declarativeNetRequest,
  logSink = console,
}) {
  return Object.freeze({
    platformId,
    taskId,
    async fetch(input, init = {}) {
      const url = assertFixedUrl(platformId, input);
      const credentials = init.credentials || (url.hostname.endsWith('.volces.com') || url.hostname === 'imagex.bytedanceapi.com' ? 'omit' : 'include');
      return fetchImpl(url.href, { ...init, credentials });
    },
    requestImage: (image) => imageBroker.requestImage(image, { taskId, platformId }),
    withHeaderRules: (rules, work) => withSessionHeaderRules(declarativeNetRequest, rules, work),
    log(stage, fields = {}) {
      logSink.info?.('[OpenGZH]', redactSecrets({ platformId, stage, ...fields }));
    },
  });
}
```

- [ ] **Step 4: Implement the serial runner and retry rules**

```js
// extension/src/background/distribution-runner.js
import { PLATFORM_IDS, assertAdapter, articleContentForPlatform } from '../core/adapter-contract.js';
import { validateArticle, validateSelectedPlatformImages } from '../core/article-validator.js';
import { PlatformError, serializeError } from '../core/platform-errors.js';

function safeResult(platformId, state, extra = {}) {
  return { platformId, state, ...extra };
}

export function createDistributionRunner({ adapterFactories, runtimeFactory, onState, persist }) {
  const emit = (taskId, platformId, state, extra = {}) => onState({ type: 'PLATFORM_STATE', taskId, platformId, state, ...extra });

  async function runPlatform({ taskId, article, platformId, previous = { state: 'idle' } }) {
    if (typeof adapterFactories[platformId] !== 'function') throw new PlatformError('PLATFORM_CHANGED', '平台适配器未注册');
    const adapter = assertAdapter(adapterFactories[platformId]());
    const runtime = runtimeFactory(platformId, taskId);
    emit(taskId, platformId, 'checking-auth');
    try {
      const auth = await adapter.checkAuth(runtime);
      if (!auth?.authenticated) {
        const result = safeResult(platformId, 'auth-required', { error: { code: 'AUTH_REQUIRED', message: '需要重新登录', retryable: true } });
        emit(taskId, platformId, result.state, { error: result.error });
        return result;
      }

      const imageMap = new Map();
      const platformContent = articleContentForPlatform(article, platformId);
      const platformImages = article.images.filter((image) => platformContent.includes(image.ref));
      emit(taskId, platformId, 'uploading-images', { completed: 0, total: platformImages.length });
      for (const [index, image] of platformImages.entries()) {
        const blob = await runtime.requestImage(image);
        let uploadedUrl;
        try {
          uploadedUrl = await adapter.uploadImage(runtime, blob, image.filename);
        } catch (error) {
          throw error instanceof PlatformError
            ? error
            : new PlatformError('IMAGE_UPLOAD_FAILED', error?.message || '图片上传失败', { retryable: true });
        }
        imageMap.set(image.ref, uploadedUrl);
        emit(taskId, platformId, 'uploading-images', { completed: index + 1, total: platformImages.length });
      }

      emit(taskId, platformId, 'saving-draft');
      const draft = await adapter.saveDraft(runtime, article, imageMap, previous);
      if (!draft?.draftId || !draft?.draftUrl) {
        throw new PlatformError('PLATFORM_CHANGED', '草稿响应缺少 ID 或编辑地址', { retryable: false });
      }
      const result = safeResult(platformId, 'success', { draftId: String(draft.draftId), draftUrl: String(draft.draftUrl) });
      emit(taskId, platformId, result.state, { draftId: result.draftId, draftUrl: result.draftUrl });
      return result;
    } catch (error) {
      const normalized = error instanceof PlatformError
        ? error
        : new PlatformError('NETWORK_ERROR', error?.message || '平台网络请求失败', { retryable: true });
      const serialized = serializeError(normalized);
      const state = serialized.code === 'UNKNOWN_REMOTE_STATE' ? 'unknown' : serialized.code === 'AUTH_REQUIRED' ? 'auth-required' : 'failed';
      const result = safeResult(platformId, state, { error: serialized, ...(serialized.draftId ? { draftId: serialized.draftId } : {}) });
      emit(taskId, platformId, state, { error: serialized, ...(result.draftId ? { draftId: result.draftId } : {}) });
      return result;
    }
  }

  return Object.freeze({
    async runBatch({ taskId, article: input, platformIds }) {
      const article = validateArticle(input);
      const ordered = PLATFORM_IDS.filter((id) => platformIds.includes(id));
      if (!ordered.length || platformIds.length !== new Set(platformIds).size || ordered.length !== platformIds.length) {
        throw new PlatformError('ARTICLE_INVALID', '平台选择无效');
      }
      validateSelectedPlatformImages(article, ordered);
      const batch = { taskId, results: [] };
      for (const platformId of ordered) {
        batch.results.push(await runPlatform({ taskId, article, platformId }));
        await persist(batch);
      }
      return batch;
    },

    async retryPlatform({ taskId, article: input, platformId, previous }) {
      if (!PLATFORM_IDS.includes(platformId)) throw new PlatformError('ARTICLE_INVALID', '平台选择无效');
      if (previous?.state === 'success') throw new PlatformError('ARTICLE_INVALID', '成功平台不会重复执行');
      if (previous?.state === 'unknown') throw new PlatformError('UNKNOWN_REMOTE_STATE', '请先人工检查平台草稿箱');
      const article = validateArticle(input);
      validateSelectedPlatformImages(article, [platformId]);
      const result = await runPlatform({ taskId, article, platformId, previous });
      await persist({ taskId, results: [result] });
      return result;
    },
  });
}
```

- [ ] **Step 5: Run the runner tests and verify serial semantics**

Run: `npm test -- --run extension/tests/distribution-runner.test.js`

Expected: all four tests PASS.

- [ ] **Step 6: Write failing service-worker sender, required-host, storage, and tab tests**

```js
// extension/tests/service-worker.test.js
import { describe, expect, it, vi } from 'vitest';
import { assertHostPermissions, isAllowedSender, openSuccessfulDrafts, sanitizeBatchForSession } from '../src/background/service-worker.js';

describe('service worker boundary', () => {
  it.each([
    [{ url: 'https://opengzh.pasca.fun/', frameId: 0 }, true],
    [{ url: 'http://localhost:8080/', frameId: 0 }, true],
    [{ url: 'http://127.0.0.1:8080/', frameId: 0 }, true],
    [{ url: 'https://opengzh.pasca.fun/', frameId: 1 }, false],
    [{ url: 'https://evil.example/', frameId: 0 }, false],
  ])('validates sender %#', (sender, expected) => {
    expect(isAllowedSender(sender)).toBe(expected);
  });

  it('derives exact required origins from platform IDs in the trusted worker', async () => {
    const permissions = { contains: vi.fn(async () => true) };
    await expect(assertHostPermissions(['zhihu', 'weixin'], permissions)).resolves.toBe(true);
    expect(permissions.contains).toHaveBeenCalledWith({ origins: [
      'https://mp.weixin.qq.com/*',
      'https://www.zhihu.com/*',
      'https://zhuanlan.zhihu.com/*',
      'https://api.zhihu.com/*',
      'https://zhihu-pics-upload.zhimg.com/*',
    ] });
  });

  it('rejects unknown IDs and fails closed when required host access is withheld', async () => {
    await expect(assertHostPermissions(['evil'], { contains: vi.fn() }))
      .rejects.toMatchObject({ code: 'ARTICLE_INVALID' });
    await expect(assertHostPermissions(['weixin'], { contains: vi.fn(async () => false) }))
      .rejects.toMatchObject({ code: 'PERMISSION_DENIED', retryable: true });
  });

  it('stores no article or credential fields', () => {
    expect(sanitizeBatchForSession({
      taskId: 'task-1',
      article: { title: 'secret article' },
      token: 'secret token',
      results: [{ platformId: 'weixin', state: 'success', draftId: 'd1', draftUrl: 'https://mp.weixin.qq.com/draft' }],
    })).toEqual({
      taskId: 'task-1',
      results: [{ platformId: 'weixin', state: 'success', draftId: 'd1', draftUrl: 'https://mp.weixin.qq.com/draft' }],
    });
  });

  it('opens all successes inactive and then activates the first', async () => {
    const tabs = {
      create: vi.fn(async ({ url }) => ({ id: url.includes('zhuanlan') ? 11 : 12 })),
      update: vi.fn(async () => {}),
    };
    await openSuccessfulDrafts(tabs, {
      results: [
        { platformId: 'zhihu', state: 'success', draftUrl: 'https://zhuanlan.zhihu.com/p/1/edit' },
        { state: 'failed' },
        { platformId: 'juejin', state: 'success', draftUrl: 'https://juejin.cn/editor/drafts/2' },
      ],
    });
    expect(tabs.create).toHaveBeenNthCalledWith(1, { url: 'https://zhuanlan.zhihu.com/p/1/edit', active: false });
    expect(tabs.create).toHaveBeenNthCalledWith(2, { url: 'https://juejin.cn/editor/drafts/2', active: false });
    expect(tabs.update).toHaveBeenCalledWith(11, { active: true });
  });

  it('refuses to open a successful result on an unapproved host', async () => {
    await expect(openSuccessfulDrafts({ create: vi.fn(), update: vi.fn() }, {
      results: [{ platformId: 'zhihu', state: 'success', draftUrl: 'https://evil.example/draft' }],
    })).rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
  });
});
```

- [ ] **Step 7: Run the service-worker test and verify its module is absent**

Run: `npm test -- --run extension/tests/service-worker.test.js`

Expected: FAIL with `Failed to load url ../src/background/service-worker.js`.

- [ ] **Step 8: Implement the module service worker and in-memory retry context**

```js
// extension/src/background/service-worker.js
import { createDistributionRunner } from './distribution-runner.js';
import { PLATFORM_IDS, assertAdapter } from '../core/adapter-contract.js';
import { validateArticle } from '../core/article-validator.js';
import { createPortImageBroker, createRequestRuntime } from '../core/request-runtime.js';
import { PlatformError, serializeError } from '../core/platform-errors.js';

const PORT_NAME = 'opengzh-distribution-v1';
const DRAFT_HOSTS = Object.freeze({
  weixin: 'mp.weixin.qq.com',
  zhihu: 'zhuanlan.zhihu.com',
  juejin: 'juejin.cn',
  woshipm: 'www.woshipm.com',
});
const PLATFORM_ORIGINS = Object.freeze({
  weixin: Object.freeze(['https://mp.weixin.qq.com/*']),
  zhihu: Object.freeze([
    'https://www.zhihu.com/*',
    'https://zhuanlan.zhihu.com/*',
    'https://api.zhihu.com/*',
    'https://zhihu-pics-upload.zhimg.com/*',
  ]),
  juejin: Object.freeze([
    'https://juejin.cn/*',
    'https://api.juejin.cn/*',
    'https://imagex.bytedanceapi.com/*',
    'https://*.volces.com/*',
  ]),
  woshipm: Object.freeze(['https://www.woshipm.com/*']),
});

export function isAllowedSender(sender) {
  if (sender?.frameId !== 0 || typeof sender?.url !== 'string') return false;
  try {
    const url = new URL(sender.url);
    return (url.protocol === 'https:' && url.hostname === 'opengzh.pasca.fun')
      || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
  } catch (_error) {
    return false;
  }
}

export async function assertHostPermissions(platformIds, permissionsApi = chrome.permissions) {
  if (!Array.isArray(platformIds) || !platformIds.length || platformIds.length !== new Set(platformIds).size) {
    throw new PlatformError('ARTICLE_INVALID', '平台选择无效');
  }
  const ordered = PLATFORM_IDS.filter((platformId) => platformIds.includes(platformId));
  if (ordered.length !== platformIds.length) throw new PlatformError('ARTICLE_INVALID', '平台选择无效');
  const origins = ordered.flatMap((platformId) => PLATFORM_ORIGINS[platformId]);
  if (!permissionsApi?.contains || !await permissionsApi.contains({ origins })) {
    throw new PlatformError('PERMISSION_DENIED', '平台站点访问权限不可用，请在 Chrome 扩展详情中恢复后重试', { retryable: true });
  }
  return true;
}

export function sanitizeBatchForSession(batch) {
  const sanitizeDraftUrl = (value) => {
    if (!value) return '';
    const url = new URL(value);
    for (const key of ['token', 'ticket', 'csrf', 'access_key', 'session_token']) url.searchParams.delete(key);
    return url.href;
  };
  return {
    taskId: String(batch.taskId),
    results: (batch.results || []).map((result) => ({
      platformId: result.platformId,
      state: result.state,
      ...(result.draftId ? { draftId: String(result.draftId) } : {}),
      ...(result.draftUrl ? { draftUrl: sanitizeDraftUrl(result.draftUrl) } : {}),
      ...(result.error ? { error: serializeError(result.error) } : {}),
    })),
  };
}

export async function openSuccessfulDrafts(tabs, batch) {
  const created = [];
  for (const result of batch.results || []) {
    if (result.state === 'success' && result.draftUrl) {
      const url = new URL(result.draftUrl);
      if (url.protocol !== 'https:' || url.hostname !== DRAFT_HOSTS[result.platformId]) {
        throw new PlatformError('PLATFORM_CHANGED', '草稿编辑地址不在批准域名');
      }
      created.push(await tabs.create({ url: url.href, active: false }));
    }
  }
  if (created[0]?.id != null) await tabs.update(created[0].id, { active: true });
}

export function registerServiceWorker(chromeApi = chrome, adapterFactories = {}) {
  chromeApi.runtime.onConnect.addListener((port) => {
    if (port.name !== PORT_NAME || !isAllowedSender(port.sender)) {
      port.disconnect();
      return;
    }
    const imageBroker = createPortImageBroker(port);
    const taskContexts = new Map();
    const latestResults = new Map();
    const persist = async (batch) => {
      const existing = latestResults.get(batch.taskId) || [];
      const merged = new Map(existing.map((result) => [result.platformId, result]));
      for (const result of batch.results || []) merged.set(result.platformId, result);
      const normalized = { taskId: batch.taskId, results: [...merged.values()] };
      latestResults.set(batch.taskId, normalized.results);
      await chromeApi.storage.session.set({ [`opengzh.task.${batch.taskId}`]: sanitizeBatchForSession(normalized) });
    };
    const runner = createDistributionRunner({
      adapterFactories,
      runtimeFactory: (platformId, taskId) => createRequestRuntime({ platformId, taskId, imageBroker }),
      onState: (message) => port.postMessage(message),
      persist,
    });

    port.onMessage.addListener(async (message) => {
      try {
        if (message?.type === 'CHECK_AUTH') {
          await assertHostPermissions(message.platformIds, chromeApi.permissions);
          for (const platformId of message.platformIds || []) {
            if (!PLATFORM_IDS.includes(platformId)) throw new PlatformError('ARTICLE_INVALID', '平台选择无效');
            if (typeof adapterFactories[platformId] !== 'function') throw new PlatformError('PLATFORM_CHANGED', '平台适配器未注册');
            const adapter = assertAdapter(adapterFactories[platformId]());
            const runtime = createRequestRuntime({ platformId, taskId: 'auth-check', imageBroker });
            const auth = await adapter.checkAuth(runtime);
            port.postMessage({ type: 'AUTH_RESULT', platformId, authenticated: Boolean(auth?.authenticated) });
          }
          return;
        }
        if (message?.type === 'START_BATCH') {
          await assertHostPermissions(message.platformIds, chromeApi.permissions);
          const article = validateArticle(message.article);
          taskContexts.set(message.taskId, { article, platformIds: [...message.platformIds] });
          const batch = await runner.runBatch({ taskId: message.taskId, article, platformIds: message.platformIds });
          await persist(batch);
          await openSuccessfulDrafts(chromeApi.tabs, batch);
          port.postMessage({ type: 'BATCH_COMPLETE', ...sanitizeBatchForSession(batch) });
          return;
        }
        if (message?.type === 'RETRY_PLATFORM') {
          await assertHostPermissions([message.platformId], chromeApi.permissions);
          const context = taskContexts.get(message.taskId);
          if (!context) throw new PlatformError('ARTICLE_INVALID', '任务上下文已失效，请重新发起同步');
          const previous = latestResults.get(message.taskId)?.find((result) => result.platformId === message.platformId) || { state: 'idle' };
          const result = await runner.retryPlatform({
            taskId: message.taskId,
            article: context.article,
            platformId: message.platformId,
            previous,
          });
          await persist({ taskId: message.taskId, results: [result] });
          if (result.state === 'success') await openSuccessfulDrafts(chromeApi.tabs, { results: [result] });
          port.postMessage({ type: 'BATCH_COMPLETE', taskId: message.taskId, results: [result] });
        }
      } catch (error) {
        const safe = serializeError(error);
        port.postMessage({ type: 'FATAL_ERROR', code: safe.code, message: safe.message });
      }
    });
    port.onDisconnect.addListener(() => {
      imageBroker.dispose();
      taskContexts.clear();
      latestResults.clear();
    });
  });
}

if (globalThis.chrome?.runtime?.onConnect) registerServiceWorker(chrome, {});
```

- [ ] **Step 9: Run runner, worker, content, and security tests**

Run:

```bash
npm test -- --run extension/tests/distribution-runner.test.js extension/tests/service-worker.test.js extension/tests/content-script.test.js extension/tests/article-validator.test.js extension/tests/platform-errors.test.js extension/tests/header-rules.test.js
node --check extension/src/core/request-runtime.js
node --check extension/src/background/distribution-runner.js
node --check extension/src/background/service-worker.js
```

Expected: all focused tests PASS and all syntax checks exit 0.

- [ ] **Step 10: Commit the runnable zero-network task lifecycle**

```bash
git add extension/src/core/request-runtime.js extension/src/background/distribution-runner.js extension/src/background/service-worker.js extension/tests/distribution-runner.test.js extension/tests/service-worker.test.js
git commit -m "feat: add serial draft task lifecycle"
```

### Task 7: Implement the WeChat Official Accounts adapter

**Files:**
- Create: `extension/src/adapters/weixin.js`
- Create: `extension/tests/adapters/weixin.test.js`
- Create: `extension/tests/fixtures/weixin-home.html`

- [ ] **Step 1: Capture and sanitize the current WeChat request shape**

In an authenticated Chrome profile, open DevTools on `https://mp.weixin.qq.com/`, create one disposable text-only draft manually, and compare the home HTML bootstrap fields, `filetransfer` URL, and `operate_appmsg` form keys with the fixed implementation below. Save only this synthetic fixture in `extension/tests/fixtures/weixin-home.html`:

```html
<!doctype html><html><body>
<script>
window.wx = { data: { t: "test-token-123" }, ticket: "test-ticket-456", user_name: "test-user-789", nick_name: "测试账号", time: "1787529600" };
</script>
<img class="weui-desktop-account__thumb" src="https://mmbiz.qlogo.cn/test-avatar.png">
</body></html>
```

Expected: the live request uses only `mp.weixin.qq.com`; if any required field or endpoint differs, record the changed field in the test fixture and make the parser/request constant match the capture before running Step 6. Never save the live token, ticket, user name, Cookie, response body, or HAR.

- [ ] **Step 2: Write failing WeChat adapter tests**

```js
// extension/tests/adapters/weixin.test.js
import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { createWeixinAdapter } from '../../src/adapters/weixin.js';

const home = await readFile(new URL('../fixtures/weixin-home.html', import.meta.url), 'utf8');
const rules = (work) => work();

describe('WeChat adapter', () => {
  it('extracts auth fields without returning secrets', async () => {
    const runtime = { fetch: vi.fn(async () => new Response(home)), withHeaderRules: rules };
    const adapter = createWeixinAdapter();
    await expect(adapter.checkAuth(runtime)).resolves.toEqual({ authenticated: true, userId: 'test-user-789', username: '测试账号' });
  });

  it('maps a login page to AUTH_REQUIRED', async () => {
    const adapter = createWeixinAdapter();
    await expect(adapter.checkAuth({ fetch: async () => new Response('<html>login</html>') }))
      .resolves.toEqual({ authenticated: false });
  });

  it('uploads binary material and returns only the CDN URL', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(home))
      .mockResolvedValueOnce(new Response(JSON.stringify({ cdn_url: 'https://mmbiz.qpic.cn/test.png', base_resp: { err_msg: 'ok', ret: 0 } }), { headers: { 'content-type': 'application/json' } }));
    const runtime = { fetch, withHeaderRules: rules };
    const adapter = createWeixinAdapter();
    await adapter.checkAuth(runtime);
    await expect(adapter.uploadImage(runtime, new Blob(['png'], { type: 'image/png' }), 'hero.png'))
      .resolves.toBe('https://mmbiz.qpic.cn/test.png');
    const [url, init] = fetch.mock.calls[1];
    expect(url).toContain('/cgi-bin/filetransfer?');
    expect(url).toContain('ticket_id=test-user-789');
    expect(init.body.get('file')).toBeInstanceOf(Blob);
  });

  it('creates one draft, replaces images, and unwraps external links', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(home))
      .mockResolvedValueOnce(new Response(JSON.stringify({ appMsgId: 'draft-1', base_resp: { ret: 0, err_msg: 'ok' } })));
    const runtime = { fetch, withHeaderRules: rules };
    const adapter = createWeixinAdapter();
    await adapter.checkAuth(runtime);
    const result = await adapter.saveDraft(runtime, {
      title: '标题',
      wechatHtml: '<p><a href="https://evil.example">正文</a><img src="img://hero"></p>',
    }, new Map([['img://hero', 'https://mmbiz.qpic.cn/test.png']]), {});
    expect(result).toEqual(expect.objectContaining({ draftId: 'draft-1' }));
    const body = fetch.mock.calls[1][1].body;
    expect(body.get('content0')).toBe('<p>正文<img src="https://mmbiz.qpic.cn/test.png"></p>');
    expect(body.get('count')).toBe('1');
    expect(body.get('title0')).toBe('标题');
  });

  it('marks an interrupted create request as unknown remote state', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(home)).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const runtime = { fetch, withHeaderRules: rules };
    const adapter = createWeixinAdapter();
    await adapter.checkAuth(runtime);
    await expect(adapter.saveDraft(runtime, { title: '标题', wechatHtml: '<p>正文</p>' }, new Map(), {}))
      .rejects.toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', retryable: false });
  });

  it('fails closed when a successful response loses appMsgId', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response(home)).mockResolvedValueOnce(new Response('{"base_resp":{"ret":0}}'));
    const runtime = { fetch, withHeaderRules: rules };
    const adapter = createWeixinAdapter();
    await adapter.checkAuth(runtime);
    await expect(adapter.saveDraft(runtime, { title: '标题', wechatHtml: '<p>正文</p>' }, new Map(), {}))
      .rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
  });
});
```

- [ ] **Step 3: Run the focused adapter test and verify the module is absent**

Run: `npm test -- --run extension/tests/adapters/weixin.test.js`

Expected: FAIL with `Failed to load url ../../src/adapters/weixin.js`.

- [ ] **Step 4: Implement the WeChat adapter with task-memory-only bootstrap state**

```js
// extension/src/adapters/weixin.js
import { applyImageMap } from '../core/adapter-contract.js';
import { PlatformError, remoteStateError, summarizeRemote } from '../core/platform-errors.js';

const HEADER_RULES = [{
  id: 1001,
  priority: 1,
  action: {
    type: 'modifyHeaders',
    requestHeaders: [
      { header: 'Origin', operation: 'set', value: 'https://mp.weixin.qq.com' },
      { header: 'Referer', operation: 'set', value: 'https://mp.weixin.qq.com/' },
    ],
  },
  condition: { urlFilter: '*://mp.weixin.qq.com/cgi-bin/*', resourceTypes: ['xmlhttprequest'] },
}];

function parseBootstrap(html) {
  const token = html.match(/data:\s*\{[\s\S]*?t:\s*["']([^"']+)["']/)?.[1];
  const ticket = html.match(/ticket:\s*["']([^"']+)["']/)?.[1];
  const userName = html.match(/user_name:\s*["']([^"']+)["']/)?.[1];
  const nickName = html.match(/nick_name:\s*["']([^"']+)["']/)?.[1] || '';
  const svrTime = html.match(/time:\s*["'](\d+)["']/)?.[1];
  return token && ticket && userName
    ? { token, ticket, userName, nickName, svrTime: svrTime || String(Math.floor(Date.now() / 1000)) }
    : null;
}

function stripExternalLinks(html) {
  return String(html).replace(/<a\b([^>]*)href=(['"])(.*?)\2([^>]*)>([\s\S]*?)<\/a>/gi, (match, before, quote, href, after, content) => {
    try {
      const host = new URL(href).hostname;
      if (host === 'mp.weixin.qq.com' || host.endsWith('.weixin.qq.com')) return match;
    } catch (_error) {
      return content;
    }
    return content;
  });
}

function createDraftBody(title, content, token) {
  return new URLSearchParams({
    token, lang: 'zh_CN', f: 'json', ajax: '1', random: String(Math.random()),
    AppMsgId: '', count: '1', data_seq: '0', operate_from: 'Chrome', isnew: '0',
    ad_video_transition0: '', can_reward0: '0', related_video0: '', is_video_recommend0: '-1',
    title0: title, author0: '', writerid0: '0', fileid0: '', digest0: '', auto_gen_digest0: '1',
    content0: content, sourceurl0: '', need_open_comment0: '1', only_fans_can_comment0: '0',
    cdn_url0: '', cdn_235_1_url0: '', cdn_1_1_url0: '', cdn_url_back0: '', crop_list0: '',
    music_id0: '', video_id0: '', voteid0: '', voteismlt0: '', supervoteid0: '', cardid0: '',
    cardquantity0: '', cardlimit0: '', vid_type0: '', show_cover_pic0: '0', shortvideofileid0: '',
    copyright_type0: '0', releasefirst0: '', platform0: '', reprint_permit_type0: '', allow_reprint0: '',
    allow_reprint_modify0: '', original_article_type0: '', ori_white_list0: '', free_content0: '', fee0: '0',
    ad_id0: '', guide_words0: '', is_share_copyright0: '0', share_copyright_url0: '',
    source_article_type0: '', reprint_recommend_title0: '', reprint_recommend_content0: '',
    share_page_type0: '0', share_imageinfo0: '{"list":[]}', share_video_id0: '', dot0: '{}',
    share_voice_id0: '', insert_ad_mode0: '', categories_list0: '[]',
  });
}

export function createWeixinAdapter() {
  let session = null;
  return {
    id: 'weixin',
    name: '微信公众号',
    loginUrl: 'https://mp.weixin.qq.com/',

    async checkAuth(runtime) {
      const response = await runtime.fetch('https://mp.weixin.qq.com/', { method: 'GET' });
      if (response.status === 401 || response.status === 403) return { authenticated: false };
      session = parseBootstrap(await response.text());
      return session
        ? { authenticated: true, userId: session.userName, username: session.nickName }
        : { authenticated: false };
    },

    async uploadImage(runtime, blob, filename) {
      if (!session) throw new PlatformError('AUTH_REQUIRED', '微信公众号登录已失效', { retryable: true });
      return runtime.withHeaderRules(HEADER_RULES, async () => {
        const stamp = Date.now();
        const form = new FormData();
        form.append('type', blob.type || 'application/octet-stream');
        form.append('id', String(stamp));
        form.append('name', filename);
        form.append('lastModifiedDate', new Date(stamp).toString());
        form.append('size', String(blob.size));
        form.append('file', blob, filename);
        const query = new URLSearchParams({
          action: 'upload_material', f: 'json', scene: '8', writetype: 'doublewrite', groupid: '1',
          ticket_id: session.userName, ticket: session.ticket, svr_time: session.svrTime,
          token: session.token, lang: 'zh_CN', seq: String(stamp), t: String(Math.random()),
        });
        const response = await runtime.fetch(`https://mp.weixin.qq.com/cgi-bin/filetransfer?${query}`, { method: 'POST', body: form });
        if ([401, 403].includes(response.status)) throw new PlatformError('AUTH_REQUIRED', '微信公众号登录已失效', { retryable: true });
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); }
        catch (_error) { throw new PlatformError('PLATFORM_CHANGED', '微信公众号图片响应格式已变化', { httpStatus: response.status, remoteSummary: text }); }
        if (!response.ok || data.base_resp?.ret !== 0 || !data.cdn_url) {
          throw new PlatformError(data.base_resp ? 'IMAGE_UPLOAD_FAILED' : 'PLATFORM_CHANGED', '微信公众号图片上传失败', { httpStatus: response.status, remoteSummary: summarizeRemote(text), retryable: true });
        }
        return data.cdn_url;
      });
    },

    async saveDraft(runtime, article, imageMap) {
      if (!session) throw new PlatformError('AUTH_REQUIRED', '微信公众号登录已失效', { retryable: true });
      const content = stripExternalLinks(applyImageMap(article.wechatHtml, imageMap));
      return runtime.withHeaderRules(HEADER_RULES, async () => {
        let response;
        try {
          response = await runtime.fetch(
            `https://mp.weixin.qq.com/cgi-bin/operate_appmsg?t=ajax-response&sub=create&type=77&token=${encodeURIComponent(session.token)}&lang=zh_CN`,
            { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: createDraftBody(article.title, content, session.token) },
          );
        } catch (error) {
          throw remoteStateError(error);
        }
        if ([401, 403].includes(response.status)) throw new PlatformError('AUTH_REQUIRED', '微信公众号登录已失效', { retryable: true });
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); }
        catch (_error) { throw new PlatformError('PLATFORM_CHANGED', '微信公众号草稿响应格式已变化', { httpStatus: response.status, remoteSummary: text }); }
        if (!response.ok) throw new PlatformError('DRAFT_CREATE_FAILED', `微信公众号草稿创建失败: ${response.status}`, { httpStatus: response.status, retryable: true });
        if (!data.appMsgId) {
          if (data.base_resp && data.base_resp.ret !== 0) throw new PlatformError('DRAFT_CREATE_FAILED', data.base_resp.err_msg || '微信公众号草稿创建失败', { httpStatus: response.status, retryable: true });
          throw new PlatformError('PLATFORM_CHANGED', '微信公众号草稿响应缺少 appMsgId', { httpStatus: response.status, remoteSummary: text });
        }
        const draftUrl = `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77&appmsgid=${encodeURIComponent(data.appMsgId)}&token=${encodeURIComponent(session.token)}&lang=zh_CN`;
        return { draftId: String(data.appMsgId), draftUrl };
      });
    },
  };
}
```

- [ ] **Step 5: Run the WeChat adapter and session-redaction tests**

Extend `extension/tests/service-worker.test.js` with:

```js
it('removes credential query parameters from session draft URLs', () => {
  const stored = sanitizeBatchForSession({
    taskId: 'task-1',
    results: [{ platformId: 'weixin', state: 'success', draftId: 'd1', draftUrl: 'https://mp.weixin.qq.com/edit?token=secret&appmsgid=d1' }],
  });
  expect(stored.results[0].draftUrl).toBe('https://mp.weixin.qq.com/edit?appmsgid=d1');
  expect(JSON.stringify(stored)).not.toContain('secret');
});
```

Run: `npm test -- --run extension/tests/adapters/weixin.test.js extension/tests/service-worker.test.js extension/tests/platform-errors.test.js`

Expected: all tests PASS and no test output contains `test-token-123` or `test-ticket-456` outside assertion fixtures.

- [ ] **Step 6: Run one authenticated text-only draft acceptance**

Run the website at `http://localhost:8080`, load the unpacked extension with the exact required hosts accepted at installation, select only WeChat in the panel, and sync an article titled `OpenGZH WeChat Adapter 2026-08-24`. Verify the Network panel contacts no non-WeChat platform host, then verify:

- exactly one draft appears;
- the extension opens its edit URL but does not publish it;
- an explicit response error is retryable, while aborting the create request after send produces `UNKNOWN_REMOTE_STATE` and no automatic retry;
- `chrome.storage.session` contains no `token`, `ticket`, article title, article body, or image bytes.

Expected: all checks pass. Delete the disposable draft manually only after recording the result; the extension itself must not delete it.

- [ ] **Step 7: Syntax-check and commit the WeChat increment**

Run: `node --check extension/src/adapters/weixin.js`

Expected: exit 0 with no output.

```bash
git add extension/src/adapters/weixin.js extension/tests/adapters/weixin.test.js extension/tests/fixtures/weixin-home.html extension/src/background/service-worker.js extension/tests/service-worker.test.js
git commit -m "feat: add wechat draft adapter"
```

### Task 8: Implement the Zhihu adapter with resumable draft updates

**Files:**
- Create: `extension/src/core/md5.js`
- Create: `extension/src/adapters/zhihu.js`
- Create: `extension/tests/core-crypto.test.js`
- Create: `extension/tests/adapters/zhihu.test.js`
- Create: `extension/tests/fixtures/zhihu-image-token.json`

- [ ] **Step 1: Capture and sanitize the current Zhihu draft and upload shapes**

Using an authenticated profile, manually upload one disposable PNG in the Zhihu article editor and save one empty draft. Confirm the fixed sequence `POST api.zhihu.com/images` → optional `PUT zhihu-pics-upload.zhimg.com/<object_key>` → `POST zhuanlan.zhihu.com/api/articles/drafts` → `PATCH .../api/articles/{id}/draft`. Save this synthetic fixture as `extension/tests/fixtures/zhihu-image-token.json`:

```json
{
  "upload_file": {
    "state": 0,
    "image_id": "test-image-id",
    "object_key": "test/object-key"
  },
  "upload_token": {
    "access_id": "test-access-id",
    "access_key": "test-access-key",
    "access_token": "test-access-token"
  }
}
```

Expected: required response keys match. If the live editor uses different keys or hosts, update the sanitized fixture and fixed code before live execution; never save the live upload token or HAR.

- [ ] **Step 2: Write failing MD5 and Zhihu adapter tests**

Add to `extension/tests/core-crypto.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { md5Hex } from '../src/core/md5.js';

describe('md5Hex', () => {
  it.each([
    ['', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['OpenGZH', 'bbe83eda5192a3f6af350a4bfc23cf9c'],
  ])('matches the standard vector for %j', (value, expected) => {
    expect(md5Hex(new TextEncoder().encode(value))).toBe(expected);
  });
});
```

Create `extension/tests/adapters/zhihu.test.js`:

```js
import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { createZhihuAdapter, transformZhihuContent } from '../../src/adapters/zhihu.js';

const tokenFixture = JSON.parse(await readFile(new URL('../fixtures/zhihu-image-token.json', import.meta.url), 'utf8'));
const withRules = (_rules, work) => work();

describe('Zhihu adapter', () => {
  it('detects login from /api/v4/me', async () => {
    const adapter = createZhihuAdapter();
    await expect(adapter.checkAuth({ fetch: async () => new Response(JSON.stringify({ id: 'u1', name: '测试用户' })), withHeaderRules: withRules }))
      .resolves.toEqual({ authenticated: true, userId: 'u1', username: '测试用户' });
  });

  it('transforms table, image, and code structures without inline styles', () => {
    const result = transformZhihuContent('<table style="x"><thead><tr><th>A</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table><img src="img://hero"><pre><code class="language-js">x</code></pre>');
    expect(result).toContain('<table data-draft-node="block" data-draft-type="table" data-size="normal" data-row-style="normal"><tbody><tr><th>A</th></tr><tr><td>B</td></tr></tbody></table>');
    expect(result).toContain('<figure><img src="img://hero"></figure>');
    expect(result).toContain('<pre lang="js"><code>x</code></pre>');
    expect(result).not.toContain('style=');
  });

  it('negotiates and uploads a binary image only to the fixed OSS host', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(tokenFixture)))
      .mockResolvedValueOnce(new Response('', { status: 200 }));
    const adapter = createZhihuAdapter({ hmacSha1Base64: vi.fn(async () => 'test-signature') });
    const runtime = { fetch, withHeaderRules: withRules };
    await expect(adapter.uploadImage(runtime, new Blob(['png'], { type: 'image/png' }), 'hero.png'))
      .resolves.toBe('https://pic4.zhimg.com/test/object-key');
    expect(fetch.mock.calls[0][0]).toBe('https://api.zhihu.com/images');
    expect(fetch.mock.calls[1][0]).toBe('https://zhihu-pics-upload.zhimg.com/test/object-key');
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe('OSS test-access-id:test-signature');
  });

  it('creates then updates a draft and returns the edit URL', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'draft-1' }), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const adapter = createZhihuAdapter();
    const result = await adapter.saveDraft({ fetch, withHeaderRules: withRules }, {
      title: '标题', semanticHtml: '<p>正文<img src="img://hero"></p>',
    }, new Map([['img://hero', 'https://pic4.zhimg.com/test/object-key']]), {});
    expect(result).toEqual({ draftId: 'draft-1', draftUrl: 'https://zhuanlan.zhihu.com/p/draft-1/edit' });
    expect(JSON.parse(fetch.mock.calls[1][1].body).content).toContain('https://pic4.zhimg.com/test/object-key');
  });

  it('updates an existing draftId without creating another draft', async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 204 }));
    const adapter = createZhihuAdapter();
    await adapter.saveDraft({ fetch, withHeaderRules: withRules }, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map(), { draftId: 'draft-existing' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain('/api/articles/draft-existing/draft');
  });

  it('preserves the created draftId when PATCH fails', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'draft-1' }), { status: 201 }))
      .mockResolvedValueOnce(new Response('failed', { status: 500 }));
    const adapter = createZhihuAdapter();
    await expect(adapter.saveDraft({ fetch, withHeaderRules: withRules }, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map(), {}))
      .rejects.toMatchObject({ code: 'DRAFT_UPDATE_FAILED', draftId: 'draft-1', retryable: true });
  });
});
```

- [ ] **Step 3: Run the focused tests and verify both modules are absent**

Run: `npm test -- --run extension/tests/core-crypto.test.js extension/tests/adapters/zhihu.test.js`

Expected: FAIL because `md5.js` and `zhihu.js` do not exist.

- [ ] **Step 4: Implement dependency-free MD5**

```js
// extension/src/core/md5.js
const SHIFTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const CONSTANTS = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0);

function rotateLeft(value, amount) {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}

function littleEndianHex(value) {
  return [0, 8, 16, 24].map((shift) => ((value >>> shift) & 0xff).toString(16).padStart(2, '0')).join('');
}

export function md5Hex(input) {
  const source = input instanceof Uint8Array ? input : new Uint8Array(input);
  const bitLength = BigInt(source.byteLength) * 8n;
  const paddedLength = Math.ceil((source.byteLength + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(source);
  bytes[source.byteLength] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 8, Number(bitLength & 0xffffffffn), true);
  view.setUint32(paddedLength - 4, Number(bitLength >> 32n), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = Array.from({ length: 16 }, (_, index) => view.getUint32(offset + index * 4, true));
    let a = a0; let b = b0; let c = c0; let d = d0;
    for (let index = 0; index < 64; index += 1) {
      let mix; let wordIndex;
      if (index < 16) { mix = (b & c) | (~b & d); wordIndex = index; }
      else if (index < 32) { mix = (d & b) | (~d & c); wordIndex = (5 * index + 1) % 16; }
      else if (index < 48) { mix = b ^ c ^ d; wordIndex = (3 * index + 5) % 16; }
      else { mix = c ^ (b | ~d); wordIndex = (7 * index) % 16; }
      const next = d;
      d = c;
      c = b;
      b = (b + rotateLeft((a + mix + CONSTANTS[index] + words[wordIndex]) >>> 0, SHIFTS[index])) >>> 0;
      a = next;
    }
    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }
  return [a0, b0, c0, d0].map(littleEndianHex).join('');
}
```

- [ ] **Step 5: Implement Zhihu content conversion, OSS upload, and create/update resume**

```js
// extension/src/adapters/zhihu.js
import { applyImageMap } from '../core/adapter-contract.js';
import { md5Hex } from '../core/md5.js';
import { PlatformError, remoteStateError } from '../core/platform-errors.js';

const API_RULES = [{
  id: 2001, priority: 1,
  action: { type: 'modifyHeaders', requestHeaders: [{ header: 'x-requested-with', operation: 'set', value: 'fetch' }] },
  condition: { regexFilter: '^https://(?:www\\.zhihu\\.com|zhuanlan\\.zhihu\\.com|api\\.zhihu\\.com)/', resourceTypes: ['xmlhttprequest'] },
}];
const OSS_RULES = [{
  id: 2002, priority: 1,
  action: { type: 'modifyHeaders', requestHeaders: [
    { header: 'Origin', operation: 'set', value: 'https://zhuanlan.zhihu.com' },
    { header: 'Referer', operation: 'set', value: 'https://zhuanlan.zhihu.com/' },
  ] },
  condition: { urlFilter: '*://zhihu-pics-upload.zhimg.com/*', resourceTypes: ['xmlhttprequest'] },
}];

export function transformZhihuContent(input) {
  let html = String(input || '').replace(/\sstyle=(['"])[\s\S]*?\1/gi, '');
  html = html.replace(/<figure[^>]*>\s*(<table[\s\S]*?<\/table>)\s*<\/figure>/gi, '$1');
  html = html.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_table, inside) => {
    const header = inside.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i)?.[1]
      ?.replace(/<td([^>]*)>/gi, '<th$1>').replace(/<\/td>/gi, '</th>') || '';
    const body = inside.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)?.[1]
      || inside.replace(/<thead[^>]*>[\s\S]*?<\/thead>/gi, '').replace(/<\/?tbody[^>]*>/gi, '');
    return `<table data-draft-node="block" data-draft-type="table" data-size="normal" data-row-style="normal"><tbody>${header}${body}</tbody></table>`;
  });
  html = html.replace(/<img((?:(?!<img)[\s\S])*?)>/gi, '<figure><img$1></figure>');
  html = html.replace(/<pre[^>]*>\s*<code[^>]*class=(['"])language-([\w+-]+)\1[^>]*>/gi, '<pre lang="$2"><code>');
  return html.replace(/\sdata-(?!draft)[\w-]+=(['"])[\s\S]*?\1/gi, '');
}

async function defaultHmacSha1Base64(key, message) {
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export function createZhihuAdapter({ hmacSha1Base64 = defaultHmacSha1Base64, delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  async function waitForImage(runtime, imageId) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await runtime.fetch(`https://api.zhihu.com/images/${encodeURIComponent(imageId)}`);
      const data = await response.json();
      if (data.original_hash) return data.original_hash;
      await delay(1000);
    }
    throw new PlatformError('IMAGE_UPLOAD_FAILED', '知乎图片处理超时', { retryable: true });
  }

  return {
    id: 'zhihu', name: '知乎', loginUrl: 'https://www.zhihu.com/signin',
    async checkAuth(runtime) {
      return runtime.withHeaderRules(API_RULES, async () => {
        const response = await runtime.fetch('https://www.zhihu.com/api/v4/me');
        if ([401, 403].includes(response.status)) return { authenticated: false };
        let data;
        try { data = await response.json(); }
        catch (_error) { return { authenticated: false }; }
        return data?.id ? { authenticated: true, userId: String(data.id), username: data.name || '' } : { authenticated: false };
      });
    },

    async uploadImage(runtime, blob) {
      return runtime.withHeaderRules(API_RULES, async () => {
        const imageHash = md5Hex(new Uint8Array(await blob.arrayBuffer()));
        const tokenResponse = await runtime.fetch('https://api.zhihu.com/images', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_hash: imageHash, source: 'article' }),
        });
        if ([401, 403].includes(tokenResponse.status)) throw new PlatformError('AUTH_REQUIRED', '知乎登录已失效', { retryable: true });
        const data = await tokenResponse.json();
        const uploadFile = data?.upload_file;
        if (!uploadFile?.image_id || !uploadFile?.object_key) throw new PlatformError('PLATFORM_CHANGED', '知乎图片凭证结构已变化');
        if (uploadFile.state === 1) return `https://pic4.zhimg.com/${await waitForImage(runtime, uploadFile.image_id)}`;
        const token = data.upload_token;
        if (!token?.access_id || !token?.access_key || !token?.access_token) throw new PlatformError('PLATFORM_CHANGED', '知乎 OSS 凭证结构已变化');
        const contentType = blob.type || 'application/octet-stream';
        const date = new Date().toUTCString();
        const headers = {
          'x-oss-date': date,
          'x-oss-security-token': token.access_token,
          'x-oss-user-agent': 'aliyun-sdk-js/6.8.0',
        };
        const canonicalHeaders = Object.keys(headers).sort().map((key) => `${key}:${headers[key]}`).join('\n');
        const stringToSign = `PUT\n\n${contentType}\n${date}\n${canonicalHeaders}\n/zhihu-pics/${uploadFile.object_key}`;
        const signature = await hmacSha1Base64(token.access_key, stringToSign);
        await runtime.withHeaderRules(OSS_RULES, async () => {
          const upload = await runtime.fetch(`https://zhihu-pics-upload.zhimg.com/${uploadFile.object_key}`, {
            method: 'PUT', body: blob,
            headers: { 'Content-Type': contentType, Authorization: `OSS ${token.access_id}:${signature}`, ...headers },
          });
          if (!upload.ok) throw new PlatformError('IMAGE_UPLOAD_FAILED', `知乎图片上传失败: ${upload.status}`, { httpStatus: upload.status, retryable: true });
        });
        return `https://pic4.zhimg.com/${uploadFile.object_key}${blob.type === 'image/gif' ? '.gif' : ''}`;
      });
    },

    async saveDraft(runtime, article, imageMap, taskState = {}) {
      return runtime.withHeaderRules(API_RULES, async () => {
        let draftId = taskState.draftId || '';
        if (!draftId) {
          let createResponse;
          try {
            createResponse = await runtime.fetch('https://zhuanlan.zhihu.com/api/articles/drafts', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: article.title, content: '', delta_time: 0 }),
            });
          } catch (error) {
            throw remoteStateError(error, '无法确认知乎是否已创建空草稿');
          }
          if ([401, 403].includes(createResponse.status)) throw new PlatformError('AUTH_REQUIRED', '知乎登录已失效', { retryable: true });
          const text = await createResponse.text();
          let data;
          try { data = JSON.parse(text); }
          catch (_error) { throw new PlatformError('PLATFORM_CHANGED', '知乎创建草稿响应格式已变化', { httpStatus: createResponse.status, remoteSummary: text }); }
          if (!createResponse.ok) throw new PlatformError('DRAFT_CREATE_FAILED', `知乎创建草稿失败: ${createResponse.status}`, { httpStatus: createResponse.status, retryable: true });
          if (!data.id) throw new PlatformError('PLATFORM_CHANGED', '知乎创建草稿响应缺少 id', { remoteSummary: text });
          draftId = String(data.id);
        }
        const content = transformZhihuContent(applyImageMap(article.semanticHtml, imageMap));
        let updateResponse;
        try {
          updateResponse = await runtime.fetch(`https://zhuanlan.zhihu.com/api/articles/${encodeURIComponent(draftId)}/draft`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: article.title, content }),
          });
        } catch (error) {
          throw new PlatformError('DRAFT_UPDATE_FAILED', error.message || '知乎草稿更新失败', { draftId, retryable: true });
        }
        if ([401, 403].includes(updateResponse.status)) throw new PlatformError('AUTH_REQUIRED', '知乎登录已失效', { draftId, retryable: true });
        if (!updateResponse.ok) throw new PlatformError('DRAFT_UPDATE_FAILED', `知乎草稿更新失败: ${updateResponse.status}`, { draftId, httpStatus: updateResponse.status, retryable: true });
        return { draftId, draftUrl: `https://zhuanlan.zhihu.com/p/${encodeURIComponent(draftId)}/edit` };
      });
    },
  };
}
```

- [ ] **Step 6: Run MD5 and Zhihu adapter tests**

Run: `npm test -- --run extension/tests/core-crypto.test.js extension/tests/adapters/zhihu.test.js extension/tests/article-validator.test.js extension/tests/platform-errors.test.js`

Expected: all tests PASS.

- [ ] **Step 7: Run authenticated Zhihu resume acceptance**

With only Zhihu selected in the panel, sync the same local-image article twice under two disposable titles and verify the Network panel contacts no non-Zhihu platform host. For the second run, force the first PATCH to return a client-side failure after the empty draft ID is received, then click “重新检测”. Verify exactly one empty draft was created for that run, retry PATCH targets the same ID, the opened editor contains the title/structure/image, and no inline OpenGZH style or `img://` remains.

Expected: both drafts are editable and unpublished; the interrupted update does not create a third draft.

- [ ] **Step 8: Syntax-check and commit the Zhihu increment**

Run:

```bash
node --check extension/src/core/md5.js
node --check extension/src/adapters/zhihu.js
```

Expected: both commands exit 0.

```bash
git add extension/src/core/md5.js extension/src/adapters/zhihu.js extension/tests/core-crypto.test.js extension/tests/adapters/zhihu.test.js extension/tests/fixtures/zhihu-image-token.json
git commit -m "feat: add zhihu draft adapter"
```

### Task 9: Implement the Juejin adapter and ImageX signing

**Files:**
- Create: `extension/src/core/aws4.js`
- Create: `extension/src/core/crc32.js`
- Create: `extension/src/adapters/juejin.js`
- Modify: `extension/tests/core-crypto.test.js`
- Create: `extension/tests/adapters/juejin.test.js`
- Create: `extension/tests/fixtures/juejin-imagex-token.json`

- [ ] **Step 1: Capture and sanitize the current Juejin/ImageX sequence**

In an authenticated Juejin editor, upload one disposable PNG and save one Markdown draft. Verify the fixed sequence and hosts: `HEAD user_api/v1/sys/token`, `GET imagex/v2/gen_token`, signed `ApplyImageUpload`, `PUT` to a returned `*.volces.com` host, signed `CommitImageUpload`, `get_img_url`, and `content_api/v1/article_draft/create`. Save this synthetic fixture as `extension/tests/fixtures/juejin-imagex-token.json`:

```json
{
  "token": {
    "data": {
      "token": {
        "AccessKeyId": "test-access-key",
        "SecretAccessKey": "test-secret-key",
        "SessionToken": "test-session-token",
        "ExpiredTime": "2026-08-24T12:00:00+08:00",
        "CurrentTime": "2026-08-24T10:00:00+08:00"
      }
    },
    "err_no": 0
  },
  "apply": {
    "Result": {
      "UploadAddress": {
        "StoreInfos": [{ "StoreUri": "test/store.png", "Auth": "test-upload-auth", "UploadID": "test-upload-id" }],
        "UploadHosts": ["upload.test.volces.com"],
        "SessionKey": "test-session-key"
      }
    }
  },
  "commit": {
    "Result": { "Results": [{ "Uri": "test/store.png", "UriStatus": 2000 }] }
  },
  "url": {
    "data": { "main_url": "https://p3-juejin.byteimg.com/test/store.png" },
    "err_no": 0
  }
}
```

Expected: keys and hosts match the live editor. If they differ, update the sanitized fixture and fixed parser before live execution. Never retain the real access key, secret, session token, upload auth, CSRF token, Cookie, or HAR.

- [ ] **Step 2: Write failing CRC32 and fixed-time SigV4 tests**

Append to `extension/tests/core-crypto.test.js`:

```js
import { crc32Hex } from '../src/core/crc32.js';
import { signAws4 } from '../src/core/aws4.js';

describe('crc32Hex', () => {
  it('matches the IEEE check vector', () => {
    expect(crc32Hex(new TextEncoder().encode('123456789'))).toBe('cbf43926');
  });
});

describe('signAws4', () => {
  it('matches a fixed ImageX canonical request', async () => {
    const result = await signAws4({
      method: 'GET',
      url: 'https://imagex.bytedanceapi.com/?Action=ApplyImageUpload&Version=2018-08-01&ServiceId=73owjymdk6',
      accessKeyId: 'test-access',
      secretAccessKey: 'test-secret',
      securityToken: 'test-session',
      region: 'cn-north-1',
      service: 'imagex',
      now: new Date('2026-08-24T00:00:00.000Z'),
    });
    expect(result.headers.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=test-access/20260824/cn-north-1/imagex/aws4_request, SignedHeaders=host;x-amz-date;x-amz-security-token, Signature=0f9be43c7823fcd822bc49b3f6caa678cd9e88d38e9d0295df0e5d960ea64c69',
    );
    expect(result.headers['x-amz-date']).toBe('20260824T000000Z');
    expect(result.headers['x-amz-security-token']).toBe('test-session');
  });
});
```

- [ ] **Step 3: Run the crypto test and verify both modules are absent**

Run: `npm test -- --run extension/tests/core-crypto.test.js`

Expected: FAIL because `aws4.js` and `crc32.js` do not exist.

- [ ] **Step 4: Implement standard CRC32 and Web Crypto SigV4**

```js
// extension/src/core/crc32.js
let table;

function crcTable() {
  if (table) return table;
  table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
}

export function crc32Hex(bytes) {
  let crc = 0xffffffff;
  const lookup = crcTable();
  for (const byte of bytes) crc = (crc >>> 8) ^ lookup[(crc ^ byte) & 0xff];
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}
```

```js
// extension/src/core/aws4.js
const encoder = new TextEncoder();

function hex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

async function hmac(key, value) {
  const keyBytes = key instanceof Uint8Array ? key : new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value)));
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalQuery(url) {
  return Array.from(url.searchParams.entries())
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)])
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

export async function signAws4({
  method,
  url: input,
  accessKeyId,
  secretAccessKey,
  securityToken = '',
  region = 'cn-north-1',
  service = 'imagex',
  headers = {},
  body = '',
  now = new Date(),
}) {
  const url = new URL(input);
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const normalizedHeaders = Object.fromEntries(Object.entries({
    host: url.host,
    ...headers,
    'x-amz-date': amzDate,
    ...(securityToken ? { 'x-amz-security-token': securityToken } : {}),
  }).map(([key, value]) => [key.toLowerCase(), String(value).trim().replace(/\s+/g, ' ')]));
  const headerNames = Object.keys(normalizedHeaders).sort();
  const canonicalHeaders = `${headerNames.map((key) => `${key}:${normalizedHeaders[key]}`).join('\n')}\n`;
  const signedHeaders = headerNames.join(';');
  const canonicalRequest = [
    method.toUpperCase(),
    url.pathname || '/',
    canonicalQuery(url),
    canonicalHeaders,
    signedHeaders,
    await sha256(body),
  ].join('\n');
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256(canonicalRequest)].join('\n');
  const dateKey = await hmac(encoder.encode(`AWS4${secretAccessKey}`), dateStamp);
  const regionKey = await hmac(dateKey, region);
  const serviceKey = await hmac(regionKey, service);
  const signingKey = await hmac(serviceKey, 'aws4_request');
  const signature = hex(await hmac(signingKey, stringToSign));
  return {
    headers: {
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'x-amz-date': amzDate,
      ...(securityToken ? { 'x-amz-security-token': securityToken } : {}),
    },
  };
}
```

- [ ] **Step 5: Write failing Juejin adapter tests**

```js
// extension/tests/adapters/juejin.test.js
import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { createJuejinAdapter } from '../../src/adapters/juejin.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/juejin-imagex-token.json', import.meta.url), 'utf8'));
const withRules = (_rules, work) => work();

describe('Juejin adapter', () => {
  it('checks auth and obtains CSRF from the response header', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { user_id: 'u1', user_name: '测试用户' } })))
      .mockResolvedValueOnce(new Response('', { headers: { 'x-ware-csrf-token': '0,test-csrf,86370000,success,test-session' } }));
    const adapter = createJuejinAdapter();
    await expect(adapter.checkAuth({ fetch })).resolves.toEqual({ authenticated: true, userId: 'u1', username: '测试用户' });
    await expect(adapter.getCsrfToken({ fetch })).resolves.toBe('test-csrf');
  });

  it('uploads through ImageX and rejects any returned non-volces host', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(fixture.token)))
      .mockResolvedValueOnce(new Response(JSON.stringify(fixture.apply)))
      .mockResolvedValueOnce(new Response('', { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(fixture.commit)))
      .mockResolvedValueOnce(new Response(JSON.stringify(fixture.url)));
    const signAws4 = vi.fn(async () => ({ headers: { authorization: 'test-signature', 'x-amz-date': '20260824T000000Z', 'x-amz-security-token': 'test-session-token' } }));
    const adapter = createJuejinAdapter({ signAws4, uuid: 'test-uuid' });
    const runtime = { fetch, withHeaderRules: withRules };
    await expect(adapter.uploadImage(runtime, new Blob(['png'], { type: 'image/png' }), 'hero.png'))
      .resolves.toBe('https://p3-juejin.byteimg.com/test/store.png');
    expect(fetch.mock.calls[2][0]).toBe('https://upload.test.volces.com/test/store.png');
    expect(fetch.mock.calls[2][1].headers['Content-CRC32']).toBe('83180390');

    const hostile = structuredClone(fixture);
    hostile.apply.Result.UploadAddress.UploadHosts = ['uploads.evil.example'];
    const hostileFetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(hostile.token)))
      .mockResolvedValueOnce(new Response(JSON.stringify(hostile.apply)));
    const hostileAdapter = createJuejinAdapter({ signAws4, uuid: 'test-uuid' });
    await expect(hostileAdapter.uploadImage({ fetch: hostileFetch, withHeaderRules: withRules }, new Blob(['png']), 'hero.png'))
      .rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
    expect(hostileFetch).toHaveBeenCalledTimes(2);
  });

  it('creates an empty-metadata Markdown draft', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response('', { headers: { 'x-ware-csrf-token': '0,test-csrf,1,success,s' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ err_no: 0, data: { id: 'draft-1' } })));
    const adapter = createJuejinAdapter({ uuid: 'test-uuid' });
    const result = await adapter.saveDraft(
      { fetch, withHeaderRules: withRules },
      { title: '标题', portableMarkdown: '正文\n\n![图](img://hero)' },
      new Map([['img://hero', 'https://p3-juejin.byteimg.com/test/store.png']]),
    );
    expect(result).toEqual({ draftId: 'draft-1', draftUrl: 'https://juejin.cn/editor/drafts/draft-1' });
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
      brief_content: '', category_id: '0', cover_image: '', edit_type: 10,
      html_content: 'deprecated', link_url: '',
      mark_content: '正文\n\n![图](https://p3-juejin.byteimg.com/test/store.png)',
      tag_ids: [], title: '标题',
    });
  });

  it('marks an interrupted create as unknown and never logs temporary credentials', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response('', { headers: { 'x-ware-csrf-token': '0,test-csrf,1,success,s' } }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const adapter = createJuejinAdapter();
    await expect(adapter.saveDraft({ fetch, withHeaderRules: withRules }, { title: '标题', portableMarkdown: '正文' }, new Map()))
      .rejects.toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', retryable: false });
  });
});
```

- [ ] **Step 6: Run the Juejin adapter test and verify its module is absent**

Run: `npm test -- --run extension/tests/adapters/juejin.test.js`

Expected: FAIL with `Failed to load url ../../src/adapters/juejin.js`.

- [ ] **Step 7: Implement the Juejin CSRF, ImageX, and draft flow**

```js
// extension/src/adapters/juejin.js
import { applyImageMap } from '../core/adapter-contract.js';
import { signAws4 as defaultSignAws4 } from '../core/aws4.js';
import { crc32Hex } from '../core/crc32.js';
import { PlatformError, remoteStateError } from '../core/platform-errors.js';

const AID = '2608';
const SERVICE_ID = '73owjymdk6';
const RULES = [
  {
    id: 3001, priority: 1,
    action: { type: 'modifyHeaders', requestHeaders: [
      { header: 'Origin', operation: 'set', value: 'https://juejin.cn' },
      { header: 'Referer', operation: 'set', value: 'https://juejin.cn/' },
    ] },
    condition: { urlFilter: '*://api.juejin.cn/*', resourceTypes: ['xmlhttprequest'] },
  },
  {
    id: 3002, priority: 1,
    action: { type: 'modifyHeaders', requestHeaders: [
      { header: 'Origin', operation: 'set', value: 'https://juejin.cn' },
      { header: 'Referer', operation: 'set', value: 'https://juejin.cn/' },
    ] },
    condition: { urlFilter: '*://imagex.bytedanceapi.com/*', resourceTypes: ['xmlhttprequest'] },
  },
];

function volcesUploadUrl(host, storeUri) {
  if (!/^[a-z0-9.-]+\.volces\.com$/i.test(host)) throw new PlatformError('PLATFORM_CHANGED', 'ImageX 返回了未批准上传主机');
  return `https://${host}/${String(storeUri).replace(/^\/+/, '')}`;
}

export function createJuejinAdapter({ signAws4 = defaultSignAws4, uuid = crypto.randomUUID().replaceAll('-', '') } = {}) {
  let csrfToken = '';
  let imageToken = null;

  async function getCsrfToken(runtime) {
    if (csrfToken) return csrfToken;
    const response = await runtime.fetch('https://api.juejin.cn/user_api/v1/sys/token', {
      method: 'HEAD', headers: { 'x-secsdk-csrf-request': '1', 'x-secsdk-csrf-version': '1.2.10' },
    });
    const parts = (response.headers.get('x-ware-csrf-token') || '').split(',');
    if (!parts[1]) throw new PlatformError('PLATFORM_CHANGED', '掘金 CSRF 响应格式已变化');
    csrfToken = parts[1];
    return csrfToken;
  }

  async function getImageToken(runtime) {
    if (imageToken && Date.now() < imageToken.expiresAt - 60000) return imageToken;
    const response = await runtime.fetch(`https://api.juejin.cn/imagex/v2/gen_token?aid=${AID}&uuid=${encodeURIComponent(uuid)}&client=web`);
    const data = await response.json();
    const token = data?.data?.token;
    if (data?.err_no || !token?.AccessKeyId || !token?.SecretAccessKey || !token?.SessionToken || !token?.ExpiredTime) {
      throw new PlatformError(data?.err_no ? 'IMAGE_UPLOAD_FAILED' : 'PLATFORM_CHANGED', data?.err_msg || '掘金 ImageX 凭证结构已变化', { retryable: Boolean(data?.err_no) });
    }
    imageToken = {
      accessKeyId: token.AccessKeyId,
      secretAccessKey: token.SecretAccessKey,
      securityToken: token.SessionToken,
      expiresAt: new Date(token.ExpiredTime).getTime(),
    };
    return imageToken;
  }

  async function signedFetch(runtime, token, method, url) {
    const signed = await signAws4({ method, url, ...token, region: 'cn-north-1', service: 'imagex' });
    return runtime.fetch(url, { method, headers: signed.headers });
  }

  const adapter = {
    id: 'juejin', name: '掘金', loginUrl: 'https://juejin.cn/login', getCsrfToken,
    async checkAuth(runtime) {
      const response = await runtime.fetch('https://api.juejin.cn/user_api/v1/user/get');
      if ([401, 403].includes(response.status)) return { authenticated: false };
      let data;
      try { data = await response.json(); }
      catch (_error) { return { authenticated: false }; }
      return data?.data?.user_id
        ? { authenticated: true, userId: String(data.data.user_id), username: data.data.user_name || '' }
        : { authenticated: false };
    },

    async uploadImage(runtime, blob) {
      return runtime.withHeaderRules(RULES, async () => {
        const token = await getImageToken(runtime);
        const applyUrl = `https://imagex.bytedanceapi.com/?Action=ApplyImageUpload&Version=2018-08-01&ServiceId=${SERVICE_ID}`;
        const applyResponse = await signedFetch(runtime, token, 'GET', applyUrl);
        const address = (await applyResponse.json())?.Result?.UploadAddress;
        const store = address?.StoreInfos?.[0];
        const host = address?.UploadHosts?.[0];
        if (!store?.StoreUri || !store?.Auth || !host || !address?.SessionKey) throw new PlatformError('PLATFORM_CHANGED', '掘金 ApplyImageUpload 响应结构已变化');
        const upload = await runtime.fetch(volcesUploadUrl(host, store.StoreUri), {
          method: 'PUT', credentials: 'omit', body: blob,
          headers: { Authorization: store.Auth, 'Content-Type': blob.type || 'application/octet-stream', 'Content-CRC32': crc32Hex(new Uint8Array(await blob.arrayBuffer())) },
        });
        if (!upload.ok) throw new PlatformError('IMAGE_UPLOAD_FAILED', `掘金 TOS 上传失败: ${upload.status}`, { httpStatus: upload.status, retryable: true });
        const commitUrl = `https://imagex.bytedanceapi.com/?Action=CommitImageUpload&Version=2018-08-01&SessionKey=${encodeURIComponent(address.SessionKey)}&ServiceId=${SERVICE_ID}`;
        const commitResponse = await signedFetch(runtime, token, 'POST', commitUrl);
        if (!(await commitResponse.json())?.Result) throw new PlatformError('PLATFORM_CHANGED', '掘金 CommitImageUpload 响应结构已变化');
        const imageUrlResponse = await runtime.fetch(`https://api.juejin.cn/imagex/v2/get_img_url?aid=${AID}&uuid=${encodeURIComponent(uuid)}&uri=${encodeURIComponent(store.StoreUri)}&img_type=private`);
        const imageUrlData = await imageUrlResponse.json();
        if (imageUrlData?.err_no) throw new PlatformError('IMAGE_UPLOAD_FAILED', imageUrlData.err_msg || '掘金图片地址获取失败', { retryable: true });
        const imageUrl = imageUrlData?.data?.main_url || imageUrlData?.data?.backup_url;
        if (!imageUrl) throw new PlatformError('PLATFORM_CHANGED', '掘金图片地址响应结构已变化');
        return imageUrl;
      });
    },

    async saveDraft(runtime, article, imageMap) {
      return runtime.withHeaderRules(RULES, async () => {
        const csrf = await getCsrfToken(runtime);
        let response;
        try {
          response = await runtime.fetch('https://api.juejin.cn/content_api/v1/article_draft/create', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-secsdk-csrf-token': csrf },
            body: JSON.stringify({
              brief_content: '', category_id: '0', cover_image: '', edit_type: 10,
              html_content: 'deprecated', link_url: '',
              mark_content: applyImageMap(article.portableMarkdown, imageMap),
              tag_ids: [], title: article.title,
            }),
          });
        } catch (error) {
          throw remoteStateError(error, '无法确认掘金是否已创建草稿');
        }
        if ([401, 403].includes(response.status)) throw new PlatformError('AUTH_REQUIRED', '掘金登录已失效', { retryable: true });
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); }
        catch (_error) { throw new PlatformError('PLATFORM_CHANGED', '掘金草稿响应格式已变化', { httpStatus: response.status, remoteSummary: text }); }
        if (!response.ok) throw new PlatformError('DRAFT_CREATE_FAILED', `掘金草稿创建失败: ${response.status}`, { httpStatus: response.status, retryable: true });
        if (data.err_no) throw new PlatformError(data.err_no === 403 ? 'AUTH_REQUIRED' : data.err_no === 429 ? 'RATE_LIMITED' : 'DRAFT_CREATE_FAILED', data.err_msg || '掘金草稿创建失败', { retryable: data.err_no !== 403 });
        if (!data?.data?.id) throw new PlatformError('PLATFORM_CHANGED', '掘金草稿响应缺少 id', { remoteSummary: text });
        const draftId = String(data.data.id);
        return { draftId, draftUrl: `https://juejin.cn/editor/drafts/${encodeURIComponent(draftId)}` };
      });
    },
  };
  return adapter;
}
```

- [ ] **Step 8: Run crypto, Juejin, redaction, and fixed-host tests**

Run: `npm test -- --run extension/tests/core-crypto.test.js extension/tests/adapters/juejin.test.js extension/tests/platform-errors.test.js extension/tests/service-worker.test.js`

Expected: all tests PASS; the hostile upload host receives zero requests.

- [ ] **Step 9: Run authenticated Juejin acceptance**

With only Juejin selected in the panel, sync a Markdown article containing local PNG/JPEG/GIF plus an OpenGZH card and XHS page marker, and verify the Network panel contacts no non-Juejin platform host. Verify the draft editor opens, category/tag/cover stay empty, `:::ogzh-card` and `<!-- xhs-page -->` are absent, all images use Juejin CDN URLs, and `chrome.storage.session` plus console output contain none of the fixture credential key names with live values.

Expected: one editable unpublished draft; interrupting the create request yields `UNKNOWN_REMOTE_STATE` and disables automatic retry.

- [ ] **Step 10: Syntax-check and commit the Juejin increment**

Run:

```bash
node --check extension/src/core/aws4.js
node --check extension/src/core/crc32.js
node --check extension/src/adapters/juejin.js
```

Expected: all commands exit 0.

```bash
git add extension/src/core/aws4.js extension/src/core/crc32.js extension/src/adapters/juejin.js extension/tests/core-crypto.test.js extension/tests/adapters/juejin.test.js extension/tests/fixtures/juejin-imagex-token.json
git commit -m "feat: add juejin draft adapter"
```

### Task 10: Implement 人人都是产品经理 and register all four adapters

**Files:**
- Create: `extension/src/adapters/woshipm.js`
- Create: `extension/tests/adapters/woshipm.test.js`
- Create: `extension/tests/fixtures/woshipm-profile.json`
- Modify: `extension/src/background/service-worker.js`
- Modify: `extension/tests/service-worker.test.js`

- [ ] **Step 1: Capture and sanitize the current 人人 request shapes**

In an authenticated writing page, upload one disposable PNG and save one text-only draft. Confirm `writing` contains `jltoken` and `userSettings.uid`, auth uses `api2/user/profile`, image upload uses `tensorflow/upyun/upload`, and draft creation uses `wp-admin/admin-ajax.php` with `action=add_draft`. Save this synthetic fixture as `extension/tests/fixtures/woshipm-profile.json`:

```json
{
  "CODE": 200,
  "RESULT": {
    "userInfoVo": {
      "uid": 1585,
      "nickName": "测试用户",
      "avartar": "https://image.woshipm.com/test-avatar.png"
    }
  }
}
```

Expected: live field and endpoint names match. If they differ, update the sanitized fixture and fixed code before live execution; never save the real `jltoken`, UID, Cookie, response page, or HAR.

- [ ] **Step 2: Write failing 人人 adapter tests**

```js
// extension/tests/adapters/woshipm.test.js
import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { createWoshipmAdapter } from '../../src/adapters/woshipm.js';

const profile = JSON.parse(await readFile(new URL('../fixtures/woshipm-profile.json', import.meta.url), 'utf8'));
const writingPage = '<script>window.settings={"jltoken":"test-jltoken"}; var userSettings = {"url":"/","uid":"1585"};</script>';
const withRules = (_rules, work) => work();

describe('Woshipm adapter', () => {
  it('extracts writing-page auth and verifies the profile', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(writingPage))
      .mockResolvedValueOnce(new Response(JSON.stringify(profile)));
    const adapter = createWoshipmAdapter();
    await expect(adapter.checkAuth({ fetch, withHeaderRules: withRules }))
      .resolves.toEqual({ authenticated: true, userId: '1585', username: '测试用户' });
    expect(fetch.mock.calls[1][0]).toBe('https://www.woshipm.com/api2/user/profile?uid=1585');
  });

  it('maps a writing page without uid to unauthenticated', async () => {
    const adapter = createWoshipmAdapter();
    await expect(adapter.checkAuth({ fetch: async () => new Response('<html>login</html>'), withHeaderRules: withRules }))
      .resolves.toEqual({ authenticated: false });
  });

  it('uploads a binary image with the in-memory page token', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(writingPage))
      .mockResolvedValueOnce(new Response(JSON.stringify(profile)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ url: 'https://image.woshipm.com/test.png' }] })));
    const runtime = { fetch, withHeaderRules: withRules };
    const adapter = createWoshipmAdapter();
    await adapter.checkAuth(runtime);
    await expect(adapter.uploadImage(runtime, new Blob(['png'], { type: 'image/png' }), 'hero.png'))
      .resolves.toBe('https://image.woshipm.com/test.png');
    const upload = fetch.mock.calls[2][1];
    expect(upload.headers.jlstar).toBe('Bearer test-jltoken');
    expect(upload.body.get('action')).toBe('wpuf_insert_image');
    expect(upload.body.get('files')).toBeInstanceOf(Blob);
  });

  it('creates a draft with replaced HTML image refs', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ post_id: 42, url: 'https://www.woshipm.com/writing?pid=42' })));
    const adapter = createWoshipmAdapter();
    const result = await adapter.saveDraft(
      { fetch, withHeaderRules: withRules },
      { title: '标题', semanticHtml: '<p>正文<img src="img://hero"></p>' },
      new Map([['img://hero', 'https://image.woshipm.com/test.png']]),
    );
    expect(result).toEqual({ draftId: '42', draftUrl: 'https://www.woshipm.com/writing?pid=42' });
    expect(fetch.mock.calls[0][1].body.get('post_content')).toContain('https://image.woshipm.com/test.png');
    expect(fetch.mock.calls[0][1].body.get('action')).toBe('add_draft');
  });

  it('rejects a draft URL on an unexpected host', async () => {
    const adapter = createWoshipmAdapter();
    await expect(adapter.saveDraft(
      { fetch: async () => new Response(JSON.stringify({ post_id: 42, url: 'https://evil.example/draft' })), withHeaderRules: withRules },
      { title: '标题', semanticHtml: '<p>正文</p>' }, new Map(),
    )).rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
  });

  it('marks an interrupted create as unknown remote state', async () => {
    const adapter = createWoshipmAdapter();
    await expect(adapter.saveDraft(
      { fetch: async () => { throw new TypeError('Failed to fetch'); }, withHeaderRules: withRules },
      { title: '标题', semanticHtml: '<p>正文</p>' }, new Map(),
    )).rejects.toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', retryable: false });
  });
});
```

- [ ] **Step 3: Run the focused test and verify the adapter is absent**

Run: `npm test -- --run extension/tests/adapters/woshipm.test.js`

Expected: FAIL with `Failed to load url ../../src/adapters/woshipm.js`.

- [ ] **Step 4: Implement the 人人 auth, upload, and draft flow**

```js
// extension/src/adapters/woshipm.js
import { applyImageMap } from '../core/adapter-contract.js';
import { PlatformError, remoteStateError } from '../core/platform-errors.js';

const RULES = [{
  id: 4001, priority: 1,
  action: { type: 'modifyHeaders', requestHeaders: [{ header: 'X-Requested-With', operation: 'set', value: 'XMLHttpRequest' }] },
  condition: { regexFilter: '^https://www\\.woshipm\\.com/(?:wp-admin/admin-ajax\\.php|api2/|tensorflow/upyun/upload)', resourceTypes: ['xmlhttprequest'] },
}];

function assertDraftUrl(value, draftId) {
  const url = new URL(value || `https://www.woshipm.com/writing?pid=${encodeURIComponent(draftId)}`);
  if (url.protocol !== 'https:' || url.hostname !== 'www.woshipm.com') throw new PlatformError('PLATFORM_CHANGED', '人人草稿响应返回了未批准地址');
  return url.href;
}

export function createWoshipmAdapter() {
  let jltoken = '';
  return {
    id: 'woshipm', name: '人人都是产品经理', loginUrl: 'https://www.woshipm.com/login.html',
    async checkAuth(runtime) {
      return runtime.withHeaderRules(RULES, async () => {
        const page = await runtime.fetch('https://www.woshipm.com/writing');
        if ([401, 403].includes(page.status)) return { authenticated: false };
        const html = await page.text();
        jltoken = html.match(/"jltoken"\s*:\s*"([^"]+)"/)?.[1] || '';
        const uid = html.match(/var\s+userSettings\s*=\s*\{[^}]*"uid"\s*:\s*"(\d+)"/)?.[1];
        if (!uid) return { authenticated: false };
        const response = await runtime.fetch(`https://www.woshipm.com/api2/user/profile?uid=${encodeURIComponent(uid)}`);
        let data;
        try { data = await response.json(); }
        catch (_error) { return { authenticated: false }; }
        const user = data?.RESULT?.userInfoVo;
        return data?.CODE === 200 && user?.uid
          ? { authenticated: true, userId: String(user.uid), username: user.nickName || '' }
          : { authenticated: false };
      });
    },

    async uploadImage(runtime, blob, filename) {
      return runtime.withHeaderRules(RULES, async () => {
        const form = new FormData();
        form.append('action', 'wpuf_insert_image');
        form.append('name', filename);
        form.append('files', blob, filename);
        const response = await runtime.fetch('https://www.woshipm.com/tensorflow/upyun/upload', {
          method: 'POST', body: form,
          headers: { ...(jltoken ? { jlstar: `Bearer ${jltoken}` } : {}) },
        });
        if ([401, 403].includes(response.status)) throw new PlatformError('AUTH_REQUIRED', '人人登录已失效', { retryable: true });
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); }
        catch (_error) { throw new PlatformError('PLATFORM_CHANGED', '人人图片响应格式已变化', { httpStatus: response.status, remoteSummary: text }); }
        const imageUrl = data?.data?.[0]?.url;
        if (!imageUrl) throw new PlatformError(data?.error ? 'IMAGE_UPLOAD_FAILED' : 'PLATFORM_CHANGED', data?.error || '人人图片响应缺少 URL', { retryable: Boolean(data?.error) });
        const parsed = new URL(imageUrl);
        if (parsed.protocol !== 'https:' || !(parsed.hostname === 'image.woshipm.com' || parsed.hostname.endsWith('.woshipm.com'))) {
          throw new PlatformError('PLATFORM_CHANGED', '人人图片响应返回了未批准地址');
        }
        return imageUrl;
      });
    },

    async saveDraft(runtime, article, imageMap) {
      return runtime.withHeaderRules(RULES, async () => {
        let response;
        try {
          response = await runtime.fetch('https://www.woshipm.com/wp-admin/admin-ajax.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              action: 'add_draft',
              post_title: article.title,
              post_content: applyImageMap(article.semanticHtml, imageMap),
            }),
          });
        } catch (error) {
          throw remoteStateError(error, '无法确认人人是否已创建草稿');
        }
        if ([401, 403].includes(response.status)) throw new PlatformError('AUTH_REQUIRED', '人人登录已失效', { retryable: true });
        const text = await response.text();
        let data;
        try { data = JSON.parse(text); }
        catch (_error) { throw new PlatformError('PLATFORM_CHANGED', '人人草稿响应格式已变化', { httpStatus: response.status, remoteSummary: text }); }
        if (!response.ok) throw new PlatformError('DRAFT_CREATE_FAILED', `人人草稿创建失败: ${response.status}`, { httpStatus: response.status, retryable: true });
        if (!data.post_id) throw new PlatformError(data.error ? 'DRAFT_CREATE_FAILED' : 'PLATFORM_CHANGED', data.error || '人人草稿响应缺少 post_id', { retryable: Boolean(data.error) });
        const draftId = String(data.post_id);
        return { draftId, draftUrl: assertDraftUrl(data.url, draftId) };
      });
    },
  };
}
```

- [ ] **Step 5: Register all adapter factories in the service worker**

Add these imports after the existing service-worker imports:

```js
import { createWeixinAdapter } from '../adapters/weixin.js';
import { createZhihuAdapter } from '../adapters/zhihu.js';
import { createJuejinAdapter } from '../adapters/juejin.js';
import { createWoshipmAdapter } from '../adapters/woshipm.js';
```

Add the registry after `PORT_NAME`:

```js
export const ADAPTER_FACTORIES = Object.freeze({
  weixin: createWeixinAdapter,
  zhihu: createZhihuAdapter,
  juejin: createJuejinAdapter,
  woshipm: createWoshipmAdapter,
});
```

Change the registration signature and automatic registration to use the complete registry:

```diff
-export function registerServiceWorker(chromeApi = chrome, adapterFactories = {}) {
+export function registerServiceWorker(chromeApi = chrome, adapterFactories = ADAPTER_FACTORIES) {

-if (globalThis.chrome?.runtime?.onConnect) registerServiceWorker(chrome, {});
+if (globalThis.chrome?.runtime?.onConnect) registerServiceWorker(chrome, ADAPTER_FACTORIES);
```

Append this assertion to `extension/tests/service-worker.test.js` and add `ADAPTER_FACTORIES` to its import:

```js
it('registers exactly the four approved adapters', () => {
  expect(Object.keys(ADAPTER_FACTORIES)).toEqual(['weixin', 'zhihu', 'juejin', 'woshipm']);
});
```

- [ ] **Step 6: Run all adapter and task-lifecycle tests together**

Run:

```bash
npm test -- --run extension/tests/adapters/weixin.test.js extension/tests/adapters/zhihu.test.js extension/tests/adapters/juejin.test.js extension/tests/adapters/woshipm.test.js extension/tests/distribution-runner.test.js extension/tests/service-worker.test.js extension/tests/article-validator.test.js extension/tests/platform-errors.test.js extension/tests/header-rules.test.js extension/tests/core-crypto.test.js
node --check extension/src/background/service-worker.js
```

Expected: all tests PASS and the service worker syntax check exits 0.

- [ ] **Step 7: Run authenticated 人人 acceptance**

With only 人人 selected in the panel, sync an article containing local images, a table, code block, list, and quote, and verify the Network panel contacts no other platform host. Verify one unpublished draft opens, the title and semantic structure are intact, all images use approved 人人 hosts, no `img://`, `blob:`, arbitrary external link, inline OpenGZH theme style, `jltoken`, or article body is stored by the extension.

Expected: one editable draft; an image failure prevents the draft request entirely.

- [ ] **Step 8: Commit the fourth adapter and live registry**

```bash
git add extension/src/adapters/woshipm.js extension/tests/adapters/woshipm.test.js extension/tests/fixtures/woshipm-profile.json extension/src/background/service-worker.js extension/tests/service-worker.test.js
git commit -m "feat: add woshipm draft adapter"
```

### Task 11: Build and inspect the standalone extension package

**Files:**
- Create: `extension/assets/icon-16.png`
- Create: `extension/assets/icon-48.png`
- Create: `extension/assets/icon-128.png`
- Create: `scripts/build-extension.mjs`
- Create: `scripts/__tests__/build-extension.test.js`
- Modify: `package.json`

- [ ] **Step 1: Generate the three local extension icons from the existing square OpenGZH logo**

Run:

```bash
mkdir -p extension/assets
sips -z 16 16 assets/images/logo.png --out extension/assets/icon-16.png
sips -z 48 48 assets/images/logo.png --out extension/assets/icon-48.png
sips -z 128 128 assets/images/logo.png --out extension/assets/icon-128.png
sips -g pixelWidth -g pixelHeight extension/assets/icon-16.png extension/assets/icon-48.png extension/assets/icon-128.png
```

Expected: the final command reports `16 x 16`, `48 x 48`, and `128 x 128`; all inputs are local and no image-generation/runtime dependency is added.

- [ ] **Step 2: Write failing build allowlist and Manifest-validation tests**

```js
// scripts/__tests__/build-extension.test.js
import { describe, expect, it } from 'vitest';
import { shouldCopyExtensionPath, validateExtensionManifest } from '../build-extension.mjs';

const manifest = {
  manifest_version: 3,
  name: 'OpenGZH',
  short_name: 'OpenGZH',
  description: '微信公众号、知乎、掘金、人人都是产品经理文章同步助手',
  version: '0.1.0',
  permissions: ['storage', 'declarativeNetRequestWithHostAccess'],
  host_permissions: [
    'https://mp.weixin.qq.com/*',
    'https://www.zhihu.com/*',
    'https://zhuanlan.zhihu.com/*',
    'https://api.zhihu.com/*',
    'https://zhihu-pics-upload.zhimg.com/*',
    'https://juejin.cn/*',
    'https://api.juejin.cn/*',
    'https://imagex.bytedanceapi.com/*',
    'https://*.volces.com/*',
    'https://www.woshipm.com/*',
  ],
};

describe('extension build', () => {
  it.each([
    ['src/background/service-worker.js', true],
    ['assets/icon-128.png', true],
    ['tests/adapters/weixin.test.js', false],
    ['src/background/service-worker.js.map', false],
    ['.DS_Store', false],
    ['account.har', false],
    ['.env', false],
  ])('filters %s', (path, expected) => {
    expect(shouldCopyExtensionPath(path)).toBe(expected);
  });

  it('accepts only the locked identity and safe permissions', () => {
    expect(() => validateExtensionManifest(manifest)).not.toThrow();
    expect(() => validateExtensionManifest({ ...manifest, permissions: [...manifest.permissions, 'cookies'] })).toThrowError(/权限/);
    expect(() => validateExtensionManifest({ ...manifest, host_permissions: manifest.host_permissions.slice(1) })).toThrowError(/域名/);
    expect(() => validateExtensionManifest({ ...manifest, optional_host_permissions: ['https://mp.weixin.qq.com/*'] })).toThrowError(/可选域名/);
    expect(() => validateExtensionManifest({ ...manifest, version: '0.1.1' })).toThrowError(/版本/);
  });
});
```

- [ ] **Step 3: Run the build test and verify the script is absent**

Run: `npm test -- --run scripts/__tests__/build-extension.test.js`

Expected: FAIL with `Failed to load url ../build-extension.mjs`.

- [ ] **Step 4: Implement exact-target copy, zip, and archive inspection**

```js
// scripts/build-extension.mjs
import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, '..');
const SOURCE_DIR = path.join(REPOSITORY_ROOT, 'extension');
const DIST_DIR = path.join(REPOSITORY_ROOT, 'dist');
const OUTPUT_DIR = path.join(DIST_DIR, 'extension');
const VERSION = '0.1.0';
const ARCHIVE_PATH = path.join(DIST_DIR, `OpenGZH-extension-v${VERSION}.zip`);
const FORBIDDEN_PERMISSIONS = ['<all_urls>', 'cookies', 'unlimitedStorage'];
const REQUIRED_HOST_PERMISSIONS = Object.freeze([
  'https://mp.weixin.qq.com/*',
  'https://www.zhihu.com/*',
  'https://zhuanlan.zhihu.com/*',
  'https://api.zhihu.com/*',
  'https://zhihu-pics-upload.zhimg.com/*',
  'https://juejin.cn/*',
  'https://api.juejin.cn/*',
  'https://imagex.bytedanceapi.com/*',
  'https://*.volces.com/*',
  'https://www.woshipm.com/*',
]);

export function shouldCopyExtensionPath(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  return !normalized.split('/').includes('tests')
    && !normalized.endsWith('.map')
    && !normalized.endsWith('.har')
    && !normalized.split('/').includes('.DS_Store')
    && !normalized.split('/').includes('.env');
}

export function validateExtensionManifest(manifest) {
  if (manifest.manifest_version !== 3) throw new Error('Manifest 必须是 MV3');
  if (manifest.name !== 'OpenGZH' || manifest.short_name !== 'OpenGZH') throw new Error('插件名称错误');
  if (manifest.description !== '微信公众号、知乎、掘金、人人都是产品经理文章同步助手') throw new Error('插件副标题错误');
  if (manifest.version !== VERSION) throw new Error(`插件版本必须是 ${VERSION}`);
  if (JSON.stringify(manifest.host_permissions) !== JSON.stringify(REQUIRED_HOST_PERMISSIONS)) {
    throw new Error('Manifest 必须且只能包含已锁定的平台域名');
  }
  if (manifest.optional_host_permissions) throw new Error('Manifest 不得使用无法由 content script 可靠请求的可选域名权限');
  const serialized = JSON.stringify(manifest);
  if (FORBIDDEN_PERMISSIONS.some((permission) => serialized.includes(permission))) throw new Error('Manifest 包含禁止权限');
  if (manifest.externally_connectable) throw new Error('禁止 externally_connectable');
  return manifest;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) throw new Error(`${command} 失败: ${(result.stderr || result.stdout).trim()}`);
  return result.stdout;
}

async function assertIcons() {
  for (const size of [16, 48, 128]) await stat(path.join(SOURCE_DIR, 'assets', `icon-${size}.png`));
}

async function copyRuntime() {
  const expectedOutput = path.join(REPOSITORY_ROOT, 'dist', 'extension');
  if (OUTPUT_DIR !== expectedOutput) throw new Error('拒绝清理未批准目录');
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(DIST_DIR, { recursive: true });
  await cp(SOURCE_DIR, OUTPUT_DIR, {
    recursive: true,
    filter(source) {
      const relative = path.relative(SOURCE_DIR, source);
      return !relative || shouldCopyExtensionPath(relative);
    },
  });
}

function inspectArchive() {
  const archivedManifest = JSON.parse(run('/usr/bin/unzip', ['-p', ARCHIVE_PATH, 'extension/manifest.json']));
  validateExtensionManifest(archivedManifest);
  const listing = run('/usr/bin/unzip', ['-Z1', ARCHIVE_PATH]);
  for (const forbidden of ['/tests/', '.DS_Store', '.map', '.har', '/.env']) {
    if (listing.includes(forbidden)) throw new Error(`压缩包包含禁止文件: ${forbidden}`);
  }
  for (const required of [
    'extension/manifest.json',
    'extension/src/content/open-gzh.js',
    'extension/src/background/service-worker.js',
    'extension/assets/icon-128.png',
  ]) {
    if (!listing.split('\n').includes(required)) throw new Error(`压缩包缺少文件: ${required}`);
  }
}

export async function buildExtension() {
  const manifest = JSON.parse(await readFile(path.join(SOURCE_DIR, 'manifest.json'), 'utf8'));
  validateExtensionManifest(manifest);
  await assertIcons();
  await copyRuntime();
  await rm(ARCHIVE_PATH, { force: true });
  run('/usr/bin/zip', ['-X', '-r', path.basename(ARCHIVE_PATH), 'extension'], { cwd: DIST_DIR });
  inspectArchive();
  return ARCHIVE_PATH;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  buildExtension()
    .then((archive) => console.log(`Built ${path.relative(REPOSITORY_ROOT, archive)}`))
    .catch((error) => { console.error(error.message); process.exitCode = 1; });
}
```

- [ ] **Step 5: Add explicit extension scripts without changing dependencies**

Update only the `scripts` object in `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:extension": "vitest run extension/tests scripts/__tests__/build-extension.test.js",
    "build:extension": "node scripts/build-extension.mjs"
  }
}
```

- [ ] **Step 6: Run the test and build the real release archive**

Run:

```bash
npm test -- --run scripts/__tests__/build-extension.test.js extension/tests/manifest.test.js
npm run build:extension
/usr/bin/unzip -t dist/OpenGZH-extension-v0.1.0.zip
/usr/bin/unzip -p dist/OpenGZH-extension-v0.1.0.zip extension/manifest.json
```

Expected:

- tests PASS;
- build prints `Built dist/OpenGZH-extension-v0.1.0.zip`;
- archive test ends with `No errors detected`;
- archived Manifest is MV3, version `0.1.0`, name `OpenGZH`, the exact Chinese description, exactly the ten locked required host patterns, and neither broad URL nor Cookie permissions.

- [ ] **Step 7: Commit source icons and reproducible packaging**

```bash
git add package.json extension/assets/icon-16.png extension/assets/icon-48.png extension/assets/icon-128.png scripts/build-extension.mjs scripts/__tests__/build-extension.test.js
git commit -m "build: package opengzh mv3 extension"
```

Do not add `dist/`; it remains ignored and reproducible from the committed source.

### Task 12: Complete automated, installed-extension, and real-platform acceptance

**Files:**
- Create: `extension/REAL-BROWSER-ACCEPTANCE.md`
- Verify: all website, extension, build, and archive files

- [ ] **Step 1: Create the exact acceptance record before testing**

```markdown
# OpenGZH Extension 0.1.0 Real-Browser Acceptance

**Acceptance date:** 2026-08-24
**Website origin:** `http://localhost:8080`
**Production origin:** `https://opengzh.pasca.fun`
**Installed source:** `dist/extension`
**Release archive:** `dist/OpenGZH-extension-v0.1.0.zip`

## Installation evidence

- [ ] `npm run build:extension` completed immediately before installation.
- [ ] `chrome://extensions` was opened and the previous installed copy was removed or reloaded.
- [ ] The unpacked path is the current repository's `dist/extension`.
- [ ] Chrome displays name `OpenGZH`, version `0.1.0`, and description `微信公众号、知乎、掘金、人人都是产品经理文章同步助手`.
- [ ] The packaged/Web Store install surface discloses platform-host access once; for this unpacked build, extension details list exactly the ten locked required host patterns, no all-sites access, and no Cookie permission.
- [ ] The OpenGZH page shows “同步到平台” beside “复制到公众号”; an unrelated site shows no injected UI.

## Disposable article fixtures

### Fixture A — text only

Title: `OpenGZH Sync Text 2026-08-24`

Body contains one H1, two paragraphs, an unordered list, an ordered list, a quote, and a JavaScript code block.

### Fixture B — rich local media

Title: `OpenGZH Sync Rich Media 2026-08-24`

Body contains one local PNG, one local JPEG, one local GIF, one Markdown table, one formula, one semantic OpenGZH card, and one `<!-- xhs-page -->` marker. All three local images are present in `WechatEditorImages/images` before sync.

## Cross-platform result matrix

| Platform | Auth/text draft | Rich draft | Logged-out state | Draft editor opened | Title/structure/images | No unsafe image refs | Never published |
|---|---|---|---|---|---|---|---|
| 微信公众号 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 知乎 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 掘金 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 人人都是产品经理 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

For every successful cell, record the disposable draft ID below without copying a credential-bearing query string:

- 微信公众号 draft ID:
- 知乎 draft ID:
- 掘金 draft ID:
- 人人都是产品经理 draft ID:

## Isolation, retry, and failure checks

- [ ] Four selected platforms execute in order: 微信公众号 → 知乎 → 掘金 → 人人都是产品经理.
- [ ] All successful editors first open as inactive tabs; the first successful editor becomes active after the batch ends.
- [ ] Blocking one platform's draft endpoint makes only that platform fail; later platforms continue.
- [ ] Clicking “重新检测” retries only its failed/auth-required platform and never reruns a successful platform.
- [ ] Interrupting a create request after send shows unknown remote state, disables automatic retry, and asks for a manual draft-box check.
- [ ] Deleting a disposable Fixture B image from IndexedDB before streaming produces `IMAGE_READ_FAILED` and creates no draft on that platform.
- [ ] A plain external image produces `IMAGE_NOT_LOCAL` before any platform write.
- [ ] A hostile Zhihu/ImageX upload host produces `PLATFORM_CHANGED` before a request reaches that host.
- [ ] In a disposable Chrome profile, use extension site-access controls or enterprise policy to withhold one locked required platform host; the service-worker preflight produces `PERMISSION_DENIED` before opening a login page or sending article data. Restore access before continuing.

## Privacy and storage inspection

- [ ] `chrome.storage.local` contains only `opengzh.selectedPlatformIds` for this feature.
- [ ] `chrome.storage.session` contains task ID, platform ID, state, draft ID, sanitized draft URL, and safe error fields only.
- [ ] No storage value contains article title/body, image bytes, Cookie, token, ticket, CSRF, `jltoken`, AccessKey, SecretKey, SessionToken, Authorization, or upload auth.
- [ ] Extension service-worker logs contain only platform ID, phase, HTTP status, and safe error code.
- [ ] No request sends article or platform-session data to `opengzh.pasca.fun` or another OpenGZH-owned server.

## Existing OpenGZH regression checks

- [ ] With the extension disabled, the website has no sync button and all original editor behavior remains available.
- [ ] “复制到公众号” still writes HTML and plain text to the clipboard.
- [ ] Fixture B pasted into the real WeChat editor preserves list/card/link/table/formula/GIF behavior at the accepted baseline.
- [ ] Input still auto-saves after approximately five seconds and reload restores the active document.
- [ ] Existing localStorage keys and `WechatEditorImages/images` remain unchanged.
- [ ] Small-red-book image mode is unaffected and is not offered by the extension.

## Release and rollback

- [ ] `/usr/bin/unzip -t dist/OpenGZH-extension-v0.1.0.zip` reports no errors.
- [ ] The archive contains no tests, source maps, `.DS_Store`, HAR, environment file, local account data, Wechatsync code, remote script, or third-party runtime.
- [ ] Disabling/uninstalling the extension removes the sync entry without changing OpenGZH documents or remote drafts.
- [ ] Existing remote drafts remain untouched after rollback; “复制到公众号” remains the WeChat fallback.
```

- [ ] **Step 2: Run the complete automated suite from a clean dependency state**

Run:

```bash
npm ci
npm test
find assets/scripts extension/src scripts -type f \( -name '*.js' -o -name '*.mjs' \) -print0 | while IFS= read -r -d '' file; do node --check "$file" || exit 1; done
git diff --check
```

Expected: `npm ci` exits 0, every Vitest test passes, every native JavaScript file passes `node --check`, and `git diff --check` emits no output.

- [ ] **Step 3: Verify security invariants mechanically**

Run:

```bash
rg -n '(optional_host_permissions|<all_urls>|"cookies"|"unlimitedStorage"|externally_connectable|eval\(|new Function)' extension/manifest.json extension/src
rg -n '<script[^>]+src="https?://' extension/manifest.json extension/src
rg -n '(chrome\.permissions|permissions\.request)' extension/src/content
rg -n '(Cookie|token|ticket|csrf|jltoken|AccessKey|SecretKey|SessionToken|Authorization)' extension/src
```

Expected:

- the first three commands exit 1 with no matches;
- the fourth command finds only parsers, in-memory variables, fixed request construction, and redaction rules—no `chrome.storage.*.set` payload containing these values and no console call that includes their values.

- [ ] **Step 4: Build, reload, and verify the installed extension rather than only source files**

Run:

```bash
npm run build:extension
python -m http.server 8080
```

Then:

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Remove an older OpenGZH extension copy or click its Reload control.
4. Load `/Users/pasca/工作事项/产品学堂/OpenGZH/dist/extension` unpacked.
5. Open `http://localhost:8080`, hard-refresh, and complete the “Installation evidence” section.

Expected: installed identity and injection match the record. Merely inspecting `dist/extension` does not satisfy this step.

- [ ] **Step 5: Execute the four-platform acceptance matrix with disposable drafts**

For each platform, perform these actions in order and tick the corresponding matrix cells only after inspecting the platform editor:

1. While authenticated, sync Fixture A to that platform alone.
2. While authenticated, sync Fixture B to that platform alone.
3. Log out or expire that platform session, click “重新检测”, verify `AUTH_REQUIRED`, and use “前往登录” only by explicit click.
4. Log back in, click “重新检测”, and verify only that platform retries.
5. Compare title, headings, paragraphs, list order, quote, code block, table, formula/card fallback, and image count to the locked OpenGZH snapshot.
6. Search the draft source/DOM for `img://`, `blob:`, `data-image-id`, `:::ogzh-card`, `<!-- xhs-page -->`, and unapproved external image hosts.
7. Verify the article is still a draft and has not been published/submitted.

Expected: all matrix cells pass. If a private API differs, record `PLATFORM_CHANGED`, keep the adapter fail-closed, update its sanitized fixture and unit test, rebuild, reload, and repeat only that platform.

- [ ] **Step 6: Execute isolation, unknown-state, privacy, regression, and rollback checks**

Use the extension service-worker DevTools to block exactly one selected platform's draft-create request for the partial-failure case, and abort a separate disposable create request after send for the unknown-state case. Use a disposable copy of Fixture B when deleting an IndexedDB image. Inspect `chrome.storage.local`, `chrome.storage.session`, the service-worker console, and Network panel. Paste Fixture B through the unchanged “复制到公众号” path into the real WeChat editor. Finally disable the extension and refresh OpenGZH.

Expected: every checkbox in the four remaining acceptance sections is checked. Do not claim WeChat clipboard compatibility from unit tests or local `ClipboardItem` inspection alone.

- [ ] **Step 7: Rebuild the final archive after the last acceptance fix**

Run:

```bash
npm test
npm run build:extension
/usr/bin/unzip -t dist/OpenGZH-extension-v0.1.0.zip
git diff --check
git status --short
```

Expected: all tests pass, archive integrity passes, diff check is empty, and `git status --short` shows only intentional feature files plus the pre-existing `.claude/settings.json` modification. `dist/` remains ignored.

- [ ] **Step 8: Commit the completed acceptance record**

```bash
git add extension/REAL-BROWSER-ACCEPTANCE.md
git commit -m "test: record extension browser acceptance"
```

Do not mark this task complete if any acceptance checkbox remains unchecked. A private-interface mismatch is a failed adapter acceptance, not permission to widen host access or claim partial completion as MVP completion.

## Spec coverage matrix

| Approved specification requirement | Implemented by | Automated proof | Installed/manual proof |
|---|---|---|---|
| Plugin name, short name, Chinese subtitle, version `0.1.0` | Task 4, Task 11 | `manifest.test.js`, `build-extension.test.js` | Task 12 installation evidence |
| Entry beside “复制到公众号”; absent without extension; Shadow DOM isolation | Task 3, Task 5 | `extension-bridge.test.js`, `content-script.test.js` | Task 12 installation/regression |
| Default four selections and selection-only local persistence | Task 5 | `content-script.test.js` | Task 12 storage inspection |
| Flush latest render and freeze title/body/image snapshot | Task 1, Task 3 | `article-package.test.js` | Task 12 draft comparison |
| Raw, portable, semantic, and WeChat content fields | Task 1, Task 2 | article and clipboard tests | Four-platform rich fixture |
| Preserve existing WeChat copy compatibility | Task 2 | clipboard/table/card/GIF tests | Real WeChat paste in Task 12 |
| IndexedDB and generated images; fail external/unreadable images closed | Task 1, Task 4, Task 5 | package/validator/content tests | Task 12 image-failure cases |
| Fixed page events and named long-lived port | Task 3, Task 5 | bridge/content tests | Installed extension flow |
| Validate top frame, sender origin, schema, and platform ID | Task 4, Task 6 | validator/worker tests | Unrelated-site injection check |
| Stream one image at a time and release after upload | Task 5, Task 6 | serial responder/runner tests | Rich fixture progress |
| Fixed serial order and isolated per-platform results | Task 6 | runner tests | Four-platform isolation case |
| Auth-required behavior, explicit login click, per-platform retry | Task 5, Task 6 | content/runner/worker tests | Logged-out matrix |
| Success tabs background-opened, first success activated | Task 6 | service-worker test | Task 12 tab check |
| Session-only safe task result; no article/credential persistence | Task 4, Task 6, Task 7 | redaction/worker tests | Task 12 storage/network inspection |
| WeChat bootstrap/upload/draft/edit URL | Task 7 | `weixin.test.js` | WeChat text/rich/auth acceptance |
| Zhihu auth/upload/create/PATCH/resume/edit URL | Task 8 | `zhihu.test.js`, MD5 vectors | Zhihu interruption/resume acceptance |
| Juejin auth/CSRF/ImageX/upload/draft/edit URL | Task 9 | `juejin.test.js`, SigV4/CRC32 vectors | Juejin rich/host/redaction acceptance |
| 人人 auth/token/upload/draft/fallback edit URL | Task 10 | `woshipm.test.js` | 人人 rich/auth acceptance |
| Exact unified error codes, no blind retry after unknown remote state | Task 4, Task 6, Tasks 7-10 | error/runner/adapter tests | Unknown-state cases |
| Technical correction: exact required hosts, trusted-worker preflight, no content-script permission API or all-sites/Cookie/unlimited/external connection | Task 4, Task 5, Task 6, Task 11 | Manifest/content/worker/build tests | Install disclosure and withheld-access check |
| Temporary header rules always removed | Task 4, Tasks 7-10 | `header-rules.test.js` | Service-worker rules/log inspection |
| No auto-publish, review submission, metadata choice, or draft deletion | Tasks 7-10 | payload assertions | Every platform draft inspection |
| No server, remote code/config, telemetry, Wechatsync runtime, or third-party runtime | Tasks 1-11 | Manifest/build inspection | Network/archive inspection |
| Build, zip, archive validation, exclude local/test data | Task 11 | build tests | Task 12 archive inspection |
| Rollback by disabling/uninstalling; original copy fallback remains | Task 12 | website regression suite | Rollback checklist |

## Atomic commit sequence

1. `feat: add article distribution contract`
2. `refactor: separate wechat content preparation`
3. `feat: expose article snapshot bridge`
4. `feat: add mv3 security boundary`
5. `feat: add extension sync panel and image streaming`
6. `feat: add serial draft task lifecycle`
7. `feat: add wechat draft adapter`
8. `feat: add zhihu draft adapter`
9. `feat: add juejin draft adapter`
10. `feat: add woshipm draft adapter`
11. `build: package opengzh mv3 extension`
12. `test: record extension browser acceptance`

Each commit stages only the paths listed in its task. Never stage `.claude/settings.json`, `dist/`, live captures, credentials, HAR files, or unrelated worktree changes.
