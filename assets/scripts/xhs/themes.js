/**
 * XHS card theme registry: metadata, fonts and layout directions.
 * Pure data; CSS for each theme lives in assets/styles/xhs.css.
 * @module xhs/themes
 */

export const XHS_REQUIRED_VARIANTS = [
  'cover', 'toc', 'text', 'chapter', 'quote',
  'list', 'image', 'table', 'code', 'formula'
];

/**
 * @typedef {Object} XhsTheme
 * @property {string} id
 * @property {string} name
 * @property {string} visualDirection
 * @property {{body:string,code:string}} fonts
 * @property {{background:string,text:string,accent:string}} colors
 * @property {string[]} variants
 */

/** @type {Record<string, XhsTheme>} */
export const XHS_THEMES = {
  'minimal-white': {
    id: 'minimal-white',
    name: '极简留白',
    visualDirection: 'large-whitespace-left',
    fonts: { body: 'Noto Sans SC', code: 'JetBrains Mono' },
    colors: { background: '#F8F8F6', text: '#171717', accent: '#1B7A5E' },
    variants: [...XHS_REQUIRED_VARIANTS]
  },
  'editorial-magazine': {
    id: 'editorial-magazine',
    name: '编辑部杂志',
    visualDirection: 'editorial-asymmetric',
    fonts: { body: 'Noto Serif SC', code: 'JetBrains Mono' },
    colors: { background: '#F4EFE6', text: '#1B1B1B', accent: '#B42318' },
    variants: [...XHS_REQUIRED_VARIANTS]
  },
  'warm-paper': {
    id: 'warm-paper',
    name: '温暖纸张',
    visualDirection: 'paper-border-centered',
    fonts: { body: 'Noto Serif SC', code: 'JetBrains Mono' },
    colors: { background: '#F7EEDC', text: '#302820', accent: '#A05A2C' },
    variants: [...XHS_REQUIRED_VARIANTS]
  },
  'dark-tech': {
    id: 'dark-tech',
    name: '深色科技',
    visualDirection: 'grid-neon-accent',
    fonts: { body: 'Noto Sans SC', code: 'JetBrains Mono' },
    colors: { background: '#111827', text: '#F9FAFB', accent: '#22D3EE' },
    variants: [...XHS_REQUIRED_VARIANTS]
  },
  'bright-knowledge': {
    id: 'bright-knowledge',
    name: '明快知识卡',
    visualDirection: 'colorful-module-steps',
    fonts: { body: 'Noto Sans SC', code: 'JetBrains Mono' },
    colors: { background: '#FFFDF7', text: '#202124', accent: '#F97316' },
    variants: [...XHS_REQUIRED_VARIANTS]
  }
};
