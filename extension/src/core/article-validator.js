import { PLATFORM_IDS, articleContentForPlatform, imageReferencesInContent } from './adapter-contract.js';
import { dataUrlToBlob } from './data-url.js';
import { PlatformError } from './platform-errors.js';

const ARTICLE_KEYS = new Set([
  'schemaVersion', 'documentId', 'title', 'markdown', 'portableMarkdown',
  'semanticHtml', 'wechatHtml', 'images', 'createdAt',
]);
const IMAGE_KEYS = {
  'indexed-db': new Set(['ref', 'kind', 'imageId', 'mimeType', 'filename', 'alt']),
  'data-url': new Set(['ref', 'kind', 'dataUrl', 'mimeType', 'filename', 'alt']),
  'remote-url': new Set(['ref', 'kind', 'url', 'filename', 'alt']),
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
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    invalid('文章数据无法安全检查');
  }
}

function hasExactKeys(value, keys) {
  const ownKeys = Reflect.ownKeys(value);
  return ownKeys.length === keys.size && ownKeys.every((key) => typeof key === 'string' && keys.has(key));
}

function rejectAccessors(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  if (!Array.isArray(value)) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) invalid('文章数据只能包含普通对象');
  }
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid('文章数据不能包含 getter 或 setter');
    rejectAccessors(descriptor.value, seen);
  }
}

function hasDenseArraySlots(value) {
  if (!Array.isArray(value)) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.length !== value.length + 1 || !keys.includes('length')) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) return false;
  }
  return true;
}

function isString(value, allowEmpty = true) {
  return typeof value === 'string' && (allowEmpty || value.trim().length > 0);
}

function isSafeRemoteImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.port && !url.username && !url.password
      && !/^(?:localhost|.*\.localhost|.*\.local|\d{1,3}(?:\.\d{1,3}){3}|\[.*\])$/i.test(url.hostname);
  } catch {
    return false;
  }
}

function validateImage(image) {
  if (!isPlainRecord(image) || !['indexed-db', 'data-url', 'remote-url'].includes(image.kind)) invalid('图片清单格式错误');
  if (!hasExactKeys(image, IMAGE_KEYS[image.kind])) invalid('图片字段越界');
  if (!isString(image.ref, false) || !isString(image.filename, false) || !isString(image.alt)) {
    invalid('图片元数据错误');
  }
  if (image.kind === 'remote-url') {
    if (!isString(image.url, false) || image.ref !== image.url || !isSafeRemoteImageUrl(image.url)) invalid('远程图片地址错误');
    return;
  }
  if (!/^image\/[a-z0-9.+-]+$/i.test(image.mimeType || '') || !isString(image.mimeType, false)) invalid('图片元数据错误');
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

function validateArticleSnapshot(value) {
  if (!isPlainRecord(value) || !hasExactKeys(value, ARTICLE_KEYS) || value.schemaVersion !== 1) {
    invalid('不支持的文章数据版本或字段');
  }
  for (const key of ['documentId', 'title', 'markdown', 'portableMarkdown', 'semanticHtml', 'wechatHtml']) {
    if (!isString(value[key], !['documentId', 'title'].includes(key))) invalid(`文章字段 ${key} 无效`);
  }
  if (!value.portableMarkdown.trim() && !value.semanticHtml.trim() && !value.wechatHtml.trim()) invalid('文章正文为空');
  if (!hasDenseArraySlots(value.images) || !Number.isFinite(value.createdAt)) invalid('文章图片或时间字段无效');
  for (const image of value.images) validateImage(image);
  if (new Set(value.images.map((image) => image.ref)).size !== value.images.length) invalid('图片引用重复');
}

export function validateArticle(value) {
  if (!isPlainRecord(value)) invalid('文章数据格式错误');
  try {
    rejectAccessors(value);
  } catch (error) {
    if (error instanceof PlatformError) throw error;
    invalid('文章数据无法安全检查');
  }
  let snapshot;
  try {
    snapshot = structuredClone(value);
  } catch {
    invalid('文章数据无法安全复制');
  }
  validateArticleSnapshot(snapshot);
  return snapshot;
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
  const validated = validateArticle(article);
  try {
    rejectAccessors(platformIds);
  } catch (error) {
    if (error instanceof PlatformError) throw error;
    invalid('平台选择无法安全检查');
  }
  if (!hasDenseArraySlots(platformIds) || platformIds.length === 0) invalid('平台选择无效');
  let selected;
  try {
    selected = structuredClone(platformIds);
  } catch {
    invalid('平台选择无法安全复制');
  }
  if (new Set(selected).size !== selected.length) invalid('平台选择重复');
  const refs = new Set(validated.images.map((image) => image.ref));
  for (const platformId of selected) {
    if (!PLATFORM_IDS.includes(platformId)) invalid('包含未知平台');
    const sources = imageReferencesInContent(articleContentForPlatform(validated, platformId), platformId === 'juejin')
      .map(({ value }) => value);
    for (const source of sources) {
      if (refs.has(source) || isPlatformCdn(platformId, source)) continue;
      throw new PlatformError('IMAGE_NOT_LOCAL', `图片必须先导入本地图片库: ${source.slice(0, 120)}`, { retryable: false });
    }
  }
}
