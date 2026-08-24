import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
    this.events = [];
  }

  addEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    list.push(listener);
    this.listeners.set(type, list);
  }

  removeEventListener(type, listener) {
    const list = this.listeners.get(type) || [];
    this.listeners.set(type, list.filter((candidate) => candidate !== listener));
  }

  dispatchEvent(event) {
    this.events.push(event);
    for (const listener of [...(this.listeners.get(event.type) || [])]) listener(event);
    return true;
  }

  listenerCount(type) {
    return (this.listeners.get(type) || []).length;
  }
}

class FakeEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

class FakeElement extends FakeEventTarget {
  constructor(tagName) {
    super();
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.dataset = {};
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.textContent = '';
    this.className = '';
    this.nextSibling = null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name.startsWith('data-')) this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = String(value);
  }

  append(...children) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  insertBefore(child, before) {
    child.parentNode = this;
    const index = before ? this.children.indexOf(before) : -1;
    if (index < 0) this.children.push(child);
    else this.children.splice(index, 0, child);
  }

  attachShadow() {
    this.shadowRoot = new FakeElement('shadow-root');
    return this.shadowRoot;
  }
}

class FakeDocument extends FakeEventTarget {
  constructor(anchor) {
    super();
    this.anchor = anchor;
    this.readyState = 'complete';
  }

  createElement(tagName) { return new FakeElement(tagName); }

  querySelector(selector) {
    if (selector === '[data-opengzh-copy-button]') return this.anchor;
    if (selector === '[data-opengzh-extension-host]') return this.anchor.parentNode.children.find((child) => child.dataset.opengzhExtensionHost !== undefined) || null;
    return null;
  }
}

const allPlatforms = ['weixin', 'zhihu', 'juejin', 'woshipm'];

function snapshot(overrides = {}) {
  return {
    schemaVersion: 1,
    documentId: 'doc-1',
    title: '测试文章',
    markdown: '# 标题',
    portableMarkdown: '# 标题',
    semanticHtml: '<p>正文</p>',
    wechatHtml: '<p>正文</p>',
    images: [],
    createdAt: 1710000000000,
    ...overrides,
  };
}

function loadTestApi() {
  return globalThis.__OPENGZH_CONTENT_TEST__;
}

