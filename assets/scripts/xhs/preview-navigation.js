import { XHS_LOGICAL_HEIGHT, XHS_LOGICAL_WIDTH } from './constants.js';

const PREVIEW_MODES = new Set(['horizontal', 'vertical']);

export function calculateXhsPreviewScale({
  mode,
  containerWidth,
  containerHeight,
  reservedWidth = 0,
  reservedHeight = 0
} = {}) {
  const widthScale = (Number(containerWidth) - Number(reservedWidth)) / XHS_LOGICAL_WIDTH;
  const heightScale = normalizeXhsPreviewMode(mode) === 'horizontal'
    ? (Number(containerHeight) - Number(reservedHeight)) / XHS_LOGICAL_HEIGHT
    : Infinity;
  return Math.min(1, Math.max(0.35, Math.min(widthScale, heightScale)));
}

export function normalizeXhsPreviewMode(mode) {
  return PREVIEW_MODES.has(mode) ? mode : 'horizontal';
}

export function resolveXhsPageSelection(pages, selectedId, fallbackIndex = 0) {
  if (!Array.isArray(pages) || pages.length === 0) {
    return { page: null, index: -1 };
  }

  const selectedIndex = pages.findIndex((page) => page.id === selectedId);
  const numericFallback = Number.isFinite(Number(fallbackIndex))
    ? Math.trunc(Number(fallbackIndex))
    : 0;
  const index = selectedIndex >= 0
    ? selectedIndex
    : Math.min(pages.length - 1, Math.max(0, numericFallback));

  return { page: pages[index], index };
}

export function stepXhsPageSelection(pages, selectedId, delta) {
  const current = resolveXhsPageSelection(pages, selectedId, 0);
  if (current.index < 0) return current;
  return resolveXhsPageSelection(
    pages,
    null,
    current.index + Math.sign(Number(delta) || 0)
  );
}
