import { describe, it, expect, vi } from 'vitest';
import {
  scanLocalImagePaths,
  extractFilename,
  replaceImagePaths,
  normalizeLocalImagePath,
  createDirectoryFileSource,
  createFileMapSource,
  resolveLocalImages,
} from '../markdown-image-resolver.js';

// ── Test helpers ──

function makeMockFile(name, type = 'image/png') {
  return new File(['fake-image-data'], name, { type });
}

function makeMockFileHandle(file) {
  return {
    kind: 'file',
    name: file.name,
    getFile: async () => file,
  };
}

function makeMockDirHandle(filePaths) {
  const root = { kind: 'directory', name: 'root', children: new Map() };

  for (const filePath of filePaths) {
    const segments = filePath.split('/');
    const fileName = segments.pop();
    let current = root;
    for (const segment of segments) {
      if (!current.children.has(segment)) {
        current.children.set(segment, { kind: 'directory', name: segment, children: new Map() });
      }
      current = current.children.get(segment);
    }
    current.children.set(fileName, makeMockFileHandle(makeMockFile(fileName)));
  }

  function toHandle(node) {
    if (node.kind === 'file') return node;
    return {
      kind: 'directory',
      name: node.name,
      getFileHandle: async (name) => {
        const child = node.children.get(name);
        if (!child || child.kind !== 'file') throw new DOMException('Not found', 'NotFoundError');
        return child;
      },
      getDirectoryHandle: async (name) => {
        const child = node.children.get(name);
        if (!child || child.kind !== 'directory') throw new DOMException('Not found', 'NotFoundError');
        return toHandle(child);
      },
      async *entries() {
        for (const [name, child] of node.children) yield [name, toHandle(child)];
      },
    };
  }

  return toHandle(root);
}

function makeMockRootFileDir(fileNames) {
  const handles = Object.fromEntries(fileNames.map((name) => [name, makeMockFileHandle(makeMockFile(name))]));
  return {
    kind: 'directory',
    getFileHandle: async (name) => {
      if (!handles[name]) throw new DOMException('Not found', 'NotFoundError');
      return handles[name];
    },
    getDirectoryHandle: async () => { throw new DOMException('Not found', 'NotFoundError'); },
    async *entries() {
      for (const entry of Object.entries(handles)) yield entry;
    },
  };
}

function makeMockImageStore() {
  const store = {};
  return {
    store,
    saveImage: async (id, blob, meta) => {
      store[id] = { blob, meta };
      return id;
    },
  };
}

function makeMockImageCompressor() {
  return {
    compress: async (file) => file, // pass-through for tests
  };
}

let nextId = 1;
function createImageId() {
  return `img-test-${nextId++}`;
}

// ── Tests ──

