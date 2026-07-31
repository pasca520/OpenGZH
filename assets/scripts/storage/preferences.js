/**
 * User preference persistence.
 * Keeps legacy keys for backward compatibility.
 * @module preferences
 */

const KEY_STYLE = 'currentStyle';
const KEY_CONTENT = 'markdownInput';
const KEY_DOCUMENTS = 'documents';
const KEY_ACTIVE_DOCUMENT_ID = 'activeDocumentId';
const KEY_CODE_BLOCK_SETTINGS = 'codeBlockSettings';
const KEY_TOC_VISIBLE = 'tocVisible';
const KEY_DISPLAY_SETTINGS = 'displaySettings';
const KEY_APP_VERSION = 'appVersion';

const APP_VERSION = 1;

const DEFAULT_CODE_BLOCK_SETTINGS = {
  showLanguageLabel: true,
  showCopyButton: true,
  showMacDecorations: true
};

const FONT_SCALE_VALUES = [0.75, 0.85, 1, 1.15, 1.3, 1.5];
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

let saveTimer = null;

function parseJSON(value, fallback) {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

function normalizeDocument(doc, index = 0) {
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
    dirty: Boolean(doc.dirty)
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

function clampNumber(value, min, max, fallback, precision = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const clamped = Math.min(max, Math.max(min, number));
  if (precision <= 0) return Math.round(clamped);
  return Number(clamped.toFixed(precision));
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

export function loadPreferences() {
  const storedVersion = parseInt(localStorage.getItem(KEY_APP_VERSION), 10) || 0;
  const needsMigration = storedVersion < APP_VERSION;

  try {
    const prefs = {
      currentStyle: localStorage.getItem(KEY_STYLE) || 'wechat-default',
      content: needsMigration ? null : localStorage.getItem(KEY_CONTENT),
      documents: needsMigration ? [] : normalizeDocuments(parseJSON(localStorage.getItem(KEY_DOCUMENTS), [])),
      activeDocumentId: needsMigration ? null : localStorage.getItem(KEY_ACTIVE_DOCUMENT_ID),
      codeBlockSettings: normalizeCodeBlockSettings(parseJSON(localStorage.getItem(KEY_CODE_BLOCK_SETTINGS), null)),
      tocVisible: localStorage.getItem(KEY_TOC_VISIBLE) === 'true',
      displaySettings: normalizeDisplaySettings(parseJSON(localStorage.getItem(KEY_DISPLAY_SETTINGS), null))
    };
    if (needsMigration) {
      localStorage.setItem(KEY_APP_VERSION, String(APP_VERSION));
    }
    return prefs;
  } catch (_error) {
    return {
      currentStyle: 'wechat-default',
      content: null,
      documents: [],
      activeDocumentId: null,
      codeBlockSettings: { ...DEFAULT_CODE_BLOCK_SETTINGS },
      tocVisible: false,
      displaySettings: { ...DEFAULT_DISPLAY_SETTINGS }
    };
  }
}

export function savePreferences(currentStyle, content, documents = null, activeDocumentId = null, codeBlockSettings = null, tocVisible = false, displaySettings = null) {
  try {
    localStorage.setItem(KEY_APP_VERSION, String(APP_VERSION));
    localStorage.setItem(KEY_STYLE, currentStyle);
    localStorage.setItem(KEY_CONTENT, content);
    localStorage.setItem(KEY_TOC_VISIBLE, tocVisible ? 'true' : 'false');

    if (Array.isArray(documents)) {
      localStorage.setItem(KEY_DOCUMENTS, JSON.stringify(documents));
    }

    if (activeDocumentId) {
      localStorage.setItem(KEY_ACTIVE_DOCUMENT_ID, activeDocumentId);
    } else {
      localStorage.removeItem(KEY_ACTIVE_DOCUMENT_ID);
    }

    if (codeBlockSettings) {
      localStorage.setItem(KEY_CODE_BLOCK_SETTINGS, JSON.stringify(normalizeCodeBlockSettings(codeBlockSettings)));
    }

    if (displaySettings) {
      localStorage.setItem(KEY_DISPLAY_SETTINGS, JSON.stringify(normalizeDisplaySettings(displaySettings)));
    }

    return true;
  } catch (_error) {
    console.error('保存偏好失败');
    return false;
  }
}

export function debounceSaveContent(payload, delay = 1000, callbacks = {}) {
  if (saveTimer) clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    const {
      currentStyle = 'wechat-default',
      content = '',
      documents = null,
      activeDocumentId = null,
      codeBlockSettings = null,
      tocVisible = false,
      displaySettings = null
    } = payload || {};

    const success = savePreferences(currentStyle, content, documents, activeDocumentId, codeBlockSettings, tocVisible, displaySettings);

    if (success) {
      callbacks.onSuccess?.(payload);
    } else {
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
