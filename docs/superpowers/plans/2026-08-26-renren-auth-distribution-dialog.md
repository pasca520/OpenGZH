# Renren Auth and Distribution Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correctly recognize the current logged-in Woshipm writing page and replace the unfinished browser-default distribution dialog with a compact, accessible status-led interface.

**Architecture:** Extend the existing fail-closed HTML parser with one additional approved top-level object shape, then keep the profile request as the authoritative identity check. Reuse the existing Shadow DOM, row state machine, focus trap, and port protocol; add semantic header/content/footer containers and derive every visible row action from the existing status key.

**Tech Stack:** Chrome Manifest V3, native JavaScript, Shadow DOM CSS, Vitest 3, existing fake DOM test harness.

---

## File map

- Modify `extension/src/adapters/woshipm.js`: parse the current top-level `PURE` authentication object without executing page JavaScript.
- Modify `extension/tests/adapters/woshipm.test.js`: lock down the current logged-in structure and fail-closed conflict cases.
- Modify `extension/src/content/open-gzh.js`: restructure and style the dialog; centralize status-driven row actions.
- Modify `extension/tests/content-script.test.js`: lock down semantic hierarchy, contextual actions, primary-button disabling, responsive CSS, and focus behavior.

No new runtime file or dependency is needed. The service worker protocol, platform order, Manifest, and the other three adapters remain unchanged.

### Task 1: Support the current Woshipm login structure

**Files:**
- Modify: `extension/tests/adapters/woshipm.test.js:6-238`
- Modify: `extension/src/adapters/woshipm.js:502-665`

- [ ] **Step 1: Add a failing current-page authentication test**

Add the current page shape next to the legacy fixture:

```js
const currentWritingPage = `<script>
  var PURE={is_user_logged_in:"1",user_id:"1585",jltoken:"current-jltoken"};
</script><script>var userSettings={url:"/",uid:"1585"};</script>`;
```

Add this test immediately after the legacy successful-authentication test:

```js
it('extracts the current PURE auth shape and verifies the matching profile', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(response(currentWritingPage))
    .mockResolvedValueOnce(response(JSON.stringify(profile)));

  const result = await createWoshipmAdapter().checkAuth({ fetch, withHeaderRules: withRules });

  expect(result).toEqual({ authenticated: true, userId: '1585', username: '测试用户' });
  expect(JSON.stringify(result)).not.toContain('current-jltoken');
  expect(fetch.mock.calls[1][0]).toBe('https://www.woshipm.com/api2/user/profile?uid=1585');
});
```

- [ ] **Step 2: Run the focused test and verify the exact regression is red**

Run:

```bash
npx vitest run extension/tests/adapters/woshipm.test.js -t "current PURE auth shape"
```

Expected: FAIL with `PLATFORM_CHANGED` and “人人登录页认证结构已变化”; the profile request is not reached.

- [ ] **Step 3: Add fail-closed tests for logout and conflicting structures**

Add:

```js
it('maps an explicit current-page logged-out marker to unauthenticated', async () => {
  const page = '<script>var PURE={is_user_logged_in:"0",user_id:"",jltoken:""};</script>';
  const fetch = vi.fn().mockResolvedValue(response(page));

  await expect(createWoshipmAdapter().checkAuth({ fetch, withHeaderRules: withRules }))
    .resolves.toEqual({ authenticated: false });
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('fails closed when current-page auth identities conflict or auth objects repeat', async () => {
  const pages = [
    '<script>var PURE={is_user_logged_in:"1",user_id:"999",jltoken:"token"}; var userSettings={uid:"1585"};</script>',
    '<script>var PURE={is_user_logged_in:"1",user_id:"1585",jltoken:"token"}; var PURE={is_user_logged_in:"1",user_id:"1585",jltoken:"token"}; var userSettings={uid:"1585"};</script>',
    '<script>window.settings={jltoken:"legacy"}; var PURE={is_user_logged_in:"1",user_id:"1585",jltoken:"current"}; var userSettings={uid:"1585"};</script>',
  ];

  for (const page of pages) {
    const fetch = vi.fn().mockResolvedValue(response(page));
    await expect(createWoshipmAdapter().checkAuth({ fetch, withHeaderRules: withRules }))
      .rejects.toMatchObject({ code: 'PLATFORM_CHANGED', retryable: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  }
});
```

