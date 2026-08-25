# OpenGZH Persistent Distribution Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep one “同步到平台” button visible on the OpenGZH website and let the installed MV3 extension claim that click; otherwise show the confirmed Chrome Web Store fallback.

**Architecture:** The website owns the only visible trigger. A request/ack pair of DOM `CustomEvent`s detects the extension on every click without caching stale installation state. The content script keeps the existing Shadow DOM dialog and platform workflow but stops injecting its own trigger.

**Tech Stack:** Vue 3 CDN app, native ES modules, Chrome MV3 content script, Vitest, Node.js extension packager.

---

## File Structure

- Modify `assets/scripts/distribution/extension-bridge.js`: define open/opened event names and the request/ack timeout plus store fallback.
- Modify `assets/scripts/distribution/__tests__/extension-bridge.test.js`: cover matching acknowledgements, timeout fallback, URL validation, and cleanup.
- Modify `index.html`: render the permanent distribution button next to the existing copy button.
- Modify `assets/scripts/main.js`: connect the Vue click handler to the bridge and existing Toast.
- Modify `extension/src/content/open-gzh.js`: mount against the permanent button, remove the injected trigger, and acknowledge valid open requests only while the extension port is connected.
- Modify `extension/tests/content-script.test.js`: update the fake DOM and verify the new single-entry contract.

No dependency, Manifest permission, host match, platform adapter, or article snapshot contract changes are required.

### Task 1: Page-side open handshake and unavailable fallback

**Files:**
- Modify: `assets/scripts/distribution/extension-bridge.js`
- Test: `assets/scripts/distribution/__tests__/extension-bridge.test.js`

- [ ] **Step 1: Write failing tests for acknowledgement and timeout cleanup**

Add `requestDistributionOpen` to the test import and add these cases:

```js
it('resolves only for a matching extension acknowledgement and cleans the listener', async () => {
  vi.useFakeTimers();
  const target = createEventTarget();
  const notifyUnavailable = vi.fn();
  const pending = requestDistributionOpen({
    target,
    CustomEventCtor: TestCustomEvent,
    requestId: 'open-1',
    timeoutMs: 500,
    storeUrl: '',
    notifyUnavailable
  });

  expect(target.dispatchEvent).toHaveBeenLastCalledWith(expect.objectContaining({
    type: PAGE_EVENTS.open,
    detail: { requestId: 'open-1' }
  }));
  target.dispatchEvent(new TestCustomEvent(PAGE_EVENTS.opened, { detail: { requestId: 'other' } }));
  expect(target.listeners.has(PAGE_EVENTS.opened)).toBe(true);
  target.dispatchEvent(new TestCustomEvent(PAGE_EVENTS.opened, { detail: { requestId: 'open-1' } }));

  await expect(pending).resolves.toBe(true);
  expect(notifyUnavailable).not.toHaveBeenCalled();
  expect(target.listeners.has(PAGE_EVENTS.opened)).toBe(false);
});

it('shows the launch toast after 500ms when the store URL is empty', async () => {
  vi.useFakeTimers();
  const target = createEventTarget();
  const notifyUnavailable = vi.fn();
  const openWindow = vi.fn();
  const pending = requestDistributionOpen({
    target,
    CustomEventCtor: TestCustomEvent,
    requestId: 'open-2',
    timeoutMs: 500,
    storeUrl: '',
    notifyUnavailable,
    openWindow
  });

  await vi.advanceTimersByTimeAsync(500);

  await expect(pending).resolves.toBe(false);
  expect(notifyUnavailable).toHaveBeenCalledTimes(1);
  expect(openWindow).not.toHaveBeenCalled();
  expect(target.listeners.has(PAGE_EVENTS.opened)).toBe(false);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npx vitest run assets/scripts/distribution/__tests__/extension-bridge.test.js
```

Expected: FAIL because `requestDistributionOpen` and `PAGE_EVENTS.open/opened` do not exist.

- [ ] **Step 3: Write failing tests for store URL handling and stale acknowledgements**

Add:

```js
it('opens only a valid Chrome Web Store URL when the extension is unavailable', async () => {
  vi.useFakeTimers();
  const openWindow = vi.fn();
  const notifyUnavailable = vi.fn();
  const pending = requestDistributionOpen({
    target: createEventTarget(),
    CustomEventCtor: TestCustomEvent,
    requestId: 'open-store',
    timeoutMs: 500,
    storeUrl: 'https://chromewebstore.google.com/detail/opengzh/example',
    openWindow,
    notifyUnavailable
  });

  await vi.advanceTimersByTimeAsync(500);
  await expect(pending).resolves.toBe(false);
  expect(openWindow).toHaveBeenCalledWith(
    'https://chromewebstore.google.com/detail/opengzh/example',
    '_blank',
    'noopener'
  );
  expect(notifyUnavailable).not.toHaveBeenCalled();
});

it.each(['javascript:alert(1)', 'https://example.com/opengzh'])('treats an unsafe store URL as empty: %s', async (storeUrl) => {
  vi.useFakeTimers();
  const notifyUnavailable = vi.fn();
  const openWindow = vi.fn();
  const pending = requestDistributionOpen({
    target: createEventTarget(),
    CustomEventCtor: TestCustomEvent,
    requestId: 'open-invalid',
    timeoutMs: 500,
    storeUrl,
    notifyUnavailable,
    openWindow
  });

  await vi.advanceTimersByTimeAsync(500);
  await pending;
  expect(notifyUnavailable).toHaveBeenCalledTimes(1);
  expect(openWindow).not.toHaveBeenCalled();
});
```

