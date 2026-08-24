(function openGzhContentScript(root) {
  'use strict';

  const PLATFORM_IDS = Object.freeze(['weixin', 'zhihu', 'juejin', 'woshipm']);
  const PLATFORMS = Object.freeze({
    weixin: Object.freeze({ name: '微信公众号', loginUrl: 'https://mp.weixin.qq.com/' }),
    zhihu: Object.freeze({ name: '知乎', loginUrl: 'https://www.zhihu.com/signin' }),
    juejin: Object.freeze({ name: '掘金', loginUrl: 'https://juejin.cn/login' }),
    woshipm: Object.freeze({ name: '人人都是产品经理', loginUrl: 'https://www.woshipm.com/login.html' }),
  });
  const SUBTITLE = '微信公众号、知乎、掘金、人人都是产品经理文章同步助手';
  const PORT_NAME = 'opengzh-distribution-v1';
  const STORAGE_KEY = 'opengzh.selectedPlatformIds';
  const PAGE_EVENTS = Object.freeze({
    request: 'opengzh:distribution:request',
    ready: 'opengzh:distribution:ready',
    error: 'opengzh:distribution:error',
  });
  const IMAGE_READ_FAILED = 'IMAGE_READ_FAILED';
  const ARTICLE_INVALID = 'ARTICLE_INVALID';
  const ARTICLE_KEYS = Object.freeze([
    'schemaVersion', 'documentId', 'title', 'markdown', 'portableMarkdown',
    'semanticHtml', 'wechatHtml', 'images', 'createdAt',
  ]);
  const IMAGE_KEYS = Object.freeze({
    'data-url': Object.freeze(['ref', 'kind', 'dataUrl', 'mimeType', 'filename', 'alt']),
    'indexed-db': Object.freeze(['ref', 'kind', 'imageId', 'mimeType', 'filename', 'alt']),
  });
  const STATUS_LABELS = Object.freeze({
    'checking-auth': '检测登录中',
    'auth-required': '需要登录',
    'uploading-images': '上传图片中',
    'saving-draft': '保存草稿中',
    success: '已完成',
    failed: '失败',
    unselected: '未选择',
    unknown: '未知状态',
  });
  const DATA_URL_PATTERN = /^data:(image\/(?:png|jpeg|jpg|gif|webp|avif|svg\+xml));base64,([A-Za-z0-9+/]+={0,2})$/i;
  const SAFE_PAGE_CODES = new Set([ARTICLE_INVALID, IMAGE_READ_FAILED]);
  const SAFE_PAGE_MESSAGES = new Set(['读取失败', '图片读取失败', '文章快照生成失败']);

  function contractError(code, message) {
    const error = new Error(`${code}: ${message}`);
    error.code = code;
    return error;
  }

  function invalid(message) {
    throw contractError(ARTICLE_INVALID, message);
  }

  function readOwnKeys(value) {
    try {
      return Reflect.ownKeys(value);
    } catch {
      invalid('文章数据无法安全检查');
    }
  }

  function isPlainRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    try {
      const prototype = Object.getPrototypeOf(value);
      return prototype === Object.prototype || prototype === null;
    } catch {
      return false;
    }
  }

  function hasExactKeys(value, keys) {
    const ownKeys = readOwnKeys(value);
    return ownKeys.length === keys.length
      && ownKeys.every((key) => typeof key === 'string' && keys.includes(key));
  }

  function hasDenseArraySlots(value) {
    if (!Array.isArray(value)) return false;
    let keys;
    try {
      keys = Reflect.ownKeys(value);
    } catch {
      return false;
    }
    if (keys.length !== value.length + 1 || !keys.includes('length')) return false;
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) return false;
    }
    return true;
  }

  function rejectUnsafeValues(value, seen = new Set()) {
    if (!value || typeof value !== 'object') return;
    if (seen.has(value)) invalid('文章数据不能包含循环引用');
    seen.add(value);
    if (Array.isArray(value)) {
      if (!hasDenseArraySlots(value)) invalid('文章图片或时间字段无效');
    } else if (!isPlainRecord(value)) {
      invalid('文章数据只能包含普通对象');
    }
    for (const key of readOwnKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) invalid('文章数据不能包含 getter 或 setter');
      rejectUnsafeValues(descriptor.value, seen);
    }
    seen.delete(value);
  }

  function isString(value, allowEmpty = true) {
    return typeof value === 'string' && (allowEmpty || value.trim().length > 0);
  }

  function validateImage(image) {
    if (!isPlainRecord(image) || !['indexed-db', 'data-url'].includes(image.kind)) invalid('图片清单格式错误');
    const fields = IMAGE_KEYS[image.kind];
    if (!hasExactKeys(image, fields)) invalid('图片字段越界');
    if (!isString(image.ref, false) || !isString(image.mimeType, false)
      || !/^image\/[a-z0-9.+-]+$/i.test(image.mimeType)
      || !isString(image.filename, false) || !isString(image.alt)) invalid('图片元数据错误');
    if (image.kind === 'indexed-db') {
      if (!isString(image.imageId, false) || image.ref !== `img://${image.imageId}`) invalid('IndexedDB 图片引用错误');
      return;
    }
    const dataMatch = isString(image.dataUrl, false) ? image.dataUrl.match(DATA_URL_PATTERN) : null;
    let base64Valid = Boolean(dataMatch) && dataMatch[2].length % 4 === 0;
    if (base64Valid && typeof root.atob === 'function') {
      try {
        root.atob(dataMatch[2]);
      } catch {
        base64Valid = false;
      }
    }
    if (!dataMatch || !base64Valid || image.ref !== image.dataUrl || image.mimeType.toLowerCase() !== dataMatch[1].toLowerCase()) {
      invalid('Data URL 图片引用错误');
    }
  }

  function cloneValue(value) {
    try {
      return structuredClone(value);
    } catch {
      invalid('文章数据无法安全复制');
    }
  }

  function validateSnapshot(value) {
    try {
      if (!isPlainRecord(value)) invalid('文章数据格式错误');
      rejectUnsafeValues(value);
      if (!hasExactKeys(value, ARTICLE_KEYS) || value.schemaVersion !== 1) {
        invalid('不支持的文章数据版本或字段');
      }
      for (const key of ['documentId', 'title']) {
        if (!isString(value[key], false)) invalid(`文章字段 ${key} 无效`);
      }
      for (const key of ['markdown', 'portableMarkdown', 'semanticHtml', 'wechatHtml']) {
        if (!isString(value[key])) invalid(`文章字段 ${key} 无效`);
      }
      if (!value.portableMarkdown.trim() && !value.semanticHtml.trim() && !value.wechatHtml.trim()) invalid('文章正文为空');
      if (!hasDenseArraySlots(value.images) || !Number.isFinite(value.createdAt)) invalid('文章图片或时间字段无效');
      const refs = new Set();
      for (const image of value.images) {
        validateImage(image);
        if (refs.has(image.ref)) invalid('图片引用重复');
        refs.add(image.ref);
      }
      const clone = cloneValue(value);
      rejectUnsafeValues(clone);
      return clone;
    } catch (error) {
      if (error?.code === ARTICLE_INVALID) throw error;
      invalid('文章数据无法安全检查');
    }
  }

  function normalizeSelection(value) {
    let parsed = value;
    if (typeof value === 'string') {
      try {
        parsed = JSON.parse(value);
      } catch {
        parsed = null;
      }
    }
    if (!Array.isArray(parsed)) return PLATFORM_IDS.slice();
    const selected = PLATFORM_IDS.filter((id) => parsed.includes(id));
    return selected.length ? selected : PLATFORM_IDS.slice();
  }

  function randomId() {
    const cryptoApi = root.crypto;
    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') return cryptoApi.randomUUID();
    if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      cryptoApi.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
    throw contractError(ARTICLE_INVALID, '无法生成安全请求标识');
  }

  function defaultEventCtor() {
    return root.CustomEvent || class ContentEvent {
      constructor(type, init = {}) {
        this.type = type;
        this.detail = init.detail;
      }
    };
  }

  function pageError(detail = {}) {
    const code = SAFE_PAGE_CODES.has(detail.code) ? detail.code : ARTICLE_INVALID;
    const message = SAFE_PAGE_MESSAGES.has(detail.message) ? detail.message : '文章快照生成失败';
    return contractError(code, message);
  }

  function requestSnapshot({ target = root.document, timeoutMs = 15000, CustomEventCtor = defaultEventCtor(), requestId = randomId() } = {}) {
    return new Promise((resolve, reject) => {
      if (!target || typeof target.addEventListener !== 'function' || typeof target.dispatchEvent !== 'function') {
        reject(contractError(ARTICLE_INVALID, '页面快照请求不可用'));
        return;
      }
      let settled = false;
      let timer;
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        target.removeEventListener(PAGE_EVENTS.ready, onReady);
        target.removeEventListener(PAGE_EVENTS.error, onError);
      };
      const settle = (callback, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback(value);
      };
      const onReady = (event) => {
        try {
          const detail = event?.detail;
          if (detail?.requestId !== requestId) return;
          settle(resolve, validateSnapshot(detail.article));
        } catch {
          settle(reject, contractError(ARTICLE_INVALID, '文章快照生成失败'));
        }
      };
      const onError = (event) => {
        try {
          const detail = event?.detail;
          if (detail?.requestId !== requestId) return;
          settle(reject, pageError(detail));
        } catch {
          settle(reject, contractError(ARTICLE_INVALID, '文章快照生成失败'));
        }
      };
      target.addEventListener(PAGE_EVENTS.ready, onReady);
      target.addEventListener(PAGE_EVENTS.error, onError);
      timer = setTimeout(() => settle(reject, contractError(ARTICLE_INVALID, '文章快照生成失败')), timeoutMs);
      try {
        target.dispatchEvent(new CustomEventCtor(PAGE_EVENTS.request, { detail: { requestId } }));
      } catch {
        settle(reject, contractError(ARTICLE_INVALID, '文章快照请求失败'));
      }
    });
  }

  function imageReadError() {
    return contractError(IMAGE_READ_FAILED, '图片读取失败');
  }

  function getImageReference(reference) {
    if (typeof reference === 'string') return { ref: reference };
    if (reference && typeof reference === 'object') return reference;
    throw imageReadError();
  }

  function requestResult(request, success, failure) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        try {
          resolve(success(request.result));
        } catch (error) {
          reject(error);
        }
      };
      request.onerror = () => reject(failure ? failure(request.error) : imageReadError());
      request.onabort = () => reject(imageReadError());
    });
  }

  async function readImageData(reference, options = {}) {
    let image;
    try {
      image = getImageReference(reference);
      const ref = typeof image.ref === 'string' ? image.ref : '';
      if (ref.startsWith('data:')) {
        const dataUrl = typeof image.dataUrl === 'string' ? image.dataUrl : ref;
        const header = dataUrl.match(DATA_URL_PATTERN);
        if (!header) throw imageReadError();
        const dataImage = {
          ref,
          kind: 'data-url',
          dataUrl,
          mimeType: image.mimeType || header[1],
          filename: image.filename || 'image',
          alt: image.alt || '',
        };
        try {
          validateImage(dataImage);
        } catch {
          throw imageReadError();
        }
        return dataUrl;
      }
      if (!ref.startsWith('img://')) throw imageReadError();
      const imageId = image.imageId || ref.slice('img://'.length);
      if (!imageId || ref !== `img://${imageId}`) throw imageReadError();
      const indexedDBApi = options.indexedDB || root.indexedDB;
      const FileReaderCtor = options.FileReaderCtor || root.FileReader;
      if (!indexedDBApi || typeof indexedDBApi.open !== 'function' || typeof FileReaderCtor !== 'function') throw imageReadError();
      const openRequest = indexedDBApi.open('WechatEditorImages', 1);
      const db = await requestResult(openRequest, (result) => result, () => imageReadError());
      try {
        if (!db || typeof db.transaction !== 'function') throw imageReadError();
        const transaction = db.transaction(['images'], 'readonly');
        const request = transaction.objectStore('images').get(imageId);
        const record = await requestResult(request, (result) => result, () => imageReadError());
        if (!record || !record.blob) throw imageReadError();
        const reader = new FileReaderCtor();
        const dataUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(imageReadError());
          reader.onabort = () => reject(imageReadError());
          try {
            reader.readAsDataURL(record.blob);
          } catch {
            reject(imageReadError());
          }
        });
        if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) throw imageReadError();
        return dataUrl;
      } finally {
        if (typeof db.close === 'function') db.close();
      }
    } catch (error) {
      if (error?.code === IMAGE_READ_FAILED) throw error;
      throw imageReadError();
    }
  }

  function createImageResponder({ port, read = readImageData, readImageData: readOverride } = {}) {
    const reader = readOverride || read;
    const queue = [];
    const drainWaiters = [];
    let active = false;

    function post(message) {
      try {
        port?.postMessage?.(message);
      } catch {
        // A disconnected worker must not strand the next queued image.
      }
    }

    function settleDrains() {
      if (active || queue.length) return;
      while (drainWaiters.length) drainWaiters.shift()();
    }

    async function processNext() {
      if (active || !queue.length) {
        settleDrains();
        return;
      }
      active = true;
      const job = queue.shift();
      const message = job.message;
      const image = message.image || message.ref;
      const ref = typeof image === 'string' ? image : (typeof image?.ref === 'string' ? image.ref : '');
      try {
        const dataUrl = await reader(image);
        post({
          type: 'IMAGE_DATA',
          taskId: message.taskId,
          platformId: message.platformId,
          requestId: message.requestId,
          ref,
          dataUrl,
        });
      } catch {
        post({
          type: 'IMAGE_ERROR',
          taskId: message.taskId,
          platformId: message.platformId,
          requestId: message.requestId,
          ref,
          code: IMAGE_READ_FAILED,
          message: '图片读取失败',
        });
      } finally {
        active = false;
        job.resolve();
        processNext();
        settleDrains();
      }
    }

    function handleMessage(message) {
      if (message?.type !== 'IMAGE_REQUIRED') return Promise.resolve();
      return new Promise((resolve) => {
        queue.push({ message, resolve });
        processNext();
      });
    }

    function drain() {
      if (!active && !queue.length) return Promise.resolve();
      return new Promise((resolve) => drainWaiters.push(resolve));
    }

    return { handleMessage, drain };
  }

  function textElement(doc, tag, text, className) {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }

  function defaultStorage() {
    return root.chrome?.storage?.local || null;
  }

  async function restoreSelection(storage) {
    if (!storage) return undefined;
    if (typeof storage.get === 'function') {
      const result = await storage.get(STORAGE_KEY);
      if (Array.isArray(result)) return result;
      return result?.[STORAGE_KEY];
    }
    if (typeof storage.getItem === 'function') return storage.getItem(STORAGE_KEY);
    return undefined;
  }

  async function persistSelection(storage, selected) {
    if (!storage) return;
    if (selected.length) {
      if (typeof storage.set === 'function') {
        await storage.set({ [STORAGE_KEY]: selected.slice() });
      } else {
        await storage.setItem?.(STORAGE_KEY, JSON.stringify(selected));
      }
      return;
    }
    if (typeof storage.remove === 'function') await storage.remove(STORAGE_KEY);
    else await storage.removeItem?.(STORAGE_KEY);
  }

  function createUi({
    document: doc = root.document,
    anchor = doc?.querySelector?.('[data-opengzh-copy-button]'),
    port,
    storage = defaultStorage(),
    snapshotRequest = requestSnapshot,
    idFactory = randomId,
    windowObject = root,
  } = {}) {
    if (!doc || !anchor || !anchor.parentNode) return null;
    const existingHost = doc.querySelector?.('[data-opengzh-extension-host]');
    if (existingHost) return { host: existingHost, existing: true };
    const host = doc.createElement('span');
    host.setAttribute('data-opengzh-extension-host', '');
    anchor.parentNode.insertBefore(host, anchor.nextSibling || null);
    if (typeof host.attachShadow !== 'function') return { host, existing: false };
    const shadow = host.attachShadow({ mode: 'open' });
    const state = { selected: PLATFORM_IDS.slice(), busy: false, taskId: null, draftUrls: new Map() };

    const shell = doc.createElement('div');
    shell.className = 'opengzh-extension-shell';
    const trigger = textElement(doc, 'button', '同步到平台', 'opengzh-trigger');
    trigger.type = 'button';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
    const panel = doc.createElement('section');
    panel.className = 'opengzh-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'OpenGZH');
    const title = textElement(doc, 'h2', 'OpenGZH', 'opengzh-title');
    title.id = 'opengzh-title';
    panel.setAttribute('aria-labelledby', title.id);
    const subtitle = textElement(doc, 'p', SUBTITLE, 'opengzh-subtitle');
    const close = textElement(doc, 'button', '关闭', 'opengzh-close');
    close.type = 'button';
    close.setAttribute('aria-label', '关闭');
    const rows = doc.createElement('div');
    rows.className = 'opengzh-platforms';
    const rowMap = new Map();
    for (const platformId of PLATFORM_IDS) {
      const row = doc.createElement('div');
      row.className = 'opengzh-platform-row';
      row.dataset.platformId = platformId;
      const checkbox = doc.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.dataset.platformId = platformId;
      const icon = textElement(doc, 'span', '', 'platform-icon');
      icon.dataset.platformId = platformId;
      const name = textElement(doc, 'span', PLATFORMS[platformId].name, 'opengzh-platform-name');
      const status = textElement(doc, 'span', '未知状态', 'opengzh-platform-status');
      status.setAttribute('aria-live', 'polite');
      const login = textElement(doc, 'button', '登录', 'opengzh-login');
      login.type = 'button';
      login.setAttribute('aria-label', `${PLATFORMS[platformId].name}登录`);
      const retry = textElement(doc, 'button', '重新检测', 'opengzh-retry');
      retry.type = 'button';
      retry.setAttribute('aria-label', `${PLATFORMS[platformId].name}重新检测`);
      const draft = textElement(doc, 'a', '打开草稿', 'opengzh-draft');
      draft.target = '_blank';
      draft.rel = 'noopener';
      draft.setAttribute('aria-label', `${PLATFORMS[platformId].name}打开草稿`);
      draft.hidden = true;
      checkbox.setAttribute('aria-label', `${PLATFORMS[platformId].name}同步选择`);
      row.append(checkbox, icon, name, status, login, retry, draft);
      rows.append(row);
      rowMap.set(platformId, { row, checkbox, status, login, retry, draft });
      checkbox.addEventListener('change', () => {
        if (state.busy) return;
        state.selected = PLATFORM_IDS.filter((id) => rowMap.get(id).checkbox.checked);
        persistSelection(storage, state.selected).catch(() => {});
      });
      login.addEventListener('click', () => {
        windowObject.open?.(PLATFORMS[platformId].loginUrl, '_blank', 'noopener');
      });
      retry.addEventListener('click', () => {
        if (state.busy) return;
        post({
          type: state.taskId ? 'RETRY_PLATFORM' : 'CHECK_AUTH',
          ...(state.taskId ? { taskId: state.taskId, platformId } : { platformIds: [platformId] }),
        });
      });
    }
    const alert = textElement(doc, 'p', '', 'opengzh-alert');
    alert.setAttribute('role', 'alert');
    alert.setAttribute('aria-live', 'polite');
    const start = textElement(doc, 'button', '保存草稿并打开', 'opengzh-start');
    start.type = 'button';
    const backdrop = doc.createElement('div');
    backdrop.className = 'opengzh-backdrop';
    backdrop.hidden = true;
    panel.append(close, title, subtitle, rows, alert, start);
    backdrop.append(panel);
    shell.append(trigger, backdrop);
    const style = doc.createElement('style');
    style.textContent = `
      :host { all: initial; font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; color: #15233f; }
      .opengzh-extension-shell { display: inline-block; position: relative; z-index: 2147483646; }
      button, a { font: inherit; }
      button { cursor: pointer; }
      button:focus-visible, a:focus-visible, input:focus-visible { outline: 3px solid #2563eb; outline-offset: 2px; }
      .opengzh-trigger { border: 1px solid #315efb; border-radius: 8px; padding: 8px 12px; background: #315efb; color: #fff; }
      .opengzh-backdrop { position: fixed; inset: 0; display: grid; place-items: center; padding: 16px; background: rgba(15,23,42,.34); }
      .opengzh-panel { width: min(520px, calc(100vw - 32px)); max-height: min(680px, calc(100vh - 32px)); overflow: auto; box-sizing: border-box; padding: 20px; border-radius: 16px; background: #fff; box-shadow: 0 18px 60px rgba(15,23,42,.24); }
      .opengzh-platforms { display: grid; gap: 8px; }
      .opengzh-platform-row { display: grid; grid-template-columns: auto 24px minmax(0,1fr) auto auto auto; gap: 8px; align-items: center; padding: 8px; border: 1px solid #dbe3f0; border-radius: 10px; }
      .platform-icon { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 6px; background: #e7edff; }
      .opengzh-platform-status { min-width: 7em; color: #596780; }
      .opengzh-draft[hidden], .opengzh-login[hidden], .opengzh-backdrop[hidden] { display: none; }
      @media (max-width: 560px) { .opengzh-platform-row { grid-template-columns: auto 24px minmax(0,1fr); } .opengzh-platform-status { grid-column: 3; } }
    `;
    shadow.append(style, shell);

    const imageResponder = createImageResponder({ port });
    function post(message) {
      if (!port || typeof port.postMessage !== 'function') {
        finishTask('无法连接同步服务');
        return false;
      }
      try {
        port.postMessage(message);
        return true;
      } catch {
        finishTask('无法连接同步服务');
        return false;
      }
    }

    function renderSelection() {
      for (const platformId of PLATFORM_IDS) rowMap.get(platformId).checkbox.checked = state.selected.includes(platformId);
    }

    function setLocked(locked) {
      start.disabled = locked;
      for (const { checkbox, retry } of rowMap.values()) {
        checkbox.disabled = locked;
        retry.disabled = locked;
      }
    }

    function setAlert(message) {
      alert.textContent = message || '';
    }

    function setStatus(platformId, status, message) {
      const row = rowMap.get(platformId);
      if (!row) return;
      if (status === 'unknown') {
        row.status.textContent = '请检查平台草稿箱';
        return;
      }
      const progress = message?.progress || message;
      const completed = Number(progress?.completed);
      const total = Number(progress?.total);
      row.status.textContent = STATUS_LABELS[status] || '请检查平台草稿箱';
      if (status === 'uploading-images' && Number.isFinite(completed) && Number.isFinite(total)) {
        row.status.textContent = `${STATUS_LABELS[status]} ${completed}/${total}`;
      }
      if (status === 'success' && typeof message?.draftUrl === 'string' && message.draftUrl) {
        row.draft.href = message.draftUrl;
        row.draft.hidden = false;
      }
      if (status === 'failed') {
        const errorMessage = typeof message?.error === 'string' ? message.error : message?.error?.message;
        if (errorMessage) row.status.textContent = errorMessage;
      }
    }

    function setAuthStatus(platformId, authenticated) {
      const row = rowMap.get(platformId);
      if (!row) return;
      row.status.textContent = authenticated ? '已登录' : STATUS_LABELS['auth-required'];
      row.login.hidden = authenticated;
    }

    function finishTask(message = '', { clearTask = true } = {}) {
      state.busy = false;
      if (clearTask) state.taskId = null;
      setLocked(false);
      if (message) setAlert(message);
    }

    function sendCheckAuth() {
      for (const platformId of PLATFORM_IDS) {
        setStatus(platformId, state.selected.includes(platformId) ? 'checking-auth' : 'unselected');
      }
      if (!state.selected.length) {
        setAlert('至少选择一个平台');
        return false;
      }
      setAlert('');
      post({ type: 'CHECK_AUTH', platformIds: state.selected.slice() });
    }

    async function startBatch() {
      await ready;
      if (state.busy) return;
      if (!state.selected.length) {
        setAlert('至少选择一个平台');
        return;
      }
      state.busy = true;
      setLocked(true);
      setAlert('正在读取文章');
      try {
        const article = await snapshotRequest({ target: doc });
        if (!state.busy) return;
        state.taskId = idFactory();
        post({ type: 'START_BATCH', taskId: state.taskId, platformIds: state.selected.slice(), article });
      } catch (error) {
        finishTask(error?.message || '文章快照生成失败');
      }
    }

    async function openPanel() {
      await ready;
      panel.hidden = false;
      backdrop.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      close.focus();
      sendCheckAuth();
    }

    function closePanel() {
      backdrop.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    }

    function onMessage(message) {
      if (message?.type === 'IMAGE_REQUIRED') {
        imageResponder.handleMessage(message);
        return;
      }
      if (message?.type === 'AUTH_RESULT') {
        const results = Array.isArray(message.results)
          ? message.results
          : (message.platforms && typeof message.platforms === 'object'
            ? PLATFORM_IDS.map((platformId) => ({ platformId, ...message.platforms[platformId] }))
            : (message.platformId ? [message] : []));
        for (const result of results) {
          const authenticated = result.authenticated ?? result.loggedIn ?? result.ok;
          setAuthStatus(result.platformId, Boolean(authenticated));
        }
        return;
      }
      if (message?.type === 'PLATFORM_STATE') {
        if (message.taskId && message.taskId !== state.taskId) return;
        const status = message.status || message.state || 'unknown';
        setStatus(message.platformId, status, message);
        if (status === 'success' && message.draftUrl) state.draftUrls.set(message.platformId, message.draftUrl);
        return;
      }
      if (message?.type === 'BATCH_COMPLETE') {
        if (state.taskId && message.taskId === state.taskId) finishTask('', { clearTask: false });
        return;
      }
      if (message?.type === 'FATAL_ERROR') {
        finishTask(typeof message.message === 'string' ? message.message : '同步失败');
      }
    }

    port?.onMessage?.addListener?.(onMessage);
    port?.onDisconnect?.addListener?.(() => finishTask('无法连接同步服务'));
    trigger.addEventListener('click', openPanel);
    close.addEventListener('click', closePanel);
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) closePanel();
    });
    doc.addEventListener?.('keydown', (event) => {
      if (event.key === 'Escape' && !backdrop.hidden) closePanel();
    });
    start.addEventListener('click', startBatch);
    renderSelection();
    const ready = restoreSelection(storage).then((persisted) => {
      state.selected = normalizeSelection(persisted);
      renderSelection();
    }).catch(() => {
      state.selected = PLATFORM_IDS.slice();
      renderSelection();
    });

    return {
      host,
      shadow,
      state,
      trigger,
      panel,
      backdrop,
      alert,
      close,
      ready,
      start,
      rows: rowMap,
      openPanel,
      closePanel,
      startBatch,
      onMessage,
      imageResponder,
    };
  }

  function connectPort() {
    try {
      return root.chrome?.runtime?.connect?.({ name: PORT_NAME }) || null;
    } catch {
      return null;
    }
  }

  function boot() {
    const doc = root.document;
    const anchor = doc?.querySelector?.('[data-opengzh-copy-button]');
    if (!anchor) return null;
    return createUi({ document: doc, anchor, port: connectPort() });
  }

  if (typeof document === 'undefined') {
    root.__OPENGZH_CONTENT_TEST__ = {
      PLATFORM_IDS,
      PLATFORMS,
      PAGE_EVENTS,
      PORT_NAME,
      STORAGE_KEY,
      normalizeSelection,
      validateSnapshot,
      requestSnapshot,
      readImageData,
      createImageResponder,
      createUi,
      boot,
    };
  } else if (root.document.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