- [ ] **Step 4: Implement the minimal approved `PURE` parser**

Extend `extractPageAuth()` without evaluating scripts. Keep `topLevelObjectAssignments()` and `parseObjectProperties()` as the only parsing seam:

```js
function extractPageAuth(html) {
  const result = {
    token: null,
    uid: null,
    sawUid: false,
    loggedIn: null,
    authUid: null,
    malformed: false,
  };
  const setToken = (value) => {
    const token = safeToken(value);
    if (!token || result.token !== null) result.malformed = true;
    else result.token = token;
  };

  for (const block of readScriptBlocks(html)) {
    if (block.malformed) {
      result.malformed = true;
      continue;
    }
    if (!isExecutableScript(block.attributes)) continue;
    const script = block.source;

    for (const assignment of topLevelObjectAssignments(script, /(?:^|[;}])\s*window\s*\.\s*settings\s*=\s*\{/giu)) {
      const properties = assignment.malformed ? null : parseObjectProperties(assignment.source);
      const property = properties?.get('jltoken');
      if (assignment.malformed || !properties || (property && property.type !== 'string')) result.malformed = true;
      else if (property) setToken(property.value);
    }

    for (const assignment of topLevelObjectAssignments(script, /(?:^|[;}])\s*var\s+PURE\s*=\s*\{/gu)) {
      const properties = assignment.malformed ? null : parseObjectProperties(assignment.source);
      const login = properties?.get('is_user_logged_in');
      const token = properties?.get('jltoken');
      const userId = properties?.get('user_id');
      const loginValue = login?.type === 'string' || login?.type === 'bare' ? String(login.value) : null;
      if (!properties || !['0', '1'].includes(loginValue) || result.loggedIn !== null) {
        result.malformed = true;
        continue;
      }
      result.loggedIn = loginValue === '1';
      if (!result.loggedIn) {
        if ((token?.value || '') !== '' || (userId?.value || '') !== '') result.malformed = true;
        continue;
      }
      const uid = normalizeUid(userId?.type === 'string' || userId?.type === 'bare' ? userId.value : null);
      if (token?.type !== 'string' || !uid) result.malformed = true;
      else {
        setToken(token.value);
        result.authUid = uid;
      }
    }

    for (const assignment of topLevelObjectAssignments(script, /(?:^|[;}])\s*var\s+userSettings\s*=\s*\{/giu)) {
      if (assignment.malformed) {
        result.malformed = true;
        continue;
      }
      const properties = parseObjectProperties(assignment.source);
      if (!properties) {
        result.malformed = true;
        continue;
      }
      const property = properties.get('uid');
      if (!property) continue;
      result.sawUid = true;
      const uid = normalizeUid(property.type === 'string' || property.type === 'bare' ? property.value : null);
      if (!uid || result.uid !== null) result.malformed = true;
      else result.uid = uid;
    }
  }
  if (result.loggedIn === true && result.authUid !== result.uid) result.malformed = true;
  return result;
}
```

In `checkAuth()`, add the explicit logout branch before UID/token validation:

```js
const parsed = extractPageAuth(html);
if (parsed.malformed) throw platformChanged('人人登录页认证结构已变化');
if (parsed.loggedIn === false) return { authenticated: false };
if (!parsed.uid) {
  jltoken = '';
  return { authenticated: false };
}
if (!parsed.token) throw platformChanged('人人登录页认证结构已变化');
```

- [ ] **Step 5: Run the adapter tests**

Run:

```bash
npx vitest run extension/tests/adapters/woshipm.test.js
```

Expected: the whole Woshipm adapter file passes, including legacy parsing, current parsing, decoy rejection, upload, and draft tests.

