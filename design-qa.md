# Design QA — OpenGZH 原生同步浮层

- visual source: `/Users/pasca/.codex/generated_images/01a03d31-56cc-7533-a1a2-4a2cf2a4c9eb/exec-9700d03d-7002-4f64-8b14-fbb06f8076ef.png`
- implementation screenshot: pending Chrome extension reload
- source dimensions: 1487 × 1058
- target desktop state: OpenGZH 编辑页，四个平台已选，微信公众号需要登录，其余平台已登录
- target responsive state: 390 × 844，同一状态，浮层保持 8px 视口安全边距
- density: 1× browser viewport capture; reference supplied at 1536 × 1024

## Implemented states

- backdrop-free non-modal popover anchored to the toolbar trigger
- selected count updates from checkbox state
- checking, authenticated, auth-required, failed, success, unselected and unknown rows
- contextual login, retry and draft actions
- login-return automatic recheck
- close button, Escape, outside pointer close and focus restoration
- reduced motion and 390px touch-target rules

## Comparison history

1. Reference locked to selected Option 1.
2. DOM/CSS and interaction contracts pass in automated tests.
3. Visual comparison is pending because the connected Chrome session can list tabs but cannot control, reload or capture the page. The Chrome plugin, browser and native host diagnostics all pass.
4. After user permission, a fresh Chrome window was opened successfully. The retried session still times out on every page-control and capture call, so the Chrome control workflow requires the Browser plugin connection to be reinstalled before another automated attempt.

## Remaining QA gate

- Reload the unpacked OpenGZH extension.
- Capture desktop and 390px screenshots.
- Put the reference and implementation capture together in one comparison image.
- Fix P0/P1/P2 mismatches and repeat until no blocking mismatch remains.

final result: blocked
