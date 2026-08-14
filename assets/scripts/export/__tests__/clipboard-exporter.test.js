import { describe, expect, it, vi } from 'vitest';
import {
  materializeClipboardImages,
  materializeMarkdownTables,
} from '../clipboard-exporter.js';

function makeImage(src) {
  const attributes = new Map([['src', src]]);
  return {
    getAttribute: (name) => attributes.get(name) || null,
    setAttribute: (name, value) => attributes.set(name, value),
    attributes,
  };
}

describe('materializeClipboardImages', () => {
  it('reports failed images instead of silently keeping their src', async () => {
    const image = makeImage('missing.png');
    const result = await materializeClipboardImages([image], {
      isGif: async () => false,
      convert: async () => { throw new Error('missing'); },
      replaceGif: vi.fn(),
    });

    expect(result.successCount).toBe(0);
    expect(result.failures).toEqual([{ src: 'missing.png', message: 'missing' }]);
    expect(image.getAttribute('src')).toBe('missing.png');
  });

  it('replaces GIFs through the existing placeholder policy', async () => {
    const image = makeImage('animation.gif');
    const replaceGif = vi.fn();
    const result = await materializeClipboardImages([image], {
      isGif: async () => true,
      convert: vi.fn(),
      replaceGif,
    });

    expect(result.gifCount).toBe(1);
    expect(result.failures).toEqual([]);
    expect(replaceGif).toHaveBeenCalledWith(image);
  });
});

describe('materializeMarkdownTables', () => {
  it('replaces a marked table with a retina PNG and accessible alt text', async () => {
    const replacement = { attributes: new Map(), setAttribute(name, value) { this.attributes.set(name, value); } };
    const table = {
      ownerDocument: { createElement: () => replacement },
      getAttribute: () => 'margin: 24px 0;',
      querySelectorAll(selector) {
        if (selector === 'th') return [{ textContent: '名称' }, { textContent: '状态' }];
        if (selector === 'tbody tr') return [{}, {}];
        return [];
      },
      replaceWith: vi.fn(),
    };
    const renderTable = vi.fn(async () => ({ blob: new Blob(['png'], { type: 'image/png' }) }));

    await materializeMarkdownTables([table], {
      background: '#fff',
      renderTable,
      toDataURL: async () => 'data:image/png;base64,cG5n',
    });

    expect(renderTable).toHaveBeenCalledWith(table, { background: '#fff' });
    expect(replacement.attributes.get('src')).toBe('data:image/png;base64,cG5n');
    expect(replacement.attributes.get('alt')).toBe('表格：名称、状态，共 2 行');
    expect(replacement.attributes.get('data-table-image')).toBe('true');
    expect(table.replaceWith).toHaveBeenCalledWith(replacement);
  });

  it('identifies the failed table by one-based index', async () => {
    const table = {
      querySelectorAll: () => [],
      getAttribute: () => '',
    };

    await expect(materializeMarkdownTables([table, table], {
      renderTable: async () => { throw new Error('canvas'); },
      toDataURL: async () => '',
    })).rejects.toMatchObject({ tableIndex: 1, message: '第 1 个表格转换失败：canvas' });
  });
});
