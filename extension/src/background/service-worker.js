import { createDistributionRunner } from './distribution-runner.js';
import { PLATFORM_IDS, assertAdapter } from '../core/adapter-contract.js';
import { validateArticle } from '../core/article-validator.js';
import { createPortImageBroker, createRequestRuntime, createInTabFetcher } from '../core/request-runtime.js';
import { PlatformError, serializeError } from '../core/platform-errors.js';
import { createWeixinAdapter } from '../adapters/weixin.js';
import { createZhihuAdapter } from '../adapters/zhihu.js';
import { createJuejinAdapter } from '../adapters/juejin.js';
import { createWoshipmAdapter } from '../adapters/woshipm.js';

const PORT_NAME = 'opengzh-distribution-v1';
export const ADAPTER_FACTORIES = Object.freeze({
  weixin: createWeixinAdapter,
  zhihu: createZhihuAdapter,
  juejin: createJuejinAdapter,
  woshipm: createWoshipmAdapter,
});
const DRAFT_HOSTS = Object.freeze({
  weixin: 'mp.weixin.qq.com',
  zhihu: 'zhuanlan.zhihu.com',
  juejin: 'juejin.cn',
  woshipm: 'www.woshipm.com',
});
const SAFE_DRAFT_QUERY_KEYS = Object.freeze({
  weixin: new Set(['t', 'action', 'type', 'appmsgid', 'lang']),
  woshipm: new Set(['pid']),
});
const PLATFORM_ORIGINS = Object.freeze({
  weixin: Object.freeze(['https://mp.weixin.qq.com/*']),
  zhihu: Object.freeze([
    'https://www.zhihu.com/*', 'https://zhuanlan.zhihu.com/*', 'https://api.zhihu.com/*',
    'https://zhihu-pics-upload.zhimg.com/*',
  ]),
  juejin: Object.freeze([
    'https://juejin.cn/*', 'https://api.juejin.cn/*', 'https://imagex.bytedanceapi.com/*',
    'https://tos-d-x-lf.douyin.com/*', 'https://*.volces.com/*',
  ]),
  woshipm: Object.freeze(['https://www.woshipm.com/*']),
});

function getPlatformAdapter(platformId, adapterFactories) {
  if (typeof adapterFactories[platformId] !== 'function') throw new PlatformError('PLATFORM_CHANGED', '平台适配器未注册', { retryable: false });
  let adapter;
  try {
    adapter = assertAdapter(adapterFactories[platformId]());
  } catch (error) {
    if (error instanceof TypeError) throw new PlatformError('PLATFORM_CHANGED', error.message, { retryable: false });
    throw error;
  }
  if (adapter.id !== platformId) throw new PlatformError('PLATFORM_CHANGED', '平台适配器标识与注册键不一致', { retryable: false });
  return adapter;
}

function nonEmpty(value) {
  return typeof value === 'string' && Boolean(value.trim());
}

function invalid(message) {
  return new PlatformError('ARTICLE_INVALID', message, { retryable: false });
}

function safeDraftUrl(platformId, value) {
  if (!nonEmpty(value) || !DRAFT_HOSTS[platformId]) return null;
  let url;
  try {
    url = new URL(value);
  } catch (_error) {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== DRAFT_HOSTS[platformId] || url.port || url.username || url.password) return null;
  const safeKeys = SAFE_DRAFT_QUERY_KEYS[platformId] || new Set();
  const safeQuery = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (safeKeys.has(key)) safeQuery.append(key, value);
  }
  url.search = safeQuery.toString();
  url.hash = '';
  return url.href;
}

function sanitizePlatformState(message) {
  if (message?.type !== 'PLATFORM_STATE' || !Object.hasOwn(message, 'draftUrl')) return message;
  const sanitized = { ...message };
  const draftUrl = safeDraftUrl(message.platformId, message.draftUrl);
  if (draftUrl) sanitized.draftUrl = draftUrl;
  else delete sanitized.draftUrl;
  return sanitized;
}

export function isAllowedSender(sender) {
  if (sender?.frameId !== 0 || typeof sender?.url !== 'string') return false;
  try {
    const url = new URL(sender.url);
    return (url.protocol === 'https:' && url.hostname === 'opengzh.pasca.fun' && !url.port && !url.username && !url.password)
      || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
  } catch (_error) {
    return false;
  }
}