- [ ] **Step 4: Implement the minimal bridge behavior**

Extend the event map and add the function below `createDistributionBridgeLifecycle`:

```js
export const PAGE_EVENTS = Object.freeze({
  open: 'opengzh:distribution:open',
  opened: 'opengzh:distribution:opened',
  request: 'opengzh:distribution:request',
  ready: 'opengzh:distribution:ready',
  error: 'opengzh:distribution:error'
});

function safeStoreUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'chromewebstore.google.com' ? url.href : '';
  } catch {
    return '';
  }
}

export function requestDistributionOpen({
  target = document,
  CustomEventCtor = CustomEvent,
  requestId = crypto.randomUUID(),
  timeoutMs = 500,
  storeUrl = '',
  notifyUnavailable = () => {},
  openWindow = (url, name, features) => window.open(url, name, features)
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let timer;
    const cleanup = () => {
      clearTimeout(timer);
      target.removeEventListener(PAGE_EVENTS.opened, onOpened);
    };
    const finish = (available) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(available);
    };
    const onOpened = (event) => {
      if (event?.detail?.requestId === requestId) finish(true);
    };
    const unavailable = () => {
      const url = safeStoreUrl(storeUrl);
      if (url) openWindow(url, '_blank', 'noopener');
      else notifyUnavailable();
      finish(false);
    };

    target.addEventListener(PAGE_EVENTS.opened, onOpened);
    timer = setTimeout(unavailable, timeoutMs);
    try {
      target.dispatchEvent(new CustomEventCtor(PAGE_EVENTS.open, { detail: { requestId } }));
    } catch {
      unavailable();
    }
  });
}
```

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```bash
npx vitest run assets/scripts/distribution/__tests__/extension-bridge.test.js
```

Expected: all extension bridge tests PASS.

- [ ] **Step 6: Commit the page-side bridge**

```bash
git add assets/scripts/distribution/extension-bridge.js assets/scripts/distribution/__tests__/extension-bridge.test.js
git commit -m "feat: add distribution extension handshake"
```

### Task 2: Permanent website button

**Files:**
- Modify: `index.html`
- Modify: `assets/scripts/main.js`
- Test: `assets/scripts/distribution/__tests__/extension-bridge.test.js`

- [ ] **Step 1: Write a failing static integration test**

Read `index.html` beside the existing `mainSource` fixture, then add:

```js
const indexSource = readFileSync(fileURLToPath(new URL('../../../../index.html', import.meta.url)), 'utf8');

it('keeps one distribution entry in the website and wires it to the bridge', () => {
  expect(indexSource.match(/data-opengzh-distribution-button/g)).toHaveLength(1);
  expect(indexSource).toContain('@click="openDistribution"');
  expect(indexSource).toContain('同步到平台');
  expect(mainSource).toContain("const OPENGZH_EXTENSION_STORE_URL = '';");
  expect(mainSource).toContain('requestDistributionOpen({');
  expect(mainSource).toContain("toast.show('OpenGZH 插件即将上线 Chrome 商店', 'info'");
  expect(mainSource).toContain('openDistribution,');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npx vitest run assets/scripts/distribution/__tests__/extension-bridge.test.js
```

Expected: FAIL because the permanent button and Vue handler do not exist.

- [ ] **Step 3: Add the permanent website button**

Insert this immediately before the existing `data-opengzh-copy-button` button:

```html
<button
  data-opengzh-distribution-button
  class="copy-btn"
  type="button"
  aria-haspopup="dialog"
  aria-expanded="false"
  @click="openDistribution"
>
  <svg class="lucide lucide-send" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg>
  同步到平台
</button>
```

Do not change the existing “复制到公众号” button or its disabled behavior.

- [ ] **Step 4: Wire the Vue handler to the bridge and Toast**

Add `requestDistributionOpen` to the existing distribution import, define the store constant near the other module constants, and add the handler beside `doCopy`:

