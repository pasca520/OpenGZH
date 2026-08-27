import { applyImageMap } from '../core/adapter-contract.js';
import { PlatformError, redactSecrets, remoteStateError, summarizeRemote } from '../core/platform-errors.js';

const HOME_URL = 'https://mp.weixin.qq.com/';
const DRAFT_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
const EXECUTABLE_SCRIPT_TYPES = new Set(['text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript', 'application/x-javascript', 'module']);
const HEADER_RULES = Object.freeze([{
  id: 1001,
  priority: 1,
  action: {
    type: 'modifyHeaders',
    requestHeaders: [
      { header: 'Origin', operation: 'set', value: 'https://mp.weixin.qq.com' },
      { header: 'Referer', operation: 'set', value: 'https://mp.weixin.qq.com/' },
    ],
  },
  condition: { urlFilter: '*://mp.weixin.qq.com/cgi-bin/*', resourceTypes: ['xmlhttprequest'] },
}]);

function networkError(message, httpStatus) {
  return new PlatformError('NETWORK_ERROR', message, {
    ...(Number.isInteger(httpStatus) ? { httpStatus } : {}),
    retryable: true,
  });
}

// 微信公众号的会话 Cookie 大多不带 SameSite=__; 在扩展内部跨站请求中不会发送，
// 因此登录态请求必须从打开的 mp.weixin.qq.com 页面上下文（同站）发起。
// fetchInPage 返回 { status, ok, type, headers, text } 与 Response 形状兼容。
function responseLike(value) {
  if (!value) return null;
  return {
    status: value.status,
    ok: value.ok,
    type: value.type,
    async text() { return typeof value.text === 'string' ? value.text : ''; },
    header(name) { return value?.headers?.[String(name).toLowerCase()] ?? null; },
  };
}

async function fetchPlatformPage(runtime, url) {
  const inPage = typeof runtime?.fetchInPage === 'function' ? await runtime.fetchInPage(url, { method: 'GET' }) : null;
  if (inPage) return responseLike(inPage);
  const response = await runtime.fetch(url, { method: 'GET' });
  return {
    status: responseStatus(response),
    ok: response?.ok,
    type: response?.type,
    async text() { return response.text(); },
    header(name) { return response?.headers?.get?.(name) ?? null; },
  };
}

function decodeUnicodeEscapes(value) {
  return String(value).replace(/\\u([0-9a-f]{4})/gi, (_match, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function safeRemoteSummary(value) {
  const raw = String(value ?? '');
  let redacted;
  try {
    redacted = JSON.stringify(redactSecrets(JSON.parse(raw)));
  } catch (_error) {
    redacted = redactSecrets(decodeUnicodeEscapes(raw));
  }
  return summarizeRemote(redacted ?? '');
}

function responseStatus(response) {
  return Number.isInteger(response?.status) ? response.status : 200;
}

function isAuthResponse(response) {
  const status = responseStatus(response);
  return status === 0 || status === 401 || status === 403 || response?.type === 'opaqueredirect'
    || (status >= 300 && status < 400);
}

function isResponseNotOk(response) {
  return response?.ok === false || (responseStatus(response) >= 400);
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
    else if (escaped === 'b') value += '\b';
    else if (escaped === 'f') value += '\f';
    else if (escaped === 'v') value += '\v';
    else if (escaped === 'u' && /^[0-9a-f]{4}$/i.test(source.slice(index + 1, index + 5))) {
      value += String.fromCharCode(Number.parseInt(source.slice(index + 1, index + 5), 16));
      index += 4;
    } else value += escaped;
  }
  return null;
}

function balancedEnd(source, start) {
  const opening = source[start];
  const closing = opening === '{' ? '}' : opening === '[' ? ']' : ')';
  let depth = 0;
  let quote = null;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === opening) depth += 1;
    else if (character === closing && --depth === 0) return index + 1;
  }
  return -1;
}

function maskJavascript(source) {
  const masked = String(source).split('');
  const mask = (index) => {
    if (index < 0 || index >= masked.length) return;
    if (masked[index] !== '\n' && masked[index] !== '\r') masked[index] = ' ';
  };
  let mode = 'code';
  let quote = '';
  for (let index = 0; index < masked.length; index += 1) {
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
    } else if (character === '/' && next === '*') {
      mask(index);
      mask(index + 1);
      index += 1;
      mode = 'block-comment';
    } else if (character === '"' || character === "'" || character === '`') {
      mask(index);
      quote = character;
      mode = character === '`' ? 'template' : 'string';
    }
  }
  return masked.join('');
}

