/**
 * User preference persistence (IndexedDB-backed).
 *
 * 文档与偏好自 ISSUE-002 起迁移至 IndexedDB（document-store）：
 * - 单文档粒度 put，不再全量 JSON.stringify；
 * - meta（activeDocumentId / currentStyle 等）单独一条记录；
 * - 首次启动时从旧 localStorage 键一次性导入，成功后保留原键作只读备份。
 *
 * 兼容说明：loadPreferences 现在返回 Promise；savePreferences 变为 async。
 * 旧 localStorage 键名与数据结构不变，仅作为迁移源与崩溃恢复兜底。
 * @module preferences
 */

import { normalizeXhsSettings } from '../xhs/constants.js';
import { normalizeStyleOverride } from '../core/style-override.js';
import { clampNumber } from '../core/format-utils.js';
import { DocumentStore, migrateFromLocalStorage } from './document-store.js';

const KEY_STYLE = 'currentStyle';
const KEY_CONTENT = 'markdownInput';
const KEY_DOCUMENTS = 'documents';
const KEY_ACTIVE_DOCUMENT_ID = 'activeDocumentId';
const KEY_CODE_BLOCK_SETTINGS = 'codeBlockSettings';
const KEY_TOC_VISIBLE = 'tocVisible';
const KEY_DISPLAY_SETTINGS = 'displaySettings';

const DEFAULT_CODE_BLOCK_SETTINGS = {
  showLanguageLabel: true,
  showCopyButton: true,
  showMacDecorations: true
};

// 字号档位倍数：以 14px 为 1.0x（推荐），其余档位按 14px 折算
// 与 main.js 的 fontScaleOptions 保持一致
const FONT_SCALE_VALUES = [12, 13, 14, 15, 16, 17, 18].map((px) => px / 14);
const FONT_FAMILY_VALUES = ['theme', 'sans', 'serif', 'mono'];
const IMAGE_STYLE_MODES = ['theme', 'custom'];
const IMAGE_RADIUS_MODES = ['px', 'circle'];
const IMAGE_EFFECT_VALUES = ['theme', 'clean', 'soft-shadow', 'paper', 'polaroid', 'rounded', 'circle', 'bordered', 'bleed', 'mono'];
const END_STYLE_VALUES = ['theme', 'classic', 'aurora', 'pulse', 'scan', 'orbit', 'neon', 'pixel', 'breathe', 'equalizer', 'datastream', 'particle', 'holo'];

const LEGACY_IMAGE_SPACING_MAP = {
  compact: { top: 12, bottom: 16 },
  normal: { top: 24, bottom: 32 },
  relaxed: { top: 36, bottom: 44 },
  loose: { top: 48, bottom: 56 }
};

const LEGACY_IMAGE_RADIUS_MAP = {
  none: 0,
  small: 4,
  medium: 8,
  large: 16
};

const LEGACY_IMAGE_SHADOW_MAP = {
  none: { x: 0, y: 0, blur: 0, spread: 0, opacity: 0 },
  soft: { x: 0, y: 2, blur: 8, spread: 0, opacity: 0.08 },
  medium: { x: 0, y: 6, blur: 16, spread: 0, opacity: 0.12 },
  strong: { x: 0, y: 12, blur: 28, spread: 0, opacity: 0.18 }
};

const DEFAULT_DISPLAY_SETTINGS = {
  fontScale: 1,
  fontFamily: 'theme',
  imageStyleMode: 'theme',
  imageEffect: 'theme',
  endStyle: 'theme',
  imageMarginTop: 24,
  imageMarginBottom: 32,
  imageRadius: 8,
  imageRadiusMode: 'px',
  imageShadowX: 0,
  imageShadowY: 12,
  imageShadowBlur: 28,
  imageShadowSpread: 0,
  imageShadowColor: '#000000',
  imageShadowOpacity: 0.18
};

/** @type {DocumentStore|null} 共享的文档存储实例 */
let documentStore = null;
let saveTimer = null;
/** 上次已落盘文档快照（id → updatedAt+content 摘要），用于脏检查只 put 有变化的文档 */
const lastSavedSnapshots = new Map();