describe('resolveLocalImages', () => {
  it('returns original text immediately when there are no local images', async () => {
    const md = '![photo](https://cdn.example.com/img.jpg)';
    const imageStore = makeMockImageStore();
    const result = await resolveLocalImages(md, {
      imageStore,
      imageCompressor: makeMockImageCompressor(),
      createImageId,
    });
    expect(result.resolvedMarkdown).toBe(md);
    expect(result.total).toBe(0);
    expect(result.matched).toEqual([]);
  });

  it('returns original text when user cancels the directory picker', async () => {
    const md = '![photo](./images/photo.png)';
    const imageStore = makeMockImageStore();

    // Simulate user cancelling (showDirectoryPicker throws AbortError)
    globalThis.showDirectoryPicker = vi.fn().mockRejectedValue(
      new DOMException('User cancelled', 'AbortError')
    );

    const result = await resolveLocalImages(md, {
      imageStore,
      imageCompressor: makeMockImageCompressor(),
      createImageId,
    });

    expect(result.resolvedMarkdown).toBe(md);
    expect(result.cancelled).toBe(true);

    delete globalThis.showDirectoryPicker;
  });

  it('resolves matching files and replaces paths with img:// protocol', async () => {
    const md = '![screenshot](./images/screenshot.png)\n\nSome text.\n\n![logo](assets/logo.png)';
    const imageStore = makeMockImageStore();

    // Mock directory with both matching files
    globalThis.showDirectoryPicker = vi.fn().mockResolvedValue(
      makeMockDirHandle(['images/screenshot.png', 'assets/logo.png'])
    );

    nextId = 1;
    const result = await resolveLocalImages(md, {
      imageStore,
      imageCompressor: makeMockImageCompressor(),
      createImageId,
    });

    expect(result.total).toBe(2);
    expect(result.matched).toHaveLength(2);
    expect(result.unmatched).toHaveLength(0);
    expect(result.resolvedMarkdown).toContain('img://img-test-1');
    expect(result.resolvedMarkdown).toContain('img://img-test-2');
    expect(result.resolvedMarkdown).not.toContain('./images/screenshot.png');
    expect(result.resolvedMarkdown).not.toContain('assets/logo.png');

    // Verify files were stored in IndexedDB
    expect(imageStore.store['img-test-1']).toBeDefined();
    expect(imageStore.store['img-test-2']).toBeDefined();

    delete globalThis.showDirectoryPicker;
  });

  it('leaves unmatched paths as-is and reports them', async () => {
    const md = '![a](found.png)\n![b](not-found.png)';
    const imageStore = makeMockImageStore();

    globalThis.showDirectoryPicker = vi.fn().mockResolvedValue(
      makeMockRootFileDir(['found.png'])
    );

    nextId = 1;
    const result = await resolveLocalImages(md, {
      imageStore,
      imageCompressor: makeMockImageCompressor(),
      createImageId,
    });

    expect(result.total).toBe(2);
    expect(result.matched).toHaveLength(1);
    expect(result.unmatched).toHaveLength(1);
    expect(result.unmatched[0].path).toBe('not-found.png');
    expect(result.resolvedMarkdown).toContain('img://img-test-1');
    expect(result.resolvedMarkdown).toContain('![b](not-found.png)');

    delete globalThis.showDirectoryPicker;
  });

  it('preserves alt text after replacement', async () => {
    const md = '![My Screenshot](./screenshot.png)';
    const imageStore = makeMockImageStore();

    globalThis.showDirectoryPicker = vi.fn().mockResolvedValue(
      makeMockRootFileDir(['screenshot.png'])
    );

    nextId = 1;
    const result = await resolveLocalImages(md, {
      imageStore,
      imageCompressor: makeMockImageCompressor(),
      createImageId,
    });

    expect(result.resolvedMarkdown).toBe('![My Screenshot](img://img-test-1)');

    delete globalThis.showDirectoryPicker;
  });

  it('does not guess by basename in the primary article directory', async () => {
    const md = '![photo](./deeply/nested/folder/photo.jpg)';
    const imageStore = makeMockImageStore();

    globalThis.showDirectoryPicker = vi.fn().mockResolvedValue(
      makeMockRootFileDir(['photo.jpg'])
    );

    nextId = 1;
    const result = await resolveLocalImages(md, {
      imageStore,
      imageCompressor: makeMockImageCompressor(),
      createImageId,
    });

    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toEqual([{ path: './deeply/nested/folder/photo.jpg', reason: 'not-found' }]);

    delete globalThis.showDirectoryPicker;
  });

  it('resolves a nested path from an explicit directory source', async () => {
    const imageStore = makeMockImageStore();
    const source = createDirectoryFileSource(makeMockDirHandle(['images/photo.png']));

    nextId = 1;
    const result = await resolveLocalImages('![photo](images/photo.png)', {
      source,
      imageStore,
      imageCompressor: makeMockImageCompressor(),
      createImageId,
    });

    expect(result.unmatched).toEqual([]);
    expect(result.resolvedMarkdown).toBe('![photo](img://img-test-1)');
  });

  it('allows a unique basename only for a supplemental source', async () => {
    const imageStore = makeMockImageStore();
    const source = createFileMapSource([
      { path: 'picked/photo.png', file: makeMockFile('photo.png') },
    ]);

    nextId = 1;
    const result = await resolveLocalImages('![photo](missing/photo.png)', {
      source,
      allowBasenameFallback: true,
      imageStore,
      imageCompressor: makeMockImageCompressor(),
      createImageId,
    });

    expect(result.unmatched).toEqual([]);
    expect(result.resolvedMarkdown).toBe('![photo](img://img-test-1)');
  });

  it('reports duplicate supplemental basenames as a conflict', async () => {
    const source = createFileMapSource([
      { path: 'a/photo.png', file: makeMockFile('photo.png') },
      { path: 'b/photo.png', file: makeMockFile('photo.png') },
    ]);

    const result = await resolveLocalImages('![photo](missing/photo.png)', {
      source,
      allowBasenameFallback: true,
      imageStore: makeMockImageStore(),
      imageCompressor: makeMockImageCompressor(),
      createImageId,
    });

    expect(result.matched).toEqual([]);
    expect(result.unmatched).toEqual([]);
    expect(result.conflicts).toEqual([{
      path: 'missing/photo.png',
      candidates: ['a/photo.png', 'b/photo.png'],
    }]);
  });

  it('rejects paths that leave the authorized root', async () => {
    const result = await resolveLocalImages('![photo](../photo.png)', {
      source: createDirectoryFileSource(makeMockRootFileDir(['photo.png'])),
      imageStore: makeMockImageStore(),
      imageCompressor: makeMockImageCompressor(),
      createImageId,
    });

    expect(result.unmatched).toEqual([{ path: '../photo.png', reason: 'outside-root' }]);
  });

  it('does not create an img reference when storage fails', async () => {
    const result = await resolveLocalImages('![photo](photo.png)', {
      source: createDirectoryFileSource(makeMockRootFileDir(['photo.png'])),
      imageStore: { saveImage: async () => { throw new Error('quota'); } },
      imageCompressor: makeMockImageCompressor(),
      createImageId,
    });

    expect(result.resolvedMarkdown).toBe('![photo](photo.png)');
    expect(result.unmatched).toEqual([{ path: 'photo.png', reason: 'import-failed' }]);
  });
});

