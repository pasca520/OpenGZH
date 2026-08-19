/**
 * Xiaohongshu image mode constants, defaults and normalization.
 * Single source of truth for all feature toggles, canvas sizes,
 * density presets and allowed enums. No DOM access here.
 * @module xhs/constants
 */

/** Master feature switch; keep false until browser acceptance passes. */
export const XHS_FEATURE_ENABLED = true;

/** Logical preview size of a single card (3:4). */
export const XHS_LOGICAL_WIDTH = 540;
export const XHS_LOGICAL_HEIGHT = 720;

/** Export scale factor: 540×720 logical → 1080×1440 PNG. */
export const XHS_EXPORT_SCALE = 2;

/** Product warning threshold; NOT an official upload limit. */
export const XHS_UPLOAD_WARNING_LIMIT = 18;

/** Editorial threshold for suggesting a multi-post series; never blocks export. */
export const XHS_SERIES_SUGGESTION_LIMIT = 12;

/** Markdown comment used as a manual page break. */
export const XHS_PAGE_MARKER = '<!-- xhs-page -->';

/** @type {XhsThemeId[]} */
export const XHS_THEME_IDS = ['minimal-white', 'editorial-magazine', 'warm-paper', 'dark-tech', 'bright-knowledge'];

/** @type {XhsDensity[]} */
export const XHS_DENSITIES = ['relaxed', 'standard', 'compact'];

/** Density presets in logical px. */
export const XHS_DENSITY_PRESETS = {
  relaxed: { bodySize: 22, lineHeight: 1.65, blockGap: 18 },
  standard: { bodySize: 20, lineHeight: 1.55, blockGap: 14 },
  compact: { bodySize: 18, lineHeight: 1.48, blockGap: 10 }
};

const clamp = (value, min, max, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

/** @returns {XhsDocumentSettings} */
export function createDefaultXhsSettings() {
  return {
    schemaVersion: 1,
    themeId: 'minimal-white',
    density: 'standard',
    tocEnabled: false,
    footer: { authorEnabled: true },
    cover: {
      titleOverride: '',
      summaryOverride: '',
      author: '',
      imageRef: null,
      focalPoint: { x: 50, y: 50 }
    }
  };
}

/** @param {unknown} value @returns {XhsDocumentSettings} */
export function normalizeXhsSettings(value) {
  const defaults = createDefaultXhsSettings();
  const input = value && typeof value === 'object' ? value : {};
  const cover = input.cover && typeof input.cover === 'object' ? input.cover : {};
  const footer = input.footer && typeof input.footer === 'object' ? input.footer : {};
  return {
    schemaVersion: 1,
    themeId: XHS_THEME_IDS.includes(input.themeId) ? input.themeId : defaults.themeId,
    density: XHS_DENSITIES.includes(input.density) ? input.density : defaults.density,
    tocEnabled: input.tocEnabled === true,
    footer: { authorEnabled: footer.authorEnabled !== false },
    cover: {
      titleOverride: typeof cover.titleOverride === 'string' ? cover.titleOverride : '',
      summaryOverride: typeof cover.summaryOverride === 'string' ? cover.summaryOverride : '',
      author: typeof cover.author === 'string' ? cover.author : '',
      imageRef: typeof cover.imageRef === 'string' && cover.imageRef ? cover.imageRef : null,
      focalPoint: {
        x: clamp(cover.focalPoint?.x, 0, 100, 50),
        y: clamp(cover.focalPoint?.y, 0, 100, 50)
      }
    }
  };
}
