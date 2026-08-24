/**
 * document-store 单元测试。
 * 自带内存版 IndexedDB mock（项目零依赖原则，不引入 fake-indexeddb）。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentStore, migrateFromLocalStorage, DB_NAME } from '../document-store.js';

// ── 内存版 IndexedDB mock ────────────────────────────────────

class MockRequest {
  constructor(result) {
    this.result = result;
    this.error = null;
    this.onsuccess = null;
    this.onerror = null;
    Promise.resolve().then(() => this.onsuccess && this.onsuccess({ target: this }));
  }
}

class MockIndex {
  constructor(store, name) {
    this.store = store;
    this.name = name;
  }
}

class MockObjectStore {
  constructor(db, name) {
    this.db = db;
    this.name = name;
    this.indexes = {};
  }

  put(value) {
    const keyPath = this.db.stores[this.name].keyPath;
    const key = value[keyPath];
    if (key == null) throw new Error('DataError: missing keyPath value');
    this.db.data[this.name].set(key, structuredCloneSafe(value));
    return new MockRequest(key);
  }

  add(value) {
    const keyPath = this.db.stores[this.name].keyPath;
    const key = value[keyPath];
    if (this.db.data[this.name].has(key)) throw new Error('ConstraintError');
    return this.put(value);
  }

  get(key) {
    return new MockRequest(this.db.data[this.name].has(key) ? structuredCloneSafe(this.db.data[this.name].get(key)) : undefined);
  }

  getAll() {
    return new MockRequest([...this.db.data[this.name].values()].map(structuredCloneSafe));
  }

  delete(key) {
    this.db.data[this.name].delete(key);
    return new MockRequest(undefined);
  }

  clear() {
    this.db.data[this.name].clear();
    return new MockRequest(undefined);
  }

  createIndex(name) {
    this.indexes[name] = new MockIndex(this, name);
    return this.indexes[name];
  }

  index(name) {
    if (!this.indexes[name]) throw new Error(`NotFoundError: index ${name}`);
    return this.indexes[name];
  }
}

function structuredCloneSafe(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

class MockTransaction {
  constructor(db, storeNames) {
    this.db = db;
    this.storeNames = [...storeNames];
    this._aborted = false;
  }
  objectStore(name) {
    if (!this.storeNames.includes(name)) throw new Error('NotFoundError: store not in transaction');
    if (!this.db.stores[name]) throw new Error(`NotFoundError: object store ${name} not found`);
    return new MockObjectStore(this.db, name);
  }
}

class MockDB {
  constructor(factory, name) {
    this.factory = factory;
    this.name = name;
    /** @type {Map<string, Map<any, any>>} */
    this.data = {};
    /** @type {Record<string, {keyPath: string}>} */
    this.stores = {};
    this.objectStoreNames = {
      contains: (storeName) => Boolean(this.stores[storeName])
    };
  }

  createObjectStore(name, options = {}) {
    this.stores[name] = { keyPath: options.keyPath };
    this.data[name] = new Map();
    return new MockObjectStore(this, name);
  }

  transaction(storeNames) {
    return new MockTransaction(this, Array.isArray(storeNames) ? storeNames : [storeNames]);
  }
}

class MockIDBFactory {
  constructor() {
    /** @type {Record<string, MockDB>} */
    this.databases = {};
  }

  open(name, version) {
    let db = this.databases[name];
    const needsUpgrade = !db || (version && version > (db.version || 0));
    if (!db) {
      db = new MockDB(this, name);
      this.databases[name] = db;
      db.version = version || 1;
    } else if (version && version < (db.version || 1)) {
      // 版本回退：真实 IndexedDB 抛 VersionError
      const errRequest = new MockRequest(undefined);
      errRequest.error = new Error('VersionError');
      Promise.resolve().then(() => errRequest.onerror && errRequest.onerror());
      return errRequest;
    }
    const request = new MockRequest(undefined);
    // 微任务时序：先触发 onupgradeneeded（新建/升版时），再以就绪的 result 触发 onsuccess
    Promise.resolve().then(() => {
      if (needsUpgrade && request.onupgradeneeded) {
        request.onupgradeneeded({ target: { result: db } });
        db.version = version || db.version;
      }
      request.result = db;
      if (request.onsuccess) request.onsuccess({ target: request });
    });
    return request;
  }
}

// ── 测试工具 ──

class MemoryStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

function makeFactory() {
  return new MockIDBFactory();
}

