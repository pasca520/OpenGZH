import { dataUrlToBlob } from './data-url.js';
import { withSessionHeaderRules } from './header-rules.js';
import { PlatformError, redactSecrets } from './platform-errors.js';

const IN_PAGE_FETCH_FUNCTION = async (options) => {
  const init = { ...options.init };
  const body = options.init?.body;
  if (body && typeof body === 'object' && body.form) {
    const form = new FormData();
    for (const [key, value] of (body.form.fields || [])) form.append(String(key), String(value));
    if (body.form.file) {
      const blob = new Blob([body.form.file.bytes], { type: body.form.file.mimeType || 'application/octet-stream' });
      form.append(body.form.fileName || 'files', blob, body.form.file.filename);
    }
    init.body = form;
  }
  const response = await fetch(options.url, { ...init, credentials: 'include', redirect: 'manual' });
  const text = await response.text();
  const headers = {};
  response.headers.forEach((value, key) => { headers[key] = value; });
  return { status: response.status, ok: response.ok, type: response.type, headers, text };
};

const ALLOWED_HOSTS = Object.freeze({
  weixin: Object.freeze(['mp.weixin.qq.com']),
  zhihu: Object.freeze(['www.zhihu.com', 'zhuanlan.zhihu.com', 'api.zhihu.com', 'zhihu-pics-upload.zhimg.com']),
  juejin: Object.freeze(['juejin.cn', 'api.juejin.cn', 'imagex.bytedanceapi.com', 'tos-d-x-lf.douyin.com', '*.volces.com']),
  woshipm: Object.freeze(['www.woshipm.com']),
});

const CREDENTIALLESS_HOSTS = new Set(['imagex.bytedanceapi.com', 'tos-d-x-lf.douyin.com']);
const REMOTE_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif']);
const MAX_REMOTE_IMAGE_BYTES = 20 * 1024 * 1024;
const TAB_QUERY_PATTERNS = Object.freeze({
  weixin: Object.freeze(['https://mp.weixin.qq.com/*']),
});

