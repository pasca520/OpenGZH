import { describe, expect, it } from 'vitest';
import { STYLES } from '../../../styles/themes/index.js';

/**
 * 模板微信阅读清晰度回归门槛。
 * 每个模板可以有自己的风格（行高/字间距/标题比例不同），
 * 但必须保证正文与代码在微信中清晰可读：
 * - 正文/列表/引用 行高 ≥ 1.5，标题行高 ≥ 1.1
 * - 正文字号 ≥ 12px，代码/表格字号 ≥ 10px
 * - 图片 max-width: 100%（防止微信内溢出）
 * - 正文字间距不出现过大的负值（防止发虚/粘连）
 */

const BODY_SELECTORS = ['container', 'p', 'li', 'blockquote'];
const HEADING_SELECTORS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
const SMALL_TEXT_SELECTORS = ['code', 'pre', 'th', 'td'];

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

function numberValue(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

function auditTheme(themeKey, theme) {
  const styles = theme.styles;
  const failures = [];

  // 行高：正文 ≥ 1.5（em 倍数），标题 ≥ 1.1
  BODY_SELECTORS.forEach((selector) => {
    const value = getProperty(styles[selector], 'line-height');
    if (!value || value.endsWith('px')) return; // 固定像素行高（如引用装饰）不强制
    const number = numberValue(value);
    if (number != null && number < 1.5) {
      failures.push(`${themeKey}/${selector}: line-height=${value} < 1.5`);
    }
  });
  HEADING_SELECTORS.forEach((selector) => {
    const value = getProperty(styles[selector], 'line-height');
    if (!value || value.endsWith('px')) return;
    const number = numberValue(value);
    if (number != null && number < 1.1) {
      failures.push(`${themeKey}/${selector}: line-height=${value} < 1.1`);
    }
  });

  // 字号下限：正文 ≥ 12px，代码/表格 ≥ 10px
  BODY_SELECTORS.forEach((selector) => {
    const value = getProperty(styles[selector], 'font-size');
    const number = value ? numberValue(value) : null;
    if (number != null && number < 12) {
      failures.push(`${themeKey}/${selector}: font-size=${value} < 12px`);
    }
  });
  SMALL_TEXT_SELECTORS.forEach((selector) => {
    const value = getProperty(styles[selector], 'font-size');
    const number = value ? numberValue(value) : null;
    if (number != null && number < 10) {
      failures.push(`${themeKey}/${selector}: font-size=${value} < 10px`);
    }
  });

  // 图片：必须限制最大宽度，防止微信内横向溢出
  const imageStyle = styles.img || '';
  if (imageStyle && !/max-width\s*:\s*100%/i.test(imageStyle)) {
    failures.push(`${themeKey}/img: 缺少 max-width: 100%`);
  }

  // 正文字间距：不允许过大的负值（小字发虚/粘连）
  BODY_SELECTORS.forEach((selector) => {
    const value = getProperty(styles[selector], 'letter-spacing');
    if (!value) return;
    const number = numberValue(value);
    if (number == null) return;
    const floor = value.endsWith('em') ? -0.02 : value.endsWith('px') ? -0.5 : null;
    if (floor != null && number < floor) {
      failures.push(`${themeKey}/${selector}: letter-spacing=${value} 过小`);
    }
  });

  return failures;
}

describe('article theme readability for WeChat', () => {
  it('all themes keep body text clear and images within bounds', () => {
    const failures = Object.entries(STYLES).flatMap(([key, theme]) => auditTheme(key, theme));
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('正红红线 trims the full-width gap after CJK punctuation', () => {
    expect(getProperty(STYLES['gzh-dansha'].styles.container, 'font-feature-settings')).toBe('"hwid" 1');
  });
});