describe('normalizeLocalImagePath', () => {
  it('normalizes relative separators and URL encoding', () => {
    expect(normalizeLocalImagePath('.\\images\\my%20photo.png')).toBe('images/my photo.png');
  });

  it('rejects absolute and escaping paths', () => {
    expect(normalizeLocalImagePath('/Users/me/photo.png')).toBeNull();
    expect(normalizeLocalImagePath('C:\\Users\\me\\photo.png')).toBeNull();
    expect(normalizeLocalImagePath('../photo.png')).toBeNull();
  });
});

describe('extractFilename', () => {
  it('extracts filename from a simple relative path', () => {
    expect(extractFilename('./images/photo.png')).toBe('photo.png');
  });

  it('extracts filename from parent-directory path', () => {
    expect(extractFilename('../../shared/assets/diagram.svg')).toBe('diagram.svg');
  });

  it('returns the string as-is when it is already a bare filename', () => {
    expect(extractFilename('photo.jpg')).toBe('photo.jpg');
  });

  it('handles filenames with multiple dots', () => {
    expect(extractFilename('./assets/site.v2.min.js')).toBe('site.v2.min.js');
  });

  it('handles Windows-style backslash paths', () => {
    expect(extractFilename('C:\\Users\\foo\\img.png')).toBe('img.png');
  });

  it('handles mixed forward/backslash paths', () => {
    expect(extractFilename('assets\\images/photo.png')).toBe('photo.png');
  });
});

describe('replaceImagePaths', () => {
  it('replaces a single local path with the new img:// path', () => {
    const md = '![photo](./images/photo.png)';
    const pathMap = { './images/photo.png': 'img://new-id-1' };
    const result = replaceImagePaths(md, pathMap);
    expect(result).toBe('![photo](img://new-id-1)');
  });

  it('replaces multiple local paths', () => {
    const md = '![a](one.png)\n![b](two.jpg)';
    const pathMap = { 'one.png': 'img://a1', 'two.jpg': 'img://b2' };
    const result = replaceImagePaths(md, pathMap);
    expect(result).toBe('![a](img://a1)\n![b](img://b2)');
  });

  it('leaves remote URLs untouched', () => {
    const md = '![a](one.png) ![b](https://cdn.com/b.jpg)';
    const pathMap = { 'one.png': 'img://a1' };
    const result = replaceImagePaths(md, pathMap);
    expect(result).toBe('![a](img://a1) ![b](https://cdn.com/b.jpg)');
  });

  it('preserves title attributes in image syntax', () => {
    const md = '![My Alt](images/photo.png "A nice photo")';
    const pathMap = { 'images/photo.png': 'img://abc-123' };
    const result = replaceImagePaths(md, pathMap);
    expect(result).toBe('![My Alt](img://abc-123 "A nice photo")');
  });

  it('replaces a reference definition without changing the image label', () => {
    const md = '![Diagram][flow]\n\n[flow]: ./images/flow.png "Flow"';
    expect(replaceImagePaths(md, { './images/flow.png': 'img://flow-1' }))
      .toBe('![Diagram][flow]\n\n[flow]: img://flow-1 "Flow"');
  });

  it('replaces an HTML image src without changing other attributes', () => {
    const md = '<img class="hero" src="./images/hero.png" alt="Hero">';
    expect(replaceImagePaths(md, { './images/hero.png': 'img://hero-1' }))
      .toBe('<img class="hero" src="img://hero-1" alt="Hero">');
  });

  it('returns original text unchanged when no paths match', () => {
    const md = '![a](https://cdn.com/a.jpg)';
    const pathMap = { './nonexistent.png': 'img://xxx' };
    const result = replaceImagePaths(md, pathMap);
    expect(result).toBe(md);
  });

  it('leaves paths not in the map as-is', () => {
    const md = '![a](matched.png) ![b](unmatched.png)';
    const pathMap = { 'matched.png': 'img://m1' };
    const result = replaceImagePaths(md, pathMap);
    expect(result).toBe('![a](img://m1) ![b](unmatched.png)');
  });
});

