import { describe, expect, it, vi } from 'vitest';
import * as clipboardExporter from '../clipboard-exporter.js';
import {
  deferLocalImages,
  materializeAnimatedCardDecorations,
  materializeClipboardImages,
  materializeMarkdownTables,
  prepareWechatContent,
  writeWechatClipboard,
} from '../clipboard-exporter.js';

function makeImage(src, extraAttributes = {}) {
  const attributes = new Map([['src', src], ...Object.entries(extraAttributes)]);
  return {
    getAttribute: (name) => attributes.get(name) || null,
    setAttribute: (name, value) => attributes.set(name, value),
    attributes,
  };
}

describe('deferLocalImages', () => {
  it('defers indexed local images while preserving data URLs and reporting anonymous blobs', () => {
    const images = [
      makeImage('blob:rendered', { 'data-image-id': 'hero' }),
      makeImage('data:image/png;base64,cG5n', { 'data-image-id': 'stale' }),
      makeImage('blob:anonymous'),
    ];

    const result = deferLocalImages(images);

    expect(images.map((image) => image.getAttribute('src'))).toEqual([
      'img://hero',
      'data:image/png;base64,cG5n',
      'blob:anonymous',
    ]);
    expect(result.failures).toEqual(['blob:anonymous']);
  });
});

describe('writeWechatClipboard', () => {
  it('writes prepared HTML and plain text exactly once', async () => {
    const writes = [];
    class TestClipboardItem {
      constructor(data) {
        this.data = data;
      }
    }
    class TestBlob {
      constructor(parts, options) {
        this.parts = parts;
        this.type = options.type;
      }
    }
    const clipboard = {
      write: vi.fn(async (items) => writes.push(...items)),
    };
    const prepared = { html: '<p>HTML</p>', text: 'TEXT' };

    await writeWechatClipboard(prepared, {
      clipboard,
      ClipboardItemCtor: TestClipboardItem,
      BlobCtor: TestBlob,
    });

    expect(clipboard.write).toHaveBeenCalledTimes(1);
    expect(writes).toHaveLength(1);
    expect(writes[0]).toBeInstanceOf(TestClipboardItem);
    expect(writes[0].data['text/html']).toMatchObject({
      parts: [prepared.html],
      type: 'text/html',
    });
    expect(writes[0].data['text/plain']).toMatchObject({
      parts: [prepared.text],
      type: 'text/plain',
    });
  });
});

describe('prepareWechatContent', () => {
  it('is exported and rejects empty content with ARTICLE_INVALID', async () => {
    expect(prepareWechatContent).toBeTypeOf('function');
    await expect(prepareWechatContent({ renderedHTML: '' }))
      .rejects.toMatchObject({ code: 'ARTICLE_INVALID' });
  });

  it('keeps deferred image references and does not read the image store', async () => {
    const images = [
      makeImage('blob:rendered', { 'data-image-id': 'hero' }),
      makeImage('data:image/png;base64,cG5n'),
      makeImage('blob:anonymous'),
    ];
    const imageStore = { getImageRecord: vi.fn() };
    const body = {
      cloneNode: () => ({ querySelectorAll: () => [], textContent: '正文' }),
      querySelectorAll: () => [],
      get innerHTML() {
        return images.map((image) => `<img src="${image.getAttribute('src')}">`).join('');
      },
    };
    const doc = {
      body,
      querySelector: () => null,
      querySelectorAll: (selector) => selector === 'img' ? images : [],
    };
    const previousParser = globalThis.DOMParser;
    globalThis.DOMParser = class {
      parseFromString() {
        return doc;
      }
    };

    try {
      const prepared = await prepareWechatContent({
        renderedHTML: '<p>fixture</p>',
        styleConfig: { styles: { container: '' } },
        imageStore,
        imagePolicy: 'defer-local',
      });

      expect(typeof prepared.html).toBe('string');
      expect(prepared).toMatchObject({
        html: body.innerHTML,
        text: '正文',
        images: ['img://hero', 'data:image/png;base64,cG5n', 'blob:anonymous'],
        imageFailures: ['blob:anonymous'],
        imageFailureCount: 1,
      });
      expect(imageStore.getImageRecord).not.toHaveBeenCalled();
    } finally {
      if (previousParser) globalThis.DOMParser = previousParser;
      else delete globalThis.DOMParser;
    }
  });

  it('uses clipboard preparation by default and preserves a CDN image exactly', async () => {
    const image = makeImage('https://cdn.example.com/banner.png');
    const imageStore = { getImageRecord: vi.fn() };
    const showToast = vi.fn();
    const body = {
      cloneNode: () => ({ querySelectorAll: () => [], textContent: '正文' }),
      querySelectorAll: () => [],
      get innerHTML() {
        return `<p>正文</p><img src="${image.getAttribute('src')}">`;
      },
    };
    const doc = {
      body,
      querySelector: () => null,
      querySelectorAll: (selector) => selector === 'img' ? [image] : [],
    };
    const previousParser = globalThis.DOMParser;
    globalThis.DOMParser = class {
      parseFromString() {
        return doc;
      }
    };

    try {
      const prepared = await prepareWechatContent({
        renderedHTML: '<p>fixture</p>',
        styleConfig: { styles: { container: '' } },
        imageStore,
        showToast,
      });

      expect(prepared).toEqual({
        html: body.innerHTML,
        text: '正文',
        images: ['https://cdn.example.com/banner.png'],
        imageFailures: [],
        imageFailureCount: 0,
      });
      expect(showToast).toHaveBeenCalledWith('正在处理 1 张图片...', 'success');
      expect(imageStore.getImageRecord).not.toHaveBeenCalled();
      expect(prepared.html).not.toContain('img://');
    } finally {
      if (previousParser) globalThis.DOMParser = previousParser;
      else delete globalThis.DOMParser;
    }
  });
});

