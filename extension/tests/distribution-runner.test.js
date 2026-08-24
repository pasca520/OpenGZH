import { describe, expect, it, vi } from 'vitest';
import { createDistributionRunner } from '../src/background/distribution-runner.js';
import { PlatformError } from '../src/core/platform-errors.js';

const article = {
  schemaVersion: 1,
  documentId: 'doc-1',
  title: '标题',
  markdown: '# 标题',
  portableMarkdown: '![展示](img://hero-2)\n\n`img://hero`\n\n```text\nimg://hero\n```',
  semanticHtml: '<p>正文</p><img src="img://hero">',
  wechatHtml: '<p>正文</p><img src="img://hero">',
  images: [
    { ref: 'img://hero', kind: 'indexed-db', imageId: 'hero', mimeType: 'image/png', filename: 'hero.png', alt: '' },
    { ref: 'img://hero-2', kind: 'indexed-db', imageId: 'hero-2', mimeType: 'image/png', filename: 'hero-2.png', alt: '' },
  ],
  createdAt: 1787529600000,
};

function adapter(id, calls, failure) {
  return {
    id,
    checkAuth: vi.fn(async () => ({ authenticated: true })),
    uploadImage: vi.fn(async (_runtime, blob, filename) => {
      calls.push(`${id}:upload:${filename}:${await blob.text()}`);
      return `https://${id}.cdn/${filename}`;
    }),
    saveDraft: vi.fn(async () => {
      calls.push(`${id}:save`);
      if (failure) throw failure;
      return { draftId: `${id}-draft`, draftUrl: `https://${id}.example/draft` };
    }),
  };
}

