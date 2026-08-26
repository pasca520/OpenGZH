import { describe, expect, it, vi } from 'vitest';
import { assertFixedUrl, createPortImageBroker, createRequestRuntime } from '../src/core/request-runtime.js';

function fakePort() {
  const listeners = new Set();
  return {
    sent: [],
    onMessage: { addListener: (listener) => listeners.add(listener), removeListener: (listener) => listeners.delete(listener) },
    postMessage(message) { this.sent.push(message); },
    receive(message) { for (const listener of listeners) listener(message); },
  };
}

describe('fixed request runtime', () => {
  it('rejects non-HTTPS, userinfo, and unapproved hosts', () => {
    expect(() => assertFixedUrl('weixin', 'http://mp.weixin.qq.com/')).toThrowError(expect.objectContaining({ code: 'PLATFORM_CHANGED' }));
    expect(() => assertFixedUrl('weixin', 'https://user:pass@mp.weixin.qq.com/')).toThrowError(expect.objectContaining({ code: 'PLATFORM_CHANGED' }));
    expect(() => assertFixedUrl('weixin', 'https://evil.mp.weixin.qq.com/')).toThrowError(expect.objectContaining({ code: 'PLATFORM_CHANGED' }));
    expect(() => assertFixedUrl('juejin', 'https://volces.com/upload')).toThrowError(expect.objectContaining({ code: 'PLATFORM_CHANGED' }));
    expect(() => assertFixedUrl('weixin', 'https://mp.weixin.qq.com:8443/')).toThrowError(expect.objectContaining({ code: 'PLATFORM_CHANGED' }));
    expect(assertFixedUrl('juejin', 'https://upload.volces.com/upload').hostname).toBe('upload.volces.com');
  });

  it('forces manual redirect and credentials policy regardless of caller init', async () => {
    const fetchImpl = vi.fn(async (_url, init) => new Response('', { status: 200, headers: { location: 'https://evil.example/' } }));
    const runtime = createRequestRuntime({ platformId: 'juejin', taskId: 'task', imageBroker: { requestImage: vi.fn() }, fetchImpl });
    await runtime.fetch('https://imagex.bytedanceapi.com/?Action=Apply', { credentials: 'include', redirect: 'follow' });
    expect(fetchImpl).toHaveBeenCalledWith('https://imagex.bytedanceapi.com/?Action=Apply', expect.objectContaining({ redirect: 'manual', credentials: 'omit' }));
    await runtime.fetch('https://api.juejin.cn/user', { credentials: 'omit', redirect: 'follow' });
    expect(fetchImpl).toHaveBeenLastCalledWith('https://api.juejin.cn/user', expect.objectContaining({ redirect: 'manual', credentials: 'include' }));
  });

  it('lists only fixed-host WeChat page URLs from open browser tabs', async () => {
    const backendUrl = 'https://mp.weixin.qq.com/cgi-bin/home?t=home/index&token=browser-secret-token';
    const tabsApi = { query: vi.fn(async () => [
      { url: backendUrl },
      { url: backendUrl },
      { url: 'https://evil.example/cgi-bin/home?token=secret' },
      { url: 'http://mp.weixin.qq.com/cgi-bin/home?token=secret' },
      {},
    ]) };
    const runtime = createRequestRuntime({
      platformId: 'weixin', taskId: 'task', imageBroker: { requestImage: vi.fn() },
      fetchImpl: vi.fn(), tabsApi,
    });

    await expect(runtime.listOpenPageUrls()).resolves.toEqual([backendUrl]);
    expect(tabsApi.query).toHaveBeenCalledWith({ url: ['https://mp.weixin.qq.com/*'] });
  });
});

describe('image port broker', () => {
  it('ignores unknown or mismatched messages without deleting pending', async () => {
    const port = fakePort();
    const broker = createPortImageBroker(port, { timeoutMs: 1000, idFactory: () => 'request-1' });
    const pending = broker.requestImage({ ref: 'img://hero' }, { taskId: 'task-1', platformId: 'weixin' });
    const request = port.sent[0];
    port.receive({ type: 'UNKNOWN', requestId: request.requestId, taskId: 'task-1', platformId: 'weixin', ref: 'img://hero' });
    port.receive({ type: 'IMAGE_DATA', requestId: request.requestId, taskId: 'wrong', platformId: 'weixin', ref: 'img://hero', dataUrl: 'data:image/png;base64,cG5n' });
    port.receive({ type: 'IMAGE_DATA', requestId: request.requestId, taskId: 'task-1', platformId: 'weixin', ref: 'img://hero', dataUrl: 'data:image/png;base64,cG5n' });
    await expect(pending).resolves.toMatchObject({ type: 'image/png' });
  });

  it('rejects on postMessage throw, rejects pending on dispose, and blocks new requests', async () => {
    const port = fakePort();
    port.postMessage = () => { throw new Error('disconnected'); };
    const broker = createPortImageBroker(port, { timeoutMs: 1000, idFactory: () => 'request-2' });
    await expect(broker.requestImage({ ref: 'img://hero' }, { taskId: 'task-2', platformId: 'weixin' })).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
    broker.dispose();
    await expect(broker.requestImage({ ref: 'img://hero' }, { taskId: 'task-2', platformId: 'weixin' })).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
  });

  it('fails a duplicate request ID without replacing the original pending request', async () => {
    const port = fakePort();
    const broker = createPortImageBroker(port, { timeoutMs: 1000, idFactory: () => 'duplicate-id' });
    const first = broker.requestImage({ ref: 'img://first' }, { taskId: 'task-3', platformId: 'weixin' });
    const second = broker.requestImage({ ref: 'img://second' }, { taskId: 'task-3', platformId: 'weixin' });
    await expect(second).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
    port.receive({ type: 'IMAGE_DATA', requestId: 'duplicate-id', taskId: 'task-3', platformId: 'weixin', ref: 'img://first', dataUrl: 'data:image/png;base64,cG5n' });
    await expect(first).resolves.toMatchObject({ type: 'image/png' });
  });
});