function randomId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  return `request-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function hostAllowed(platformId, hostname) {
  return ALLOWED_HOSTS[platformId]?.some((rule) => rule.startsWith('*.')
    ? hostname.endsWith(rule.slice(1)) && hostname !== rule.slice(2)
    : hostname === rule) || false;
}

export function assertFixedUrl(platformId, input) {
  let url;
  try {
    url = new URL(input);
  } catch (_error) {
    throw new PlatformError('PLATFORM_CHANGED', '平台请求地址无效', { retryable: false });
  }
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !hostAllowed(platformId, url.hostname)) {
    throw new PlatformError('PLATFORM_CHANGED', `平台返回了未批准地址: ${url.origin}`, { retryable: false });
  }
  return url;
}

function credentialPolicy(url) {
  return CREDENTIALLESS_HOSTS.has(url.hostname) || url.hostname.endsWith('.volces.com') ? 'omit' : 'include';
}

function remoteImageError(message, details = {}) {
  return new PlatformError('IMAGE_READ_FAILED', message, { retryable: true, ...details });
}

function assertRemoteImageUrl(image, remoteImageOrigins) {
  let url;
  try {
    url = new URL(image?.url);
  } catch {
    throw remoteImageError('远程图片地址无效', { retryable: false });
  }
  if (image?.kind !== 'remote-url' || image.ref !== image.url || url.protocol !== 'https:' || url.port || url.username || url.password
    || /^(?:localhost|.*\.localhost|.*\.local|\d{1,3}(?:\.\d{1,3}){3}|\[.*\])$/i.test(url.hostname)) {
    throw remoteImageError('远程图片地址无效', { retryable: false });
  }
  if (!remoteImageOrigins.has(url.origin)) {
    throw new PlatformError('PERMISSION_DENIED', `没有读取图片来源的权限: ${url.origin}`, { retryable: true });
  }
  return url;
}

async function limitedImageBlob(response, mimeType) {
  const lengthHeader = response.headers.get('content-length');
  if (lengthHeader != null) {
    const length = Number(lengthHeader);
    if (!Number.isInteger(length) || length < 0 || length > MAX_REMOTE_IMAGE_BYTES) throw remoteImageError('远程图片超过 20MB 限制', { retryable: false });
  }
  if (!response.body?.getReader) {
    const blob = await response.blob();
    if (blob.size > MAX_REMOTE_IMAGE_BYTES) throw remoteImageError('远程图片超过 20MB 限制', { retryable: false });
    return new Blob([blob], { type: mimeType });
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REMOTE_IMAGE_BYTES) {
        await reader.cancel();
        throw remoteImageError('远程图片超过 20MB 限制', { retryable: false });
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof PlatformError) throw error;
    throw remoteImageError('远程图片响应读取失败');
  }
  return new Blob(chunks, { type: mimeType });
}

async function fetchRemoteImage(image, fetchImpl, remoteImageOrigins) {
  const url = assertRemoteImageUrl(image, remoteImageOrigins);
  let response;
  try {
    response = await fetchImpl(url.href, {
      method: 'GET', credentials: 'omit', redirect: 'manual', referrerPolicy: 'no-referrer',
    });
  } catch {
    throw remoteImageError('远程图片下载失败');
  }
  if (!response?.ok || response.status < 200 || response.status >= 300) {
    throw remoteImageError(`远程图片下载失败: HTTP ${Number(response?.status) || 0}`, { httpStatus: Number(response?.status) || 0 });
  }
  const mimeType = String(response.headers?.get?.('content-type') || '').split(';', 1)[0].trim().toLowerCase();
  if (!REMOTE_IMAGE_MIME_TYPES.has(mimeType)) throw remoteImageError('远程地址返回的不是支持的图片格式', { retryable: false });
  return limitedImageBlob(response, mimeType);
}

export function createPortImageBroker(port, { timeoutMs = 30000, idFactory = randomId } = {}) {
  const pending = new Map();
  let disposed = false;

  const fail = (entry, message) => {
    clearTimeout(entry.timer);
    entry.reject(new PlatformError('IMAGE_READ_FAILED', message, { retryable: true }));
  };

  const onMessage = (message) => {
    if (disposed || !message || !pending.has(message.requestId)) return;
    const entry = pending.get(message.requestId);
    if (message.taskId !== entry.taskId || message.platformId !== entry.platformId || message.ref !== entry.ref) return;
    if (message.type !== 'IMAGE_DATA' && message.type !== 'IMAGE_ERROR') return;
    clearTimeout(entry.timer);
    pending.delete(message.requestId);
    if (message.type === 'IMAGE_ERROR') {
      entry.reject(new PlatformError('IMAGE_READ_FAILED', message.message || '图片读取失败', { retryable: true }));
      return;
    }
    try {
      entry.resolve(dataUrlToBlob(message.dataUrl));
    } catch (error) {
      entry.reject(new PlatformError('IMAGE_READ_FAILED', error?.message || '图片读取失败', { retryable: true }));
    }
  };

  port?.onMessage?.addListener?.(onMessage);

  return {
    requestImage(image, { taskId, platformId } = {}) {
      if (disposed) return Promise.reject(new PlatformError('IMAGE_READ_FAILED', '页面连接已断开', { retryable: true }));
      if (!image || typeof image.ref !== 'string' || !image.ref || typeof taskId !== 'string' || !taskId || typeof platformId !== 'string' || !platformId) {
        return Promise.reject(new PlatformError('IMAGE_READ_FAILED', '图片请求关联信息无效', { retryable: false }));
      }
      const requestId = idFactory();
      if (typeof requestId !== 'string' || !requestId || pending.has(requestId)) {
        return Promise.reject(new PlatformError('IMAGE_READ_FAILED', '图片请求 ID 重复或无效', { retryable: false }));
      }
      return new Promise((resolve, reject) => {
        const entry = { resolve, reject, taskId, platformId, ref: image.ref, timer: null };
        entry.timer = setTimeout(() => {
          pending.delete(requestId);
          fail(entry, '图片读取超时');
        }, timeoutMs);
        pending.set(requestId, entry);
        try {
          port.postMessage({ type: 'IMAGE_REQUIRED', taskId, platformId, requestId, image });
        } catch (error) {
          pending.delete(requestId);
          fail(entry, error?.message || '页面连接已断开');
        }
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      port?.onMessage?.removeListener?.(onMessage);
      for (const entry of pending.values()) fail(entry, '页面连接已断开');
      pending.clear();
    },
  };
}

export function createInTabFetcher({ scriptingApi, tabsApi, logSink = console }) {
  if (typeof scriptingApi?.executeScript !== 'function' || typeof tabsApi?.query !== 'function') return null;
  return async function inTabFetch(input, init = {}) {
    let url;
    try {
      url = new URL(input);
    } catch (_error) {
      throw new PlatformError('PLATFORM_CHANGED', '平台请求地址无效', { retryable: false });
    }
    let found = [];
    try {
      found = await tabsApi.query({ url: [`${url.origin}/*`] });
    } catch (_error) {
      found = [];
    }
    const tab = Array.isArray(found) ? found.find((entry) => Number.isInteger(entry?.id)) : undefined;
    if (!tab) {
      throw new PlatformError('NETWORK_ERROR', '未找到已打开的平台页面，无法在页面内发起请求', { retryable: true });
    }
    let injected;
    try {
      injected = await scriptingApi.executeScript({
        target: { tabId: tab.id },
        func: IN_PAGE_FETCH_FUNCTION,
        args: [{ url: url.href, init }],
        world: 'MAIN',
      });
    } catch (error) {
      throw new PlatformError('NETWORK_ERROR', `页面内请求执行失败: ${String(error?.message || error)}`, { retryable: true });
    }
    const value = injected?.[0]?.result;
    if (!value || typeof value !== 'object' || !Number.isInteger(value.status)) {
      throw new PlatformError('PLATFORM_CHANGED', '页面内请求响应格式无效', { retryable: false });
    }
    logSink?.info?.('[OpenGZH]', redactSecrets({ scope: 'in-page-fetch', host: url.hostname, status: value.status }));
    return value;
  };
}

export function createRequestRuntime({
  platformId,
  taskId,
  imageBroker,
  fetchImpl = globalThis.fetch,
  inTabFetch = null,
  declarativeNetRequest = globalThis.chrome?.declarativeNetRequest,
  tabsApi = globalThis.chrome?.tabs,
  logSink = console,
  remoteImageOrigins = [],
}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch 不可用');
  const approvedRemoteOrigins = new Set(remoteImageOrigins);
  return Object.freeze({
    platformId,
    taskId,
    async fetch(input, init = {}) {
      const url = assertFixedUrl(platformId, input);
      return fetchImpl(url.href, {
        ...init,
        credentials: credentialPolicy(url),
        redirect: 'manual',
      });
    },
    async fetchInPage(input, init = {}) {
      const url = assertFixedUrl(platformId, input);
      if (typeof inTabFetch !== 'function') return null;
      return inTabFetch(url.href, init);
    },
    async listOpenPageUrls() {
      const patterns = TAB_QUERY_PATTERNS[platformId];
      if (!patterns || typeof tabsApi?.query !== 'function') return [];
      let tabs;
      try {
        tabs = await tabsApi.query({ url: [...patterns] });
      } catch (_error) {
        return [];
      }
      const urls = [];
      for (const tab of Array.isArray(tabs) ? tabs : []) {
        if (typeof tab?.url !== 'string') continue;
        try {
          const url = assertFixedUrl(platformId, tab.url).href;
          if (!urls.includes(url)) urls.push(url);
        } catch (_error) {
          // Browser tab metadata is advisory; ignore stale or unapproved URLs.
        }
      }
      return urls;
    },
    requestImage: (image) => image?.kind === 'remote-url'
      ? fetchRemoteImage(image, fetchImpl, approvedRemoteOrigins)
      : imageBroker.requestImage(image, { taskId, platformId }),
    withHeaderRules: (rules, work) => withSessionHeaderRules(declarativeNetRequest, rules, work),
    log(stage, fields = {}) {
      logSink?.info?.('[OpenGZH]', redactSecrets({ platformId, stage, ...fields }));
    },
  });
}
