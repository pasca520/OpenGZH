# Renren Auth and Native Sync Popover Implementation Plan

**Goal:** Correctly recognize the current logged-in Woshipm page and implement the approved Option 1 toolbar popover with OpenGZH's warm visual system.

**Architecture:** Keep the existing fail-closed adapter and distribution protocol. Replace only the Shadow DOM presentation layer: remove the modal backdrop, position a non-modal dialog from the website trigger geometry, derive row actions from status, and recheck a platform when focus returns after its login page opens.

**Tech Stack:** Chrome Manifest V3, native JavaScript, Shadow DOM CSS, Vitest 3, existing fake DOM harness.

## File map

- `extension/src/adapters/woshipm.js`: current and legacy authentication parsing.
- `extension/tests/adapters/woshipm.test.js`: fail-closed auth regression coverage.
- `extension/src/content/open-gzh.js`: popover DOM, positioning, state presentation and interactions.
- `extension/tests/content-script.test.js`: UI, viewport, focus and protocol contracts.
- `design-qa.md`: visual comparison evidence and final QA result.

## Task 1: Renren authentication

- [x] Reproduce the current `PURE` login structure failure.
- [x] Parse `PURE` without executing page JavaScript.
- [x] Cross-check `PURE.user_id`, `userSettings.uid` and the fixed profile endpoint.
- [x] Keep legacy login, explicit logout and malformed/conflicting structures fail-closed.
- [x] Run focused adapter tests.

## Task 2: Option 1 interaction contract

- [x] Add failing tests for a non-modal, backdrop-free popover.
- [x] Lock title “同步草稿”, selected count and primary label “保存草稿”.
- [x] Lock auth-required actions and “登录后自动更新”.
- [x] Lock external click, Escape and focus restoration behavior.
- [x] Lock 390px viewport positioning.

## Task 3: Option 1 implementation

- [x] Remove the full-screen backdrop and `aria-modal`.
- [x] Position the popover from the current toolbar trigger and constrain it to the viewport.
- [x] Replace card rows with a continuous status list.
- [x] Apply the OpenGZH warm surface, text, border and coral accent tokens.
- [x] Add contextual row actions and selected-count updates.
- [x] Recheck the opened login platform when window focus returns.
- [x] Preserve reduced-motion, keyboard loop, live status and draft links.

## Task 4: Verification

- [x] Run content-script tests and JavaScript syntax check.
- [ ] Run extension and repository-wide test suites.
- [ ] Build the runtime extension and compare source/dist output.
- [ ] Reload the unpacked extension in the user's Chrome.
- [ ] Verify desktop and 390px states without creating third-party drafts.
- [ ] Compare the selected reference and implementation screenshot together.
- [ ] Record `design-qa.md` with `final result: passed` only after visual convergence.

## Safety boundary

Real draft creation remains a third-party write and is not part of this visual/auth acceptance. No save button will be activated during browser verification without fresh user confirmation.
