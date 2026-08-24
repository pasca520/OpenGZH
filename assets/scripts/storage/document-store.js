/**
 * 文档存储管理器 - 使用 IndexedDB 持久化文档与偏好元数据
 *
 * 数据库 OpenGZHDocuments v1：
 * - object store `documents`（keyPath `id`，索引 `updatedAt`）：每篇文档一条记录
 * - object store `meta`（keyPath `key`）：单条记录存 activeDocumentId / currentStyle 等
 *
 * 模式复刻 core/image-store.js（项目既有 IndexedDB 范本）。
 * @module document-store
 */

export const DB_NAME = 'OpenGZHDocuments';
export const DB_VERSION = 1;
const STORE_DOCUMENTS = 'documents';
const STORE_META = 'meta';
const META_KEY = 'app';

/**
 * 判断一个值是否为可用的 IndexedDB 工厂（浏览器环境或测试注入的 mock）。
 */
function resolveIndexedDB(explicit) {
  if (explicit) return explicit;
  if (typeof indexedDB !== 'undefined') return indexedDB;
  return null;
}

export class DocumentStore {
  /**
   * @param {Object} [options]
   * @param {IDBFactory} [options.indexedDB] 注入的 IDB 工厂（测试用），缺省用全局 indexedDB
   */
  constructor(options = {}) {
    /** @type {string} 数据库名称 */
    this.dbName = DB_NAME;
    /** @type {number} 数据库版本 */
    this.version = DB_VERSION;
    /** @type {IDBFactory|null} */
    this._idbFactory = resolveIndexedDB(options.indexedDB);
    /** @type {IDBDatabase|null} */
    this.db = null;
  }

  /**
   * 初始化（打开）数据库；重复调用安全。
   * @returns {Promise<void>}
   */
  init() {
    if (this.db) return Promise.resolve();
    if (!this._idbFactory) {
      return Promise.reject(new Error('indexedDB unavailable'));
    }
    return new Promise((resolve, reject) => {
      const request = this._idbFactory.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error);
        reject(request.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
          const store = db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
    });
  }

  async _ensureDb() {
    if (!this.db) await this.init();
    return this.db;
  }

  _request(db, storeName, mode, operation) {
    return new Promise((resolve, reject) => {
      let request;
      try {
        const transaction = db.transaction([storeName], mode);
        request = operation(transaction.objectStore(storeName));
      } catch (error) {
        reject(error);
        return;
      }
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 写入/更新一篇文档。
   * @param {Object} doc - 含 id 的完整文档记录
   * @returns {Promise<string>} 文档 id
   */
  async putDocument(doc) {
    const db = await this._ensureDb();
    await this._request(db, STORE_DOCUMENTS, 'readwrite', (store) => store.put(doc));
    return doc.id;
  }

  /**
   * 读取一篇文档。
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getDocument(id) {
    const db = await this._ensureDb();
    const result = await this._request(db, STORE_DOCUMENTS, 'readonly', (store) => store.get(id));
    return result || null;
  }

  /**
   * 读取全部文档。
   * @returns {Promise<Array>}
   */
  async getAllDocuments() {
    const db = await this._ensureDb();
    const result = await this._request(db, STORE_DOCUMENTS, 'readonly', (store) => store.getAll());
    return result || [];
  }

  /**
   * 删除一篇文档。
   * @param {string} id
   * @returns {Promise<void>}
   */
  async deleteDocument(id) {
    const db = await this._ensureDb();
    await this._request(db, STORE_DOCUMENTS, 'readwrite', (store) => store.delete(id));
  }

  /**
   * 读取 meta 记录（activeDocumentId、currentStyle 等聚合）。
   * @returns {Promise<Object|null>} meta 对象本体（不含 key 字段）
   */
  async getMeta() {
    const db = await this._ensureDb();
    const result = await this._request(db, STORE_META, 'readonly', (store) => store.get(META_KEY));
    if (!result) return null;
    const { key: _key, ...meta } = result;
    return meta;
  }

  /**
   * 写入 meta 记录。
   * @param {Object} meta
   * @returns {Promise<void>}
   */
  async putMeta(meta) {
    const db = await this._ensureDb();
    await this._request(db, STORE_META, 'readwrite', (store) => store.put({ ...meta, key: META_KEY }));
  }
}

/**
 * localStorage → IndexedDB 迁移。
 *
 * 仅当 IndexedDB 无文档且 localStorage 存在旧 `documents` 键时执行一次导入；
 * 导入成功后保留 localStorage 原键不删（只读备份，防迁移 bug 丢数据）。
 *
 * @param {DocumentStore} store
 * @param {Storage} storage - localStorage（测试可注入 mock）
 * @param {Object} [options]
 * @param {(doc: Object, index: number) => Object|null} [options.normalizeDocument] 归一化函数
 * @returns {Promise<{migrated: number}>} 导入文档数
 */
export async function migrateFromLocalStorage(store, storage, options = {}) {
  await store.init();

  const existing = await store.getAllDocuments();
  if (existing.length > 0) {
    return { migrated: 0 };
  }

  let legacyDocuments = [];
  try {
    const raw = storage.getItem('documents');
    if (raw) legacyDocuments = JSON.parse(raw);
  } catch (_error) {
    legacyDocuments = [];
  }

  if (!Array.isArray(legacyDocuments)) legacyDocuments = [];

  // 旧 markdownInput 内容在无任何文档时也导入为一个新文档
  const normalize = options.normalizeDocument || ((doc) => doc);
  const normalized = legacyDocuments.map((doc, index) => normalize(doc, index)).filter(Boolean);

  const legacyContent = typeof storage.getItem === 'function' ? storage.getItem('markdownInput') : null;
  if (normalized.length === 0 && legacyContent) {
    const now = Date.now();
    normalized.push({
      id: `doc-migrated-${now}`,
      title: '',
      manualTitle: '',
      content: legacyContent,
      createdAt: now,
      updatedAt: now,
      sortOrder: 0,
      dirty: false
    });
  }

  for (const doc of normalized) {
    await store.putDocument(doc);
  }

  return { migrated: normalized.length };
}