beforeEach(async () => {
  await import('../src/content/open-gzh.js');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('content script selection and snapshot trust boundary', () => {
  it('normalizes default, subset, fixed order, and empty persisted selection', () => {
    const { normalizeSelection } = loadTestApi();
    expect(normalizeSelection()).toEqual(allPlatforms);
    expect(normalizeSelection(['woshipm', 'unknown', 'weixin', 'woshipm'])).toEqual(['weixin', 'woshipm']);
    expect(normalizeSelection('[]')).toEqual(allPlatforms);
    expect(normalizeSelection('not-json')).toEqual(allPlatforms);
  });

  it('deep clones a valid snapshot and rejects version, extra, Blob, accessor, sparse, and invalid images', () => {
    const { validateSnapshot } = loadTestApi();
    const valid = snapshot({ images: [
      { ref: 'data:image/png;base64,AA==', kind: 'data-url', dataUrl: 'data:image/png;base64,AA==', mimeType: 'image/png', filename: 'a.png', alt: '' },
      { ref: 'img://image-1', kind: 'indexed-db', imageId: 'image-1', mimeType: 'image/png', filename: 'b.png', alt: 'B' },
    ] });
    const clone = validateSnapshot(valid);
    expect(clone).toEqual(valid);
    expect(clone).not.toBe(valid);
    expect(clone.images).not.toBe(valid.images);
    expect(() => validateSnapshot({ ...valid, schemaVersion: 2 })).toThrowError(/ARTICLE_INVALID/);
    expect(() => validateSnapshot({ ...valid, extra: true })).toThrowError(/ARTICLE_INVALID/);
    expect(() => validateSnapshot({ ...valid, createdAt: Infinity })).toThrowError(/ARTICLE_INVALID/);
    expect(() => validateSnapshot({ ...valid, images: [{ ...valid.images[0], extra: true }] })).toThrowError(/ARTICLE_INVALID/);
    expect(() => validateSnapshot({ ...valid, images: [new Blob(['x'])] })).toThrowError(/ARTICLE_INVALID/);
    const accessor = snapshot();
    Object.defineProperty(accessor, 'title', { get: () => 'unsafe', enumerable: true });
    expect(() => validateSnapshot(accessor)).toThrowError(/ARTICLE_INVALID/);
    const sparse = [];
    sparse.length = 1;
    expect(() => validateSnapshot({ ...valid, images: sparse })).toThrowError(/ARTICLE_INVALID/);
    expect(() => validateSnapshot({ ...valid, images: [{ ...valid.images[0], ref: 'img://wrong' }] })).toThrowError(/ARTICLE_INVALID/);
  });
});

describe('content script page snapshot request', () => {
  it('accepts only matching ready/error events and cleans listeners on settle or timeout', async () => {
    vi.useFakeTimers();
    const { requestSnapshot } = loadTestApi();
    const target = new FakeEventTarget();
    const promise = requestSnapshot({ target, CustomEventCtor: FakeEvent, requestId: 'request-1', timeoutMs: 15000 });
    expect(target.events[0].type).toBe('opengzh:distribution:request');
    target.dispatchEvent(new FakeEvent('opengzh:distribution:ready', { detail: { requestId: 'other', article: snapshot() } }));
    expect(target.listenerCount('opengzh:distribution:ready')).toBe(1);
    target.dispatchEvent(new FakeEvent('opengzh:distribution:ready', { detail: { requestId: 'request-1', article: snapshot() } }));
    await expect(promise).resolves.toEqual(snapshot());
    expect(target.listenerCount('opengzh:distribution:ready')).toBe(0);
    expect(target.listenerCount('opengzh:distribution:error')).toBe(0);

    const errorTarget = new FakeEventTarget();
    const errorPromise = requestSnapshot({ target: errorTarget, CustomEventCtor: FakeEvent, requestId: 'request-2', timeoutMs: 15000 });
    errorTarget.dispatchEvent(new FakeEvent('opengzh:distribution:error', { detail: { requestId: 'other', code: 'ARTICLE_INVALID' } }));
    errorTarget.dispatchEvent(new FakeEvent('opengzh:distribution:error', { detail: { requestId: 'request-2', code: 'ARTICLE_INVALID', message: '文章快照生成失败' } }));
    await expect(errorPromise).rejects.toMatchObject({ code: 'ARTICLE_INVALID' });
    expect(errorTarget.listenerCount('opengzh:distribution:ready')).toBe(0);

    const timeoutTarget = new FakeEventTarget();
    const timeoutPromise = requestSnapshot({ target: timeoutTarget, CustomEventCtor: FakeEvent, requestId: 'request-3', timeoutMs: 15000 });
    vi.advanceTimersByTime(15000);
    await expect(timeoutPromise).rejects.toMatchObject({ code: 'ARTICLE_INVALID' });
    expect(timeoutTarget.listenerCount('opengzh:distribution:ready')).toBe(0);
    expect(timeoutTarget.listenerCount('opengzh:distribution:error')).toBe(0);
  });
});

describe('content script serial image responder', () => {
  it('processes IMAGE_REQUIRED in arrival order with max concurrency one and survives failures', async () => {
    const { createImageResponder } = loadTestApi();
    const sent = [];
    let active = 0;
    let maxActive = 0;
    const readImageData = vi.fn(async (ref) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, ref === 'img://bad' ? 1 : 5));
      active -= 1;
      if (ref === 'img://bad') throw new Error('not exposed');
      return `data:image/png;base64,${ref.slice(-1)}`;
    });
    const responder = createImageResponder({ port: { postMessage: (message) => {
      if (message.ref === 'img://post-fails') throw new Error('disconnected');
      sent.push(message);
    } }, readImageData });
    responder.handleMessage({ type: 'OTHER' });
    responder.handleMessage({ type: 'IMAGE_REQUIRED', taskId: 'task', platformId: 'weixin', requestId: '1', ref: 'img://bad' });
    responder.handleMessage({ type: 'IMAGE_REQUIRED', taskId: 'task', platformId: 'weixin', requestId: '2', ref: 'img://ok' });
    responder.handleMessage({ type: 'IMAGE_REQUIRED', taskId: 'task', platformId: 'weixin', requestId: '3', ref: 'img://post-fails' });
    responder.handleMessage({ type: 'IMAGE_REQUIRED', taskId: 'task', platformId: 'weixin', requestId: '4', ref: 'img://ok' });
    await responder.drain();
    expect(maxActive).toBe(1);
    expect(readImageData).toHaveBeenCalledWith('img://bad');
    expect(sent.map((message) => [message.type, message.requestId])).toEqual([
      ['IMAGE_ERROR', '1'], ['IMAGE_DATA', '2'], ['IMAGE_DATA', '4'],
    ]);
    expect(sent.find((message) => message.requestId === '1')).toMatchObject({ taskId: 'task', platformId: 'weixin', ref: 'img://bad', code: 'IMAGE_READ_FAILED', message: '图片读取失败' });
  });
});

