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
    event.target = this;
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
    this.key = init.key;
    this.shiftKey = Boolean(init.shiftKey);
    this.defaultPrevented = false;
  }

  preventDefault() {
    this.defaultPrevented = true;
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
    this.ownerDocument = null;
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

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  attachShadow() {
    this.shadowRoot = new FakeElement('shadow-root');
    this.shadowRoot.ownerDocument = this.ownerDocument;
    return this.shadowRoot;
  }

  focus() {
    if (this.ownerDocument) this.ownerDocument.activeElement = this;
  }
}

class FakeDocument extends FakeEventTarget {
  constructor(anchor) {
    super();
    this.anchor = anchor;
    this.readyState = 'complete';
    this.activeElement = null;
    anchor.ownerDocument = this;
  }

  createElement(tagName) {
    const element = new FakeElement(tagName);
    element.ownerDocument = this;
    return element;
  }

  querySelector(selector) {
    if (selector === '[data-opengzh-distribution-button]') return this.anchor?.parentNode ? this.anchor : null;
    if (selector === '[data-opengzh-extension-host]') return this.anchor?.parentNode?.children.find((child) => child.dataset.opengzhExtensionHost !== undefined) || null;
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

  it('aborts an in-flight snapshot immediately and cleans all listeners', async () => {
    const { requestSnapshot } = loadTestApi();
    const target = new FakeEventTarget();
    const controller = new AbortController();
    const promise = requestSnapshot({ target, CustomEventCtor: FakeEvent, requestId: 'abort-me', signal: controller.signal, timeoutMs: 15000 });
    expect(target.listenerCount('opengzh:distribution:ready')).toBe(1);
    controller.abort();
    await expect(promise).rejects.toMatchObject({ code: 'ARTICLE_INVALID' });
    expect(target.listenerCount('opengzh:distribution:ready')).toBe(0);
    expect(target.listenerCount('opengzh:distribution:error')).toBe(0);
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

  it('rejects indexed-db reader output that is not an allowlisted image or mismatches the requested MIME', async () => {
    const { readImageData } = loadTestApi();
    const read = (output, mimeType = 'image/png') => {
      const db = {
        close: vi.fn(),
        transaction: () => ({ objectStore: () => ({ get: () => {
          const request = {};
          queueMicrotask(() => { request.result = { blob: { type: mimeType } }; request.onsuccess?.(); });
          return request;
        } }) }),
      };
      const indexedDB = { open: () => {
        const request = {};
        queueMicrotask(() => { request.result = db; request.onsuccess?.(); });
        return request;
      } };
      class Reader { readAsDataURL() { this.result = output; queueMicrotask(() => this.onload?.()); } }
      return readImageData({ ref: 'img://one', kind: 'indexed-db', imageId: 'one', mimeType }, { indexedDB, FileReaderCtor: Reader });
    };
    await expect(read('data:text/html;base64,AA==')).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
    await expect(read('data:image/jpeg;base64,/w==')).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
    await expect(read('data:image/png;base64,AA==')).resolves.toBe('data:image/png;base64,AA==');
  });
});

describe('content script source contract', () => {
  it('exposes fixed protocol constants and no unsafe dynamic HTML or permission APIs', async () => {
    const source = await (await import('node:fs/promises')).readFile(new URL('../src/content/open-gzh.js', import.meta.url), 'utf8');
    expect(source).toContain('opengzh-distribution-v1');
    expect(source).toContain('opengzh:distribution:request');
    expect(source).toContain('opengzh:distribution:ready');
    expect(source).toContain('opengzh:distribution:error');
    expect(source).toContain('opengzh:distribution:open');
    expect(source).toContain('opengzh:distribution:opened');
    expect(source).toContain('data-opengzh-extension-host');
    expect(source).toContain('platform-icon');
    expect(source).toContain('保存草稿并打开');
    expect(source).not.toContain('同步到平台');
    expect(source).not.toContain('opengzh-trigger');
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
    anchor.dataset.opengzhDistributionButton = '';
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
    expect(ui.trigger).toBeUndefined();
    expect(ui.shadow.children.find((child) => child.tagName === 'STYLE').textContent).not.toContain('opengzh-trigger');
    expect(ui.shadow.children.find((child) => child.className === 'opengzh-extension-shell').children).toHaveLength(1);
    expect(ui.rows.get('weixin').row.children[1].className).toBe('platform-icon');
    expect(ui.rows.get('weixin').row.children[1].textContent).toBe('微');
    expect(ui.rows.get('weixin').row.children[1].attributes.get('aria-hidden')).toBe('true');
    expect(ui.rows.get('zhihu').row.children[1].textContent).toBe('知');
    expect(ui.rows.get('juejin').row.children[1].textContent).toBe('掘');
    expect(ui.rows.get('woshipm').row.children[1].textContent).toBe('人');
    expect(ui.rows.get('woshipm').row.children[2].className).toBe('opengzh-platform-details');
    expect(ui.rows.get('woshipm').row.children[2].children[0].textContent).toBe('人人都是产品经理');
    expect(ui.rows.get('woshipm').row.children[3].className).toBe('opengzh-platform-actions');
    expect(createUi({ document: doc, anchor, port, storage })).toMatchObject({ existing: true, host: ui.host });
    await ui.openPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(messages[0]).toMatchObject({ type: 'CHECK_AUTH', platformIds: allPlatforms, requestId: expect.any(String) });
    ui.state.taskId = 'task-1';
    ui.state.operationId = 'operation-1';
    ui.state.busy = true;
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-1', operationId: 'operation-1', platformId: 'weixin', status: 'success', draftUrl: 'https://mp.weixin.qq.com/draft/1' });
    expect(ui.rows.get('weixin').draft.href).toBe('https://mp.weixin.qq.com/draft/1');
    expect(ui.rows.get('weixin').draft.textContent).toBe('打开草稿');
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-1', operationId: 'operation-1', platformId: 'weixin', status: 'auth-required' });
    ui.state.busy = false;
    ui.state.retryTaskId = 'task-1';
    ui.rows.get('weixin').retry.dispatchEvent(new FakeEvent('click'));
    expect(messages.at(-1)).toMatchObject({ type: 'RETRY_PLATFORM', taskId: 'task-1', operationId: expect.any(String), platformId: 'weixin' });
  });
});

describe('content script distribution open protocol', () => {
  it('opens once for a valid page request and acknowledges the same request id', async () => {
    const { createUi, PAGE_EVENTS } = loadTestApi();
    const { doc, anchor, parent } = makeUiDom();
    const messages = [];
    const port = { postMessage: (message) => messages.push(message), onMessage: { addListener: vi.fn() } };
    const ui = createUi({
      document: doc,
      anchor,
      port,
      storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      CustomEventCtor: FakeEvent,
    });
    await ui.ready;
    doc.dispatchEvent(new FakeEvent(PAGE_EVENTS.open, { detail: { requestId: 'page-request-1' } }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ui.backdrop.hidden).toBe(false);
    expect(anchor.attributes.get('aria-expanded')).toBe('true');
    expect(doc.events.filter((event) => event.type === PAGE_EVENTS.opened)).toHaveLength(1);
    expect(doc.events.at(-1)).toMatchObject({ type: PAGE_EVENTS.opened, detail: { requestId: 'page-request-1' } });
    const host = ui.host;
    doc.dispatchEvent(new FakeEvent(PAGE_EVENTS.open, { detail: { requestId: 'page-request-2' } }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(doc.events.filter((event) => event.type === PAGE_EVENTS.opened).map((event) => event.detail.requestId)).toEqual(['page-request-1', 'page-request-2']);
    expect(parent.children.filter((child) => child.dataset.opengzhExtensionHost !== undefined)).toEqual([host]);
    expect(messages.filter((message) => message.type === 'CHECK_AUTH')).toHaveLength(1);
  });

  it('ignores invalid page requests and does not acknowledge without a connected port', async () => {
    const { createUi, PAGE_EVENTS } = loadTestApi();
    const invalidDom = makeUiDom();
    const invalidUi = createUi({
      document: invalidDom.doc,
      anchor: invalidDom.anchor,
      port: { postMessage: vi.fn(), onMessage: { addListener: vi.fn() } },
      storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      CustomEventCtor: FakeEvent,
    });
    await invalidUi.ready;
    for (const detail of [{ requestId: '' }, { requestId: '   ' }, {}, null]) {
      invalidDom.doc.dispatchEvent(new FakeEvent(PAGE_EVENTS.open, { detail }));
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(invalidDom.doc.events.some((event) => event.type === PAGE_EVENTS.opened)).toBe(false);
    expect(invalidUi.backdrop.hidden).toBe(true);

    const disconnectedDom = makeUiDom();
    const disconnectedUi = createUi({
      document: disconnectedDom.doc,
      anchor: disconnectedDom.anchor,
      storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      CustomEventCtor: FakeEvent,
    });
    await disconnectedUi.ready;
    expect(await disconnectedUi.openPanel()).toBe(false);
    expect(disconnectedUi.panel.hidden).toBe(true);
    disconnectedDom.doc.dispatchEvent(new FakeEvent(PAGE_EVENTS.open, { detail: { requestId: 'no-port' } }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(disconnectedDom.doc.events.some((event) => event.type === PAGE_EVENTS.opened)).toBe(false);
    expect(disconnectedUi.backdrop.hidden).toBe(true);
  });

  it('stops acknowledging requests after port disconnect and removes the open listener on dispose', async () => {
    const { createUi, PAGE_EVENTS } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    let onDisconnect;
    const port = {
      postMessage: vi.fn(),
      onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
      onDisconnect: { addListener: (listener) => { onDisconnect = listener; }, removeListener: vi.fn() },
    };
    const ui = createUi({
      document: doc,
      anchor,
      port,
      storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      CustomEventCtor: FakeEvent,
    });
    await ui.ready;
    expect(doc.listenerCount(PAGE_EVENTS.open)).toBe(1);
    onDisconnect();
    expect(ui.state.portConnected).toBe(false);
    doc.dispatchEvent(new FakeEvent(PAGE_EVENTS.open, { detail: { requestId: 'after-disconnect' } }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(doc.events.some((event) => event.type === PAGE_EVENTS.opened)).toBe(false);
    expect(ui.backdrop.hidden).toBe(true);
    ui.dispose();
    expect(doc.listenerCount(PAGE_EVENTS.open)).toBe(0);
  });

  it('acknowledges before delayed selection restore and starts auth only after restore while open', async () => {
    const { createUi, PAGE_EVENTS } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    let resolveSelection;
    const messages = [];
    const ui = createUi({
      document: doc,
      anchor,
      port: { postMessage: (message) => messages.push(message), onMessage: { addListener: vi.fn() } },
      storage: {
        get: () => new Promise((resolve) => { resolveSelection = resolve; }),
        set: async () => {},
        remove: async () => {},
      },
      CustomEventCtor: FakeEvent,
    });
    doc.dispatchEvent(new FakeEvent(PAGE_EVENTS.open, { detail: { requestId: 'fast-open' } }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ui.backdrop.hidden).toBe(false);
    expect(doc.events.at(-1)).toMatchObject({ type: PAGE_EVENTS.opened, detail: { requestId: 'fast-open' } });
    expect(messages).toEqual([]);
    resolveSelection({ 'opengzh.selectedPlatformIds': ['weixin'] });
    await ui.ready;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(messages).toEqual([{ type: 'CHECK_AUTH', requestId: expect.any(String), platformIds: ['weixin'] }]);
  });

  it('does not start auth after delayed selection restore if the port disconnects', async () => {
    const { createUi, PAGE_EVENTS } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    let resolveSelection;
    let onDisconnect;
    const messages = [];
    const ui = createUi({
      document: doc,
      anchor,
      port: {
        postMessage: (message) => messages.push(message),
        onMessage: { addListener: vi.fn() },
        onDisconnect: { addListener: (listener) => { onDisconnect = listener; }, removeListener: vi.fn() },
      },
      storage: {
        get: () => new Promise((resolve) => { resolveSelection = resolve; }),
        set: async () => {},
        remove: async () => {},
      },
      CustomEventCtor: FakeEvent,
    });
    doc.dispatchEvent(new FakeEvent(PAGE_EVENTS.open, { detail: { requestId: 'disconnect-race' } }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ui.backdrop.hidden).toBe(false);
    onDisconnect();
    resolveSelection({ 'opengzh.selectedPlatformIds': ['weixin'] });
    await ui.ready;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(messages).toEqual([]);
  });

  it('preserves a user selection made before delayed persisted selection restores', async () => {
    const { createUi, PAGE_EVENTS } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    let resolveSelection;
    const messages = [];
    const ui = createUi({
      document: doc,
      anchor,
      port: { postMessage: (message) => messages.push(message), onMessage: { addListener: vi.fn() } },
      storage: {
        get: () => new Promise((resolve) => { resolveSelection = resolve; }),
        set: async () => {},
        remove: async () => {},
      },
      CustomEventCtor: FakeEvent,
    });
    doc.dispatchEvent(new FakeEvent(PAGE_EVENTS.open, { detail: { requestId: 'selection-race-success' } }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    ui.rows.get('weixin').checkbox.checked = false;
    ui.rows.get('weixin').checkbox.dispatchEvent(new FakeEvent('change'));
    const selectedByUser = allPlatforms.filter((platformId) => platformId !== 'weixin');
    resolveSelection({ 'opengzh.selectedPlatformIds': ['weixin'] });
    await ui.ready;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ui.state.selected).toEqual(selectedByUser);
    expect(ui.rows.get('weixin').checkbox.checked).toBe(false);
    expect(messages).toEqual([{ type: 'CHECK_AUTH', requestId: expect.any(String), platformIds: selectedByUser }]);
  });

  it('preserves a user selection when delayed persisted selection restore fails', async () => {
    const { createUi, PAGE_EVENTS } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    let rejectSelection;
    const messages = [];
    const ui = createUi({
      document: doc,
      anchor,
      port: { postMessage: (message) => messages.push(message), onMessage: { addListener: vi.fn() } },
      storage: {
        get: () => new Promise((resolve, reject) => { rejectSelection = reject; }),
        set: async () => {},
        remove: async () => {},
      },
      CustomEventCtor: FakeEvent,
    });
    doc.dispatchEvent(new FakeEvent(PAGE_EVENTS.open, { detail: { requestId: 'selection-race-failure' } }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    ui.rows.get('zhihu').checkbox.checked = false;
    ui.rows.get('zhihu').checkbox.dispatchEvent(new FakeEvent('change'));
    const selectedByUser = allPlatforms.filter((platformId) => platformId !== 'zhihu');
    rejectSelection(new Error('storage unavailable'));
    await ui.ready;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(ui.state.selected).toEqual(selectedByUser);
    expect(ui.rows.get('zhihu').checkbox.checked).toBe(false);
    expect(messages).toEqual([{ type: 'CHECK_AUTH', requestId: expect.any(String), platformIds: selectedByUser }]);
  });
});

describe('locked distribution protocol integration', () => {
  it('sends article in START_BATCH and passes the complete image object through serial responder', async () => {
    const { createImageResponder, createUi } = loadTestApi();
    const image = { ref: 'img://one', kind: 'indexed-db', imageId: 'one', mimeType: 'image/png', filename: 'one.png', alt: '' };
    const sent = [];
    const readImageData = vi.fn(async (value) => `data:image/png;base64,${value.imageId === 'one' ? 'AA==' : 'AQ=='}`);
    const responder = createImageResponder({ port: { postMessage: (message) => sent.push(message) }, readImageData });
    responder.handleMessage({ type: 'IMAGE_REQUIRED', taskId: 'task-1', platformId: 'weixin', requestId: 'req-1', image });
    await responder.drain();
    expect(readImageData).toHaveBeenCalledWith(image);
    expect(sent[0]).toEqual({ type: 'IMAGE_DATA', taskId: 'task-1', platformId: 'weixin', requestId: 'req-1', ref: image.ref, dataUrl: 'data:image/png;base64,AA==' });

    const { doc, anchor } = makeUiDom();
    const batchMessages = [];
    const article = snapshot();
    const ui = createUi({
      document: doc,
      anchor,
      port: { postMessage: (message) => batchMessages.push(message) },
      storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      snapshotRequest: async () => article,
      idFactory: () => 'task-1',
    });
    await ui.ready;
    await ui.openPanel();
    await ui.startBatch();
    expect(batchMessages.at(-1)).toMatchObject({ type: 'START_BATCH', taskId: 'task-1', operationId: expect.any(String), platformIds: allPlatforms, article });
    expect(batchMessages.at(-1).snapshot).toBeUndefined();
  });
});

describe('locked Data URL validation', () => {
  it('accepts only allowlisted MIME/base64 data URLs and rejects malformed or mismatched variants', async () => {
    const { validateSnapshot, readImageData } = loadTestApi();
    const valid = (dataUrl, mimeType) => ({ ref: dataUrl, kind: 'data-url', dataUrl, mimeType, filename: 'image.bin', alt: '' });
    for (const [dataUrl, mimeType] of [
      ['data:image/png;base64,AA==', 'image/png'],
      ['data:image/jpeg;base64,/w==', 'image/jpeg'],
      ['data:image/jpg;base64,/w==', 'image/jpg'],
      ['data:image/gif;base64,R0lGODlhAQ==', 'image/gif'],
      ['data:image/webp;base64,UklGRg==', 'image/webp'],
      ['data:image/avif;base64,AAAA', 'image/avif'],
      ['data:image/svg+xml;base64,PHN2Zy8+', 'image/svg+xml'],
    ]) expect(() => validateSnapshot(snapshot({ images: [valid(dataUrl, mimeType)] }))).not.toThrow();
    for (const image of [
      valid('data:image/bmp;base64,AA==', 'image/bmp'),
      valid('data:image/png,AA==', 'image/png'),
      valid('data:image/png;base64,not base64', 'image/png'),
      valid('data:image/png;base64,AA==', 'image/jpeg'),
      { ref: 'data:image/png;base64,AA==', kind: 'data-url', dataUrl: 'data:image/png;base64,AA=', mimeType: 'image/png', filename: 'image.png', alt: '' },
    ]) expect(() => validateSnapshot(snapshot({ images: [image] }))).toThrowError(/ARTICLE_INVALID/);
    await expect(readImageData('data:image/png,AA==')).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
    await expect(readImageData('data:image/bmp;base64,AA==')).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
  });
});

function makeUiDom() {
  const parent = new FakeElement('div');
  const anchor = new FakeElement('button');
  anchor.dataset.opengzhDistributionButton = '';
  parent.append(anchor);
  const doc = new FakeDocument(anchor);
  return { doc, anchor, parent };
}

describe('async extension selection storage and selected-only auth', () => {
  it('does not check auth with an empty selection after direct open or close and reopen', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const messages = [];
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      port: { postMessage: (message) => messages.push(message) },
    });
    await ui.ready;
    await ui.openPanel();
    for (const id of allPlatforms) {
      ui.rows.get(id).checkbox.checked = false;
      ui.rows.get(id).checkbox.dispatchEvent(new FakeEvent('change'));
    }
    expect(ui.state.selected).toEqual([]);
    const messageCount = messages.length;

    await ui.openPanel();
    expect(messages).toHaveLength(messageCount);
    ui.closePanel();
    await ui.openPanel();
    expect(messages).toHaveLength(messageCount);
    expect(allPlatforms.every((id) => {
      const row = ui.rows.get(id);
      return row.checkbox.checked === false && row.status.textContent === '未选择';
    })).toBe(true);
    expect(ui.alert.textContent).toBe('至少选择一个平台');
    await ui.startBatch();
    expect(messages).toHaveLength(messageCount);
    expect(ui.alert.textContent).toBe('至少选择一个平台');

    ui.rows.get('weixin').checkbox.checked = true;
    ui.rows.get('weixin').checkbox.dispatchEvent(new FakeEvent('change'));
    await ui.openPanel();
    expect(messages.at(-1)).toMatchObject({ type: 'CHECK_AUTH', requestId: expect.any(String), platformIds: ['weixin'] });
    expect(ui.alert.textContent).toBe('');
  });

  it('restores chrome.storage.local selection before opening and keeps empty selection transient', async () => {
    const { createUi, PAGE_EVENTS } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    let resolveGet;
    const storage = {
      get: vi.fn(() => new Promise((resolve) => { resolveGet = resolve; })),
      set: vi.fn(async () => {}),
      remove: vi.fn(async () => {}),
    };
    const messages = [];
    const ui = createUi({ document: doc, anchor, storage, port: { postMessage: (message) => messages.push(message) } });
    doc.dispatchEvent(new FakeEvent(PAGE_EVENTS.open, { detail: { requestId: 'restore-selection' } }));
    expect(messages).toEqual([]);
    resolveGet({ 'opengzh.selectedPlatformIds': ['woshipm', 'weixin'] });
    await ui.ready;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(messages[0]).toMatchObject({ type: 'CHECK_AUTH', requestId: expect.any(String), platformIds: ['weixin', 'woshipm'] });
    expect(ui.rows.get('zhihu').checkbox.checked).toBe(false);
    for (const id of ['weixin', 'woshipm']) {
      ui.rows.get(id).checkbox.checked = false;
      ui.rows.get(id).checkbox.dispatchEvent(new FakeEvent('change'));
    }
    expect(storage.remove).toHaveBeenCalledWith('opengzh.selectedPlatformIds');
    expect(ui.state.selected).toEqual([]);
    ui.rows.get('weixin').checkbox.checked = true;
    ui.rows.get('weixin').checkbox.dispatchEvent(new FakeEvent('change'));
    await ui.openPanel();
    const authRequestId = messages.at(-1).requestId;
    ui.onMessage({ type: 'AUTH_RESULT', requestId: authRequestId, platformId: 'weixin', authenticated: false });
    ui.rows.get('weixin').retry.dispatchEvent(new FakeEvent('click'));
    expect(messages.at(-1)).toMatchObject({ type: 'CHECK_AUTH', requestId: expect.any(String), platformIds: ['weixin'] });
  });
});

describe('batch lifecycle, status progress, and connectivity', () => {
  it('only checks selected rows, retains taskId after batch complete, and retries the failed platform', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const messages = [];
    const ui = createUi({ document: doc, anchor, storage: { get: async () => ({ 'opengzh.selectedPlatformIds': ['weixin'] }), set: async () => {}, remove: async () => {} }, port: { postMessage: (message) => messages.push(message) } });
    await ui.ready;
    await ui.openPanel();
    expect(ui.rows.get('weixin').status.textContent).toBe('检测登录中');
    expect(ui.rows.get('zhihu').status.textContent).toBe('未选择');
    ui.onMessage({ type: 'AUTH_RESULT', requestId: messages.at(-1).requestId, platformId: 'weixin', authenticated: true });
    ui.state.taskId = 'task-9';
    ui.state.operationId = 'operation-9';
    ui.state.busy = true;
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-9', operationId: 'operation-9', platformId: 'weixin', status: 'failed', error: { message: '平台拒绝' } });
    ui.onMessage({ type: 'BATCH_COMPLETE', taskId: 'task-9', operationId: 'operation-9' });
    expect(ui.state.taskId).toBe(null);
    expect(ui.state.retryTaskId).toBe('task-9');
    expect(ui.state.busy).toBe(false);
    ui.rows.get('weixin').retry.dispatchEvent(new FakeEvent('click'));
    expect(messages.at(-1)).toMatchObject({ type: 'RETRY_PLATFORM', taskId: 'task-9', operationId: expect.any(String), platformId: 'weixin' });
    const retryOperationId = messages.at(-1).operationId;
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-9', operationId: retryOperationId, platformId: 'weixin', status: 'uploading-images', completed: 2, total: 5 });
    expect(ui.rows.get('weixin').status.textContent).toContain('2/5');
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-9', operationId: retryOperationId, platformId: 'weixin', status: 'failed', error: { message: '平台拒绝' } });
    expect(ui.rows.get('weixin').status.textContent).toBe('平台拒绝');
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-9', operationId: retryOperationId, platformId: 'weixin', status: 'unknown' });
    expect(ui.rows.get('weixin').status.textContent).toBe('请检查平台草稿箱');
    ui.state.busy = false;
    ui.state.taskId = null;
    ui.state.operationId = null;
    await ui.openPanel();
    ui.onMessage({ type: 'AUTH_RESULT', requestId: messages.at(-1).requestId, platformId: 'weixin', authenticated: true });
    expect(ui.rows.get('weixin').status.textContent).toBe('已登录');
    expect(ui.rows.get('weixin').login.hidden).toBe(true);
  });

  it('unlocks and reports when there is no port or the port disconnects', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const ui = createUi({ document: doc, anchor, storage: { get: async () => ({}), set: async () => {}, remove: async () => {} }, snapshotRequest: async () => snapshot(), idFactory: () => 'task-no-port' });
    await ui.ready;
    await ui.openPanel();
    await ui.startBatch();
    expect(ui.state.busy).toBe(false);
    expect(ui.alert.textContent).toBe('无法连接同步服务');
    const disconnect = { addListener: vi.fn() };
    const ui2Dom = makeUiDom();
    const ui2 = createUi({ document: ui2Dom.doc, anchor: ui2Dom.anchor, port: { postMessage: () => { throw new Error('gone'); }, onDisconnect: disconnect }, storage: { get: async () => ({}), set: async () => {}, remove: async () => {} } });
    await ui2.ready;
    expect(disconnect.addListener).toHaveBeenCalled();
    disconnect.addListener.mock.calls[0][0]();
    expect(ui2.state.busy).toBe(false);
    expect(ui2.alert.textContent).toBe('无法连接同步服务');
  });
});

describe('Task5 quality runtime contracts', () => {
  it('correlates and debounces auth checks, ignoring stale or busy results', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const messages = [];
    const authIdFactory = vi.fn().mockReturnValueOnce('auth-1').mockReturnValueOnce('auth-2');
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({ 'opengzh.selectedPlatformIds': ['weixin'] }), set: async () => {}, remove: async () => {} },
      port: { postMessage: (message) => messages.push(message) },
      authIdFactory,
    });
    await ui.ready;
    await ui.openPanel();
    expect(messages[0]).toEqual({ type: 'CHECK_AUTH', requestId: 'auth-1', platformIds: ['weixin'] });
    await ui.openPanel();
    expect(messages.filter((message) => message.type === 'CHECK_AUTH')).toHaveLength(1);
    ui.onMessage({ type: 'AUTH_RESULT', requestId: 'old-auth', platformId: 'weixin', authenticated: false });
    expect(ui.rows.get('weixin').status.textContent).toBe('检测登录中');
    ui.onMessage({ type: 'AUTH_RESULT', requestId: 'auth-1', platformId: 'zhihu', authenticated: true });
    expect(ui.rows.get('zhihu').status.textContent).toBe('未选择');
    ui.onMessage({ type: 'AUTH_RESULT', requestId: 'auth-1', platformId: 'weixin', authenticated: false });
    expect(ui.rows.get('weixin').status.textContent).toBe('需要登录');
    await ui.openPanel();
    expect(messages.at(-1)).toEqual({ type: 'CHECK_AUTH', requestId: 'auth-2', platformIds: ['weixin'] });
    ui.state.busy = true;
    ui.onMessage({ type: 'AUTH_RESULT', requestId: 'auth-2', platformId: 'weixin', authenticated: true });
    expect(ui.rows.get('weixin').status.textContent).toBe('检测登录中');
  });

  it('renders a correlated auth error as a failed row without treating it as logout', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const messages = [];
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({ 'opengzh.selectedPlatformIds': ['weixin'] }), set: async () => {}, remove: async () => {} },
      port: { postMessage: (message) => messages.push(message) },
    });
    await ui.ready;
    await ui.openPanel();
    const requestId = messages.at(-1).requestId;
    ui.onMessage({
      type: 'AUTH_RESULT', requestId: 'stale-auth', platformId: 'weixin',
      error: { code: 'PLATFORM_CHANGED', message: '旧错误', retryable: false },
    });
    expect(ui.rows.get('weixin').status.textContent).toBe('检测登录中');
    ui.onMessage({
      type: 'AUTH_RESULT', requestId, platformId: 'weixin',
      error: { code: 'PLATFORM_CHANGED', message: '平台响应已变化', retryable: false },
    });
    ui.onMessage({
      type: 'AUTH_RESULT', requestId, platformId: 'weixin',
      error: { code: 'PLATFORM_CHANGED', message: '重复错误', retryable: false },
    });
    expect(ui.rows.get('weixin').statusKey).toBe('failed');
    expect(ui.rows.get('weixin').status.textContent).toBe('平台响应已变化');
    expect(ui.rows.get('weixin').login.hidden).toBe(false);
    expect(ui.rows.get('weixin').retry.hidden).toBe(false);
    expect(ui.state.authRequestId).toBe(null);
  });

  it('correlates operation id with task context for states, completion, and fatal errors', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const messages = [];
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({ 'opengzh.selectedPlatformIds': ['weixin'] }), set: async () => {}, remove: async () => {} },
      port: { postMessage: (message) => messages.push(message) },
      snapshotRequest: async () => snapshot(),
      idFactory: vi.fn().mockReturnValue('task-1'),
      operationIdFactory: vi.fn().mockReturnValueOnce('operation-1').mockReturnValueOnce('operation-2'),
    });
    await ui.ready;
    await ui.startBatch();
    expect(messages.at(-1)).toMatchObject({ type: 'START_BATCH', taskId: 'task-1', operationId: 'operation-1' });
    expect(ui.state.activeTaskId).toBe('task-1');
    expect(ui.state.activeOperationId).toBe('operation-1');
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-1', operationId: 'old-operation', platformId: 'weixin', status: 'success', draftUrl: 'https://mp.weixin.qq.com/draft/old' });
    expect(ui.rows.get('weixin').status.textContent).toBe('检测登录中');
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-1', operationId: 'operation-1', platformId: 'zhihu', status: 'success', draftUrl: 'https://zhuanlan.zhihu.com/p/1' });
    expect(ui.rows.get('zhihu').draft.hidden).toBe(true);
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-1', operationId: 'operation-1', platformId: 'weixin', status: 'failed', error: { message: '平台拒绝' } });
    ui.onMessage({ type: 'BATCH_COMPLETE', taskId: 'task-1', operationId: 'old-operation' });
    expect(ui.state.busy).toBe(true);
    ui.onMessage({ type: 'BATCH_COMPLETE', taskId: 'task-1', operationId: 'operation-1' });
    expect(ui.state.busy).toBe(false);
    expect(ui.state.activeTaskId).toBe(null);
    ui.rows.get('weixin').retry.dispatchEvent(new FakeEvent('click'));
    expect(messages.at(-1)).toEqual({ type: 'RETRY_PLATFORM', taskId: 'task-1', operationId: 'operation-2', platformId: 'weixin' });
    expect(ui.state.activeOperationId).toBe('operation-2');
    ui.onMessage({ type: 'FATAL_ERROR', taskId: 'task-1', operationId: 'old-operation', message: '旧失败' });
    expect(ui.state.busy).toBe(true);
    ui.onMessage({ type: 'FATAL_ERROR', taskId: 'task-1', operationId: 'operation-2', message: '当前失败' });
    expect(ui.state.busy).toBe(false);
  });

  it('correlates auth fatal errors and invalidates auth when starting a batch', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const messages = [];
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({ 'opengzh.selectedPlatformIds': ['weixin'] }), set: async () => {}, remove: async () => {} },
      port: { postMessage: (message) => messages.push(message) },
      snapshotRequest: async () => snapshot(),
      authIdFactory: () => 'auth-pending',
      idFactory: () => 'task-new',
      operationIdFactory: () => 'operation-new',
    });
    await ui.ready;
    await ui.openPanel();
    expect(ui.state.authRequestId).toBe('auth-pending');
    ui.onMessage({ type: 'FATAL_ERROR', requestId: 'old-auth', message: '旧鉴权失败' });
    expect(ui.alert.textContent).toBe('');
    await ui.startBatch();
    expect(ui.state.authRequestId).toBe(null);
    ui.onMessage({ type: 'AUTH_RESULT', requestId: 'auth-pending', platformId: 'weixin', authenticated: false });
    expect(ui.rows.get('weixin').status.textContent).toBe('检测登录中');
  });

  it('ignores fatal errors without an active task or pending auth request', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      port: { postMessage: () => {} },
    });
    await ui.ready;
    ui.onMessage({ type: 'FATAL_ERROR', message: '无关联错误' });
    expect(ui.alert.textContent).toBe('');
    ui.onMessage({ type: 'FATAL_ERROR', taskId: 'old-task', operationId: 'old-operation', message: '旧错误' });
    expect(ui.alert.textContent).toBe('');
  });

  it('does not act on open or start after dispose while selection restore is pending', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    let resolveSelection;
    const messages = [];
    const ui = createUi({
      document: doc,
      anchor,
      storage: {
        get: () => new Promise((resolve) => { resolveSelection = resolve; }),
        set: async () => {},
        remove: async () => {},
      },
      port: { postMessage: (message) => messages.push(message) },
      snapshotRequest: async () => snapshot(),
    });
    const opening = ui.openPanel();
    const starting = ui.startBatch();
    ui.dispose();
    resolveSelection({});
    await Promise.all([opening, starting]);
    expect(messages).toEqual([]);
    expect(ui.state.busy).toBe(false);
    expect(ui.state.taskId).toBe(null);
    expect(ui.backdrop.hidden).toBe(true);
  });

  it('passes AbortSignal to snapshots and aborts on finish or dispose', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    let aborted = false;
    const snapshotRequest = vi.fn(({ signal }) => new Promise((resolve, reject) => {
      signal?.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true });
    }));
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      port: { postMessage: () => {} },
      snapshotRequest,
      idFactory: () => 'task-abort',
    });
    await ui.ready;
    const start = ui.startBatch();
    await Promise.resolve();
    expect(snapshotRequest).toHaveBeenCalledWith(expect.objectContaining({ signal: expect.any(AbortSignal) }));
    ui.dispose();
    await start;
    expect(aborted).toBe(true);
    expect(ui.alert.textContent).toBe('');
  });

  it('clears every row draft, status, and map entry before a new selected batch', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      port: { postMessage: () => {} },
      snapshotRequest: async () => snapshot(),
      idFactory: () => 'task-new',
      operationIdFactory: () => 'operation-new',
    });
    await ui.ready;
    ui.state.taskId = 'task-old';
    ui.state.operationId = 'operation-old';
    ui.state.busy = true;
    for (const platformId of allPlatforms) {
      ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-old', operationId: 'operation-old', platformId, status: 'success', draftUrl: `https://${platformId === 'weixin' ? 'mp.weixin.qq.com' : platformId === 'zhihu' ? 'zhuanlan.zhihu.com' : platformId === 'juejin' ? 'juejin.cn' : 'www.woshipm.com'}/draft/old` });
    }
    ui.state.busy = false;
    ui.state.selected = ['weixin'];
    ui.rows.get('weixin').checkbox.checked = true;
    for (const platformId of allPlatforms.slice(1)) ui.rows.get(platformId).checkbox.checked = false;
    await ui.startBatch();
    expect([...ui.state.draftUrls]).toHaveLength(0);
    for (const platformId of allPlatforms) {
      const row = ui.rows.get(platformId);
      expect(row.draft.hidden).toBe(true);
      expect(row.status.textContent).toBe(platformId === 'weixin' ? '检测登录中' : '未选择');
    }
  });
  it('gates pending snapshots and ignores stale protocol events by active task generation', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const messages = [];
    const pending = [];
    const snapshotRequest = vi.fn(() => new Promise((resolve) => pending.push(resolve)));
    const idFactory = vi.fn()
      .mockReturnValueOnce('task-a')
      .mockReturnValueOnce('task-b');
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      port: { postMessage: (message) => messages.push(message) },
      snapshotRequest,
      idFactory,
    });
    await ui.ready;
    const firstStart = ui.startBatch();
    await Promise.resolve();
    expect(ui.state.busy).toBe(true);
    expect(ui.state.taskId).toBe('task-a');
    ui.onMessage({ type: 'BATCH_COMPLETE', taskId: 'stale-task' });
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'stale-task', operationId: 'stale-operation', platformId: 'weixin', status: 'success' });
    expect(ui.state.busy).toBe(true);
    ui.onMessage({ type: 'FATAL_ERROR', taskId: 'task-a', operationId: ui.state.operationId, message: '当前批次失败' });
    expect(ui.state.busy).toBe(false);
    expect(ui.state.taskId).toBe(null);

    const secondStart = ui.startBatch();
    await Promise.resolve();
    expect(ui.state.taskId).toBe('task-b');
    const countBeforeReopen = messages.length;
    await ui.openPanel();
    expect(messages).toHaveLength(countBeforeReopen);
    pending[0](snapshot({ title: '旧批次' }));
    await Promise.resolve();
    expect(messages.some((message) => message.type === 'START_BATCH' && message.taskId === 'task-a')).toBe(false);
    pending[1](snapshot({ title: '当前批次' }));
    await Promise.all([firstStart, secondStart]);
    expect(messages.at(-1)).toMatchObject({ type: 'START_BATCH', taskId: 'task-b', article: snapshot({ title: '当前批次' }) });
  });

  it('keeps retry context separate from active task and prevents duplicate retries', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const messages = [];
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({ 'opengzh.selectedPlatformIds': ['weixin'] }), set: async () => {}, remove: async () => {} },
      port: { postMessage: (message) => messages.push(message) },
    });
    await ui.ready;
    await ui.openPanel();
    ui.state.taskId = 'task-9';
    ui.state.operationId = 'operation-9';
    ui.state.busy = true;
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-9', operationId: 'operation-9', platformId: 'weixin', status: 'failed', error: { message: '平台拒绝' } });
    ui.onMessage({ type: 'BATCH_COMPLETE', taskId: 'task-9', operationId: 'operation-9' });
    expect(ui.state.taskId).toBe(null);
    expect(ui.state.retryTaskId).toBe('task-9');
    expect(ui.rows.get('weixin').canRetry).toBe(true);
    ui.rows.get('weixin').retry.dispatchEvent(new FakeEvent('click'));
    ui.rows.get('weixin').retry.dispatchEvent(new FakeEvent('click'));
    expect(messages.filter((message) => message.type === 'RETRY_PLATFORM')).toHaveLength(1);
    expect(messages.at(-1)).toMatchObject({ type: 'RETRY_PLATFORM', taskId: 'task-9', operationId: expect.any(String), platformId: 'weixin' });
    expect(ui.state.busy).toBe(true);
    expect(ui.state.taskId).toBe('task-9');
    const retryOperationId = messages.at(-1).operationId;
    ui.onMessage({ type: 'FATAL_ERROR', taskId: 'other-task', operationId: retryOperationId, message: '旧错误' });
    expect(ui.state.busy).toBe(true);
    ui.onMessage({ type: 'FATAL_ERROR', taskId: 'task-9', operationId: retryOperationId, message: '重试失败' });
    expect(ui.state.busy).toBe(false);
    expect(ui.state.taskId).toBe(null);
    expect(ui.state.retryTaskId).toBe('task-9');
  });

  it('limits auth and platform updates to selected and active task scope', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({ 'opengzh.selectedPlatformIds': ['weixin'] }), set: async () => {}, remove: async () => {} },
      port: { postMessage: () => {} },
    });
    await ui.ready;
    await ui.openPanel();
    const authRequestId = ui.state.authRequestId;
    ui.onMessage({ type: 'AUTH_RESULT', requestId: authRequestId, results: [
      { platformId: 'weixin', authenticated: false },
      { platformId: 'zhihu', authenticated: true },
    ] });
    expect(ui.rows.get('weixin').status.textContent).toBe('需要登录');
    expect(ui.rows.get('zhihu').status.textContent).toBe('未选择');
    ui.state.taskId = 'task-active';
    ui.state.busy = true;
    const current = ui.rows.get('weixin').status.textContent;
    ui.onMessage({ type: 'PLATFORM_STATE', platformId: 'weixin', status: 'success' });
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'other-task', platformId: 'weixin', status: 'success' });
    expect(ui.rows.get('weixin').status.textContent).toBe(current);
  });

  it('accepts only exact platform draft hosts and removes sensitive query parameters', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      port: { postMessage: () => {} },
    });
    await ui.ready;
    await ui.openPanel();
    ui.state.taskId = 'task-draft';
    ui.state.operationId = 'operation-draft';
    ui.state.busy = true;
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-draft', operationId: 'operation-draft', platformId: 'weixin', status: 'success', draftUrl: 'https://evil.example/draft?token=secret' });
    expect(ui.rows.get('weixin').draft.hidden).toBe(true);
    expect(ui.rows.get('weixin').retry.disabled).toBe(true);
    expect(ui.rows.get('weixin').status.textContent).toBe('请检查平台草稿箱');

    const validUrls = {
      weixin: 'https://mp.weixin.qq.com/draft?foo=1&Access_Token=secret#draft',
      zhihu: 'https://zhuanlan.zhihu.com/p/1?ticket=secret',
      juejin: 'https://juejin.cn/post/1?csrf=secret',
      woshipm: 'https://www.woshipm.com/article/1?session_token=secret',
    };
    ui.state.selected = allPlatforms.slice();
    for (const platformId of allPlatforms) {
      ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-draft', operationId: 'operation-draft', platformId, status: 'success', draftUrl: validUrls[platformId] });
      expect(ui.rows.get(platformId).draft.hidden).toBe(false);
      expect(ui.rows.get(platformId).draft.href).not.toMatch(/token|ticket|csrf|session_token/i);
      expect(ui.rows.get(platformId).retry.disabled).toBe(true);
    }
  });

  it('keeps retry controls terminal-aware and resets selected rows for a new batch', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({ 'opengzh.selectedPlatformIds': ['weixin'] }), set: async () => {}, remove: async () => {} },
      port: { postMessage: () => {} },
    });
    await ui.ready;
    await ui.openPanel();
    ui.state.taskId = 'task-1';
    ui.state.operationId = 'operation-1';
    ui.state.busy = true;
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-1', operationId: 'operation-1', platformId: 'weixin', status: 'success', draftUrl: 'https://mp.weixin.qq.com/draft/1' });
    expect(ui.rows.get('weixin').retry.disabled).toBe(true);
    expect(ui.rows.get('weixin').draft.hidden).toBe(false);
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-1', operationId: 'operation-1', platformId: 'weixin', status: 'unknown' });
    expect(ui.rows.get('weixin').retry.disabled).toBe(true);
    expect(ui.rows.get('weixin').draft.hidden).toBe(true);
    ui.state.busy = false;
    ui.onMessage({ type: 'PLATFORM_STATE', taskId: 'task-1', operationId: 'operation-1', platformId: 'weixin', status: 'auth-required' });
    expect(ui.rows.get('weixin').retry.disabled).toBe(false);
  });

  it('traps Tab and Shift+Tab within visible enabled panel controls', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      port: { postMessage: () => {} },
    });
    await ui.ready;
    await ui.openPanel();
    ui.start.focus();
    const forward = new FakeEvent('keydown', { key: 'Tab' });
    ui.panel.dispatchEvent(forward);
    expect(forward.defaultPrevented).toBe(true);
    expect(doc.activeElement).toBe(ui.close);
    ui.close.focus();
    const backward = new FakeEvent('keydown', { key: 'Tab', shiftKey: true });
    ui.panel.dispatchEvent(backward);
    expect(backward.defaultPrevented).toBe(true);
    expect(doc.activeElement).toBe(ui.start);
  });

  it('uses shadow activeElement to move between controls instead of resetting every Tab to close', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
      port: { postMessage: () => {} },
    });
    await ui.ready;
    await ui.openPanel();
    const checkbox = ui.rows.get('weixin').checkbox;
    const login = ui.rows.get('weixin').login;
    checkbox.focus();
    ui.shadow.activeElement = checkbox;
    const forward = new FakeEvent('keydown', { key: 'Tab' });
    ui.panel.dispatchEvent(forward);
    expect(forward.defaultPrevented).toBe(true);
    expect(doc.activeElement).toBe(login);
    ui.shadow.activeElement = login;
    const backward = new FakeEvent('keydown', { key: 'Tab', shiftKey: true });
    ui.panel.dispatchEvent(backward);
    expect(backward.defaultPrevented).toBe(true);
    expect(doc.activeElement).toBe(checkbox);
  });

  it('reports selection persistence failures without blocking the panel', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const ui = createUi({
      document: doc,
      anchor,
      storage: { get: async () => ({}), set: async () => { throw new Error('storage unavailable'); }, remove: async () => {} },
      port: { postMessage: () => {} },
    });
    await ui.ready;
    ui.rows.get('weixin').checkbox.checked = false;
    ui.rows.get('weixin').checkbox.dispatchEvent(new FakeEvent('change'));
    await Promise.resolve();
    await Promise.resolve();
    expect(ui.alert.textContent).toBe('选择未保存');
  });
});

