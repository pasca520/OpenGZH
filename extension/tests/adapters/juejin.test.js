import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { createJuejinAdapter } from '../../src/adapters/juejin.js';
import { createDistributionRunner } from '../../src/background/distribution-runner.js';
import { serializeError } from '../../src/core/platform-errors.js';

const fixture = JSON.parse(await readFile(new URL('../fixtures/juejin-imagex-token.json', import.meta.url), 'utf8'));
const withRules = (_rules, work) => work();
const response = (body, init) => new Response(body, init);
const redirect = (status = 302) => status === 0
  ? { status: 0, ok: false, type: 'opaqueredirect' }
  : response('', { status });

describe('Juejin adapter', () => {
  it('checks auth and obtains CSRF from the response header', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify({ data: { user_id: 'u1', user_name: '测试用户' } })))
      .mockResolvedValueOnce(response('', { headers: { 'x-ware-csrf-token': '0,test-csrf,86370000,success,test-session' } }));
    const adapter = createJuejinAdapter();
    await expect(adapter.checkAuth({ fetch })).resolves.toEqual({ authenticated: true, userId: 'u1', username: '测试用户' });
    await expect(adapter.getCsrfToken({ fetch })).resolves.toBe('test-csrf');
    expect(fetch.mock.calls[1][0]).toBe('https://api.juejin.cn/user_api/v1/sys/token');
    expect(fetch.mock.calls[1][1].method).toBe('HEAD');
  });

  it.each([401, 403, 302, 0])('maps auth HTTP/redirect %s to unauthenticated', async (status) => {
    const fetch = vi.fn().mockResolvedValue(redirect(status));
    await expect(createJuejinAdapter().checkAuth({ fetch })).resolves.toEqual({ authenticated: false });
  });

  it('maps only the observed exact business logout envelope to unauthenticated', async () => {
    const logout = JSON.stringify({ err_no: 2, err_msg: '参数错误', data: null });
    await expect(createJuejinAdapter().checkAuth({ fetch: async () => response(logout) }))
      .resolves.toEqual({ authenticated: false });
    for (const body of [
      JSON.stringify({ err_no: 2, err_msg: '参数错误', data: null, extra: true }),
      JSON.stringify({ err_no: 2, err_msg: '其他错误', data: null }),
      JSON.stringify({ err_no: 2, err_msg: '参数错误', data: {} }),
      JSON.stringify({ err_no: '2', err_msg: '参数错误', data: null }),
    ]) {
      await expect(createJuejinAdapter().checkAuth({ fetch: async () => response(body) }))
        .rejects.toMatchObject({ code: 'PLATFORM_CHANGED', retryable: false });
    }
  });

  it('fails closed for auth network, non-OK, and malformed responses', async () => {
    await expect(createJuejinAdapter().checkAuth({ fetch: async () => { throw new TypeError('offline'); } }))
      .rejects.toMatchObject({ code: 'NETWORK_ERROR', retryable: true });
    await expect(createJuejinAdapter().checkAuth({ fetch: async () => response('', { status: 500 }) }))
      .rejects.toMatchObject({ code: 'NETWORK_ERROR', retryable: true });
    await expect(createJuejinAdapter().checkAuth({ fetch: async () => response(JSON.stringify({ data: { user_id: 'bad/id', user_name: 'x' } })) }))
      .rejects.toMatchObject({ code: 'PLATFORM_CHANGED', retryable: false });
  });

  it('maps auth rate limiting to RATE_LIMITED without claiming logout', async () => {
    await expect(createJuejinAdapter().checkAuth({ fetch: async () => response('busy', { status: 429 }) }))
      .rejects.toMatchObject({ code: 'RATE_LIMITED', retryable: true });
  });

  it.each([401, 403, 302, 0])('maps CSRF HTTP/redirect %s to AUTH_REQUIRED', async (status) => {
    const fetch = vi.fn().mockResolvedValue(redirect(status));
    await expect(createJuejinAdapter().getCsrfToken({ fetch })).rejects.toMatchObject({ code: 'AUTH_REQUIRED', retryable: true });
  });

  it('requires a safe CSRF header token', async () => {
    for (const value of ['', '0,,1,success,s', '0,test token,1,success,s', '0,test\ncsrf,1,success,s']) {
      const fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, headers: { get: () => value } });
      await expect(createJuejinAdapter().getCsrfToken({ fetch })).rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
    }
  });

  it('requires the exact five-part CSRF envelope', async () => {
    for (const value of [
      'garbage,valid-token',
      '0,valid-token,1,success,session,extra',
      '1,valid-token,1,success,session',
      '0,valid-token,0,success,session',
      '0,valid-token,12345678901234567,success,session',
      '0,valid-token,1,error,session',
      '0,valid-token,1,success,',
      '0,valid-token,1,success,bad token',
      '0,valid-token,1,success,bad\nsession',
    ]) {
      const fetch = vi.fn().mockResolvedValue({ status: 200, ok: true, headers: { get: () => value } });
      await expect(createJuejinAdapter().getCsrfToken({ fetch })).rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
    }
  });

  it('uploads through ImageX with local CRC32 and returns only an approved CDN URL', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify(fixture.token)))
      .mockResolvedValueOnce(response(JSON.stringify(fixture.apply)))
      .mockResolvedValueOnce(response('', { status: 200 }))
      .mockResolvedValueOnce(response(JSON.stringify(fixture.commit)))
      .mockResolvedValueOnce(response(JSON.stringify(fixture.url)));
    const signAws4 = vi.fn(async () => ({ headers: {
      authorization: 'test-signature', 'x-amz-date': '20260824T000000Z', 'x-amz-security-token': 'test-session-token',
    } }));
    const adapter = createJuejinAdapter({ signAws4, uuid: 'test-uuid', now: () => new Date('2026-08-24T10:00:00+08:00') });
    const runtime = { fetch, withHeaderRules: withRules };
    const blob = new Blob(['png'], { type: 'image/png' });
    const arrayBuffer = vi.spyOn(blob, 'arrayBuffer');
    await expect(adapter.uploadImage(runtime, blob, 'hero.png')).resolves.toBe('https://p3-juejin.byteimg.com/test/store.png');
    expect(arrayBuffer).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      'https://api.juejin.cn/imagex/v2/gen_token?aid=2608&uuid=test-uuid&client=web',
      'https://imagex.bytedanceapi.com/?Action=ApplyImageUpload&Version=2018-08-01&ServiceId=73owjymdk6',
      'https://upload.test.volces.com/test/store.png',
      'https://imagex.bytedanceapi.com/?Action=CommitImageUpload&Version=2018-08-01&SessionKey=test-session-key&ServiceId=73owjymdk6',
      'https://api.juejin.cn/imagex/v2/get_img_url?aid=2608&uuid=test-uuid&uri=test%2Fstore.png&img_type=private',
    ]);
    expect(fetch.mock.calls[2][1].headers['Content-CRC32']).toBe('83180390');
    expect(signAws4.mock.calls.map(([input]) => input.service)).toEqual(['imagex', 'imagex']);
    expect(signAws4.mock.calls.every(([input]) => input.region === 'cn-north-1')).toBe(true);
  });

  it('rejects hostile upload hosts before sending PUT', async () => {
    const hostile = structuredClone(fixture);
    hostile.apply.Result.UploadAddress.UploadHosts = ['uploads.evil.example'];
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify(hostile.token)))
      .mockResolvedValueOnce(response(JSON.stringify(hostile.apply)));
    await expect(createJuejinAdapter({ signAws4: vi.fn(async () => ({ headers: { authorization: 'sig', 'x-amz-date': '20260824T020000Z' } })), now: () => new Date('2026-08-24T10:00:00+08:00') }).uploadImage(
      { fetch, withHeaderRules: withRules }, new Blob(['png']), 'hero.png',
    )).rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('sanitizes ImageX token and transport failures without exposing temporary credentials', async () => {
    const tokenReadFailure = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      text: vi.fn().mockRejectedValue(new Error('AccessKeyId=test-access-key SecretAccessKey=test-secret-key')),
    });
    await expect(createJuejinAdapter({ now: () => new Date('2026-08-24T10:00:00+08:00') }).uploadImage(
      { fetch: tokenReadFailure, withHeaderRules: withRules }, new Blob(['png']), 'hero.png',
    )).rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
    const tokenFetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify(fixture.token)))
      .mockRejectedValueOnce(new Error('SessionKey=test-session-key SecretAccessKey=test-secret-key'));
    const signAws4 = vi.fn(async () => ({ headers: { authorization: 'sig', 'x-amz-date': '20260824T020000Z' } }));
    const error = await createJuejinAdapter({ signAws4, now: () => new Date('2026-08-24T10:00:00+08:00') }).uploadImage(
      { fetch: tokenFetch, withHeaderRules: withRules }, new Blob(['png']), 'hero.png',
    ).catch((value) => value);
    expect(error).toMatchObject({ code: 'IMAGE_UPLOAD_FAILED' });
    expect(JSON.stringify(error)).not.toMatch(/test-session-key|test-secret-key/);
  });

  it('maps Apply and Commit transport failures without exposing temporary credentials', async () => {
    const signAws4 = vi.fn(async () => ({ headers: { authorization: 'sig', 'x-amz-date': '20260824T020000Z' } }));
    const applyFailureFetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify(fixture.token)))
      .mockRejectedValueOnce(new Error('SecretAccessKey=test-secret-key SessionKey=test-session-key'));
    const applyError = await createJuejinAdapter({ signAws4, now: () => new Date('2026-08-24T10:00:00+08:00') }).uploadImage(
      { fetch: applyFailureFetch, withHeaderRules: withRules }, new Blob(['png']), 'hero.png',
    ).catch((value) => value);
    expect(applyError).toMatchObject({ code: 'IMAGE_UPLOAD_FAILED' });
    expect(JSON.stringify(applyError)).not.toMatch(/test-secret-key|test-session-key/);

    const commitFailureFetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify(fixture.token)))
      .mockResolvedValueOnce(response(JSON.stringify(fixture.apply)))
      .mockResolvedValueOnce(response('', { status: 200 }))
      .mockRejectedValueOnce(new Error('SecretAccessKey=test-secret-key SessionKey=test-session-key'));
    const commitError = await createJuejinAdapter({ signAws4, now: () => new Date('2026-08-24T10:00:00+08:00') }).uploadImage(
      { fetch: commitFailureFetch, withHeaderRules: withRules }, new Blob(['png']), 'hero.png',
    ).catch((value) => value);
    expect(commitError).toMatchObject({ code: 'IMAGE_UPLOAD_FAILED' });
    expect(JSON.stringify(commitError)).not.toMatch(/test-secret-key|test-session-key/);
  });

  it.each([401, 403])('maps Apply %s to an image failure instead of AUTH_REQUIRED', async (status) => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify(fixture.token)))
      .mockResolvedValueOnce(response('unauthorized', { status }));
    const adapter = createJuejinAdapter({ signAws4: vi.fn(async () => ({ headers: { authorization: 'sig', 'x-amz-date': '20260824T020000Z' } })), now: () => new Date('2026-08-24T10:00:00+08:00') });
    await expect(adapter.uploadImage({ fetch, withHeaderRules: withRules }, new Blob(['png']), 'hero.png'))
      .rejects.toMatchObject({ code: 'IMAGE_UPLOAD_FAILED', retryable: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403])('maps Commit %s to an image failure instead of AUTH_REQUIRED', async (status) => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify(fixture.token)))
      .mockResolvedValueOnce(response(JSON.stringify(fixture.apply)))
      .mockResolvedValueOnce(response('', { status: 200 }))
      .mockResolvedValueOnce(response('unauthorized', { status }));
    const adapter = createJuejinAdapter({ signAws4: vi.fn(async () => ({ headers: { authorization: 'sig', 'x-amz-date': '20260824T020000Z' } })), now: () => new Date('2026-08-24T10:00:00+08:00') });
    await expect(adapter.uploadImage({ fetch, withHeaderRules: withRules }, new Blob(['png']), 'hero.png'))
      .rejects.toMatchObject({ code: 'IMAGE_UPLOAD_FAILED', retryable: true });
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it.each([401, 403])('maps TOS PUT %s to an image failure instead of AUTH_REQUIRED', async (status) => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify(fixture.token)))
      .mockResolvedValueOnce(response(JSON.stringify(fixture.apply)))
      .mockResolvedValueOnce(response('unauthorized', { status }));
    const adapter = createJuejinAdapter({ signAws4: vi.fn(async () => ({ headers: { authorization: 'sig', 'x-amz-date': '20260824T020000Z' } })), now: () => new Date('2026-08-24T10:00:00+08:00') });
    await expect(adapter.uploadImage({ fetch, withHeaderRules: withRules }, new Blob(['png']), 'hero.png'))
      .rejects.toMatchObject({ code: 'IMAGE_UPLOAD_FAILED', retryable: true });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['volces.com', 'base host'],
    ['uploads.volces.com.evil.example', 'lookalike host'],
    ['uploads.evil.example', 'foreign host'],
  ])('rejects %s returned as an upload host (%s)', async (host) => {
    const hostile = structuredClone(fixture);
    hostile.apply.Result.UploadAddress.UploadHosts = [host];
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(JSON.stringify(hostile.token)))
      .mockResolvedValueOnce(response(JSON.stringify(hostile.apply)));
    await expect(createJuejinAdapter({ signAws4: vi.fn(async () => ({ headers: { authorization: 'sig', 'x-amz-date': '20260824T020000Z' } })), now: () => new Date('2026-08-24T10:00:00+08:00') }).uploadImage(
      { fetch, withHeaderRules: withRules }, new Blob(['png']), 'hero.png',
    )).rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('rejects unsafe StoreUri, failed commit status, and unapproved image URLs', async () => {
    for (const storeUri of ['../escape.png', 'safe?x=1', 'safe#x', 'safe%2Fname']) {
      const hostile = structuredClone(fixture);
      hostile.apply.Result.UploadAddress.StoreInfos[0].StoreUri = storeUri;
      const fetch = vi.fn()
        .mockResolvedValueOnce(response(JSON.stringify(hostile.token)))
        .mockResolvedValueOnce(response(JSON.stringify(hostile.apply)));
      await expect(createJuejinAdapter({ now: () => new Date('2026-08-24T10:00:00+08:00') }).uploadImage({ fetch, withHeaderRules: withRules }, new Blob(['png']), 'hero.png'))
        .rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
      expect(fetch).toHaveBeenCalledTimes(2);
    }
  });

  it('creates an empty-metadata Markdown draft and maps HTML images without touching code', async () => {
    const portableMarkdown = '正文\n\n![图](img://hero)\n\n`img://hero`\n\n```js\nimg://hero\n```\n\n<div><img src="img://hero"></div>';
    const fetch = vi.fn()
      .mockResolvedValueOnce(response('', { headers: { 'x-ware-csrf-token': '0,test-csrf,1,success,s' } }))
      .mockResolvedValueOnce(response(JSON.stringify({ err_no: 0, data: { id: 'draft-1' } })));
    const result = await createJuejinAdapter().saveDraft(
      { fetch, withHeaderRules: withRules },
      { title: '标题', portableMarkdown },
      new Map([['img://hero', 'https://p3-juejin.byteimg.com/test/store.png']]),
    );
    expect(result).toEqual({ draftId: 'draft-1', draftUrl: 'https://juejin.cn/editor/drafts/draft-1' });
    const body = JSON.parse(fetch.mock.calls[1][1].body);
    expect(body).toMatchObject({ brief_content: '', category_id: '0', cover_image: '', edit_type: 10, html_content: 'deprecated', link_url: '', tag_ids: [], title: '标题' });
    expect(body.mark_content).toContain('![图](https://p3-juejin.byteimg.com/test/store.png)');
    expect(body.mark_content).toContain('`img://hero`');
    expect(body.mark_content).toContain('```js\nimg://hero\n```');
    expect(body.mark_content).toContain('<div><img src="https://p3-juejin.byteimg.com/test/store.png"></div>');
  });

  it('maps create interruption, body read failure, and 5xx to unknown without retry', async () => {
    for (const createResponse of [
      new TypeError('Failed to fetch'),
      { status: 201, ok: true, text: vi.fn().mockRejectedValue(new TypeError('stream')) },
      response('server error', { status: 500 }),
    ]) {
      const fetch = vi.fn().mockResolvedValueOnce(response('', { headers: { 'x-ware-csrf-token': '0,test-csrf,1,success,s' } }));
      if (createResponse instanceof Error) fetch.mockRejectedValueOnce(createResponse);
      else fetch.mockResolvedValueOnce(createResponse);
      await expect(createJuejinAdapter().saveDraft({ fetch, withHeaderRules: withRules }, { title: '标题', portableMarkdown: '正文' }, new Map()))
        .rejects.toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', retryable: false });
      expect(fetch).toHaveBeenCalledTimes(2);
    }
  });

  it('maps create auth, rate limit, and deterministic business failures', async () => {
    for (const [createResponse, expected] of [
      [redirect(302), 'AUTH_REQUIRED'],
      [response(JSON.stringify({ err_no: 403, err_msg: 'expired' })), 'AUTH_REQUIRED'],
      [response(JSON.stringify({ err_no: 429, err_msg: 'busy' })), 'RATE_LIMITED'],
      [response(JSON.stringify({ err_no: 1001, err_msg: 'bad article' })), 'DRAFT_CREATE_FAILED'],
    ]) {
      const fetch = vi.fn()
        .mockResolvedValueOnce(response('', { headers: { 'x-ware-csrf-token': '0,test-csrf,1,success,s' } }))
        .mockResolvedValueOnce(createResponse);
      await expect(createJuejinAdapter().saveDraft({ fetch, withHeaderRules: withRules }, { title: '标题', portableMarkdown: '正文' }, new Map()))
        .rejects.toMatchObject({ code: expected });
    }
  });

  it.each([
    [400, 'DRAFT_CREATE_FAILED', 'draft-400'],
    [500, 'UNKNOWN_REMOTE_STATE', 'draft-500'],
  ])('retains safe draft ID from HTTP %s create responses as non-retryable state', async (status, code, draftId) => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response('', { headers: { 'x-ware-csrf-token': '0,test-csrf,1,success,s' } }))
      .mockResolvedValueOnce(response(JSON.stringify({ err_no: 1001, data: { id: draftId } }), { status }));
    const error = await createJuejinAdapter().saveDraft({ fetch, withHeaderRules: withRules }, { title: '标题', portableMarkdown: '正文' }, new Map())
      .catch((value) => value);
    expect(error).toMatchObject({ code, draftId, retryable: false });
    expect(serializeError(error)).toMatchObject({ code, draftId, retryable: false });

    const states = [];
    const runner = createDistributionRunner({
      adapterFactories: { juejin: () => ({
        id: 'juejin', checkAuth: async () => ({ authenticated: true }), uploadImage: vi.fn(), saveDraft: async () => { throw error; },
      }) },
      runtimeFactory: () => ({ requestImage: async () => new Blob(['png']) }),
      onState: (state) => states.push(state), persist: vi.fn(async () => {}),
    });
    const article = {
      schemaVersion: 1, documentId: 'doc-1', title: '标题', markdown: '正文', portableMarkdown: '正文',
      semanticHtml: '<p>正文</p>', wechatHtml: '<p>正文</p>', images: [], createdAt: 1787529600000,
    };
    const result = await runner.runBatch({ taskId: 'task-id', operationId: 'op-id', article, platformIds: ['juejin'] });
    expect(result.results[0]).toMatchObject({ draftId, error: { code, draftId, retryable: false } });
    expect(states).toContainEqual(expect.objectContaining({ state: code === 'UNKNOWN_REMOTE_STATE' ? 'unknown' : 'failed', draftId }));
  });

  it.each([403, 429, 1001])('retains a draft ID from business err_no %s as UNKNOWN_REMOTE_STATE', async (errNo) => {
    const draftId = `draft-business-${errNo}`;
    const fetch = vi.fn()
      .mockResolvedValueOnce(response('', { headers: { 'x-ware-csrf-token': '0,test-csrf,1,success,s' } }))
      .mockResolvedValueOnce(response(JSON.stringify({ err_no: errNo, data: { id: draftId } })));
    const error = await createJuejinAdapter().saveDraft({ fetch, withHeaderRules: withRules }, { title: '标题', portableMarkdown: '正文' }, new Map())
      .catch((value) => value);
    expect(error).toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', draftId, retryable: false });
    expect(serializeError(error)).toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', draftId, retryable: false });

    const states = [];
    const runner = createDistributionRunner({
      adapterFactories: { juejin: () => ({
        id: 'juejin', checkAuth: async () => ({ authenticated: true }), uploadImage: vi.fn(), saveDraft: async () => { throw error; },
      }) },
      runtimeFactory: () => ({ requestImage: async () => new Blob(['png']) }),
      onState: (state) => states.push(state), persist: vi.fn(async () => {}),
    });
    const article = {
      schemaVersion: 1, documentId: 'doc-1', title: '标题', markdown: '正文', portableMarkdown: '正文',
      semanticHtml: '<p>正文</p>', wechatHtml: '<p>正文</p>', images: [], createdAt: 1787529600000,
    };
    const result = await runner.runBatch({ taskId: `task-business-${errNo}`, operationId: `op-business-${errNo}`, article, platformIds: ['juejin'] });
    expect(result.results[0]).toMatchObject({ state: 'unknown', draftId, error: { code: 'UNKNOWN_REMOTE_STATE', draftId, retryable: false } });
    expect(states).toContainEqual(expect.objectContaining({ state: 'unknown', draftId }));
  });

  it('maps HTTP 429 to RATE_LIMITED before parsing a malformed body', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response('', { headers: { 'x-ware-csrf-token': '0,test-csrf,1,success,s' } }))
      .mockResolvedValueOnce(response('not-json', { status: 429 }));
    await expect(createJuejinAdapter().saveDraft({ fetch, withHeaderRules: withRules }, { title: '标题', portableMarkdown: '正文' }, new Map()))
      .rejects.toMatchObject({ code: 'RATE_LIMITED', retryable: true });
  });

  it('preserves draft ID when DNR cleanup fails after remote create', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response('', { headers: { 'x-ware-csrf-token': '0,test-csrf,1,success,s' } }))
      .mockResolvedValueOnce(response(JSON.stringify({ err_no: 0, data: { id: 'draft-cleanup' } })));
    const runtime = { fetch, withHeaderRules: vi.fn(async (_rules, work) => { await work(); throw new Error('cleanup failed'); }) };
    await expect(createJuejinAdapter().saveDraft(runtime, { title: '标题', portableMarkdown: '正文' }, new Map()))
      .rejects.toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', draftId: 'draft-cleanup', retryable: false });
  });

  it.each(['0', 'token=secret', '../escape', 'x/y', '<b>id</b>', 'x'.repeat(129)])('rejects unsafe draft ID %s', async (id) => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response('', { headers: { 'x-ware-csrf-token': '0,test-csrf,1,success,s' } }))
      .mockResolvedValueOnce(response(JSON.stringify({ err_no: 0, data: { id } })));
    await expect(createJuejinAdapter().saveDraft({ fetch, withHeaderRules: withRules }, { title: '标题', portableMarkdown: '正文' }, new Map()))
      .rejects.toMatchObject({ code: 'PLATFORM_CHANGED' });
  });
});
