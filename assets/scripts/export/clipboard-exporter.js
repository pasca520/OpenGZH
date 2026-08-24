/**
 * Clipboard exporter for WeChat-compatible HTML.
 * @module clipboard-exporter
 */

import { convertMathForWechat, stripFormulaExportMetadata } from './math-exporter.js';
import { applyCodeHighlighting, serializeHighlightedCodeHtml } from '../core/code-highlight.js';
import { buildEndDividerGif, END_DIVIDER_META } from './end-divider-gif.js';
import { buildCardDecorationGif } from './card-decoration-gif.js';
import { resolveCardTokens } from '../core/card-styles.js';
import { buildTableImageAlt, renderTableToPng } from './table-image-renderer.js';

function extractBackgroundColor(styleString) {
  if (!styleString) return null;

  const bgColorMatch = styleString.match(/background-color:\s*([^;]+)/);
  if (bgColorMatch) return bgColorMatch[1].trim();

  const bgMatch = styleString.match(/background:\s*([#rgb][^;]+)/);
  if (bgMatch) {
    const bgValue = bgMatch[1].trim();
    if (bgValue.startsWith('#') || bgValue.startsWith('rgb')) return bgValue;
  }

  return null;
}

const CLIPBOARD_IMAGE_MAX_BYTES = 1024 * 1024;
const CLIPBOARD_IMAGE_MAX_DIMENSION = 1200;
const CLIPBOARD_IMAGE_JPEG_QUALITY = 0.6;
const IMAGE_READ_TIMEOUT_MS = 8000;
const IMAGE_GIF_CHECK_TIMEOUT_MS = 3000;
const ARTICLE_INVALID = 'ARTICLE_INVALID';

function withTimeout(promise, ms, message = 'Operation timed out') {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    })
  ]);
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function ensureBlobType(blob, mimeType) {
  if (!blob || !mimeType || blob.type === mimeType) return blob;
  return new Blob([blob], { type: mimeType });
}

function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectURL = URL.createObjectURL(blob);

    image.onload = () => {
      URL.revokeObjectURL(objectURL);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectURL);
      reject(new Error('Image decode failed'));
    };
    image.src = objectURL;
  });
}

async function recompressForClipboard(blob) {
  if (!blob || blob.size <= CLIPBOARD_IMAGE_MAX_BYTES) return blob;
  if (!blob.type?.startsWith('image/') || blob.type === 'image/gif') return blob;

  try {
    const image = await loadImageFromBlob(blob);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(
      1,
      CLIPBOARD_IMAGE_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight)
    );
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const compressed = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', CLIPBOARD_IMAGE_JPEG_QUALITY);
    });

    return compressed && compressed.size < blob.size ? compressed : blob;
  } catch (error) {
    console.warn('Clipboard image recompress failed:', error);
    return blob;
  }
}

async function readStoredImageBlob(imgElement, imageStore) {
  const imageId = imgElement.getAttribute('data-image-id');
  if (!imageId || !imageStore) return null;

  if (typeof imageStore.getImageRecord === 'function') {
    const record = await withTimeout(
      imageStore.getImageRecord(imageId),
      IMAGE_READ_TIMEOUT_MS,
      'Read image record timed out'
    );
    if (record?.blob) {
      return ensureBlobType(record.blob, record.mimeType || record.blob.type);
    }
  }

  if (typeof imageStore.getImageBlob === 'function') {
    return withTimeout(
      imageStore.getImageBlob(imageId),
      IMAGE_READ_TIMEOUT_MS,
      'Read image blob timed out'
    );
  }

  return null;
}

async function isGifImage(imgElement, imageStore) {
  const src = imgElement.getAttribute('src') || '';
  const imageId = imgElement.getAttribute('data-image-id');

  if (src.startsWith('data:image/gif')) return true;

  if (imageId && imageStore && typeof imageStore.getImageRecord === 'function') {
    try {
      const record = await withTimeout(
        imageStore.getImageRecord(imageId),
        IMAGE_GIF_CHECK_TIMEOUT_MS,
        'Check GIF timed out'
      );
      const mimeType = record?.mimeType || record?.blob?.type || '';
      if (mimeType.toLowerCase() === 'image/gif') return true;
    } catch (_error) {
      // Fall back to src sniffing.
    }
  }

  const normalizedSrc = src.toLowerCase();
  return normalizedSrc.endsWith('.gif') || normalizedSrc.includes('.gif?');
}

function replaceGifWithPlaceholder(imgElement) {
  const doc = imgElement.ownerDocument;
  const placeholder = doc.createElement('section');

  placeholder.setAttribute(
    'style',
    'margin: 16px 0 !important; padding: 14px 16px !important; border: 1px dashed #d8a100 !important; border-radius: 8px !important; background: #fff8e1 !important; color: #7a5200 !important; font-size: 14px !important; line-height: 1.6 !important; text-align: center !important;'
  );
  placeholder.textContent = 'GIF 动图不会在复制时内嵌，请在公众号后台单独上传。';
  imgElement.replaceWith(placeholder);
}

/**
 * 复制时把无法自动导入的图片替换为可见的占位提示，避免公众号中出现裂图。
 * @param {Element} imgElement
 * @param {string} src - 原始图片地址（仅远程地址会展示出来供人工核对）
 */
