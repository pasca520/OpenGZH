/**
 * Render a themed HTML table to a retina PNG without runtime dependencies.
 * @module table-image-renderer
 */

export const TABLE_IMAGE_SCALE = 2;
export const TABLE_LOGICAL_WIDTH_FALLBACK = 750;
export const TABLE_CANVAS_MAX_DIMENSION = 16384;

const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

export function getTableCanvasSize(width, height, scale = TABLE_IMAGE_SCALE) {
  const canvasWidth = Math.ceil(width * scale);
  const canvasHeight = Math.ceil(height * scale);

  // ponytail: keep a conservative cross-browser Canvas cap; row-based splitting is the upgrade path.
  if (canvasWidth > TABLE_CANVAS_MAX_DIMENSION || canvasHeight > TABLE_CANVAS_MAX_DIMENSION) {
    throw new Error('表格尺寸过大，请拆分表格后重试');
  }
  if (canvasWidth < 1 || canvasHeight < 1) {
    throw new Error('表格尺寸无效');
  }

  return { width: canvasWidth, height: canvasHeight };
}

export function buildTableImageAlt(table) {
  const headers = Array.from(table.querySelectorAll('th'))
    .map((cell) => (cell.textContent || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const rowCount = table.querySelectorAll('tbody tr').length;
  const headerText = headers.length > 0 ? `：${headers.join('、')}` : '';
  return `表格${headerText}，共 ${rowCount} 行`;
}

function escapeXmlAttribute(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildTableSvgMarkup(xhtml, width, height, background = '#ffffff') {
  const safeBackground = escapeXmlAttribute(background || '#ffffff');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%"><div xmlns="${XHTML_NAMESPACE}" style="width:${width}px;height:${height}px;background:${safeBackground};">${xhtml}</div></foreignObject></svg>`;
}

export function resolveTableLogicalWidth(documentRef = globalThis.document) {
  const view = documentRef?.defaultView;
  const computedStyle = view?.getComputedStyle
    ? view.getComputedStyle(documentRef.documentElement)
    : globalThis.getComputedStyle?.(documentRef?.documentElement);
  if (computedStyle) {
    const value = parseFloat(computedStyle.getPropertyValue('--preview-width-tablet'));
    if (Number.isFinite(value) && value > 0) return value;
  }
  return TABLE_LOGICAL_WIDTH_FALLBACK;
}

function appendStyleText(element, styleText) {
  const current = element.getAttribute('style') || '';
  element.setAttribute('style', current ? `${current}; ${styleText}` : styleText);
}

function mountTableForCapture(table, {
  documentRef,
  logicalWidth,
  background,
  XMLSerializerCtor,
}) {
  if (!documentRef?.body) throw new Error('当前页面无法创建表格截图容器');

  const stage = documentRef.createElement('div');
  stage.setAttribute('aria-hidden', 'true');
  stage.setAttribute(
    'style',
    'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;z-index:-1;'
  );

  const frame = documentRef.createElement('div');
  frame.setAttribute('xmlns', XHTML_NAMESPACE);
  frame.setAttribute(
    'style',
    `box-sizing:border-box;width:${logicalWidth}px;padding:16px;background:${background};overflow:hidden;`
  );

  const clone = documentRef.importNode
    ? documentRef.importNode(table, true)
    : table.cloneNode(true);
  appendStyleText(
    clone,
    'box-sizing:border-box;margin:0 !important;width:100% !important;max-width:100% !important;table-layout:fixed !important;'
  );

  frame.appendChild(clone);
  stage.appendChild(frame);
  documentRef.body.appendChild(stage);

  const rect = frame.getBoundingClientRect();
  const height = Math.max(1, Math.ceil(frame.scrollHeight || rect.height));
  frame.style.height = `${height}px`;

  const serializer = new XMLSerializerCtor();
  return {
    xhtml: serializer.serializeToString(frame),
    width: logicalWidth,
    height,
    cleanup: () => stage.remove(),
  };
}

function loadImage(src, ImageCtor) {
  return new Promise((resolve, reject) => {
    const image = new ImageCtor();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('浏览器无法解析表格 SVG'));
    image.src = src;
  });
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('表格图片生成失败'));
    }, 'image/png');
  });
}

async function rasterizeTableSvg(svg, size, {
  documentRef,
  ImageCtor,
  URLRef,
  logicalWidth,
  logicalHeight,
  scale,
  background,
}) {
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const objectURL = URLRef.createObjectURL(svgBlob);

  try {
    const image = await loadImage(objectURL, ImageCtor);
    const canvas = documentRef.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('浏览器不支持 Canvas 2D');

    context.scale(scale, scale);
    context.fillStyle = background;
    context.fillRect(0, 0, logicalWidth, logicalHeight);
    context.drawImage(image, 0, 0, logicalWidth, logicalHeight);
    return canvasToPngBlob(canvas);
  } finally {
    URLRef.revokeObjectURL(objectURL);
  }
}

export async function renderTableToPng(table, options = {}) {
  const documentRef = options.documentRef || globalThis.document;
  const logicalWidth = options.logicalWidth || resolveTableLogicalWidth(documentRef);
  const background = options.background || '#ffffff';
  const scale = options.scale || TABLE_IMAGE_SCALE;
  const XMLSerializerCtor = options.XMLSerializerCtor
    || documentRef?.defaultView?.XMLSerializer
    || globalThis.XMLSerializer;
  const ImageCtor = options.ImageCtor || documentRef?.defaultView?.Image || globalThis.Image;
  const URLRef = options.URLRef || globalThis.URL;
  const fontsReady = options.fontsReady || documentRef?.fonts?.ready || Promise.resolve();
  const measureTable = options.measureTable || ((node) => mountTableForCapture(node, {
    documentRef,
    logicalWidth,
    background,
    XMLSerializerCtor,
  }));
  const rasterize = options.rasterize || ((svg, size, runtime) => rasterizeTableSvg(svg, size, runtime));

  if (!table) throw new Error('缺少待转换表格');
  if (!XMLSerializerCtor && !options.measureTable) throw new Error('浏览器不支持 XML 序列化');
  if (!ImageCtor && !options.rasterize) throw new Error('浏览器不支持 SVG 图片解码');

  await fontsReady;
  const capture = await measureTable(table);

  try {
    const canvasSize = getTableCanvasSize(capture.width, capture.height, scale);
    const svg = buildTableSvgMarkup(capture.xhtml, capture.width, capture.height, background);
    const blob = await rasterize(svg, canvasSize, {
      documentRef,
      ImageCtor,
      URLRef,
      logicalWidth: capture.width,
      logicalHeight: capture.height,
      scale,
      background,
    });
    if (!blob) throw new Error('表格图片生成失败');

    return {
      blob,
      logicalWidth: capture.width,
      logicalHeight: capture.height,
      scale,
    };
  } finally {
    capture.cleanup();
  }
}