export async function assertHostPermissions(platformIds, permissionsApi = globalThis.chrome?.permissions) {
  if (!Array.isArray(platformIds) || !platformIds.length || platformIds.length !== new Set(platformIds).size) throw invalid('平台选择无效');
  const ordered = PLATFORM_IDS.filter((platformId) => platformIds.includes(platformId));
  if (ordered.length !== platformIds.length) throw invalid('平台选择无效');
  const origins = ordered.flatMap((platformId) => PLATFORM_ORIGINS[platformId]);
  if (!permissionsApi?.contains || !await permissionsApi.contains({ origins })) {
    throw new PlatformError('PERMISSION_DENIED', '平台站点访问权限不可用，请在 Chrome 扩展详情中恢复后重试', { retryable: true });
  }
  return true;
}

export function sanitizeBatchForSession(batch) {
  const results = Array.isArray(batch?.results) ? batch.results : [];
  return {
    taskId: String(batch?.taskId || ''),
    results: results.map((result) => {
      const output = { platformId: result.platformId, state: result.state };
      if (result.draftId) output.draftId = String(result.draftId);
      const draftUrl = safeDraftUrl(result.platformId, result.draftUrl);
      if (draftUrl) output.draftUrl = draftUrl;
      if (result.error) output.error = serializeError(result.error);
      return output;
    }),
  };
}

export async function openSuccessfulDrafts(tabs, batch) {
  const urls = [];
  for (const result of batch?.results || []) {
    if (result?.state !== 'success' || !result.draftUrl) continue;
    const url = safeDraftUrl(result.platformId, result.draftUrl);
    if (!url) throw new PlatformError('PLATFORM_CHANGED', '草稿编辑地址不在批准域名', { retryable: false });
    urls.push(url);
  }
  const created = [];
  for (const url of urls) created.push(await tabs.create({ url, active: false }));
  if (created[0]?.id != null) await tabs.update(created[0].id, { active: true });
  return created;
}

function messageCorrelation(message) {
  return {
    taskId: message?.taskId,
    operationId: message?.operationId,
  };
}

