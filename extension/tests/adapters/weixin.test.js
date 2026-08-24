import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { createWeixinAdapter } from '../../src/adapters/weixin.js';

const home = await readFile(new URL('../fixtures/weixin-home.html', import.meta.url), 'utf8');

function runtimeFor(fetch, calls = []) {
  return {
    fetch,
    withHeaderRules: vi.fn(async (rules, work) => {
      calls.push(rules);
      return work();
    }),
  };
}

function response(body, init) {
  return new Response(body, init);
}

describe('WeChat adapter', () => {
  it('extracts auth fields without returning secrets', async () => {
    const runtime = runtimeFor(vi.fn(async () => response(home)));
    const adapter = createWeixinAdapter();
    await expect(adapter.checkAuth(runtime)).resolves.toEqual({ authenticated: true, userId: 'test-user-789', username: '测试账号' });
    expect(JSON.stringify(await adapter.checkAuth(runtime))).not.toMatch(/test-token-123|test-ticket-456/);
  });

  it('accepts reordered fields and either quote style only inside the wx bootstrap object', async () => {
    const reordered = `<!doctype html><script>window.wx = { nick_name: '测试账号', time: 1787529600, user_name: 'test-user-789', data: { t: 'test-token-123' }, ticket: 'test-ticket-456' };</script>`;
    const adapter = createWeixinAdapter();
    await expect(adapter.checkAuth(runtimeFor(vi.fn(async () => response(reordered)))))
      .resolves.toEqual({ authenticated: true, userId: 'test-user-789', username: '测试账号' });
  });

  it('fails closed for missing required fields or fields split across unrelated scripts', async () => {
    const missing = '<script>window.wx = { data: { t: "test-token-123" }, user_name: "test-user-789" };</script>';
    const split = '<script>window.wx = { data: { t: "test-token-123" } };</script><script>ticket: "test-ticket-456", user_name: "test-user-789"</script>';
    for (const html of [missing, split]) {
      const adapter = createWeixinAdapter();
      await expect(adapter.checkAuth(runtimeFor(vi.fn(async () => response(html)))))
        .resolves.toEqual({ authenticated: false });
    }
  });

  it.each([
    ['login page', response('<html>login</html>')],
    ['401', response('', { status: 401 })],
    ['403', response('', { status: 403 })],
    ['opaque redirect', { status: 0, ok: false, type: 'opaqueredirect', async text() { return ''; } }],
  ])('maps %s to unauthenticated without retaining a stale session', async (_label, authResponse) => {
    const fetch = vi.fn().mockResolvedValueOnce(response(home)).mockResolvedValueOnce(authResponse);
    const adapter = createWeixinAdapter();
    const runtime = runtimeFor(fetch);
    await expect(adapter.checkAuth(runtime)).resolves.toMatchObject({ authenticated: true });
    await expect(adapter.checkAuth(runtime)).resolves.toEqual({ authenticated: false });
    await expect(adapter.uploadImage(runtime, new Blob(['png'], { type: 'image/png' }), 'hero.png'))
      .rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });

  it('normalizes auth 5xx and fetch exceptions as network errors instead of login success', async () => {
    const failing = createWeixinAdapter();
    await expect(failing.checkAuth(runtimeFor(vi.fn(async () => response('upstream', { status: 503 })))))
      .rejects.toMatchObject({ code: 'NETWORK_ERROR', retryable: true });
    const unavailable = createWeixinAdapter();
    await expect(unavailable.checkAuth(runtimeFor(vi.fn(async () => { throw new TypeError('Failed to fetch'); }))))
      .rejects.toMatchObject({ code: 'NETWORK_ERROR', retryable: true });
  });

  it('uploads only binary material, validates base_resp, and returns an exact WeChat CDN URL', async () => {
    const calls = [];
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(home))
      .mockResolvedValueOnce(response(JSON.stringify({ cdn_url: 'https://mmbiz.qpic.cn/test.png', base_resp: { err_msg: 'ok', ret: 0 } }), { headers: { 'content-type': 'application/json' } }));
    const runtime = runtimeFor(fetch, calls);
    const adapter = createWeixinAdapter();
    await adapter.checkAuth(runtime);
    await expect(adapter.uploadImage(runtime, new Blob(['png'], { type: 'image/png' }), 'hero.png'))
      .resolves.toBe('https://mmbiz.qpic.cn/test.png');
    const [url, init] = fetch.mock.calls[1];
    expect(url).toContain('/cgi-bin/filetransfer?');
    expect(url).toContain('ticket_id=test-user-789');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.body.get('file')).toBeInstanceOf(Blob);
    expect(await init.body.get('file').text()).toBe('png');
    expect(calls[0]).toEqual([expect.objectContaining({ id: 1001, action: expect.objectContaining({ type: 'modifyHeaders' }), condition: expect.objectContaining({ urlFilter: '*://mp.weixin.qq.com/cgi-bin/*' }) })]);
    expect(calls[0][0].action.requestHeaders).toEqual([
      { header: 'Origin', operation: 'set', value: 'https://mp.weixin.qq.com' },
      { header: 'Referer', operation: 'set', value: 'https://mp.weixin.qq.com/' },
    ]);
  });

  it.each([
    'https://mmbiz.qlogo.cn/test-avatar.png',
    'http://mmbiz.qpic.cn/test.png',
    'https://user:pass@mmbiz.qpic.cn/test.png',
    'https://mmbiz.qpic.cn:8443/test.png',
    'https://mmbiz.qpic.cn.evil.example/test.png',
  ])('rejects an upload result outside the exact HTTPS mmbiz.qpic.cn CDN host: %s', async (cdnUrl) => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(home))
      .mockResolvedValueOnce(response(JSON.stringify({ cdn_url: cdnUrl, base_resp: { ret: 0, err_msg: 'ok' } })));
    const adapter = createWeixinAdapter();
    const runtime = runtimeFor(fetch);
    await adapter.checkAuth(runtime);
    await expect(adapter.uploadImage(runtime, new Blob(['png'], { type: 'image/png' }), 'hero.png'))
      .rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
  });

  it('maps upload auth loss, non-OK and malformed JSON with sanitized remote summaries', async () => {
    const nonOkFetch = vi.fn().mockResolvedValueOnce(response(home)).mockResolvedValueOnce(response(JSON.stringify({ base_resp: { ret: 1, err_msg: 'token=test-token-123 ticket=test-ticket-456' } }), { status: 400 }));
    const adapter = createWeixinAdapter();
    const runtime = runtimeFor(nonOkFetch);
    await adapter.checkAuth(runtime);
    const error = await adapter.uploadImage(runtime, new Blob(['png']), 'hero.png').catch((value) => value);
    expect(error).toMatchObject({ code: 'IMAGE_UPLOAD_FAILED', retryable: true });
    expect(JSON.stringify(error)).not.toMatch(/test-token-123|test-ticket-456/);

    const malformedFetch = vi.fn().mockResolvedValueOnce(response(home)).mockResolvedValueOnce(response('{"token":"test-token-123",'));
    const malformed = createWeixinAdapter();
    const malformedRuntime = runtimeFor(malformedFetch);
    await malformed.checkAuth(malformedRuntime);
    await expect(malformed.uploadImage(malformedRuntime, new Blob(['png']), 'hero.png'))
      .rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
  });

  it('creates one draft, replaces image refs, unwraps only external links, and preserves WeChat links', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(home))
      .mockResolvedValueOnce(response(JSON.stringify({ appMsgId: 'draft-1', base_resp: { ret: 0, err_msg: 'ok' } })));
    const calls = [];
    const runtime = runtimeFor(fetch, calls);
    const adapter = createWeixinAdapter();
    await adapter.checkAuth(runtime);
    const result = await adapter.saveDraft(runtime, {
      title: '标题',
      wechatHtml: '<p><a href="https://evil.example">外链</a><a href="https://mp.weixin.qq.com/cgi-bin/appmsg?t=media">内部</a><a href="https://sub.weixin.qq.com/path">子域内部</a><a href="https://weixin.qq.com.evil.example">伪内部</a><img src="img://hero"></p>',
    }, new Map([['img://hero', 'https://mmbiz.qpic.cn/test.png']]));
    expect(result).toEqual(expect.objectContaining({ draftId: 'draft-1' }));
    expect(result.draftUrl).toContain('appmsgid=draft-1');
    expect(result.draftUrl).toContain('token=test-token-123');
    const body = fetch.mock.calls[1][1].body;
    expect(body.get('content0')).toBe('<p>外链<a href="https://mp.weixin.qq.com/cgi-bin/appmsg?t=media">内部</a><a href="https://sub.weixin.qq.com/path">子域内部</a>伪内部<img src="https://mmbiz.qpic.cn/test.png"></p>');
    expect(body.get('count')).toBe('1');
    expect(body.get('title0')).toBe('标题');
    expect(calls[0][0].id).toBe(1001);
  });

  it('does not mistake a data-href attribute for an external anchor href', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(home))
      .mockResolvedValueOnce(response(JSON.stringify({ appMsgId: 'draft-data-href', base_resp: { ret: 0 } })));
    const adapter = createWeixinAdapter();
    const runtime = runtimeFor(fetch);
    await adapter.checkAuth(runtime);
    await adapter.saveDraft(runtime, {
      title: '标题',
      wechatHtml: '<p><a data-href="https://evil.example">数据属性</a><a href="https://evil.example">真实外链</a></p>',
    }, new Map());
    expect(fetch.mock.calls[1][1].body.get('content0'))
      .toBe('<p><a data-href="https://evil.example">数据属性</a>真实外链</p>');
  });

  it('marks an interrupted create request as unknown remote state and does not retry', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(home)).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const runtime = runtimeFor(fetch);
    const adapter = createWeixinAdapter();
    await adapter.checkAuth(runtime);
    await expect(adapter.saveDraft(runtime, { title: '标题', wechatHtml: '<p>正文</p>' }, new Map(), {}))
      .rejects.toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', retryable: false });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('fails closed when create response is malformed, non-OK, or loses appMsgId', async () => {
    const cases = [
      { body: '{"base_resp":{"ret":0}}', init: undefined, code: 'PLATFORM_CHANGED' },
      { body: '{"base_resp":{"ret":1,"err_msg":"token=test-token-123"}}', init: undefined, code: 'DRAFT_CREATE_FAILED' },
      { body: '{not-json', init: undefined, code: 'PLATFORM_CHANGED' },
      { body: '{"base_resp":{"ret":0}}', init: { status: 500 }, code: 'DRAFT_CREATE_FAILED' },
    ];
    for (const entry of cases) {
      const fetch = vi.fn().mockResolvedValueOnce(response(home)).mockResolvedValueOnce(response(entry.body, entry.init));
      const runtime = runtimeFor(fetch);
      const adapter = createWeixinAdapter();
      await adapter.checkAuth(runtime);
      const error = await adapter.saveDraft(runtime, { title: '标题', wechatHtml: '<p>正文</p>' }, new Map(), {}).catch((value) => value);
      expect(error).toMatchObject({ code: entry.code });
      expect(JSON.stringify(error)).not.toContain('test-token-123');
    }
  });
});
