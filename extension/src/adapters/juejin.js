import { applyImageMap } from '../core/adapter-contract.js';
import { signAws4 as defaultSignAws4 } from '../core/aws4.js';
import { crc32Hex } from '../core/crc32.js';
import { PlatformError, remoteStateError } from '../core/platform-errors.js';

const AID = '2608';
const SERVICE_ID = '73owjymdk6';
const RULES = [
  {
    id: 3001,
    priority: 1,
    action: { type: 'modifyHeaders', requestHeaders: [
      { header: 'Origin', operation: 'set', value: 'https://juejin.cn' },
      { header: 'Referer', operation: 'set', value: 'https://juejin.cn/' },
    ] },
    condition: { urlFilter: '*://api.juejin.cn/*', resourceTypes: ['xmlhttprequest'] },
  },
  {
    id: 3002,
    priority: 1,
    action: { type: 'modifyHeaders', requestHeaders: [
      { header: 'Origin', operation: 'set', value: 'https://juejin.cn' },
      { header: 'Referer', operation: 'set', value: 'https://juejin.cn/' },
    ] },
    condition: { urlFilter: '*://imagex.bytedanceapi.com/*', resourceTypes: ['xmlhttprequest'] },
  },
];

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u;
const SAFE_TOKEN = /^[^\u0000-\u001f\u007f]{1,4096}$/u;
const STORE_URI = /^[A-Za-z0-9][A-Za-z0-9._~!$&'()*+,;=:@/-]{0,1023}$/u;
const SAFE_TEXT = /^[^\u0000-\u001f\u007f<>]{1,128}$/u;
const CURRENT_TOS_HOST = 'tos-d-x-lf.douyin.com';

function platformChanged(message, details = {}) {
  return new PlatformError('PLATFORM_CHANGED', message, { retryable: false, ...details });
}

function authRequired() {
  return new PlatformError('AUTH_REQUIRED', '掘金登录已失效', { retryable: true });
}

function networkError(message = '掘金网络请求失败', details = {}) {
  return new PlatformError('NETWORK_ERROR', message, { retryable: true, ...details });
}

function imageUploadError(message = '掘金图片上传失败', details = {}) {
  return new PlatformError('IMAGE_UPLOAD_FAILED', message, { retryable: true, ...details });
}

function causeOf(error) {
  return String(error?.message ?? error).replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, 60) || '网络异常';
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
  return response?.type === 'opaqueredirect' || response?.status === 0 || (response?.status >= 300 && response?.status < 400);
}

function isOk(response) {
  return typeof response?.ok === 'boolean' ? response.ok : response?.status >= 200 && response?.status < 300;
}

async function readText(response) {
  if (typeof response?.text !== 'function') throw new TypeError('响应不可读取');
  return response.text();
}

