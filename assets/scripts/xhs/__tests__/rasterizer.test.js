import { expect, it, vi } from 'vitest';
import { buildXhsSvgDataUrl, getXhsCanvasSize, rasterizeXhsCard } from '../rasterizer.js';

it('always exports 1080x1440', () => {
  expect(getXhsCanvasSize()).toEqual({ width: 1080, height: 1440 });
});

it('uses a self-contained svg data url', () => {
  const url = buildXhsSvgDataUrl('<div>中文</div>', '<style>@font-face{src:url(data:font/woff2;base64,eA==)}</style>');
  expect(url).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
  expect(decodeURIComponent(url.split(',')[1])).not.toContain('http');
});

it('removes the capture stage even when decoding fails', async () => {
  const cleanup = vi.fn();
  const card = { cloneNode: () => ({ querySelectorAll: () => [] }) };
  await expect(rasterizeXhsCard(card, {
    mountStage: () => ({ element: card, cleanup }),
    inlineMedia: async () => ({ clone: card, issues: [] }),
    embedFonts: async () => '',
    copyStyles: () => undefined,
    serialize: () => '<div xmlns="http://www.w3.org/1999/xhtml">card</div>',
    loadImage: async () => { throw new Error('decode failed'); }
  })).rejects.toThrow('decode failed');
  expect(cleanup).toHaveBeenCalledOnce();
});

it('rejects capture when external references survive serialization', async () => {
  const card = { cloneNode: () => ({ querySelectorAll: () => [] }) };
  await expect(rasterizeXhsCard(card, {
    mountStage: () => ({ element: card, cleanup: vi.fn() }),
    inlineMedia: async () => ({ clone: card, issues: [] }),
    embedFonts: async () => '',
    copyStyles: () => undefined,
    serialize: () => '<div xmlns="http://www.w3.org/1999/xhtml"><img src="https://cdn.example/a.png"></div>',
    loadImage: vi.fn()
  })).rejects.toMatchObject({ code: 'capture-failed' });
});

it('rejects on media issues before rasterizing', async () => {
  const card = { cloneNode: () => ({ querySelectorAll: () => [] }) };
  await expect(rasterizeXhsCard(card, {
    mountStage: () => ({ element: card, cleanup: vi.fn() }),
    inlineMedia: async () => ({
      clone: card,
      issues: [{ code: 'remote-image-blocked', blockId: 'p-1', message: '远程图片无法安全读取' }]
    }),
    embedFonts: async () => '',
    copyStyles: () => undefined,
    serialize: () => '<div/>',
    loadImage: vi.fn()
  })).rejects.toMatchObject({ code: 'remote-image-blocked' });
});

it('rasterizes through the injected pipeline to a png blob', async () => {
  const cleanup = vi.fn();
  const card = { cloneNode: () => ({ querySelectorAll: () => [] }), getAttribute: () => 'minimal-white' };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ({ scale: vi.fn(), drawImage: vi.fn() }),
    toBlob: (callback) => callback(new Blob(['png'], { type: 'image/png' }))
  };
  const blob = await rasterizeXhsCard(card, {
    mountStage: () => ({ element: card, cleanup }),
    inlineMedia: async () => ({ clone: card, issues: [] }),
    embedFonts: async () => '<style>@font-face{}</style>',
    copyStyles: () => undefined,
    serialize: () => '<div xmlns="http://www.w3.org/1999/xhtml">card</div>',
    loadImage: async () => ({ width: 540, height: 720 }),
    canvasFactory: () => canvas
  });
  expect(blob.type).toBe('image/png');
  expect(canvas.width).toBe(1080);
  expect(canvas.height).toBe(1440);
  expect(cleanup).toHaveBeenCalledOnce();
});