export function registerServiceWorker(chromeApi = globalThis.chrome, adapterFactories = ADAPTER_FACTORIES) {
  if (!chromeApi?.runtime?.onConnect?.addListener) return null;
  chromeApi.runtime.onConnect.addListener((port) => {
    if (port.name !== PORT_NAME || !isAllowedSender(port.sender)) {
      port.disconnect?.();
      return;
    }

    let disposed = false;
    let runningType = '';
    let batchReserved = false;
    const retryReservations = new Set();
    let queue = Promise.resolve();
    const taskContexts = new Map();
    const latestResults = new Map();
    const imageBroker = createPortImageBroker(port);
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      imageBroker.dispose();
      taskContexts.clear();
      latestResults.clear();
      retryReservations.clear();
    };
    const send = (message) => {
      if (disposed) return false;
      try {
        port.postMessage(message);
        return true;
      } catch (_error) {
        dispose();
        return false;
      }
    };
    const persist = async (batch) => {
      if (disposed) return;
      const existing = latestResults.get(batch.taskId) || [];
      const merged = new Map(existing.map((result) => [result.platformId, result]));
      for (const result of batch.results || []) merged.set(result.platformId, result);
      const normalized = { taskId: batch.taskId, results: [...merged.values()] };
      latestResults.set(batch.taskId, normalized.results);
      try {
        await chromeApi.storage?.session?.set?.({ [`opengzh.task.${batch.taskId}`]: sanitizeBatchForSession(normalized) });
      } catch (_error) {
        // Session persistence is a convenience cache; the in-memory result remains authoritative for this port.
      }
    };
    const runner = createDistributionRunner({
      adapterFactories,
      runtimeFactory: (platformId, taskId) => {
        if (disposed) throw new PlatformError('NETWORK_ERROR', '页面连接已断开', { retryable: true });
        return createRequestRuntime({
          platformId,
          taskId,
          imageBroker,
          inTabFetch: createInTabFetcher({ scriptingApi: chromeApi?.scripting, tabsApi: chromeApi?.tabs }),
        });
      },
      onState: (message) => send(sanitizePlatformState(message)),
      persist,
    });

    const fail = (message, error) => {
      const safe = serializeError(error);
      const correlation = message?.type === 'CHECK_AUTH'
        ? { requestId: message?.requestId }
        : messageCorrelation(message);
      send({ type: 'FATAL_ERROR', ...correlation, code: safe.code, message: safe.message });
    };
    const enqueue = (message, work) => {
      if (disposed) return Promise.resolve();
      if (message.type === 'START_BATCH' && batchReserved) {
        fail(message, invalid('当前批次仍在执行，请等待批次完成'));
        return Promise.resolve();
      }
      if (message.type === 'RETRY_PLATFORM' && (batchReserved || runningType === 'START_BATCH')) {
        fail(message, invalid('当前批次仍在执行，请等待批次完成'));
        return Promise.resolve();
      }
      const retryKey = message.type === 'RETRY_PLATFORM' && nonEmpty(message.taskId) && nonEmpty(message.platformId)
        ? `${message.taskId}\u0000${message.platformId}`
        : null;
      if (retryKey && retryReservations.has(retryKey)) {
        fail(message, invalid('该平台已有重试任务在执行，请等待完成'));
        return Promise.resolve();
      }
      if (retryKey) retryReservations.add(retryKey);
      if (message.type === 'START_BATCH') batchReserved = true;
      queue = queue.then(async () => {
        if (disposed) return;
        runningType = message.type;
        try {
          await work();
        } catch (error) {
          fail(message, error);
        } finally {
          runningType = '';
          if (message.type === 'START_BATCH') batchReserved = false;
          if (retryKey) retryReservations.delete(retryKey);
        }
      });
      return queue;
    };

    const onMessage = (message) => {
      if (disposed || !message || typeof message.type !== 'string') return;
      if (message.type === 'PING') {
        if (nonEmpty(message.requestId)) send({ type: 'PONG', requestId: message.requestId });
        return;
      }
      if (message.type === 'CHECK_AUTH') {
        return enqueue(message, async () => {
          if (!nonEmpty(message.requestId)) throw invalid('鉴权请求 ID 无效');
          await assertHostPermissions(message.platformIds, chromeApi.permissions);
          for (const platformId of message.platformIds) {
            try {
              const adapter = getPlatformAdapter(platformId, adapterFactories);
              const runtime = createRequestRuntime({
                platformId,
                taskId: `auth:${message.requestId}`,
                imageBroker,
                inTabFetch: createInTabFetcher({ scriptingApi: chromeApi?.scripting, tabsApi: chromeApi?.tabs }),
              });
              const auth = await adapter.checkAuth(runtime);
              if (typeof auth?.authenticated !== 'boolean') throw new PlatformError('PLATFORM_CHANGED', '鉴权响应格式无效', { retryable: false });
              send({ type: 'AUTH_RESULT', requestId: message.requestId, platformId, authenticated: auth.authenticated });
            } catch (error) {
              const safe = serializeError(error);
              if (safe.code === 'AUTH_REQUIRED') {
                send({ type: 'AUTH_RESULT', requestId: message.requestId, platformId, authenticated: false });
              } else {
                send({ type: 'AUTH_RESULT', requestId: message.requestId, platformId, error: safe });
              }
            }
          }
        });
      }
      if (message.type === 'START_BATCH') {
        return enqueue(message, async () => {
          if (!nonEmpty(message.taskId) || !nonEmpty(message.operationId)) throw invalid('任务关联信息无效');
          await assertHostPermissions(message.platformIds, chromeApi.permissions);
          const article = validateArticle(message.article);
          const batch = await runner.runBatch({ taskId: message.taskId, operationId: message.operationId, article, platformIds: message.platformIds });
          if (disposed) return;
          taskContexts.set(message.taskId, { article, platformIds: [...message.platformIds] });
          await openSuccessfulDrafts(chromeApi.tabs, batch);
          send({ type: 'BATCH_COMPLETE', taskId: message.taskId, operationId: message.operationId, results: sanitizeBatchForSession(batch).results });
        });
      }
      if (message.type === 'RETRY_PLATFORM') {
        return enqueue(message, async () => {
          if (!nonEmpty(message.taskId) || !nonEmpty(message.operationId) || !nonEmpty(message.platformId)) throw invalid('任务关联信息无效');
          const context = taskContexts.get(message.taskId);
          if (!context) throw invalid('任务上下文已失效，请重新发起同步');
          if (!context.platformIds.includes(message.platformId)) throw invalid('平台未包含在原任务选择中');
          await assertHostPermissions([message.platformId], chromeApi.permissions);
          const previous = latestResults.get(message.taskId)?.find((result) => result.platformId === message.platformId) || { state: 'idle' };
          const result = await runner.retryPlatform({ taskId: message.taskId, operationId: message.operationId, article: context.article, platformId: message.platformId, previous });
          if (disposed) return;
          if (result.state === 'success') await openSuccessfulDrafts(chromeApi.tabs, { results: [result] });
          send({ type: 'BATCH_COMPLETE', taskId: message.taskId, operationId: message.operationId, results: sanitizeBatchForSession({ taskId: message.taskId, results: [result] }).results });
        });
      }
      return undefined;
    };
    port.onMessage?.addListener?.(onMessage);
    port.onDisconnect?.addListener?.(dispose);
  });
  return true;
}

if (globalThis.chrome?.runtime?.onConnect) registerServiceWorker(globalThis.chrome, ADAPTER_FACTORIES);
