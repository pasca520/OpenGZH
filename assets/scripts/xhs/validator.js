/**
 * Pre-export validation of XHS cards: fonts, media, overflow, safe area,
 * minimum font sizes and color contrast. Pure issue derivation with an
 * injectable inspector so Node tests never touch the DOM.
 * @module xhs/validator
 */

import { XHS_LOGICAL_WIDTH, XHS_LOGICAL_HEIGHT } from './constants.js';

export const XHS_MIN_BODY_FONT = 22;
export const XHS_MIN_TABLE_CODE_FONT = 16;
export const XHS_MIN_FOOTER_FONT = 14;
export const XHS_MIN_CONTRAST = 4.5;
export const XHS_MIN_CONTRAST_LARGE = 3;

/**
 * @param {string} value CSS color string
 * @returns {{r:number,g:number,b:number,a:number}|null}
 */
export function parseCssColor(value) {
  const source = String(value || '').trim();
  if (!source) return null;

  const hex = source.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) {
      digits = digits.split('').map((char) => char + char).join('');
    }
    if (digits.length === 6) digits += 'ff';
    if (digits.length !== 8) return null;
    const r = parseInt(digits.slice(0, 2), 16);
    const g = parseInt(digits.slice(2, 4), 16);
    const b = parseInt(digits.slice(4, 6), 16);
    const a = parseInt(digits.slice(6, 8), 16) / 255;
    return { r, g, b, a };
  }

  const rgb = source.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i);
  if (rgb) {
    const channel = (part) => {
      const number = Number(part);
      return part != null && String(part).endsWith('%') ? Math.round((number / 100) * 255) : number;
    };
    const alpha = rgb[4] != null ? (String(rgb[4]).endsWith('%') ? Number(rgb[4]) / 100 : Number(rgb[4])) : 1;
    return { r: channel(rgb[1]), g: channel(rgb[2]), b: channel(rgb[3]), a: alpha };
  }

  return null;
}

function linearize(channel) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
}

function luminance(color) {
  return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
}

function composite(foreground, background) {
  const alpha = Math.min(1, Math.max(0, foreground.a));
  return {
    r: Math.round(foreground.r * alpha + background.r * (1 - alpha)),
    g: Math.round(foreground.g * alpha + background.g * (1 - alpha)),
    b: Math.round(foreground.b * alpha + background.b * (1 - alpha)),
    a: 1
  };
}

/**
 * WCAG contrast ratio between two colors (alpha-composited onto background).
 * @param {string|object} foreground
 * @param {string|object} background
 * @returns {number}
 */
