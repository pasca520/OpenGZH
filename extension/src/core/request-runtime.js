import { dataUrlToBlob } from './data-url.js';
import { withSessionHeaderRules } from './header-rules.js';
import { PlatformError, redactSecrets } from './platform-errors.js';

const ALLOWED_HOSTS = Object.freeze({
  weixin: Object.freeze(['mp.weixin.qq.com']),
  zhihu: Object.freeze(['www.zhihu.com', 'zhuanlan.zhihu.com', 'api.zhihu.com', 'zhihu-pics-upload.zhimg.com']),
  juejin: Object.freeze(['juejin.cn', 'api.juejin.cn', 'imagex.bytedanceapi.com', 'tos-d-x-lf.douyin.com', '*.volces.com']),
  woshipm: Object.freeze(['www.woshipm.com']),
});

const CREDENTIALLESS_HOSTS = new Set(['imagex.bytedanceapi.com', 'tos-d-x-lf.douyin.com']);
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

export function createRequestRuntime({
  platformId,
  taskId,
  imageBroker,
  fetchImpl = globalThis.fetch,
  declarativeNetRequest = globalThis.chrome?.declarativeNetRequest,
  tabsApi = globalThis.chrome?.tabs,
  logSink = console,
}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch 不可用');
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
    requestImage: (image) => imageBroker.requestImage(image, { taskId, platformId }),
    withHeaderRules: (rules, work) => withSessionHeaderRules(declarativeNetRequest, rules, work),
    log(stage, fields = {}) {
      logSink?.info?.('[OpenGZH]', redactSecrets({ platformId, stage, ...fields }));
    },
  });
}
