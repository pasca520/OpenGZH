import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { COVER_TEMPLATES, TEMPLATE_META } from '../templates.js';
import { renderCover, getCategories, getTemplate, getTemplates, DEFAULT_COVER_CONTENT, DEFAULT_TYPOGRAPHY } from '../renderer.js';

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

const CENTERED_BACKGROUND_IDS = [
  'midnight-prism',
  'editorial-seal',
  'circuit-grid',
  'orbit-glow',
  'cobalt-radar',
  'vermilion-fold',
  'ink-wash',
  'emerald-contour',
  'amber-horizon',
  'graphite-grid',
  'cyan-blueprint',
  'coral-ripple',
  'forest-window',
  'silver-glass',
  'burgundy-lines',
  'ultraviolet-noise'
];

/** Parse y-position of every rendered line for a data-field. */
function fieldLineYs(svg, field) {
  const re = new RegExp(`y="([\\d.]+)"[^>]*data-field="${field}"`, 'g');
  const ys = [];
  let m;
  while ((m = re.exec(svg)) !== null) ys.push(parseFloat(m[1]));
  return ys;
}

describe('cover templates', () => {
  it('has exactly 41 templates with unique ids', () => {
    expect(COVER_TEMPLATES.length).toBe(41);
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

  it('uses one editable centered layout with 16 selectable backgrounds', () => {
    const centered = getTemplates('centered');
    expect(centered.map(t => t.id)).toEqual(['centered-layout']);
    expect(getCategories().find(c => c.id === 'centered')?.label).toBe('居中布局');

    const [tpl] = centered;
    expect(tpl.elements).toMatchObject({
      tag: true,
      title: true,
      subtitle: true,
      author: true
    });
    expect(tpl.backgrounds.map(background => background.id)).toEqual(CENTERED_BACKGROUND_IDS);

    for (const background of tpl.backgrounds) {
      expect(background.name, `${background.id} name`).toBeTruthy();
      expect(background.preview, `${background.id} preview`).toBeTruthy();
      const svg = renderCover(
        tpl.id,
        { ...SAMPLE, tag: '技术分享', author: 'AI产品零度', backgroundId: background.id },
        DEFAULT_TYPOGRAPHY
      );
      expect(svg, `${background.id} marker`).toContain(`data-background="${background.id}"`);
      expect(svg, `${background.id} no type label`).not.toContain('>类型<');
      expect(svg, `${background.id} no author label`).not.toContain('>作者<');
      expect(svg, `${background.id} editable tag`).toContain('data-field="tag"');
      expect(svg, `${background.id} editable author`).toContain('data-field="author"');
      expect(svg, `${background.id} tag value`).toContain('技术分享');
      expect(svg, `${background.id} author value`).toContain('@AI产品零度');
    }
  });

  it('normalizes an existing author @ prefix instead of duplicating it', () => {
    const svg = renderCover(
      'centered-layout',
      { ...SAMPLE, author: '@AI产品零度', backgroundId: 'midnight-prism' },
      DEFAULT_TYPOGRAPHY
    );
    expect(svg).toContain('@AI产品零度');
    expect(svg).not.toContain('@@AI产品零度');
  });

  it('uses the requested type and author defaults for initialization and reset', () => {
    const mainSource = readFileSync(new URL('../../main.js', import.meta.url), 'utf8');
    expect(mainSource.match(/tag: '技术分享'/g)).toHaveLength(2);
    expect(mainSource.match(/author: 'AI产品零度'/g)).toHaveLength(2);
    expect(DEFAULT_COVER_CONTENT).toMatchObject({ tag: '技术分享', author: 'AI产品零度' });
  });

  it('wires background selection into rendering, history and the editor UI', () => {
    const mainSource = readFileSync(new URL('../../main.js', import.meta.url), 'utf8');
    const indexSource = readFileSync(new URL('../../../../index.html', import.meta.url), 'utf8');
    const cssSource = readFileSync(new URL('../../../../assets/styles/cover.css', import.meta.url), 'utf8');

    expect(mainSource).toContain("const coverBackgroundId = ref('midnight-prism')");
    expect(mainSource).toContain('const currentTemplateBackgrounds = computed');
    expect(mainSource).toContain('backgroundId: coverBackgroundId.value');
    expect(mainSource).toContain('function selectCoverBackground(id)');
    expect(mainSource).toContain('backgroundId: coverBackgroundId.value,');
    expect(mainSource).toContain('state.backgroundId');
    expect(indexSource).toContain('class="cover-background-grid"');
    expect(indexSource).toContain('role="radiogroup"');
    expect(indexSource).toContain('v-for="background in currentTemplateBackgrounds"');
    expect(cssSource).toContain('.cover-background-grid');
    expect(cssSource).toContain('.cover-background-option:focus-visible');
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
      .filter(t => t.id.startsWith('mag-') || t.id.startsWith('abs-') || t.category === 'centered')
      .map(t => t.id);
    expect(wrappedIds.length).toBe(11);

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