```js
const OPENGZH_EXTENSION_STORE_URL = '';

async function openDistribution() {
  return requestDistributionOpen({
    storeUrl: OPENGZH_EXTENSION_STORE_URL,
    notifyUnavailable: () => toast.show('OpenGZH 插件即将上线 Chrome 商店', 'info', 4000)
  });
}
```

Return `openDistribution` from `setup()` beside `doCopy`.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
npx vitest run assets/scripts/distribution/__tests__/extension-bridge.test.js
```

Expected: all extension bridge and static integration tests PASS.

- [ ] **Step 6: Commit the permanent entry**

```bash
git add index.html assets/scripts/main.js assets/scripts/distribution/__tests__/extension-bridge.test.js
git commit -m "feat: keep distribution entry on website"
```

### Task 3: Let the extension claim the website button

**Files:**
- Modify: `extension/src/content/open-gzh.js`
- Test: `extension/tests/content-script.test.js`

- [ ] **Step 1: Update the fake document and write failing single-entry tests**

Change the fake selector from `data-opengzh-copy-button` to `data-opengzh-distribution-button`, then add tests that express the new contract:

```js
it('does not inject a second trigger button', async () => {
  const { createUi } = loadTestApi();
  const { doc, anchor } = makeUiDom();
  const ui = createUi({ document: doc, anchor, port: { postMessage: vi.fn() } });

  await ui.ready;

  const shell = ui.shadow.children.find((child) => child.className === 'opengzh-extension-shell');
  expect(shell.children.some((child) => child.className === 'opengzh-trigger')).toBe(false);
  expect(ui.trigger).toBeUndefined();
  expect(ui.shadow.children.find((child) => child.tagName === 'STYLE').textContent).not.toContain('.opengzh-trigger');
});

it('opens and acknowledges only a valid matching website request while connected', async () => {
  const { createUi, PAGE_EVENTS } = loadTestApi();
  const { doc, anchor } = makeUiDom();
  const port = { postMessage: vi.fn() };
  const ui = createUi({ document: doc, anchor, port, CustomEventCtor: FakeEvent });
  await ui.ready;

  doc.dispatchEvent(new FakeEvent(PAGE_EVENTS.open, { detail: { requestId: 42 } }));
  expect(doc.events.filter((event) => event.type === PAGE_EVENTS.opened)).toHaveLength(0);

  doc.dispatchEvent(new FakeEvent(PAGE_EVENTS.open, { detail: { requestId: 'open-1' } }));
  await vi.waitFor(() => expect(doc.events.filter((event) => event.type === PAGE_EVENTS.opened)).toHaveLength(1));

  expect(ui.backdrop.hidden).toBe(false);
  expect(anchor.attributes.get('aria-expanded')).toBe('true');
  expect(doc.events.filter((event) => event.type === PAGE_EVENTS.opened)[0].detail).toEqual({ requestId: 'open-1' });
});

it('does not acknowledge an open request without a connected extension port', async () => {
  const { createUi, PAGE_EVENTS } = loadTestApi();
  const { doc, anchor } = makeUiDom();
  const ui = createUi({ document: doc, anchor, port: null, CustomEventCtor: FakeEvent });
  await ui.ready;

  doc.dispatchEvent(new FakeEvent(PAGE_EVENTS.open, { detail: { requestId: 'open-offline' } }));
  await Promise.resolve();

  expect(doc.events.filter((event) => event.type === PAGE_EVENTS.opened)).toHaveLength(0);
  expect(ui.backdrop.hidden).toBe(true);
});
```

- [ ] **Step 2: Run the content-script tests and verify RED**

Run:

```bash
npx vitest run extension/tests/content-script.test.js
```

Expected: FAIL because the content script still injects `.opengzh-trigger` and does not handle open/opened events.

- [ ] **Step 3: Replace the injected trigger with the page event listener**

Make these focused changes in `createUi`:

```js
const PAGE_EVENTS = Object.freeze({
  open: 'opengzh:distribution:open',
  opened: 'opengzh:distribution:opened',
  request: 'opengzh:distribution:request',
  ready: 'opengzh:distribution:ready',
  error: 'opengzh:distribution:error',
});
```

Accept `CustomEventCtor = defaultEventCtor()` in `createUi`, remove construction and styling of `.opengzh-trigger`, and append only the backdrop to the Shadow DOM shell:

```js
const shell = doc.createElement('div');
shell.className = 'opengzh-extension-shell';
shell.append(backdrop);
```

Track connection state and use the permanent button for dialog state/focus:

```js
const state = {
  selected: PLATFORM_IDS.slice(),
  busy: false,
  taskId: null,
  retryTaskId: null,
  generation: 0,
  authRequestId: null,
  authPlatforms: [],
  authCompleted: new Set(),
  operationId: null,
  draftUrls: new Map(),
  portConnected: Boolean(port),
};

