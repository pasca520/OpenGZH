/**
 * Cover renderer — generates SVG strings from template + content + typography.
 * @module cover/renderer
 */

import { COVER_TEMPLATES } from './templates.js';

/** Default typography settings for cover images */
export const DEFAULT_TYPOGRAPHY = {
  titleSize: 48,
  subtitleSize: 40,
  tagSize: 28,
  authorSize: 14,
  titleLineHeight: 1.3,
  subtitleLineHeight: 1.35,
  titleLetterSpacing: 0,
  subtitleLetterSpacing: 0,
  titleOffsetY: 0,
  subtitleOffsetY: 0,
  titleOffsetX: 0,
  subtitleOffsetX: 0,
  textAlign: 'center',
  titleFontFamily: "'Noto Sans SC', sans-serif",
  subtitleFontFamily: "'Noto Sans SC', sans-serif"
};

/** Default cover content */
export const DEFAULT_COVER_CONTENT = {
  tag: '',
  title: '在此输入标题',
  subtitle: '副标题文字',
  author: '',
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
    'illustration': '插画风格'
  };
  COVER_TEMPLATES.forEach(t => {
    if (!seen.has(t.category)) {
      seen.add(t.category);
      result.push({ id: t.category, label: LABELS[t.category] || t.category });
    }
  });
  return result;
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
    illustrationSvg: content.illustrationSvg || '',
    illustrationOpacity: content.illustrationOpacity ?? 1,
    layerOrder: content.layerOrder || 'text-top'
  };

  // Template always renders at 1200x480 (5:2 ratio)
  const svg = template.render(safeContent, mergedTypo);
  if (safeContent.layerOrder !== 'image-top') return svg;

  const illustrationBlocks = [];
  const withoutIllustrations = svg.replace(/<!--cover-illustration-start-->[\s\S]*?<!--cover-illustration-end-->/g, (block) => {
    illustrationBlocks.push(block);
    return '';
  });

  if (!illustrationBlocks.length) return svg;
  return withoutIllustrations.replace(/<\/svg>\s*$/i, `${illustrationBlocks.join('\n')}\n</svg>`);
}
