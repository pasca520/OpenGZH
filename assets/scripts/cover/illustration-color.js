// ============================================================
// SVG Illustration Color Customization
// Load, analyze, and recolor SVG illustrations at runtime
// ============================================================

// ── Color utility helpers (internal) ───────────────────────

/**
 * Normalize a hex color string to uppercase 6-digit form (#AABBCC).
 * Handles 3-digit shorthand (#ABC → #AABBCC). Returns null for invalid input.
 * @param {string} hex
 * @returns {string|null}
 */
function normalizeHex(hex) {
  if (!hex || typeof hex !== 'string') return null;
  hex = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return '#' + hex.toUpperCase();
  }
  return null;
}

/**
 * Determine whether a normalized hex color is "neutral" —
 * white, black, very light grays, or very dark grays that
 * serve as backgrounds / outlines rather than accent colors.
 * @param {string} hex - Normalized 6-digit hex like '#AABBCC'
 * @returns {boolean}
 */
function isNeutralColor(hex) {
  const norm = normalizeHex(hex);
  if (!norm) return true;
  const r = parseInt(norm.slice(1, 3), 16);
  const g = parseInt(norm.slice(3, 5), 16);
  const b = parseInt(norm.slice(5, 7), 16);

  // White / near-white
  if (r > 230 && g > 230 && b > 230) return true;
  // Black / near-black
  if (r < 40 && g < 40 && b < 40) return true;
  // Very light gray (R ≈ G ≈ B, all > 200)
  if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && r > 200) return true;
  // Very dark gray (R ≈ G ≈ B, all < 60)
  if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && r < 60) return true;

  return false;
}

/**
 * Compute a simple "vibrancy" score for a color.
 * Higher = more saturated and distinct from gray.
 * @param {string} hex - Normalized 6-digit hex
 * @returns {number}
 */
function vibrancyScore(hex) {
  const norm = normalizeHex(hex);
  if (!norm) return 0;
  const r = parseInt(norm.slice(1, 3), 16);
  const g = parseInt(norm.slice(3, 5), 16);
  const b = parseInt(norm.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const brightness = max / 255;
  // Prefer saturated, mid-brightness colors
  return saturation * (1 - Math.abs(brightness - 0.5));
}

/** Named CSS colors that map to neutral hex values (subset). */
const NEUTRAL_NAMES = new Set([
  'WHITE', 'BLACK', 'NONE', 'TRANSPARENT', 'INHERIT', 'CURRENTCOLOR',
  'GRAY', 'GREY', 'SILVER', 'LIGHTGRAY', 'LIGHTGREY',
  'DARKGRAY', 'DARKGREY', 'WHITESMOKE', 'GAINSBORO'
]);

// ── Color extraction ───────────────────────────────────────

/**
 * Collect all fill and stroke color occurrences from an SVG string.
 * Handles:
 *   - Inline attributes: fill="#xxx", stroke="#xxx"
 *   - Inline styles: style="fill:#xxx; stroke:#xxx"
 *   - CSS class definitions: .cls-N { fill: #xxx; }
 *
 * Returns a Map<hex, count> of normalized colors (excludes neutrals).
 * @param {string} svgString
 * @returns {Map<string, number>}
 */
function collectColors(svgString) {
  const counts = new Map();

  function record(raw) {
    const norm = normalizeHex(raw);
    if (norm && !isNeutralColor(norm)) {
      counts.set(norm, (counts.get(norm) || 0) + 1);
    }
  }

  // 1. Inline fill/stroke attributes: fill="#xxx" or stroke="#xxx"
  const attrRe = /(?:fill|stroke)\s*=\s*"([^"]*#[0-9a-fA-F]{3,6}[^"]*)"/gi;
  let m;
  while ((m = attrRe.exec(svgString)) !== null) {
    const val = m[1].trim();
    const hexMatch = val.match(/#[0-9a-fA-F]{3,6}/);
    if (hexMatch) record(hexMatch[0]);
  }

  // 2. Inline style attributes: style="fill:#xxx; stroke:#abc"
  const styleAttrRe = /style\s*=\s*"([^"]*)"/gi;
  while ((m = styleAttrRe.exec(svgString)) !== null) {
    const styleVal = m[1];
    const colorRe = /(?:fill|stroke)\s*:\s*(#[0-9a-fA-F]{3,6})/gi;
    let cm;
    while ((cm = colorRe.exec(styleVal)) !== null) {
      record(cm[1]);
    }
  }

  // 3. CSS class definitions inside <style> blocks: fill: #xxx
  const styleBlockRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = styleBlockRe.exec(svgString)) !== null) {
    const css = m[1];
    const cssColorRe = /(?:fill|stroke)\s*:\s*(#[0-9a-fA-F]{3,6})/gi;
    let cm;
    while ((cm = cssColorRe.exec(css)) !== null) {
      record(cm[1]);
    }
  }

  return counts;
}