function skipWhitespace(source, start) {
  let index = start;
  while (/\s/.test(source[index] || '')) index += 1;
  return index;
}

function isExecutableScript(attributes) {
  const type = /(?:^|\s)type\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attributes || '');
  if (!type) return true;
  const value = (type[1] ?? type[2] ?? type[3] ?? '').trim().toLowerCase().split(';', 1)[0];
  return EXECUTABLE_SCRIPT_TYPES.has(value);
}

function skipLeadingTrivia(source, start) {
  let cursor = start;
  while (cursor < source.length) {
    cursor = skipWhitespace(source, cursor);
    if (source[cursor] === ';') {
      cursor += 1;
      continue;
    }
    if (source.startsWith('//', cursor)) {
      const end = source.indexOf('\n', cursor + 2);
      cursor = end < 0 ? source.length : end + 1;
      continue;
    }
    if (source.startsWith('/*', cursor)) {
      const end = source.indexOf('*/', cursor + 2);
      if (end < 0) return -1;
      cursor = end + 2;
      continue;
    }
    return cursor;
  }
  return cursor;
}

function* wxObjectStarts(source, allowNested) {
  const assignmentPattern = /\bwindow\s*\.\s*wx\s*=\s*\{/gi;
  let cursor = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;
  for (const assignment of source.matchAll(assignmentPattern)) {
    while (cursor < assignment.index) {
      const character = source[cursor++];
      if (character === '{') braceDepth += 1;
      else if (character === '}') braceDepth = Math.max(0, braceDepth - 1);
      else if (character === '[') bracketDepth += 1;
      else if (character === ']') bracketDepth = Math.max(0, bracketDepth - 1);
      else if (character === '(') parenDepth += 1;
      else if (character === ')') parenDepth = Math.max(0, parenDepth - 1);
    }
    let previous = assignment.index - 1;
    while (previous >= 0 && /\s/.test(source[previous])) previous -= 1;
    const nested = braceDepth || bracketDepth || parenDepth;
    if (nested) {
      const blockStart = source.lastIndexOf('{', assignment.index);
      const guarded = allowNested && braceDepth === 1 && !bracketDepth && !parenDepth && blockStart >= 0
        && /(?:^|[;}])\s*if\s*\(\s*!\s*window\s*\.\s*wx\s*\)\s*$/iu.test(source.slice(0, blockStart));
      if (!guarded) continue;
    }
    if (previous >= 0 && !';{}'.includes(source[previous])) continue;
    yield assignment.index + assignment[0].lastIndexOf('{');
  }
}

