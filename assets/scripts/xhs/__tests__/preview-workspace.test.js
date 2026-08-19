import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const main = readFileSync(`${root}/assets/scripts/main.js`, 'utf8');
const html = readFileSync(`${root}/index.html`, 'utf8');
const css = readFileSync(`${root}/assets/styles/xhs.css`, 'utf8');
const editorCss = readFileSync(`${root}/assets/styles/editor.css`, 'utf8');

describe('xhs preview workspace contract', () => {
  it('defaults to horizontal without persisting the view choice', () => {
    expect(main).toContain("const xhsPreviewMode = ref('horizontal')");
    const setterStart = main.indexOf('function setXhsPreviewMode');
    const setterEnd = main.indexOf('function selectXhsPage');
    expect(setterStart).toBeGreaterThan(-1);
    expect(setterEnd).toBeGreaterThan(setterStart);
    const setter = main.slice(setterStart, setterEnd);
    expect(setter).not.toContain('schedulePersistDocumentState');
    expect(setter).not.toContain('scheduleXhsPagination');
  });

  it('re-attaches preview measurement after paginated cards enter the DOM', () => {
    const paginationStart = main.indexOf('function scheduleXhsPagination');
    const observerStart = main.indexOf('function setupXhsPreviewObserver');
    const pagination = main.slice(paginationStart, observerStart);
    expect(pagination).toContain('setupXhsPreviewObserver();');
  });

  it('exposes an accessible view switch and focusable card rail', () => {
    expect(html).toContain('role="group" aria-label="预览方式"');
    expect(html).toContain(":aria-pressed=\"xhsPreviewMode === 'horizontal'\"");
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('@keydown="handleXhsPreviewKeydown"');
  });

  it('uses native horizontal scroll snapping and keeps vertical overview', () => {
    expect(css).toMatch(/\.xhs-image-stack\.is-horizontal[\s\S]*?overflow-x:\s*auto/);
    expect(css).toMatch(/\.xhs-image-stack\.is-horizontal[\s\S]*?scroll-snap-type:\s*x mandatory/);
    expect(css).toMatch(/\.xhs-image-stack\.is-vertical[\s\S]*?flex-direction:\s*column/);
  });

  it('provides non-wrapping previous and next controls', () => {
    expect(html).toContain('@click="moveXhsSelectedPage(-1)"');
    expect(html).toContain(':disabled="!xhsHasPreviousPage"');
    expect(html).toContain('@click="moveXhsSelectedPage(1)"');
    expect(html).toContain(':disabled="!xhsHasNextPage"');
  });

  it('keeps the horizontal workspace inside one preview screen', () => {
    expect(css).toMatch(/\.preview-content:has\(\.xhs-image-stack\.is-horizontal\)[\s\S]*?overflow:\s*hidden/);
    expect(css).toMatch(/\.xhs-image-workspace:has\(\.xhs-image-stack\.is-horizontal\)[\s\S]*?height:\s*100%/);
    expect(css).toMatch(/\.xhs-image-stack\.is-horizontal[\s\S]*?flex:\s*1/);
  });

  it('scales cover titles from body density instead of fixed oversized pixels', () => {
    expect(css).toMatch(/\.xhs-cover-title[\s\S]*?font-size:\s*calc\(var\(--xhs-body-size\) \* 2\.1\)/);
    expect(css).toMatch(/\.xhs-cover-title[\s\S]*?text-wrap:\s*balance/);
    expect(css).not.toMatch(/\.xhs-card\[data-theme="[^"]+"\] \.xhs-cover-title\s*\{[^}]*font-size:\s*5\dpx/);
  });

  it('keeps image-mode warnings out of the text preview', () => {
    expect(html).toContain('v-if="contentOutputMode === \'image\' && xhsWarning"');
    const setterStart = main.indexOf('function setContentOutputMode');
    const setterEnd = main.indexOf('function insertXhsPageAtCursor');
    const setter = main.slice(setterStart, setterEnd);
    expect(setter).toMatch(/else\s*\{[\s\S]*?xhsWarning\.value\s*=\s*''/);
  });

  it('offers cover editing and a dedicated cover image upload from the cover card', () => {
    expect(html).toContain("v-if=\"page.kind === 'cover'\"");
    expect(html).toContain('编辑封面');
    expect(html).toContain('ref="xhsCoverImageUpload"');
    expect(html).toContain('@change="handleXhsCoverUpload"');
    expect(main).toContain('async function handleXhsCoverUpload');
    expect(main).toContain('handleXhsCoverUpload,');
  });

  it('uses denser card presets without shrinking body copy below 18px', () => {
    expect(css).toMatch(/\.xhs-card-body\s*\{[^}]*inset:\s*var\(--xhs-content-top\) var\(--xhs-content-x\) var\(--xhs-content-bottom\);/);
    expect(css).toMatch(/\.xhs-card\[data-density="relaxed"\]\s*\{[^}]*--xhs-body-size:\s*20px;[^}]*--xhs-line-height:\s*1\.55;[^}]*--xhs-block-gap:\s*14px;[^}]*--xhs-content-top:\s*48px;[^}]*--xhs-content-x:\s*36px;[^}]*--xhs-content-bottom:\s*64px;/);
    expect(css).toMatch(/\.xhs-card\[data-density="standard"\]\s*\{[^}]*--xhs-body-size:\s*18px;[^}]*--xhs-line-height:\s*1\.45;[^}]*--xhs-block-gap:\s*10px;[^}]*--xhs-content-top:\s*40px;[^}]*--xhs-content-x:\s*30px;[^}]*--xhs-content-bottom:\s*52px;/);
    expect(css).toMatch(/\.xhs-card\[data-density="compact"\]\s*\{[^}]*--xhs-body-size:\s*18px;[^}]*--xhs-line-height:\s*1\.35;[^}]*--xhs-block-gap:\s*6px;[^}]*--xhs-content-top:\s*34px;[^}]*--xhs-content-x:\s*28px;[^}]*--xhs-content-bottom:\s*46px;/);
  });

  it('gives desktop editor and preview composers more working space', () => {
    expect(editorCss).toMatch(/\.editor-composer\s*\{[\s\S]*?margin:\s*10px;[\s\S]*?padding:\s*10px;[\s\S]*?gap:\s*8px;/);
    expect(editorCss).toMatch(/\.preview-composer\s*\{[\s\S]*?margin:\s*10px;[\s\S]*?padding:\s*10px;[\s\S]*?gap:\s*8px;/);
  });

  it('keeps mobile editor controls on scrollable rows so they do not consume the textarea', () => {
    const mobile = editorCss.slice(editorCss.lastIndexOf('@media (max-width: 768px)'));
    expect(mobile).toMatch(/\.editor-actions,\s*\.editor-toolbar\s*\{[^}]*flex-wrap:\s*nowrap;[^}]*overflow-x:\s*auto;/);
    expect(mobile).toMatch(/\.editor-actions \.copy-btn,\s*\.editor-tool-btn\s*\{[^}]*flex:\s*0 0 auto;/);
  });
});