- [ ] **Step 6: Commit the adapter fix**

```bash
git add extension/src/adapters/woshipm.js extension/tests/adapters/woshipm.test.js
git commit -m "fix: recognize current renren login state"
```

### Task 2: Make dialog actions derive from platform status

**Files:**
- Modify: `extension/tests/content-script.test.js:395-438, 1018-1080, 1381-1453`
- Modify: `extension/src/content/open-gzh.js:594-680, 751-834, 1150-1160`

- [ ] **Step 1: Add failing contextual-action and primary-state tests**

Add a focused test in the Shadow DOM UI section:

```js
it('shows only status-relevant row actions and disables the primary action without a selection', async () => {
  const { createUi } = loadTestApi();
  const { doc, anchor } = makeUiDom();
  const messages = [];
  const ui = createUi({
    document: doc,
    anchor,
    storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
    port: { postMessage: (message) => messages.push(message) },
  });
  await ui.ready;
  await ui.openPanel();

  const row = ui.rows.get('weixin');
  expect(row.row.dataset.status).toBe('checking-auth');
  expect(row.login.hidden).toBe(true);
  expect(row.retry.hidden).toBe(true);

  ui.onMessage({ type: 'AUTH_RESULT', requestId: messages.at(-1).requestId, platformId: 'weixin', authenticated: false });
  expect(row.row.dataset.status).toBe('auth-required');
  expect(row.login.hidden).toBe(false);
  expect(row.retry.hidden).toBe(false);

  ui.state.taskId = 'task';
  ui.state.operationId = 'operation';
  ui.state.busy = true;
  ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task', operationId: 'operation', platformId: 'weixin', status: 'failed', error: { message: '平台结构变化' } });
  expect(row.login.hidden).toBe(true);
  expect(row.retry.hidden).toBe(false);

  ui.state.busy = false;
  for (const platformId of allPlatforms) {
    const platform = ui.rows.get(platformId);
    platform.checkbox.checked = false;
    platform.checkbox.dispatchEvent(new FakeEvent('change'));
  }
  expect(ui.start.disabled).toBe(true);
});
```

- [ ] **Step 2: Run the test and verify it fails on the current UI state rules**

Run:

```bash
npx vitest run extension/tests/content-script.test.js -t "status-relevant row actions"
```

Expected: FAIL because checking/failed rows currently expose login, retry remains present as a disabled browser button, no row `data-status` is set, and empty selection does not disable the main action.

- [ ] **Step 3: Centralize row presentation and primary-button state**

Initialize login and retry as hidden when creating each row:

```js
login.hidden = true;
retry.hidden = true;
row.dataset.status = 'unknown';
```

Replace `updateRetryState()` with:

```js
function updateRowPresentation(row) {
  row.row.dataset.status = row.statusKey;
  row.status.dataset.status = row.statusKey;
  row.login.hidden = row.statusKey !== 'auth-required';
  row.retry.hidden = !row.canRetry;
  row.retry.disabled = state.busy || !row.canRetry;
}
```

Update locking and selection changes:

```js
function setLocked(locked) {
  start.disabled = locked || !state.selected.length;
  for (const row of rowMap.values()) {
    row.checkbox.disabled = locked;
    updateRowPresentation(row);
  }
}
```

After each checkbox change and each persisted-selection restore, call `setLocked(state.busy)`. Use these complete state renderers so `failed` keeps retry while every non-actionable state hides row actions:

```js
function setStatus(platformId, status, message) {
  const row = rowMap.get(platformId);
  if (!row) return;
  row.statusKey = status;
  row.canRetry = status === 'failed' || status === 'auth-required';
  if (status !== 'success') clearDraft(row);
  if (status === 'unknown') {
    row.status.textContent = '请检查平台草稿箱';
    row.statusKey = 'unknown';
    row.canRetry = false;
    updateRowPresentation(row);
    return;
  }
  const progress = message?.progress || message;
  const completed = Number(progress?.completed);
  const total = Number(progress?.total);
  row.status.textContent = STATUS_LABELS[status] || '请检查平台草稿箱';
  if (status === 'uploading-images' && Number.isFinite(completed) && Number.isFinite(total)) {
    row.status.textContent = `${STATUS_LABELS[status]} ${completed}/${total}`;
  }
  if (status === 'success') {
    const draftUrl = sanitizeDraftUrl(platformId, message?.draftUrl);
    if (!draftUrl) {
      clearDraft(row);
      row.status.textContent = '请检查平台草稿箱';
      row.statusKey = 'unknown';
      row.canRetry = false;
      updateRowPresentation(row);
      return;
    }
    row.draft.href = draftUrl;
    row.draft.hidden = false;
  }
  if (status === 'failed') {
    const errorMessage = typeof message?.error === 'string' ? message.error : message?.error?.message;
    if (errorMessage) row.status.textContent = errorMessage;
  }
  updateRowPresentation(row);
}

function setAuthStatus(platformId, authenticated) {
  const row = rowMap.get(platformId);
  if (!row) return;
  row.statusKey = authenticated ? 'authenticated' : 'auth-required';
  row.canRetry = !authenticated;
  row.status.textContent = authenticated ? '已登录' : STATUS_LABELS['auth-required'];
  if (!authenticated) clearDraft(row);
  updateRowPresentation(row);
}
```

The checkbox handler ends with:

```js
state.selected = PLATFORM_IDS.filter((id) => rowMap.get(id).checkbox.checked);
setLocked(state.busy);
persistSelection(storage, state.selected).catch(() => setAlert('选择未保存'));
```

Both success and failure branches of persisted selection restoration end with:

```js
renderSelection();
setLocked(state.busy);
```

- [ ] **Step 4: Update focus tests for hidden contextual controls**

Replace the old focus assertions with:

```js
const checkbox = ui.rows.get('weixin').checkbox;
const nextCheckbox = ui.rows.get('zhihu').checkbox;
const login = ui.rows.get('weixin').login;
checkbox.focus();
ui.shadow.activeElement = checkbox;
const checkingForward = new FakeEvent('keydown', { key: 'Tab' });
ui.panel.dispatchEvent(checkingForward);
expect(doc.activeElement).toBe(nextCheckbox);

ui.onMessage({
  type: 'AUTH_RESULT',
  requestId: messages.at(-1).requestId,
  platformId: 'weixin',
  authenticated: false,
});
checkbox.focus();
ui.shadow.activeElement = checkbox;
const actionableForward = new FakeEvent('keydown', { key: 'Tab' });
ui.panel.dispatchEvent(actionableForward);
expect(doc.activeElement).toBe(login);
ui.shadow.activeElement = login;
const backward = new FakeEvent('keydown', { key: 'Tab', shiftKey: true });
ui.panel.dispatchEvent(backward);
expect(doc.activeElement).toBe(checkbox);
```

- [ ] **Step 5: Run content-script tests**

Run:

```bash
npx vitest run extension/tests/content-script.test.js
```

Expected: all content-script tests pass with status-aware controls, empty-selection disabling, and the existing stale-message/focus/lifecycle contracts intact.

- [ ] **Step 6: Commit the status behavior**

```bash
git add extension/src/content/open-gzh.js extension/tests/content-script.test.js
git commit -m "fix: show contextual sync dialog actions"
```

### Task 3: Apply the reviewed dialog hierarchy and visual system

**Files:**
- Modify: `extension/tests/content-script.test.js:395-438, 1614-1668`
- Modify: `extension/src/content/open-gzh.js:12, 594-701`

- [ ] **Step 1: Add failing hierarchy and CSS contract assertions**

Extend the existing Shadow DOM CSS/accessibility test with:

```js
expect(ui.title.textContent).toBe('同步到内容平台');
expect(ui.subtitle.textContent).toBe('选择平台，确认登录状态后保存为草稿。');
expect(ui.header.className).toBe('opengzh-header');
expect(ui.footer.className).toBe('opengzh-footer');
expect(ui.footerNote.textContent).toBe('只保存草稿，不会自动发布');
expect(ui.close.textContent).toBe('×');

expect(style.textContent).toContain('.opengzh-panel');
expect(style.textContent).toContain('.opengzh-platform-row[data-status="authenticated"]');
expect(style.textContent).toContain('min-height: 44px');
expect(style.textContent).toContain('@media (max-width: 560px)');
expect(style.textContent).toContain('@media (prefers-reduced-motion: reduce)');
expect(style.textContent).toContain('backdrop-filter: blur(4px)');
```

- [ ] **Step 2: Run the hierarchy test and verify it fails**

Run:

```bash
npx vitest run extension/tests/content-script.test.js -t "fixed responsive styles"
```

Expected: FAIL on the old title, old subtitle, absent header/footer, text close button, and incomplete CSS.

- [ ] **Step 3: Build the semantic header, content, and footer**

Replace the flat `panel.append(...)` construction with:

```js
const header = doc.createElement('header');
header.className = 'opengzh-header';
const heading = doc.createElement('div');
heading.className = 'opengzh-heading';
const title = textElement(doc, 'h2', '同步到内容平台', 'opengzh-title');
title.id = 'opengzh-title';
const subtitle = textElement(doc, 'p', '选择平台，确认登录状态后保存为草稿。', 'opengzh-subtitle');
const close = textElement(doc, 'button', '×', 'opengzh-close');
close.type = 'button';
close.setAttribute('aria-label', '关闭');
heading.append(title, subtitle);
header.append(heading, close);

const content = doc.createElement('div');
content.className = 'opengzh-content';
content.append(rows, alert);

const footer = doc.createElement('footer');
footer.className = 'opengzh-footer';
const footerNote = textElement(doc, 'p', '只保存草稿，不会自动发布', 'opengzh-footer-note');
footer.append(footerNote, start);
panel.append(header, content, footer);
```

Return `header`, `title`, `subtitle`, `footer`, and `footerNote` from `createUi()` so the existing fake-DOM tests can assert the semantic contract.

- [ ] **Step 4: Replace the unfinished CSS with the approved scoped visual system**

Replace `style.textContent` with this complete scoped stylesheet:

```css
:host {
  all: initial;
  --ogzh-text: #172033;
  --ogzh-muted: #667085;
  --ogzh-border: #e3e8ef;
  --ogzh-surface: #ffffff;
  --ogzh-primary: #1769e0;
  --ogzh-primary-hover: #1259c2;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--ogzh-text);
}
* { box-sizing: border-box; }
.opengzh-extension-shell { display: inline-block; position: relative; z-index: 2147483646; }
button, a, input { font: inherit; }
button, a { -webkit-tap-highlight-color: transparent; }
button { cursor: pointer; }
button:focus-visible, a:focus-visible, input:focus-visible { outline: 3px solid rgba(23, 105, 224, .38); outline-offset: 2px; }
.opengzh-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(15, 23, 42, .48);
  backdrop-filter: blur(4px);
}
.opengzh-panel {
  width: min(560px, calc(100vw - 32px));
  max-height: min(720px, calc(100vh - 32px));
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, .64);
  border-radius: 18px;
  background: var(--ogzh-surface);
  box-shadow: 0 24px 72px rgba(15, 23, 42, .28), 0 2px 8px rgba(15, 23, 42, .08);
}
.opengzh-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  padding: 24px 24px 18px;
  border-bottom: 1px solid #edf0f4;
}
.opengzh-heading { min-width: 0; }
.opengzh-title { margin: 0; color: #111827; font-size: 22px; font-weight: 700; line-height: 1.3; letter-spacing: -.02em; }
.opengzh-subtitle { margin: 7px 0 0; color: var(--ogzh-muted); font-size: 14px; line-height: 1.55; }
.opengzh-close {
  flex: 0 0 auto;
  width: 44px;
  min-height: 44px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #667085;
  font-size: 27px;
  font-weight: 300;
  line-height: 1;
  transition: color 180ms ease, background 180ms ease, transform 180ms ease;
}
.opengzh-close:hover { background: #f2f4f7; color: #111827; }
.opengzh-close:active { transform: scale(.96); }
.opengzh-content { min-height: 0; overflow: auto; padding: 18px 24px 20px; }
.opengzh-platforms { display: grid; gap: 10px; }
.opengzh-platform-row {
  min-height: 72px;
  display: grid;
  grid-template-columns: 20px 40px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--ogzh-border);
  border-radius: 12px;
  background: var(--ogzh-surface);
  transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
}
.opengzh-platform-row:hover { border-color: #cbd5e1; box-shadow: 0 4px 14px rgba(15, 23, 42, .05); }
.opengzh-platform-row:has(input:checked) { border-color: #cbdcf7; background: #fbfdff; }
.opengzh-platform-row input[type="checkbox"] { width: 18px; height: 18px; margin: 0; accent-color: var(--ogzh-primary); cursor: pointer; }
.opengzh-platform-row input[type="checkbox"]:disabled { cursor: not-allowed; opacity: .55; }
.platform-icon {
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: #eaf2ff;
  color: #184b93;
  font-size: 18px;
  font-weight: 700;
}
.opengzh-platform-details { display: grid; gap: 4px; min-width: 0; }
.opengzh-platform-name { color: #172033; font-size: 15px; font-weight: 650; line-height: 1.35; }
.opengzh-platform-status {
  min-width: 0;
  display: inline-flex;
  align-items: flex-start;
  gap: 7px;
  color: var(--ogzh-muted);
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.opengzh-platform-status::before { content: ""; flex: 0 0 auto; width: 7px; height: 7px; margin-top: 6px; border-radius: 999px; background: #98a2b3; }
.opengzh-platform-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.opengzh-login, .opengzh-retry, .opengzh-draft {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border: 1px solid #d0d5dd;
  border-radius: 10px;
  background: #fff;
  color: #344054;
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
  text-decoration: none;
  transition: color 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}
.opengzh-login:hover, .opengzh-retry:hover, .opengzh-draft:hover { border-color: #98a2b3; background: #f9fafb; color: #101828; }
.opengzh-login:active, .opengzh-retry:active, .opengzh-draft:active { transform: translateY(1px); }
.opengzh-alert { margin: 14px 0 0; color: #b42318; font-size: 13px; line-height: 1.5; }
.opengzh-alert:empty { display: none; }
.opengzh-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 24px 20px;
  border-top: 1px solid #edf0f4;
  background: rgba(255, 255, 255, .98);
}
.opengzh-footer-note { margin: 0; color: var(--ogzh-muted); font-size: 13px; line-height: 1.45; }
.opengzh-start {
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid var(--ogzh-primary);
  border-radius: 10px;
  background: var(--ogzh-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 7px 18px rgba(23, 105, 224, .2);
  transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}
.opengzh-start:hover { border-color: var(--ogzh-primary-hover); background: var(--ogzh-primary-hover); box-shadow: 0 9px 22px rgba(23, 105, 224, .25); }
.opengzh-start:active { transform: translateY(1px); }
.opengzh-start:disabled { cursor: not-allowed; border-color: #d0d5dd; background: #e4e7ec; color: #98a2b3; box-shadow: none; }
.opengzh-platform-row[data-status="authenticated"] .opengzh-platform-status,
.opengzh-platform-row[data-status="success"] .opengzh-platform-status { color: #137a4b; }
.opengzh-platform-row[data-status="authenticated"] .opengzh-platform-status::before,
.opengzh-platform-row[data-status="success"] .opengzh-platform-status::before { background: #12a56a; }
.opengzh-platform-row[data-status="auth-required"] .opengzh-platform-status { color: #a15c00; }
.opengzh-platform-row[data-status="auth-required"] .opengzh-platform-status::before { background: #e99518; }
.opengzh-platform-row[data-status="failed"] .opengzh-platform-status { color: #b42318; }
.opengzh-platform-row[data-status="failed"] .opengzh-platform-status::before { background: #d92d20; }
.opengzh-platform-row[data-status="checking-auth"] .opengzh-platform-status::before,
.opengzh-platform-row[data-status="uploading-images"] .opengzh-platform-status::before,
.opengzh-platform-row[data-status="saving-draft"] .opengzh-platform-status::before {
  background: var(--ogzh-primary);
  animation: opengzh-pulse 1.1s ease-in-out infinite;
}
@keyframes opengzh-pulse { 50% { opacity: .28; transform: scale(.78); } }
.opengzh-draft[hidden], .opengzh-login[hidden], .opengzh-retry[hidden], .opengzh-backdrop[hidden] { display: none; }
@media (max-width: 560px) {
  .opengzh-platform-row { grid-template-columns: 20px 40px minmax(0, 1fr); }
  .opengzh-platform-actions { grid-column: 2 / 4; justify-content: flex-start; }
}
@media (max-width: 390px) {
  .opengzh-backdrop { padding: 8px; }
  .opengzh-panel { width: calc(100vw - 16px); max-height: calc(100vh - 16px); border-radius: 16px; }
  .opengzh-header { padding: 20px 16px 16px; }
  .opengzh-content { padding: 14px 16px 18px; }
  .opengzh-footer { display: grid; gap: 12px; padding: 14px 16px 16px; }
  .opengzh-start { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
}
```

