import { describe, expect, it } from 'vitest';
import { STYLES } from '../../../styles/themes/index.js';
import { CODE_THEMES, getCodeHighlightTheme } from '../../ui/code-themes.js';
import { darken } from '../gzh-structure.js';

const TEXT_SELECTORS = [
  'container', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p',
  'strong', 'em', 'a', 'li', 'blockquote', 'code', 'pre', 'th', 'td'
];
const WHITE = { r: 255, g: 255, b: 255, a: 1 };

function clamp(value) {
  return Math.min(255, Math.max(0, value));
}

function parseColor(value) {
  const input = String(value || '').trim();
  const hex = input.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    let raw = hex[1];
    if (raw.length === 3) raw = raw.split('').map((char) => char + char).join('');
    return {
      r: Number.parseInt(raw.slice(0, 2), 16),
      g: Number.parseInt(raw.slice(2, 4), 16),
      b: Number.parseInt(raw.slice(4, 6), 16),
      a: raw.length === 8 ? Number.parseInt(raw.slice(6, 8), 16) / 255 : 1
    };
  }

  const rgb = input.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgb) return null;
  const channels = rgb[1].split(',').map((part) => Number.parseFloat(part.trim()));
  if (channels.length < 3 || channels.slice(0, 3).some((part) => !Number.isFinite(part))) return null;
  return {
    r: clamp(channels[0]),
    g: clamp(channels[1]),
    b: clamp(channels[2]),
    a: Number.isFinite(channels[3]) ? Math.min(1, Math.max(0, channels[3])) : 1
  };
}

function composite(foreground, background) {
  return {
    r: foreground.r * foreground.a + background.r * (1 - foreground.a),
    g: foreground.g * foreground.a + background.g * (1 - foreground.a),
    b: foreground.b * foreground.a + background.b * (1 - foreground.a),
    a: 1
  };
}

function luminance(color) {
  const linear = (channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(color.r) + 0.7152 * linear(color.g) + 0.0722 * linear(color.b);
}

function contrast(colorA, colorB) {
  const luminanceA = luminance(colorA);
  const luminanceB = luminance(colorB);
  return (Math.max(luminanceA, luminanceB) + 0.05) / (Math.min(luminanceA, luminanceB) + 0.05);
}

// Exact matrices for filter: invert(1) hue-rotate(180deg), matching editor.css.
function darkPreviewColor(color) {
  const r = 255 - color.r;
  const g = 255 - color.g;
  const b = 255 - color.b;
  return {
    r: clamp(-0.574 * r + 1.43 * g + 0.144 * b),
    g: clamp(0.426 * r + 0.43 * g + 0.144 * b),
    b: clamp(0.426 * r + 1.43 * g - 0.856 * b),
    a: 1
  };
}

function getDeclarations(styleText) {
  return String(styleText || '')
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator === -1) return null;
      return {
        property: declaration.slice(0, separator).trim().toLowerCase(),
        value: declaration.slice(separator + 1).replace(/\s*!important\s*$/i, '').trim()
      };
    })
    .filter(Boolean);
}

function getProperty(styleText, property) {
  return getDeclarations(styleText)
    .filter((declaration) => declaration.property === property)
    .at(-1)?.value || null;
}

function getBackground(styleText) {
  return getDeclarations(styleText)
    .filter((declaration) => declaration.property === 'background' || declaration.property === 'background-color')
    .at(-1)?.value || null;
}

function getColorTokens(value) {
  return Array.from(String(value || '').matchAll(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/ig), (match) => match[0]);
}

function backgroundColors(styleText, parentBackground) {
  if (/background-clip\s*:\s*text/i.test(styleText || '')) return [parentBackground];
  const value = getBackground(styleText);
  if (!value || value === 'transparent') return [parentBackground];
  const colors = getColorTokens(value).map(parseColor).filter(Boolean);
  const backgrounds = colors.map((color) => composite(color, parentBackground));
  if (/transparent/i.test(value)) backgrounds.push(parentBackground);
  return backgrounds.length ? backgrounds : [parentBackground];
}

function textColor(styleText, fallback) {
  return parseColor(getColorTokens(getProperty(styleText, 'color')).at(-1)) || fallback;
}

function thresholdFor(styleText, containerStyle) {
  const fontSize = Number.parseFloat(getProperty(styleText, 'font-size') || getProperty(containerStyle, 'font-size') || '15');
  const fontWeight = Number.parseInt(getProperty(styleText, 'font-weight') || '400', 10) || 400;
  return fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700) ? 3 : 4.5;
}

