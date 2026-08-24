import { applyImageMap } from '../core/adapter-contract.js';
import { md5Hex } from '../core/md5.js';
import { PlatformError, remoteStateError } from '../core/platform-errors.js';

const API_RULES = [{
  id: 2001,
  priority: 1,
  action: { type: 'modifyHeaders', requestHeaders: [{ header: 'x-requested-with', operation: 'set', value: 'fetch' }] },
  condition: {
    regexFilter: '^https://(?:www\\.zhihu\\.com|zhuanlan\\.zhihu\\.com|api\\.zhihu\\.com)/',
    resourceTypes: ['xmlhttprequest'],
  },
}];

const OSS_RULES = [{
  id: 2002,
  priority: 1,
  action: {
    type: 'modifyHeaders',
    requestHeaders: [
      { header: 'Origin', operation: 'set', value: 'https://zhuanlan.zhihu.com' },
      { header: 'Referer', operation: 'set', value: 'https://zhuanlan.zhihu.com/' },
    ],
  },
  condition: { urlFilter: '*://zhihu-pics-upload.zhimg.com/*', resourceTypes: ['xmlhttprequest'] },
}];

const DRAFT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const IMAGE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
const IMAGE_HASH = /^[A-Za-z0-9][A-Za-z0-9._-]{0,511}$/;
const OBJECT_KEY = /^[A-Za-z0-9][A-Za-z0-9._~!$&'()*+,;=:@/-]{0,511}$/;
const SAFE_TEXT = /^[^\u0000-\u001f\u007f<>]{1,128}$/u;

function platformChanged(message, details = {}) {
  return new PlatformError('PLATFORM_CHANGED', message, { retryable: false, ...details });
}

function authRequired(draftId) {
  return new PlatformError('AUTH_REQUIRED', '知乎登录已失效', { ...(draftId ? { draftId } : {}), retryable: true });
}

function networkError(message = '知乎网络请求失败', details = {}) {
  return new PlatformError('NETWORK_ERROR', message, { retryable: true, ...details });
}

function imageUploadError(message = '知乎图片上传失败', details = {}) {
  return new PlatformError('IMAGE_UPLOAD_FAILED', message, { retryable: true, ...details });
}

function isRedirect(response) {
  return response?.type === 'opaqueredirect' || response?.status === 0 || (response?.status >= 300 && response?.status < 400);
}

function isOk(response) {
  return typeof response?.ok === 'boolean' ? response.ok : response?.status >= 200 && response?.status < 300;
}

function responseStatus(response) {
  return Number.isInteger(response?.status) ? response.status : 0;
}

async function readResponseText(response, fallback = '') {
  try {
    if (typeof response?.text !== 'function') throw new TypeError('响应不可读取');
    return await response.text();
  } catch (_error) {
    return fallback;
  }
}

function parseObject(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (_error) {
    return null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return data;
}

function safeOpaqueId(value, matcher = DRAFT_ID) {
  return typeof value === 'string' && matcher.test(value) ? value : null;
}

function safeObjectKey(value) {
  if (typeof value !== 'string' || !OBJECT_KEY.test(value) || value.includes('\\') || value.includes('?') || value.includes('#') || value.includes('%')) return null;
  if (value.startsWith('/') || value.split('/').some((part) => part === '..' || part === '.')) return null;
  if (value.includes('//')) return null;
  return value;
}

function safeImageSource(value) {
  if (typeof value !== 'string' || !value || /[\u0000-\u001f\u007f]/u.test(value)) return null;
  if (/^img:\/\/[A-Za-z0-9._~:/-]+$/u.test(value) && !value.split('/').some((part) => part === '..' || part === '.')) return value;
  try {
    const url = new URL(value);
    const authority = value.slice(value.indexOf('//') + 2).split(/[/?#]/u, 1)[0];
    const explicitPort = authority.slice(authority.lastIndexOf('@') + 1).includes(':');
    if (url.protocol !== 'https:' || !(url.hostname === 'zhimg.com' || url.hostname.endsWith('.zhimg.com'))
      || explicitPort || url.username || url.password || url.search || url.hash || !url.pathname || url.pathname === '/') return null;
    if (url.pathname.split('/').some((part) => part === '..' || part === '.')) return null;
    return url.href;
  } catch (_error) {
    return null;
  }
}

function safeHref(value) {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/u.test(value)) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return value;
  } catch (_error) {
    return null;
  }
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const VOID_TAGS = new Set(['area', 'br', 'col', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const BLOCKED_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'textarea', 'select', 'option', 'button', 'svg', 'math', 'template']);
const ALLOWED_TAGS = new Set([
  'a', 'blockquote', 'br', 'caption', 'code', 'del', 'div', 'em', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'small', 'span', 'strong', 'sub', 'sup', 'table', 'tbody', 'td',
  'th', 'thead', 'tr', 'u', 'ul',
]);
const ALLOWED_DATA_ATTRS = new Set(['data-draft-node', 'data-draft-type', 'data-size', 'data-row-style']);

function readTag(source, start) {
  let quote = null;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return { value: source.slice(start, index + 1), end: index + 1 };
    }
  }
  throw platformChanged('知乎正文标签未闭合');
}

function parseAttributes(source) {
  let cursor = 0;
  const attrs = [];
  const seen = new Set();
  while (cursor < source.length) {
    while (/\s/u.test(source[cursor] || '')) cursor += 1;
    if (cursor >= source.length) break;
    const nameStart = cursor;
    while (cursor < source.length && !/[\s=/>]/u.test(source[cursor])) cursor += 1;
    const name = source.slice(nameStart, cursor).toLowerCase();
    if (!/^[a-z_:][a-z0-9:._-]*$/u.test(name)) throw platformChanged('知乎正文属性格式已变化');
    if (seen.has(name)) throw platformChanged('知乎正文包含重复属性');
    seen.add(name);
    while (/\s/u.test(source[cursor] || '')) cursor += 1;
    let value = '';
    if (source[cursor] === '=') {
      cursor += 1;
      while (/\s/u.test(source[cursor] || '')) cursor += 1;
      const quote = source[cursor];
      if (quote === '"' || quote === "'") {
        cursor += 1;
        const valueStart = cursor;
        while (cursor < source.length && source[cursor] !== quote) cursor += 1;
        if (cursor >= source.length) throw platformChanged('知乎正文属性引号未闭合');
        value = source.slice(valueStart, cursor);
        cursor += 1;
      } else {
        const valueStart = cursor;
        while (cursor < source.length && !/[\s>]/u.test(source[cursor])) cursor += 1;
        value = source.slice(valueStart, cursor);
      }
    }
    attrs.push({ name, value });
  }
  return attrs;
}

function parseHtml(source) {
  const root = { tag: '#root', attrs: [], children: [] };
  const stack = [root];
  for (let index = 0; index < source.length;) {
    if (source[index] !== '<') {
      const next = source.indexOf('<', index);
      stack.at(-1).children.push({ tag: '#text', attrs: [], children: [], text: source.slice(index, next < 0 ? source.length : next) });
      index = next < 0 ? source.length : next;
      continue;
    }
    if (source.startsWith('<!--', index)) {
      const end = source.indexOf('-->', index + 4);
      index = end < 0 ? source.length : end + 3;
      continue;
    }
    const token = readTag(source, index);
    const raw = token.value.slice(1, -1).trim();
    index = token.end;
    if (!raw || raw.startsWith('!') || raw.startsWith('?')) continue;
    if (raw.startsWith('/')) {
      const name = raw.slice(1).trim().toLowerCase();
      if (!/^[a-z][a-z0-9:-]*$/u.test(name) || stack.length === 1 || stack.at(-1).tag !== name) throw platformChanged('知乎正文标签嵌套已变化');
      stack.pop();
      continue;
    }
    const selfClosing = /\/\s*$/u.test(raw);
    const opening = selfClosing ? raw.replace(/\/\s*$/u, '').trim() : raw;
    const match = opening.match(/^([a-z][a-z0-9:-]*)([\s\S]*)$/iu);
    if (!match) throw platformChanged('知乎正文标签格式已变化');
    const tag = match[1].toLowerCase();
    const node = { tag, attrs: parseAttributes(match[2]), children: [] };
    stack.at(-1).children.push(node);
    if (!selfClosing && !VOID_TAGS.has(tag)) stack.push(node);
  }
  if (stack.length !== 1) throw platformChanged('知乎正文标签未闭合');
  return root;
}

function attrMap(node) {
  return new Map(node.attrs.map(({ name, value }) => [name, value]));
}

function sanitizeNode(node) {
  if (node.tag === '#text') return node;
  if (BLOCKED_TAGS.has(node.tag)) return null;
  const children = node.children.map(sanitizeNode).filter(Boolean);
  if (node.tag === '#root') return { ...node, children };
  if (!ALLOWED_TAGS.has(node.tag)) return { tag: '#fragment', attrs: [], children };

  const attrs = attrMap(node);
  const clean = [];
  if (node.tag === 'img') {
    const src = safeImageSource(attrs.get('src'));
    if (!src) return null;
    clean.push({ name: 'src', value: src });
    if (typeof attrs.get('alt') === 'string' && SAFE_TEXT.test(attrs.get('alt'))) clean.push({ name: 'alt', value: attrs.get('alt') });
  } else if (node.tag === 'a') {
    const href = safeHref(attrs.get('href'));
    if (href) clean.push({ name: 'href', value: href });
    if (typeof attrs.get('title') === 'string' && SAFE_TEXT.test(attrs.get('title'))) clean.push({ name: 'title', value: attrs.get('title') });
  } else if (node.tag === 'pre') {
    const lang = attrs.get('lang');
    if (lang && /^[A-Za-z0-9_+-]{1,32}$/u.test(lang)) clean.push({ name: 'lang', value: lang });
  } else if (node.tag === 'code') {
    const className = attrs.get('class') || '';
    const language = className.match(/(?:^|\s)language-([A-Za-z0-9_+-]{1,32})(?:\s|$)/u)?.[1];
    if (language) clean.push({ name: 'data-language', value: language });
  } else if (node.tag === 'td' || node.tag === 'th') {
    for (const name of ['colspan', 'rowspan']) {
      const value = attrs.get(name);
      if (/^[1-9][0-9]{0,2}$/u.test(value || '')) clean.push({ name, value });
    }
  }
  for (const attribute of node.attrs) {
    if (ALLOWED_DATA_ATTRS.has(attribute.name) && SAFE_TEXT.test(attribute.value)) clean.push(attribute);
  }
  return { tag: node.tag, attrs: clean, children };
}

function fragmentChildren(node) {
  return node.children.flatMap((child) => child.tag === '#fragment' ? fragmentChildren(child) : [child]);
}

function normalizeTables(node) {
  if (node.tag === '#text') return node;
  const children = node.children.flatMap((child) => child.tag === '#fragment' ? fragmentChildren(normalizeTables(child)) : [normalizeTables(child)]);
  if (node.tag !== 'table') return { ...node, children };

  const rows = [];
  for (const child of children) {
    if (child.tag === 'thead') {
      for (const row of child.children) if (row.tag === 'tr') rows.push({ ...row, children: row.children.map((cell) => cell.tag === 'td' ? { ...cell, tag: 'th' } : cell) });
    } else if (child.tag === 'tbody') {
      rows.push(...child.children.filter((row) => row.tag === 'tr'));
    } else if (child.tag === 'tr') {
      rows.push(child);
    }
  }
  return {
    tag: 'table',
    attrs: [
      { name: 'data-draft-node', value: 'block' },
      { name: 'data-draft-type', value: 'table' },
      { name: 'data-size', value: 'normal' },
      { name: 'data-row-style', value: 'normal' },
    ],
    children: [{ tag: 'tbody', attrs: [], children: rows }],
  };
}

function normalizeCode(node) {
  if (node.tag === '#text') return node;
  const children = node.children.map(normalizeCode);
  if (node.tag !== 'pre') return { ...node, children };
  const code = children.find((child) => child.tag === 'code');
  if (!code) return { ...node, children };
  const language = code.attrs.find(({ name }) => name === 'data-language')?.value;
  return {
    tag: 'pre',
    attrs: language ? [{ name: 'lang', value: language }] : [],
    children: [{ ...code, attrs: [], children: code.children }],
  };
}

function renderNode(node, parentTag = '') {
  if (node.tag === '#text') return node.text;
  if (node.tag === '#fragment') return node.children.map((child) => renderNode(child, parentTag)).join('');
  if (node.tag === '#root') return node.children.map((child) => renderNode(child, parentTag)).join('');
  const content = node.children.map((child) => renderNode(child, node.tag)).join('');
  if (node.tag === 'img') return parentTag === 'figure' ? `<img${node.attrs.map(({ name, value }) => ` ${name}="${escapeAttribute(value)}"`).join('')}>` : `<figure><img${node.attrs.map(({ name, value }) => ` ${name}="${escapeAttribute(value)}"`).join('')}></figure>`;
  const attrs = node.attrs.map(({ name, value }) => ` ${name}="${escapeAttribute(value)}"`).join('');
  if (VOID_TAGS.has(node.tag)) return `<${node.tag}${attrs}>`;
  return `<${node.tag}${attrs}>${content}</${node.tag}>`;
}

function normalizeFigures(node) {
  if (node.tag === '#text') return node;
  const children = node.children.flatMap((child) => {
    const normalized = normalizeFigures(child);
    return node.tag === 'figure' && normalized.tag === 'figure' ? normalized.children : [normalized];
  });
  if (node.tag === 'figure') {
    const meaningful = children.filter((child) => child.tag !== '#text' || child.text.trim());
    if (meaningful.length === 1 && meaningful[0].tag === 'table') return meaningful[0];
  }
  return { ...node, children };
}

export function transformZhihuContent(input) {
  if (typeof input !== 'string') throw platformChanged('知乎正文格式无效');
  const sanitized = sanitizeNode(parseHtml(input));
  return renderNode(normalizeFigures(normalizeCode(normalizeTables(sanitized))));
}

function bytesToBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function md5Base64(bytes) {
  const hex = md5Hex(bytes);
  const digest = Uint8Array.from({ length: hex.length / 2 }, (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16));
  return bytesToBase64(digest);
}

async function defaultHmacSha1Base64(key, message) {
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return bytesToBase64(new Uint8Array(signature));
}

function validateUploadFile(uploadFile) {
  if (!uploadFile || typeof uploadFile !== 'object' || Array.isArray(uploadFile)) return null;
  const imageId = safeOpaqueId(uploadFile.image_id, IMAGE_ID);
  const objectKey = safeObjectKey(uploadFile.object_key);
  if (!Number.isInteger(uploadFile.state) || ![0, 1].includes(uploadFile.state) || !imageId || !objectKey) return null;
  return { state: uploadFile.state, imageId, objectKey };
}

function validateUploadToken(uploadToken) {
  if (!uploadToken || typeof uploadToken !== 'object' || Array.isArray(uploadToken)) return null;
  const keys = Reflect.ownKeys(uploadToken);
  if (keys.length !== 3 || !['access_id', 'access_key', 'access_token'].every((key) => keys.includes(key))) return null;
  if (typeof uploadToken.access_id !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/u.test(uploadToken.access_id)) return null;
  if (typeof uploadToken.access_key !== 'string' || !/^[^\u0000-\u001f\u007f]{1,4096}$/u.test(uploadToken.access_key)) return null;
  if (typeof uploadToken.access_token !== 'string' || !/^[^\u0000-\u001f\u007f]{1,4096}$/u.test(uploadToken.access_token)) return null;
  return uploadToken;
}

async function negotiateImage(runtime, bytes) {
  let response;
  try {
    response = await runtime.fetch('https://api.zhihu.com/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_hash: md5Hex(bytes), source: 'article' }),
    });
  } catch (_error) {
    throw networkError('知乎图片协商网络异常');
  }
  const status = responseStatus(response);
  if ([401, 403].includes(status)) throw authRequired();
  if (isRedirect(response)) throw platformChanged('知乎图片协商地址发生跳转', { httpStatus: status });
  if (!isOk(response)) throw imageUploadError(`知乎图片协商失败: ${status}`, { httpStatus: status });
  const data = parseObject(await readResponseText(response));
  const uploadFile = validateUploadFile(data?.upload_file);
  if (!uploadFile) throw platformChanged('知乎图片凭证结构已变化', { httpStatus: status });
  if (uploadFile.state === 1) return uploadFile;
  const uploadToken = validateUploadToken(data?.upload_token);
  if (!uploadToken) throw platformChanged('知乎 OSS 凭证结构已变化', { httpStatus: status });
  return { ...uploadFile, uploadToken };
}