function parseJSON(value, fallback) {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

export function normalizeDocument(doc, index = 0) {
  if (!doc || typeof doc !== 'object') return null;
  if (typeof doc.id !== 'string' || typeof doc.content !== 'string') return null;

  const createdAt = typeof doc.createdAt === 'number' ? doc.createdAt : Date.now();
  const updatedAt = typeof doc.updatedAt === 'number' ? doc.updatedAt : createdAt;

  return {
    id: doc.id,
    title: typeof doc.title === 'string' ? doc.title : '',
    manualTitle: typeof doc.manualTitle === 'string' ? doc.manualTitle : '',
    content: doc.content,
    createdAt,
    updatedAt,
    sortOrder: typeof doc.sortOrder === 'number' ? doc.sortOrder : index,
    dirty: Boolean(doc.dirty),
    xhs: normalizeXhsSettings(doc.xhs),
    styleOverride: normalizeStyleOverride(doc.styleOverride)
  };
}

function normalizeDocuments(documents) {
  if (!Array.isArray(documents)) return [];
  return documents.map((doc, index) => normalizeDocument(doc, index)).filter(Boolean);
}

function normalizeCodeBlockSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return { ...DEFAULT_CODE_BLOCK_SETTINGS };
  }

  return {
    showLanguageLabel: settings.showLanguageLabel !== false,
    showCopyButton: settings.showCopyButton !== false,
    showMacDecorations: settings.showMacDecorations !== false
  };
}

function normalizeHexColor(value, fallback = DEFAULT_DISPLAY_SETTINGS.imageShadowColor) {
  const normalized = String(value || '').trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized : fallback;
}

function normalizeDisplaySettings(settings) {
  if (!settings || typeof settings !== 'object') {
    return { ...DEFAULT_DISPLAY_SETTINGS };
  }

  const fontScale = Number(settings.fontScale);
  const validScale = FONT_SCALE_VALUES.includes(fontScale) ? fontScale : DEFAULT_DISPLAY_SETTINGS.fontScale;
  const fontFamily = FONT_FAMILY_VALUES.includes(settings.fontFamily)
    ? settings.fontFamily
    : DEFAULT_DISPLAY_SETTINGS.fontFamily;
  const hasLegacyImageSettings = ['imageSpacing', 'imageRadius', 'imageShadow'].some((key) => Object.prototype.hasOwnProperty.call(settings, key));
  const imageEffect = IMAGE_EFFECT_VALUES.includes(settings.imageEffect)
    ? settings.imageEffect
    : DEFAULT_DISPLAY_SETTINGS.imageEffect;
  const imageStyleMode = IMAGE_STYLE_MODES.includes(settings.imageStyleMode)
    ? settings.imageStyleMode
    : (hasLegacyImageSettings || imageEffect !== 'theme' ? 'custom' : DEFAULT_DISPLAY_SETTINGS.imageStyleMode);
  const endStyle = END_STYLE_VALUES.includes(settings.endStyle)
    ? settings.endStyle
    : DEFAULT_DISPLAY_SETTINGS.endStyle;
  const legacySpacing = LEGACY_IMAGE_SPACING_MAP[settings.imageSpacing] || LEGACY_IMAGE_SPACING_MAP.normal;
  const legacyShadow = LEGACY_IMAGE_SHADOW_MAP[settings.imageShadow] || LEGACY_IMAGE_SHADOW_MAP.none;
  const imageRadiusMode = IMAGE_RADIUS_MODES.includes(settings.imageRadiusMode)
    ? settings.imageRadiusMode
    : DEFAULT_DISPLAY_SETTINGS.imageRadiusMode;

  return {
    fontScale: validScale,
    fontFamily,
    imageStyleMode,
    imageEffect,
    endStyle,
    imageMarginTop: clampNumber(
      settings.imageMarginTop,
      0,
      200,
      legacySpacing.top
    ),
    imageMarginBottom: clampNumber(
      settings.imageMarginBottom,
      0,
      200,
      legacySpacing.bottom
    ),
    imageRadius: clampNumber(
      settings.imageRadius,
      0,
      360,
      LEGACY_IMAGE_RADIUS_MAP[settings.imageRadius] ?? DEFAULT_DISPLAY_SETTINGS.imageRadius
    ),
    imageRadiusMode,
    imageShadowX: clampNumber(settings.imageShadowX, -80, 80, legacyShadow.x),
    imageShadowY: clampNumber(settings.imageShadowY, -80, 80, legacyShadow.y),
    imageShadowBlur: clampNumber(settings.imageShadowBlur, 0, 120, legacyShadow.blur),
    imageShadowSpread: clampNumber(settings.imageShadowSpread, -40, 80, legacyShadow.spread),
    imageShadowColor: normalizeHexColor(settings.imageShadowColor),
    imageShadowOpacity: clampNumber(settings.imageShadowOpacity, 0, 1, legacyShadow.opacity, 2)
  };
}