function replaceFailedImageWithPlaceholder(imgElement, src) {
  const doc = imgElement.ownerDocument;
  const placeholder = doc.createElement('section');

  placeholder.setAttribute(
    'style',
    'margin: 16px 0 !important; padding: 14px 16px !important; border: 1px dashed #d8a100 !important; border-radius: 8px !important; background: #fff8e1 !important; color: #7a5200 !important; font-size: 14px !important; line-height: 1.6 !important; text-align: center !important;'
  );
  placeholder.textContent = '图片未能自动导入，请在公众号后台手动上传此图';

  if (src && /^(?:https?:|\/\/)/i.test(src)) {
    const srcHint = doc.createElement('div');
    srcHint.setAttribute(
      'style',
      'margin-top: 6px !important; font-size: 12px !important; color: #a07a20 !important; word-break: break-all !important;'
    );
    srcHint.textContent = src.length > 80 ? `${src.slice(0, 80)}…` : src;
    placeholder.appendChild(srcHint);
  }

  imgElement.replaceWith(placeholder);
}

async function fetchBlobUrl(src) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_READ_TIMEOUT_MS);

  try {
    const response = await fetch(src, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.blob();
  } finally {
    clearTimeout(timer);
  }
}

async function convertImageToBase64(imgElement, imageStore) {
  const src = imgElement.getAttribute('src') || '';
  if (!src) throw new Error('Image src is empty');
  if (src.startsWith('data:')) return src;

  const imageId = imgElement.getAttribute('data-image-id');
  if (imageId) {
    const storedBlob = await readStoredImageBlob(imgElement, imageStore);
    if (!storedBlob) throw new Error(`本地图片记录不存在: ${imageId}`);
    return blobToDataURL(await recompressForClipboard(storedBlob));
  }

  // blob: 是会话内的本地图片，必须转 Base64 才能跨会话使用
  if (src.startsWith('blob:')) {
    const blob = await fetchBlobUrl(src);
    return blobToDataURL(await recompressForClipboard(blob));
  }

  throw new Error(`本地图片尚未导入: ${src}`);
}

export async function materializeClipboardImages(images, {
  imageStore,
  isGif = (image) => isGifImage(image, imageStore),
  convert = (image) => convertImageToBase64(image, imageStore),
  replaceGif = replaceGifWithPlaceholder,
} = {}) {
  let successCount = 0;
  let gifCount = 0;
  const failures = [];

  for (const image of images) {
    const src = image.getAttribute('src') || '';
    // CDN / 外链图片（http/https/协议相对）无需处理，原样保留，由公众号直接加载
    if (/^(?:https?:|\/\/)/i.test(src)) {
      successCount += 1;
      continue;
    }

    try {
      if (await isGif(image)) {
        replaceGif(image);
        gifCount += 1;
        continue;
      }

      image.setAttribute('src', await convert(image));
      successCount += 1;
    } catch (error) {
      failures.push({
        src: image.getAttribute('src') || image.getAttribute('data-image-id') || 'unknown',
        message: error?.message || '图片处理失败',
        element: image,
      });
    }
  }

  return { successCount, gifCount, failures };
}

export function deferLocalImages(images) {
  const failures = [];

  for (const image of images) {
    const imageId = image.getAttribute('data-image-id');
    const src = image.getAttribute('src') || '';
    if (/^data:/i.test(src)) continue;
    if (imageId) {
      image.setAttribute('src', `img://${imageId}`);
    } else if (src.startsWith('blob:')) {
      failures.push(src);
    }
  }

  return { failures };
}

export async function materializeMarkdownTables(tables, {
  background = '#ffffff',
  renderTable = renderTableToPng,
  toDataURL = blobToDataURL,
} = {}) {
  for (let index = 0; index < tables.length; index += 1) {
    const table = tables[index];
    try {
      const { blob } = await renderTable(table, { background });
      const image = table.ownerDocument.createElement('img');
      const tableStyle = table.getAttribute('style') || '';
      const marginTop = cleanStyleValue(extractLastStyleValue(tableStyle, 'margin-top')) || '16px';
      const marginBottom = cleanStyleValue(extractLastStyleValue(tableStyle, 'margin-bottom')) || '16px';

      image.setAttribute('src', await toDataURL(blob));
      image.setAttribute('alt', buildTableImageAlt(table));
      image.setAttribute('data-table-image', 'true');
      image.setAttribute(
        'style',
        `display: block !important; width: 100% !important; max-width: 100% !important; height: auto !important; margin: ${marginTop} auto ${marginBottom} !important;`
      );

      if (typeof table.replaceWith === 'function') table.replaceWith(image);
      else table.parentNode.replaceChild(image, table);
    } catch (error) {
      const tableError = new Error(`第 ${index + 1} 个表格转换失败：${error?.message || '未知错误'}`);
      tableError.tableIndex = index + 1;
      tableError.cause = error;
      throw tableError;
    }
  }
}

export function materializeAnimatedCardDecorations(doc, {
  styleConfig,
  build = buildCardDecorationGif
} = {}) {
  const colors = resolveCardTokens(styleConfig);
  const cache = new Map();
  for (const decoration of doc.querySelectorAll('[data-ogzh-card-animation]')) {
    const kind = decoration.getAttribute('data-ogzh-card-animation');
    const cacheKey = `${kind}:${colors.accent}:${colors.line}:${colors.soft}:${colors.surface}`;
    if (!cache.has(cacheKey)) cache.set(cacheKey, build({ kind, colors }));
    const gif = cache.get(cacheKey);
    if (!gif) continue;
    const image = doc.createElement('img');
    image.setAttribute('src', gif.dataUrl);
    image.setAttribute('alt', '');
    image.setAttribute('aria-hidden', 'true');
    image.setAttribute('data-ogzh-card-gif', kind);
    // 保留装饰元素完整的盒子约束（display/float/margin/width/height/overflow 等），
    // 让 GIF 沿用预览的尺寸框架；不追加 width/max-width/height 覆盖，
    // 避免出现重复声明互相抵消（如 max-width:70% 被 max-width:100% 覆盖、height:auto 破坏 8px 高度条）。
    image.setAttribute(
      'style',
      mergeStyleText(
        decoration.getAttribute('style') || '',
        'border: 0; line-height: 0;'
      )
    );
    decoration.replaceWith(image);
  }
}

