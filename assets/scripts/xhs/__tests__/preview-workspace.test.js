import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const main = readFileSync(`${root}/assets/scripts/main.js`, 'utf8');
const html = readFileSync(`${root}/index.html`, 'utf8');
const css = readFileSync(`${root}/assets/styles/xhs.css`, 'utf8');

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
});
