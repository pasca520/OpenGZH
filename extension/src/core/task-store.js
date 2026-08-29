import { PLATFORM_IDS } from './adapter-contract.js';
import { PlatformError, serializeError } from './platform-errors.js';

const TASK_PREFIX = 'opengzh.task.';
const HISTORY_KEY = 'opengzh.syncHistory';
const HISTORY_LIMIT = 25;
const STATES = new Set(['idle', 'auth-required', 'failed', 'unknown', 'success']);

function invalid(message) {
  return new PlatformError('ARTICLE_INVALID', message, { retryable: false });
}

function canonicalArticle(article) {
  return {
    schemaVersion: article.schemaVersion,
    documentId: article.documentId,
    title: article.title,
    markdown: article.markdown,
    portableMarkdown: article.portableMarkdown,
    semanticHtml: article.semanticHtml,
    wechatHtml: article.wechatHtml,
    images: article.images.map((image) => Object.fromEntries(Object.keys(image).sort().map((key) => [key, image[key]]))),
    createdAt: article.createdAt,
  };
}

export async function fingerprintArticle(article, cryptoApi = globalThis.crypto) {
  if (typeof cryptoApi?.subtle?.digest !== 'function') throw invalid('无法生成文章摘要');
  const bytes = new TextEncoder().encode(JSON.stringify(canonicalArticle(article)));
  const digest = await cryptoApi.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeResult(result) {
  if (!result || !PLATFORM_IDS.includes(result.platformId) || !STATES.has(result.state)) return null;
  const output = { platformId: result.platformId, state: result.state };
  if (typeof result.draftId === 'string' && result.draftId) output.draftId = result.draftId;
  if (typeof result.draftUrl === 'string' && result.draftUrl) output.draftUrl = result.draftUrl;
  if (Number.isInteger(result.imageTotal) && result.imageTotal >= 0) output.imageTotal = result.imageTotal;
  if (Number.isInteger(output.imageTotal) && Number.isInteger(result.imageUploaded)
    && result.imageUploaded >= 0 && result.imageUploaded <= output.imageTotal) output.imageUploaded = result.imageUploaded;
  if (result.error) output.error = serializeError(result.error);
  return output;
}

function normalizeRecord(value) {
  if (!value || typeof value !== 'object' || typeof value.taskId !== 'string' || !value.taskId
    || typeof value.documentId !== 'string' || !value.documentId
    || !/^[a-f0-9]{64}$/.test(value.articleFingerprint || '')
    || !Array.isArray(value.platformIds) || !value.platformIds.length
    || value.platformIds.some((id) => !PLATFORM_IDS.includes(id))
    || value.platformIds.length !== new Set(value.platformIds).size
    || !Array.isArray(value.results) || !Number.isFinite(value.updatedAt)) return null;
  const results = value.results.map(normalizeResult);
  if (results.some((result) => !result) || results.some((result) => !value.platformIds.includes(result.platformId))) return null;
  return {
    taskId: value.taskId,
    documentId: value.documentId,
    articleFingerprint: value.articleFingerprint,
    platformIds: PLATFORM_IDS.filter((id) => value.platformIds.includes(id)),
    results,
    updatedAt: value.updatedAt,
  };
}

function normalizeHistoryEntry(value) {
  const record = normalizeRecord(value);
  return record && Number.isFinite(value?.completedAt) ? { ...record, completedAt: value.completedAt } : null;
}

async function storageValue(storage, key) {
  if (typeof storage?.get !== 'function') return undefined;
  const value = await storage.get(key);
  return value?.[key];
}

async function bestEffortSet(storage, value) {
  try {
    await storage?.set?.(value);
  } catch (_error) {
    // Storage is a recovery aid; current in-memory execution stays authoritative.
  }
}

export function createTaskStore({
  sessionStorage,
  localStorage,
  now = Date.now,
  cryptoApi = globalThis.crypto,
} = {}) {
  const records = new Map();
  const taskKey = (taskId) => `${TASK_PREFIX}${taskId}`;

  async function load(taskId) {
    if (records.has(taskId)) return structuredClone(records.get(taskId));
    let stored;
    try {
      stored = await storageValue(sessionStorage, taskKey(taskId));
    } catch (_error) {
      return null;
    }
    const record = normalizeRecord(stored);
    if (!record || record.taskId !== taskId) return null;
    records.set(taskId, record);
    return structuredClone(record);
  }

  async function write(record) {
    records.set(record.taskId, record);
    await bestEffortSet(sessionStorage, { [taskKey(record.taskId)]: structuredClone(record) });
    return structuredClone(record);
  }

  return Object.freeze({
    async start({ taskId, article, platformIds }) {
      const record = {
        taskId,
        documentId: article.documentId,
        articleFingerprint: await fingerprintArticle(article, cryptoApi),
        platformIds: PLATFORM_IDS.filter((id) => platformIds.includes(id)),
        results: [],
        updatedAt: now(),
      };
      return write(record);
    },
    async merge({ taskId, results }) {
      const record = await load(taskId);
      if (!record) throw invalid('任务上下文已失效，请重新发起同步');
      const merged = new Map(record.results.map((result) => [result.platformId, result]));
      for (const result of results || []) {
        const normalized = normalizeResult(result);
        if (!normalized || !record.platformIds.includes(normalized.platformId)) throw invalid('任务结果无效');
        merged.set(normalized.platformId, normalized);
      }
      record.results = record.platformIds.map((id) => merged.get(id)).filter(Boolean);
      record.updatedAt = now();
      return write(record);
    },
    load,
    async assertRetry({ taskId, article, platformId }) {
      const record = await load(taskId);
      if (!record) throw invalid('任务上下文已失效，请重新发起同步');
      if (!record.platformIds.includes(platformId)) throw invalid('平台未包含在原任务选择中');
      const fingerprint = await fingerprintArticle(article, cryptoApi);
      if (record.documentId !== article.documentId || record.articleFingerprint !== fingerprint) {
        throw invalid('文章内容已变化，请重新发起同步');
      }
      return { record, previous: record.results.find((result) => result.platformId === platformId) || { state: 'idle' } };
    },
    async complete(taskId) {
      const record = await load(taskId);
      if (!record) return null;
      let current = [];
      try {
        const stored = await storageValue(localStorage, HISTORY_KEY);
        if (Array.isArray(stored)) current = stored.map(normalizeHistoryEntry).filter(Boolean);
      } catch (_error) {
        current = [];
      }
      const entry = { ...record, completedAt: now() };
      const history = [entry, ...current.filter((item) => item.taskId !== taskId)].slice(0, HISTORY_LIMIT);
      await bestEffortSet(localStorage, { [HISTORY_KEY]: history });
      return structuredClone(entry);
    },
    async history() {
      let stored;
      try {
        stored = await storageValue(localStorage, HISTORY_KEY);
      } catch (_error) {
        return [];
      }
      if (!Array.isArray(stored)) return [];
      return stored.map(normalizeHistoryEntry).filter(Boolean).slice(0, HISTORY_LIMIT);
    },
    async recentDuplicates({ documentId, platformIds, windowMs = 5 * 60 * 1000 }) {
      const history = await this.history();
      const cutoff = now() - windowMs;
      const duplicates = new Set();
      for (const entry of history) {
        if (entry.documentId !== documentId || entry.completedAt < cutoff) continue;
        for (const result of entry.results) {
          if (platformIds.includes(result.platformId) && (result.state === 'success' || result.state === 'unknown')) {
            duplicates.add(result.platformId);
          }
        }
      }
      return PLATFORM_IDS.filter((platformId) => duplicates.has(platformId));
    },
  });
}