async function parseJson(response) {
  let text;
  try {
    text = await readText(response);
  } catch (_error) {
    throw platformChanged('掘金响应读取失败', { httpStatus: responseStatus(response) });
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (_error) {
    throw platformChanged('掘金响应格式已变化', { httpStatus: responseStatus(response) });
  }
  if (!isRecord(data)) throw platformChanged('掘金响应格式已变化', { httpStatus: responseStatus(response) });
  return data;
}

function safeId(value) {
  const normalized = typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? String(value) : value;
  return typeof normalized === 'string' && normalized !== '0' && SAFE_ID.test(normalized) ? normalized : null;
}

function safeToken(value) {
  return typeof value === 'string' && SAFE_TOKEN.test(value) ? value : null;
}

function isObservedLoggedOutResponse(data) {
  if (!isRecord(data)) return false;
  const keys = Object.keys(data);
  return keys.length === 3
    && keys.every((key) => ['err_no', 'err_msg', 'data'].includes(key))
    && data.err_no === 2
    && data.err_msg === '参数错误'
    && data.data === null;
}

function safeStoreUri(value) {
  if (typeof value !== 'string' || !STORE_URI.test(value) || value.includes('\\') || value.includes('?') || value.includes('#') || value.includes('%')) return null;
  if (value.startsWith('/') || value.includes('//') || value.split('/').some((part) => part === '.' || part === '..')) return null;
  return value;
}

function safeUploadUrl(host, storeUri) {
  if (typeof host !== 'string' || !/^[a-z0-9.-]+$/iu.test(host)) throw platformChanged('ImageX 返回了未批准上传主机');
  let url;
  try {
    url = new URL(`https://${host}/`);
  } catch (_error) {
    throw platformChanged('ImageX 返回了未批准上传主机');
  }
  const approvedHost = url.hostname === CURRENT_TOS_HOST
    || (url.hostname !== 'volces.com' && url.hostname.endsWith('.volces.com'));
  if (url.protocol !== 'https:' || !approvedHost || url.port || url.username || url.password) {
    throw platformChanged('ImageX 返回了未批准上传主机');
  }
  return `https://${url.hostname}/${storeUri}`;
}

function safeCdnUrl(value) {
  if (typeof value !== 'string' || !value || /[\u0000-\u001f\u007f]/u.test(value)) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const approved = host === 'byteimg.com' || host.endsWith('.byteimg.com') || host === 'juejin.cn' || host.endsWith('.juejin.cn');
    const authority = value.slice(value.indexOf('//') + 2).split(/[/?#]/u, 1)[0];
    const explicitPort = authority.slice(authority.lastIndexOf('@') + 1).includes(':');
    if (url.protocol !== 'https:' || !approved || explicitPort || url.username || url.password || url.search || url.hash || !url.pathname || url.pathname === '/') return null;
    if (url.pathname.split('/').some((part) => part === '.' || part === '..')) return null;
    return url.href;
  } catch (_error) {
    return null;
  }
}

function headerRecord(value) {
  if (!isRecord(value)) throw platformChanged('ImageX 签名响应格式已变化');
  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof key !== 'string' || typeof entry !== 'string' || /[\u0000-\u001f\u007f]/u.test(entry)) throw platformChanged('ImageX 签名响应格式已变化');
    output[key] = entry;
  }
  if (!output.authorization || !output['x-amz-date']) throw platformChanged('ImageX 签名响应格式已变化');
  return output;
}

async function signedFetch(runtime, signAws4, token, method, url) {
  let signed;
  try {
    signed = await signAws4({ method, url, ...token, region: 'cn-north-1', service: 'imagex' });
  } catch (_error) {
    throw imageUploadError('ImageX 请求签名失败');
  }
  const headers = headerRecord(signed?.headers);
  try {
    return await runtime.fetch(url, { method, headers });
  } catch (_error) {
    throw imageUploadError('ImageX 请求网络异常');
  }
}

function ensurePlatformResponse(response, { upload = false, authRedirect = false, authApi = true } = {}) {
  const status = responseStatus(response);
  if ([401, 403].includes(status)) {
    if (authApi || !upload) throw authRequired();
    throw imageUploadError('掘金 ImageX 请求未获授权', { httpStatus: status });
  }
  if (isRedirect(response)) {
    if (authRedirect) throw authRequired();
    throw platformChanged('掘金平台请求发生跳转', { httpStatus: status });
  }
  if (status === 429) throw new PlatformError('RATE_LIMITED', '掘金平台请求过于频繁', { httpStatus: status, retryable: true });
  if (!isOk(response)) {
    if (status >= 500) throw upload ? imageUploadError(`掘金 ImageX 请求失败: ${status}`, { httpStatus: status }) : networkError('掘金平台服务异常', { httpStatus: status });
    throw upload ? imageUploadError(`掘金 ImageX 请求失败: ${status}`, { httpStatus: status }) : platformChanged('掘金平台响应状态已变化', { httpStatus: status });
  }
}

