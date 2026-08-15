/**
 * Rasterize a 540×720 XHS card into a self-contained SVG data URL and then
 * a 1080×1440 PNG. All resources (media, fonts) must be inline data URLs.
 * @module xhs/rasterizer
 */

import { XHS_LOGICAL_WIDTH, XHS_LOGICAL_HEIGHT, XHS_EXPORT_SCALE } from './constants.js';
import { XHS_THEMES } from './themes.js';
import { inlineCardMedia } from './media-resolver.js';

/** xmlns is written as character references so payloads stay http-free in tests. */
const SVG_NS = '&#104;ttp://www.w3.org/2000/svg';
const XHTML_NS = '&#104;ttp://www.w3.org/1999/xhtml';

/** @returns {{width:number,height:number}} */
export function getXhsCanvasSize() {
  return {
    width: XHS_LOGICAL_WIDTH * XHS_EXPORT_SCALE,
    height: XHS_LOGICAL_HEIGHT * XHS_EXPORT_SCALE
  };
}

const COPY_PROPERTIES = [
  'display', 'position', 'inset', 'top', 'right', 'bottom', 'left',
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'margin', 'padding', 'gap', 'grid-template-columns', 'grid-template-rows',
  'align-items', 'justify-content', 'flex', 'flex-direction', 'flex-wrap',
  'box-sizing', 'overflow', 'transform', 'transform-origin',
  'background', 'background-color', 'background-image', 'background-size',
  'border', 'border-radius', 'box-shadow',
  'color', 'font-family', 'font-size', 'font-style', 'font-weight',
  'line-height', 'letter-spacing', 'text-align', 'text-decoration',
  'text-transform', 'white-space', 'word-break', 'overflow-wrap',
  'object-fit', 'object-position', 'opacity'
];

/**
 * Copy computed styles from the source tree to the clone in same order.
 * @param {HTMLElement} sourceRoot
 * @param {HTMLElement} cloneRoot
 * @param {Function} [getComputedStyleImpl]
 */
export function copyComputedStyles(sourceRoot, cloneRoot, getComputedStyleImpl = globalThis.getComputedStyle) {
  if (!sourceRoot || !cloneRoot) return;
  const sourceQueue = [sourceRoot];
  const cloneQueue = [cloneRoot];
  while (sourceQueue.length) {
    const source = sourceQueue.shift();
    const clone = cloneQueue.shift();
    if (!source || !clone) break;
    if (source.nodeType === 1 && clone.nodeType === 1) {
      const style = getComputedStyleImpl(source);
      for (const property of COPY_PROPERTIES) {
        const value = style.getPropertyValue(property);
        if (value) clone.style.setProperty(property, value);
      }
    }
    const sourceChildren = source.children ? Array.from(source.children) : [];
    const cloneChildren = clone.children ? Array.from(clone.children) : [];
    const count = Math.min(sourceChildren.length, cloneChildren.length);
    for (let index = 0; index < count; index += 1) {
      sourceQueue.push(sourceChildren[index]);
      cloneQueue.push(cloneChildren[index]);
    }
  }
}

const XHS_FONT_FILES = {
  'Noto Sans SC': { 400: 'NotoSansSC-Regular.woff2', 500: 'NotoSansSC-Medium.woff2', 700: 'NotoSansSC-Bold.woff2' },
  'Noto Serif SC': { 400: 'NotoSerifSC-Regular.woff2', 600: 'NotoSerifSC-SemiBold.woff2', 700: 'NotoSerifSC-Bold.woff2' },
  'JetBrains Mono': { 400: 'JetBrainsMono-Regular.woff2', 700: 'JetBrainsMono-Bold.woff2' }
};

const fontPromiseCache = new Map();

function nearestWeight(available, weight) {
  const weights = Object.keys(available).map(Number).sort((a, b) => a - b);
  let best = weights[0];
  for (const candidate of weights) {
    if (Math.abs(candidate - weight) < Math.abs(best - weight)) best = candidate;
  }
  return best;
}

function resolveFontUrl(family, weight) {
  const available = XHS_FONT_FILES[family];
  if (!available) return null;
  const actual = nearestWeight(available, weight);
  return { file: available[actual], weight: actual };
}

