(function openGzhContentScript(root) {
  'use strict';

  const PLATFORM_IDS = Object.freeze(['weixin', 'zhihu', 'juejin', 'woshipm']);
  const PLATFORMS = Object.freeze({
    weixin: Object.freeze({ name: '微信公众号', loginUrl: 'https://mp.weixin.qq.com/' }),
    zhihu: Object.freeze({ name: '知乎', loginUrl: 'https://www.zhihu.com/signin' }),
    juejin: Object.freeze({ name: '掘金', loginUrl: 'https://juejin.cn/login' }),
    woshipm: Object.freeze({ name: '人人都是产品经理', loginUrl: 'https://www.woshipm.com/login.html' }),
  });
  const PLATFORM_ICONS = Object.freeze({ weixin: '微', zhihu: '知', juejin: '掘', woshipm: '人' });
  const SUBTITLE = '选择平台，确认登录状态后保存为草稿。';
  const PORT_NAME = 'opengzh-distribution-v1';
  const STORAGE_KEY = 'opengzh.selectedPlatformIds';
  const PAGE_EVENTS = Object.freeze({
    request: 'opengzh:distribution:request',
    ready: 'opengzh:distribution:ready',
    error: 'opengzh:distribution:error',
    open: 'opengzh:distribution:open',
    opened: 'opengzh:distribution:opened',
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
  const DRAFT_HOSTS = Object.freeze({
    weixin: 'mp.weixin.qq.com',
    zhihu: 'zhuanlan.zhihu.com',
    juejin: 'juejin.cn',
    woshipm: 'www.woshipm.com',
  });
  const SENSITIVE_QUERY = /(?:token|ticket|csrf|access_key|session_token)/i;
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

  function sanitizeDraftUrl(platformId, value) {
    if (typeof value !== 'string' || !DRAFT_HOSTS[platformId]) return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.hostname !== DRAFT_HOSTS[platformId] || url.username || url.password) return null;
      for (const key of [...url.searchParams.keys()]) {
        if (SENSITIVE_QUERY.test(key)) url.searchParams.delete(key);
      }
      return url.href;
    } catch {
      return null;
    }
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

  function requestSnapshot({ target = root.document, timeoutMs = 15000, CustomEventCtor = defaultEventCtor(), requestId = randomId(), signal } = {}) {
    return new Promise((resolve, reject) => {
      if (!target || typeof target.addEventListener !== 'function' || typeof target.dispatchEvent !== 'function') {
        reject(contractError(ARTICLE_INVALID, '页面快照请求不可用'));
        return;
      }
      let settled = false;
      let timer;
      let onAbort;
      const cleanup = () => {
        if (timer) clearTimeout(timer);
        target.removeEventListener(PAGE_EVENTS.ready, onReady);
        target.removeEventListener(PAGE_EVENTS.error, onError);
        signal?.removeEventListener?.('abort', onAbort);
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
      onAbort = () => settle(reject, contractError(ARTICLE_INVALID, '文章快照生成失败'));
      if (signal?.aborted) {
        onAbort();
        return;
      }
      target.addEventListener(PAGE_EVENTS.ready, onReady);
      target.addEventListener(PAGE_EVENTS.error, onError);
      signal?.addEventListener?.('abort', onAbort, { once: true });
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
        if (typeof dataUrl !== 'string') throw imageReadError();
        const header = dataUrl.match(DATA_URL_PATTERN);
        if (!header || (image.mimeType && image.mimeType.toLowerCase() !== header[1].toLowerCase())) throw imageReadError();
        try {
          validateImage({
            ref: dataUrl,
            kind: 'data-url',
            dataUrl,
            mimeType: header[1],
            filename: image.filename || 'image',
            alt: image.alt || '',
          });
        } catch {
          throw imageReadError();
        }
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
    let currentPort = port;

    function post(message) {
      try {
        currentPort?.postMessage?.(message);
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

    function setPort(nextPort) {
      currentPort = nextPort || null;
    }

    return { handleMessage, drain, setPort };
  }

  function textElement(doc, tag, text, className) {
    const element = doc.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  }

  function findStableAnchorContainer(anchor) {
    let current = anchor?.parentNode || null;
    while (current) {
      if (/\bcopy-buttons\b/.test(String(current.className || ''))) return current;
      current = current.parentNode;
    }
    return null;
  }

  function isImmediateSibling(parent, reference, child) {
    if (!parent || !reference || reference.parentNode !== parent || child.parentNode !== parent) return false;
    if (reference.nextSibling === child) return true;
    const index = Array.isArray(parent.children) ? parent.children.indexOf(reference) : -1;
    return index >= 0 && parent.children[index + 1] === child;
  }

  function mountHostAfterAnchor(host, anchor) {
    const container = findStableAnchorContainer(anchor);
    const reference = container?.parentNode ? container : anchor;
    const parent = reference?.parentNode || null;
    if (!host || !reference || !parent) return false;
    if (isImmediateSibling(parent, reference, host)) return true;
    parent.insertBefore(host, reference.nextSibling || null);
    return true;
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
    anchor = doc?.querySelector?.('[data-opengzh-distribution-button]'),
    port,
    storage = defaultStorage(),
    snapshotRequest = requestSnapshot,
    idFactory = randomId,
    authIdFactory = randomId,
    operationIdFactory = randomId,
    AbortControllerCtor = root.AbortController,
    windowObject = root,
    CustomEventCtor = defaultEventCtor(),
    reconnectPort,
  } = {}) {
    if (!doc || !anchor || !anchor.parentNode) return null;
    const existingHost = doc.querySelector?.('[data-opengzh-extension-host]');
    if (existingHost) return { host: existingHost, existing: true };
    let currentAnchor = anchor;
    const host = doc.createElement('span');
    host.setAttribute('data-opengzh-extension-host', '');
    mountHostAfterAnchor(host, anchor);
    if (typeof host.attachShadow !== 'function') return { host, existing: false };
    const shadow = host.attachShadow({ mode: 'open' });
    const state = {
      selected: PLATFORM_IDS.slice(),
      busy: false,
      taskId: null,
      retryTaskId: null,
      generation: 0,
      authRequestId: null,
      authPlatforms: [],
      authCompleted: new Set(),
      operationId: null,
      draftUrls: new Map(),
      portConnected: Boolean(port),
      disposed: false,
      panelOpen: false,
      selectionRevision: 0,
    };
    Object.defineProperties(state, {
      activeTaskId: { get: () => state.taskId, set: (value) => { state.taskId = value; } },
      activeOperationId: { get: () => state.operationId, set: (value) => { state.operationId = value; } },
    });
    const listenerDisposers = [];
    function listen(target, type, handler) {
      target?.addEventListener?.(type, handler);
      if (target?.removeEventListener) listenerDisposers.push(() => target.removeEventListener(type, handler));
    }

    function setAnchor(nextAnchor) {
      if (!nextAnchor) return false;
      if (currentAnchor !== nextAnchor) currentAnchor.setAttribute?.('aria-expanded', 'false');
      currentAnchor = nextAnchor;
      currentAnchor.setAttribute?.('aria-expanded', state.panelOpen ? 'true' : 'false');
      return true;
    }

    const shell = doc.createElement('div');
    shell.className = 'opengzh-extension-shell';
    const panel = doc.createElement('section');
    panel.className = 'opengzh-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'OpenGZH');
    const header = doc.createElement('header');
    header.className = 'opengzh-header';
    const heading = doc.createElement('div');
    heading.className = 'opengzh-heading';
    const title = textElement(doc, 'h2', '同步到内容平台', 'opengzh-title');
    title.id = 'opengzh-title';
    panel.setAttribute('aria-labelledby', title.id);
    const subtitle = textElement(doc, 'p', SUBTITLE, 'opengzh-subtitle');
    const close = textElement(doc, 'button', '×', 'opengzh-close');
    close.type = 'button';
    close.setAttribute('aria-label', '关闭');
    heading.append(title, subtitle);
    header.append(heading, close);
    const rows = doc.createElement('div');
    rows.className = 'opengzh-platforms';
    const rowMap = new Map();
    for (const platformId of PLATFORM_IDS) {
      const row = doc.createElement('div');
      row.className = 'opengzh-platform-row';
      row.dataset.platformId = platformId;
      row.dataset.status = 'unknown';
      const checkbox = doc.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.dataset.platformId = platformId;
      const icon = textElement(doc, 'span', PLATFORM_ICONS[platformId], 'platform-icon');
      icon.dataset.platformId = platformId;
      icon.setAttribute('aria-hidden', 'true');
      const name = textElement(doc, 'span', PLATFORMS[platformId].name, 'opengzh-platform-name');
      const status = textElement(doc, 'span', '未知状态', 'opengzh-platform-status');
      status.setAttribute('aria-live', 'polite');
      const details = doc.createElement('div');
      details.className = 'opengzh-platform-details';
      details.append(name, status);
      const actions = doc.createElement('div');
      actions.className = 'opengzh-platform-actions';
      const login = textElement(doc, 'button', '登录', 'opengzh-login');
      login.type = 'button';
      login.hidden = true;
      login.setAttribute('aria-label', `${PLATFORMS[platformId].name}登录`);
      const retry = textElement(doc, 'button', '重新检测', 'opengzh-retry');
      retry.type = 'button';
      retry.hidden = true;
      retry.setAttribute('aria-label', `${PLATFORMS[platformId].name}重新检测`);
      const draft = textElement(doc, 'a', '打开草稿', 'opengzh-draft');
      draft.target = '_blank';
      draft.rel = 'noopener';
      draft.setAttribute('aria-label', `${PLATFORMS[platformId].name}打开草稿`);
      draft.hidden = true;
      checkbox.setAttribute('aria-label', `${PLATFORMS[platformId].name}同步选择`);
      actions.append(login, retry, draft);
      row.append(checkbox, icon, details, actions);
      rows.append(row);
      rowMap.set(platformId, { row, checkbox, status, login, retry, draft, canRetry: false, statusKey: 'unknown' });
      listen(checkbox, 'change', () => {
        if (state.busy) return;
        state.selectionRevision += 1;
        invalidateAuth();
        state.selected = PLATFORM_IDS.filter((id) => rowMap.get(id).checkbox.checked);
        setLocked(state.busy);
        persistSelection(storage, state.selected).catch(() => setAlert('选择未保存'));
      });
      listen(login, 'click', () => {
        windowObject.open?.(PLATFORMS[platformId].loginUrl, '_blank', 'noopener');
      });
      listen(retry, 'click', () => {
        if (state.busy || !rowMap.get(platformId).canRetry) return;
        if (state.retryTaskId) {
          state.busy = true;
          state.taskId = state.retryTaskId;
          state.operationId = operationIdFactory();
          state.generation += 1;
          setStatus(platformId, 'checking-auth');
          setLocked(true);
          post({ type: 'RETRY_PLATFORM', taskId: state.taskId, operationId: state.operationId, platformId });
          return;
        }
        sendCheckAuth([platformId]);
      });
    }
    const alert = textElement(doc, 'p', '', 'opengzh-alert');
    alert.setAttribute('role', 'alert');
    alert.setAttribute('aria-live', 'polite');
    const start = textElement(doc, 'button', '保存草稿并打开', 'opengzh-start');
    start.type = 'button';
    const content = doc.createElement('div');
    content.className = 'opengzh-content';
    content.append(rows, alert);
    const footer = doc.createElement('footer');
    footer.className = 'opengzh-footer';
    const footerNote = textElement(doc, 'p', '只保存草稿，不会自动发布', 'opengzh-footer-note');
    footer.append(footerNote, start);
    const backdrop = doc.createElement('div');
    backdrop.className = 'opengzh-backdrop';
    backdrop.hidden = true;
    panel.append(header, content, footer);
    backdrop.append(panel);
    shell.append(backdrop);
    const style = doc.createElement('style');
    style.textContent = `
      :host {
        all: initial;
        --ogzh-text: #172033;
        --ogzh-muted: #667085;
        --ogzh-border: #e3e8ef;
        --ogzh-surface: #ffffff;
        --ogzh-primary: #1769e0;
        --ogzh-primary-hover: #1259c2;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ogzh-text);
      }
      * { box-sizing: border-box; }
      .opengzh-extension-shell { display: inline-block; position: relative; z-index: 2147483646; }
      button, a, input { font: inherit; }
      button, a { -webkit-tap-highlight-color: transparent; }
      button { cursor: pointer; }
      button:focus-visible, a:focus-visible, input:focus-visible { outline: 3px solid rgba(23, 105, 224, .38); outline-offset: 2px; }
      .opengzh-backdrop {
        position: fixed;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 16px;
        background: rgba(15, 23, 42, .48);
        backdrop-filter: blur(4px);
      }
      .opengzh-panel {
        width: min(560px, calc(100vw - 32px));
        max-height: min(720px, calc(100vh - 32px));
        display: grid;
        grid-template-rows: auto minmax(0, 1fr) auto;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, .64);
        border-radius: 18px;
        background: var(--ogzh-surface);
        box-shadow: 0 24px 72px rgba(15, 23, 42, .28), 0 2px 8px rgba(15, 23, 42, .08);
      }
      .opengzh-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        padding: 24px 24px 18px;
        border-bottom: 1px solid #edf0f4;
      }
      .opengzh-heading { min-width: 0; }
      .opengzh-title { margin: 0; color: #111827; font-size: 22px; font-weight: 700; line-height: 1.3; letter-spacing: -.02em; }
      .opengzh-subtitle { margin: 7px 0 0; color: var(--ogzh-muted); font-size: 14px; line-height: 1.55; }
      .opengzh-close {
        flex: 0 0 auto;
        width: 44px;
        min-height: 44px;
        border: 0;
        border-radius: 12px;
        background: transparent;
        color: #667085;
        font-size: 27px;
        font-weight: 300;
        line-height: 1;
        transition: color 180ms ease, background 180ms ease, transform 180ms ease;
      }
      .opengzh-close:hover { background: #f2f4f7; color: #111827; }
      .opengzh-close:active { transform: scale(.96); }
      .opengzh-content { min-height: 0; overflow: auto; padding: 18px 24px 20px; }
      .opengzh-platforms { display: grid; gap: 10px; }
      .opengzh-platform-row {
        min-height: 72px;
        display: grid;
        grid-template-columns: 20px 40px minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
        padding: 12px 14px;
        border: 1px solid var(--ogzh-border);
        border-radius: 12px;
        background: var(--ogzh-surface);
        transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
      }
      .opengzh-platform-row:hover { border-color: #cbd5e1; box-shadow: 0 4px 14px rgba(15, 23, 42, .05); }
      .opengzh-platform-row:has(input:checked) { border-color: #cbdcf7; background: #fbfdff; }
      .opengzh-platform-row input[type="checkbox"] { width: 18px; height: 18px; margin: 0; accent-color: var(--ogzh-primary); cursor: pointer; }
      .opengzh-platform-row input[type="checkbox"]:disabled { cursor: not-allowed; opacity: .55; }
      .platform-icon {
        display: inline-grid;
        place-items: center;
        width: 40px;
        height: 40px;
        border-radius: 11px;
        background: #eaf2ff;
        color: #184b93;
        font-size: 18px;
        font-weight: 700;
      }
      .opengzh-platform-details { display: grid; gap: 4px; min-width: 0; }
      .opengzh-platform-name { color: #172033; font-size: 15px; font-weight: 650; line-height: 1.35; }
      .opengzh-platform-status {
        min-width: 0;
        display: inline-flex;
        align-items: flex-start;
        gap: 7px;
        color: var(--ogzh-muted);
        font-size: 13px;
        line-height: 1.45;
        overflow-wrap: anywhere;
      }
      .opengzh-platform-status::before { content: ""; flex: 0 0 auto; width: 7px; height: 7px; margin-top: 6px; border-radius: 999px; background: #98a2b3; }
      .opengzh-platform-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
      .opengzh-login, .opengzh-retry, .opengzh-draft {
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 12px;
        border: 1px solid #d0d5dd;
        border-radius: 10px;
        background: #fff;
        color: #344054;
        font-size: 13px;
        font-weight: 650;
        line-height: 1;
        text-decoration: none;
        transition: color 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease, transform 180ms ease;
      }
      .opengzh-login:hover, .opengzh-retry:hover, .opengzh-draft:hover { border-color: #98a2b3; background: #f9fafb; color: #101828; }
      .opengzh-login:active, .opengzh-retry:active, .opengzh-draft:active { transform: translateY(1px); }
      .opengzh-alert { margin: 14px 0 0; color: #b42318; font-size: 13px; line-height: 1.5; }
      .opengzh-alert:empty { display: none; }
      .opengzh-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 16px 24px 20px;
        border-top: 1px solid #edf0f4;
        background: rgba(255, 255, 255, .98);
      }
      .opengzh-footer-note { margin: 0; color: var(--ogzh-muted); font-size: 13px; line-height: 1.45; }
      .opengzh-start {
        min-height: 44px;
        padding: 0 18px;
        border: 1px solid var(--ogzh-primary);
        border-radius: 10px;
        background: var(--ogzh-primary);
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        line-height: 1;
        box-shadow: 0 7px 18px rgba(23, 105, 224, .2);
        transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
      }
      .opengzh-start:hover { border-color: var(--ogzh-primary-hover); background: var(--ogzh-primary-hover); box-shadow: 0 9px 22px rgba(23, 105, 224, .25); }
      .opengzh-start:active { transform: translateY(1px); }
      .opengzh-start:disabled { cursor: not-allowed; border-color: #d0d5dd; background: #e4e7ec; color: #98a2b3; box-shadow: none; }
      .opengzh-platform-row[data-status="authenticated"] .opengzh-platform-status,
      .opengzh-platform-row[data-status="success"] .opengzh-platform-status { color: #137a4b; }
      .opengzh-platform-row[data-status="authenticated"] .opengzh-platform-status::before,
      .opengzh-platform-row[data-status="success"] .opengzh-platform-status::before { background: #12a56a; }
      .opengzh-platform-row[data-status="auth-required"] .opengzh-platform-status { color: #a15c00; }
      .opengzh-platform-row[data-status="auth-required"] .opengzh-platform-status::before { background: #e99518; }
      .opengzh-platform-row[data-status="failed"] .opengzh-platform-status { color: #b42318; }
      .opengzh-platform-row[data-status="failed"] .opengzh-platform-status::before { background: #d92d20; }
      .opengzh-platform-row[data-status="checking-auth"] .opengzh-platform-status::before,
      .opengzh-platform-row[data-status="uploading-images"] .opengzh-platform-status::before,
      .opengzh-platform-row[data-status="saving-draft"] .opengzh-platform-status::before {
        background: var(--ogzh-primary);
        animation: opengzh-pulse 1.1s ease-in-out infinite;
      }
      @keyframes opengzh-pulse { 50% { opacity: .28; transform: scale(.78); } }
      .opengzh-draft[hidden], .opengzh-login[hidden], .opengzh-retry[hidden], .opengzh-backdrop[hidden] { display: none; }
      @media (max-width: 560px) {
        .opengzh-platform-row { grid-template-columns: 20px 40px minmax(0, 1fr); }
        .opengzh-platform-actions { grid-column: 2 / 4; justify-content: flex-start; }
      }
      @media (max-width: 390px) {
        .opengzh-backdrop { padding: 8px; }
        .opengzh-panel { width: calc(100vw - 16px); max-height: calc(100vh - 16px); border-radius: 16px; }
        .opengzh-header { padding: 20px 16px 16px; }
        .opengzh-content { padding: 14px 16px 18px; }
        .opengzh-footer { display: grid; gap: 12px; padding: 14px 16px 16px; }
        .opengzh-start { width: 100%; }
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
      }
    `;
    shadow.append(style, shell);

    const imageResponder = createImageResponder({ port });
    let activePort = null;
    let activePortMessageListener = null;
    let activePortDisconnectListener = null;
    let handshake = null;
    let snapshotController = null;
    function createSnapshotController() {
      if (typeof AbortControllerCtor === 'function') return new AbortControllerCtor();
      let aborted = false;
      const listeners = new Set();
      const signal = {
        get aborted() { return aborted; },
        addEventListener(type, listener) { if (type === 'abort') listeners.add(listener); },
        removeEventListener(type, listener) { if (type === 'abort') listeners.delete(listener); },
      };
      return {
        signal,
        abort() {
          if (aborted) return;
          aborted = true;
          for (const listener of [...listeners]) listener();
          listeners.clear();
        },
      };
    }

    function abortSnapshot() {
      snapshotController?.abort?.();
      snapshotController = null;
    }

    function post(message) {
      if (state.disposed) return false;
      if (!activePort || typeof activePort.postMessage !== 'function') {
        state.portConnected = false;
        finishTask('无法连接同步服务');
        return false;
      }
      try {
        activePort.postMessage(message);
        return true;
      } catch {
        state.portConnected = false;
        finishTask('无法连接同步服务');
        return false;
      }
    }

    function renderSelection() {
      for (const platformId of PLATFORM_IDS) rowMap.get(platformId).checkbox.checked = state.selected.includes(platformId);
    }

    function updateRowPresentation(row) {
      row.row.dataset.status = row.statusKey;
      row.status.dataset.status = row.statusKey;
      row.login.hidden = row.statusKey !== 'auth-required';
      row.retry.hidden = state.busy || !row.canRetry;
      row.retry.disabled = state.busy || !row.canRetry;
    }

    function setLocked(locked) {
      start.disabled = locked || !state.selected.length;
      for (const row of rowMap.values()) {
        row.checkbox.disabled = locked;
        updateRowPresentation(row);
      }
    }

    function setAlert(message) {
      alert.textContent = message || '';
    }

    function invalidateAuth() {
      state.authRequestId = null;
      state.authPlatforms = [];
      state.authCompleted.clear();
    }

    function clearDraft(row) {
      row.draft.hidden = true;
      row.draft.href = '';
    }

    function setStatus(platformId, status, message) {
      const row = rowMap.get(platformId);
      if (!row) return;
      row.statusKey = status;
      row.canRetry = status === 'failed' || status === 'auth-required';
      if (status !== 'success') clearDraft(row);
      if (status === 'unknown') {
        row.status.textContent = '请检查平台草稿箱';
        row.statusKey = 'unknown';
        row.canRetry = false;
        updateRowPresentation(row);
        return;
      }
      const progress = message?.progress || message;
      const completed = Number(progress?.completed);
      const total = Number(progress?.total);
      row.status.textContent = STATUS_LABELS[status] || '请检查平台草稿箱';
      if (status === 'uploading-images' && Number.isFinite(completed) && Number.isFinite(total)) {
        row.status.textContent = `${STATUS_LABELS[status]} ${completed}/${total}`;
      }
      if (status === 'success') {
        const draftUrl = sanitizeDraftUrl(platformId, message?.draftUrl);
        if (!draftUrl) {
          clearDraft(row);
          row.status.textContent = '请检查平台草稿箱';
          row.statusKey = 'unknown';
          row.canRetry = false;
          updateRowPresentation(row);
          return;
        }
        row.draft.href = draftUrl;
        row.draft.hidden = false;
      }
      if (status === 'failed') {
        const errorMessage = typeof message?.error === 'string' ? message.error : message?.error?.message;
        if (errorMessage) row.status.textContent = errorMessage;
      }
      updateRowPresentation(row);
    }

    function setAuthStatus(platformId, authenticated) {
      const row = rowMap.get(platformId);
      if (!row) return;
      row.statusKey = authenticated ? 'authenticated' : 'auth-required';
      row.canRetry = !authenticated;
      row.status.textContent = authenticated ? '已登录' : STATUS_LABELS['auth-required'];
      if (!authenticated) clearDraft(row);
      updateRowPresentation(row);
    }

    function finishTask(message = '', { clearTask = true, clearRetry = false } = {}) {
      abortSnapshot();
      state.busy = false;
      if (clearTask) {
        state.taskId = null;
        state.operationId = null;
      }
      if (clearRetry) state.retryTaskId = null;
      setLocked(false);
      if (message) setAlert(message);
    }

    function sendCheckAuth(platformIds = state.selected.slice()) {
      if (state.disposed || state.busy || state.authRequestId) return false;
      for (const platformId of PLATFORM_IDS) {
        setStatus(platformId, platformIds.includes(platformId) ? 'checking-auth' : 'unselected');
      }
      if (!platformIds.length) {
        invalidateAuth();
        setAlert('至少选择一个平台');
        return false;
      }
      const requestId = authIdFactory();
      state.authRequestId = requestId;
      state.authPlatforms = platformIds.slice();
      state.authCompleted.clear();
      setAlert('');
      if (!post({ type: 'CHECK_AUTH', requestId, platformIds: platformIds.slice() })) invalidateAuth();
      return true;
    }

    async function startBatch() {
      await ready;
      if (state.disposed) return;
      if (state.busy) return;
      if (!state.selected.length) {
        setAlert('至少选择一个平台');
        return;
      }
      abortSnapshot();
      invalidateAuth();
      const generation = state.generation + 1;
      const taskId = idFactory();
      const operationId = operationIdFactory();
      state.generation = generation;
      state.taskId = taskId;
      state.operationId = operationId;
      state.retryTaskId = null;
      state.draftUrls.clear();
      state.busy = true;
      snapshotController = createSnapshotController();
      state.authCompleted.clear();
      for (const platformId of PLATFORM_IDS) {
        const row = rowMap.get(platformId);
        clearDraft(row);
        state.draftUrls.delete(platformId);
        setStatus(platformId, state.selected.includes(platformId) ? 'checking-auth' : 'unselected');
      }
      for (const platformId of state.selected) setStatus(platformId, 'checking-auth');
      setLocked(true);
      setAlert('正在读取文章');
      try {
        const article = await snapshotRequest({ target: doc, signal: snapshotController.signal });
        if (!state.busy || state.taskId !== taskId || state.generation !== generation) return;
        post({ type: 'START_BATCH', taskId, operationId, platformIds: state.selected.slice(), article });
      } catch (error) {
        if (state.taskId !== taskId || state.generation !== generation) return;
        if (state.disposed) return;
        finishTask(error?.message || '文章快照生成失败');
      }
    }

    async function openPanel() {
      if (state.disposed) return false;
      if (!state.portConnected) {
        let connected = false;
        try {
          connected = await reconnectPort?.();
        } catch {
          connected = false;
        }
        if (!connected || state.disposed || !state.portConnected) return false;
      }
      panel.hidden = false;
      backdrop.hidden = false;
      state.panelOpen = true;
      currentAnchor.setAttribute('aria-expanded', 'true');
      close.focus();
      ready.then(() => {
        if (state.disposed || !state.portConnected || !state.panelOpen || state.busy) return;
        sendCheckAuth();
      });
      return true;
    }

    function closePanel() {
      state.panelOpen = false;
      backdrop.hidden = true;
      panel.hidden = true;
      currentAnchor.setAttribute('aria-expanded', 'false');
      currentAnchor.focus();
    }

    function focusableControls() {
      return [
        close,
        ...PLATFORM_IDS.flatMap((platformId) => {
          const row = rowMap.get(platformId);
          return [row.checkbox, row.login, row.retry, row.draft];
        }),
        start,
      ].filter((control) => control && !control.hidden && !control.disabled);
    }

    function onPanelKeydown(event) {
      if (event.key !== 'Tab') return;
      const controls = focusableControls();
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      const current = shadow.activeElement || doc.activeElement;
      const index = controls.indexOf(current);
      const next = index < 0
        ? (event.shiftKey ? last : first)
        : controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length];
      event.preventDefault?.();
      next.focus();
    }

    function onMessage(message) {
      if (state.disposed) return;
      if (message?.type === 'IMAGE_REQUIRED') {
        imageResponder.handleMessage(message);
        return;
      }
      if (message?.type === 'AUTH_RESULT') {
        if (state.busy || !state.authRequestId || message.requestId !== state.authRequestId) return;
        const results = Array.isArray(message.results)
          ? message.results
          : (message.platforms && typeof message.platforms === 'object'
            ? PLATFORM_IDS.map((platformId) => ({ platformId, ...message.platforms[platformId] }))
            : (message.platformId ? [message] : []));
        for (const result of results) {
          if (!state.authPlatforms.includes(result.platformId) || !state.selected.includes(result.platformId)
            || state.authCompleted.has(result.platformId)) continue;
          if (result.error) {
            setStatus(result.platformId, 'failed', { error: result.error });
          } else {
            const authenticated = result.authenticated ?? result.loggedIn ?? result.ok;
            setAuthStatus(result.platformId, Boolean(authenticated));
          }
          state.authCompleted.add(result.platformId);
        }
        if (state.authPlatforms.every((platformId) => state.authCompleted.has(platformId))) invalidateAuth();
        return;
      }
      if (message?.type === 'PLATFORM_STATE') {
        if (!state.taskId || !state.operationId || message.taskId !== state.taskId
          || message.operationId !== state.operationId || !state.selected.includes(message.platformId)) return;
        const status = message.status || message.state || 'unknown';
        setStatus(message.platformId, status, message);
        const draftUrl = sanitizeDraftUrl(message.platformId, message.draftUrl);
        if (status === 'success' && draftUrl) state.draftUrls.set(message.platformId, draftUrl);
        else if (status !== 'success' || !draftUrl) state.draftUrls.delete(message.platformId);
        return;
      }
      if (message?.type === 'BATCH_COMPLETE') {
        if (!state.taskId || !state.operationId || message.taskId !== state.taskId || message.operationId !== state.operationId) return;
        state.retryTaskId = state.taskId;
        finishTask();
        return;
      }
      if (message?.type === 'FATAL_ERROR') {
        if (state.busy && (message.taskId !== state.taskId || message.operationId !== state.operationId)) return;
        if (!state.busy && state.authRequestId) {
          if (message.requestId !== state.authRequestId) return;
          invalidateAuth();
        } else if (!state.busy) {
          return;
        }
        finishTask(typeof message.message === 'string' ? message.message : '同步失败');
      }
    }

    function settleHandshake(success) {
      const pending = handshake;
      if (!pending) return false;
      handshake = null;
      if (pending.timer) clearTimeout(pending.timer);
      const connected = Boolean(success && !state.disposed && activePort === pending.port);
      state.portConnected = connected;
      pending.resolve(connected);
      return connected;
    }

    function detachPort(connection = activePort) {
      if (!connection) return;
      if (connection === activePort) {
        activePortMessageListener && connection.onMessage?.removeListener?.(activePortMessageListener);
        activePortDisconnectListener && connection.onDisconnect?.removeListener?.(activePortDisconnectListener);
        activePort = null;
        activePortMessageListener = null;
        activePortDisconnectListener = null;
        imageResponder.setPort(null);
      }
    }

    function retirePort(connection = activePort) {
      if (!connection) return;
      detachPort(connection);
      try {
        connection.disconnect?.();
      } catch {
        // A failed handshake port is already unusable.
      }
    }

    function onPortMessage(connection, message) {
      if (state.disposed || activePort !== connection) return;
      if (message?.type === 'PONG') {
        if (handshake?.port === connection && handshake.requestId === message.requestId) settleHandshake(true);
        return;
      }
      onMessage(message);
    }

    function onPortDisconnect(connection) {
      if (state.disposed || activePort !== connection) return;
      state.portConnected = false;
      detachPort(connection);
      if (handshake?.port === connection) settleHandshake(false);
      invalidateAuth();
      finishTask('无法连接同步服务', { clearRetry: true });
    }

    function setPort(nextPort, { ready: isReady = true } = {}) {
      if (state.disposed) return Promise.resolve(false);
      if (!nextPort || typeof nextPort.postMessage !== 'function') {
        state.portConnected = false;
        return Promise.resolve(false);
      }
      if (activePort === nextPort) {
        if (isReady && !handshake) {
          state.portConnected = true;
          return Promise.resolve(true);
        }
        if (handshake) return handshake.promise;
      }
      if (handshake) settleHandshake(false);
      if (activePort) retirePort();
      activePort = nextPort;
      imageResponder.setPort(nextPort);
      const connection = nextPort;
      activePortMessageListener = (message) => onPortMessage(connection, message);
      activePortDisconnectListener = () => onPortDisconnect(connection);
      connection.onMessage?.addListener?.(activePortMessageListener);
      connection.onDisconnect?.addListener?.(activePortDisconnectListener);
      state.portConnected = Boolean(isReady);
      if (isReady) return Promise.resolve(true);

      let requestId;
      try {
        requestId = idFactory();
      } catch {
        retirePort(connection);
        state.portConnected = false;
        return Promise.resolve(false);
      }
      let resolveHandshake;
      const promise = new Promise((resolve) => { resolveHandshake = resolve; });
      handshake = { port: connection, requestId, resolve: resolveHandshake, timer: null, promise };
      const pending = handshake;
      try {
        connection.postMessage({ type: 'PING', requestId });
      } catch {
        if (handshake === pending) {
          retirePort(connection);
          settleHandshake(false);
        }
        return promise;
      }
      if (handshake === pending) {
        pending.timer = setTimeout(() => {
          if (handshake !== pending) return;
          retirePort(connection);
          settleHandshake(false);
        }, 400);
      }
      return promise;
    }

    const onOpenRequest = async (event) => {
      const requestId = event?.detail?.requestId;
      if (typeof requestId !== 'string' || !requestId.trim()) return;
      const opened = await openPanel();
      if (!opened || state.disposed || !state.portConnected) return;
      try {
        doc.dispatchEvent(new CustomEventCtor(PAGE_EVENTS.opened, { detail: { requestId } }));
      } catch {
        // Page acknowledgements are best-effort; the panel remains usable.
      }
    };
    setPort(port);
    listen(doc, PAGE_EVENTS.open, onOpenRequest);
    listen(close, 'click', closePanel);
    listen(backdrop, 'click', (event) => {
      if (event.target === backdrop) closePanel();
    });
    const onDocumentKeydown = (event) => {
      if (event.key === 'Escape' && !backdrop.hidden) closePanel();
    };
    listen(doc, 'keydown', onDocumentKeydown);
    listen(panel, 'keydown', onPanelKeydown);
    listen(start, 'click', startBatch);
    renderSelection();
    const restoreRevision = state.selectionRevision;
    const ready = restoreSelection(storage).then((persisted) => {
      if (state.selectionRevision !== restoreRevision) return;
      state.selected = normalizeSelection(persisted);
      renderSelection();
      setLocked(state.busy);
    }).catch(() => {
      if (state.selectionRevision !== restoreRevision) return;
      state.selected = PLATFORM_IDS.slice();
      renderSelection();
      setLocked(state.busy);
    });

    let disposed = false;
    function dispose() {
      if (disposed) return;
      disposed = true;
      state.disposed = true;
      state.panelOpen = false;
      currentAnchor.setAttribute?.('aria-expanded', 'false');
      backdrop.hidden = true;
      panel.hidden = true;
      abortSnapshot();
      invalidateAuth();
      state.busy = false;
      state.taskId = null;
      state.operationId = null;
      setAlert('');
      for (const remove of listenerDisposers.splice(0)) remove();
      const portToDisconnect = activePort;
      if (handshake) settleHandshake(false);
      retirePort(portToDisconnect);
      if (host.parentNode) host.parentNode.removeChild(host);
    }

    return {
      host,
      shadow,
      state,
      get anchor() { return currentAnchor; },
      setAnchor,
      panel,
      backdrop,
      header,
      title,
      subtitle,
      footer,
      footerNote,
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
      setPort,
      dispose,
    };
  }

  function connectPort() {
    try {
      return root.chrome?.runtime?.connect?.({ name: PORT_NAME }) || null;
    } catch {
      return null;
    }
  }

  function boot(options = {}) {
    const doc = options.document || root.document;
    if (!doc) return null;
    const hasPortOption = Object.hasOwn(options, 'port');
    let port = hasPortOption ? options.port : null;
    let portResolved = hasPortOption;
    let ui = null;
    let observer = null;
    let disconnected = false;
    let reconnectPromise = null;
    const connectPortFactory = typeof options.connectPort === 'function' ? options.connectPort : connectPort;

    function reconnect() {
      if (disconnected || !ui || ui.state.disposed) return Promise.resolve(false);
      if (ui.state.portConnected) return Promise.resolve(true);
      if (reconnectPromise) return reconnectPromise;
      reconnectPromise = Promise.resolve()
        .then(() => {
          if (disconnected || !ui || ui.state.disposed) return null;
          return connectPortFactory();
        })
        .then((nextPort) => {
          if (disconnected || ui.state.disposed || !nextPort) return false;
          return ui.setPort?.(nextPort, { ready: false }) || false;
        })
        .catch(() => false)
        .finally(() => { reconnectPromise = null; });
      return reconnectPromise;
    }

    function syncMount() {
      if (disconnected) return;
      const anchor = doc.querySelector?.('[data-opengzh-distribution-button]');
      if (!anchor) {
        if (ui) ui.host.hidden = true;
        return;
      }
      if (!ui) {
        if (!portResolved) {
          try {
            port = connectPortFactory();
          } catch {
            port = null;
          }
          portResolved = true;
        }
        ui = createUi({ document: doc, anchor, port, reconnectPort: reconnect, CustomEventCtor: options.CustomEventCtor });
      } else {
        ui.setAnchor?.(anchor);
        mountHostAfterAnchor(ui.host, anchor);
      }
      if (ui) ui.host.hidden = false;
    }

    syncMount();
    const MutationObserverCtor = options.MutationObserverCtor || root.MutationObserver;
    if (typeof MutationObserverCtor === 'function') {
      observer = new MutationObserverCtor(syncMount);
      observer.observe(doc.body || doc, { childList: true, subtree: true });
    }

    return {
      get ui() { return ui; },
      get observer() { return observer; },
      disconnect() {
        if (disconnected) return;
        disconnected = true;
        observer?.disconnect?.();
        ui?.dispose?.();
      },
    };
  }

  if (typeof document === 'undefined') {
    root.__OPENGZH_CONTENT_TEST__ = {
      PLATFORM_IDS,
      PLATFORMS,
      PAGE_EVENTS,
      PORT_NAME,
      STORAGE_KEY,
      normalizeSelection,
      sanitizeDraftUrl,
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
