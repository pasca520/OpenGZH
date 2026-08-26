import { applyImageMap, imageReferencesInContent } from '../core/adapter-contract.js';
import { PlatformError, remoteStateError } from '../core/platform-errors.js';

const HOME_URL = 'https://www.woshipm.com/writing';
const PROFILE_URL = 'https://www.woshipm.com/api2/user/profile';
const UPLOAD_URL = 'https://www.woshipm.com/tensorflow/upyun/upload';
const DRAFT_URL = 'https://www.woshipm.com/wp-admin/admin-ajax.php';
const SCRIPT_TYPES = new Set(['text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript', 'application/x-javascript', 'module']);
const SAFE_TOKEN = /^[A-Za-z0-9._~+/=-]{1,4096}$/u;
const SAFE_UID = /^[1-9]\d{0,18}$/u;
const SAFE_TEXT = /^[^\u0000-\u001f\u007f<>]{1,512}$/u;
const SAFE_FILENAME = /^(?!\.{1,2}$)[A-Za-z0-9][A-Za-z0-9._ -]{0,255}$/u;
const RULES = Object.freeze([{
  id: 4001,
  priority: 1,
  action: { type: 'modifyHeaders', requestHeaders: [{ header: 'X-Requested-With', operation: 'set', value: 'XMLHttpRequest' }] },
  condition: { regexFilter: '^https://www\\.woshipm\\.com/(?:wp-admin/admin-ajax\\.php|api2/|tensorflow/upyun/upload)', resourceTypes: ['xmlhttprequest'] },
}]);

function platformChanged(message, details = {}) {
  return new PlatformError('PLATFORM_CHANGED', message, { retryable: false, ...details });
}

function authRequired() {
  return new PlatformError('AUTH_REQUIRED', '人人登录已失效', { retryable: true });
}

function networkError(message = '人人网络请求失败', details = {}) {
  return new PlatformError('NETWORK_ERROR', message, { retryable: true, ...details });
}

function imageUploadError(message = '人人图片上传失败', details = {}) {
  return new PlatformError('IMAGE_UPLOAD_FAILED', message, { retryable: true, ...details });
}

function isRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function responseStatus(response) {
  return Number.isInteger(response?.status) ? response.status : 0;
}

function isRedirect(response) {
  const status = responseStatus(response);
  return response?.type === 'opaqueredirect' || status === 0 || (status >= 300 && status < 400);
}

function isOk(response) {
  return typeof response?.ok === 'boolean' ? response.ok : responseStatus(response) >= 200 && responseStatus(response) < 300;
}

function normalizeUid(value) {
  if (Number.isSafeInteger(value) && value > 0) return String(value);
  return typeof value === 'string' && SAFE_UID.test(value) ? value : null;
}

function safeToken(value) {
  return typeof value === 'string' && SAFE_TOKEN.test(value) ? value : null;
}

function hasUnsafeControl(value) {
  return /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
}