describe('distribution runner', () => {
  it('runs selected platforms in fixed serial order and passes operation correlation', async () => {
    const calls = [];
    const states = [];
    const adapters = Object.fromEntries(['weixin', 'zhihu', 'juejin', 'woshipm'].map((id) => [id, () => adapter(id, calls)]));
    const runner = createDistributionRunner({
      adapterFactories: adapters,
      runtimeFactory: (platformId) => ({ requestImage: async (image) => new Blob([platformId + image.imageId], { type: 'image/png' }) }),
      onState: (state) => states.push(state),
      persist: vi.fn(async () => {}),
    });

    const result = await runner.runBatch({ taskId: 'task-1', operationId: 'operation-1', article, platformIds: ['woshipm', 'weixin', 'zhihu'] });

    expect(calls).toEqual([
      'weixin:upload:hero.png:weixinhero', 'weixin:save',
      'zhihu:upload:hero.png:zhihuhero', 'zhihu:save',
      'woshipm:upload:hero.png:woshipmhero', 'woshipm:save',
    ]);
    expect(result.results.map((entry) => entry.platformId)).toEqual(['weixin', 'zhihu', 'woshipm']);
    expect(states).toContainEqual(expect.objectContaining({ type: 'PLATFORM_STATE', taskId: 'task-1', operationId: 'operation-1', platformId: 'weixin', state: 'uploading-images', completed: 1, total: 1 }));
  });

  it('resolves only semantic image references and marks Juejin content as Markdown', async () => {
    const calls = [];
    const saveDraft = vi.fn(async () => ({ draftId: 'j-draft', draftUrl: 'https://juejin.cn/editor/drafts/j-draft' }));
    const runner = createDistributionRunner({
      adapterFactories: { juejin: () => ({ id: 'juejin', checkAuth: async () => ({ authenticated: true }), uploadImage: vi.fn(async (_r, blob) => { calls.push(await blob.text()); return 'https://cdn/hero-2'; }), saveDraft }) },
      runtimeFactory: () => ({ requestImage: async (image) => new Blob([image.imageId]) }),
      onState: vi.fn(),
      persist: vi.fn(async () => {}),
    });
    await runner.runBatch({ taskId: 'task-2', operationId: 'operation-2', article: { ...article, semanticHtml: '<p>无图</p>' }, platformIds: ['juejin'] });
    expect(calls).toEqual(['hero-2']);
    expect(saveDraft).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.any(Map), expect.anything(), { markdown: true });
  });

  it('keeps earlier success when a later platform fails and persists each result', async () => {
    const persist = vi.fn(async () => {});
    const runner = createDistributionRunner({
      adapterFactories: {
        weixin: () => adapter('weixin', []),
        zhihu: () => adapter('zhihu', [], new PlatformError('DRAFT_CREATE_FAILED', '创建失败', { retryable: true })),
      },
      runtimeFactory: () => ({ requestImage: async () => new Blob(['png'], { type: 'image/png' }) }),
      onState: vi.fn(), persist,
    });
    const result = await runner.runBatch({ taskId: 'task-3', operationId: 'operation-3', article, platformIds: ['weixin', 'zhihu'] });
    expect(result.results).toEqual([
      expect.objectContaining({ platformId: 'weixin', state: 'success' }),
      expect.objectContaining({ platformId: 'zhihu', state: 'failed', error: expect.objectContaining({ code: 'DRAFT_CREATE_FAILED' }) }),
    ]);
    expect(persist).toHaveBeenCalledTimes(2);
  });

  it('rejects missing correlation or duplicate selections and maps auth fetch failures', async () => {
    const base = { adapterFactories: { weixin: () => adapter('weixin', []) }, runtimeFactory: () => ({}), onState: vi.fn(), persist: vi.fn(async () => {}) };
    const runner = createDistributionRunner(base);
    await expect(runner.runBatch({ taskId: 'task-4', article, platformIds: ['weixin'] })).rejects.toMatchObject({ code: 'ARTICLE_INVALID' });
    await expect(runner.runBatch({ taskId: 'task-4', operationId: 'op-4', article, platformIds: ['weixin', 'weixin'] })).rejects.toMatchObject({ code: 'ARTICLE_INVALID' });

    const networkRunner = createDistributionRunner({
      ...base,
      adapterFactories: { weixin: () => ({ id: 'weixin', checkAuth: async () => { throw new TypeError('Failed to fetch'); }, uploadImage: vi.fn(), saveDraft: vi.fn() }) },
    });
    const result = await networkRunner.runBatch({ taskId: 'task-5', operationId: 'op-5', article, platformIds: ['weixin'] });
    expect(result.results[0]).toMatchObject({ state: 'failed', error: { code: 'NETWORK_ERROR', retryable: true } });
  });

  it('never reruns success or unknown remote state', async () => {
    const calls = [];
    const runner = createDistributionRunner({
      adapterFactories: { weixin: () => adapter('weixin', calls) },
      runtimeFactory: () => ({ requestImage: async () => new Blob(['png']) }),
      onState: vi.fn(), persist: vi.fn(async () => {}),
    });
    await expect(runner.retryPlatform({ taskId: 'task-6', operationId: 'op-6', article, platformId: 'weixin', previous: { state: 'success' } })).rejects.toMatchObject({ code: 'ARTICLE_INVALID' });
    await expect(runner.retryPlatform({ taskId: 'task-6', operationId: 'op-6', article, platformId: 'weixin', previous: { state: 'unknown' } })).rejects.toMatchObject({ code: 'UNKNOWN_REMOTE_STATE' });
    expect(calls).toEqual([]);
  });

  it('fails closed when a prior platform error is explicitly non-retryable', async () => {
    const checkAuth = vi.fn(async () => ({ authenticated: true }));
    const runner = createDistributionRunner({
      adapterFactories: { weixin: () => ({ ...adapter('weixin', []), checkAuth }) },
      runtimeFactory: () => ({ requestImage: async () => new Blob(['png']) }),
      onState: vi.fn(), persist: vi.fn(async () => {}),
    });
    for (const previous of [
      { state: 'failed', error: { code: 'PLATFORM_CHANGED', retryable: false } },
      { state: 'auth-required', error: { code: 'AUTH_REQUIRED', retryable: false } },
    ]) {
      await expect(runner.retryPlatform({ taskId: 'task-nonretry', operationId: 'op-nonretry', article, platformId: 'weixin', previous }))
        .rejects.toMatchObject({ code: previous.error.code, retryable: false });
    }
    expect(checkAuth).not.toHaveBeenCalled();
  });

  it('fails closed for malformed adapter identity, auth, image, and draft responses', async () => {
    const makeRunner = (factory) => createDistributionRunner({
      adapterFactories: { weixin: factory },
      runtimeFactory: () => ({ requestImage: async () => new Blob(['png']) }),
      onState: vi.fn(), persist: vi.fn(async () => {}),
    });
    const malformed = [
      () => ({ id: 'zhihu', checkAuth: async () => ({ authenticated: true }), uploadImage: async () => 'https://cdn/x', saveDraft: async () => ({ draftId: 'd', draftUrl: 'https://mp.weixin.qq.com/d' }) }),
      () => ({ id: 'weixin', checkAuth: async () => ({ authenticated: 'yes' }), uploadImage: async () => 'https://cdn/x', saveDraft: async () => ({ draftId: 'd', draftUrl: 'https://mp.weixin.qq.com/d' }) }),
      () => ({ id: 'weixin', checkAuth: async () => ({ authenticated: true }), uploadImage: async () => '   ', saveDraft: async () => ({ draftId: 'd', draftUrl: 'https://mp.weixin.qq.com/d' }) }),
      () => ({ id: 'weixin', checkAuth: async () => ({ authenticated: true }), uploadImage: async () => 'https://cdn/x', saveDraft: async () => ({ draftId: 1, draftUrl: 'https://mp.weixin.qq.com/d' }) }),
      () => ({ id: 'weixin', checkAuth: async () => ({ authenticated: true }), uploadImage: async () => 'https://cdn/x', saveDraft: async () => ({ draftId: 'd', draftUrl: 1 }) }),
    ];
    for (const [index, factory] of malformed.entries()) {
      const result = await makeRunner(factory).runBatch({ taskId: 'task-malformed', operationId: `op-${index}`, article, platformIds: ['weixin'] });
      expect(result.results[0]).toMatchObject({ state: 'failed', error: { code: 'PLATFORM_CHANGED', retryable: false } });
    }
  });

  it('normalizes assertAdapter TypeError to a non-retryable platform change', async () => {
    const runner = createDistributionRunner({
      adapterFactories: { weixin: () => ({ id: 'weixin' }) },
      runtimeFactory: () => ({}), onState: vi.fn(), persist: vi.fn(async () => {}),
    });
    const result = await runner.runBatch({ taskId: 'task-type', operationId: 'op-type', article, platformIds: ['weixin'] });
    expect(result.results[0]).toMatchObject({ state: 'failed', error: { code: 'PLATFORM_CHANGED', retryable: false } });
  });
});