describe('copyToWechat', () => {
  it('prepares and writes HTML/plain text once before reporting success', async () => {
    const image = makeImage('https://cdn.example.com/banner.png');
    const body = {
      cloneNode: () => ({ querySelectorAll: () => [], textContent: '正文' }),
      querySelectorAll: () => [],
      get innerHTML() {
        return `<p>正文</p><img src="${image.getAttribute('src')}">`;
      },
    };
    const doc = {
      body,
      querySelector: () => null,
      querySelectorAll: (selector) => selector === 'img' ? [image] : [],
    };
    const previousParser = globalThis.DOMParser;
    const previousClipboardItem = globalThis.ClipboardItem;
    const navigatorRef = globalThis.navigator || {};
    const previousClipboard = navigatorRef.clipboard;
    const write = vi.fn(async () => {});
    const showToast = vi.fn();
    class TestClipboardItem {
      constructor(data) {
        this.data = data;
      }
    }
    globalThis.DOMParser = class {
      parseFromString() {
        return doc;
      }
    };
    Object.defineProperty(navigatorRef, 'clipboard', {
      configurable: true,
      writable: true,
      value: { write },
    });
    if (!globalThis.navigator) {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        writable: true,
        value: navigatorRef,
      });
    }
    globalThis.ClipboardItem = TestClipboardItem;

    try {
      const copied = await clipboardExporter.copyToWechat({
        renderedHTML: '<p>fixture</p>',
        styleConfig: { styles: { container: '' } },
        showToast,
      });

      expect(copied).toBe(true);
      expect(write).toHaveBeenCalledTimes(1);
      const item = write.mock.calls[0][0][0];
      expect(await item.data['text/html'].text()).toBe(body.innerHTML);
      expect(await item.data['text/plain'].text()).toBe('正文');
      expect(showToast).toHaveBeenNthCalledWith(1, '正在处理 1 张图片...', 'success');
      expect(showToast).toHaveBeenLastCalledWith('复制成功', 'success');
    } finally {
      if (previousParser) globalThis.DOMParser = previousParser;
      else delete globalThis.DOMParser;
      if (previousClipboard === undefined) delete navigatorRef.clipboard;
      else navigatorRef.clipboard = previousClipboard;
      if (previousClipboardItem) globalThis.ClipboardItem = previousClipboardItem;
      else delete globalThis.ClipboardItem;
    }
  });

  it('reports a table conversion error once without adding a generic copy error', async () => {
    const table = {
      getAttribute: () => '',
      setAttribute: vi.fn(),
    };
    const body = {
      cloneNode: () => ({ querySelectorAll: () => [], textContent: '正文' }),
      querySelectorAll: () => [],
      innerHTML: '<p>正文</p><table></table>',
    };
    const doc = {
      body,
      querySelector: () => null,
      querySelectorAll: (selector) => selector.startsWith('table') ? [table] : [],
    };
    const previousParser = globalThis.DOMParser;
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const showToast = vi.fn();
    globalThis.DOMParser = class {
      parseFromString() {
        return doc;
      }
    };

    try {
      const copied = await clipboardExporter.copyToWechat({
        renderedHTML: '<table><tr><td>fixture</td></tr></table>',
        styleConfig: { styles: { container: '' } },
        showToast,
      });

      expect(copied).toBe(false);
      expect(showToast).toHaveBeenCalledTimes(1);
      expect(showToast).toHaveBeenCalledWith(
        '第 1 个表格转换失败：浏览器不支持 XML 序列化',
        'error',
      );
      expect(showToast).not.toHaveBeenCalledWith('复制失败', 'error');
      expect(consoleError).toHaveBeenCalledWith('表格转图失败:', expect.any(Error));
    } finally {
      if (previousParser) globalThis.DOMParser = previousParser;
      else delete globalThis.DOMParser;
      consoleError.mockRestore();
    }
  });
});

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

  it('keeps the preview box constraints instead of overriding them with conflicting sizes', () => {
    const replacements = [];
    const decoration = {
      getAttribute: (name) => {
        if (name === 'data-ogzh-card-animation') return 'highlight';
        if (name === 'style') return 'display: block; width: 176px; max-width: 70%; height: 8px; overflow: hidden;';
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
      build: () => ({ dataUrl: 'data:image/gif;base64,highlight', width: 176, height: 28 })
    });

    const style = replacements[0].getAttribute('style');
    expect(style).toBe('display: block; width: 176px; max-width: 70%; height: 8px; overflow: hidden; border: 0; line-height: 0;');
    expect(style).not.toContain('height: auto');
    expect(style).not.toContain('100%');
    expect(style.match(/(?:^|;)\s*width:/g)).toHaveLength(1);
    expect(style.match(/(?:^|;)\s*max-width:/g)).toHaveLength(1);
    expect(style.match(/(?:^|;)\s*height:/g)).toHaveLength(1);
  });
});

describe('convertOrderedListsToWechatParagraphs', () => {
  it.each([
    'history-document',
    'check-list',
    'timeline',
    'index-badge'
  ])('keeps a %s list intact so its row markers and links survive', (styleId) => {
    expect(clipboardExporter.convertOrderedListsToWechatParagraphs).toBeTypeOf('function');
    if (!clipboardExporter.convertOrderedListsToWechatParagraphs) return;

    const remove = vi.fn();
    const list = {
      children: [],
      closest: (selector) => selector.includes(`"${styleId}"`) ? {} : null,
      remove
    };

    clipboardExporter.convertOrderedListsToWechatParagraphs({
      querySelectorAll: (selector) => selector === 'ol' ? [list] : []
    }, {});

    expect(remove).not.toHaveBeenCalled();
  });
});