describe('content script mount lifecycle', () => {
  it('waits for a late anchor before creating the UI', async () => {
    const { boot } = loadTestApi();
    const placeholderParent = new FakeElement('div');
    const placeholderAnchor = new FakeElement('button');
    placeholderAnchor.dataset.opengzhDistributionButton = '';
    placeholderParent.append(placeholderAnchor);
    const doc = new FakeDocument(placeholderAnchor);
    doc.anchor = null;
    class Observer {
      static instance;
      constructor(callback) { this.callback = callback; Observer.instance = this; }
      observe = vi.fn();
      disconnect = vi.fn();
      trigger() { this.callback([]); }
    }
    const controller = boot({
      document: doc,
      port: { postMessage: vi.fn() },
      MutationObserverCtor: Observer,
    });
    expect(controller.ui).toBe(null);
    const parent = new FakeElement('div');
    const anchor = new FakeElement('button');
    anchor.dataset.opengzhDistributionButton = '';
    parent.append(anchor);
    doc.anchor = anchor;
    Observer.instance.trigger();
    expect(controller.ui).toBeTruthy();
    await controller.ui.ready;
    controller.disconnect();
  });

  it('reuses one UI, state, responder, and port listener across anchor removal and recreation', async () => {
    const { boot } = loadTestApi();
    const oldParent = new FakeElement('div');
    const oldAnchor = new FakeElement('button');
    oldAnchor.dataset.opengzhDistributionButton = '';
    oldParent.append(oldAnchor);
    const doc = new FakeDocument(oldAnchor);
    const port = {
      postMessage: vi.fn(),
      onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
      onDisconnect: { addListener: vi.fn(), removeListener: vi.fn() },
      disconnect: vi.fn(),
    };
    class Observer {
      static instance;
      constructor(callback) { this.callback = callback; Observer.instance = this; }
      observe = vi.fn();
      disconnect = vi.fn();
      trigger() { this.callback([]); }
    }
    const controller = boot({ document: doc, port, MutationObserverCtor: Observer });
    await controller.ui.ready;
    const ui = controller.ui;
    const host = ui.host;
    const state = ui.state;
    expect(port.onMessage.addListener).toHaveBeenCalledTimes(1);

    oldParent.removeChild(oldAnchor);
    doc.anchor = null;
    Observer.instance.trigger();
    expect(host.hidden).toBe(true);
    oldParent.removeChild(host);

    const newParent = new FakeElement('div');
    const newAnchor = new FakeElement('button');
    newAnchor.dataset.opengzhDistributionButton = '';
    newParent.append(newAnchor);
    doc.anchor = newAnchor;
    Observer.instance.trigger();
    expect(controller.ui).toBe(ui);
    expect(ui.host).toBe(host);
    expect(ui.state).toBe(state);
    expect(host.parentNode).toBe(newParent);
    expect(host.hidden).toBe(false);
    expect(port.onMessage.addListener).toHaveBeenCalledTimes(1);

    controller.disconnect();
    expect(Observer.instance.disconnect).toHaveBeenCalledTimes(1);
    expect(port.onMessage.removeListener).toHaveBeenCalledTimes(1);
    expect(port.onDisconnect.removeListener).toHaveBeenCalledTimes(1);
    expect(port.disconnect).toHaveBeenCalledTimes(1);
    expect(host.parentNode).toBe(null);
    expect(oldAnchor.listenerCount('click')).toBe(0);
  });

  it('rebinds open and close to a recreated website anchor while reusing one UI and host', async () => {
    const { boot } = loadTestApi();
    const oldParent = new FakeElement('div');
    const oldAnchor = new FakeElement('button');
    oldAnchor.dataset.opengzhDistributionButton = '';
    oldParent.append(oldAnchor);
    const doc = new FakeDocument(oldAnchor);
    const port = {
      postMessage: vi.fn(),
      onMessage: { addListener: vi.fn() },
      onDisconnect: { addListener: vi.fn(), removeListener: vi.fn() },
    };
    class Observer {
      static instance;
      constructor(callback) { this.callback = callback; Observer.instance = this; }
      observe = vi.fn();
      disconnect = vi.fn();
      trigger() { this.callback([]); }
    }
    const controller = boot({ document: doc, port, MutationObserverCtor: Observer });
    await controller.ui.ready;
    const ui = controller.ui;
    const host = ui.host;
    await ui.openPanel();
    expect(oldAnchor.attributes.get('aria-expanded')).toBe('true');
    oldParent.removeChild(oldAnchor);
    doc.anchor = null;
    Observer.instance.trigger();
    oldParent.removeChild(host);

    const newParent = new FakeElement('div');
    const newAnchor = new FakeElement('button');
    newAnchor.dataset.opengzhDistributionButton = '';
    newAnchor.ownerDocument = doc;
    newParent.append(newAnchor);
    doc.anchor = newAnchor;
    Observer.instance.trigger();
    expect(controller.ui).toBe(ui);
    expect(ui.host).toBe(host);
    expect(ui.anchor).toBe(newAnchor);
    expect(oldAnchor.attributes.get('aria-expanded')).toBe('false');
    await ui.openPanel();
    expect(newAnchor.attributes.get('aria-expanded')).toBe('true');
    expect(oldAnchor.attributes.get('aria-expanded')).toBe('false');
    ui.closePanel();
    expect(newAnchor.attributes.get('aria-expanded')).toBe('false');
    expect(doc.activeElement).toBe(newAnchor);
    expect(oldAnchor.attributes.get('aria-expanded')).toBe('false');
    expect(host.parentNode).toBe(newParent);
    controller.disconnect();
  });
});

