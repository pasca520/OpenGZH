# OpenGZH Extension 0.1.0 Real-Browser Acceptance

**Acceptance date:** 2026-08-25
**Website origin:** `http://localhost:8080`
**Production origin:** `https://opengzh.pasca.fun`
**Installed source:** `dist/extension`
**Release archive:** `dist/OpenGZH-extension-v0.1.0.zip`

## Installation evidence

- [x] `npm run build:extension` completed immediately before installation.
- [x] A fresh isolated Chrome profile loaded the command-line unpacked build, equivalent to removing any previous installed copy.
- [x] The unpacked path is the current repository's `dist/extension`.
- [x] Chrome displays name `OpenGZH`, version `0.1.0`, and description `微信公众号、知乎、掘金、人人都是产品经理文章同步助手`; manifest/runtime errors are 0.
- [x] Chrome details list 13 site-access patterns: the exact ten locked platform `host_permissions` plus the three content-script origins (`https://opengzh.pasca.fun/*`, `http://localhost/*`, `http://127.0.0.1/*`); `hasAllHosts` is false and there is no Cookie permission. The platform host-permission set remains exactly the ten locked patterns.
- [x] On `http://127.0.0.1:8080/`, the host/shadow UI and “同步到平台” appear in the preview toolbar beside “复制到公众号”; all four checkboxes are selected by default, and `example.com` has no injected host.

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
| 微信公众号 | [ ] | [ ] | [x] | [ ] | [ ] | [ ] | [ ] |
| 知乎 | [ ] | [ ] | [x] | [ ] | [ ] | [ ] | [ ] |
| 掘金 | [ ] | [ ] | [x] | [ ] | [ ] | [ ] | [ ] |
| 人人都是产品经理 | [ ] | [ ] | [x] | [ ] | [ ] | [ ] | [ ] |

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

- [x] `/usr/bin/unzip -t dist/OpenGZH-extension-v0.1.0.zip` reports no errors.
- [x] The archive contains no tests, source maps, `.DS_Store`, HAR, environment file, local account data, Wechatsync code, remote script, or third-party runtime.
- [ ] Disabling/uninstalling the extension removes the sync entry without changing OpenGZH documents or remote drafts.
- [ ] Existing remote drafts remain untouched after rollback; “复制到公众号” remains the WeChat fallback.

## Automated verification

This section records repository-local checks and isolated installed-extension checks. No authenticated platform login, live draft, clipboard paste, or real WeChat regression was performed; the unchecked manual items remain unverified.

- `npm ci` — passed.
- HEAD `463bad0` passed the Luna specification review.
- `npm test` — passed: 55 files, 896 tests.
- `npm run test:extension` — passed: 14 files, 356 tests.
- All JavaScript and MJS files under `assets/scripts`, `extension/src`, and `scripts` — passed `node --check`.
- `git diff --check` — passed with no output.
- Security scans — first three produced no matches; the credential-pattern scan matched only in-memory/parser/request-construction/redaction references, with no real values or credential-bearing persistence/logging observed.
- `npm run build:extension` — passed before the isolated Chrome 149 run.
- Fresh isolated Chrome 149 profile loaded command-line unpacked `dist/extension`; after startup and hard refresh, the extension remained enabled with the exact identity/description, exact current dist path, and zero manifest/runtime errors.
- `/usr/bin/unzip -t dist/OpenGZH-extension-v0.1.0.zip` — passed with no errors.
- Packaged manifest/archive inspection — passed; locked permissions/hosts and archive exclusions validated.
- Archive: `dist/OpenGZH-extension-v0.1.0.zip`, 75750 bytes, SHA-256 `f321ef94c7025c42e2943c5fc7f16ab978222165adadda92fde5e37bb83b74d1`.
- Isolated Chrome 149 logged-out panel check — all four selected platforms showed `需要登录`, login/retry controls were visible, draft links were hidden, alert was empty, and no platform login tab opened automatically.
- `git status --short` — pre-existing `.claude/settings.json` modification and this uncommitted acceptance record are present; `dist/` remains ignored and uncommitted.