describe('scanLocalImagePaths', () => {
  it('returns empty array for text with no image references', () => {
    const result = scanLocalImagePaths('# Hello\n\nSome text without images.');
    expect(result).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(scanLocalImagePaths('')).toEqual([]);
  });

  it('detects a single relative local image path', () => {
    const md = '![screenshot](./images/screenshot.png)';
    const result = scanLocalImagePaths(md);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('./images/screenshot.png');
    expect(result[0].alt).toBe('screenshot');
  });

  it('detects a bare filename without directory', () => {
    const md = '![](photo.jpg)';
    const result = scanLocalImagePaths(md);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('photo.jpg');
    expect(result[0].alt).toBe('');
  });

  it('detects parent-directory relative paths', () => {
    const md = '![arch](../shared/assets/diagram.png)';
    const result = scanLocalImagePaths(md);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('../shared/assets/diagram.png');
  });

  it('skips https:// URLs', () => {
    const md = '![photo](https://example.com/img.png)';
    expect(scanLocalImagePaths(md)).toEqual([]);
  });

  it('skips http:// URLs', () => {
    const md = '![photo](http://example.com/img.png)';
    expect(scanLocalImagePaths(md)).toEqual([]);
  });

  it('skips data: URIs', () => {
    const md = '![photo](data:image/png;base64,iVBORw0KGgo)';
    expect(scanLocalImagePaths(md)).toEqual([]);
  });

  it('skips img:// protocol references (already stored)', () => {
    const md = '![photo](img://abc-123-xyz)';
    expect(scanLocalImagePaths(md)).toEqual([]);
  });

  it('skips anchor/fragment references', () => {
    const md = '![diagram](#section-diagram)';
    expect(scanLocalImagePaths(md)).toEqual([]);
  });

  it('handles multiple images — returns only local ones', () => {
    const md = `# Doc

![logo](./assets/logo.png)
![banner](https://cdn.example.com/banner.jpg)
![icon](img://stored-icon-1)
![screenshot](data:image/png;base64,abc)
![diagram](diagrams/flow.svg)
![ref](#toc)`;

    const result = scanLocalImagePaths(md);
    expect(result).toHaveLength(2);
    expect(result[0].path).toBe('./assets/logo.png');
    expect(result[1].path).toBe('diagrams/flow.svg');
  });

  it('captures the full match string for replacement', () => {
    const md = '![My Alt](images/photo.png "Optional Title")';
    const result = scanLocalImagePaths(md);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('images/photo.png');
    expect(result[0].alt).toBe('My Alt');
    expect(result[0].fullMatch).toBe('![My Alt](images/photo.png "Optional Title")');
  });

  it('detects reference-style and HTML images', () => {
    const md = '![Diagram][flow]\n\n[flow]: ./images/flow.png "Flow"\n\n<img src="assets/hero.png" alt="Hero">';
    const result = scanLocalImagePaths(md);
    expect(result.map((item) => item.path)).toEqual(['./images/flow.png', 'assets/hero.png']);
  });

  it('returns the original index position of each match', () => {
    const md = 'prefix ![a](one.png) middle ![b](./two.jpg) suffix';
    const result = scanLocalImagePaths(md);
    expect(result).toHaveLength(2);
    expect(result[0].index).toBe(7);
    expect(result[1].index).toBeGreaterThan(result[0].index);
  });
});
