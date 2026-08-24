/**
 * Small formatting helpers shared by settings normalization and rendering.
 * @module core/format-utils
 */

export function clampNumber(value, min, max, fallback, precision = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const clamped = Math.min(max, Math.max(min, number));
  if (precision == null) return clamped;
  if (precision <= 0) return Math.round(clamped);
  return Number(clamped.toFixed(precision));
}

export function hexToRgba(hex, opacity) {
  const normalized = String(hex || '').trim().replace('#', '');
  const fullHex = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) {
    return `rgba(0, 0, 0, ${opacity})`;
  }

  const red = parseInt(fullHex.slice(0, 2), 16);
  const green = parseInt(fullHex.slice(2, 4), 16);
  const blue = parseInt(fullHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}
