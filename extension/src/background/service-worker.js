import { createDistributionRunner } from './distribution-runner.js';
import { PLATFORM_IDS } from '../core/adapter-contract.js';
import { createAdapterRegistry } from '../core/adapter-registry.js';
import { validateArticle } from '../core/article-validator.js';
import { createPortImageBroker, createRequestRuntime, createInTabFetcher } from '../core/request-runtime.js';
import { PlatformError, serializeError } from '../core/platform-errors.js';
import { createTaskStore } from '../core/task-store.js';
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

function nonEmpty(value) {
  return typeof value === 'string' && Boolean(value.trim());
}

function invalid(message) {
  return new PlatformError('ARTICLE_INVALID', message, { retryable: false });
}

export function createAuthCoordinator({
  now = Date.now,
  positiveTtlMs = 5 * 60 * 1000,
  negativeTtlMs = 30 * 1000,
  concurrency = 2,
} = {}) {
  const cache = new Map();
  const pending = new Map();
  const limit = Math.max(1, Math.min(4, Number.isInteger(concurrency) ? concurrency : 2));

  async function checkOne(platformId, checker, force) {
    const current = cache.get(platformId);
    if (!force && current?.expiresAt > now()) return current.authenticated;
    if (pending.has(platformId)) return pending.get(platformId);
    const promise = Promise.resolve()
      .then(() => checker(platformId))
      .then((authenticated) => {
        if (typeof authenticated !== 'boolean') throw new PlatformError('PLATFORM_CHANGED', '鉴权响应格式无效', { retryable: false });
        cache.set(platformId, {
          authenticated,
          expiresAt: now() + (authenticated ? positiveTtlMs : negativeTtlMs),
        });
        return authenticated;
      })
      .finally(() => pending.delete(platformId));
    pending.set(platformId, promise);
    return promise;
  }

  return Object.freeze({
    async checkMany(platformIds, checker, { force = false } = {}) {
      const results = Array(platformIds.length);
      let cursor = 0;
      const worker = async () => {
        while (cursor < platformIds.length) {
          const index = cursor;
          cursor += 1;
          const platformId = platformIds[index];
          try {
            results[index] = { platformId, authenticated: await checkOne(platformId, checker, force) };
          } catch (error) {
            results[index] = { platformId, error };
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(limit, platformIds.length) }, worker));
      return results;
    },
    invalidate(platformId) {
      if (platformId) cache.delete(platformId);
      else cache.clear();
    },
  });
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

export function remoteImageOriginsForArticle(article) {
  const origins = new Set();
  for (const image of Array.isArray(article?.images) ? article.images : []) {
    if (image?.kind !== 'remote-url' || typeof image.url !== 'string') continue;
    try {
      origins.add(new URL(image.url).origin);
    } catch (_error) {
      throw invalid('远程图片地址无效');
    }
  }
  return [...origins].sort();
}

export async function ensureRemoteImagePermissions(article, permissionsApi = globalThis.chrome?.permissions) {
  const origins = remoteImageOriginsForArticle(article);
  if (!origins.length) return origins;
  const patterns = origins.map((origin) => `${origin}/*`);
  if (typeof permissionsApi?.contains !== 'function') {
    throw new PlatformError('PERMISSION_DENIED', '无法检查远程图片来源权限', { retryable: true });
  }
  if (await permissionsApi.contains({ origins: patterns })) return origins;
  if (typeof permissionsApi?.request !== 'function' || !await permissionsApi.request({ origins: patterns })) {
    throw new PlatformError('PERMISSION_DENIED', '需要授权读取文章中的远程图片来源', { retryable: true });
  }
  return origins;
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
      if (Number.isInteger(result.imageTotal) && result.imageTotal >= 0) output.imageTotal = result.imageTotal;
      if (Number.isInteger(output.imageTotal) && Number.isInteger(result.imageUploaded)
        && result.imageUploaded >= 0 && result.imageUploaded <= output.imageTotal) output.imageUploaded = result.imageUploaded;
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
  const adapterRegistry = createAdapterRegistry(adapterFactories);
  const authCoordinator = createAuthCoordinator();
  const taskStore = createTaskStore({
    sessionStorage: chromeApi.storage?.session,
    localStorage: chromeApi.storage?.local,
  });
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
    const taskRemoteOrigins = new Map();
    const imageBroker = createPortImageBroker(port);
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      imageBroker.dispose();
      taskContexts.clear();
      latestResults.clear();
      taskRemoteOrigins.clear();
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
      await taskStore.merge({ taskId: batch.taskId, results: sanitizeBatchForSession(normalized).results });
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
          remoteImageOrigins: taskRemoteOrigins.get(taskId) || [],
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
      if (message.type === 'RESTORE_TASK') {
        return enqueue(message, async () => {
          if (!nonEmpty(message.taskId)) throw invalid('任务关联信息无效');
          const record = await taskStore.load(message.taskId);
          if (!record) throw invalid('任务上下文已失效，请重新发起同步');
          send({
            type: 'TASK_RECOVERED', taskId: record.taskId,
            platformIds: record.platformIds, results: sanitizeBatchForSession(record).results,
          });
        });
      }
      if (message.type === 'CHECK_AUTH') {
        return enqueue(message, async () => {
          if (!nonEmpty(message.requestId)) throw invalid('鉴权请求 ID 无效');
          await assertHostPermissions(message.platformIds, chromeApi.permissions);
          const results = await authCoordinator.checkMany(message.platformIds, async (platformId) => {
            const adapter = adapterRegistry.create(platformId);
            const runtime = createRequestRuntime({
              platformId,
              taskId: `auth:${message.requestId}`,
              imageBroker,
              inTabFetch: createInTabFetcher({ scriptingApi: chromeApi?.scripting, tabsApi: chromeApi?.tabs }),
            });
            const auth = await adapter.checkAuth(runtime);
            if (typeof auth?.authenticated !== 'boolean') throw new PlatformError('PLATFORM_CHANGED', '鉴权响应格式无效', { retryable: false });
            return auth.authenticated;
          }, { force: message.force === true });
          for (const result of results) {
            if (!result.error) {
              send({ type: 'AUTH_RESULT', requestId: message.requestId, platformId: result.platformId, authenticated: result.authenticated });
            } else {
              const safe = serializeError(result.error);
              if (safe.code === 'AUTH_REQUIRED') {
                send({ type: 'AUTH_RESULT', requestId: message.requestId, platformId: result.platformId, authenticated: false });
              } else {
                send({ type: 'AUTH_RESULT', requestId: message.requestId, platformId: result.platformId, error: safe });
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
          if (message.allowDuplicate !== true) {
            const duplicatePlatforms = await taskStore.recentDuplicates({ documentId: article.documentId, platformIds: message.platformIds });
            if (duplicatePlatforms.length) {
              send({
                type: 'DUPLICATE_WARNING', taskId: message.taskId, operationId: message.operationId,
                platformIds: duplicatePlatforms, windowMs: 5 * 60 * 1000,
              });
              return;
            }
          }
          taskRemoteOrigins.set(message.taskId, await ensureRemoteImagePermissions(article, chromeApi.permissions));
          for (const platformId of message.platformIds) authCoordinator.invalidate(platformId);
          await taskStore.start({ taskId: message.taskId, article, platformIds: message.platformIds });
          taskContexts.set(message.taskId, { article, platformIds: [...message.platformIds] });
          const batch = await runner.runBatch({ taskId: message.taskId, operationId: message.operationId, article, platformIds: message.platformIds });
          if (disposed) return;
          await taskStore.complete(message.taskId);
          await openSuccessfulDrafts(chromeApi.tabs, batch);
          send({ type: 'BATCH_COMPLETE', taskId: message.taskId, operationId: message.operationId, results: sanitizeBatchForSession(batch).results });
        });
      }
      if (message.type === 'RETRY_PLATFORM') {
        return enqueue(message, async () => {
          if (!nonEmpty(message.taskId) || !nonEmpty(message.operationId) || !nonEmpty(message.platformId)) throw invalid('任务关联信息无效');
          const context = taskContexts.get(message.taskId);
          const article = validateArticle(message.article || context?.article);
          const recovered = await taskStore.assertRetry({ taskId: message.taskId, article, platformId: message.platformId });
          await assertHostPermissions([message.platformId], chromeApi.permissions);
          taskRemoteOrigins.set(message.taskId, await ensureRemoteImagePermissions(article, chromeApi.permissions));
          authCoordinator.invalidate(message.platformId);
          taskContexts.set(message.taskId, { article, platformIds: recovered.record.platformIds });
          const result = await runner.retryPlatform({ taskId: message.taskId, operationId: message.operationId, article, platformId: message.platformId, previous: recovered.previous });
          if (disposed) return;
          await taskStore.complete(message.taskId);
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
