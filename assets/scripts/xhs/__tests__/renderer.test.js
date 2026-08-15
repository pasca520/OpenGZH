import { describe, expect, it } from 'vitest';
import { renderXhsPage, selectPageVariant, rewriteImageSources } from '../renderer.js';

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

  it('does not render a page number on the cover', () => {
    const html = renderXhsPage({
      id: 'cover', kind: 'cover', variant: 'cover', blocks: [], pageNumber: 1, totalPages: 4,
      sourceStart: null, sourceEnd: null, manualBreakBefore: false, manualBreakMarkerStart: null
    }, settings);
    expect(html).not.toContain('01 / 04');
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
});
