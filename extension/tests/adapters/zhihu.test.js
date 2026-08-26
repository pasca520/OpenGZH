import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { createZhihuAdapter, transformZhihuContent } from '../../src/adapters/zhihu.js';

const tokenFixture = JSON.parse(await readFile(new URL('../fixtures/zhihu-image-token.json', import.meta.url), 'utf8'));
const withRules = (_rules, work) => work();
const response = (body, init) => new Response(body, init);
const redirectResponse = (status) => status === 0
  ? { status: 0, ok: false, type: 'opaqueredirect' }
  : response('', { status });

describe('Zhihu adapter', () => {
  it('detects login from /api/v4/me and validates safe identity fields', async () => {
    const adapter = createZhihuAdapter();
    await expect(adapter.checkAuth({ fetch: async () => response(JSON.stringify({ id: 'u1', name: '测试用户' })), withHeaderRules: withRules }))
      .resolves.toEqual({ authenticated: true, userId: 'u1', username: '测试用户' });
    await expect(createZhihuAdapter().checkAuth({ fetch: async () => response(JSON.stringify({ id: 'u1<script>', name: 'x' })), withHeaderRules: withRules }))
      .rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
  });

  it.each([
    [401, 'auth-required'], [403, 'auth-required'], [302, 'unauthenticated'], [0, 'unauthenticated'],
  ])('maps HTTP %s or redirect responses without pretending platform failure is logout', async (status, label) => {
    const responseValue = status === 0
      ? { status: 0, ok: false, type: 'opaqueredirect', async json() { return {}; } }
      : response('', { status });
    const adapter = createZhihuAdapter();
    if (label === 'auth-required' || label === 'unauthenticated') {
      await expect(adapter.checkAuth({ fetch: async () => responseValue, withHeaderRules: withRules }))
        .resolves.toEqual({ authenticated: false });
    } else {
      await expect(adapter.checkAuth({ fetch: async () => responseValue, withHeaderRules: withRules }))
        .rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
    }
  });

  it('maps auth network failures and malformed success separately', async () => {
    await expect(createZhihuAdapter().checkAuth({ fetch: async () => { throw new TypeError('offline'); }, withHeaderRules: withRules }))
      .rejects.toMatchObject({ code: 'NETWORK_ERROR', retryable: true });
    await expect(createZhihuAdapter().checkAuth({ fetch: async () => response('nope', { status: 200 }), withHeaderRules: withRules }))
      .rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
    await expect(createZhihuAdapter().checkAuth({ fetch: async () => response(JSON.stringify({ id: 'u1' }), { status: 500 }), withHeaderRules: withRules }))
      .rejects.toMatchObject({ code: 'NETWORK_ERROR', retryable: true });
  });

  it('transforms table, image, and code structures without inline styles', () => {
    const result = transformZhihuContent('<table style="x" data-x="1"><thead><tr><th>A</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table><img src="img://hero"><figure><img src="img://already"></figure><pre><code class="language-js">x</code></pre>');
    expect(result).toContain('<table data-draft-node="block" data-draft-type="table" data-size="normal" data-row-style="normal"><tbody><tr><th>A</th></tr><tr><td>B</td></tr></tbody></table>');
    expect(result).toContain('<figure><img src="img://hero"></figure>');
    expect(result).toContain('<figure><img src="img://already"></figure>');
    expect(result).toContain('<pre lang="js"><code>x</code></pre>');
    expect(result).not.toMatch(/(?:^|\s)style=/i);
  });

  it('removes quoted and unquoted styles and rejects executable or unsafe attributes', () => {
    expect(transformZhihuContent('<p style=x onclick="evil()" data-safe="yes" onload=evil>text</p>'))
      .toBe('<p>text</p>');
    expect(transformZhihuContent('<script>alert(1)</script><img src="javascript:alert(1)" onerror="evil">'))
      .not.toMatch(/script|javascript|onerror|onload/i);
    expect(transformZhihuContent('<a href="https://evil.example" data-draft-node="inline" data-draft-type="x">x</a>'))
      .toBe('<a href="https://evil.example" data-draft-node="inline" data-draft-type="x">x</a>');
    expect(() => transformZhihuContent({ toString() { throw new Error('coercion'); } })).toThrow();
  });

  it.each(['<!-- unclosed comment', '<p>nested <!-- unclosed comment'])('fails closed for an unclosed HTML comment: %s', (html) => {
    expect(() => transformZhihuContent(html)).toThrowError(expect.objectContaining({ code: 'PLATFORM_CHANGED' }));
  });

  it('promotes a figure containing only a table instead of nesting the draft table in figure', () => {
    const result = transformZhihuContent('<figure><table><tbody><tr><td>A</td></tr></tbody></table></figure>');
    expect(result).toBe('<table data-draft-node="block" data-draft-type="table" data-size="normal" data-row-style="normal"><tbody><tr><td>A</td></tr></tbody></table>');
    expect(result).not.toContain('<figure>');
  });

  it('keeps approved Zhihu CDN image hosts and rejects lookalikes or unsafe URL forms', () => {
    for (const host of ['https://zhimg.com/path/a.png', 'https://pic1.zhimg.com/path/a.png', 'https://sub.pic1.zhimg.com/path/a.png']) {
      expect(transformZhihuContent(`<img src="${host}">`)).toContain(`<img src="${host}">`);
    }
    for (const host of [
      'https://zhimg.com.evil.example/path/a.png',
      'http://pic1.zhimg.com/path/a.png',
      'https://user:pass@pic1.zhimg.com/path/a.png',
      'https://pic1.zhimg.com:443/path/a.png',
      'https://pic1.zhimg.com/path/a.png?token=secret',
      'https://pic1.zhimg.com/path/a.png#fragment',
    ]) {
      expect(transformZhihuContent(`<img src="${host}">`)).toBe('');
    }
  });

  it('negotiates and uploads a binary image only to the fixed OSS host', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify(tokenFixture)))
      .mockResolvedValueOnce(response('', { status: 200 }));
    const adapter = createZhihuAdapter({ hmacSha1Base64: vi.fn(async () => 'test-signature'), now: () => new Date('2026-01-01T00:00:00Z') });
    const runtime = { fetch, withHeaderRules: withRules };
    await expect(adapter.uploadImage(runtime, new Blob(['png'], { type: 'image/png' }), 'hero.png'))
      .resolves.toBe('https://pic4.zhimg.com/test/object-key');
    expect(fetch.mock.calls[0][0]).toBe('https://api.zhihu.com/images');
    expect(fetch.mock.calls[1][0]).toBe('https://zhihu-pics-upload.zhimg.com/test/object-key');
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe('OSS test-access-id:test-signature');
    expect(fetch.mock.calls[1][1].body).toBeInstanceOf(Blob);
  });

  it('supports the current state=2 camelCase image flow and returns the polled source URL', async () => {
    const hash = 'bff139fa05ac583f685a523ab3d110a0';
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify({
        uploadFile: { state: 2, imageId: 'current-image-id' },
        uploadToken: { accessId: 'test-access-id', accessKey: 'test-access-key', accessToken: 'test-access-token' },
      })))
      .mockResolvedValueOnce(response('', { status: 200 }))
      .mockResolvedValueOnce(response(null, { status: 204 }))
      .mockResolvedValueOnce(response(JSON.stringify({ status: 'success', src: `https://pic4.zhimg.com/v2-${hash}` })));
    const adapter = createZhihuAdapter({ hmacSha1Base64: vi.fn(async () => 'test-signature'), delay: async () => {}, now: () => new Date('2026-01-01T00:00:00Z') });

    await expect(adapter.uploadImage({ fetch, withHeaderRules: withRules }, new Blob(['png'], { type: 'image/png' }), 'hero.png'))
      .resolves.toBe(`https://pic4.zhimg.com/v2-${hash}`);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      'https://api.zhihu.com/images',
      `https://zhihu-pics-upload.zhimg.com/v2-${hash}`,
      'https://api.zhihu.com/images/current-image-id/uploading_status',
      'https://api.zhihu.com/images/current-image-id',
    ]);
    expect(fetch.mock.calls[1][1].headers).not.toHaveProperty('Content-MD5');
  });

  it('treats current non-state=2 images as reusable even when an object key is present without a token', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify({
        upload_file: { state: 0, image_id: 'reused-image-id', object_key: 'legacy-looking-key' },
      })))
      .mockResolvedValueOnce(response(JSON.stringify({ status: 'success', src: 'https://pic4.zhimg.com/reused-image-id' })));

    await expect(createZhihuAdapter({ delay: async () => {} }).uploadImage(
      { fetch, withHeaderRules: withRules },
      new Blob(['png'], { type: 'image/png' }),
      'hero.png',
    )).resolves.toBe('https://pic4.zhimg.com/reused-image-id');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      'https://api.zhihu.com/images',
      'https://api.zhihu.com/images/reused-image-id',
    ]);
  });

  it.each([302, 0])('maps image negotiation redirect %s to AUTH_REQUIRED', async (status) => {
    const fetch = vi.fn().mockResolvedValue(redirectResponse(status));
    await expect(createZhihuAdapter().uploadImage({ fetch, withHeaderRules: withRules }, new Blob(['png'], { type: 'image/png' }), 'hero.png'))
      .rejects.toMatchObject({ code: 'AUTH_REQUIRED', retryable: true });
  });

  it('uses OSS V1 StringToSign with Content-MD5 on line two but only x-oss headers canonicalized', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify(tokenFixture)))
      .mockResolvedValueOnce(response('', { status: 200 }));
    const hmacSha1Base64 = vi.fn(async () => 'test-signature');
    const adapter = createZhihuAdapter({ hmacSha1Base64, now: () => new Date('2026-01-01T00:00:00Z') });
    await adapter.uploadImage({ fetch, withHeaderRules: withRules }, new Blob(['png'], { type: 'image/png' }), 'hero.png');
    expect(hmacSha1Base64).toHaveBeenCalledWith('test-access-key', [
      'PUT',
      'v/E5+gWsWD9oWlI6s9EQoA==',
      'image/png',
      'Thu, 01 Jan 2026 00:00:00 GMT',
      'x-oss-date:Thu, 01 Jan 2026 00:00:00 GMT',
      'x-oss-security-token:test-access-token',
      'x-oss-user-agent:aliyun-sdk-js/6.8.0',
      '/zhihu-pics/test/object-key',
    ].join('\n'));
  });

  it('polls state=1 with bounded image status requests and returns a strict URL', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify({ upload_file: { state: 1, image_id: 'image-1', object_key: 'ignored' } })))
      .mockResolvedValueOnce(response(JSON.stringify({ state: 0 })))
      .mockResolvedValueOnce(response(JSON.stringify({ original_hash: 'hash-1' })));
    const adapter = createZhihuAdapter({ delay: async () => {} });
    await expect(adapter.uploadImage({ fetch, withHeaderRules: withRules }, new Blob(['png'], { type: 'image/png' }), 'hero.png'))
      .resolves.toBe('https://pic4.zhimg.com/hash-1');
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['https://api.zhihu.com/images', 'https://api.zhihu.com/images/image-1', 'https://api.zhihu.com/images/image-1']);
  });

  it.each([302, 0])('maps image polling redirect %s to AUTH_REQUIRED', async (status) => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify({ upload_file: { state: 1, image_id: 'image-1', object_key: 'ignored' } })))
      .mockResolvedValueOnce(redirectResponse(status));
    await expect(createZhihuAdapter().uploadImage({ fetch, withHeaderRules: withRules }, new Blob(['png'], { type: 'image/png' }), 'hero.png'))
      .rejects.toMatchObject({ code: 'AUTH_REQUIRED', retryable: true });
  });

  it('keeps OSS PUT redirects as PLATFORM_CHANGED', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify(tokenFixture)))
      .mockResolvedValueOnce(redirectResponse(302));
    await expect(createZhihuAdapter({ hmacSha1Base64: vi.fn(async () => 'test-signature') }).uploadImage(
      { fetch, withHeaderRules: withRules }, new Blob(['png'], { type: 'image/png' }), 'hero.png',
    )).rejects.toMatchObject({ code: 'PLATFORM_CHANGED', retryable: false });
  });

  it('rejects malformed upload credentials, IDs, and unsafe object keys without leaking secrets', async () => {
    for (const uploadFile of [
      { state: 0, image_id: 'id', object_key: '../escape' },
      { state: 0, image_id: 'id', object_key: 'safe?x=1' },
      { state: 0, image_id: 'id', object_key: 'safe\nkey' },
    ]) {
      const fetch = vi.fn().mockResolvedValue(response(JSON.stringify({ upload_file: uploadFile, upload_token: tokenFixture.upload_token })));
      await expect(createZhihuAdapter().uploadImage({ fetch, withHeaderRules: withRules }, new Blob(['png']), 'hero.png'))
        .rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
      expect(JSON.stringify(await createZhihuAdapter().uploadImage({ fetch: vi.fn().mockResolvedValue(response(JSON.stringify({ upload_file: { state: 0, image_id: 'id', object_key: 'safe' }, upload_token: { access_id: 'id', access_key: 'key', access_token: 'token' } }))), withHeaderRules: withRules }, new Blob(['png']), 'hero.png').catch((error) => error))).not.toMatch(/token|access|key/i);
    }
  });

  it('creates then updates a draft and returns the edit URL', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify({ id: 'draft-1' }), { status: 201 }))
      .mockResolvedValueOnce(response(null, { status: 204 }));
    const adapter = createZhihuAdapter();
    const result = await adapter.saveDraft({ fetch, withHeaderRules: withRules }, {
      title: '标题', semanticHtml: '<p>正文<img src="img://hero"></p>',
    }, new Map([['img://hero', 'https://pic4.zhimg.com/test/object-key']]), {});
    expect(result).toEqual({ draftId: 'draft-1', draftUrl: 'https://zhuanlan.zhihu.com/p/draft-1/edit' });
    expect(JSON.parse(fetch.mock.calls[1][1].body).content).toContain('https://pic4.zhimg.com/test/object-key');
  });

  it.each([302, 0])('maps draft create redirect %s to AUTH_REQUIRED without an ID', async (status) => {
    const fetch = vi.fn().mockResolvedValue(redirectResponse(status));
    await expect(createZhihuAdapter().saveDraft(
      { fetch, withHeaderRules: withRules }, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map(), {},
    )).rejects.toMatchObject({ code: 'AUTH_REQUIRED', retryable: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('maps draft PATCH redirect to AUTH_REQUIRED while preserving the existing draft ID', async () => {
    const fetch = vi.fn().mockResolvedValue(redirectResponse(302));
    await expect(createZhihuAdapter().saveDraft(
      { fetch, withHeaderRules: withRules }, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map(), { draftId: 'draft-existing' },
    )).rejects.toMatchObject({ code: 'AUTH_REQUIRED', draftId: 'draft-existing', retryable: true });
    expect(fetch.mock.calls[0][0]).toContain('/api/articles/draft-existing/draft');
  });

  it('maps a successful create response body read failure to unknown remote state without PATCH', async () => {
    const fetch = vi.fn().mockResolvedValue({
      status: 201,
      ok: true,
      text: vi.fn().mockRejectedValue(new TypeError('body stream failed')),
    });
    await expect(createZhihuAdapter().saveDraft(
      { fetch, withHeaderRules: withRules }, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map(), {},
    )).rejects.toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', retryable: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('updates an existing draftId without creating another draft', async () => {
    const fetch = vi.fn(async () => response(null, { status: 204 }));
    const adapter = createZhihuAdapter();
    await adapter.saveDraft({ fetch, withHeaderRules: withRules }, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map(), { draftId: 'draft-existing' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain('/api/articles/draft-existing/draft');
  });

  it('preserves the created draftId when PATCH fails and rejects unsafe task IDs', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify({ id: 'draft-1' }), { status: 201 }))
      .mockResolvedValueOnce(response('failed', { status: 500 }));
    const adapter = createZhihuAdapter();
    await expect(adapter.saveDraft({ fetch, withHeaderRules: withRules }, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map(), {}))
      .rejects.toMatchObject({ code: 'DRAFT_UPDATE_FAILED', draftId: 'draft-1', retryable: true });
    for (const draftId of ['token=secret', '../escape', 'x/y', 'draft\n1', '<b>id</b>', 'x'.repeat(129)]) {
      await expect(adapter.saveDraft({ fetch: vi.fn(), withHeaderRules: withRules }, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map(), { draftId }))
        .rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
    }
  });

  it('keeps create success ID when header-rule cleanup fails after PATCH', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify({ id: 'draft-cleanup' }), { status: 201 }))
      .mockResolvedValueOnce(response(null, { status: 204 }));
    const runtime = {
      fetch,
      withHeaderRules: vi.fn(async (_rules, work) => { await work(); throw new Error('DNR cleanup failed'); }),
    };
    await expect(createZhihuAdapter().saveDraft(runtime, { title: '标题', semanticHtml: '<p>正文</p>' }, new Map()))
      .rejects.toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', draftId: 'draft-cleanup', retryable: false });
  });
});