export function contrastRatio(foreground, background) {
  const fg = typeof foreground === 'string' ? parseCssColor(foreground) : foreground;
  const bg = typeof background === 'string' ? parseCssColor(background) : background;
  if (!fg || !bg) return 0;
  const effective = composite(fg, bg);
  const l1 = luminance(effective);
  const l2 = luminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Walk ancestors compositing translucent backgrounds over each other until
 * an opaque surface is found; falls back to white.
 * @param {HTMLElement} element
 * @param {(el:HTMLElement) => CSSStyleDeclaration} getComputedStyleImpl
 * @returns {{r:number,g:number,b:number,a:number}}
 */
export function resolveEffectiveBackground(element, getComputedStyleImpl) {
  let node = element;
  let color = null;
  while (node && typeof node.nodeType === 'number') {
    const style = getComputedStyleImpl(node);
    const background = parseCssColor(style.backgroundColor);
    if (background && background.a > 0) {
      if (color === null) {
        color = { r: background.r, g: background.g, b: background.b, a: background.a };
      } else {
        const alpha = Math.min(1, background.a * (1 - color.a));
        color = {
          r: Math.round(background.r * alpha + color.r * (1 - alpha)),
          g: Math.round(background.g * alpha + color.g * (1 - alpha)),
          b: Math.round(background.b * alpha + color.b * (1 - alpha)),
          a: Math.min(1, color.a + alpha)
        };
      }
      if (color.a >= 0.999) {
        return { r: color.r, g: color.g, b: color.b, a: 1 };
      }
    }
    node = node.parentElement || null;
  }
  if (color === null) return { r: 255, g: 255, b: 255, a: 1 };
  // composite the remaining transparency over white
  return {
    r: Math.round(color.r * color.a + 255 * (1 - color.a)),
    g: Math.round(color.g * color.a + 255 * (1 - color.a)),
    b: Math.round(color.b * color.a + 255 * (1 - color.a)),
    a: 1
  };
}

const MIN_FONT_BY_KIND = {
  body: XHS_MIN_BODY_FONT,
  code: XHS_MIN_TABLE_CODE_FONT,
  table: XHS_MIN_TABLE_CODE_FONT,
  footer: XHS_MIN_FOOTER_FONT
};

const KIND_BY_SELECTOR = [
  { selector: '.xhs-footer', kind: 'footer' },
  { selector: '.xhs-code, .xhs-code-pre', kind: 'code' },
  { selector: '.xhs-table', kind: 'table' },
  { selector: '.xhs-card-body', kind: 'body' }
];

/**
 * Browser default inspector: turn a real card DOM into a validation snapshot.
 * Remote (http/https) refs are NOT resolved here — CORS enforcement happens
 * at rasterize time; this inspector only verifies local refs exist.
 * @param {HTMLElement} card
 * @param {{getImageBlob?: (id:string) => Promise<Blob|null>}} [imageStore]
 * @returns {Promise<object>}
 */
export async function inspectCardInBrowser(card, imageStore) {
  const body = card.querySelector('.xhs-card-body') || card;
  const cardRect = card.getBoundingClientRect();
  const bodyRect = body.getBoundingClientRect();
  const footer = card.querySelector('.xhs-footer');

  const outOfBoundsBlockIds = [];
  for (const block of card.querySelectorAll('.xhs-block')) {
    const rect = block.getBoundingClientRect();
    if (
      rect.left < cardRect.left - 0.5 || rect.right > cardRect.right + 0.5 ||
      rect.top < cardRect.top - 0.5 || rect.bottom > cardRect.bottom + 0.5
    ) {
      outOfBoundsBlockIds.push(block.getAttribute('data-block-id') || 'unknown');
    }
  }

  let minimumFont = null;
  for (const { selector, kind } of KIND_BY_SELECTOR) {
    const found = card.querySelector(selector);
    if (!found) continue;
    const size = parseFloat(getComputedStyle(found).fontSize);
    if (!minimumFont || size < minimumFont.size) {
      minimumFont = { size, kind, blockId: found.closest('.xhs-block')?.getAttribute('data-block-id') || null };
    }
  }

  const contrastFailures = [];
  const textElements = Array.from(card.querySelectorAll('.xhs-card-body p, .xhs-card-body li, .xhs-card-body h1, .xhs-card-body h2, .xhs-card-body h3, .xhs-card-body blockquote, .xhs-card-body th, .xhs-card-body td, .xhs-footer'));
  for (const element of textElements) {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const color = parseCssColor(style.color);
    const background = resolveEffectiveBackground(element, getComputedStyle);
    if (!color) continue;
    const ratio = contrastRatio(color, background);
    const fontSize = parseFloat(style.fontSize);
    const fontWeight = Number(style.fontWeight) || 400;
    const large = fontSize >= 24 && fontWeight >= 700;
    const threshold = large ? XHS_MIN_CONTRAST_LARGE : XHS_MIN_CONTRAST;
    if (ratio < threshold) {
      contrastFailures.push({ ratio: Math.round(ratio * 100) / 100, blockId: element.closest('.xhs-block')?.getAttribute('data-block-id') || null });
    }
  }

  const mediaFailures = [];
  const mediaTargets = Array.from(card.querySelectorAll('[data-media-ref], video[src]'));
  for (const element of mediaTargets) {
    const ref = element.getAttribute('data-media-ref') || element.getAttribute('src') || '';
    const blockId = element.closest('.xhs-block')?.getAttribute('data-block-id') || null;
    if (/^data:|^blob:/i.test(ref)) continue;
    if (/^https?:/i.test(ref)) continue; // CORS checked only at rasterize
    if (ref.startsWith('img://')) {
      const id = ref.slice('img://'.length);
      const blob = imageStore ? await imageStore.getImageBlob(id) : null;
      if (!blob) mediaFailures.push({ blockId });
    } else if (ref) {
      mediaFailures.push({ blockId });
    }
  }

  const formulaFailures = [];
  for (const formula of card.querySelectorAll('.xhs-formula')) {
    if (formula.scrollWidth > formula.clientWidth + 0.5) {
      formulaFailures.push({ blockId: formula.closest('.xhs-block')?.getAttribute('data-block-id') || null });
    }
  }

  let fontsReady = true;
  if (typeof document !== 'undefined' && document.fonts?.load) {
    try {
      const cardStyle = getComputedStyle(card);
      const family = cardStyle.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
      const pending = [
        document.fonts.load(`16px "${family}"`),
        document.fonts.load(`700 16px "${family}"`)
      ];
      await Promise.race([
        Promise.all(pending).catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, 3000))
      ]);
      fontsReady = document.fonts.check(`16px "${family}"`)
        && document.fonts.check(`700 16px "${family}"`);
    } catch (_error) {
      fontsReady = false;
    }
  }

  return {
    body: {
      scrollWidth: body.scrollWidth,
      clientWidth: body.clientWidth,
      scrollHeight: body.scrollHeight,
      clientHeight: body.clientHeight
    },
    bodyRect: bodyRect && { top: bodyRect.top, bottom: bodyRect.bottom },
    footerRect: footer && footer.getBoundingClientRect() && {
      top: footer.getBoundingClientRect().top,
      bottom: footer.getBoundingClientRect().bottom
    },
    outOfBoundsBlockIds,
    minimumFont,
    contrastFailures,
    mediaFailures,
    formulaFailures,
    fontsReady
  };
}