/**
 * Extract the primary accent color from an SVG string.
 * Returns the most vibrant (non-gray, non-white, non-black) fill color
 * weighted by occurrence count and vibrancy.
 *
 * @param {string} svgString - Raw SVG content
 * @returns {string} Hex color string (e.g. '#6C63FF'), or '#6366F1' as default
 */
export function extractPrimaryColor(svgString) {
  if (!svgString) return '#6366F1';

  const colors = collectColors(svgString);
  if (colors.size === 0) return '#6366F1';

  let bestColor = '#6366F1';
  let bestScore = -1;

  for (const [hex, count] of colors) {
    // Score = vibrancy * log(occurrences + 1) to balance color quality vs frequency
    const score = vibrancyScore(hex) * Math.log2(count + 1);
    if (score > bestScore) {
      bestScore = score;
      bestColor = hex;
    }
  }

  return bestColor;
}

// ── SVG loading ────────────────────────────────────────────

/**
 * Load an SVG file and return its content as a string.
 * @param {string} path - URL or relative path to SVG file
 * @returns {Promise<string>} SVG content, or empty string on failure
 */
export async function loadIllustrationSvg(path) {
  if (!path) return '';
  try {
    const resp = await fetch(path);
    if (!resp.ok) return '';
    return await resp.text();
  } catch {
    return '';
  }
}

// ── Color replacement ──────────────────────────────────────

/**
 * Replace a single hex color throughout an SVG string (case-insensitive).
 * Handles inline attributes (fill="#xxx"), inline styles (style="fill:#xxx"),
 * and CSS class definitions ({ fill: #xxx; }).
 *
 * @param {string} svgString - Raw SVG content
 * @param {string} fromHex   - Original color to find (e.g. '#6C63FF')
 * @param {string} toHex     - Replacement color (e.g. '#10B981')
 * @returns {string} Modified SVG string
 */
function swapColor(svgString, fromHex, toHex) {
  // Build patterns for 6-digit and 3-digit forms
  const from6 = fromHex.replace(/^#/, '');
  const to6 = toHex.replace(/^#/, '');

  // Also derive 3-digit shorthand if applicable
  const canShrink = to6[0] === to6[1] && to6[2] === to6[3] && to6[4] === to6[5];
  const to3 = canShrink ? (to6[0] + to6[2] + to6[4]) : to6;

  // Replace 6-digit form (case-insensitive)
  let result = svgString.replace(
    new RegExp('#' + from6, 'gi'),
    '#' + to6
  );

  // Replace 3-digit shorthand form if the source has one
  const from3Candidate = from6[0] === from6[1] && from6[2] === from6[3] && from6[4] === from6[5]
    ? (from6[0] + from6[2] + from6[4])
    : null;
  if (from3Candidate) {
    // Use a word-boundary-like approach to avoid partial replacements
    // Match #ABC only when not followed by another hex digit
    const re3 = new RegExp('#' + from3Candidate + '(?![0-9a-fA-F])', 'gi');
    result = result.replace(re3, '#' + to3);
  }

  return result;
}

/**
 * Replace the primary color in an SVG string with a new color.
 *
 * Strategy (in priority order):
 *   1. If `originalColor` is provided, directly replace that color.
 *   2. Otherwise, auto-detect the most common vibrant accent color and replace it.
 *   3. If no vibrant colors are found, return the SVG unchanged.
 *
 * The function is careful NOT to replace:
 *   - White (#FFF, #FFFFFF)
 *   - Black (#000, #000000)
 *   - Very light/dark grays (used for backgrounds and outlines)
 *
 * @param {string} svgString - Raw SVG content
 * @param {string} newColor - Target hex color like '#6366F1'
 * @param {string} [originalColor] - Optional: the original color to replace
 * @returns {string} Modified SVG string
 */
export function replaceIllustrationColor(svgString, newColor, originalColor) {
  if (!svgString || !newColor) return svgString || '';

  const newNorm = normalizeHex(newColor);
  if (!newNorm) return svgString;

  // Strategy 1: direct replacement of a known original color
  if (originalColor) {
    const origNorm = normalizeHex(originalColor);
    if (origNorm) {
      return swapColor(svgString, origNorm, newNorm);
    }
  }

  // Strategy 2: auto-detect the primary accent color
  const colors = collectColors(svgString);
  if (colors.size === 0) {
    // Strategy 3 fallback: no vibrant colors detected, return unchanged
    return svgString;
  }

  // Pick the color with highest (vibrancy * frequency) score
  let primaryColor = null;
  let bestScore = -1;
  for (const [hex, count] of colors) {
    const score = vibrancyScore(hex) * Math.log2(count + 1);
    if (score > bestScore) {
      bestScore = score;
      primaryColor = hex;
    }
  }

  if (!primaryColor) return svgString;

  return swapColor(svgString, primaryColor, newNorm);
}