- [ ] **Step 5: Run content-script tests and syntax checks**

Run:

```bash
npx vitest run extension/tests/content-script.test.js
node --check extension/src/content/open-gzh.js
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit the visual implementation**

```bash
git add extension/src/content/open-gzh.js extension/tests/content-script.test.js
git commit -m "feat: refine multiplatform sync dialog"
```

### Task 4: Verify the extension and real browser behavior

**Files:**
- Verify only: `extension/src/adapters/woshipm.js`
- Verify only: `extension/src/content/open-gzh.js`
- Verify only: `dist/extension/`

- [ ] **Step 1: Run focused and full automated verification**

Run:

```bash
npx vitest run extension/tests/adapters/woshipm.test.js extension/tests/content-script.test.js
npm run test:extension
npm test
npm run build:extension
node --check extension/src/adapters/woshipm.js
node --check extension/src/content/open-gzh.js
git diff --check
```

Expected: every command exits 0; Vitest reports zero failed tests; the extension build completes.

- [ ] **Step 2: Confirm the build contains the current source**

Run:

```bash
cmp extension/src/adapters/woshipm.js dist/extension/src/adapters/woshipm.js
cmp extension/src/content/open-gzh.js dist/extension/src/content/open-gzh.js
```

Expected: both commands exit 0.

- [ ] **Step 3: Reload and inspect the installed extension**

In `chrome://extensions`, reload OpenGZH after the build. Hard-refresh the OpenGZH page, open the distribution dialog, and verify at desktop width and 390px width:

- one dialog and one platform row per platform;
- no horizontal overflow;
- checking rows hide actions;
- authenticated rows show “已登录”;
- auth-required rows show only login and retry;
- failed rows show retry without login;
- Escape, backdrop, and close restore focus to the page entry;
- extension error count and page console remain clean.

- [ ] **Step 4: Verify the real Woshipm login state without creating a draft**

With the user's existing logged-in Woshipm session, click “重新检测” for 人人 and verify the row becomes “已登录”. Do not click “保存草稿并打开”; real draft creation remains outside this acceptance scope.

- [ ] **Step 5: Inspect the final worktree and report boundaries**

Run:

```bash
git status --short --branch
git log --oneline -5
```

Expected: only the user's pre-existing `.claude/settings.json` modification and `extension/REAL-BROWSER-ACCEPTANCE.md` remain unrelated; implementation commits are local until the user explicitly requests a push.