async function pollImage(runtime, imageId, delay) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    let response;
    try {
      response = await runtime.fetch(`https://api.zhihu.com/images/${encodeURIComponent(imageId)}`);
    } catch (_error) {
      throw networkError('知乎图片状态网络异常');
    }
    const status = responseStatus(response);
    if ([401, 403].includes(status)) throw authRequired();
    if (isRedirect(response)) throw platformChanged('知乎图片状态地址发生跳转', { httpStatus: status });
    if (!isOk(response)) throw imageUploadError(`知乎图片状态查询失败: ${status}`, { httpStatus: status });
    const data = parseObject(await readResponseText(response));
    const hash = safeOpaqueId(data?.original_hash, IMAGE_HASH);
    if (hash) return hash;
    if (!data || (Object.hasOwn(data, 'original_hash') && data.original_hash != null) || ![0, 1].includes(data.state)) {
      throw platformChanged('知乎图片状态响应格式已变化', { httpStatus: status });
    }
    if (attempt < 9) await delay(1000);
  }
  throw imageUploadError('知乎图片处理超时');
}

function uploadUrl(objectKey, blob) {
  const suffix = blob.type.toLowerCase() === 'image/gif' && !objectKey.toLowerCase().endsWith('.gif') ? '.gif' : '';
  return `https://pic4.zhimg.com/${objectKey}${suffix}`;
}

