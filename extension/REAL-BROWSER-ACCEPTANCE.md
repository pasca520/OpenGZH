# OpenGZH Extension 0.1.0 Real-Browser Acceptance

**Browser acceptance date:** 2026-08-25
**Copy/build verification date:** 2026-08-29
**Website origin:** `http://localhost:8080`
**Production origin:** `https://opengzh.pasca.fun`
**Installed source:** `dist/extension`
**Release archive:** `dist/OpenGZH-extension-v0.1.0.zip`

## Installation evidence

- [x] `npm run build:extension` completed immediately before installation.
- [x] A fresh isolated Chrome profile loaded the command-line unpacked build, equivalent to removing any previous installed copy.
- [x] The unpacked path is the current repository's `dist/extension`.
- [ ] Chrome displays name `OpenGZH - Markdown 文章多平台同步`, version `0.1.0`, and description `在 OpenGZH 完成 Markdown 排版后，一键同步到微信公众号、知乎、掘金和人人都是产品经理草稿箱。`; this new identity was not re-observed in Chrome after the 2026-08-29 copy/build verification.
- [ ] Current manifest review: 11 required platform `host_permissions` patterns plus the three content-script origins (`https://opengzh.pasca.fun/*`, `http://localhost/*`, `http://127.0.0.1/*`); the 13-pattern/10-platform pattern recorded from Chrome on 2026-08-25 was not rechecked against the current build, so this is not current Chrome evidence. `hasAllHosts` and Cookie permission status also await a new Chrome observation.
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

No authenticated platform login, live draft, clipboard paste, or real WeChat regression was performed; the unchecked manual items remain unverified.

### Historical browser evidence — 2026-08-25

- HEAD `463bad0` passed the Luna specification review.
- Historical repository checks: `npm test` passed 55 files/896 tests; `npm run test:extension` passed 14 files/356 tests; all JavaScript and MJS files under `assets/scripts`, `extension/src`, and `scripts` passed `node --check`.
- Historical security scans: first three produced no matches; the credential-pattern scan matched only in-memory/parser/request-construction/redaction references, with no real values or credential-bearing persistence/logging observed.
- On 2026-08-25, a fresh isolated Chrome 149 profile loaded command-line unpacked `dist/extension`; after startup and hard refresh, the then-current extension remained enabled with name `OpenGZH`, version `0.1.0`, description `微信公众号、知乎、掘金、人人都是产品经理文章同步助手`, exact current dist path, and zero manifest/runtime errors.
- Historical isolated Chrome 149 logged-out panel check: all four selected platforms showed `需要登录`, login/retry controls were visible, draft links were hidden, alert was empty, and no platform login tab opened automatically.

### Current copy/build verification — 2026-08-29

- `npm test` — passed: 58 files, 1000 tests.
- `node --check extension/src/content/open-gzh.js` — passed.
- `node --check scripts/build-extension.mjs` — passed.
- `git diff --check` — passed with no output.
- `npm run build:extension` — passed; ZIP integrity check passed with no errors.
- Package manifest inspection — passed; name `OpenGZH - Markdown 文章多平台同步`, version `0.1.0`, short_name `OpenGZH`, description `在 OpenGZH 完成 Markdown 排版后，一键同步到微信公众号、知乎、掘金和人人都是产品经理草稿箱。`, and action.default_title `OpenGZH - Markdown 文章多平台同步` matched the required values. This was package inspection, not Chrome observation.
- Copy code was verified through `fd541bf`; subsequent changes are docs-only acceptance-record amendments.
- Archive: `dist/OpenGZH-extension-v0.1.0.zip`, SHA-256 `ece47208612d513ee8506207cddfbd022beb22c17b8ca5f1388b0c7d81fd8cd5`.
- The new identity was not re-observed in Chrome during the 2026-08-29 copy/build verification.
- `git status --short` — acceptance record is committed; `dist/` remains ignored, and only the unrelated `.dsh-computer-use/` directory is untracked.
