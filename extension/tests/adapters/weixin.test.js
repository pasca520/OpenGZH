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

  it('uses an open backend page when the WeChat root redirects after login', async () => {
    const backendUrl = 'https://mp.weixin.qq.com/cgi-bin/home?t=home/index&lang=zh_CN&token=browser-secret-token';
    const fetch = vi.fn(async (url) => url === backendUrl
      ? response(home)
      : { status: 0, ok: false, type: 'opaqueredirect', async text() { return ''; } });
    const runtime = {
      ...runtimeFor(fetch),
      listOpenPageUrls: vi.fn(async () => [backendUrl]),
    };

    const result = await createWeixinAdapter().checkAuth(runtime);

    expect(result).toEqual({ authenticated: true, userId: 'test-user-789', username: '测试账号' });
    expect(JSON.stringify(result)).not.toContain('browser-secret-token');
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
    ['single and double quoted strings', `const single = 'window.wx = { data: { t: "bad-token" } }'; const double = "window.wx = { ticket: 'bad-ticket' }";`, false],
    ['template strings', 'const template = `window.wx = { data: { t: "bad-token" }, ticket: "bad-ticket", user_name: "bad-user" }`;', false],
    ['line and block comments', '// window.wx = { data: { t: "bad-token" }, ticket: "bad-ticket", user_name: "bad-user" };\n/* window.wx = { data: { t: "bad-token" }, ticket: "bad-ticket", user_name: "bad-user" } */', true],
  ])('handles %s before the real bootstrap assignment', async (_label, decoy, accepted) => {
    const valid = 'window.wx = { data: { t: "test-token-123" }, ticket: "test-ticket-456", user_name: "test-user-789", nick_name: "测试账号", time: "1787529600" };';
    const html = `<script>${decoy}\n${valid}</script>`;
    const adapter = createWeixinAdapter();
    await expect(adapter.checkAuth(runtimeFor(vi.fn(async () => response(html)))))
      .resolves.toEqual(accepted ? { authenticated: true, userId: 'test-user-789', username: '测试账号' } : { authenticated: false });
  });

  it.each([
    ['regex literal', '/window.wx = { data: { t: "bad-token" }, ticket: "bad-ticket", user_name: "bad-user" }/;'],
    ['HTML comment', '<!-- window.wx = { data: { t: "bad-token" }, ticket: "bad-ticket", user_name: "bad-user" } -->'],
    ['conditional body', 'if (false) { window.wx = { data: { t: "bad-token" }, ticket: "bad-ticket", user_name: "bad-user" }; }'],
    ['function body', 'function bootstrap() { window.wx = { data: { t: "bad-token" }, ticket: "bad-ticket", user_name: "bad-user" }; }'],
  ])('rejects %s instead of scanning nested or non-code assignments', async (_label, source) => {
    const valid = 'window.wx = { data: { t: "test-token-123" }, ticket: "test-ticket-456", user_name: "test-user-789" };';
    const adapter = createWeixinAdapter();
    await expect(adapter.checkAuth(runtimeFor(vi.fn(async () => response(`<script>${source}\n${valid}</script>`)))))
      .resolves.toEqual({ authenticated: false });
  });

  it('ignores text/plain decoys but accepts no-type and explicit JavaScript script types', async () => {
    const valid = 'window.wx = { data: { t: "test-token-123" }, ticket: "test-ticket-456", user_name: "test-user-789" };';
    const plainOnly = createWeixinAdapter();
    await expect(plainOnly.checkAuth(runtimeFor(vi.fn(async () => response(`<script type="text/plain">${valid}</script>`)))))
      .resolves.toEqual({ authenticated: false });
    for (const opening of ['<script>', '<script data-type="text/plain">', '<script type="text/javascript">', '<script type="application/javascript">']) {
      const adapter = createWeixinAdapter();
      await expect(adapter.checkAuth(runtimeFor(vi.fn(async () => response(`${opening}${valid}</script>`)))))
        .resolves.toMatchObject({ authenticated: true, userId: 'test-user-789' });
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
    'https://mmbiz.qpic.cn:443/test.png',
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
    expect(body.get('content0')).toBe('<p>外链<a href="https://mp.weixin.qq.com/cgi-bin/appmsg?t=media">内部</a>子域内部伪内部<img src="https://mmbiz.qpic.cn/test.png"></p>');
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
      .toBe('<p>数据属性真实外链</p>');
  });

  it.each([
    ['unquoted external href', '<p><a href=https://evil.example/path>外链</a></p>', '<p>外链</p>'],
    ['missing href', '<p><a>无链接</a></p>', '<p>无链接</p>'],
    ['malformed href', '<p><a href="https://[bad">坏链接</a></p>', '<p>坏链接</p>'],
    ['malformed closing tag', '<p><a href=https://evil.example>坏闭合</a onclick="evil()"></p>', '<p>坏闭合</p>'],
    ['explicit default port', '<p><a href="https://mp.weixin.qq.com:443/path">默认端口</a></p>', '<p>默认端口</p>'],
    ['unclosed anchor', '<p><a href="https://evil.example">未闭合</p>', '<p>未闭合</p>'],
    ['unterminated opening tag', '<p><a href=https://evil.example', '<p> href=https://evil.example'],
    ['nested unsafe anchors', '<p><a href="https://evil.example"><a href="https://evil-2.example">嵌套</a></a></p>', '<p>嵌套</p>'],
    ['anchor-like text inside another tag attribute', '<div data-value="<a href=https://evil.example>属性</a>">保留</div>', '<div data-value="<a href=https://evil.example>属性</a>">保留</div>'],
  ])('fails closed for %s while retaining text', async (_label, html, expected) => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(home))
      .mockResolvedValueOnce(response(JSON.stringify({ appMsgId: 'draft-anchor', base_resp: { ret: 0 } })));
    const adapter = createWeixinAdapter();
    const runtime = runtimeFor(fetch);
    await adapter.checkAuth(runtime);
    await adapter.saveDraft(runtime, { title: '标题', wechatHtml: html }, new Map());
    expect(fetch.mock.calls[1][1].body.get('content0')).toBe(expected);
  });

  it('rebuilds only an exact HTTPS WeChat anchor and strips event attributes', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(home))
      .mockResolvedValueOnce(response(JSON.stringify({ appMsgId: 'draft-safe-anchor', base_resp: { ret: 0 } })));
    const adapter = createWeixinAdapter();
    const runtime = runtimeFor(fetch);
    await adapter.checkAuth(runtime);
    await adapter.saveDraft(runtime, {
      title: '标题',
      wechatHtml: '<p><a class="unsafe" href=https://mp.weixin.qq.com/path?x=1&y=2 onclick="evil()">内部</a><a href=https://mp.weixin.qq.com/path/>尾斜杠</a><a href="https://sub.weixin.qq.com/path">子域</a></p>',
    }, new Map());
    expect(fetch.mock.calls[1][1].body.get('content0'))
      .toBe('<p><a href="https://mp.weixin.qq.com/path?x=1&amp;y=2">内部</a><a href="https://mp.weixin.qq.com/path/">尾斜杠</a>子域</p>');
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

  it('maps cleanup failure after a deterministic draft result to unknown remote state', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(home))
      .mockResolvedValueOnce(response(JSON.stringify({ appMsgId: 'draft-cleanup', base_resp: { ret: 0 } })));
    const runtime = {
      fetch,
      withHeaderRules: vi.fn(async (_rules, work) => {
        await work();
        throw new Error('DNR cleanup failed');
      }),
    };
    const adapter = createWeixinAdapter();
    await adapter.checkAuth(runtime);
    await expect(adapter.saveDraft(runtime, { title: '标题', wechatHtml: '<p>正文</p>' }, new Map()))
      .rejects.toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', draftId: 'draft-cleanup', retryable: false });
  });

  it('preserves a header-rule add failure before the request', async () => {
    const addError = new Error('DNR add failed');
    const runtime = {
      fetch: vi.fn().mockResolvedValue(response(home)),
      withHeaderRules: vi.fn(async () => { throw addError; }),
    };
    const adapter = createWeixinAdapter();
    await adapter.checkAuth(runtime);
    await expect(adapter.saveDraft(runtime, { title: '标题', wechatHtml: '<p>正文</p>' }, new Map()))
      .rejects.toBe(addError);
  });

  it('fails closed when create response is malformed, non-OK, or loses appMsgId', async () => {
    const cases = [
      { body: '{"base_resp":{"ret":0}}', init: undefined, code: 'PLATFORM_CHANGED' },
      { body: '{"base_resp":{"ret":1,"err_msg":"token=test-token-123"}}', init: undefined, code: 'DRAFT_CREATE_FAILED' },
      { body: '{not-json', init: undefined, code: 'PLATFORM_CHANGED' },
      { body: '{}', init: { status: 500 }, code: 'PLATFORM_CHANGED' },
      { body: '{"base_resp":{"ret":0}}', init: { status: 500 }, code: 'UNKNOWN_REMOTE_STATE' },
      { body: '{"base_resp":{"ret":1,"err_msg":"业务失败"}}', init: { status: 500 }, code: 'DRAFT_CREATE_FAILED' },
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

  it('redacts escaped credential keys in valid and malformed JSON summaries', async () => {
    const responses = [
      '{"to\\u006ben":"escaped-token","nested":{"ticket":"nested-ticket"}}',
      '{"to\\u006ben":"escaped-token","nested":{"ticket":"nested-ticket"},',
    ];
    for (const body of responses) {
      const fetch = vi.fn().mockResolvedValueOnce(response(home)).mockResolvedValueOnce(response(body));
      const runtime = runtimeFor(fetch);
      const adapter = createWeixinAdapter();
      await adapter.checkAuth(runtime);
      const error = await adapter.uploadImage(runtime, new Blob(['png']), 'hero.png').catch((value) => value);
      expect(error).toMatchObject({ code: 'PLATFORM_CHANGED' });
      expect(JSON.stringify(error)).not.toMatch(/escaped-token|nested-ticket/);
    }
  });

  it.each([
    'token=secret',
    'bad value',
    '<b>draft</b>',
    'draft-1\n',
    'x'.repeat(129),
  ])('rejects unsafe appMsgId values: %s', async (appMsgId) => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(home))
      .mockResolvedValueOnce(response(JSON.stringify({ appMsgId, base_resp: { ret: 0 } })));
    const adapter = createWeixinAdapter();
    const runtime = runtimeFor(fetch);
    await adapter.checkAuth(runtime);
    await expect(adapter.saveDraft(runtime, { title: '标题', wechatHtml: '<p>正文</p>' }, new Map()))
      .rejects.toMatchObject({ code: 'PLATFORM_CHANGED', retryable: false });
  });
});
