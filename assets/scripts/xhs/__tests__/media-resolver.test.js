import { describe, expect, it, vi } from 'vitest';
import { blobToDataUrl, extractFirstFrame, inlineCardMedia, resolveMediaRefToDataUrl } from '../media-resolver.js';

describe('xhs media resolver', () => {
  it('reads img protocol from the existing ImageStore', async () => {
    const imageStore = { getImageBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' })) };
    const url = await resolveMediaRefToDataUrl('img://abc', { imageStore, blobToDataUrl: async () => 'data:image/png;base64,eA==' });
    expect(imageStore.getImageBlob).toHaveBeenCalledWith('abc');
    expect(url).toMatch(/^data:image\/png/);
  });

  it('fails closed when a remote image cannot be fetched with CORS', async () => {
    await expect(resolveMediaRefToDataUrl('https://cdn.example/a.png', {
      fetchImpl: vi.fn(async () => { throw new TypeError('Failed to fetch'); })
    })).rejects.toMatchObject({ code: 'remote-image-blocked' });
  });

  it('returns an injected first-frame PNG for gif and video', async () => {
    const decode = vi.fn(async () => 'data:image/png;base64,frame');
    expect(await extractFirstFrame(new Blob(['gif'], { type: 'image/gif' }), { decode })).toContain('image/png');
    expect(decode).toHaveBeenCalledOnce();
  });

  it('passes data urls through untouched and reports missing local media', async () => {
    expect(await resolveMediaRefToDataUrl('data:image/png;base64,AA==')).toBe('data:image/png;base64,AA==');
    const imageStore = { getImageBlob: vi.fn(async () => null) };
    await expect(resolveMediaRefToDataUrl('img://missing', { imageStore })).rejects.toMatchObject({ code: 'media-not-ready' });
  });

  it('rejects opaque or non-2xx remote responses', async () => {
    const opaque = { ok: false, type: 'opaque' };
    await expect(resolveMediaRefToDataUrl('https://cdn.example/a.png', { fetchImpl: vi.fn(async () => opaque) }))
      .rejects.toMatchObject({ code: 'remote-image-blocked' });
    const notFound = { ok: false, type: 'cors', status: 404 };
    await expect(resolveMediaRefToDataUrl('https://cdn.example/a.png', { fetchImpl: vi.fn(async () => notFound) }))
      .rejects.toMatchObject({ code: 'remote-image-blocked' });
  });

  it('converts blobs with FileReader', async () => {
    class FakeFileReader {
      readAsDataURL(blob) {
        this.result = `data:${blob.type || 'application/octet-stream'};base64,xxx`;
        setTimeout(() => this.onload(), 0);
      }
    }
    expect(await blobToDataUrl(new Blob(['a'], { type: 'image/png' }), FakeFileReader)).toBe('data:image/png;base64,xxx');
  });
});

describe('xhs media first frame resource release', () => {
  function makeFakeVideo(mode) {
    const listeners = {};
    const video = {
      muted: false,
      playsInline: false,
      preload: '',
      currentTime: 0,
      readyState: 0,
      videoWidth: 640,
      videoHeight: 360,
      addEventListener(name, fn) { (listeners[name] ||= []).push(fn); },
      removeEventListener(name, fn) { listeners[name] = (listeners[name] || []).filter((item) => item !== fn); },
      fire(name) { (listeners[name] || []).slice().forEach((fn) => fn()); }
    };
    Object.defineProperty(video, 'src', {
      set() {
        video._src = 'blob:fake';
        if (mode === 'success') {
          setTimeout(() => {
            video.readyState = 2;
            video.fire('seeked');
          }, 0);
        } else if (mode === 'error') {
          setTimeout(() => video.fire('error'), 0);
        }
      },
      get() { return video._src; }
    });
    return video;
  }

  function makeFakeCanvas() {
    return {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn() }),
      toBlob: (callback) => callback(new Blob(['png'], { type: 'image/png' }))
    };
  }

  const baseOptions = (mode) => ({
    createObjectURL: vi.fn(() => 'blob:fake'),
    revokeObjectURL: vi.fn(),
    videoFactory: () => makeFakeVideo(mode),
    canvasFactory: () => makeFakeCanvas(),
    blobToDataUrl: async () => 'data:image/png;base64,v',
    timeoutMs: 30
  });

  it('revokes the object url on success', async () => {
    const options = baseOptions('success');
    const url = await extractFirstFrame(new Blob(['v'], { type: 'video/mp4' }), options);
    expect(url).toContain('image/png');
    expect(options.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  it('revokes the object url on failure', async () => {
    const options = baseOptions('error');
    await expect(extractFirstFrame(new Blob(['v'], { type: 'video/mp4' }), options))
      .rejects.toMatchObject({ code: 'media-not-ready' });
    expect(options.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  it('revokes the object url on timeout', async () => {
    const options = baseOptions('timeout');
    await expect(extractFirstFrame(new Blob(['v'], { type: 'video/mp4' }), options))
      .rejects.toMatchObject({ code: 'media-not-ready' });
    expect(options.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });
});

describe('xhs card media inlining', () => {
  function makeFakeCard() {
    const makeElement = (attrs, blockId) => {
      const element = {
        tagName: 'IMG',
        src: null,
        attributes: { ...attrs },
        parentNode: { parentNode: { getAttribute: () => blockId, tagName: 'DIV' } },
        getAttribute(name) { return this.attributes[name] ?? null; },
        setAttribute(name, value) {
          this.attributes[name] = String(value);
          if (name === 'src') this.src = String(value);
        },
        removeAttribute(name) {
          delete this.attributes[name];
          if (name === 'src') this.src = null;
        }
      };
      return element;
    };
    const good = makeElement({ 'data-media-ref': 'img://good' }, 'p-1');
    const bad = makeElement({ 'data-media-ref': 'https://cdn.example/x.png' }, 'p-2');
    const card = {
      cloneNode() {
        return {
          querySelectorAll: () => [good, bad],
          setAttribute() {},
          removeAttribute() {}
        };
      }
    };
    return card;
  }

  it('inlines resolvable media and reports failures as issues without dropping nodes', async () => {
    const imageStore = { getImageBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' })) };
    const result = await inlineCardMedia(makeFakeCard(), {
      imageStore,
      fetchImpl: vi.fn(async () => { throw new TypeError('blocked'); }),
      blobToDataUrl: async () => 'data:image/png;base64,ok'
    });
    const good = result.clone.querySelectorAll()[0];
    expect(good.src).toContain('data:image/png');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toMatchObject({ code: 'remote-image-blocked', blockId: 'p-2' });
    const bad = result.clone.querySelectorAll()[1];
    expect(bad.getAttribute('data-media-ref')).toBe('https://cdn.example/x.png');
  });
});