function auditTheme(themeKey, theme) {
  const styles = theme.styles;
  const containerBackground = backgroundColors(styles.container, WHITE).at(-1);
  const containerColor = textColor(styles.container, { r: 0, g: 0, b: 0, a: 1 });
  const failures = [];

  TEXT_SELECTORS.forEach((selector) => {
    const styleText = styles[selector];
    if (!styleText) return;

    const parentBackground = selector === 'h2' && theme.gzh?.numStyle === 'chip'
      ? composite(parseColor(theme.gzh.soft), containerBackground)
      : containerBackground;
    const foreground = textColor(styleText, containerColor);
    const minimum = thresholdFor(styleText, styles.container);

    backgroundColors(styleText, parentBackground).forEach((background) => {
      const solidForeground = composite(foreground, background);
      const lightRatio = contrast(solidForeground, background);
      // Native dark themes are already dark and are not inverted by the preview or WeChat.
      const darkRatio = theme.gzh?.bg
        ? lightRatio
        : contrast(darkPreviewColor(solidForeground), darkPreviewColor(background));
      if (lightRatio < minimum || darkRatio < minimum) {
        failures.push(
          `${themeKey}/${selector}: light=${lightRatio.toFixed(2)}, dark=${darkRatio.toFixed(2)}, min=${minimum}`
        );
      }
    });
  });

  return [...new Set(failures)];
}

describe('article theme contrast', () => {
  it('all text remains readable in light and dark preview modes', () => {
    const failures = Object.entries(STYLES).flatMap(([key, theme]) => auditTheme(key, theme));
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('generated GZH labels remain readable in light and dark modes', () => {
    const failures = [];
    Object.entries(STYLES).forEach(([themeKey, theme]) => {
      const gzh = theme.gzh;
      if (!gzh) return;
      const containerBackground = parseColor(gzh.bg || '#ffffff');
      const pairs = [
        ['mark', parseColor(gzh.title), parseColor(gzh.tagBg), 4.5],
        ['end', parseColor(gzh.bg ? gzh.muted : darken(gzh.muted)), containerBackground, 4.5]
      ];

      if (gzh.numStyle !== 'watermark') {
        const numberBackground = gzh.numStyle === 'chip' ? parseColor(gzh.soft) : containerBackground;
        (gzh.palette || [gzh.accent]).forEach((accent, index) => {
          const readableAccent = parseColor(gzh.bg ? accent : darken(accent));
          pairs.push(gzh.numStyle === 'badge'
            ? [`number-${index + 1}`, WHITE, readableAccent, 4.5]
            : [`number-${index + 1}`, readableAccent, numberBackground, 3]);
        });
      }

      pairs.forEach(([label, foreground, background, minimum]) => {
        const lightRatio = contrast(foreground, background);
        const darkRatio = gzh.bg
          ? lightRatio
          : contrast(darkPreviewColor(foreground), darkPreviewColor(background));
        if (lightRatio < minimum || darkRatio < minimum) {
          failures.push(
            `${themeKey}/${label}: light=${lightRatio.toFixed(2)}, dark=${darkRatio.toFixed(2)}, min=${minimum}`
          );
        }
      });
    });
    expect(failures, failures.join('\n')).toEqual([]);
  });
});

describe('code theme contrast', () => {
  it('all syntax text meets normal-text contrast', () => {
    const failures = [];
    Object.entries(CODE_THEMES).forEach(([themeKey, theme]) => {
      const background = parseColor(theme.bg);
      const darkBackground = darkPreviewColor(darkPreviewColor(background));
      Object.entries({ text: theme.textColor, ...theme.tokens }).forEach(([token, value]) => {
        const color = parseColor(value);
        const lightRatio = contrast(color, background);
        const darkRatio = contrast(darkPreviewColor(darkPreviewColor(color)), darkBackground);
        if (lightRatio < 4.5 || darkRatio < 4.5) {
          failures.push(`${themeKey}/${token}: light=${lightRatio.toFixed(2)}, dark=${darkRatio.toFixed(2)}`);
        }
      });
    });
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('theme-derived syntax text meets normal-text contrast', () => {
    const failures = [];
    Object.entries(STYLES).forEach(([themeKey, styleConfig]) => {
      const theme = getCodeHighlightTheme(null, styleConfig);
      const background = parseColor(theme.bg);
      Object.entries({ text: theme.textColor, ...theme.tokens }).forEach(([token, value]) => {
        const ratio = contrast(parseColor(value), background);
        if (ratio < 4.5) failures.push(`${themeKey}/${token}: ${ratio.toFixed(2)}`);
      });
    });
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