async function putOss(runtime, negotiated, blob, bytes, hmacSha1Base64, now) {
  const token = negotiated.uploadToken;
  const contentType = blob.type || 'application/octet-stream';
  const date = now().toUTCString();
  const contentMd5 = md5Base64(bytes);
  const headers = {
    'Content-MD5': contentMd5,
    'x-oss-date': date,
    'x-oss-security-token': token.access_token,
    'x-oss-user-agent': 'aliyun-sdk-js/6.8.0',
  };
  const canonicalHeaders = Object.keys(headers)
    .filter((key) => key.toLowerCase().startsWith('x-oss-'))
    .sort()
    .map((key) => `${key.toLowerCase()}:${headers[key]}`)
    .join('\n');
  const stringToSign = `PUT\n${contentMd5}\n${contentType}\n${date}\n${canonicalHeaders}\n/zhihu-pics/${negotiated.objectKey}`;
  let signature;
  try {
    signature = await hmacSha1Base64(token.access_key, stringToSign);
  } catch (_error) {
    throw imageUploadError('知乎图片签名失败');
  }
  if (typeof signature !== 'string' || !signature || /[\u0000-\u001f\u007f]/u.test(signature)) throw platformChanged('知乎图片签名响应格式已变化');
  const url = `https://zhihu-pics-upload.zhimg.com/${negotiated.objectKey}`;
  let response;
  try {
    response = await runtime.fetch(url, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': contentType,
        'Content-MD5': contentMd5,
        Authorization: `OSS ${token.access_id}:${signature}`,
        ...headers,
      },
    });
  } catch (_error) {
    throw imageUploadError('知乎图片上传网络异常');
  }
  const status = responseStatus(response);
  if ([401, 403].includes(status)) throw authRequired();
  if (isRedirect(response)) throw platformChanged('知乎图片上传地址发生跳转', { httpStatus: status });
  if (!isOk(response)) throw imageUploadError(`知乎图片上传失败: ${status}`, { httpStatus: status });
}