describe('DocumentStore', () => {
  let factory;

  beforeEach(() => {
    factory = makeFactory();
  });

  it('init 创建 documents 与 meta store', async () => {
    const store = new DocumentStore({ indexedDB: factory });
    await store.init();

    const db = factory.databases[DB_NAME];
    expect(db).toBeTruthy();
    expect(db.stores.documents).toBeTruthy();
    expect(db.stores.documents.keyPath).toBe('id');
    expect(db.stores.meta).toBeTruthy();
    expect(Object.keys(db.data.documents)).toBeDefined();
  });

  it('put/get 往返保留文档内容', async () => {
    const store = new DocumentStore({ indexedDB: factory });
    await store.init();

    const doc = {
      id: 'doc-1',
      title: '标题',
      content: '# Hello\n\n正文',
      createdAt: 100,
      updatedAt: 200,
      sortOrder: 0
    };
    await store.putDocument(doc);
    const loaded = await store.getDocument('doc-1');

    expect(loaded).toEqual(doc);
  });

  it('get 不存在的文档返回 null', async () => {
    const store = new DocumentStore({ indexedDB: factory });
    await store.init();
    expect(await store.getDocument('nope')).toBeNull();
  });

  it('getAllDocuments 返回全部文档', async () => {
    const store = new DocumentStore({ indexedDB: factory });
    await store.init();

    await store.putDocument({ id: 'a', content: '', updatedAt: 1 });
    await store.putDocument({ id: 'b', content: '', updatedAt: 2 });

    const all = await store.getAllDocuments();
    expect(all).toHaveLength(2);
    expect(all.map((d) => d.id).sort()).toEqual(['a', 'b']);
  });

  it('put 同 id 覆盖更新', async () => {
    const store = new DocumentStore({ indexedDB: factory });
    await store.init();

    await store.putDocument({ id: 'a', content: 'old' });
    await store.putDocument({ id: 'a', content: 'new' });

    expect(await store.getAllDocuments()).toHaveLength(1);
    expect((await store.getDocument('a')).content).toBe('new');
  });

  it('deleteDocument 删除指定文档', async () => {
    const store = new DocumentStore({ indexedDB: factory });
    await store.init();

    await store.putDocument({ id: 'a', content: '' });
    await store.putDocument({ id: 'b', content: '' });
    await store.deleteDocument('a');

    expect(await store.getDocument('a')).toBeNull();
    expect(await store.getAllDocuments()).toHaveLength(1);
  });

  it('getMeta/putMeta 往返且剥离内部 key 字段', async () => {
    const store = new DocumentStore({ indexedDB: factory });
    await store.init();

    expect(await store.getMeta()).toBeNull();

    await store.putMeta({
      activeDocumentId: 'doc-1',
      currentStyle: 'wechat-default',
      tocVisible: true
    });
    const meta = await store.getMeta();
    expect(meta.activeDocumentId).toBe('doc-1');
    expect(meta.currentStyle).toBe('wechat-default');
    expect(meta.tocVisible).toBe(true);
    expect(meta.key).toBeUndefined();
  });

  it('未 init 时调用方法会自动初始化', async () => {
    const store = new DocumentStore({ indexedDB: factory });
    await store.putDocument({ id: 'lazy', content: '' });
    expect((await store.getDocument('lazy')).id).toBe('lazy');
  });

  it('indexedDB 工厂缺失时 init 拒绝', async () => {
    const store = new DocumentStore({ indexedDB: null });
    await expect(store.init()).rejects.toThrow('indexedDB unavailable');
  });
});

describe('migrateFromLocalStorage', () => {
  let factory;
  let storage;

  beforeEach(() => {
    factory = makeFactory();
    storage = new MemoryStorage();
  });

  it('IndexedDB 为空而 localStorage 有旧 documents 时导入', async () => {
    storage.setItem('documents', JSON.stringify([
      { id: 'legacy-1', title: '旧文档', content: '旧内容', createdAt: 1, updatedAt: 2 },
      { id: 'legacy-2', title: '', manualTitle: '手动标题', content: '第二篇', createdAt: 3, updatedAt: 4 }
    ]));

    const store = new DocumentStore({ indexedDB: factory });
    const result = await migrateFromLocalStorage(store, storage);

    expect(result.migrated).toBe(2);
    const loaded = await store.getDocument('legacy-1');
    expect(loaded.content).toBe('旧内容');

    // localStorage 原键保留（只读备份）
    expect(storage.getItem('documents')).toContain('legacy-1');
  });

  it('localStorage 有 markdownInput 且无文档时导入为新文档', async () => {
    storage.setItem('markdownInput', '# 老编辑器内容');

    const store = new DocumentStore({ indexedDB: factory });
    const result = await migrateFromLocalStorage(store, storage);

    expect(result.migrated).toBe(1);
    const docs = await store.getAllDocuments();
    expect(docs[0].content).toBe('# 老编辑器内容');
  });

  it('IndexedDB 已有数据时不重复迁移', async () => {
    const store = new DocumentStore({ indexedDB: factory });
    await store.init();
    await store.putDocument({ id: 'already-here', content: '' });

    storage.setItem('documents', JSON.stringify([{ id: 'legacy', content: 'x' }]));

    const result = await migrateFromLocalStorage(store, storage);
    expect(result.migrated).toBe(0);
    const all = await store.getAllDocuments();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('already-here');
  });

  it('localStorage 无任何旧数据时不写入', async () => {
    const store = new DocumentStore({ indexedDB: factory });
    const result = await migrateFromLocalStorage(store, storage);
    expect(result.migrated).toBe(0);
    expect(await store.getAllDocuments()).toHaveLength(0);
  });

  it('损坏的 documents JSON 被安全忽略', async () => {
    storage.setItem('documents', '{broken json!!!');
    storage.setItem('markdownInput', '兜底内容');

    const store = new DocumentStore({ indexedDB: factory });
    const result = await migrateFromLocalStorage(store, storage);

    // documents 解析失败 → 视为无旧文档 → markdownInput 兜底导入
    expect(result.migrated).toBe(1);
    expect((await store.getAllDocuments())[0].content).toBe('兜底内容');
  });

  it('normalizeDocument 归一化函数被应用', async () => {
    storage.setItem('documents', JSON.stringify([{ id: 'raw', content: 'c', junkField: true }]));

    const store = new DocumentStore({ indexedDB: factory });
    await migrateFromLocalStorage(store, storage, {
      normalizeDocument: (doc) => ({ ...doc, normalized: true })
    });

    const loaded = await store.getDocument('raw');
    expect(loaded.normalized).toBe(true);
  });
});