/**
 * 获取共享的 DocumentStore 实例（懒初始化）。
 * @param {Object} [options] 注入选项（测试用）
 * @returns {DocumentStore}
 */
export function getDocumentStore(options = {}) {
  if (!documentStore || options.indexedDB) {
    documentStore = new DocumentStore(options);
  }
  return documentStore;
}

/** 测试钩子：重置模块级单例状态 */
export function _resetPreferencesState() {
  documentStore = null;
  saveTimer = null;
  lastSavedSnapshots.clear();
}

/**
 * 初始化存储并加载偏好设置。
 *
 * 流程：init IndexedDB → （IndexedDB 为空且 localStorage 有旧数据时）迁移导入 → 读出全部文档与 meta。
 * 迁移失败或 IndexedDB 不可用时回退读 localStorage（不丢弃用户数据）。
 *
 * @param {Object} [options] 测试注入：indexedDB 工厂 / storage 实现
 * @returns {Promise<Object>} 与旧同步版 loadPreferences 相同结构的偏好对象
 */
export async function initPreferences(options = {}) {
  const storage = options.storage
    || (typeof localStorage !== 'undefined' ? localStorage : null);

  const emptyPrefs = {
    currentStyle: 'wechat-default',
    content: null,
    documents: [],
    activeDocumentId: null,
    codeBlockSettings: { ...DEFAULT_CODE_BLOCK_SETTINGS },
    tocVisible: false,
    displaySettings: { ...DEFAULT_DISPLAY_SETTINGS }
  };

  try {
    getDocumentStore(options);
    await migrateFromLocalStorage(documentStore, storage, { normalizeDocument });
  } catch (_error) {
    // IndexedDB 不可用/打开失败：整体回退到 localStorage 只读模式
    documentStore = null;
  }

  let meta = null;
  let documents = [];
  try {
    if (documentStore) {
      [meta, documents] = await Promise.all([
        documentStore.getMeta(),
        documentStore.getAllDocuments()
      ]);
    }
  } catch (_error) {
    meta = null;
    documents = [];
  }

  // IndexedDB 读不到任何文档时回退 localStorage（迁移失败兜底）
  if ((!documents || documents.length === 0) && storage) {
    try {
      const fallbackDocs = parseJSON(storage.getItem(KEY_DOCUMENTS), []);
      if (Array.isArray(fallbackDocs) && fallbackDocs.length > 0) {
        documents = fallbackDocs;
      }
    } catch (_error) {
      // ignore
    }
  }

  documents = normalizeDocuments(documents);

  // 初始化已落盘快照：保存时靠它做脏检查与删除检测
  documents.forEach((doc, index) => {
    lastSavedSnapshots.set(doc.id, snapshotOf(doc));
    doc.sortOrder = typeof doc.sortOrder === 'number' ? doc.sortOrder : index;
  });

  return {
    currentStyle: (meta && meta.currentStyle)
      || (storage ? storage.getItem(KEY_STYLE) || 'wechat-default' : 'wechat-default'),
    content: (meta && typeof meta.content === 'string' ? meta.content : null)
      ?? (storage ? storage.getItem(KEY_CONTENT) : null),
    documents,
    activeDocumentId: (meta && meta.activeDocumentId) || (storage ? storage.getItem(KEY_ACTIVE_DOCUMENT_ID) : null),
    codeBlockSettings: normalizeCodeBlockSettings(
      (meta && meta.codeBlockSettings)
      || parseJSON(storage ? storage.getItem(KEY_CODE_BLOCK_SETTINGS) : null, null)
    ),
    tocVisible: (meta && typeof meta.tocVisible === 'boolean')
      ? meta.tocVisible
      : Boolean(storage && storage.getItem(KEY_TOC_VISIBLE) === 'true'),
    displaySettings: normalizeDisplaySettings(
      (meta && meta.displaySettings)
      || parseJSON(storage ? storage.getItem(KEY_DISPLAY_SETTINGS) : null, null)
    )
  };
}

