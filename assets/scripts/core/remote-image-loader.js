/**
 * 远程图片加载器 — 直连失败时自动回退到多个公开 CORS 代理，
 * 让 Markdown 中的 CDN 图片也能在复制到公众号时转为 Base64 内嵌。
 * @module remote-image-loader
 */

const DEFAULT_TIMEOUT_MS = 8000;

/**
 * 判断图片路径是否为远程 URL（http/https 或协议相对地址）。
 * @param {string} path
 * @returns {boolean}
 */
export function isRemoteImagePath(path) {
  const value = String(path || '').trim().toLowerCase();
  return value.startsWith('http://') || value.startsWith('https://') || value.startsWith('//');
}

/**
 * 公开 CORS 代理构造器列表，按顺序作为直连失败时的回退方案。
 * 每个代理都返回原始图片字节（weserv 可能重编码，仅作最后手段）。
 * @type {((url: string) => string)[]}
 */
export const REMOTE_IMAGE_PROXY_BUILDERS = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://images.weserv.nl/?url=${encodeURIComponent(url)}`,
];

function toAbsoluteUrl(url) {
  if (url.startsWith('//')) return `${globalThis.location?.protocol || 'https:'}${url}`;
  return url;
}

/**
 * 带超时的 fetch。
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<Blob>}
 */
async function fetchBlobWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      mode: 'cors',
      cache: 'default',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.blob();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 加载远程图片 Blob：先直连，失败后再并行尝试多个 CORS 代理，
 * 任一成功即返回，全部失败则抛出带原因的 Error。
 * @param {string} url - http(s) 或协议相对地址
 * @param {Object} [options]
 * @param {number} [options.timeoutMs=8000] - 代理尝试的超时（毫秒）
 * @param {number} [options.directTimeoutMs=4000] - 直连尝试的超时（毫秒）
 * @returns {Promise<Blob>}
 */
export async function fetchRemoteImageBlob(url, {
  timeoutMs = DEFAULT_TIMEOUT_MS,
  directTimeoutMs = 4000,
} = {}) {
  const absoluteUrl = toAbsoluteUrl(url);

  try {
    return await fetchBlobWithTimeout(absoluteUrl, directTimeoutMs);
  } catch (directError) {
    if (!/^https?:\/\//i.test(absoluteUrl)) throw directError;

    const attempts = REMOTE_IMAGE_PROXY_BUILDERS.map(
      (build) => fetchBlobWithTimeout(build(absoluteUrl), timeoutMs)
    );

    try {
      return await Promise.any(attempts);
    } catch (aggregateError) {
      const reasons = Array.isArray(aggregateError?.errors)
        ? aggregateError.errors.map((error) => error?.message || String(error)).join('；')
        : directError?.message || '未知错误';
      throw new Error(`远程图片加载失败（直连与代理均失败）：${reasons}`);
    }
  }
}
