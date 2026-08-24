import { describe, expect, it, vi } from 'vitest';
import { assertHostPermissions, isAllowedSender, openSuccessfulDrafts, registerServiceWorker, sanitizeBatchForSession } from '../src/background/service-worker.js';

function portFixture() {
  const messages = [];
  const listeners = new Set();
  const disconnects = new Set();
  return {
    name: 'opengzh-distribution-v1',
    sender: { url: 'https://opengzh.pasca.fun/', frameId: 0 },
    messages,
    onMessage: { addListener: (listener) => listeners.add(listener), removeListener: (listener) => listeners.delete(listener) },
    onDisconnect: { addListener: (listener) => disconnects.add(listener) },
    postMessage(message) { messages.push(message); },
    receive(message) { return Promise.all([...listeners].map((listener) => listener(message))); },
    disconnect() { for (const listener of disconnects) listener(); },
  };
}

const article = {
  schemaVersion: 1, documentId: 'doc-1', title: '标题', markdown: '# 标题', portableMarkdown: '# 标题',
  semanticHtml: '<p>正文</p>', wechatHtml: '<p>正文</p>', images: [], createdAt: 1787529600000,
};

describe('service worker boundary', () => {
  it.each([
    [{ url: 'https://opengzh.pasca.fun/', frameId: 0 }, true],
    [{ url: 'http://localhost:8080/', frameId: 0 }, true],
    [{ url: 'http://127.0.0.1:8080/', frameId: 0 }, true],
    [{ url: 'https://opengzh.pasca.fun/', frameId: 1 }, false],
    [{ url: 'https://evil.example/', frameId: 0 }, false],
  ])('validates sender %#', (sender, expected) => expect(isAllowedSender(sender)).toBe(expected));

  it('derives exact required origins and fails closed when access is withheld', async () => {
    const permissions = { contains: vi.fn(async () => true) };
    await expect(assertHostPermissions(['zhihu', 'weixin'], permissions)).resolves.toBe(true);
    expect(permissions.contains).toHaveBeenCalledWith({ origins: [
      'https://mp.weixin.qq.com/*', 'https://www.zhihu.com/*', 'https://zhuanlan.zhihu.com/*',
      'https://api.zhihu.com/*', 'https://zhihu-pics-upload.zhimg.com/*',
    ] });
    await expect(assertHostPermissions(['evil'], permissions)).rejects.toMatchObject({ code: 'ARTICLE_INVALID' });
    await expect(assertHostPermissions(['weixin'], { contains: vi.fn(async () => false) })).rejects.toMatchObject({ code: 'PERMISSION_DENIED', retryable: true });
  });

  it('echoes requestId for auth fatal and task/operation for batch fatal', async () => {
    const onConnect = { addListener: vi.fn() };
    const port = portFixture();
    const chromeApi = {
      runtime: { onConnect },
      permissions: { contains: vi.fn(async () => false) },
      storage: { session: { set: vi.fn(async () => {}) } },
      tabs: { create: vi.fn(), update: vi.fn() },
    };
    registerServiceWorker(chromeApi, {});
    onConnect.addListener.mock.calls[0][0](port);
    await port.receive({ type: 'CHECK_AUTH', requestId: 'auth-fatal', platformIds: ['weixin'] });
    await port.receive({ type: 'START_BATCH', taskId: 'task-fatal', operationId: 'op-fatal', platformIds: ['weixin'], article });
    expect(port.messages).toEqual([
      expect.objectContaining({ type: 'FATAL_ERROR', requestId: 'auth-fatal', code: 'PERMISSION_DENIED' }),
      expect.objectContaining({ type: 'FATAL_ERROR', taskId: 'task-fatal', operationId: 'op-fatal', code: 'PERMISSION_DENIED' }),
    ]);

    const missingAdapterConnect = { addListener: vi.fn() };
    const missingAdapterPort = portFixture();
    registerServiceWorker({
      runtime: { onConnect: missingAdapterConnect },
      permissions: { contains: vi.fn(async () => true) },
      storage: { session: { set: vi.fn(async () => {}) } },
      tabs: { create: vi.fn(), update: vi.fn() },
    }, {});
    missingAdapterConnect.addListener.mock.calls[0][0](missingAdapterPort);
    await missingAdapterPort.receive({ type: 'CHECK_AUTH', requestId: 'auth-adapter-missing', platformIds: ['weixin'] });
    expect(missingAdapterPort.messages[0]).toMatchObject({ type: 'FATAL_ERROR', requestId: 'auth-adapter-missing' });
  });

  it('sanitizes session results and does not persist article or credentials', () => {
    expect(sanitizeBatchForSession({ taskId: 'task-1', article: { title: 'secret' }, token: 'secret', results: [
      { platformId: 'weixin', state: 'success', draftId: 'd1', draftUrl: 'https://mp.weixin.qq.com/draft?token=secret&safe=1', error: { code: 'NETWORK_ERROR', message: 'safe' } },
    ] })).toEqual({ taskId: 'task-1', results: [{ platformId: 'weixin', state: 'success', draftId: 'd1', draftUrl: 'https://mp.weixin.qq.com/draft', error: { code: 'NETWORK_ERROR', message: 'safe', retryable: false } }] });
  });

  it('validates every successful URL before creating any tab, then opens inactive and activates first', async () => {
    const tabs = { create: vi.fn(async ({ url }) => ({ id: url.includes('zhuanlan') ? 11 : 12 })), update: vi.fn(async () => {}) };
    await expect(openSuccessfulDrafts(tabs, { results: [
      { platformId: 'zhihu', state: 'success', draftUrl: 'https://zhuanlan.zhihu.com/p/1/edit?token=secret' },
      { platformId: 'juejin', state: 'success', draftUrl: 'https://evil.example/draft' },
    ] })).rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
    expect(tabs.create).not.toHaveBeenCalled();

    await openSuccessfulDrafts(tabs, { results: [
      { platformId: 'zhihu', state: 'success', draftUrl: 'https://zhuanlan.zhihu.com/p/1/edit?token=secret' },
      { platformId: 'juejin', state: 'success', draftUrl: 'https://juejin.cn/editor/drafts/2' },
    ] });
    expect(tabs.create).toHaveBeenNthCalledWith(1, { url: 'https://zhuanlan.zhihu.com/p/1/edit', active: false });
    expect(tabs.create).toHaveBeenNthCalledWith(2, { url: 'https://juejin.cn/editor/drafts/2', active: false });
    expect(tabs.update).toHaveBeenCalledWith(11, { active: true });
  });

  it('serializes commands, echoes operation/request correlation, and rejects retry during active batch', async () => {
    const onConnect = { addListener: vi.fn() };
    const port = portFixture();
    const gate = {};
    gate.promise = new Promise((resolve) => { gate.resolve = resolve; });
    const adapter = { id: 'weixin', checkAuth: vi.fn(async () => ({ authenticated: true })), uploadImage: vi.fn(), saveDraft: vi.fn(async () => { await gate.promise; return { draftId: 'd', draftUrl: 'https://mp.weixin.qq.com/d' }; }) };
    const chromeApi = {
      runtime: { onConnect },
      permissions: { contains: vi.fn(async () => true) },
      storage: { session: { set: vi.fn(async () => {}) } },
      tabs: { create: vi.fn(), update: vi.fn() },
    };
    registerServiceWorker(chromeApi, { weixin: () => adapter });
    onConnect.addListener.mock.calls[0][0](port);

    const auth = port.receive({ type: 'CHECK_AUTH', requestId: 'auth-1', platformIds: ['weixin'] });
    await auth;
    expect(port.messages[0]).toEqual({ type: 'AUTH_RESULT', requestId: 'auth-1', platformId: 'weixin', authenticated: true });

    const start = port.receive({ type: 'START_BATCH', taskId: 'task-1', operationId: 'op-1', platformIds: ['weixin'], article });
    await vi.waitFor(() => expect(adapter.saveDraft).toHaveBeenCalled());
    await port.receive({ type: 'RETRY_PLATFORM', taskId: 'task-1', operationId: 'op-2', platformId: 'weixin' });
    expect(port.messages.at(-1)).toMatchObject({ type: 'FATAL_ERROR', taskId: 'task-1', operationId: 'op-2' });
    gate.resolve();
    await start;
    expect(port.messages.some((message) => message.type === 'PLATFORM_STATE' && message.taskId === 'task-1' && message.operationId === 'op-1')).toBe(true);
    expect(port.messages.find((message) => message.type === 'BATCH_COMPLETE')).toMatchObject({ taskId: 'task-1', operationId: 'op-1' });
  });

  it('clears task context and broker on disconnect', async () => {
    const onConnect = { addListener: vi.fn() };
    const port = portFixture();
    const chromeApi = { runtime: { onConnect }, permissions: { contains: vi.fn(async () => true) }, storage: { session: { set: vi.fn(async () => {}) } }, tabs: { create: vi.fn(), update: vi.fn() } };
    registerServiceWorker(chromeApi, {});
    onConnect.addListener.mock.calls[0][0](port);
    port.disconnect();
    await port.receive({ type: 'RETRY_PLATFORM', taskId: 'missing', operationId: 'op', platformId: 'weixin' });
    expect(port.messages).toEqual([]);
  });
});