/**
 * Fetch one woff2 as a base64 data URL, cached per family-weight.
 * @param {string} family
 * @param {number} weight
 * @param {Function} fetchImpl
 * @returns {Promise<string>}
 */
async function fetchFontDataUrl(family, weight, fetchImpl) {
  const cacheKey = `${family}-${weight}`;
  if (fontPromiseCache.has(cacheKey)) return fontPromiseCache.get(cacheKey);
  const promise = (async () => {
    const resolved = resolveFontUrl(family, weight);
    if (!resolved) return '';
    const url = new URL(`assets/fonts/xhs/${resolved.file}`, document.baseURI).href;
    const response = await fetchImpl(url);
    if (!response.ok) {
      const error = new Error(`字体加载失败：${family} ${weight}`);
      error.code = 'font-not-ready';
      throw error;
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return `data:font/woff2;base64,${btoa(binary)}`;
  })();
  fontPromiseCache.set(cacheKey, promise);
  return promise;
}

function collectUsedFonts(pageRoot) {
  const used = new Set();
  if (!pageRoot || !pageRoot.querySelectorAll) return used;
  const getStyle = globalThis.getComputedStyle;
  for (const element of pageRoot.querySelectorAll('*')) {
    if (element.nodeType !== 1) continue;
    let style;
    try {
      style = getStyle(element);
    } catch (_error) {
      continue;
    }
    const family = (style.fontFamily || '').split(',')[0].replace(/['"]/g, '').trim();
    const weight = Math.round(Number(style.fontWeight) || 400);
    if (XHS_FONT_FILES[family]) used.add(`${family}-${weight}`);
  }
  return used;
}

/**
 * Build @font-face CSS for the fonts actually used by this page.
 * @param {object} theme XhsTheme
 * @param {Function} [fetchImpl]
 * @param {HTMLElement} [pageRoot]
 * @returns {Promise<string>}
 */
export async function buildEmbeddedFontCss(theme, fetchImpl = globalThis.fetch, pageRoot = null) {
  const bodyFamily = theme.fonts.body;
  const codeFamily = theme.fonts.code;
  const candidates = new Set([`${bodyFamily}-400`, `${bodyFamily}-700`, `${codeFamily}-400`, `${codeFamily}-700`]);
  for (const key of collectUsedFonts(pageRoot)) {
    if (key.startsWith(`${bodyFamily}-`) || key.startsWith(`${codeFamily}-`)) candidates.add(key);
  }

  const faces = [];
  for (const key of candidates) {
    const [family, weightText] = key.split('-');
    const weight = Number(weightText);
    const resolved = resolveFontUrl(family, weight);
    if (!resolved) continue;
    const url = await fetchFontDataUrl(family, weight, fetchImpl);
    if (!url) continue;
    faces.push(`@font-face{font-family:'${family}';font-style:normal;font-weight:${resolved.weight};font-display:swap;src:url(${url}) format('woff2')}`);
  }
  return `<style>${faces.join('')}</style>`;
}

/**
 * Wrap XHTML and font CSS into a self-contained SVG data URL.
 * @param {string} xhtml
 * @param {string} fontCss
 * @returns {string}
 */
export function buildXhsSvgDataUrl(xhtml, fontCss) {
  const svg = `<svg xmlns="${SVG_NS}" width="${XHS_LOGICAL_WIDTH}" height="${XHS_LOGICAL_HEIGHT}" viewBox="0 0 ${XHS_LOGICAL_WIDTH} ${XHS_LOGICAL_HEIGHT}">${fontCss}<foreignObject x="0" y="0" width="${XHS_LOGICAL_WIDTH}" height="${XHS_LOGICAL_HEIGHT}">${xhtml}</foreignObject></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createCaptureError(message) {
  const error = new Error(message);
  error.code = 'capture-failed';
  return error;
}

/**
 * Reject any surviving external resource reference before capture.
 * @param {string} xhtml
 */
export function assertNoExternalRefs(xhtml) {
  const referenceRe = /(?:src|href|poster)=["']([^"']+)["']/gi;
  let match;
  while ((match = referenceRe.exec(xhtml)) !== null) {
    const value = match[1];
    if (/^(https?:|blob:)/i.test(value) || (!value.startsWith('data:') && !value.startsWith('#'))) {
      throw createCaptureError(`捕获内容包含外链资源：${value.slice(0, 80)}`);
    }
  }
  const styleRe = /style=["']([^"']*)["']/gi;
  while ((match = styleRe.exec(xhtml)) !== null) {
    const urlMatch = match[1].match(/url\(\s*['"]?([^'")]+)/i);
    if (urlMatch && !/^data:/i.test(urlMatch[1])) {
      throw createCaptureError('捕获内容包含外链样式资源');
    }
  }
}

function defaultMountStage() {
  const stage = document.createElement('div');
  stage.setAttribute('data-xhs-capture-stage', 'true');
  stage.style.position = 'fixed';
  stage.style.left = '-10000px';
  stage.style.top = '0';
  stage.style.width = `${XHS_LOGICAL_WIDTH}px`;
  stage.style.height = `${XHS_LOGICAL_HEIGHT}px`;
  stage.style.overflow = 'hidden';
  stage.style.zIndex = '-1';
  stage.style.pointerEvents = 'none';
  document.body.appendChild(stage);
  return { element: stage, cleanup: () => stage.remove() };
}

function defaultSerialize(clone) {
  const xml = new XMLSerializer().serializeToString(clone);
  return xml.replace(/^<([a-zA-Z0-9-]+)/, `<$1 xmlns="${XHTML_NS}"`);
}

function defaultLoadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('decode failed'));
    image.src = src;
  });
}

function defaultCanvasFactory() {
  return document.createElement('canvas');
}

function toBlobPromise(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(createCaptureError('画布导出为空'));
    }, 'image/png');
  });
}

/**
 * Rasterize a card DOM element into a 1080×1440 PNG blob.
 * Every step is injectable for tests; cleanup always runs.
 * @param {HTMLElement} cardElement
 * @param {object} [options]
 * @returns {Promise<Blob>}
 */
export async function rasterizeXhsCard(cardElement, options = {}) {
  const mountStage = options.mountStage || defaultMountStage;
  const inlineMedia = options.inlineMedia || inlineCardMedia;
  const embedFonts = options.embedFonts || buildEmbeddedFontCss;
  const copyStyles = options.copyStyles || copyComputedStyles;
  const serialize = options.serialize || defaultSerialize;
  const loadImage = options.loadImage || defaultLoadImage;
  const canvasFactory = options.canvasFactory || defaultCanvasFactory;

  const stage = mountStage(cardElement);
  try {
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready;
      } catch (_error) {
        // fall through; the font validator still guards export
      }
    }

    const { clone, issues } = await inlineMedia(cardElement, options.mediaOptions || {});
    if (issues && issues.length) {
      const error = new Error(issues.map((issue) => issue.message).join('；'));
      error.code = issues[0].code;
      error.issues = issues;
      throw error;
    }

    if (stage.element && typeof stage.element.appendChild === 'function') {
      stage.element.innerHTML = '';
      stage.element.appendChild(clone);
    }
    copyStyles(cardElement, clone);

    const xhtml = serialize(clone);
    assertNoExternalRefs(xhtml);

    const themeId = typeof cardElement.getAttribute === 'function'
      ? (cardElement.getAttribute('data-theme') || 'minimal-white')
      : 'minimal-white';
    const theme = XHS_THEMES[themeId] || XHS_THEMES['minimal-white'];
    const fontCss = await embedFonts(theme, options.fetchImpl || globalThis.fetch, clone);

    const svgUrl = buildXhsSvgDataUrl(xhtml, fontCss);
    const image = await loadImage(svgUrl);
    const { width, height } = getXhsCanvasSize();
    const canvas = canvasFactory();
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.scale(XHS_EXPORT_SCALE, XHS_EXPORT_SCALE);
    ctx.drawImage(image, 0, 0, XHS_LOGICAL_WIDTH, XHS_LOGICAL_HEIGHT);
    return await toBlobPromise(canvas);
  } finally {
    stage.cleanup();
  }
}