function parseObjectProperties(source) {
  if (!source.startsWith('{')) return null;
  const properties = new Map();
  let cursor = 1;
  while (cursor < source.length) {
    cursor = skipWhitespace(source, cursor);
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
      while (cursor < source.length && /[\w$]/.test(source[cursor])) cursor += 1;
      key = source.slice(keyStart, cursor);
      if (!key) return null;
    }
    cursor = skipWhitespace(source, cursor);
    if (source[cursor] !== ':') return null;
    cursor = skipWhitespace(source, cursor + 1);
    const valueStart = cursor;
    let entry;
    if (source[cursor] === '"' || source[cursor] === "'") {
      entry = parseString(source, cursor);
      if (!entry) return null;
      cursor = entry.next;
    } else if (source[cursor] === '{' || source[cursor] === '[') {
      const end = balancedEnd(source, cursor);
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

function* bootstrapObjects(html, allowNested = false) {
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  for (const match of String(html).matchAll(scriptPattern)) {
    if (!isExecutableScript(match[1])) continue;
    const script = match[2];
    const masked = maskJavascript(script);
    const cursor = skipLeadingTrivia(script, 0);
    if (cursor < 0 || script.startsWith('<!--', cursor)) continue;
    for (const objectStart of wxObjectStarts(masked, allowNested)) {
      const objectEnd = balancedEnd(masked, objectStart);
      if (objectEnd < 0) continue;
      const properties = parseObjectProperties(script.slice(objectStart, objectEnd));
      if (properties) yield properties;
    }
  }
}

function stringProperty(properties, key) {
  const property = properties?.get(key);
  return property?.type === 'string' && property.value ? property.value : null;
}

function parseBootstrap(html, expectedToken = '') {
  for (const properties of bootstrapObjects(html, Boolean(expectedToken))) {
    const data = parseObjectProperties(properties.get('data')?.raw || '');
    const token = stringProperty(data, 't');
    if (!token || (expectedToken && token !== expectedToken)) continue;
    const ticket = stringProperty(data, 'ticket') || stringProperty(properties, 'ticket') || '';
    const userName = stringProperty(data, 'user_name') || stringProperty(properties, 'user_name') || '';
    const nickName = stringProperty(data, 'nick_name') || stringProperty(properties, 'nick_name') || '';
    const time = data?.get('time') || properties.get('time');
    const svrTime = time?.type === 'string' && /^\d+$/.test(time.value)
      ? time.value
      : time?.type === 'bare' && /^\d+$/.test(time.value)
        ? time.value
        : String(Math.floor(Date.now() / 1000));
    return { token, ticket, userName, nickName, svrTime };
  }
  return null;
}

function safeWeixinHref(href) {
  try {
    const url = new URL(href);
    if (url.protocol !== 'https:' || url.hostname !== 'mp.weixin.qq.com' || hasExplicitPort(href) || url.username || url.password) return null;
    return url.href;
  } catch (_error) {
    return null;
  }
}

function normalizeDraftId(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const draftId = String(value);
  return DRAFT_ID_PATTERN.test(draftId) ? draftId : null;
}

function hasExplicitPort(value) {
  const authority = String(value).match(/^[a-z][a-z\d+.-]*:\/\/([^/?#]*)/i)?.[1] || '';
  return authority.slice(authority.lastIndexOf('@') + 1).includes(':');
}

async function openBackendPageUrls(runtime) {
  if (typeof runtime?.listOpenPageUrls !== 'function') return [];
  let values;
  try {
    values = await runtime.listOpenPageUrls();
  } catch (_error) {
    return [];
  }
  if (!Array.isArray(values)) return [];
  const urls = [];
  for (const value of values) {
    if (typeof value !== 'string') continue;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.hostname !== 'mp.weixin.qq.com' || hasExplicitPort(value)
        || url.username || url.password || url.hash || !url.pathname.startsWith('/cgi-bin/')
        || !url.searchParams.get('token')) continue;
      if (!urls.includes(url.href)) urls.push(url.href);
    } catch (_error) {
      // Ignore stale or malformed browser tab URLs and fall back to the public root.
    }
  }
  return urls;
}

function findTagEnd(source, start) {
  let quote = '';
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = '';
    } else if (character === '"' || character === "'") quote = character;
    else if (character === '>') return index + 1;
    else if (character === '<') return -1;
  }
  return -1;
}

function findAnchorStart(source, from) {
  let index = source.indexOf('<', from);
  while (index >= 0) {
    if (source.startsWith('<!--', index)) {
      const commentEnd = source.indexOf('-->', index + 4);
      if (commentEnd < 0) return -1;
      index = source.indexOf('<', commentEnd + 3);
      continue;
    }
    const candidate = source.slice(index);
    if (/^<\s*\/\s*a(?:\s[^>]*)?>/i.test(candidate) || /^<\s*a(?=\s|\/?>)/i.test(candidate)) return index;
    const end = findTagEnd(source, index);
    if (end < 0) return -1;
    index = source.indexOf('<', end);
  }
  return -1;
}

function readAnchorHref(tag) {
  if (/^<\s*\/\s*a(?:\s[^>]*)?>/i.test(tag)) return { closing: true };
  const rawBody = tag.slice(1, -1);
  const body = /(?:\s|["'])\/\s*$/.test(rawBody) ? rawBody.replace(/\/\s*$/, '') : rawBody;
  const name = /^\s*a(?=\s|$)/i.exec(body);
  if (!name) return null;
  let cursor = name[0].length;
  let href = null;
  while (cursor < body.length) {
    while (/\s/.test(body[cursor] || '')) cursor += 1;
    if (cursor >= body.length) break;
    const start = cursor;
    while (cursor < body.length && !/[\s=]/.test(body[cursor])) cursor += 1;
    const attribute = body.slice(start, cursor).toLowerCase();
    if (!attribute) return null;
    while (/\s/.test(body[cursor] || '')) cursor += 1;
    let value = null;
    if (body[cursor] === '=') {
      cursor = skipWhitespace(body, cursor + 1);
      if (body[cursor] === '"' || body[cursor] === "'") {
        const parsed = parseString(body, cursor);
        if (!parsed) return null;
        value = parsed.value;
        cursor = parsed.next;
      } else {
        const valueStart = cursor;
        while (cursor < body.length && !/\s/.test(body[cursor])) cursor += 1;
        value = body.slice(valueStart, cursor);
      }
    }
    if (attribute === 'href') {
      if (href !== null || !value) return null;
      href = value;
    }
  }
  return href === null ? null : safeWeixinHref(href);
}

function escapeAttribute(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function stripExternalLinks(html) {
  const source = String(html);
  let output = '';
  let cursor = 0;
  const anchors = [];
  while (cursor < source.length) {
    const start = findAnchorStart(source, cursor);
    if (start < 0) {
      output += source.slice(cursor);
      break;
    }
    output += source.slice(cursor, start);
    const end = findTagEnd(source, start);
    if (end < 0) {
      cursor = start + 2;
      continue;
    }
    const tag = source.slice(start, end);
    const parsed = readAnchorHref(tag);
    if (parsed?.closing) {
      const anchor = anchors.pop();
      if (anchor?.safe) output += '</a>';
    } else {
      const safeHref = parsed;
      const opening = safeHref ? `<a href="${escapeAttribute(safeHref)}">` : '';
      anchors.push({ safe: Boolean(safeHref), opening, offset: output.length });
      output += opening;
    }
    cursor = end;
  }
  for (let index = anchors.length - 1; index >= 0; index -= 1) {
    const anchor = anchors[index];
    if (anchor.safe) output = `${output.slice(0, anchor.offset)}${output.slice(anchor.offset + anchor.opening.length)}`;
  }
  return output;
}

function createDraftBody(title, content, token) {
  return new URLSearchParams({
    token, lang: 'zh_CN', f: 'json', ajax: '1', random: String(Math.random()),
    AppMsgId: '', count: '1', data_seq: '0', operate_from: 'Chrome', isnew: '0',
    ad_video_transition0: '', can_reward0: '0', related_video0: '', is_video_recommend0: '-1',
    title0: title, author0: '', writerid0: '0', fileid0: '', digest0: '', auto_gen_digest0: '1',
    content0: content, sourceurl0: '', need_open_comment0: '1', only_fans_can_comment0: '0',
    cdn_url0: '', cdn_235_1_url0: '', cdn_1_1_url0: '', cdn_url_back0: '', crop_list0: '',
    music_id0: '', video_id0: '', voteid0: '', voteismlt0: '', supervoteid0: '', cardid0: '',
    cardquantity0: '', cardlimit0: '', vid_type0: '', show_cover_pic0: '0', shortvideofileid0: '',
    copyright_type0: '0', releasefirst0: '', platform0: '', reprint_permit_type0: '', allow_reprint0: '',
    allow_reprint_modify0: '', original_article_type0: '', ori_white_list0: '', free_content0: '', fee0: '0',
    ad_id0: '', guide_words0: '', is_share_copyright0: '0', share_copyright_url0: '',
    source_article_type0: '', reprint_recommend_title0: '', reprint_recommend_content0: '',
    share_page_type0: '0', share_imageinfo0: '{"list":[]}', share_video_id0: '', dot0: '{}',
    share_voice_id0: '', insert_ad_mode0: '', categories_list0: '[]',
  });
}

function unknownRemoteAfterCleanup(result, error) {
  return new PlatformError('UNKNOWN_REMOTE_STATE', '草稿请求已返回但请求头清理失败，请人工检查公众号草稿箱', {
    draftId: safeRemoteSummary(result?.draftId || ''),
    remoteSummary: safeRemoteSummary(error?.message || '请求头清理失败'),
    retryable: false,
  });
}

function parseRemoteJson(text, message, httpStatus) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (_error) {
    throw new PlatformError('PLATFORM_CHANGED', message, { httpStatus, remoteSummary: safeRemoteSummary(text) });
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new PlatformError('PLATFORM_CHANGED', message, { httpStatus, remoteSummary: safeRemoteSummary(text) });
  }
  return data;
}

function assertBaseResponse(data, message, httpStatus, text) {
  if (!data.base_resp || typeof data.base_resp !== 'object' || Array.isArray(data.base_resp)
    || !Number.isInteger(data.base_resp.ret)) {
    throw new PlatformError('PLATFORM_CHANGED', message, { httpStatus, remoteSummary: safeRemoteSummary(text) });
  }
  return data.base_resp;
}

function validateCdnUrl(value) {
  if (typeof value !== 'string' || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'mmbiz.qpic.cn' || hasExplicitPort(value) || url.username || url.password || !url.pathname || url.pathname === '/') return null;
    return url.href;
  } catch (_error) {
    return null;
  }
}

export function createWeixinAdapter() {
  let session = null;
  const requireSession = () => {
    if (!session) throw new PlatformError('AUTH_REQUIRED', '微信公众号登录已失效', { retryable: true });
    return session;
  };

  return {
    id: 'weixin',
    name: '微信公众号',
    loginUrl: HOME_URL,

    async checkAuth(runtime) {
      session = null;
      const urls = [...await openBackendPageUrls(runtime), HOME_URL];
      for (const url of [...new Set(urls)]) {
        const isRoot = url === HOME_URL;
        let response;
        try {
          response = await fetchPlatformPage(runtime, url);
        } catch (_error) {
          if (isRoot) throw networkError('微信公众号登录检测网络异常');
          continue;
        }
        // 服务端以 logicret 头明确返回登录态：非 0 表示当前请求没有有效会话。
        const logicret = response?.header?.('logicret');
        if (logicret !== null && logicret !== undefined && logicret !== '' && logicret !== '0') continue;
        if (isAuthResponse(response)) continue;
        const status = responseStatus(response);
        if (status >= 500) {
          if (isRoot) throw networkError('微信公众号登录检测网络异常', status);
          continue;
        }
        if (isResponseNotOk(response)) {
          if (isRoot) throw new PlatformError('PLATFORM_CHANGED', `微信公众号登录页响应异常: ${status}`, { httpStatus: status, retryable: false });
          continue;
        }
        let text;
        try {
          text = await response.text();
        } catch (_error) {
          if (isRoot) throw networkError('微信公众号登录页读取失败');
          continue;
        }
        const expectedToken = isRoot ? '' : new URL(url).searchParams.get('token') || '';
        session = parseBootstrap(text, expectedToken);
        if (session) return { authenticated: true, userId: session.userName, username: session.nickName };
      }
      return { authenticated: false };
    },

    async uploadImage(runtime, blob, filename) {
      const current = requireSession();
      if (!(blob instanceof Blob)) throw new PlatformError('IMAGE_UPLOAD_FAILED', '微信公众号图片数据无效', { retryable: true });
      const form = new FormData();
      const stamp = Date.now();
      form.append('id', String(stamp));
      form.append('size', String(blob.size));
      form.append('file', blob, filename);
      const query = new URLSearchParams({
        action: 'upload_material', f: 'json', scene: '8', writetype: 'doublewrite', groupid: '1',
        ticket_id: current.userName, ticket: current.ticket, svr_time: current.svrTime,
        token: current.token, lang: 'zh_CN', seq: String(stamp), t: String(Math.random()),
      });
      const url = `https://mp.weixin.qq.com/cgi-bin/filetransfer?${query}`;
      return runtime.withHeaderRules(HEADER_RULES, async () => {
        let response = null;
        try {
          const inPageInit = {
            method: 'POST',
            body: {
              form: {
                fields: [
                  ['type', blob.type || 'application/octet-stream'],
                  ['id', String(stamp)],
                  ['name', filename],
                  ['lastModifiedDate', new Date(stamp).toString()],
                  ['size', String(blob.size)],
                ],
                file: { bytes: await blob.arrayBuffer(), mimeType: blob.type || 'application/octet-stream', filename, fileName: 'file' },
              },
            },
          };
          const inPage = typeof runtime.fetchInPage === 'function' ? await runtime.fetchInPage(url, inPageInit) : null;
          response = inPage ? responseLike(inPage) : null;
        } catch (_error) {
          response = null;
        }
        if (!response) {
          try {
            response = await runtime.fetch(url, { method: 'POST', body: form });
          } catch (_error) {
            throw networkError('微信公众号图片上传网络异常');
          }
        }
        if (isAuthResponse(response)) {
          session = null;
          throw new PlatformError('AUTH_REQUIRED', '微信公众号登录已失效', { retryable: true });
        }
        const status = responseStatus(response);
        if (status >= 500) throw networkError('微信公众号图片上传网络异常', status);
        let text;
        try { text = await response.text(); } catch (_error) { throw networkError('微信公众号图片响应读取失败'); }
        const data = parseRemoteJson(text, '微信公众号图片响应格式已变化', status);
        const baseResp = assertBaseResponse(data, '微信公众号图片响应缺少 base_resp', status, text);
        if (baseResp.ret !== 0 || isResponseNotOk(response)) {
          throw new PlatformError('IMAGE_UPLOAD_FAILED', safeRemoteSummary(baseResp.err_msg || '微信公众号图片上传失败'), {
            httpStatus: status, remoteSummary: safeRemoteSummary(text), retryable: true,
          });
        }
        const cdnUrl = validateCdnUrl(data.cdn_url);
        if (!cdnUrl) throw new PlatformError('PLATFORM_CHANGED', '微信公众号图片响应缺少有效 CDN 地址', { httpStatus: status, remoteSummary: safeRemoteSummary(text), retryable: false });
        return cdnUrl;
      });
    },

    async saveDraft(runtime, article, imageMap) {
      const current = requireSession();
      const content = stripExternalLinks(applyImageMap(article?.wechatHtml, imageMap));
      const draftUrl = `https://mp.weixin.qq.com/cgi-bin/operate_appmsg?t=ajax-response&sub=create&type=77&token=${encodeURIComponent(current.token)}&lang=zh_CN`;
      const draftBody = createDraftBody(article?.title || '', content, current.token);
      let completedDraft = null;
      try {
        return await runtime.withHeaderRules(HEADER_RULES, async () => {
          let response = null;
          try {
            const inPage = typeof runtime.fetchInPage === 'function' ? await runtime.fetchInPage(draftUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: draftBody.toString(),
            }) : null;
            response = inPage ? responseLike(inPage) : null;
          } catch (_error) {
            response = null;
          }
          if (!response) {
            try {
              response = await runtime.fetch(
                draftUrl,
                { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: draftBody },
              );
            } catch (error) {
              throw remoteStateError(error);
            }
          }
          if (isAuthResponse(response)) {
            session = null;
            throw new PlatformError('AUTH_REQUIRED', '微信公众号登录已失效', { retryable: true });
          }
          const status = responseStatus(response);
          let text;
          try { text = await response.text(); } catch (error) { throw remoteStateError(error); }
          const data = parseRemoteJson(text, '微信公众号草稿响应格式已变化', status);
          const baseResp = data.base_resp && typeof data.base_resp === 'object' && !Array.isArray(data.base_resp)
            ? data.base_resp
            : null;
          if (!baseResp || !Number.isInteger(baseResp.ret)) {
            throw new PlatformError('PLATFORM_CHANGED', '微信公众号草稿响应缺少 base_resp', { httpStatus: status, remoteSummary: safeRemoteSummary(text), retryable: false });
          }
          if (baseResp.ret !== 0) {
            throw new PlatformError('DRAFT_CREATE_FAILED', safeRemoteSummary(baseResp.err_msg || '微信公众号草稿创建失败'), {
              httpStatus: status, remoteSummary: safeRemoteSummary(text), retryable: true,
            });
          }
          if (isResponseNotOk(response)) {
            if (status >= 500) {
              const draftId = normalizeDraftId(data.appMsgId);
              throw new PlatformError('UNKNOWN_REMOTE_STATE', `微信公众号草稿请求状态未知(HTTP ${status})，请人工检查草稿箱`, {
                ...(draftId ? { draftId } : {}),
                httpStatus: status, remoteSummary: safeRemoteSummary(text), retryable: false,
              });
            }
            throw new PlatformError('DRAFT_CREATE_FAILED', `微信公众号草稿创建失败: ${status}`, {
              httpStatus: status, remoteSummary: safeRemoteSummary(text), retryable: true,
            });
          }
          const draftId = normalizeDraftId(data.appMsgId);
          if (!draftId) {
            throw new PlatformError('PLATFORM_CHANGED', '微信公众号草稿响应缺少 appMsgId', { httpStatus: status, remoteSummary: safeRemoteSummary(text), retryable: false });
          }
          const draftLink = `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit&action=edit&type=77&appmsgid=${encodeURIComponent(draftId)}&token=${encodeURIComponent(current.token)}&lang=zh_CN`;
          completedDraft = { draftId, draftUrl: draftLink };
          return completedDraft;
        });
      } catch (error) {
        if (completedDraft) throw unknownRemoteAfterCleanup(completedDraft, error);
        throw error;
      }
    },
  };
}