function hasExplicitPort(value) {
  const authority = String(value).match(/^[a-z][a-z\d+.-]*:\/\/([^/?#]*)/iu)?.[1] || '';
  return authority.slice(authority.lastIndexOf('@') + 1).includes(':');
}

function safeCdnUrl(value) {
  if (typeof value !== 'string' || !value || /[\u0000-\u001f\u007f]/u.test(value)) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const approved = host === 'woshipm.com' || host.endsWith('.woshipm.com');
    if (url.protocol !== 'https:' || !approved || hasExplicitPort(value) || url.username || url.password || url.search || url.hash || !url.pathname || url.pathname === '/') return null;
    if (url.pathname.split('/').some((part) => part === '.' || part === '..')) return null;
    return url.href;
  } catch (_error) {
    return null;
  }
}

function safePostId(value) {
  return normalizeUid(value);
}

function parseString(source, start) {
  const quote = source[start];
  if (quote !== '"' && quote !== "'") return null;
  let value = '';
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (character === quote) return { value, next: index + 1, type: 'string' };
    if (character !== '\\') {
      value += character;
      continue;
    }
    const escaped = source[++index];
    if (escaped == null) return null;
    if (escaped === 'n') value += '\n';
    else if (escaped === 'r') value += '\r';
    else if (escaped === 't') value += '\t';
    else if (escaped === 'u' && /^[0-9a-f]{4}$/iu.test(source.slice(index + 1, index + 5))) {
      value += String.fromCharCode(Number.parseInt(source.slice(index + 1, index + 5), 16));
      index += 4;
    } else value += escaped;
  }
  return null;
}

function maskJavascript(source) {
  const masked = String(source).split('');
  const mask = (index) => {
    if (index >= 0 && index < masked.length && masked[index] !== '\n' && masked[index] !== '\r') masked[index] = ' ';
  };
  const controlWords = new Set(['catch', 'for', 'if', 'switch', 'while', 'with']);
  const blockWords = new Set(['do', 'else', 'finally', 'try']);
  const canStartRegex = (token) => [
    'start', 'operator', 'open', 'comma', 'colon', 'keyword', 'block-keyword',
    'statement-boundary', 'control-close', 'block-close', 'arrow',
  ].includes(token);
  const delimiters = [];
  let mode = 'code';
  let quote = '';
  let previous = 'start';
  let functionPending = false;
  let classPending = false;
  let statementStart = true;
  let labelCandidate = false;
  let labelPending = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (mode === 'line-comment') {
      if (character === '\n' || character === '\r') mode = 'code';
      else mask(index);
      continue;
    }
    if (mode === 'block-comment') {
      mask(index);
      if (character === '*' && next === '/') {
        mask(index + 1);
        index += 1;
        mode = 'code';
      }
      continue;
    }
    if (mode === 'string' || mode === 'template') {
      mask(index);
      if (character === '\\') {
        mask(index + 1);
        index += 1;
      } else if (character === quote) {
        mode = 'code';
        quote = '';
      }
      continue;
    }
    if (character === '/' && next === '/') {
      mask(index);
      mask(index + 1);
      index += 1;
      mode = 'line-comment';
      continue;
    }
    if (character === '/' && next === '*') {
      mask(index);
      mask(index + 1);
      index += 1;
      mode = 'block-comment';
      continue;
    }
    if (character === '/' && canStartRegex(previous)) {
      let cursor = index + 1;
      let inClass = false;
      for (; cursor < source.length; cursor += 1) {
        const current = source[cursor];
        mask(cursor);
        if (current === '\\') {
          mask(cursor + 1);
          cursor += 1;
        } else if (current === '[') inClass = true;
        else if (current === ']') inClass = false;
        else if (current === '/' && !inClass) break;
      }
      mask(index);
      for (cursor += 1; cursor < source.length && /[a-z]/iu.test(source[cursor]); cursor += 1) mask(cursor);
      index = cursor - 1;
      previous = 'value';
      statementStart = false;
      labelCandidate = false;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      mask(index);
      quote = character;
      mode = character === '`' ? 'template' : 'string';
      continue;
    }
    if (/\s/u.test(character)) continue;
    if (/[A-Za-z_$]/u.test(character)) {
      let cursor = index + 1;
      while (cursor < source.length && /[A-Za-z0-9_$]/u.test(source[cursor])) cursor += 1;
      const word = source.slice(index, cursor);
      labelCandidate = statementStart;
      statementStart = false;
      if (controlWords.has(word)) previous = 'control';
      else if (blockWords.has(word)) previous = 'block-keyword';
      else if (word === 'function') {
        previous = 'keyword';
        functionPending = true;
      } else if (word === 'class') {
        previous = 'keyword';
        classPending = true;
      } else previous = ['return', 'throw', 'case', 'delete', 'void', 'typeof', 'instanceof', 'in', 'new', 'yield', 'await'].includes(word) ? 'keyword' : 'value';
      index = cursor - 1;
      continue;
    }
    if (character === '=' && next === '>') {
      previous = 'arrow';
      statementStart = false;
      labelCandidate = false;
      index += 1;
      continue;
    }
    if (character === '(') {
      delimiters.push({ type: 'paren', control: previous === 'control' });
      previous = 'open';
      statementStart = false;
      labelCandidate = false;
    } else if (character === '[') {
      delimiters.push({ type: 'bracket' });
      previous = 'open';
      statementStart = false;
      labelCandidate = false;
    } else if (character === '{') {
      const block = functionPending || classPending || labelPending
        || ['start', 'statement-boundary', 'block-keyword', 'control-close', 'arrow'].includes(previous);
      delimiters.push({ type: 'brace', block });
      functionPending = false;
      classPending = false;
      labelPending = false;
      statementStart = block;
      labelCandidate = false;
      previous = 'open';
    } else if (character === ',' ) {
      statementStart = false;
      labelCandidate = false;
      previous = 'comma';
    }
    else if (character === ':') {
      functionPending = false;
      classPending = false;
      labelPending = labelCandidate && previous === 'value';
      statementStart = labelPending;
      labelCandidate = false;
      previous = 'colon';
    } else if (character === ';') {
      functionPending = false;
      classPending = false;
      labelPending = false;
      statementStart = true;
      labelCandidate = false;
      previous = 'statement-boundary';
    } else if (character === ')') {
      const delimiter = delimiters.pop();
      labelPending = false;
      statementStart = delimiter?.type === 'paren' && delimiter.control;
      labelCandidate = false;
      previous = delimiter?.type === 'paren' && delimiter.control ? 'control-close' : 'close';
    } else if (character === ']') {
      delimiters.pop();
      labelPending = false;
      statementStart = false;
      labelCandidate = false;
      previous = 'close';
    } else if (character === '}') {
      const delimiter = delimiters.pop();
      labelPending = false;
      statementStart = delimiter?.type === 'brace' && delimiter.block;
      labelCandidate = false;
      previous = delimiter?.type === 'brace' && delimiter.block ? 'block-close' : 'object-close';
    } else {
      labelPending = false;
      statementStart = false;
      labelCandidate = false;
      previous = 'operator';
    }
  }
  return masked.join('');
}

