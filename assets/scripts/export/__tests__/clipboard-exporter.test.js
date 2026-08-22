import { describe, expect, it, vi } from 'vitest';
import * as clipboardExporter from '../clipboard-exporter.js';
import {
  materializeAnimatedCardDecorations,
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
  it('reports failed images with their element instead of silently keeping their src', async () => {
    const image = makeImage('missing.png');
    const result = await materializeClipboardImages([image], {
      isGif: async () => false,
      convert: async () => { throw new Error('missing'); },
      replaceGif: vi.fn(),
    });

    expect(result.successCount).toBe(0);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({ src: 'missing.png', message: 'missing' });
    expect(result.failures[0].element).toBe(image);
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

  it('keeps CDN images untouched without conversion or GIF placeholder', async () => {
    const image = makeImage('https://cdn.example.com/banner.png');
    const convert = vi.fn();
    const result = await materializeClipboardImages([image], {
      isGif: vi.fn(),
      convert,
      replaceGif: vi.fn(),
    });

    expect(result.successCount).toBe(1);
    expect(result.gifCount).toBe(0);
    expect(result.failures).toEqual([]);
    expect(convert).not.toHaveBeenCalled();
    expect(image.getAttribute('src')).toBe('https://cdn.example.com/banner.png');
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

describe('materializeAnimatedCardDecorations', () => {
  function makeDecorationDocument(kinds) {
    const replacements = [];
    const decorations = kinds.map((kind) => ({
      getAttribute: (name) => name === 'data-ogzh-card-animation' ? kind : null,
      replaceWith: (image) => replacements.push({ kind, image })
    }));
    return {
      replacements,
      querySelectorAll: () => decorations,
      createElement: () => {
        const attributes = new Map();
        return {
          setAttribute: (name, value) => attributes.set(name, String(value)),
          getAttribute: (name) => attributes.get(name) ?? null,
          attributes
        };
      }
    };
  }

  it('replaces five animation kinds with cached transparent GIF images', () => {
    const doc = makeDecorationDocument([
      'highlight', 'steps', 'relationship', 'bookmark', 'documents', 'highlight'
    ]);
    const build = vi.fn(({ kind }) => ({
      dataUrl: `data:image/gif;base64,${kind}`,
      width: 32,
      height: 24
    }));

    materializeAnimatedCardDecorations(doc, {
      styleConfig: { gzh: { accent: '#315b4d', line: '#a69c89', soft: '#faf8f1' } },
      build
    });

    expect(build).toHaveBeenCalledTimes(5);
    expect(doc.replacements).toHaveLength(6);
    for (const { kind, image } of doc.replacements) {
      expect(image.getAttribute('data-ogzh-card-gif')).toBe(kind);
      expect(image.getAttribute('src')).toContain('data:image/gif;base64,');
      expect(image.getAttribute('alt')).toBe('');
      expect(image.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('keeps the static DOM fallback when GIF generation fails', () => {
    const doc = makeDecorationDocument(['highlight']);
    materializeAnimatedCardDecorations(doc, { styleConfig: {}, build: () => null });
    expect(doc.replacements).toEqual([]);
  });

  it('preserves the decoration flow styles when replacing it with a GIF', () => {
    const replacements = [];
    const decoration = {
      getAttribute: (name) => {
        if (name === 'data-ogzh-card-animation') return 'documents';
        if (name === 'style') return 'display: block; float: left; margin: 0 10px 15px 0;';
        return null;
      },
      replaceWith: (image) => replacements.push(image)
    };
    const doc = {
      querySelectorAll: () => [decoration],
      createElement: () => {
        const attributes = new Map();
        return {
          setAttribute: (name, value) => attributes.set(name, String(value)),
          getAttribute: (name) => attributes.get(name) ?? null
        };
      }
    };

    materializeAnimatedCardDecorations(doc, {
      styleConfig: {},
      build: () => ({ dataUrl: 'data:image/gif;base64,documents', width: 32, height: 32 })
    });

    expect(replacements[0].getAttribute('style')).toContain('float: left');
    expect(replacements[0].getAttribute('style')).toContain('margin: 0 10px 15px 0');
  });
});

describe('convertOrderedListsToWechatParagraphs', () => {
  it('keeps a historical-document ordered list intact so its links survive', () => {
    expect(clipboardExporter.convertOrderedListsToWechatParagraphs).toBeTypeOf('function');
    if (!clipboardExporter.convertOrderedListsToWechatParagraphs) return;

    const remove = vi.fn();
    const list = {
      children: [],
      closest: (selector) => selector === 'section[data-ogzh-card="history-document"]' ? {} : null,
      remove
    };

    clipboardExporter.convertOrderedListsToWechatParagraphs({
      querySelectorAll: (selector) => selector === 'ol' ? [list] : []
    }, {});

    expect(remove).not.toHaveBeenCalled();
  });
});