async function openPanel() {
  await ready;
  if (state.disposed || !state.portConnected) return false;
  panel.hidden = false;
  backdrop.hidden = false;
  anchor.setAttribute('aria-expanded', 'true');
  close.focus();
  if (!state.busy) sendCheckAuth();
  return true;
}

function closePanel() {
  backdrop.hidden = true;
  anchor.setAttribute('aria-expanded', 'false');
  anchor.focus();
}

async function onOpenRequest(event) {
  const requestId = event?.detail?.requestId;
  if (typeof requestId !== 'string' || !requestId.trim()) return;
  if (!await openPanel() || state.disposed) return;
  doc.dispatchEvent(new CustomEventCtor(PAGE_EVENTS.opened, { detail: { requestId } }));
}

listen(doc, PAGE_EVENTS.open, onOpenRequest);

const onPortDisconnect = () => {
  state.portConnected = false;
  finishTask('无法连接同步服务', { clearRetry: true });
};
```

Keep the existing close, backdrop, keyboard, start, and port message listeners. Remove `listen(trigger, 'click', openPanel)` and do not register any click listener on the website button.

- [ ] **Step 4: Mount against the permanent button and update lifecycle expectations**

In `createUi` and `boot`, query `[data-opengzh-distribution-button]`. Update fake anchors to use `dataset.opengzhDistributionButton`. Replace assertions about `ui.trigger` with assertions about the page `anchor`, and confirm `dispose()` removes the `PAGE_EVENTS.open` listener.

- [ ] **Step 5: Run the content-script tests and verify GREEN**

Run:

```bash
npx vitest run extension/tests/content-script.test.js
```

Expected: all content-script tests PASS with one website-owned trigger and the existing dialog behavior intact.

- [ ] **Step 6: Commit the extension claim behavior**

```bash
git add extension/src/content/open-gzh.js extension/tests/content-script.test.js
git commit -m "feat: let extension claim distribution entry"
```

### Task 4: Regression, package, and real-browser acceptance

**Files:**
- Modify only if the checks expose a defect in files already owned by Tasks 1–3.

- [ ] **Step 1: Run focused and full automated tests**

```bash
npx vitest run assets/scripts/distribution/__tests__/extension-bridge.test.js extension/tests/content-script.test.js
npm test
npm run test:extension
```

Expected: focused tests, the full Vitest suite, and extension suite all exit 0 with zero failures.

- [ ] **Step 2: Check syntax and whitespace**

```bash
node --check assets/scripts/distribution/extension-bridge.js
node --check assets/scripts/main.js
node --check extension/src/content/open-gzh.js
git diff --check
```

Expected: all commands exit 0 with no output from `git diff --check`.

- [ ] **Step 3: Build the MV3 extension and inspect the artifact**

```bash
npm run build:extension
node -e 'const fs=require("node:fs"); const m=JSON.parse(fs.readFileSync("dist/extension/manifest.json","utf8")); const s=fs.readFileSync("dist/extension/src/content/open-gzh.js","utf8"); if(m.manifest_version!==3||!s.includes("opengzh:distribution:open")||s.includes("className = '\''opengzh-trigger'\''")) process.exit(1)'
unzip -t dist/OpenGZH-extension-v0.1.0.zip
```

Expected: build exits 0, the packaged content script contains the handshake but no injected trigger construction, and the ZIP integrity check reports no errors.

- [ ] **Step 4: Verify without the extension in an isolated Chrome profile**

Serve the repository locally, open `http://127.0.0.1:8080/` in an isolated Chrome profile with no OpenGZH extension, and verify:

```text
Exactly one “同步到平台” button is visible beside “复制到公众号”.
Clicking it shows “OpenGZH 插件即将上线 Chrome 商店”.
No new tab or blank window opens.
```

- [ ] **Step 5: Verify with the unpacked extension loaded**

Load `dist/extension` through `chrome://extensions`, hard-refresh the local page, and verify:

```text
Exactly one “同步到平台” button remains visible.
Clicking it opens the existing OpenGZH four-platform dialog immediately.
No launch Toast appears.
Closing the dialog returns focus to the permanent website button.
```

Disable the extension, refresh, and verify the same button remains while the click returns to the launch Toast.

- [ ] **Step 6: Review the final diff and commit only any verification repair**

```bash
git status --short
git diff --stat HEAD~3..HEAD
git diff --check
```

Expected: only the planned source/tests plus the pre-existing `.claude/settings.json` and `extension/REAL-BROWSER-ACCEPTANCE.md` are present. If verification required no repair, do not create an empty commit.

## Rollout and Rollback

- Rollout: push the three feature commits after all checks pass; wait for `Deploy Website` to succeed; reload the unpacked extension before production acceptance.
- Rollback: revert the three feature commits in reverse order. The old extension-injected trigger behavior returns without changing platform drafts or remote data.
- Release boundary: a Git push deploys the website but does not install or reload the MV3 extension in Chrome.
