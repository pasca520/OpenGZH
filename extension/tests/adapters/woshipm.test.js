import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { createWoshipmAdapter } from '../../src/adapters/woshipm.js';
import { PlatformError } from '../../src/core/platform-errors.js';

const profile = JSON.parse(await readFile(new URL('../fixtures/woshipm-profile.json', import.meta.url), 'utf8'));
const writingPage = '<script>window.settings={"jltoken":"test-jltoken"}; var userSettings={"url":"/","uid":"1585"};</script>';
const withRules = (_rules, work) => work();
const response = (body, init) => new Response(body, init);
const redirect = (status = 302) => status === 0
  ? { status: 0, ok: false, type: 'opaqueredirect' }
  : response('', { status });

describe('Woshipm adapter', () => {
  it('extracts top-level writing-page auth and verifies the profile without returning token', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(writingPage))
      .mockResolvedValueOnce(response(JSON.stringify(profile)));
    const result = await createWoshipmAdapter().checkAuth({ fetch, withHeaderRules: withRules });
    expect(result).toEqual({ authenticated: true, userId: '1585', username: '测试用户' });
    expect(JSON.stringify(result)).not.toContain('test-jltoken');
    expect(fetch.mock.calls[1][0]).toBe('https://www.woshipm.com/api2/user/profile?uid=1585');
  });

  it('ignores auth-shaped decoys outside top-level executable JavaScript', async () => {
    const page = `
      <script type="text/plain">window.settings={"jltoken":"text-token"}; var userSettings={"uid":"1585"};</script>
      <script>
        // window.settings={"jltoken":"comment-token"}; var userSettings={"uid":"1585"};
        const text = 'window.settings={"jltoken":"string-token"}; var userSettings={"uid":"1585"};';
        const template = \`window.settings={"jltoken":"template-token"}; var userSettings={"uid":"1585"};\`;
        const pattern = /window\\.settings.*userSettings/;
        function decoy() { window.settings={"jltoken":"function-token"}; var userSettings={"uid":"1585"}; }
        if (true) { window.settings={"jltoken":"conditional-token"}; var userSettings={"uid":"1585"}; }
      </script>
      <script>
        if (true)
          window.settings={"jltoken":"line-conditional-token"};
        var userSettings={"uid":"1585"};
      </script>
      <script><!-- window.settings={"jltoken":"html-comment-token"}; var userSettings={"uid":"1585"}; --></script>`;
    const fetch = vi.fn().mockResolvedValue(response(page));
    await expect(createWoshipmAdapter().checkAuth({ fetch, withHeaderRules: withRules }))
      .rejects.toMatchObject({ code: 'PLATFORM_CHANGED', retryable: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('fails closed when a top-level uid has no valid token', async () => {
    const pages = [
      '<script>var userSettings={uid:"1585"};</script>',
      '<script>window.settings={jltoken:"bad token"}; var userSettings={uid:"1585"};</script>',
    ];
    for (const page of pages) {
      const fetch = vi.fn().mockResolvedValue(response(page));
      await expect(createWoshipmAdapter().checkAuth({ fetch, withHeaderRules: withRules }))
        .rejects.toMatchObject({ code: 'PLATFORM_CHANGED', retryable: false });
    }
  });

  it.each([401, 403, 302, 0])('maps writing-page %s to unauthenticated and clears old token', async (status) => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(writingPage))
      .mockResolvedValueOnce(response(JSON.stringify(profile)))
      .mockResolvedValueOnce(redirect(status));
    const adapter = createWoshipmAdapter();
    await expect(adapter.checkAuth({ fetch, withHeaderRules: withRules })).resolves.toEqual({ authenticated: true, userId: '1585', username: '测试用户' });
    await expect(adapter.uploadImage({ fetch, withHeaderRules: withRules }, new Blob(['png']), 'hero.png'))
      .rejects.toMatchObject({ code: 'AUTH_REQUIRED', retryable: true });
  });

  it('maps auth network, 5xx, malformed profile, and uid mismatch separately', async () => {
    await expect(createWoshipmAdapter().checkAuth({ fetch: async () => { throw new TypeError('offline'); }, withHeaderRules: withRules }))
      .rejects.toMatchObject({ code: 'NETWORK_ERROR', retryable: true });
    await expect(createWoshipmAdapter().checkAuth({ fetch: async () => response('', { status: 500 }), withHeaderRules: withRules }))
      .rejects.toMatchObject({ code: 'NETWORK_ERROR', retryable: true });
    for (const body of [
      '{"CODE":500}',
      '{"CODE":200,"RESULT":{"userInfoVo":{"uid":999,"nickName":"用户"}}}',
      'not-json',
    ]) {
      const fetch = vi.fn()
        .mockResolvedValueOnce(response(writingPage))
        .mockResolvedValueOnce(response(body));
      await expect(createWoshipmAdapter().checkAuth({ fetch, withHeaderRules: withRules }))
        .rejects.toMatchObject({ code: 'PLATFORM_CHANGED', retryable: false });
    }
  });

  it('uploads Blob through the fixed endpoint with the in-memory token', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(writingPage))
      .mockResolvedValueOnce(response(JSON.stringify(profile)))
      .mockResolvedValueOnce(response(JSON.stringify({ data: [{ url: 'https://image.woshipm.com/test.png' }] })));
    const runtime = { fetch, withHeaderRules: withRules };
    const adapter = createWoshipmAdapter();
    await adapter.checkAuth(runtime);
    await expect(adapter.uploadImage(runtime, new Blob(['png'], { type: 'image/png' }), 'hero.png'))
      .resolves.toBe('https://image.woshipm.com/test.png');
    expect(fetch.mock.calls[2][0]).toBe('https://www.woshipm.com/tensorflow/upyun/upload');
    const init = fetch.mock.calls[2][1];
    expect(init.method).toBe('POST');
    expect(init.headers.jlstar).toBe('Bearer test-jltoken');
    expect(init.body.get('action')).toBe('wpuf_insert_image');
    expect(init.body.get('name')).toBe('hero.png');
    expect(init.body.get('files')).toBeInstanceOf(Blob);
  });

  it('requires an authenticated Blob and safe filename before any upload request', async () => {
    const adapter = createWoshipmAdapter();
    const fetch = vi.fn();
    await expect(adapter.uploadImage({ fetch, withHeaderRules: withRules }, new Blob(['png']), 'hero.png'))
      .rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(fetch).not.toHaveBeenCalled();
    const auth = vi.fn()
      .mockResolvedValueOnce(response(writingPage))
      .mockResolvedValueOnce(response(JSON.stringify(profile)));
    await adapter.checkAuth({ fetch: auth, withHeaderRules: withRules });
    for (const filename of ['', '../hero.png', 'hero\n.png', 'x'.repeat(257)]) {
      await expect(adapter.uploadImage({ fetch: auth, withHeaderRules: withRules }, new Blob(['png']), filename))
        .rejects.toMatchObject({ code: 'IMAGE_UPLOAD_FAILED' });
    }
  });

  it.each([401, 403, 302, 0])('maps upload auth/redirect %s to AUTH_REQUIRED and clears token', async (status) => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(writingPage))
      .mockResolvedValueOnce(response(JSON.stringify(profile)))
      .mockResolvedValueOnce(redirect(status));
    const adapter = createWoshipmAdapter();
    const runtime = { fetch, withHeaderRules: withRules };
    await adapter.checkAuth(runtime);
    await expect(adapter.uploadImage(runtime, new Blob(['png']), 'hero.png'))
      .rejects.toMatchObject({ code: 'AUTH_REQUIRED', retryable: true });
    await expect(adapter.uploadImage(runtime, new Blob(['png']), 'hero.png'))
      .rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('maps upload network/5xx/json failures without exposing token', async () => {
    for (const failure of [
      { value: new TypeError('test-jltoken network'), code: 'NETWORK_ERROR' },
      { value: response('', { status: 500 }), code: 'NETWORK_ERROR' },
      { value: response('not-json'), code: 'PLATFORM_CHANGED' },
      { value: response(JSON.stringify({ error: 'test-jltoken rejected' })), code: 'IMAGE_UPLOAD_FAILED' },
    ]) {
      const fetch = vi.fn()
        .mockResolvedValueOnce(response(writingPage))
        .mockResolvedValueOnce(response(JSON.stringify(profile)));
      if (failure.value instanceof Error) fetch.mockRejectedValueOnce(failure.value);
      else fetch.mockResolvedValueOnce(failure.value);
      const adapter = createWoshipmAdapter();
      await adapter.checkAuth({ fetch, withHeaderRules: withRules });
      const error = await adapter.uploadImage({ fetch, withHeaderRules: withRules }, new Blob(['png']), 'hero.png').catch((value) => value);
      expect(error).toMatchObject({ code: failure.code });
      expect(JSON.stringify(error)).not.toContain('test-jltoken');
    }
  });

  it.each([
    'https://image.woshipm.com.evil.test/x.png',
    'http://image.woshipm.com/x.png',
    'https://user:image@image.woshipm.com/x.png',
    'https://image.woshipm.com:443/x.png',
    'https://image.woshipm.com/x.png?token=secret',
    'https://image.woshipm.com/x.png#fragment',
  ])('rejects unapproved upload CDN URL %s', async (url) => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(writingPage))
      .mockResolvedValueOnce(response(JSON.stringify(profile)))
      .mockResolvedValueOnce(response(JSON.stringify({ data: [{ url }] })));
    const adapter = createWoshipmAdapter();
    const runtime = { fetch, withHeaderRules: withRules };
    await adapter.checkAuth(runtime);
    await expect(adapter.uploadImage(runtime, new Blob(['png']), 'hero.png'))
      .rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
  });

  it('creates a mapped HTML draft and uses an exact fallback edit URL', async () => {
    const fetch = vi.fn().mockResolvedValue(response(JSON.stringify({ post_id: 42 })));
    const result = await createWoshipmAdapter().saveDraft(
      { fetch, withHeaderRules: withRules },
      { title: '标题', semanticHtml: '<p>正文<img src="img://hero"></p>' },
      new Map([['img://hero', 'https://image.woshipm.com/test.png']]),
    );
    expect(result).toEqual({ draftId: '42', draftUrl: 'https://www.woshipm.com/writing?pid=42' });
    const body = fetch.mock.calls[0][1].body;
    expect(body.get('action')).toBe('add_draft');
    expect(body.get('post_title')).toBe('标题');
    expect(body.get('post_content')).toContain('https://image.woshipm.com/test.png');
    expect(body.get('post_content')).not.toContain('img://');
  });

  it('accepts safe multiline semantic HTML and retains post ID when its URL is unsafe', async () => {
    const fetch = vi.fn().mockResolvedValue(response(JSON.stringify({ post_id: 42, url: 'https://evil.example/draft' })));
    const error = await createWoshipmAdapter().saveDraft(
      { fetch, withHeaderRules: withRules },
      { title: '标题', semanticHtml: '<p>第一行</p>\n<p>第二行</p>' }, new Map(),
    ).catch((value) => value);
    expect(error).toMatchObject({ code: 'PLATFORM_CHANGED', draftId: '42', retryable: false });
  });

  it('rejects unmapped local refs and unsafe article input before create', async () => {
    const fetch = vi.fn();
    const adapter = createWoshipmAdapter();
    for (const article of [
      { title: '标题', semanticHtml: '<p><img src="img://missing"></p>' },
      { title: '标题', semanticHtml: '<p><img src="blob:https://example.test/id"></p>' },
      { title: '标题', semanticHtml: '<p><img src="https://evil.example/x.png"></p>' },
      { title: '', semanticHtml: '<p>正文</p>' },
      { title: '标题\n', semanticHtml: '<p>正文</p>' },
      { title: '标题', semanticHtml: 123 },
    ]) {
      await expect(adapter.saveDraft({ fetch, withHeaderRules: withRules }, article, new Map()))
        .rejects.toMatchObject({ code: 'ARTICLE_INVALID' });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('maps create network, body-read, and 5xx uncertainty to non-retryable unknown state', async () => {
    for (const createResponse of [
      new TypeError('Failed to fetch'),
      { status: 200, ok: true, text: vi.fn().mockRejectedValue(new TypeError('stream')) },
      response('server error', { status: 500 }),
    ]) {
      const fetch = vi.fn();
      if (createResponse instanceof Error) fetch.mockRejectedValue(createResponse);
      else fetch.mockResolvedValue(createResponse);
      const error = await createWoshipmAdapter().saveDraft({ fetch, withHeaderRules: withRules }, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map()).catch((value) => value);
      expect(error).toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', retryable: false });
    }
  });

  it('preserves a safe post ID from non-2xx responses and never makes it retryable', async () => {
    for (const [status, code] of [[400, 'DRAFT_CREATE_FAILED'], [500, 'UNKNOWN_REMOTE_STATE']]) {
      const fetch = vi.fn().mockResolvedValue(response(JSON.stringify({ post_id: 42, error: 'bad' }), { status }));
      const error = await createWoshipmAdapter().saveDraft({ fetch, withHeaderRules: withRules }, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map()).catch((value) => value);
      expect(error).toMatchObject({ code, draftId: '42', retryable: false });
    }
  });

  it.each([401, 403, 302, 0])('maps draft auth/redirect %s to AUTH_REQUIRED', async (status) => {
    await expect(createWoshipmAdapter().saveDraft({ fetch: async () => redirect(status), withHeaderRules: withRules }, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map()))
      .rejects.toMatchObject({ code: 'AUTH_REQUIRED', retryable: true });
  });

  it.each([
    'https://evil.example/draft',
    'https://www.woshipm.com/other?pid=42',
    'https://www.woshipm.com/writing?pid=42&extra=x',
    'https://www.woshipm.com/writing?pid=42#fragment',
    'https://user@www.woshipm.com/writing?pid=42',
    'https://www.woshipm.com:443/writing?pid=42',
  ])('rejects unsafe draft URL %s', async (url) => {
    const fetch = vi.fn().mockResolvedValue(response(JSON.stringify({ post_id: 42, url })));
    await expect(createWoshipmAdapter().saveDraft({ fetch, withHeaderRules: withRules }, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map()))
      .rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
  });

  it('keeps the draft ID when header-rule cleanup fails after create and clears token on terminal success', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(writingPage))
      .mockResolvedValueOnce(response(JSON.stringify(profile)))
      .mockResolvedValueOnce(response(JSON.stringify({ data: [{ url: 'https://image.woshipm.com/test.png' }] })))
      .mockResolvedValueOnce(response(JSON.stringify({ post_id: 42 })));
    let cleanupCount = 0;
    const runtime = {
      fetch,
      withHeaderRules: async (_rules, work) => {
        const result = await work();
        cleanupCount += 1;
        if (cleanupCount === 3) throw new Error('cleanup failed');
        return result;
      },
    };
    const adapter = createWoshipmAdapter();
    await adapter.checkAuth(runtime);
    await adapter.uploadImage(runtime, new Blob(['png']), 'hero.png');
    await expect(adapter.saveDraft(runtime, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map()))
      .rejects.toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', draftId: '42', retryable: false });
    await expect(adapter.uploadImage(runtime, new Blob(['png']), 'hero.png'))
      .rejects.toMatchObject({ code: 'AUTH_REQUIRED' });
  });

  it('retains the draft ID when cleanup reports a platform error after create', async () => {
    const fetch = vi.fn().mockResolvedValue(response(JSON.stringify({ post_id: 43 })));
    const runtime = {
      fetch,
      withHeaderRules: async (_rules, work) => {
        await work();
        throw new PlatformError('PLATFORM_CHANGED', '规则清理失败', { retryable: false });
      },
    };
    await expect(createWoshipmAdapter().saveDraft(runtime, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map()))
      .rejects.toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', draftId: '43', retryable: false });
  });
});