/**
 * 向后兼容入口：等价于 initPreferences()。返回 Promise。
 * @returns {Promise<Object>}
 */
export function loadPreferences(options = {}) {
  return initPreferences(options);
}

function snapshotOf(doc) {
  return `${doc.updatedAt}:${doc.content.length}:${doc.manualTitle}:${doc.sortOrder}:${doc.title}`;
}

/**
 * 异步保存偏好：单文档粒度写入 IndexedDB（仅 put 有变化的文档），meta 单独保存。
 *
 * @returns {Promise<boolean>} 是否成功
 */
export async function savePreferences(currentStyle, content, documents = null, activeDocumentId = null, codeBlockSettings = null, tocVisible = false, displaySettings = null) {
  try {
    const store = getDocumentStore();
    await store.init();

    const normalizedDocs = normalizeDocuments(documents);

    for (const doc of normalizedDocs) {
      const snapshot = snapshotOf(doc);
      if (lastSavedSnapshots.has(doc.id) && lastSavedSnapshots.get(doc.id) === snapshot) {
        continue; // 无变化跳过
      }
      await store.putDocument(doc);
      lastSavedSnapshots.set(doc.id, snapshot);
    }

    // 删除 IndexedDB 中已不在内存列表里的文档
    const liveIds = new Set(normalizedDocs.map((doc) => doc.id));
    const storedIds = (await store.getAllDocuments()).map((doc) => doc.id);
    for (const id of storedIds) {
      if (!liveIds.has(id)) {
        await store.deleteDocument(id);
        lastSavedSnapshots.delete(id);
      }
    }

    await store.putMeta({
      currentStyle,
      content,
      activeDocumentId: activeDocumentId || null,
      codeBlockSettings: codeBlockSettings ? normalizeCodeBlockSettings(codeBlockSettings) : null,
      tocVisible: Boolean(tocVisible),
      displaySettings: displaySettings ? normalizeDisplaySettings(displaySettings) : null
    });

    return true;
  } catch (_error) {
    console.error('保存偏好失败');
    return false;
  }
}

export function debounceSaveContent(payload, delay = 1000, callbacks = {}) {
  if (saveTimer) clearTimeout(saveTimer);

  saveTimer = setTimeout(async () => {
    saveTimer = null;
    const {
      currentStyle = 'wechat-default',
      content = '',
      documents = null,
      activeDocumentId = null,
      codeBlockSettings = null,
      tocVisible = false,
      displaySettings = null
    } = payload || {};

    try {
      const success = await savePreferences(currentStyle, content, documents, activeDocumentId, codeBlockSettings, tocVisible, displaySettings);
      if (success) {
        callbacks.onSuccess?.(payload);
      } else {
        callbacks.onError?.(payload);
      }
    } catch (_error) {
      callbacks.onError?.(payload);
    }
  }, delay);
}

export function getDefaultCodeBlockSettings() {
  return { ...DEFAULT_CODE_BLOCK_SETTINGS };
}

export function getDefaultDisplaySettings() {
  return { ...DEFAULT_DISPLAY_SETTINGS };
}
