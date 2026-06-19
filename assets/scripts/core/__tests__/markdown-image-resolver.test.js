import { describe, it, expect, vi } from 'vitest';
import { scanLocalImagePaths, extractFilename, replaceImagePaths, resolveLocalImages } from '../markdown-image-resolver.js';

// ── Test helpers ──

function makeMockFile(name) {
  return new File(['fake-image-data'], name, { type: 'image/png' });
}

function makeMockFileHandle(name) {
  return {
    getFile: async () => makeMockFile(name),
  };
}

function makeMockDirHandle(fileNames) {
  const handles = {};
  for (const name of fileNames) {
    handles[name] = makeMockFileHandle(name);
  }
  return {
    getFileHandle: async (name) => {
      const h = handles[name];
      if (!h) throw new DOMException('Not found', 'NotFoundError');
      return h;
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
      makeMockDirHandle(['screenshot.png', 'logo.png'])
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
      makeMockDirHandle(['found.png'])
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
      makeMockDirHandle(['screenshot.png'])
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

  it('handles filenames matching by basename only (ignores directory prefix)', async () => {
    const md = '![photo](./deeply/nested/folder/photo.jpg)';
    const imageStore = makeMockImageStore();

    globalThis.showDirectoryPicker = vi.fn().mockResolvedValue(
      makeMockDirHandle(['photo.jpg'])
    );

    nextId = 1;
    const result = await resolveLocalImages(md, {
      imageStore,
      imageCompressor: makeMockImageCompressor(),
      createImageId,
    });

    expect(result.matched).toHaveLength(1);
    expect(result.resolvedMarkdown).toContain('img://img-test-1');

    delete globalThis.showDirectoryPicker;
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

  it('returns the original index position of each match', () => {
    const md = 'prefix ![a](one.png) middle ![b](./two.jpg) suffix';
    const result = scanLocalImagePaths(md);
    expect(result).toHaveLength(2);
    expect(result[0].index).toBe(7);
    expect(result[1].index).toBeGreaterThan(result[0].index);
  });
});
