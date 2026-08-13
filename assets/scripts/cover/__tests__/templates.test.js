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

const NEW_TEMPLATE_IDS = [
  'editorial-depth',
  'data-brief',
  'product-launch',
  'prism-spectrum',
  'paper-cut-window',
  'pixel-future'
];

function estimatedTextWidth(text, fontSize) {
  let width = 0;
  for (const ch of text) {
    width += ch.codePointAt(0) > 0x2E7F ? fontSize : fontSize * 0.58;
  }
  return width;
}

/** Parse rendered position and estimated bounds for every line of a data-field. */
function fieldLines(svg, field) {
  const re = /<text\s+([^>]*)>([^<]*)<\/text>/g;
  const lines = [];
  let m;
  while ((m = re.exec(svg)) !== null) {
    const attrs = m[1];
    const get = name => attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1];
    if (get('data-field') !== field) continue;

    const x = Number(get('x'));
    const y = Number(get('y'));
    const fontSize = Number(get('font-size'));
    const width = estimatedTextWidth(m[2], fontSize);
    const anchor = get('text-anchor') || 'start';
    const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
    const right = anchor === 'middle' ? x + width / 2 : anchor === 'end' ? x : x + width;
    lines.push({ x, y, left, right, fontSize, text: m[2] });
  }
  return lines;
}

describe('cover templates', () => {
  it('has exactly 46 templates with unique ids', () => {
    expect(COVER_TEMPLATES.length).toBe(46);
    const ids = COVER_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach(id => expect(id).toMatch(/^[a-z0-9-]+$/));
  });

  it('includes all six new templates with metadata and text bounds', () => {
    for (const id of NEW_TEMPLATE_IDS) {
      const template = getTemplate(id);
      expect(template, id).toBeTruthy();
      expect(template.textBox?.titleWidth, `${id} title width`).toBeGreaterThan(0);
      expect(template.textBox?.subtitleWidth, `${id} subtitle width`).toBeGreaterThan(0);
      expect(TEMPLATE_META[id], `${id} metadata`).toBeTruthy();
    }
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
    expect(byCategory.length).toBe(6);
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

  it('flows realistic 20-30 char copy within every canvas and keeps subtitle below', () => {
    for (const template of COVER_TEMPLATES) {
      const svg = renderCover(template.id, LONG, DEFAULT_TYPOGRAPHY);
      const titleLines = fieldLines(svg, 'title');
      const subtitleLines = fieldLines(svg, 'subtitle');

      expect(titleLines.length, `${template.id} wraps title`).toBeGreaterThan(1);
      expect(subtitleLines.length, `${template.id} renders subtitle`).toBeGreaterThan(0);
      for (const line of [...titleLines, ...subtitleLines]) {
        expect(line.left, `${template.id} left edge`).toBeGreaterThanOrEqual(0);
        expect(line.right, `${template.id} right edge`).toBeLessThanOrEqual(1200);
        expect(line.y, `${template.id} top edge`).toBeGreaterThan(0);
        expect(line.y, `${template.id} bottom edge`).toBeLessThan(510);
      }
      expect(Math.min(...subtitleLines.map(line => line.y)), `${template.id} subtitle below title`)
        .toBeGreaterThan(Math.max(...titleLines.map(line => line.y)));
    }
  });

  it('keeps text out of composition artwork in narrow layouts', () => {
    const limits = {
      'data-brief': { title: 740, subtitle: 740 },
      'pixel-future': { title: 740, subtitle: 740 },
      'abs-line-art': { title: 840, subtitle: 840 },
      'abs-op-art': { title: 840, subtitle: 840 },
      'abs-bauhaus': { title: 800, subtitle: 600 },
      'product-launch': { title: 720, subtitle: 720 }
    };

    for (const [id, fields] of Object.entries(limits)) {
      const svg = renderCover(id, LONG, DEFAULT_TYPOGRAPHY);
      for (const [field, rightEdge] of Object.entries(fields)) {
        const renderedRight = Math.max(...fieldLines(svg, field).map(line => line.right));
        expect(renderedRight, `${id} ${field} artwork boundary`).toBeLessThanOrEqual(rightEdge);
      }
    }
  });

  it('escapes dynamic text and avoids fragile decorative glyphs', () => {
    const svg = renderCover('mag-swiss', {
      ...SAMPLE,
      tag: 'A&B <产品>',
      title: '标题 "安全" & 可读'
    });
    expect(svg).toContain('A&amp;B &lt;产品&gt;');
    expect(svg).toContain('标题 &quot;安全&quot; &amp; 可读');
    expect(COVER_TEMPLATES.map(t => t.render.toString()).join('\n')).not.toContain('№');
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