function balancedEnd(masked, start) {
  const opening = masked[start];
  const closing = opening === '{' ? '}' : opening === '[' ? ']' : ')';
  let depth = 0;
  for (let index = start; index < masked.length; index += 1) {
    if (masked[index] === opening) depth += 1;
    else if (masked[index] === closing && --depth === 0) return index + 1;
  }
  return -1;
}

function parseObjectProperties(source) {
  if (!source.startsWith('{')) return null;
  const masked = maskJavascript(source);
  const properties = new Map();
  let cursor = 1;
  while (cursor < source.length) {
    while (/\s/u.test(source[cursor] || '')) cursor += 1;
    if (source[cursor] === ',') {
      cursor += 1;
      continue;
    }
    if (source[cursor] === '}') return properties;
    const keyStart = cursor;
    let key;
    if (source[cursor] === '"' || source[cursor] === "'") {
      const parsedKey = parseString(source, cursor);
      if (!parsedKey) return null;
      key = parsedKey.value;
      cursor = parsedKey.next;
    } else {
      while (cursor < source.length && /[A-Za-z0-9_$]/u.test(source[cursor])) cursor += 1;
      key = source.slice(keyStart, cursor);
      if (!key) return null;
    }
    if (properties.has(key)) return null;
    while (/\s/u.test(source[cursor] || '')) cursor += 1;
    if (source[cursor] !== ':') return null;
    cursor += 1;
    while (/\s/u.test(source[cursor] || '')) cursor += 1;
    const valueStart = cursor;
    let entry;
    if (source[cursor] === '"' || source[cursor] === "'") {
      entry = parseString(source, cursor);
      if (!entry) return null;
      cursor = entry.next;
    } else if (source[cursor] === '{' || source[cursor] === '[') {
      const end = balancedEnd(masked, cursor);
      if (end < 0) return null;
      entry = { raw: source.slice(cursor, end), next: end, type: 'object' };
      cursor = end;
    } else {
      while (cursor < source.length && !',}'.includes(source[cursor])) cursor += 1;
      const raw = source.slice(valueStart, cursor).trim();
      if (!raw) return null;
      entry = { raw, value: raw, next: cursor, type: 'bare' };
    }
    properties.set(key, { ...entry, raw: entry.raw ?? source.slice(valueStart, cursor) });
  }
  return null;
}

