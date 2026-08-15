/**
 * Cover renderer — generates SVG strings from template + content + typography.
 * @module cover/renderer
 */

import { COVER_TEMPLATES, wrapText } from './templates.js';

/** Default typography settings for cover images */
export const DEFAULT_TYPOGRAPHY = {
  titleSize: 56,
  subtitleSize: 30,
  tagSize: 26,
  authorSize: 14,
  titleLineHeight: 1.25,
  subtitleLineHeight: 1.4,
  titleLetterSpacing: -0.5,
  subtitleLetterSpacing: 1,
  titleOffsetY: 0,
  subtitleOffsetY: 0,
  titleOffsetX: 0,
  subtitleOffsetX: 0,
  textAlign: 'center',
  titleFontFamily: "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  subtitleFontFamily: "system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif"
};

/** Default cover content */
export const DEFAULT_COVER_CONTENT = {
  tag: '技术分享',
  title: '在此输入标题',
  subtitle: '副标题文字',
  author: 'AI产品零度',
  issueNumber: 'No.01',
  illustrationSvg: ''
};

/**
 * Look up a template by ID.
 * @param {string} templateId
 * @returns {Object|null}
 */
export function getTemplate(templateId) {
  return COVER_TEMPLATES.find(t => t.id === templateId) || null;
}

/**
 * Get all templates, optionally filtered by category.
 * @param {string} [category]
 * @returns {Array}
 */
export function getTemplates(category) {
  if (!category) return COVER_TEMPLATES;
  return COVER_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get the list of unique categories.
 * @returns {string[]}
 */
export function getCategories() {
  const seen = new Set();
  const result = [];
  const LABELS = {
    'solid-dark': '深色',
    'solid-light': '浅色',
    'gradient': '渐变',
    'geometric': '几何装饰',
    'glass-texture': '质感纹理',
    'editorial': '版式布局',
    'illustration': '插画风格',
    'abstract-art': '抽象艺术',
    'centered': '居中布局'
  };
  COVER_TEMPLATES.forEach(t => {
    if (!seen.has(t.category)) {
      seen.add(t.category);
      result.push({ id: t.category, label: LABELS[t.category] || t.category });
    }
  });
  return result;
}

function lineHeightPx(fontSize, lineHeight) {
  return lineHeight <= 4 ? fontSize * lineHeight : lineHeight;
}

function flowCoverText(template, content, typography) {
  if (!template.textBox) return { content, typography };

  const title = wrapText(content.title, typography.titleSize, template.textBox.titleWidth);
  const subtitle = wrapText(
    content.subtitle,
    typography.subtitleSize,
    template.textBox.subtitleWidth || template.textBox.titleWidth
  );
  const titleLines = title ? title.split('\n').length : 0;

  return {
    content: { ...content, title, subtitle },
    typography: {
      ...typography,
      subtitleOffsetY: typography.subtitleOffsetY
        + Math.max(0, titleLines - 1) * lineHeightPx(typography.titleSize, typography.titleLineHeight)
    }
  };
}

/**
 * Render a cover SVG string.
 * @param {string} templateId
 * @param {Object} content - { tag, title, subtitle, author }
 * @param {Object} [typography] - typography overrides (merged with defaults)
 * @returns {string} Complete SVG string
 */
export function renderCover(templateId, content, typography = {}) {
  const template = getTemplate(templateId);
  if (!template) return '';

  const mergedTypo = { ...DEFAULT_TYPOGRAPHY, ...typography };
  const safeContent = {
    tag: content.tag || '',
    title: content.title || '',
    subtitle: content.subtitle || '',
    author: content.author || '',
    issueNumber: content.issueNumber || 'No.01',
    backgroundId: content.backgroundId || '',
    illustrationSvg: content.illustrationSvg || '',
    illustrationOpacity: content.illustrationOpacity ?? 1,
    layerOrder: content.layerOrder || 'text-top'
  };

  const flowed = flowCoverText(template, safeContent, mergedTypo);

  // Template renders at 1200x510 (~900:383 ratio for WeChat covers)
  const svg = template.render(flowed.content, flowed.typography);
  if (safeContent.layerOrder !== 'image-top') return svg;

  const illustrationBlocks = [];
  const withoutIllustrations = svg.replace(/<!--cover-illustration-start-->[\s\S]*?<!--cover-illustration-end-->/g, (block) => {
    illustrationBlocks.push(block);
    return '';
  });

  if (!illustrationBlocks.length) return svg;
  return withoutIllustrations.replace(/<\/svg>\s*$/i, `${illustrationBlocks.join('\n')}\n</svg>`);
}