function convertGridToTable(doc) {
  const imageGrids = doc.querySelectorAll('.image-grid');
  imageGrids.forEach((grid) => {
    const columns = parseInt(grid.getAttribute('data-columns'), 10) || 2;
    convertSingleGridToTable(doc, grid, columns);
  });
}

function convertSingleGridToTable(doc, grid, columns) {
  const wrappers = Array.from(grid.children);
  const gridStyle = grid.getAttribute('style') || '';
  const gridMarginTop = cleanStyleValue(extractLastStyleValue(gridStyle, 'margin-top')) || '20px';
  const gridMarginBottom = cleanStyleValue(extractLastStyleValue(gridStyle, 'margin-bottom')) || '20px';
  const table = doc.createElement('table');
  table.setAttribute(
    'style',
    `width: 100% !important; border-collapse: separate !important; border-spacing: 0 !important; margin-top: ${gridMarginTop} !important; margin-right: auto !important; margin-bottom: ${gridMarginBottom} !important; margin-left: auto !important; table-layout: fixed !important; border: none !important; overflow: visible !important;`
  );

  const rows = Math.ceil(wrappers.length / columns);

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    const row = doc.createElement('tr');

    for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
      const cell = doc.createElement('td');
      cell.setAttribute('style', `padding: 8px !important; vertical-align: top !important; width: ${100 / columns}% !important; border: none !important; overflow: visible !important;`);

      const item = wrappers[rowIndex * columns + columnIndex];
      if (item) {
        const image = item.querySelector('img');
        if (image) {
          const itemStyle = item.getAttribute('style') || '';
          const imageStyle = image.getAttribute('style') || '';
          const visualStyle = buildGridItemVisualStyle(itemStyle, imageStyle);
          const nextImage = image.cloneNode(true);
          nextImage.setAttribute('style', buildGridImageExportStyle(itemStyle, imageStyle));

          const wrapper = doc.createElement('div');
          wrapper.setAttribute(
            'style',
            mergeStyleText(
              'width: 100% !important; height: 360px !important; text-align: center !important; padding: 0 !important; box-sizing: border-box !important; overflow: visible !important; display: table !important;',
              visualStyle
            )
          );

          const inner = doc.createElement('div');
          inner.setAttribute('style', 'display: table-cell !important; vertical-align: middle !important; text-align: center !important;');
          inner.appendChild(nextImage);
          wrapper.appendChild(inner);
          cell.appendChild(wrapper);
        }
      }

      row.appendChild(cell);
    }

    table.appendChild(row);
  }

  grid.parentNode.replaceChild(table, grid);
}

function buildGridItemVisualStyle(itemStyle, imageStyle) {
  const declarations = [];
  const borderRadius = cleanStyleValue(extractLastStyleValue(itemStyle, 'border-radius')
    || extractLastStyleValue(imageStyle, 'border-radius'));
  const boxShadow = cleanStyleValue(extractLastStyleValue(itemStyle, 'box-shadow')
    || extractLastStyleValue(imageStyle, 'box-shadow'));
  const webkitBoxShadow = cleanStyleValue(extractLastStyleValue(itemStyle, '-webkit-box-shadow')
    || extractLastStyleValue(imageStyle, '-webkit-box-shadow'));
  const border = cleanStyleValue(extractLastStyleValue(itemStyle, 'border')
    || extractLastStyleValue(imageStyle, 'border'));
  const borderTop = cleanStyleValue(extractLastStyleValue(itemStyle, 'border-top')
    || extractLastStyleValue(imageStyle, 'border-top'));
  const borderRight = cleanStyleValue(extractLastStyleValue(itemStyle, 'border-right')
    || extractLastStyleValue(imageStyle, 'border-right'));
  const borderBottom = cleanStyleValue(extractLastStyleValue(itemStyle, 'border-bottom')
    || extractLastStyleValue(imageStyle, 'border-bottom'));
  const borderLeft = cleanStyleValue(extractLastStyleValue(itemStyle, 'border-left')
    || extractLastStyleValue(imageStyle, 'border-left'));
  const background = cleanStyleValue(extractLastStyleValue(itemStyle, 'background')
    || extractLastStyleValue(itemStyle, 'background-color')
    || extractLastStyleValue(imageStyle, 'background')
    || extractLastStyleValue(imageStyle, 'background-color'));

  if (background) declarations.push(`background: ${background} !important;`);
  if (borderRadius) declarations.push(`border-radius: ${borderRadius} !important;`);
  if (boxShadow) declarations.push(`box-shadow: ${boxShadow} !important;`);
  if (webkitBoxShadow) declarations.push(`-webkit-box-shadow: ${webkitBoxShadow} !important;`);
  if (border) declarations.push(`border: ${border} !important;`);
  if (borderTop) declarations.push(`border-top: ${borderTop} !important;`);
  if (borderRight) declarations.push(`border-right: ${borderRight} !important;`);
  if (borderBottom) declarations.push(`border-bottom: ${borderBottom} !important;`);
  if (borderLeft) declarations.push(`border-left: ${borderLeft} !important;`);

  return declarations.join(' ');
}