function isExecutableScript(attributes) {
  const type = /(?:^|\s)type\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/iu.exec(attributes || '');
  if (!type) return true;
  const value = (type[1] ?? type[2] ?? type[3] ?? '').trim().toLowerCase().split(';', 1)[0];
  return SCRIPT_TYPES.has(value);
}

function findTagEnd(source, start) {
  let quote = '';
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = '';
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

const INERT_HTML_TAGS = new Set(['iframe', 'noembed', 'noframes', 'noscript', 'plaintext', 'style', 'template', 'textarea', 'title', 'xmp']);

function findClosingTag(source, start, tagName) {
  const match = new RegExp(`</${tagName}\\s*>`, 'iu').exec(source.slice(start));
  if (!match) return null;
  const closingStart = start + match.index;
  return { start: closingStart, end: closingStart + match[0].length };
}

function findTemplateEnd(source, start) {
  let depth = 1;
  let index = start;
  while (index < source.length) {
    if (source.startsWith('<!--', index)) {
      const commentEnd = source.indexOf('-->', index + 4);
      if (commentEnd < 0) return -1;
      index = commentEnd + 3;
      continue;
    }
    if (source[index] !== '<') {
      index += 1;
      continue;
    }
    if (/^<script\b/iu.test(source.slice(index))) return -1;
    const closing = /^<\/template\b/iu.test(source.slice(index));
    const opening = /^<template\b/iu.test(source.slice(index));
    if (!closing && !opening) {
      index += 1;
      continue;
    }
    const tagEnd = findTagEnd(source, index);
    if (tagEnd < 0) return -1;
    if (closing) {
      depth -= 1;
      if (depth === 0) return tagEnd + 1;
    } else if (!/\/\s*>$/u.test(source.slice(index, tagEnd + 1))) {
      depth += 1;
    }
    index = tagEnd + 1;
  }
  return -1;
}

function readScriptBlocks(html) {
  const source = String(html);
  const blocks = [];
  let index = 0;
  while (index < source.length) {
    if (source.startsWith('<!--', index)) {
      const commentEnd = source.indexOf('-->', index + 4);
      if (commentEnd < 0) {
        blocks.push({ malformed: true });
        break;
      }
      index = commentEnd + 3;
      continue;
    }
    if (source[index] !== '<') {
      index += 1;
      continue;
    }
    if (/^<script\b/iu.test(source.slice(index))) {
      const openingEnd = findTagEnd(source, index);
      if (openingEnd < 0) {
        blocks.push({ malformed: true });
        break;
      }
      const closing = findClosingTag(source, openingEnd + 1, 'script');
      if (!closing) {
        blocks.push({ malformed: true });
        break;
      }
      blocks.push({
        attributes: source.slice(index + '<script'.length, openingEnd),
        source: source.slice(openingEnd + 1, closing.start),
        malformed: false,
      });
      index = closing.end;
      continue;
    }
    const tag = /^<([a-z][a-z0-9:-]*)\b/iu.exec(source.slice(index));
    if (!tag) {
      const tagEnd = findTagEnd(source, index);
      if (source[index + 1] === '!' || source[index + 1] === '?') {
        if (tagEnd < 0) blocks.push({ malformed: true });
        if (tagEnd < 0) break;
        index = tagEnd + 1;
      } else index += 1;
      continue;
    }
    const tagEnd = findTagEnd(source, index);
    if (tagEnd < 0) {
      blocks.push({ malformed: true });
      break;
    }
    const tagName = tag[1].toLowerCase();
    const openingTag = source.slice(index, tagEnd + 1);
    if (INERT_HTML_TAGS.has(tagName) && /\/\s*>$/u.test(openingTag)) {
      blocks.push({ malformed: true });
      break;
    }
    if (INERT_HTML_TAGS.has(tagName)) {
      if (tagName === 'plaintext') {
        index = source.length;
        continue;
      }
      const inertEnd = tagName === 'template'
        ? findTemplateEnd(source, tagEnd + 1)
        : findClosingTag(source, tagEnd + 1, tagName)?.end ?? -1;
      if (inertEnd < 0) {
        blocks.push({ malformed: true });
        break;
      }
      index = inertEnd;
      continue;
    }
    index = tagEnd + 1;
  }
  return blocks;
}

function topLevelObjectAssignments(script, pattern) {
  if (/^\s*<!--/u.test(script)) return [];
  const masked = maskJavascript(script);
  const assignments = [];
  for (const match of masked.matchAll(pattern)) {
    const objectStart = masked.indexOf('{', match.index);
    if (objectStart < 0) continue;
    let curly = 0;
    let parentheses = 0;
    let brackets = 0;
    for (let index = 0; index < objectStart; index += 1) {
      if (masked[index] === '{') curly += 1;
      else if (masked[index] === '}') curly -= 1;
      else if (masked[index] === '(') parentheses += 1;
      else if (masked[index] === ')') parentheses -= 1;
      else if (masked[index] === '[') brackets += 1;
      else if (masked[index] === ']') brackets -= 1;
    }
    if (curly !== 0 || parentheses !== 0 || brackets !== 0) continue;
    const end = balancedEnd(masked, objectStart);
    assignments.push({ source: script.slice(objectStart, end < 0 ? script.length : end), malformed: end < 0 });
  }
  return assignments;
}

function extractPageAuth(html) {
  const result = {
    token: null,
    uid: null,
    sawUid: false,
    loggedIn: null,
    authUid: null,
    malformed: false,
  };
  const setToken = (value) => {
    const token = safeToken(value);
    if (!token || result.token !== null) result.malformed = true;
    else result.token = token;
  };
  for (const block of readScriptBlocks(html)) {
    if (block.malformed) {
      result.malformed = true;
      continue;
    }
    if (!isExecutableScript(block.attributes)) continue;
    const script = block.source;
    for (const assignment of topLevelObjectAssignments(script, /(?:^|[;}])\s*window\s*\.\s*settings\s*=\s*\{/giu)) {
      if (assignment.malformed) {
        result.malformed = true;
        continue;
      }
      const properties = parseObjectProperties(assignment.source);
      if (!properties) {
        result.malformed = true;
        continue;
      }
      const property = properties?.get('jltoken');
      if (!property) continue;
      if (property.type !== 'string') result.malformed = true;
      else setToken(property.value);
    }
    for (const assignment of topLevelObjectAssignments(script, /(?:^|[;}])\s*var\s+PURE\s*=\s*\{/gu)) {
      const properties = assignment.malformed ? null : parseObjectProperties(assignment.source);
      const login = properties?.get('is_user_logged_in');
      const token = properties?.get('jltoken');
      const userId = properties?.get('user_id');
      const loginValue = login?.type === 'string' || login?.type === 'bare' ? String(login.value) : null;
      if (!properties || !['0', '1'].includes(loginValue) || result.loggedIn !== null) {
        result.malformed = true;
        continue;
      }
      result.loggedIn = loginValue === '1';
      if (!result.loggedIn) {
        if ((token?.value || '') !== '' || (userId?.value || '') !== '') result.malformed = true;
        continue;
      }
      const uid = normalizeUid(userId?.type === 'string' || userId?.type === 'bare' ? userId.value : null);
      if (token?.type !== 'string' || !uid) result.malformed = true;
      else {
        setToken(token.value);
        result.authUid = uid;
      }
    }
    for (const assignment of topLevelObjectAssignments(script, /(?:^|[;}])\s*var\s+userSettings\s*=\s*\{/giu)) {
      if (assignment.malformed) {
        result.malformed = true;
        continue;
      }
      const properties = parseObjectProperties(assignment.source);
      if (!properties) {
        result.malformed = true;
        continue;
      }
      const property = properties?.get('uid');
      if (!property) continue;
      result.sawUid = true;
      const uid = normalizeUid(property.type === 'string' ? property.value : property.type === 'bare' ? property.value : null);
      if (!uid) result.malformed = true;
      else if (result.uid !== null) result.malformed = true;
      else result.uid = uid;
    }
  }
  if (result.loggedIn === true && result.authUid !== result.uid) result.malformed = true;
  return result;
}

function parseJson(text, message) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (_error) {
    throw platformChanged(message);
  }
  if (!isRecord(data)) throw platformChanged(message);
  return data;
}