function pageLabel(pageIndex) {
  return `第 ${pageIndex + 1} 页`;
}

/**
 * Derive issues from an inspection snapshot.
 * @param {object} snapshot
 * @param {number} pageIndex
 * @returns {object[]}
 */
export function deriveIssuesFromSnapshot(snapshot, pageIndex) {
  const issues = [];
  const label = pageLabel(pageIndex);
  const blockIdOf = (id) => id || null;

  if (snapshot.body.scrollWidth > snapshot.body.clientWidth + 0.5) {
    issues.push({
      code: 'overflow-x',
      pageIndex,
      blockId: null,
      message: `${label}内容横向溢出，请检查过宽表格、代码或公式。`
    });
  }
  if (snapshot.body.scrollHeight > snapshot.body.clientHeight + 0.5) {
    issues.push({
      code: 'overflow-y',
      pageIndex,
      blockId: null,
      message: `${label}正文超出底部，请插入分页点或切换“紧凑”密度。`
    });
  }
  for (const blockId of snapshot.outOfBoundsBlockIds || []) {
    issues.push({
      code: 'unsafe-area',
      pageIndex,
      blockId: blockIdOf(blockId),
      message: `${label}正文超出底部安全区，请插入分页点或切换“紧凑”密度。`
    });
  }
  if (snapshot.footerRect && snapshot.bodyRect && snapshot.footerRect.top < snapshot.bodyRect.bottom - 0.5) {
    issues.push({
      code: 'unsafe-area',
      pageIndex,
      blockId: null,
      message: `${label}页脚进入正文安全区，请插入分页点或切换“紧凑”密度。`
    });
  }

  const minimumFont = snapshot.minimumFont;
  if (minimumFont && Number.isFinite(minimumFont.size)) {
    const threshold = MIN_FONT_BY_KIND[minimumFont.kind] || XHS_MIN_BODY_FONT;
    if (minimumFont.size < threshold) {
      issues.push({
        code: 'font-too-small',
        pageIndex,
        blockId: blockIdOf(minimumFont.blockId),
        message: `${label}${minimumFont.kind === 'footer' ? '页脚' : minimumFont.kind === 'code' ? '代码' : minimumFont.kind === 'table' ? '表格' : '正文'}字号过小（${minimumFont.size}px），不满足可读性要求。`
      });
    }
  }

  for (const failure of snapshot.contrastFailures || []) {
    const threshold = failure.ratio < XHS_MIN_CONTRAST_LARGE ? XHS_MIN_CONTRAST : XHS_MIN_CONTRAST_LARGE;
    issues.push({
      code: 'contrast',
      pageIndex,
      blockId: blockIdOf(failure.blockId),
      message: `${label}颜色对比度不足（${failure.ratio}:1，需 ≥ ${threshold}:1）。`
    });
  }

  for (const failure of snapshot.mediaFailures || []) {
    issues.push({
      code: 'media-not-ready',
      pageIndex,
      blockId: blockIdOf(failure.blockId),
      message: `${label}远程图片无法安全导出，请下载到文章目录后重新导入。`
    });
  }

  for (const failure of snapshot.formulaFailures || []) {
    issues.push({
      code: 'unbreakable-block',
      pageIndex,
      blockId: blockIdOf(failure.blockId),
      message: `${label}数学公式在可读字号下超出内容宽度，请缩短公式或插入分页点。`
    });
  }

  if (snapshot.fontsReady === false) {
    issues.push({
      code: 'font-not-ready',
      pageIndex,
      blockId: null,
      message: `${label}字体尚未加载完成，请等待后重试。`
    });
  }

  return issues;
}

/**
 * Validate one card.
 * @param {HTMLElement} card
 * @param {number} pageIndex
 * @param {{inspectCard?: Function, imageStore?: object}} [runtime]
 * @returns {Promise<object[]>} XhsValidationIssue[]
 */
export async function validateXhsCard(card, pageIndex, runtime = {}) {
  const inspect = runtime.inspectCard || ((target) => inspectCardInBrowser(target, runtime.imageStore));
  const snapshot = await inspect(card);
  return deriveIssuesFromSnapshot(snapshot, pageIndex);
}

/**
 * Validate a whole set; any failure blocks the set export.
 * @param {object[]} cards
 * @param {{validateCard?: Function, imageStore?: object}} [runtime]
 * @returns {Promise<{ok:boolean, issues:object[], validPageIndexes:number[]}>}
 */
export async function validateXhsSet(cards, runtime = {}) {
  const validateCard = runtime.validateCard || validateXhsCard;
  const issues = [];
  const validPageIndexes = [];
  for (let index = 0; index < cards.length; index += 1) {
    const pageIssues = await validateCard(cards[index], index, runtime);
    if (pageIssues && pageIssues.length) {
      issues.push(...pageIssues);
    } else {
      validPageIndexes.push(index);
    }
  }
  return { ok: issues.length === 0, issues, validPageIndexes };
}
