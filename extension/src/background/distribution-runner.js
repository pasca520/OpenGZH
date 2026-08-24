import { PLATFORM_IDS, articleContentForPlatform, assertAdapter, imageReferencesInContent } from '../core/adapter-contract.js';
import { validateArticle, validateSelectedPlatformImages } from '../core/article-validator.js';
import { PlatformError, serializeError } from '../core/platform-errors.js';

const noop = () => {};

function safeResult(platformId, state, extra = {}) {
  return { platformId, state, ...extra };
}

function assertCorrelation(taskId, operationId) {
  if (typeof taskId !== 'string' || !taskId.trim() || typeof operationId !== 'string' || !operationId.trim()) {
    throw new PlatformError('ARTICLE_INVALID', '任务关联信息无效', { retryable: false });
  }
}

function assertPlatformSelection(platformIds) {
  if (!Array.isArray(platformIds) || !platformIds.length || platformIds.length !== new Set(platformIds).size) {
    throw new PlatformError('ARTICLE_INVALID', '平台选择无效', { retryable: false });
  }
  const ordered = PLATFORM_IDS.filter((id) => platformIds.includes(id));
  if (ordered.length !== platformIds.length) throw new PlatformError('ARTICLE_INVALID', '平台选择无效', { retryable: false });
  return ordered;
}

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

function imageRefsForPlatform(article, platformId) {
  const content = articleContentForPlatform(article, platformId);
  const references = imageReferencesInContent(content, platformId === 'juejin');
  const used = new Set(references.map(({ value }) => value).filter(Boolean));
  return article.images.filter((image) => used.has(image.ref));
}

export function createDistributionRunner({ adapterFactories = {}, runtimeFactory, onState = noop, persist = noop }) {
  if (typeof runtimeFactory !== 'function') throw new TypeError('runtimeFactory 必须是函数');
  const emit = (taskId, operationId, platformId, state, extra = {}) => onState({
    type: 'PLATFORM_STATE', taskId, operationId, platformId, state, status: state, ...extra,
  });

  async function runPlatform({ taskId, operationId, article, platformId, previous = { state: 'idle' } }) {
    try {
      const adapter = getPlatformAdapter(platformId, adapterFactories);
      const runtime = runtimeFactory(platformId, taskId, operationId);
      emit(taskId, operationId, platformId, 'checking-auth');
      const auth = await adapter.checkAuth(runtime);
      if (typeof auth?.authenticated !== 'boolean') throw new PlatformError('PLATFORM_CHANGED', '鉴权响应格式无效', { retryable: false });
      if (!auth.authenticated) {
        const error = { code: 'AUTH_REQUIRED', message: '需要重新登录', retryable: true };
        emit(taskId, operationId, platformId, 'auth-required', { error });
        return safeResult(platformId, 'auth-required', { error });
      }

      const imageMap = new Map();
      const platformImages = imageRefsForPlatform(article, platformId);
      emit(taskId, operationId, platformId, 'uploading-images', { completed: 0, total: platformImages.length });
      for (const [index, image] of platformImages.entries()) {
        const blob = await runtime.requestImage(image);
        let uploadedUrl;
        try {
          uploadedUrl = await adapter.uploadImage(runtime, blob, image.filename);
        } catch (error) {
          throw error instanceof PlatformError
            ? error
            : new PlatformError('IMAGE_UPLOAD_FAILED', error?.message || '图片上传失败', { retryable: true });
        }
        if (typeof uploadedUrl !== 'string' || !uploadedUrl.trim()) throw new PlatformError('PLATFORM_CHANGED', '图片上传响应格式无效', { retryable: false });
        imageMap.set(image.ref, uploadedUrl);
        emit(taskId, operationId, platformId, 'uploading-images', { completed: index + 1, total: platformImages.length });
      }

      emit(taskId, operationId, platformId, 'saving-draft');
      const draft = await adapter.saveDraft(runtime, article, imageMap, previous, { markdown: platformId === 'juejin' });
      if (typeof draft?.draftId !== 'string' || !draft.draftId.trim() || typeof draft?.draftUrl !== 'string' || !draft.draftUrl.trim()) {
        throw new PlatformError('PLATFORM_CHANGED', '草稿响应缺少有效 ID 或编辑地址', { retryable: false });
      }
      const result = safeResult(platformId, 'success', { draftId: draft.draftId, draftUrl: draft.draftUrl });
      emit(taskId, operationId, platformId, 'success', { draftId: result.draftId, draftUrl: result.draftUrl });
      return result;
    } catch (error) {
      const normalized = error instanceof PlatformError
        ? error
        : new PlatformError('NETWORK_ERROR', error?.message || '平台网络请求失败', { retryable: true });
      const serialized = serializeError(normalized);
      const state = serialized.code === 'UNKNOWN_REMOTE_STATE' ? 'unknown' : serialized.code === 'AUTH_REQUIRED' ? 'auth-required' : 'failed';
      const result = safeResult(platformId, state, { error: serialized, ...(serialized.draftId ? { draftId: serialized.draftId } : {}) });
      emit(taskId, operationId, platformId, state, { error: serialized, ...(result.draftId ? { draftId: result.draftId } : {}) });
      return result;
    }
  }

  return Object.freeze({
    async runBatch({ taskId, operationId, article: input, platformIds }) {
      assertCorrelation(taskId, operationId);
      const article = validateArticle(input);
      const ordered = assertPlatformSelection(platformIds);
      validateSelectedPlatformImages(article, ordered);
      const batch = { taskId, operationId, results: [] };
      for (const platformId of ordered) {
        const result = await runPlatform({ taskId, operationId, article, platformId });
        batch.results.push(result);
        await persist({ taskId, operationId, results: [result] });
      }
      return batch;
    },

    async retryPlatform({ taskId, operationId, article: input, platformId, previous }) {
      assertCorrelation(taskId, operationId);
      if (!PLATFORM_IDS.includes(platformId)) throw new PlatformError('ARTICLE_INVALID', '平台选择无效', { retryable: false });
      if (previous?.state === 'success') throw new PlatformError('ARTICLE_INVALID', '成功平台不会重复执行', { retryable: false });
      if (previous?.state === 'unknown') throw new PlatformError('UNKNOWN_REMOTE_STATE', '请先人工检查平台草稿箱', { retryable: false });
      if (previous?.error?.retryable === false) {
        const code = typeof previous.error.code === 'string' ? previous.error.code : 'PLATFORM_CHANGED';
        throw new PlatformError(code, '该平台错误不可重试', { retryable: false });
      }
      const article = validateArticle(input);
      validateSelectedPlatformImages(article, [platformId]);
      const result = await runPlatform({ taskId, operationId, article, platformId, previous });
      await persist({ taskId, operationId, results: [result] });
      return result;
    },
  });
}