function assertDraftUrl(value, draftId) {
  const fallback = `https://www.woshipm.com/writing?pid=${encodeURIComponent(draftId)}`;
  if (value == null || value === '') return fallback;
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/u.test(value)) throw platformChanged('人人草稿响应返回了未批准地址');
  let url;
  try { url = new URL(value); } catch (_error) { throw platformChanged('人人草稿响应返回了未批准地址'); }
  if (url.protocol !== 'https:' || url.hostname !== 'www.woshipm.com' || hasExplicitPort(value) || url.username || url.password
    || url.pathname !== '/writing' || url.hash || url.searchParams.size !== 1 || url.searchParams.get('pid') !== draftId) {
    throw platformChanged('人人草稿响应返回了未批准地址');
  }
  return fallback;
}

function unknownAfterCleanup(draftId) {
  return new PlatformError('UNKNOWN_REMOTE_STATE', '人人草稿请求已返回但请求头清理失败，请人工检查草稿箱', { draftId, retryable: false });
}

function validateArticle(article, imageMap) {
  if (!isRecord(article) || typeof article.title !== 'string' || typeof article.semanticHtml !== 'string'
    || !article.title.trim() || !SAFE_TEXT.test(article.title) || hasUnsafeControl(article.semanticHtml)) {
    throw new PlatformError('ARTICLE_INVALID', '人人文章数据格式无效', { retryable: false });
  }
  const mapping = imageMap instanceof Map ? imageMap : new Map(Object.entries(imageMap || {}));
  for (const value of mapping.values()) if (!safeCdnUrl(value)) throw new PlatformError('ARTICLE_INVALID', '人人图片地址未通过安全校验', { retryable: false });
  const content = applyImageMap(article.semanticHtml, mapping);
  for (const { value } of imageReferencesInContent(content, false)) {
    if (!safeCdnUrl(value)) throw new PlatformError('ARTICLE_INVALID', '人人正文包含未批准图片地址', { retryable: false });
  }
  return { title: article.title, content };
}

