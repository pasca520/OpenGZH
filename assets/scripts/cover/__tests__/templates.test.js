import { describe, expect, it } from 'vitest';
import { COVER_TEMPLATES, TEMPLATE_META } from '../templates.js';
import { renderCover, getCategories, getTemplate, getTemplates, DEFAULT_TYPOGRAPHY } from '../renderer.js';

const SAMPLE = {
  tag: '产品思考',
  title: '用 AI 构建公众号封面工具',
  subtitle: '从第一性原理出发，重新设计封面模板',
  author: 'OpenGZH',
  issueNumber: 'No.01',
  illustrationSvg: ''
};

// Realistic cover text: title & subtitle run 20–30 CJK characters.
const LONG = {
  tag: '产品思考',
  title: '用人工智能构建公众号封面工具的一整套方法论与实践',
  subtitle: '从第一性原理出发重新设计封面模板让每一篇内容都更具辨识度',
  author: 'OpenGZH',
  issueNumber: 'No.01',
  illustrationSvg: ''
};

/** Parse y-position of every rendered line for a data-field. */
function fieldLineYs(svg, field) {
  const re = new RegExp(`y="([\\d.]+)"[^>]*data-field="${field}"`, 'g');
  const ys = [];
  let m;
  while ((m = re.exec(svg)) !== null) ys.push(parseFloat(m[1]));
  return ys;
}

describe('cover templates', () => {
  it('has exactly 40 templates with unique ids', () => {
    expect(COVER_TEMPLATES.length).toBe(40);
    const ids = COVER_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach(id => expect(id).toMatch(/^[a-z0-9-]+$/));
  });

  it('removed layout templates are gone', () => {
    const ids = COVER_TEMPLATES.map(t => t.id);
    for (const removed of ['illust-right', 'illust-left', 'illust-center-top', 'illust-split', 'illust-hero']) {
      expect(ids).not.toContain(removed);
      expect(TEMPLATE_META[removed]).toBeUndefined();
    }
  });

  it('includes 5 magazine illustration covers', () => {
    const mag = COVER_TEMPLATES.filter(t => t.id.startsWith('mag-'));
    expect(mag.length).toBe(5);
    mag.forEach(t => {
      expect(t.category).toBe('illustration');
      expect(t.elements.illustration).toBe(true);
      expect(t.illustFit).toBeTruthy();
    });
  });

  it('includes 5 abstract covers in abstract-art category', () => {
    const abs = COVER_TEMPLATES.filter(t => t.id.startsWith('abs-'));
    expect(abs.length).toBe(5);
    abs.forEach(t => {
      expect(t.category).toBe('abstract-art');
      expect(t.elements.illustration).not.toBe(true);
    });
  });

  it('abstract-art category is labelled and filterable', () => {
    const cats = getCategories();
    const label = cats.find(c => c.id === 'abstract-art');
    expect(label).toBeTruthy();
    expect(label.label).toBe('抽象艺术');
    const byCategory = getTemplates('abstract-art');
    expect(byCategory.length).toBe(5);
  });

  it('every template has metadata and renders a non-empty svg', () => {
    for (const tpl of COVER_TEMPLATES) {
      expect(TEMPLATE_META[tpl.id], `${tpl.id} meta`).toBeTruthy();
      expect(TEMPLATE_META[tpl.id].scenario).toBeTruthy();
      expect(TEMPLATE_META[tpl.id].styleTags.length).toBeGreaterThanOrEqual(2);

      const svg = renderCover(tpl.id, SAMPLE, { ...DEFAULT_TYPOGRAPHY, titleSize: 36, subtitleSize: 16, tagSize: 10, authorSize: 10 });
      expect(svg.length, `${tpl.id} renders`).toBeGreaterThan(100);
      expect(svg, `${tpl.id} closes svg`).toMatch(/<\/svg>\s*$/);
      expect(svg, `${tpl.id} carries viewBox`).toContain('viewBox="0 0 1200 510"');
      // Title text appears (new templates auto-wrap it, so check a contiguous piece)
      expect(svg, `${tpl.id} contains title text`).toContain('构建公众号封面工具');
    }
  });

  it('flows realistic 20-30 char titles within the canvas and keeps subtitle below', () => {
    const wrappedIds = COVER_TEMPLATES
      .filter(t => t.id.startsWith('mag-') || t.id.startsWith('abs-'))
      .map(t => t.id);
    expect(wrappedIds.length).toBe(10);

    for (const id of wrappedIds) {
      const svg = renderCover(id, LONG, DEFAULT_TYPOGRAPHY);
      const titleYs = fieldLineYs(svg, 'title');
      const subYs = fieldLineYs(svg, 'subtitle');
      // Long title must wrap to multiple lines instead of overflowing the canvas
      expect(titleYs.length, `${id} wraps title`).toBeGreaterThan(1);
      // No text line sits below the canvas
      for (const y of [...titleYs, ...subYs]) {
        expect(y, `${id} line within canvas`).toBeLessThan(510);
      }
      // Subtitle always starts below the last title line (never overlaps)
      expect(Math.min(...subYs), `${id} subtitle below title`).toBeGreaterThan(Math.max(...titleYs));
    }
  });

  it('every template can be looked up by id', () => {
    for (const tpl of COVER_TEMPLATES) {
      expect(getTemplate(tpl.id)).toBe(tpl);
    }
  });

  it('every template id has meta and every meta maps to a template', () => {
    const ids = new Set(COVER_TEMPLATES.map(t => t.id));
    for (const id of Object.keys(TEMPLATE_META)) {
      expect(ids.has(id), `meta ${id}`).toBe(true);
    }
  });
});