export function createZhihuAdapter({
  hmacSha1Base64 = defaultHmacSha1Base64,
  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => new Date(),
} = {}) {
  return {
    id: 'zhihu',
    name: '知乎',
    loginUrl: 'https://www.zhihu.com/signin',

    async checkAuth(runtime) {
      let response;
      try {
        response = await runtime.withHeaderRules(API_RULES, () => runtime.fetch('https://www.zhihu.com/api/v4/me', { method: 'GET' }));
      } catch (error) {
        if (error instanceof PlatformError) throw error;
        throw networkError('知乎登录检测网络异常');
      }
      const status = responseStatus(response);
      if ([401, 403].includes(status) || isRedirect(response)) return { authenticated: false };
      if (!isOk(response)) {
        if (status >= 500) throw networkError('知乎登录检测网络异常', { httpStatus: status });
        throw platformChanged('知乎登录检测响应状态已变化', { httpStatus: status });
      }
      const data = parseObject(await readResponseText(response));
      if (!data || !safeOpaqueId(data.id, IMAGE_ID) || typeof data.name !== 'string' || !SAFE_TEXT.test(data.name.trim())) {
        throw platformChanged('知乎登录检测响应格式已变化', { httpStatus: status });
      }
      return { authenticated: true, userId: data.id, username: data.name };
    },

    async uploadImage(runtime, blob) {
      if (typeof Blob === 'undefined' || !(blob instanceof Blob)) throw new PlatformError('IMAGE_UPLOAD_FAILED', '知乎图片必须是 Blob', { retryable: false });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const negotiated = await runtime.withHeaderRules(API_RULES, async () => {
        const value = await negotiateImage(runtime, bytes);
        if (value.state === 1) value.originalHash = await pollImage(runtime, value.imageId, delay);
        return value;
      });
      if (negotiated.state === 1) {
        if (!safeOpaqueId(negotiated.originalHash, IMAGE_HASH)) throw platformChanged('知乎图片处理结果已变化');
        return `https://pic4.zhimg.com/${negotiated.originalHash}`;
      }
      await runtime.withHeaderRules(OSS_RULES, () => putOss(runtime, negotiated, blob, bytes, hmacSha1Base64, now));
      return uploadUrl(negotiated.objectKey, blob);
    },

    async saveDraft(runtime, article, imageMap, taskState = {}) {
      if (!article || typeof article !== 'object' || typeof article.title !== 'string' || typeof article.semanticHtml !== 'string') {
        throw new PlatformError('ARTICLE_INVALID', '知乎文章数据格式无效', { retryable: false });
      }
      const existingId = taskState && typeof taskState === 'object' ? taskState.draftId : undefined;
      let draftId = existingId ? safeOpaqueId(existingId) : '';
      if (existingId && !draftId) throw platformChanged('知乎草稿 ID 格式无效');
      let remoteDraftId = draftId;
      try {
        const result = await runtime.withHeaderRules(API_RULES, async () => {
          if (!draftId) {
            let createResponse;
            try {
              createResponse = await runtime.fetch('https://zhuanlan.zhihu.com/api/articles/drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: article?.title, content: '', delta_time: 0 }),
              });
            } catch (error) {
              throw remoteStateError(error, '无法确认知乎是否已创建空草稿');
            }
            const status = responseStatus(createResponse);
            if ([401, 403].includes(status)) throw authRequired();
            if (isRedirect(createResponse)) throw platformChanged('知乎创建草稿地址发生跳转', { httpStatus: status });
            const text = await readResponseText(createResponse);
            const data = parseObject(text);
            const returnedId = safeOpaqueId(data?.id);
            if (returnedId) {
              draftId = returnedId;
              remoteDraftId = returnedId;
            }
            if (!isOk(createResponse)) {
              if (returnedId) throw new PlatformError('DRAFT_CREATE_FAILED', `知乎创建草稿失败: ${status}`, { draftId: returnedId, httpStatus: status, retryable: false });
              if (status >= 500 || status === 0) throw new PlatformError('UNKNOWN_REMOTE_STATE', '无法确认知乎是否已创建空草稿', { httpStatus: status, retryable: false });
              throw new PlatformError('DRAFT_CREATE_FAILED', `知乎创建草稿失败: ${status}`, { httpStatus: status, retryable: true });
            }
            if (!returnedId) throw platformChanged('知乎创建草稿响应缺少安全 id', { httpStatus: status });
          }
          const content = transformZhihuContent(applyImageMap(article?.semanticHtml, imageMap));
          let updateResponse;
          try {
            updateResponse = await runtime.fetch(`https://zhuanlan.zhihu.com/api/articles/${encodeURIComponent(draftId)}/draft`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: article?.title, content }),
            });
          } catch (_error) {
            throw new PlatformError('DRAFT_UPDATE_FAILED', '知乎草稿更新网络异常', { draftId, retryable: true });
          }
          const updateStatus = responseStatus(updateResponse);
          if ([401, 403].includes(updateStatus)) throw authRequired(draftId);
          if (isRedirect(updateResponse)) throw new PlatformError('DRAFT_UPDATE_FAILED', '知乎草稿更新地址发生跳转', { draftId, httpStatus: updateStatus, retryable: false });
          if (!isOk(updateResponse)) throw new PlatformError('DRAFT_UPDATE_FAILED', `知乎草稿更新失败: ${updateStatus}`, { draftId, httpStatus: updateStatus, retryable: true });
          return { draftId, draftUrl: `https://zhuanlan.zhihu.com/p/${encodeURIComponent(draftId)}/edit` };
        });
        return result;
      } catch (error) {
        const knownDraftId = error?.draftId || remoteDraftId;
        if (knownDraftId && error instanceof PlatformError) {
          if (error.code === 'DRAFT_UPDATE_FAILED' || error.code === 'AUTH_REQUIRED' || error.code === 'DRAFT_CREATE_FAILED') throw error;
          if (error.code === 'UNKNOWN_REMOTE_STATE') throw new PlatformError(error.code, error.message, { ...error, draftId: knownDraftId, retryable: false });
        }
        if (knownDraftId) throw new PlatformError('UNKNOWN_REMOTE_STATE', '知乎草稿请求已返回但请求头清理失败，请人工检查草稿箱', { draftId: knownDraftId, retryable: false });
        throw error;
      }
    },
  };
}