function buildGridImageExportStyle(itemStyle, imageStyle) {
  const maxHeight = cleanStyleValue(extractLastStyleValue(imageStyle, 'max-height')) || '340px';
  const filter = cleanStyleValue(extractLastStyleValue(imageStyle, 'filter'));
  const opacity = cleanStyleValue(extractLastStyleValue(imageStyle, 'opacity'));
  const visualStyle = buildGridItemVisualStyle(itemStyle, imageStyle);
  const declarations = [
    'max-width: 100% !important;',
    `max-height: ${maxHeight} !important;`,
    'width: auto !important;',
    'height: auto !important;',
    'display: inline-block !important;',
    'margin: 0 auto !important;',
    'object-fit: contain !important;'
  ];

  if (filter) declarations.push(`filter: ${filter} !important;`);
  if (opacity) declarations.push(`opacity: ${opacity} !important;`);
  if (visualStyle) declarations.push(visualStyle);

  return declarations.join(' ');
}

function convertCodeBlocks(doc, styleConfig, codeTheme) {
  const blocks = doc.querySelectorAll('[data-code-block="true"]');
  const resolvedStyles = resolveCodeBlockExportStyles(styleConfig, codeTheme);

  blocks.forEach((block) => {
    const code = block.querySelector('.md-code-block-code');
    if (!code) return;

    const wrapper = doc.createElement('section');
    wrapper.setAttribute('style', resolvedStyles.wrapper);

    const frame = doc.createElement('section');
    frame.setAttribute('style', resolvedStyles.frame);

    const scrollArea = doc.createElement('section');
    scrollArea.setAttribute('style', resolvedStyles.scrollArea);

    const content = doc.createElement('span');
    content.setAttribute('style', resolvedStyles.content);

    const codeNode = doc.createElement('code');
    codeNode.setAttribute('style', resolvedStyles.code);
    codeNode.innerHTML = serializeHighlightedCodeHtml(code);

    content.appendChild(codeNode);
    scrollArea.appendChild(content);
    frame.appendChild(scrollArea);
    wrapper.appendChild(frame);
    block.parentNode.replaceChild(wrapper, block);
  });
}

function resolveCodeBlockExportStyles(styleConfig, codeTheme) {
  if (codeTheme) {
    return {
      wrapper: 'margin: 24px 0 !important;',
      frame: `padding: 16px !important; background: ${codeTheme.bg} !important; color: ${codeTheme.textColor} !important; border: 1px solid ${codeTheme.borderColor} !important; border-radius: 10px !important; box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important; -webkit-box-shadow: 0 2px 8px rgba(0,0,0,0.12) !important;`,
      scrollArea: 'display: block !important; overflow-x: auto !important; overflow-y: hidden !important; padding: 0 0 12px 0 !important; -webkit-overflow-scrolling: touch !important;',
      content: 'display: inline-block !important; min-width: max-content !important;',
      code: `display: block !important; background: transparent !important; color: ${codeTheme.textColor} !important; font-family: "SF Mono", Consolas, Monaco, "Courier New", monospace !important; font-size: 14px !important; line-height: 1.7 !important; white-space: pre !important; word-break: normal !important; overflow-wrap: normal !important; tab-size: 2 !important;`
    };
  }

  const preStyle = styleConfig?.styles?.pre || '';
  const cleanCodeStyle = sanitizeThemeCodeStyle(styleConfig?.styles?.code || '');
  const preTextColor = extractStyleValue(preStyle, 'color');
  const codeHasColor = Boolean(extractStyleValue(cleanCodeStyle, 'color'));
  const textColorFallback = preTextColor && !codeHasColor ? `color: ${preTextColor} !important;` : '';
  const fontFamilyFallback = extractStyleValue(cleanCodeStyle, 'font-family')
    ? ''
    : 'font-family: "SF Mono", Consolas, Monaco, "Courier New", monospace !important;';
  const fontSizeFallback = extractStyleValue(cleanCodeStyle, 'font-size') ? '' : 'font-size: 14px !important;';
  const lineHeightFallback = extractStyleValue(cleanCodeStyle, 'line-height') ? '' : 'line-height: 1.7 !important;';

  return {
    wrapper: 'margin: 24px 0 !important;',
    frame: `padding: 16px !important; ${preStyle}`,
    scrollArea: 'display: block !important; overflow-x: auto !important; overflow-y: hidden !important; padding: 0 0 12px 0 !important; -webkit-overflow-scrolling: touch !important;',
    content: 'display: inline-block !important; min-width: max-content !important;',
    code: `display: block !important; background: transparent !important; white-space: pre !important; word-break: normal !important; overflow-wrap: normal !important; tab-size: 2 !important; ${fontFamilyFallback} ${fontSizeFallback} ${lineHeightFallback} ${textColorFallback} ${cleanCodeStyle}`
  };
}

function sanitizeThemeCodeStyle(styleText) {
  if (!styleText) return '';
  return styleText.replace(
    /(^|;)\s*(padding(?:-[^:]+)?|background(?:-color)?|border(?:-[^:]+)?|border-radius|display|white-space)\s*:\s*[^;]+;?/gi,
    ';'
  );
}

