import { describe, expect, it } from 'vitest';
import { createXhsDomMeasurer, renderXhsPage, renderXhsStack, selectPageVariant, rewriteImageSources } from '../renderer.js';

const settings = {
  themeId: 'minimal-white', density: 'standard', tocEnabled: false,
  footer: { authorEnabled: true },
  cover: { titleOverride: '', summaryOverride: '', author: '零度', imageRef: null, focalPoint: { x: 50, y: 50 } }
};

describe('xhs renderer', () => {
  it('renders stable card metadata and whole-set numbering', () => {
    const html = renderXhsPage({
      id: 'page-2', kind: 'content', variant: 'text', blocks: [{ id: 'p-1', type: 'paragraph', html: '<p>正文</p>' }],
      pageNumber: 2, totalPages: 8, sourceStart: 10, sourceEnd: 20,
      manualBreakBefore: false, manualBreakMarkerStart: null
    }, settings);
    expect(html).toContain('data-page-id="page-2"');
    expect(html).toContain('data-variant="text"');
    expect(html).toContain('02 / 08');
    expect(html).toContain('零度');
  });

  it('renders the derived layout hint without changing page content', () => {
    const html = renderXhsPage({
      id: 'short', kind: 'content', variant: 'text', layoutHint: 'short',
      blocks: [{ id: 'p', type: 'paragraph', html: '<p>短页</p>' }],
      pageNumber: 2, totalPages: 2, sourceStart: 0, sourceEnd: 2,
      manualBreakBefore: false, manualBreakMarkerStart: null
    }, settings);
    expect(html).toContain('data-layout-hint="short"');
    expect(html).toContain('短页');
  });

  it('does not render a page number on the cover', () => {
    const html = renderXhsPage({
      id: 'cover', kind: 'cover', variant: 'cover', blocks: [], pageNumber: 1, totalPages: 4,
      sourceStart: null, sourceEnd: null, manualBreakBefore: false, manualBreakMarkerStart: null
    }, settings);
    expect(html).not.toContain('01 / 04');
  });

  it('renders article metadata on the cover through the stack contract', () => {
    const [html] = renderXhsStack([{
      id: 'cover', kind: 'cover', variant: 'cover', blocks: [], pageNumber: 1, totalPages: 1,
      sourceStart: null, sourceEnd: null, manualBreakBefore: false, manualBreakMarkerStart: null
    }], settings, { meta: { title: '真实封面标题', summary: '真实封面摘要' } });
    expect(html).toContain('真实封面标题');
    expect(html).toContain('真实封面摘要');
  });

  it('marks manual breaks with marker position', () => {
    const html = renderXhsPage({
      id: 'page-3', kind: 'content', variant: 'text', blocks: [],
      pageNumber: 3, totalPages: 3, sourceStart: 5, sourceEnd: 9,
      manualBreakBefore: true, manualBreakMarkerStart: 42
    }, settings);
    expect(html).toContain('data-manual-break="true"');
    expect(html).toContain('data-marker-start="42"');
  });

  it('selects variant by fixed priority', () => {
    expect(selectPageVariant([{ type: 'paragraph' }, { type: 'heading', data: { level: 2 } }])).toBe('chapter');
    expect(selectPageVariant([{ type: 'list' }, { type: 'image' }])).toBe('image');
    expect(selectPageVariant([{ type: 'table' }, { type: 'code' }])).toBe('table');
    expect(selectPageVariant([{ type: 'paragraph' }])).toBe('text');
  });

  it('rewrites only non-data image sources to media refs', () => {
    const out = rewriteImageSources('<p><img src="img://a1" alt="x"><img src="data:image/png;base64,AA=="></p>');
    expect(out).toContain('data-media-ref="img://a1"');
    expect(out).not.toContain('<img src="img://a1"');
    expect(out).toContain('src="data:image/png;base64,AA=="');
  });

  it('escapes user text in headings and cover fields', () => {
    const html = renderXhsPage({
      id: 'p', kind: 'content', variant: 'chapter',
      blocks: [{ id: 'h', type: 'heading', text: '<script>alert(1)</script>', html: '', data: { level: 2 } }],
      pageNumber: 1, totalPages: 1, sourceStart: 0, sourceEnd: 1,
      manualBreakBefore: false, manualBreakMarkerStart: null
    }, settings);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders code chunks with continued line numbers', () => {
    const html = renderXhsPage({
      id: 'c', kind: 'content', variant: 'code',
      blocks: [{
        id: 'code-1', type: 'code', html: '', text: '',
        data: { language: 'js', lines: ['const a = 1;', 'const b = 2;'], startLineNumber: 5, partIndex: 2, partTotal: 2 }
      }],
      pageNumber: 1, totalPages: 1, sourceStart: 0, sourceEnd: 1,
      manualBreakBefore: false, manualBreakMarkerStart: null
    }, settings);
    expect(html).toContain('xhs-code-no">5<');
    expect(html).toContain('xhs-code-no">6<');
    expect(html).toContain('xhs-code-cont');
    expect(html).toContain('js');
  });

  it('renders cover media with focal point as object-position', () => {
    const withImage = {
      ...settings,
      cover: { ...settings.cover, imageRef: 'img://abc', focalPoint: { x: 20, y: 80 } }
    };
    const html = renderXhsPage({
      id: 'cover', kind: 'cover', variant: 'cover', blocks: [], pageNumber: 1, totalPages: 1,
      sourceStart: null, sourceEnd: null, manualBreakBefore: false, manualBreakMarkerStart: null
    }, withImage);
    expect(html).toContain('data-media-ref="img://abc"');
    expect(html).toContain('object-position:20% 80%');
  });

  it('loads fonts once and measures without animation-frame delays', async () => {
    const originalDocument = globalThis.document;
    const originalRaf = globalThis.requestAnimationFrame;
    let fontLoadCount = 0;

    class FakeElement {
      constructor() {
        this.children = [];
        this.parent = null;
        this.style = {};
        this.innerHTML = '';
        this.scrollHeight = 600;
        this.clientHeight = 608;
        this.scrollWidth = 440;
        this.clientWidth = 452;
      }

      appendChild(child) {
        child.parent = this;
        this.children.push(child);
      }

      setAttribute() {}

      querySelectorAll() {
        return [];
      }

      remove() {
        if (!this.parent) return;
        this.parent.children = this.parent.children.filter((child) => child !== this);
      }
    }

    globalThis.document = {
      createElement: () => new FakeElement(),
      fonts: {
        load: () => {
          fontLoadCount += 1;
          return Promise.resolve();
        }
      }
    };
    globalThis.requestAnimationFrame = () => {
      throw new Error('measuring stable DOM must not wait for animation frames');
    };

    try {
      const stage = new FakeElement();
      const measurer = createXhsDomMeasurer(stage, settings);
      const body = stage.children[0].children[0];
      body.children = [{ offsetTop: 0, offsetHeight: 304 }];
      expect(await measurer.measure([])).toEqual({
        fits: true,
        usedHeight: 304,
        availableHeight: 608,
        fillRatio: 0.5
      });
      expect(await measurer.fits([])).toBe(true);
      expect(await measurer.fits([])).toBe(true);
      expect(fontLoadCount).toBe(4);
      measurer.destroy();
      expect(stage.children).toHaveLength(0);
    } finally {
      if (originalDocument === undefined) delete globalThis.document;
      else globalThis.document = originalDocument;
      if (originalRaf === undefined) delete globalThis.requestAnimationFrame;
      else globalThis.requestAnimationFrame = originalRaf;
    }
  });
});
