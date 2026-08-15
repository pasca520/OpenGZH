import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isRemoteImagePath,
  fetchRemoteImageBlob,
  REMOTE_IMAGE_PROXY_BUILDERS,
} from '../remote-image-loader.js';

function makeResponse(blob, { ok = true, status = 200 } = {}) {
  return { ok, status, blob: async () => blob };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isRemoteImagePath', () => {
  it('recognizes http/https and protocol-relative URLs', () => {
    expect(isRemoteImagePath('https://cdn.example.com/a.png')).toBe(true);
    expect(isRemoteImagePath('http://cdn.example.com/a.png')).toBe(true);
    expect(isRemoteImagePath('//cdn.example.com/a.png')).toBe(true);
  });

  it('rejects local paths and other protocols', () => {
    expect(isRemoteImagePath('images/a.png')).toBe(false);
    expect(isRemoteImagePath('img://abc-1')).toBe(false);
    expect(isRemoteImagePath('data:image/png;base64,abc')).toBe(false);
    expect(isRemoteImagePath('')).toBe(false);
  });
});

describe('fetchRemoteImageBlob', () => {
  it('returns the blob when the direct fetch succeeds', async () => {
    const blob = new Blob(['img'], { type: 'image/png' });
    vi.stubGlobal('fetch', vi.fn(async () => makeResponse(blob)));

    const result = await fetchRemoteImageBlob('https://cdn.example.com/a.png');
    expect(result).toBe(blob);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('falls back to a CORS proxy when the direct fetch fails', async () => {
    const blob = new Blob(['img'], { type: 'image/png' });
    const proxyUrl = REMOTE_IMAGE_PROXY_BUILDERS[0]('https://cdn.example.com/a.png');

    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (url === 'https://cdn.example.com/a.png') throw new TypeError('Failed to fetch');
      if (url === proxyUrl) return makeResponse(blob);
      throw new TypeError('unexpected proxy');
    }));

    const result = await fetchRemoteImageBlob('https://cdn.example.com/a.png');
    expect(result).toBe(blob);
  });

  it('throws a descriptive error when every strategy fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));

    await expect(fetchRemoteImageBlob('https://cdn.example.com/a.png'))
      .rejects.toThrow(/远程图片加载失败/);
  });

  it('normalizes protocol-relative URLs against https', async () => {
    const blob = new Blob(['img'], { type: 'image/png' });
    const fetchMock = vi.fn(async (url) => {
      if (url === 'https://cdn.example.com/a.png') return makeResponse(blob);
      throw new TypeError('unexpected');
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchRemoteImageBlob('//cdn.example.com/a.png');
    expect(result).toBe(blob);
    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example.com/a.png', expect.anything());
  });

  it('never proxies blob: URLs', async () => {
    const blob = new Blob(['img'], { type: 'image/png' });
    vi.stubGlobal('fetch', vi.fn(async () => makeResponse(blob)));

    const result = await fetchRemoteImageBlob('blob:https://localhost/abc-123');
    expect(result).toBe(blob);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