function extractStyleValue(styleText, property) {
  if (!styleText || !property) return null;
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styleText.match(new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*([^;]+)`, 'i'));
  if (!match) return null;
  // 剥离尾部的 !important：调用方重新附加 !important 时避免产生
  // `color: #fff !important !important` 这类被浏览器整体丢弃的非法声明
  return match[1].trim().replace(/\s*!important\s*$/i, '');
}

const FONT_SCALE_BASE_PX = 14;

function extractFontSizePx(styleText) {
  const match = styleText?.match(/font-size\s*:\s*([\d.]+)px/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * 取主题的正文基准字号：优先 p（显式声明了正文字号的模板），否则回退容器字号。
 */
function extractBodyFontSizePx(style) {
  return extractFontSizePx(style?.p) ?? extractFontSizePx(style?.container);
}

/**
 * 把字号档位倍数（1.0x = 14px）换算为作用于主题的实际倍数，与 render-pipeline 保持一致，
 * 保证复制到公众号的字号与预览完全一致（如 15px 档 → 正文 15px，而不是 16px）。
 */
function resolveFontScaleMultiplier(fontScale, style) {
  const basePx = extractBodyFontSizePx(style);
  if (basePx == null) return fontScale;
  return fontScale * (FONT_SCALE_BASE_PX / basePx);
}

function scaleStyleConfigFontSizes(styleConfig, scale) {
  if (!styleConfig?.styles) return styleConfig;
  const multiplier = resolveFontScaleMultiplier(scale, styleConfig.styles);
  if (!Number.isFinite(multiplier) || multiplier === 1) return styleConfig;
  const nextStyles = {};
  Object.keys(styleConfig.styles).forEach((selector) => {
    nextStyles[selector] = scaleFontSizeInDeclaration(styleConfig.styles[selector], multiplier);
  });
  return { ...styleConfig, styles: nextStyles };
}

function scaleFontSizeInDeclaration(declaration, scale) {
  if (!declaration || typeof declaration !== 'string') return declaration;
  return declaration.replace(/(font-size\s*:\s*)([\d.]+)(px|rem|em|pt)/gi, (_match, prefix, value, unit) => {
    const scaled = (parseFloat(value) * scale).toFixed(2).replace(/\.?0+$/, '');
    return `${prefix}${scaled}${unit}`;
  });
}

function extractLastStyleValue(styleText, property) {
  if (!styleText || !property) return null;
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = Array.from(styleText.matchAll(new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*([^;]+)`, 'gi')));
  if (matches.length === 0) return null;
  return matches[matches.length - 1][1].trim();
}

function cleanStyleValue(value) {
  if (!value) return null;
  return String(value).replace(/\s*!important\s*$/i, '').trim();
}

function escapeHtml(value) {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toWechatCodeHTML(codeText) {
  const normalized = (codeText || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ');

  if (!normalized) return '&nbsp;';

  return escapeHtml(normalized)
    .split('\n')
    .map((line) => (line.length ? line.replace(/ /g, '&nbsp;') : '&nbsp;'))
    .join('<br>');
}

/**
 * 保留行式结构的卡片：列表行由源码渲染（marker 行、元信息行），
 * 复制时不能展平或被改写成普通段落，否则行首标记与编号会丢失。
 */
const PRESERVED_LIST_CARD_SELECTOR = [
  'history-document',
  'check-list',
  'timeline',
  'index-badge'
].map((id) => `section[data-ogzh-card="${id}"]`).join(', ');

function flattenListItems(doc) {
  doc.querySelectorAll('li').forEach((item) => {
    if (item.closest?.(PRESERVED_LIST_CARD_SELECTOR)) return;
    if (containsRenderableMath(item)) {
      return;
    }

    const clone = item.cloneNode(true);
    replaceFormulaNodesWithPlainText(clone);
    const text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
    item.innerHTML = '';
    item.textContent = text;
  });
}

function containsRenderableMath(node) {
  if (!node?.querySelector) return false;
  return Boolean(
    node.querySelector('[data-formula-plain], [data-formula-source], .katex, .katex-display, .MathJax, mjx-container')
  );
}

export function convertOrderedListsToWechatParagraphs(doc, styleConfig) {
  const orderedLists = Array.from(doc.querySelectorAll('ol'));
  orderedLists.forEach((list) => {
    if (list.closest?.(PRESERVED_LIST_CARD_SELECTOR)) return;
    const items = Array.from(list.children).filter((child) => child.tagName?.toUpperCase() === 'LI');
    if (items.length === 0) {
      list.remove();
      return;
    }

    const fragment = doc.createDocumentFragment();
    items.forEach((item, index) => {
      fragment.appendChild(buildWechatOrderedParagraph(doc, item, index + 1, styleConfig));
    });

    list.parentNode.replaceChild(fragment, list);
  });
}

function buildWechatOrderedParagraph(doc, item, order, styleConfig) {
  const paragraph = doc.createElement('p');
  const prefix = doc.createElement('span');
  const content = doc.createElement('span');
  const clonedItem = item.cloneNode(true);
  const containerStyle = styleConfig?.styles?.container || '';
  const paragraphStyle = styleConfig?.styles?.p || '';
  const listItemStyle = styleConfig?.styles?.li || '';
  const typographyStyle = buildTypographyStyle({
    fontSize: extractStyleValue(listItemStyle, 'font-size')
      || extractStyleValue(paragraphStyle, 'font-size')
      || extractStyleValue(containerStyle, 'font-size'),
    lineHeight: extractStyleValue(listItemStyle, 'line-height')
      || extractStyleValue(paragraphStyle, 'line-height')
      || extractStyleValue(containerStyle, 'line-height'),
    letterSpacing: extractStyleValue(listItemStyle, 'letter-spacing')
      || extractStyleValue(paragraphStyle, 'letter-spacing')
      || extractStyleValue(containerStyle, 'letter-spacing'),
    color: extractStyleValue(listItemStyle, 'color')
      || extractStyleValue(paragraphStyle, 'color')
      || extractStyleValue(containerStyle, 'color'),
    fontFamily: extractStyleValue(listItemStyle, 'font-family')
      || extractStyleValue(paragraphStyle, 'font-family')
      || extractStyleValue(containerStyle, 'font-family')
  });

  prefix.textContent = `${order}. `;
  prefix.setAttribute(
    'style',
    mergeStyleText(
      typographyStyle,
      'display: inline !important; white-space: nowrap !important;'
    )
  );

  if (!containsRenderableMath(clonedItem)) {
    replaceFormulaNodesWithPlainText(clonedItem);
    const text = (clonedItem.textContent || '').replace(/\s+/g, ' ').trim();
    clonedItem.innerHTML = '';
    clonedItem.textContent = text;
  }

  paragraph.setAttribute(
    'style',
    mergeStyleText(
      typographyStyle,
      'margin: 0 0 14px !important; white-space: normal !important; word-break: break-word !important; overflow-wrap: anywhere !important;'
    )
  );

  content.setAttribute(
    'style',
    mergeStyleText(typographyStyle, 'display: inline !important;')
  );
  while (clonedItem.firstChild) {
    content.appendChild(clonedItem.firstChild);
  }

  paragraph.appendChild(prefix);
  paragraph.appendChild(content);
  return paragraph;
}

function normalizeListTypographyForWechat(doc, styleConfig) {
  const containerStyle = styleConfig?.styles?.container || '';
  const paragraphStyle = styleConfig?.styles?.p || '';
  const listItemStyle = styleConfig?.styles?.li || '';
  const listStyle = [styleConfig?.styles?.ol || '', styleConfig?.styles?.ul || ''].join('; ');

  const fontSize = extractStyleValue(listItemStyle, 'font-size')
    || extractStyleValue(paragraphStyle, 'font-size')
    || extractStyleValue(containerStyle, 'font-size');
  const lineHeight = extractStyleValue(listItemStyle, 'line-height')
    || extractStyleValue(paragraphStyle, 'line-height')
    || extractStyleValue(containerStyle, 'line-height');
  const letterSpacing = extractStyleValue(listItemStyle, 'letter-spacing')
    || extractStyleValue(paragraphStyle, 'letter-spacing')
    || extractStyleValue(containerStyle, 'letter-spacing');
  const color = extractStyleValue(listItemStyle, 'color')
    || extractStyleValue(paragraphStyle, 'color')
    || extractStyleValue(containerStyle, 'color');
  const fontFamily = extractStyleValue(listItemStyle, 'font-family')
    || extractStyleValue(paragraphStyle, 'font-family')
    || extractStyleValue(containerStyle, 'font-family');

  const typographyStyle = buildTypographyStyle({ fontSize, lineHeight, letterSpacing, color, fontFamily });

  doc.querySelectorAll('ol, ul').forEach((list) => {
    if (list.closest?.(PRESERVED_LIST_CARD_SELECTOR)) return;
    const currentStyle = list.getAttribute('style') || '';
    list.setAttribute(
      'style',
      mergeStyleText(currentStyle, typographyStyle, listStyle)
    );
  });

  doc.querySelectorAll('li').forEach((item) => {
    if (item.closest?.(PRESERVED_LIST_CARD_SELECTOR)) return;
    const currentStyle = item.getAttribute('style') || '';
    item.setAttribute(
      'style',
      mergeStyleText(currentStyle, typographyStyle)
    );

    if (!typographyStyle) return;
    if (item.children.length === 1 && item.firstElementChild?.tagName === 'SPAN'
      && item.firstElementChild.getAttribute('data-wechat-li-content') === 'true') {
      return;
    }

    const wrapper = doc.createElement('span');
    wrapper.setAttribute('data-wechat-li-content', 'true');
    wrapper.setAttribute(
      'style',
      mergeStyleText(typographyStyle, 'display: inline !important;')
    );
    while (item.firstChild) {
      wrapper.appendChild(item.firstChild);
    }
    item.appendChild(wrapper);
  });
}

function buildTypographyStyle({ fontSize, lineHeight, color, fontFamily, letterSpacing }) {
  const declarations = [];
  if (fontSize) declarations.push(`font-size: ${fontSize} !important;`);
  if (lineHeight) declarations.push(`line-height: ${lineHeight} !important;`);
  if (letterSpacing) declarations.push(`letter-spacing: ${letterSpacing} !important;`);
  if (color) declarations.push(`color: ${color} !important;`);
  if (fontFamily) declarations.push(`font-family: ${fontFamily} !important;`);
  return declarations.join(' ');
}

function mergeStyleText(...parts) {
  return parts
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

function normalizeBlockquotes(doc) {
  doc.querySelectorAll('blockquote').forEach((blockquote) => {
    let style = blockquote.getAttribute('style') || '';
    style = style.replace(/background(?:-color)?:\s*[^;]+;?/gi, '');
    style = style.replace(/color:\s*[^;]+;?/gi, '');
    style += '; background: rgba(0, 0, 0, 0.05) !important; color: rgba(0, 0, 0, 0.8) !important;';
    blockquote.setAttribute('style', style);
  });
}

function normalizeTablesForWechat(doc) {
  const wrappedTables = doc.querySelectorAll('.md-table-scroll > table');
  wrappedTables.forEach((table) => {
    const wrapper = table.parentElement;
    if (!wrapper || !wrapper.parentNode) return;
    wrapper.parentNode.insertBefore(table, wrapper);
    wrapper.remove();
  });

  doc.querySelectorAll('table').forEach((table) => {
    const tableStyle = table.getAttribute('style') || '';
    table.setAttribute(
      'style',
      `${tableStyle}; width: 100% !important; max-width: 100% !important; table-layout: fixed !important;`
    );
  });

  doc.querySelectorAll('th, td').forEach((cell) => {
    const cellStyle = cell.getAttribute('style') || '';
    cell.setAttribute(
      'style',
      `${cellStyle}; word-break: break-word; overflow-wrap: anywhere; white-space: normal;`
    );
  });
}

function inlineContainerTypographyForWechat(doc, styleConfig) {
  const containerStyle = styleConfig?.styles?.container || '';
  const containerFontSize = extractStyleValue(containerStyle, 'font-size');
  const containerLineHeight = extractStyleValue(containerStyle, 'line-height');
  const containerLetterSpacing = extractStyleValue(containerStyle, 'letter-spacing');
  const containerColor = extractStyleValue(containerStyle, 'color');
  const containerFontFamily = extractStyleValue(containerStyle, 'font-family');

  const selectors = ['p', 'blockquote', 'li', 'td', 'th', 'dd', 'dt', 'figcaption'];
  selectors.forEach((selector) => {
    doc.querySelectorAll(selector).forEach((element) => {
      const currentStyle = element.getAttribute('style') || '';
      const additions = [];

      if (containerFontSize && !extractStyleValue(currentStyle, 'font-size')) {
        additions.push(`font-size: ${containerFontSize} !important;`);
      }
      if (containerLineHeight && !extractStyleValue(currentStyle, 'line-height')) {
        additions.push(`line-height: ${containerLineHeight} !important;`);
      }
      if (containerLetterSpacing && !extractStyleValue(currentStyle, 'letter-spacing')) {
        additions.push(`letter-spacing: ${containerLetterSpacing} !important;`);
      }
      if (containerColor && !extractStyleValue(currentStyle, 'color')) {
        additions.push(`color: ${containerColor} !important;`);
      }
      if (containerFontFamily && !extractStyleValue(currentStyle, 'font-family')) {
        additions.push(`font-family: ${containerFontFamily} !important;`);
      }

      if (additions.length > 0) {
        element.setAttribute('style', mergeStyleText(currentStyle, additions.join(' ')));
      }
    });
  });
}

function wrapSectionIfNeeded(doc, styleConfig) {
  const containerBg = extractBackgroundColor(styleConfig.styles.container);
  if (!containerBg || containerBg === '#fff' || containerBg === '#ffffff') return;

  const section = doc.createElement('section');
  const containerStyle = styleConfig.styles.container;
  const paddingMatch = containerStyle.match(/padding:\s*([^;]+)/);
  const maxWidthMatch = containerStyle.match(/max-width:\s*([^;]+)/);

  // 显式带上正文排版（字号/行高/字间距/颜色/字体），避免微信编辑器以默认 16px 兜底
  const typographyDeclarations = ['font-size', 'line-height', 'letter-spacing', 'color', 'font-family']
    .map((property) => {
      const value = extractStyleValue(containerStyle, property);
      return value ? `${property}: ${value} !important;` : '';
    })
    .filter(Boolean)
    .join(' ');

  section.setAttribute(
    'style',
    `${typographyDeclarations} background-color: ${containerBg}; padding: ${paddingMatch ? paddingMatch[1].trim() : '40px 20px'}; max-width: ${maxWidthMatch ? maxWidthMatch[1].trim() : '100%'}; margin: 0 auto; box-sizing: border-box; word-wrap: break-word;`
  );

  while (doc.body.firstChild) {
    section.appendChild(doc.body.firstChild);
  }

  doc.body.appendChild(section);
}

function buildClipboardPlainText(doc) {
  const clone = doc.body.cloneNode(true);

  replaceFormulaNodesWithPlainText(clone);

  clone.querySelectorAll('br').forEach((br) => {
    br.replaceWith('\n');
  });

  clone.querySelectorAll('p, div, section, pre, blockquote, li, h1, h2, h3, h4, h5, h6, tr').forEach((node) => {
    if (!node.textContent?.endsWith('\n')) {
      node.append('\n');
    }
  });

  return (clone.textContent || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function replaceFormulaNodesWithPlainText(root) {
  root.querySelectorAll('[data-formula-plain]').forEach((node) => {
    const formulaText = node.getAttribute('data-formula-plain') || '';
    node.replaceWith(root.ownerDocument.createTextNode(formulaText));
  });
}

/**
 * 把动效结尾替换为 GIF 动图（公众号不支持 CSS 动画，静态 HTML 无法呈现动效）。
 * classic / 静态样式保留原样；任何异常都回退静态 HTML，绝不影响复制主流程。
 */
function maybeReplaceAnimatedEndWithGif(doc, { styleConfig, displaySettings }) {
  const divider = doc.querySelector('[data-gzh-end]');
  if (!divider) return;

  // 与 render-pipeline 的 applyEndDivider 同语义解析有效 endStyle
  let endStyle = displaySettings?.endStyle || 'theme';
  const themeColors = styleConfig?.gzh;
  if (endStyle === 'theme' || !endStyle) {
    if (!themeColors) return; // 非 gzh 主题 + 跟随主题 → 无分隔线
    endStyle = themeColors.endStyle || 'classic';
  }

  const meta = END_DIVIDER_META[endStyle];
  if (!meta?.animated) return;

  try {
    const colors = {
      line: themeColors?.line || '#e5e7eb',
      muted: themeColors?.muted || '#9ca3af',
      accent: themeColors?.accent || themeColors?.muted || '#818cf8'
    };
    const gif = buildEndDividerGif({ endStyle, colors });
    if (!gif) return;

    divider.setAttribute('style', mergeStyleText(
      divider.getAttribute('style') || '',
      'text-align: center;'
    ));
    divider.innerHTML = `<img src="${gif.dataUrl}" alt="" style="display:block;width:${gif.width}px;max-width:100%;height:auto;margin:0 auto;border:0;">`;
  } catch (error) {
    console.warn('结尾动图替换失败，保留静态 HTML:', error);
  }
}

export async function prepareWechatContent({
  renderedHTML,
  styleConfig,
  imageStore,
  showToast = () => {},
  codeTheme,
  displaySettings,
  imagePolicy = 'clipboard'
} = {}) {
  if (!renderedHTML) {
    const error = new Error('没有内容可复制');
    error.code = ARTICLE_INVALID;
    throw error;
  }
  if (!styleConfig?.styles || typeof styleConfig.styles !== 'object' || Array.isArray(styleConfig.styles)) {
    const error = new Error('样式配置无效');
    error.code = ARTICLE_INVALID;
    throw error;
  }
  if (imagePolicy !== 'clipboard' && imagePolicy !== 'defer-local') {
    const error = new Error('图片处理策略无效');
    error.code = ARTICLE_INVALID;
    throw error;
  }

  const fontScale = Number(displaySettings?.fontScale) || 1;
  // 始终走缩放（内部会按 14px 基准归一化），保证复制结果与预览字号一致
  const effectiveStyleConfig = scaleStyleConfigFontSizes(styleConfig, fontScale);
  const parser = new DOMParser();
  const doc = parser.parseFromString(renderedHTML, 'text/html');

  doc.querySelectorAll('table').forEach((table) => {
    table.setAttribute('data-markdown-table', 'true');
  });
  convertGridToTable(doc);
  normalizeTablesForWechat(doc);

  const images = Array.from(doc.querySelectorAll('img'));
  let imageFailures = [];
  let imageFailureCount = 0;
  if (images.length > 0 && imagePolicy === 'clipboard') {
    showToast(`正在处理 ${images.length} 张图片...`, 'success');
    const imageResult = await materializeClipboardImages(images, { imageStore });
    if (imageResult.failures.length > 0) {
      imageFailureCount = imageResult.failures.length;
      imageFailures = imageResult.failures.map((failure) => failure.src);
      const failedSources = imageResult.failures.map((failure) => failure.src).join('、');
      console.warn('Clipboard image conversion failed:', imageResult.failures);
      // 失败的图片替换为可见占位提示，不阻断整体复制
      imageResult.failures.forEach((failure) => {
        if (failure.element) replaceFailedImageWithPlaceholder(failure.element, failure.src);
      });
      showToast(`有 ${imageResult.failures.length} 张图片无法自动导入：${failedSources}`, 'error');
    } else if (imageResult.gifCount > 0) {
      showToast(
        `图片处理完成：成功 ${imageResult.successCount} 张，GIF ${imageResult.gifCount} 张`,
        'success'
      );
    }
  } else if (images.length > 0 && imagePolicy === 'defer-local') {
    const result = deferLocalImages(images);
    imageFailures = result.failures;
    imageFailureCount = imageFailures.length;
  }

  await convertMathForWechat(doc);
  applyCodeHighlighting(doc, { codeTheme, styleConfig: effectiveStyleConfig });
  convertCodeBlocks(doc, effectiveStyleConfig, codeTheme);
  flattenListItems(doc);
  convertOrderedListsToWechatParagraphs(doc, effectiveStyleConfig);
  normalizeListTypographyForWechat(doc, effectiveStyleConfig);
  inlineContainerTypographyForWechat(doc, effectiveStyleConfig);
  normalizeBlockquotes(doc);
  wrapSectionIfNeeded(doc, effectiveStyleConfig);

  maybeReplaceAnimatedEndWithGif(doc, { styleConfig, displaySettings });
  materializeAnimatedCardDecorations(doc, { styleConfig: effectiveStyleConfig });

  const text = buildClipboardPlainText(doc);
  const tableBackground = extractBackgroundColor(effectiveStyleConfig.styles.container) || '#ffffff';
  const markdownTables = Array.from(doc.querySelectorAll('table[data-markdown-table="true"]'));
  const tableImageFailures = imagePolicy === 'defer-local'
    ? markdownTables.flatMap((table) => Array.from(table.querySelectorAll('img'))
      .map((image) => image.getAttribute('src') || '')
      .filter((src) => /^(?:img:\/\/|blob:)/i.test(src)))
    : [];

  if (tableImageFailures.length > 0) {
    imageFailures = [...new Set([...imageFailures, ...tableImageFailures])];
    imageFailureCount = imageFailures.length;
  } else {
    try {
      await materializeMarkdownTables(markdownTables, { background: tableBackground });
    } catch (error) {
      console.error('表格转图失败:', error);
      showToast(error.message, 'error');
      error.wechatToastHandled = true;
      throw error;
    }
  }

  stripFormulaExportMetadata(doc.body);
  const html = doc.body.innerHTML;

  return {
    html,
    text,
    images: Array.from(doc.querySelectorAll('img')).map((image) => image.getAttribute('src') || ''),
    imageFailures,
    imageFailureCount,
  };
}

export async function writeWechatClipboard(prepared, {
  clipboard = navigator.clipboard,
  ClipboardItemCtor = ClipboardItem,
  BlobCtor = Blob
} = {}) {
  const item = new ClipboardItemCtor({
    'text/html': new BlobCtor([prepared.html], { type: 'text/html' }),
    'text/plain': new BlobCtor([prepared.text], { type: 'text/plain' })
  });

  await clipboard.write([item]);
}

export async function copyToWechat(options = {}) {
  const { renderedHTML, showToast = () => {} } = options;
  if (!renderedHTML) {
    showToast('没有内容可复制', 'error');
    return false;
  }

  try {
    const prepared = await prepareWechatContent({
      ...options,
      imagePolicy: 'clipboard',
      showToast
    });
    await writeWechatClipboard(prepared);
    if (prepared.imageFailureCount > 0) {
      showToast(
        `复制成功，但有 ${prepared.imageFailureCount} 张图片未能自动导入，已替换为占位提示，请在公众号后台手动上传`,
        'error'
      );
    } else {
      showToast('复制成功', 'success');
    }
    return true;
  } catch (error) {
    if (error?.wechatToastHandled) return false;
    console.error('复制失败:', error);
    showToast('复制失败', 'error');
    return false;
  }
}
