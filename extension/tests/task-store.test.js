import { describe, expect, it, vi } from 'vitest';
import { createTaskStore, fingerprintArticle } from '../src/core/task-store.js';

const article = {
  schemaVersion: 1, documentId: 'doc-1', title: '标题', markdown: '# 标题', portableMarkdown: '# 标题',
  semanticHtml: '<p>正文</p>', wechatHtml: '<p>正文</p>', images: [], createdAt: 1787529600000,
};

function storageFixture(initial = {}) {
  const values = structuredClone(initial);
  return {
    values,
    get: vi.fn(async (key) => typeof key === 'string' ? { [key]: values[key] } : structuredClone(values)),
    set: vi.fn(async (entries) => Object.assign(values, structuredClone(entries))),
  };
}

describe('durable task store', () => {
  it('fingerprints canonical article content independent of object key insertion order', async () => {
    const reordered = Object.fromEntries(Object.entries(article).reverse());
    await expect(fingerprintArticle(article)).resolves.toBe(await fingerprintArticle(reordered));
    await expect(fingerprintArticle({ ...article, semanticHtml: '<p>已修改</p>' })).resolves.not.toBe(await fingerprintArticle(article));
  });

  it('restores retry metadata after a worker restart without persisting article content', async () => {
    const session = storageFixture();
    const local = storageFixture();
    const store = createTaskStore({ sessionStorage: session, localStorage: local, now: () => 2_000 });

    await store.start({ taskId: 'task-1', article, platformIds: ['weixin', 'zhihu'] });
    await store.merge({ taskId: 'task-1', results: [{
      platformId: 'weixin', state: 'failed', imageTotal: 2, imageUploaded: 1,
      error: { code: 'NETWORK_ERROR', message: '网络失败', retryable: true },
    }] });

    expect(JSON.stringify(session.values)).not.toContain(article.semanticHtml);
    expect(JSON.stringify(session.values)).not.toContain(article.markdown);
    const restarted = createTaskStore({ sessionStorage: session, localStorage: local, now: () => 3_000 });
    await expect(restarted.assertRetry({ taskId: 'task-1', article, platformId: 'weixin' })).resolves.toMatchObject({
      previous: { platformId: 'weixin', state: 'failed', imageTotal: 2, imageUploaded: 1 },
      record: { documentId: 'doc-1', platformIds: ['weixin', 'zhihu'] },
    });
    await expect(restarted.assertRetry({ taskId: 'task-1', article: { ...article, title: '已修改' }, platformId: 'weixin' }))
      .rejects.toMatchObject({ code: 'ARTICLE_INVALID', retryable: false });
    await expect(restarted.assertRetry({ taskId: 'task-1', article, platformId: 'juejin' }))
      .rejects.toMatchObject({ code: 'ARTICLE_INVALID', retryable: false });
  });

  it('keeps at most 25 sanitized history records in newest-first order', async () => {
    const session = storageFixture();
    const local = storageFixture();
    let now = 1_000;
    const store = createTaskStore({ sessionStorage: session, localStorage: local, now: () => now });
    for (let index = 0; index < 27; index += 1) {
      const taskId = `task-${index}`;
      await store.start({ taskId, article: { ...article, documentId: `doc-${index}` }, platformIds: ['weixin'] });
      await store.merge({ taskId, results: [{ platformId: 'weixin', state: 'success', draftId: `draft-${index}` }] });
      now += 1;
      await store.complete(taskId);
    }

    const history = await store.history();
    expect(history).toHaveLength(25);
    expect(history[0]).toMatchObject({ taskId: 'task-26', completedAt: 1027 });
    expect(history.at(-1)).toMatchObject({ taskId: 'task-2' });
    expect(JSON.stringify(history)).not.toContain('正文');
  });

  it('finds only recent successful or unknown platform duplicates for the same document', async () => {
    const session = storageFixture();
    const local = storageFixture();
    let now = 1_000;
    const store = createTaskStore({ sessionStorage: session, localStorage: local, now: () => now });
    await store.start({ taskId: 'task-duplicate', article, platformIds: ['weixin', 'zhihu', 'juejin'] });
    await store.merge({ taskId: 'task-duplicate', results: [
      { platformId: 'weixin', state: 'success' },
      { platformId: 'zhihu', state: 'unknown', error: { code: 'UNKNOWN_REMOTE_STATE', message: '未知', retryable: false } },
      { platformId: 'juejin', state: 'failed', error: { code: 'NETWORK_ERROR', message: '失败', retryable: true } },
    ] });
    await store.complete('task-duplicate');

    now += 4 * 60 * 1000;
    await expect(store.recentDuplicates({ documentId: 'doc-1', platformIds: ['juejin', 'zhihu', 'weixin'] }))
      .resolves.toEqual(['weixin', 'zhihu']);
    now += 60 * 1000 + 1;
    await expect(store.recentDuplicates({ documentId: 'doc-1', platformIds: ['weixin'] })).resolves.toEqual([]);
    await expect(store.recentDuplicates({ documentId: 'other', platformIds: ['weixin'] })).resolves.toEqual([]);
  });
});