describe('content script indexed image reads', () => {
  it('reads data URLs directly and reads indexed-db records through WechatEditorImages v1', async () => {
    const { readImageData } = loadTestApi();
    expect(await readImageData({ ref: 'data:image/png;base64,AA==', kind: 'data-url', dataUrl: 'data:image/png;base64,AA==' })).toBe('data:image/png;base64,AA==');

    const blob = { type: 'image/png' };
    const db = {
      close: vi.fn(),
      transaction: vi.fn(() => ({ objectStore: () => ({ get: () => {
        const request = {};
        queueMicrotask(() => { request.result = { blob }; request.onsuccess?.(); });
        return request;
      } }) })),
    };
    const indexedDB = { open: vi.fn(() => {
      const request = {};
      queueMicrotask(() => { request.result = db; request.onsuccess?.(); });
      return request;
    }) };
    class Reader {
      readAsDataURL(value) { this.result = `data:${value.type};base64,AA==`; queueMicrotask(() => this.onload?.()); }
    }
    await expect(readImageData({ ref: 'img://one', kind: 'indexed-db', imageId: 'one' }, { indexedDB, FileReaderCtor: Reader })).resolves.toBe('data:image/png;base64,AA==');
    expect(indexedDB.open).toHaveBeenCalledWith('WechatEditorImages', 1);
    expect(db.transaction).toHaveBeenCalledWith(['images'], 'readonly');
    expect(db.close).toHaveBeenCalled();
  });

  it('rejects missing records, open/read failures, and FileReader failures', async () => {
    const { readImageData } = loadTestApi();
    const missingDb = { close: vi.fn(), transaction: () => ({ objectStore: () => ({ get: () => {
      const request = {};
      queueMicrotask(() => { request.result = null; request.onsuccess?.(); });
      return request;
    } }) }) };
    const open = (db, failure = false) => ({ open: () => {
      const request = {};
      queueMicrotask(() => failure ? request.onerror?.() : (request.result = db, request.onsuccess?.()));
      return request;
    } });
    await expect(readImageData({ ref: 'img://missing', kind: 'indexed-db', imageId: 'missing' }, { indexedDB: open(missingDb), FileReaderCtor: class {} })).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
    await expect(readImageData({ ref: 'img://open-fails', kind: 'indexed-db', imageId: 'open-fails' }, { indexedDB: open(null, true), FileReaderCtor: class {} })).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
    const readFailDb = { close: vi.fn(), transaction: () => ({ objectStore: () => ({ get: () => {
      const request = {};
      queueMicrotask(() => request.onerror?.());
      return request;
    } }) }) };
    await expect(readImageData({ ref: 'img://read-fails', kind: 'indexed-db', imageId: 'read-fails' }, { indexedDB: open(readFailDb), FileReaderCtor: class {} })).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
    const readerFailDb = { close: vi.fn(), transaction: () => ({ objectStore: () => ({ get: () => {
      const request = {};
      queueMicrotask(() => { request.result = { blob: {} }; request.onsuccess?.(); });
      return request;
    } }) }) };
    class Reader { readAsDataURL() { queueMicrotask(() => this.onerror?.()); } }
    await expect(readImageData({ ref: 'img://reader-fails', kind: 'indexed-db', imageId: 'reader-fails' }, { indexedDB: open(readerFailDb), FileReaderCtor: Reader })).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
  });
});