describe('Shadow DOM CSS, accessibility, and focus contract', () => {
  it('has fixed responsive styles, accessible controls, live status, and focus restoration', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const ui = createUi({ document: doc, anchor, storage: { get: async () => ({}), set: async () => {}, remove: async () => {} }, port: { postMessage: () => {} } });
    const style = ui.shadow.children.find((child) => child.tagName === 'STYLE');
    expect(style).toBeTruthy();
    expect(style.textContent).toContain('.opengzh-platform-details');
    expect(style.textContent).toContain('.opengzh-platform-actions');
    expect(style.textContent).toContain('grid-column: 2 / 4');
    expect(ui.rows.get('weixin').row.children[2].className).toBe('opengzh-platform-details');
    expect(ui.rows.get('weixin').row.children[3].className).toBe('opengzh-platform-actions');
    expect(ui.anchor).toBe(anchor);
    expect(ui.panel.attributes.get('aria-labelledby')).toBe('opengzh-title');
    expect(ui.rows.get('weixin').checkbox.attributes.get('aria-label')).toContain('微信公众号');
    expect(ui.rows.get('weixin').login.attributes.get('aria-label')).toContain('微信公众号');
    expect(ui.rows.get('weixin').retry.attributes.get('aria-label')).toContain('微信公众号');
    expect(ui.rows.get('weixin').draft.attributes.get('aria-label')).toContain('微信公众号');
    expect(ui.rows.get('weixin').status.attributes.get('aria-live')).toBe('polite');
    await ui.openPanel();
    expect(doc.activeElement).toBe(ui.close);
    expect(anchor.attributes.get('aria-expanded')).toBe('true');
    ui.close.dispatchEvent(new FakeEvent('click'));
    expect(doc.activeElement).toBe(anchor);
    expect(anchor.attributes.get('aria-expanded')).toBe('false');
    await ui.openPanel();
    doc.dispatchEvent(new FakeEvent('keydown', { detail: undefined }));
    doc.events.at(-1).key = 'Escape';
    doc.dispatchEvent(doc.events.at(-1));
    expect(doc.activeElement).toBe(anchor);
    expect(anchor.attributes.get('aria-expanded')).toBe('false');
    await ui.openPanel();
    ui.backdrop.dispatchEvent(new FakeEvent('click'));
    expect(doc.activeElement).toBe(anchor);
    expect(anchor.attributes.get('aria-expanded')).toBe('false');
  });

  it('resets aria-expanded on dispose without stealing focus from the open panel', async () => {
    const { createUi } = loadTestApi();
    const { doc, anchor } = makeUiDom();
    const ui = createUi({
      document: doc,
      anchor,
      port: { postMessage: () => {} },
      storage: { get: async () => ({}), set: async () => {}, remove: async () => {} },
    });
    await ui.ready;
    await ui.openPanel();
    expect(doc.activeElement).toBe(ui.close);
    expect(anchor.attributes.get('aria-expanded')).toBe('true');
    ui.dispose();
    expect(anchor.attributes.get('aria-expanded')).toBe('false');
    expect(doc.activeElement).toBe(ui.close);
  });
});