export function createJuejinAdapter({
  signAws4 = defaultSignAws4,
  uuid = globalThis.crypto?.randomUUID?.()?.replaceAll('-', '') || `opengzh-${Date.now()}`,
  now = () => new Date(),
} = {}) {
  if (typeof uuid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/u.test(uuid)) throw new TypeError('掘金 UUID 无效');

  async function getCsrfToken(runtime) {
    let response;
    try {
      response = await runtime.fetch('https://api.juejin.cn/user_api/v1/sys/token', {
        method: 'HEAD',
        headers: { 'x-secsdk-csrf-request': '1', 'x-secsdk-csrf-version': '1.2.10' },
      });
    } catch (_error) {
      throw networkError('掘金 CSRF 网络异常');
    }
    ensurePlatformResponse(response, { authRedirect: true });
    const value = response.headers?.get?.('x-ware-csrf-token');
    const parts = typeof value === 'string' ? value.split(',') : [];
    const token = safeToken(parts[1] || '');
    const sessionToken = safeToken(parts[4] || '');
    if (parts.length !== 5 || parts[0] !== '0' || !token || !/^[A-Za-z0-9._-]{1,256}$/u.test(token)
      || !/^[1-9]\d{0,15}$/u.test(parts[2] || '') || parts[3] !== 'success'
      || !sessionToken || !/^[A-Za-z0-9._-]{1,256}$/u.test(sessionToken)) {
      throw platformChanged('掘金 CSRF 响应格式已变化');
    }
    return token;
  }

  async function getImageToken(runtime) {
    const url = `https://api.juejin.cn/imagex/v2/gen_token?aid=${AID}&uuid=${encodeURIComponent(uuid)}&client=web`;
    let response;
    try {
      response = await runtime.fetch(url);
    } catch (_error) {
      throw networkError('掘金 ImageX 凭证网络异常');
    }
    ensurePlatformResponse(response, { upload: true, authRedirect: true });
    const data = await parseJson(response);
    if (!Number.isInteger(data.err_no)) throw platformChanged('掘金 ImageX 凭证响应格式已变化');
    if (data.err_no !== 0) {
      if (data.err_no === 403) throw authRequired();
      if (data.err_no === 429) throw new PlatformError('RATE_LIMITED', '掘金 ImageX 请求过于频繁', { retryable: true });
      throw imageUploadError('掘金 ImageX 凭证获取失败');
    }
    const token = data.data?.token;
    if (!isRecord(token) || Reflect.ownKeys(token).length !== 5 || !['AccessKeyId', 'SecretAccessKey', 'SessionToken', 'ExpiredTime', 'CurrentTime'].every((key) => Object.hasOwn(token, key))) {
      throw platformChanged('掘金 ImageX 凭证结构已变化');
    }
    for (const key of ['AccessKeyId', 'SecretAccessKey', 'SessionToken', 'ExpiredTime', 'CurrentTime']) {
      if (!safeToken(token[key])) throw platformChanged('掘金 ImageX 凭证结构已变化');
    }
    const expiresAt = Date.parse(token.ExpiredTime);
    const issuedAt = Date.parse(token.CurrentTime);
    const current = now().getTime();
    if (!Number.isFinite(expiresAt) || !Number.isFinite(issuedAt) || expiresAt <= issuedAt || expiresAt <= current) throw platformChanged('掘金 ImageX 凭证时间已失效');
    return {
      accessKeyId: token.AccessKeyId,
      secretAccessKey: token.SecretAccessKey,
      securityToken: token.SessionToken,
    };
  }

  async function uploadImage(runtime, blob) {
    if (typeof Blob === 'undefined' || !(blob instanceof Blob)) throw new PlatformError('IMAGE_UPLOAD_FAILED', '掘金图片必须是 Blob', { retryable: false });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return runtime.withHeaderRules(RULES, async () => {
      const token = await getImageToken(runtime);
      const applyUrl = `https://imagex.bytedanceapi.com/?Action=ApplyImageUpload&Version=2018-08-01&ServiceId=${SERVICE_ID}`;
      const applyResponse = await signedFetch(runtime, signAws4, token, 'GET', applyUrl);
      ensurePlatformResponse(applyResponse, { upload: true, authApi: false });
      const apply = await parseJson(applyResponse);
      const address = apply.Result?.UploadAddress;
      if (!isRecord(address) || !Array.isArray(address.StoreInfos) || !address.StoreInfos.length || !Array.isArray(address.UploadHosts) || !address.UploadHosts.length) throw platformChanged('掘金 ApplyImageUpload 响应结构已变化');
      const store = address.StoreInfos[0];
      const storeUri = safeStoreUri(store?.StoreUri);
      const uploadAuth = safeToken(store?.Auth || '');
      const uploadId = safeId(store?.UploadID);
      const sessionKey = safeToken(address.SessionKey || '');
      if (!isRecord(store) || !storeUri || !uploadAuth || !uploadId || !sessionKey) throw platformChanged('掘金 ApplyImageUpload 响应结构已变化');
      const uploadUrl = safeUploadUrl(address.UploadHosts[0], storeUri);
      let uploadResponse;
      try {
        uploadResponse = await runtime.fetch(uploadUrl, {
          method: 'PUT', credentials: 'omit', body: blob,
          headers: { Authorization: uploadAuth, 'Content-Type': blob.type || 'application/octet-stream', 'Content-CRC32': crc32Hex(bytes) },
        });
      } catch (_error) {
        throw imageUploadError('掘金 TOS 上传网络异常');
      }
      ensurePlatformResponse(uploadResponse, { upload: true, authApi: false });
      const commitUrl = `https://imagex.bytedanceapi.com/?Action=CommitImageUpload&Version=2018-08-01&SessionKey=${encodeURIComponent(sessionKey)}&ServiceId=${SERVICE_ID}`;
      const commitResponse = await signedFetch(runtime, signAws4, token, 'POST', commitUrl);
      ensurePlatformResponse(commitResponse, { upload: true, authApi: false });
      const commit = await parseJson(commitResponse);
      const committed = commit.Result?.Results;
      if (!Array.isArray(committed) || !committed.some((entry) => isRecord(entry) && entry.Uri === storeUri && entry.UriStatus === 2000)) throw platformChanged('掘金 CommitImageUpload 响应结构已变化');
      const imageUrl = `https://api.juejin.cn/imagex/v2/get_img_url?aid=${AID}&uuid=${encodeURIComponent(uuid)}&uri=${encodeURIComponent(storeUri)}&img_type=private`;
      let urlResponse;
      try {
        urlResponse = await runtime.fetch(imageUrl);
      } catch (_error) {
        throw imageUploadError('掘金图片地址网络异常');
      }
      ensurePlatformResponse(urlResponse, { upload: true, authRedirect: true });
      const urlData = await parseJson(urlResponse);
      if (!Number.isInteger(urlData.err_no)) throw platformChanged('掘金图片地址响应结构已变化');
      if (urlData.err_no !== 0) {
        if (urlData.err_no === 403) throw authRequired();
        if (urlData.err_no === 429) throw new PlatformError('RATE_LIMITED', '掘金图片地址请求过于频繁', { retryable: true });
        throw imageUploadError('掘金图片地址获取失败');
      }
      const resolvedUrl = safeCdnUrl(urlData.data?.main_url) || safeCdnUrl(urlData.data?.backup_url);
      if (!resolvedUrl) throw platformChanged('掘金图片地址响应结构已变化');
      return resolvedUrl;
    });
  }

  async function saveDraft(runtime, article, imageMap) {
    if (!article || typeof article !== 'object' || typeof article.title !== 'string' || typeof article.portableMarkdown !== 'string') throw new PlatformError('ARTICLE_INVALID', '掘金文章数据格式无效', { retryable: false });
    let createdDraftId = '';
    try {
      return await runtime.withHeaderRules(RULES, async () => {
        const csrf = await getCsrfToken(runtime);
        let response;
        try {
          response = await runtime.fetch('https://api.juejin.cn/content_api/v1/article_draft/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-secsdk-csrf-token': csrf },
            body: JSON.stringify({
              brief_content: '', category_id: '0', cover_image: '', edit_type: 10, html_content: 'deprecated', link_url: '',
              mark_content: applyImageMap(article.portableMarkdown, imageMap, { markdown: true }), tag_ids: [], title: article.title,
            }),
          });
        } catch (_error) {
          throw remoteStateError(_error, `无法确认掘金是否已创建草稿（${causeOf(_error)}）`);
        }
        const status = responseStatus(response);
        if ([401, 403].includes(status) || isRedirect(response)) throw authRequired();
        if (status === 429) throw new PlatformError('RATE_LIMITED', '掘金草稿请求过于频繁', { httpStatus: status, retryable: true });
        let data;
        try {
          data = await parseJson(response);
        } catch (error) {
          if (status >= 500 || isOk(response)) throw new PlatformError('UNKNOWN_REMOTE_STATE', `无法确认掘金是否已创建草稿（HTTP ${status}）`, { httpStatus: status, retryable: false });
          throw error;
        }
        const responseDraftId = safeId(data.data?.id);
        if (responseDraftId) createdDraftId = responseDraftId;
        if (!isOk(response)) {
          if (status >= 500) throw new PlatformError('UNKNOWN_REMOTE_STATE', `无法确认掘金是否已创建草稿（HTTP ${status}）`, { httpStatus: status, ...(createdDraftId ? { draftId: createdDraftId } : {}), retryable: false });
          throw new PlatformError('DRAFT_CREATE_FAILED', '掘金草稿创建失败', { httpStatus: status, ...(createdDraftId ? { draftId: createdDraftId } : {}), retryable: false });
        }
        if (!Number.isInteger(data.err_no)) throw platformChanged('掘金草稿响应格式已变化', { httpStatus: status });
        if (data.err_no !== 0) {
          if (createdDraftId) throw new PlatformError('UNKNOWN_REMOTE_STATE', '无法确认掘金业务响应中的草稿状态', { httpStatus: status, draftId: createdDraftId, retryable: false });
          if (data.err_no === 403) throw authRequired();
          if (data.err_no === 429) throw new PlatformError('RATE_LIMITED', '掘金草稿请求过于频繁', { retryable: true });
          throw new PlatformError('DRAFT_CREATE_FAILED', '掘金草稿创建失败', { retryable: true });
        }
        createdDraftId = safeId(data.data?.id) || '';
        if (!createdDraftId) throw platformChanged('掘金草稿响应缺少安全 id', { httpStatus: status });
        return { draftId: createdDraftId, draftUrl: `https://juejin.cn/editor/drafts/${encodeURIComponent(createdDraftId)}` };
      });
    } catch (error) {
      if (createdDraftId && !(error instanceof PlatformError)) {
        throw new PlatformError('UNKNOWN_REMOTE_STATE', '掘金草稿请求已返回但请求头清理失败，请人工检查草稿箱', { draftId: createdDraftId, retryable: false });
      }
      throw error;
    }
  }

  return {
    id: 'juejin', name: '掘金', loginUrl: 'https://juejin.cn/login', getCsrfToken, uploadImage, saveDraft,
    async checkAuth(runtime) {
      let response;
      try {
        response = await runtime.fetch('https://api.juejin.cn/user_api/v1/user/get', { method: 'GET' });
      } catch (_error) {
        throw networkError('掘金登录检测网络异常');
      }
      const status = responseStatus(response);
      if ([401, 403].includes(status) || isRedirect(response)) {
        return { authenticated: false };
      }
      if (status === 429) throw new PlatformError('RATE_LIMITED', '掘金登录检测请求过于频繁', { httpStatus: status, retryable: true });
      if (!isOk(response)) {
        if (status >= 500) throw networkError('掘金登录检测网络异常', { httpStatus: status });
        throw platformChanged('掘金登录检测响应状态已变化', { httpStatus: status });
      }
      let data;
      try {
        data = await parseJson(response);
      } catch (_error) {
        throw platformChanged('掘金登录检测响应格式已变化', { httpStatus: status });
      }
      if (isObservedLoggedOutResponse(data)) return { authenticated: false };
      const user = data.data;
      if (!isRecord(user) || !safeId(user.user_id) || typeof user.user_name !== 'string' || !SAFE_TEXT.test(user.user_name.trim())) throw platformChanged('掘金登录检测响应格式已变化', { httpStatus: status });
      return { authenticated: true, userId: safeId(user.user_id), username: user.user_name };
    },
  };
}