describe('content script source contract', () => {
  it('exposes fixed protocol constants and no unsafe dynamic HTML or permission APIs', async () => {
    const source = await (await import('node:fs/promises')).readFile(new URL('../src/content/open-gzh.js', import.meta.url), 'utf8');
    expect(source).toContain('opengzh-distribution-v1');
    expect(source).toContain('opengzh:distribution:request');
    expect(source).toContain('opengzh:distribution:ready');
    expect(source).toContain('opengzh:distribution:error');
    expect(source).toContain('data-opengzh-extension-host');
    expect(source).toContain('platform-icon');
    expect(source).toContain('保存草稿并打开');
    expect(source).toContain('同步到平台');
    expect(source).toContain('微信公众号、知乎、掘金、人人都是产品经理文章同步助手');
    expect(source).not.toContain('chrome.permissions');
    expect(source).not.toContain('permissions.request');
    expect(source).not.toContain('cookies');
    expect(source).not.toMatch(/innerHTML\s*=\s*message/);
  });
});

describe('content script shadow DOM UI', () => {
  it('inserts one open shadow host, exposes fixed rows, draft links, and retry messages', async () => {
    const { createUi } = loadTestApi();
    const parent = new FakeElement('div');
    const anchor = new FakeElement('button');
    anchor.dataset.opengzhCopyButton = '';
    parent.append(anchor);
    const doc = new FakeDocument(anchor);
    const messages = [];
    const port = {
      postMessage: (message) => messages.push(message),
      onMessage: { addListener: vi.fn() },
    };
    const storage = { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() };
    const ui = createUi({ document: doc, anchor, port, storage, windowObject: { open: vi.fn() } });
    expect(parent.children).toHaveLength(2);
    expect(parent.children[1]).toBe(ui.host);
    expect(ui.host.shadowRoot).toBe(ui.shadow);
    expect(ui.rows.get('weixin').row.children[1].className).toBe('platform-icon');
    expect(ui.rows.get('woshipm').row.children[2].textContent).toBe('人人都是产品经理');
    expect(createUi({ document: doc, anchor, port, storage })).toMatchObject({ existing: true, host: ui.host });
    ui.trigger.dispatchEvent(new FakeEvent('click'));
    expect(messages[0]).toEqual({ type: 'CHECK_AUTH', platformIds: allPlatforms });
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: null, platformId: 'weixin', status: 'success', draftUrl: 'https://draft.test/1' });
    expect(ui.rows.get('weixin').draft.href).toBe('https://draft.test/1');
    expect(ui.rows.get('weixin').draft.textContent).toBe('打开草稿');
    ui.state.taskId = 'task-1';
    ui.rows.get('weixin').retry.dispatchEvent(new FakeEvent('click'));
    expect(messages.at(-1)).toEqual({ type: 'RETRY_PLATFORM', taskId: 'task-1', platformId: 'weixin' });
  });
});