export function createWoshipmAdapter() {
  let jltoken = '';

  async function checkAuth(runtime) {
    jltoken = '';
    try {
      return await runtime.withHeaderRules(RULES, async () => {
        let page;
        try { page = await runtime.fetch(HOME_URL, { method: 'GET' }); }
        catch (_error) { throw networkError('人人登录检测网络异常'); }
        if (isRedirect(page) || [401, 403].includes(responseStatus(page))) return { authenticated: false };
        const pageStatus = responseStatus(page);
        if (pageStatus === 429) throw new PlatformError('RATE_LIMITED', '人人登录检测请求过于频繁', { httpStatus: pageStatus, retryable: true });
        if (pageStatus >= 500) throw networkError('人人登录检测网络异常', { httpStatus: pageStatus });
        if (!isOk(page)) throw platformChanged('人人登录页响应状态已变化', { httpStatus: pageStatus });
        let html;
        try { html = await page.text(); } catch (_error) { throw networkError('人人登录页读取失败'); }
        const parsed = extractPageAuth(html);
        if (parsed.malformed) throw platformChanged('人人登录页认证结构已变化');
        if (parsed.loggedIn === false) return { authenticated: false };
        if (!parsed.uid) {
          jltoken = '';
          return { authenticated: false };
        }
        if (!parsed.token) throw platformChanged('人人登录页认证结构已变化');
        let response;
        try { response = await runtime.fetch(`${PROFILE_URL}?uid=${encodeURIComponent(parsed.uid)}`, { method: 'GET' }); }
        catch (_error) { throw networkError('人人用户资料网络异常'); }
        if (isRedirect(response) || [401, 403].includes(responseStatus(response))) return { authenticated: false };
        const status = responseStatus(response);
        if (status === 429) throw new PlatformError('RATE_LIMITED', '人人用户资料请求过于频繁', { httpStatus: status, retryable: true });
        if (status >= 500) throw networkError('人人用户资料网络异常', { httpStatus: status });
        if (!isOk(response)) throw platformChanged('人人用户资料响应状态已变化', { httpStatus: status });
        let text;
        try { text = await response.text(); } catch (_error) { throw platformChanged('人人用户资料响应读取失败', { httpStatus: status }); }
        const data = parseJson(text, '人人用户资料响应格式已变化');
        const user = data.CODE === 200 && isRecord(data.RESULT) && isRecord(data.RESULT.userInfoVo) ? data.RESULT.userInfoVo : null;
        const userId = normalizeUid(user?.uid);
        if (!user || !userId || userId !== parsed.uid || typeof user.nickName !== 'string' || !SAFE_TEXT.test(user.nickName.trim())) {
          throw platformChanged('人人用户资料响应格式已变化', { httpStatus: status });
        }
        jltoken = parsed.token;
        return { authenticated: true, userId, username: user.nickName };
      });
    } catch (error) {
      jltoken = '';
      if (error instanceof PlatformError) throw error;
      throw networkError('人人登录检测网络异常');
    }
  }

  async function uploadImage(runtime, blob, filename) {
    if (!jltoken) throw authRequired();
    if (typeof Blob === 'undefined' || !(blob instanceof Blob) || typeof filename !== 'string' || !SAFE_FILENAME.test(filename)) {
      throw new PlatformError('IMAGE_UPLOAD_FAILED', '人人图片数据或文件名无效', { retryable: false });
    }
    try {
      return await runtime.withHeaderRules(RULES, async () => {
        const form = new FormData();
        form.append('action', 'wpuf_insert_image');
        form.append('name', filename);
        form.append('files', blob, filename);
        let response;
        try {
          response = await runtime.fetch(UPLOAD_URL, { method: 'POST', body: form, headers: { jlstar: `Bearer ${jltoken}` } });
        } catch (_error) { throw networkError('人人图片上传网络异常'); }
        if (isRedirect(response) || [401, 403].includes(responseStatus(response))) throw authRequired();
        const status = responseStatus(response);
        if (status >= 500) throw networkError('人人图片上传网络异常', { httpStatus: status });
        if (status === 429) throw new PlatformError('RATE_LIMITED', '人人图片上传请求过于频繁', { httpStatus: status, retryable: true });
        let text;
        try { text = await response.text(); } catch (_error) { throw networkError('人人图片响应读取失败'); }
        const data = parseJson(text, '人人图片响应格式已变化');
        if (!isOk(response)) throw imageUploadError('人人图片上传失败', { httpStatus: status });
        if (data.error) throw imageUploadError('人人图片上传失败');
        const imageUrl = data.data?.[0]?.url;
        const safeUrl = safeCdnUrl(imageUrl);
        if (!safeUrl) throw platformChanged('人人图片响应返回了未批准地址');
        return safeUrl;
      });
    } catch (error) {
      jltoken = '';
      if (error instanceof PlatformError) throw error;
      throw networkError('人人图片上传网络异常');
    }
  }

  async function saveDraft(runtime, article, imageMap) {
    const { title, content } = validateArticle(article, imageMap);
    let completedDraft = null;
    try {
      return await runtime.withHeaderRules(RULES, async () => {
        let response;
        try {
          response = await runtime.fetch(DRAFT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ action: 'add_draft', post_title: title, post_content: content }),
          });
        } catch (_error) { throw remoteStateError(_error, '无法确认人人是否已创建草稿'); }
        const status = responseStatus(response);
        if (isRedirect(response) || [401, 403].includes(status)) throw authRequired();
        if (status === 429) throw new PlatformError('RATE_LIMITED', '人人草稿请求过于频繁', { httpStatus: status, retryable: true });
        let text;
        try {
          if (typeof response?.text !== 'function') throw new TypeError('响应不可读取');
          text = await response.text();
        } catch (_error) { throw new PlatformError('UNKNOWN_REMOTE_STATE', '无法确认人人是否已创建草稿', { httpStatus: status, retryable: false }); }
        let data;
        try { data = JSON.parse(text); } catch (_error) {
          if (status >= 500 || isOk(response)) throw new PlatformError('UNKNOWN_REMOTE_STATE', '无法确认人人是否已创建草稿', { httpStatus: status, retryable: false });
          throw platformChanged('人人草稿响应格式已变化', { httpStatus: status });
        }
        if (!isRecord(data)) {
          if (status >= 500 || isOk(response)) throw new PlatformError('UNKNOWN_REMOTE_STATE', '无法确认人人是否已创建草稿', { httpStatus: status, retryable: false });
          throw platformChanged('人人草稿响应格式已变化', { httpStatus: status });
        }
        const draftId = safePostId(data.post_id);
        if (!isOk(response)) {
          if (status >= 500) throw new PlatformError('UNKNOWN_REMOTE_STATE', '无法确认人人是否已创建草稿', { httpStatus: status, ...(draftId ? { draftId } : {}), retryable: false });
          throw new PlatformError('DRAFT_CREATE_FAILED', '人人草稿创建失败', { httpStatus: status, ...(draftId ? { draftId } : {}), retryable: !draftId });
        }
        if (data.error) {
          if (draftId) throw new PlatformError('UNKNOWN_REMOTE_STATE', '无法确认人人业务响应中的草稿状态', { draftId, retryable: false });
          throw new PlatformError('DRAFT_CREATE_FAILED', '人人草稿创建失败', { retryable: true });
        }
        if (!draftId) throw platformChanged('人人草稿响应缺少安全 post_id', { httpStatus: status });
        let draftUrl;
        try {
          draftUrl = assertDraftUrl(data.url, draftId);
        } catch (error) {
          if (error instanceof PlatformError) throw new PlatformError(error.code, error.message, { ...error, draftId, retryable: false });
          throw error;
        }
        completedDraft = { draftId, draftUrl };
        return completedDraft;
      });
    } catch (error) {
      if (completedDraft) throw unknownAfterCleanup(completedDraft.draftId);
      if (error instanceof PlatformError) throw error;
      throw remoteStateError(error, '无法确认人人是否已创建草稿');
    } finally {
      jltoken = '';
    }
  }

  return { id: 'woshipm', name: '人人都是产品经理', loginUrl: 'https://www.woshipm.com/login.html', checkAuth, uploadImage, saveDraft };
}
