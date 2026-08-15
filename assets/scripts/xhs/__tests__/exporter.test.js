import { expect, it, vi } from 'vitest';
import { buildXhsPngFilename, downloadBlob, exportXhsPage, exportXhsSet } from '../exporter.js';

const cards = [{ id: 'cover' }, { id: 'page-2' }];
const settings = { articleTitle: '测试文章' };

it('blocks zip when any page is invalid but keeps valid single-page export', async () => {
  const result = await exportXhsSet(cards, settings, {
    validateSet: async () => ({ ok: false, issues: [{ pageIndex: 1, code: 'overflow-y', message: '第 2 页溢出' }], validPageIndexes: [0] }),
    rasterize: async () => new Blob(['png'], { type: 'image/png' })
  });
  expect(result.ok).toBe(false);
  expect(result.issues[0].message).toContain('第 2 页');
});

it('names cover and body pages in upload order', () => {
  expect(buildXhsPngFilename(1, 8)).toBe('01-封面.png');
  expect(buildXhsPngFilename(2, 8)).toBe('02.png');
});

it('pads page names to the total width and warns above the upload threshold', async () => {
  expect(buildXhsPngFilename(1, 12)).toBe('01-封面.png');
  expect(buildXhsPngFilename(11, 12)).toBe('11.png');
  const manyCards = Array.from({ length: 20 }, (_, index) => ({ id: `p-${index}` }));
  const rasterize = vi.fn(async () => new Blob(['png'], { type: 'image/png' }));
  const result = await exportXhsSet(manyCards, settings, {
    validateSet: async () => ({ ok: true, issues: [], validPageIndexes: manyCards.map((_, index) => index) }),
    rasterize
  });
  expect(result.ok).toBe(true);
  expect(result.warning).toContain('可能超出当前客户端单篇上传能力');
  expect(rasterize).toHaveBeenCalledTimes(20);
  expect(result.blob.type).toBe('application/zip');
});

it('stops the set export on the first rasterize failure without a partial zip', async () => {
  const rasterize = vi.fn(async (card) => {
    if (card.id === 'page-2') throw Object.assign(new Error('第 2 页解码失败'), { code: 'capture-failed', pageIndex: 1 });
    return new Blob(['png'], { type: 'image/png' });
  });
  const result = await exportXhsSet(cards, settings, {
    validateSet: async () => ({ ok: true, issues: [], validPageIndexes: [0, 1] }),
    rasterize
  });
  expect(result.ok).toBe(false);
  expect(result.completedPageIndexes).toEqual([0]);
  expect(result.issues[0].code).toBe('capture-failed');
  expect(result.blob).toBeUndefined();
});

it('exports a single page only after validation passes', async () => {
  const rasterize = vi.fn(async () => new Blob(['png'], { type: 'image/png' }));
  const blocked = await exportXhsPage({ id: 'cover' }, { pageNumber: 1, totalPages: 4 }, {
    validateCard: async () => [{ code: 'overflow-y', pageIndex: 0, message: '第 1 页溢出' }],
    rasterize,
    download: false
  });
  expect(blocked.ok).toBe(false);
  expect(rasterize).not.toHaveBeenCalled();
  const passed = await exportXhsPage({ id: 'cover' }, { pageNumber: 1, totalPages: 4 }, {
    validateCard: async () => [],
    rasterize,
    download: false
  });
  expect(passed.ok).toBe(true);
  expect(passed.blob.type).toBe('image/png');
});

it('downloads through an injected document', () => {
  const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
  const documentRef = {
    createElement: vi.fn(() => anchor),
    body: { appendChild: vi.fn() }
  };
  const urlSpy = vi.fn(() => 'blob:fake');
  const revokeSpy = vi.fn();
  vi.stubGlobal('URL', { createObjectURL: urlSpy, revokeObjectURL: revokeSpy });
  downloadBlob(new Blob(['x']), '01-封面.png', documentRef);
  expect(anchor.download).toBe('01-封面.png');
  expect(anchor.href).toBe('blob:fake');
  expect(anchor.click).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
