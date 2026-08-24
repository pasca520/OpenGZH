import { PLATFORM_IDS, articleContentForPlatform } from './adapter-contract.js';
import { dataUrlToBlob } from './data-url.js';
import { PlatformError } from './platform-errors.js';

const ARTICLE_KEYS = new Set([
  'schemaVersion', 'documentId', 'title', 'markdown', 'portableMarkdown',
  'semanticHtml', 'wechatHtml', 'images', 'createdAt',
]);
const IMAGE_KEYS = {
  'indexed-db': new Set(['ref', 'kind', 'imageId', 'mimeType', 'filename', 'alt']),
  'data-url': new Set(['ref', 'kind', 'dataUrl', 'mimeType', 'filename', 'alt']),
};
const CDN_HOSTS = Object.freeze({
  weixin: ['mmbiz.qpic.cn', 'mmbiz.qlogo.cn'],
  zhihu: ['zhimg.com'],
  juejin: ['byteimg.com', 'juejin.cn'],
  woshipm: ['woshipm.com'],
});

function invalid(message) {
  throw new PlatformError('ARTICLE_INVALID', message, { retryable: false });
}

function isPlainRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value, keys) {
  const ownKeys = Reflect.ownKeys(value);
  return ownKeys.length === keys.size && ownKeys.every((key) => typeof key === 'string' && keys.has(key));
}

function isString(value, allowEmpty = true) {
  return typeof value === 'string' && (allowEmpty || value.trim().length > 0);
}

function validateImage(image) {
  if (!isPlainRecord(image) || !['indexed-db', 'data-url'].includes(image.kind)) invalid('图片清单格式错误');
  if (!hasExactKeys(image, IMAGE_KEYS[image.kind])) invalid('图片字段越界');
  if (!isString(image.ref, false) || !/^image\/[a-z0-9.+-]+$/i.test(image.mimeType || '')
    || !isString(image.mimeType, false) || !isString(image.filename, false) || !isString(image.alt)) {
    invalid('图片元数据错误');
  }
  if (image.kind === 'indexed-db') {
    if (!isString(image.imageId, false) || image.ref !== `img://${image.imageId}`) invalid('IndexedDB 图片引用错误');
    return;
  }
  if (!isString(image.dataUrl, false) || image.ref !== image.dataUrl || !image.ref.startsWith('data:image/')) {
    invalid('Data URL 图片引用错误');
  }
  try {
    const blob = dataUrlToBlob(image.dataUrl);
    if (blob.type !== image.mimeType.toLowerCase()) invalid('Data URL MIME 类型错误');
  } catch {
    invalid('Data URL 图片引用错误');
  }
}

export function validateArticle(value) {
  if (!isPlainRecord(value) || !hasExactKeys(value, ARTICLE_KEYS) || value.schemaVersion !== 1) {
    invalid('不支持的文章数据版本或字段');
  }
  for (const key of ['documentId', 'title', 'markdown', 'portableMarkdown', 'semanticHtml', 'wechatHtml']) {
    if (!isString(value[key], !['documentId', 'title'].includes(key))) invalid(`文章字段 ${key} 无效`);
  }
  if (!value.portableMarkdown.trim() && !value.semanticHtml.trim() && !value.wechatHtml.trim()) invalid('文章正文为空');
  if (!Array.isArray(value.images) || !Number.isFinite(value.createdAt)) invalid('文章图片或时间字段无效');
  value.images.forEach(validateImage);
  if (new Set(value.images.map((image) => image.ref)).size !== value.images.length) invalid('图片引用重复');
  try {
    return structuredClone(value);
  } catch {
    invalid('文章数据无法安全复制');
  }
}

function extractSources(content, markdown = false) {
  const sources = [];
  const add = (source) => { if (source && !sources.includes(source)) sources.push(source); };
  const sourcePattern = /<img\b[^>]*\bsrc\s*=\s*(?:(["'])(.*?)\1|([^\s>]+))/gi;
  for (const match of String(content || '').matchAll(sourcePattern)) add(match[2] ?? match[3]);
  if (markdown) {
    const markdownPattern = /!\[[^\]]*\]\(\s*(?:<([^>\r\n]+)>|([^\s)\r\n]+))(?:\s+["'][^)]*["'])?\s*\)/g;
    for (const match of String(content || '').matchAll(markdownPattern)) add(match[1] ?? match[2]);
  }
  return sources;
}

function hostMatches(hostname, suffix) {
  return hostname === suffix || hostname.endsWith(`.${suffix}`);
}

function isPlatformCdn(platformId, source) {
  try {
    const url = new URL(source);
    return url.protocol === 'https:' && CDN_HOSTS[platformId].some((suffix) => hostMatches(url.hostname.toLowerCase(), suffix));
  } catch {
    return false;
  }
}

export function validateSelectedPlatformImages(article, platformIds) {
  validateArticle(article);
  if (!Array.isArray(platformIds)) invalid('平台选择无效');
  const refs = new Set(article.images.map((image) => image.ref));
  for (const platformId of platformIds) {
    if (!PLATFORM_IDS.includes(platformId)) invalid('包含未知平台');
    const sources = extractSources(articleContentForPlatform(article, platformId), platformId === 'juejin');
    for (const source of sources) {
      if (refs.has(source) || isPlatformCdn(platformId, source)) continue;
      throw new PlatformError('IMAGE_NOT_LOCAL', `图片必须先导入本地图片库: ${source.slice(0, 120)}`, { retryable: false });
    }
  }
}
