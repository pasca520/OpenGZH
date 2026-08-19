/**
 * 样式覆盖层 —— 文档级(L1) / 元素类级(L2) / 块级盒子(L3) 样式覆盖。
 *
 * 设计见 docs/STYLE-OVERRIDE-DESIGN.md：
 * - L1 文档级：tokens（主题色）+ params（排版参数），随文档保存。
 * - L2 元素类级：elements（selector → CSS 字符串），声明级合并，输出去 !important。
 * - L3 块级：.ogzh-* 盒子，由 applyBlockStyles() 在渲染管线内联化，预览与复制一致。
 * - 附带：{.class} 行尾标记插件、front matter 序列化/解析。
 *
 * 纯函数为主便于 node 单测；DOM 胶水仅在渲染管线/主线程内调用。
 * @module style-override
 */

import { darken } from './gzh-structure.js';

/* ================= L1 / L2 常量 ================= */

/** 可覆盖的主题色 token（键与主题 gzh 对齐） */
export const TOKEN_KEYS = ['accent', 'body', 'muted', 'line'];

/** 可覆盖的排版参数定义 */
export const PARAM_DEFS = [
  { key: 'bodyFontSize', label: '正文字号', unit: 'px', min: 12, max: 24, step: 1, precision: 0 },
  { key: 'lineHeight', label: '行高', unit: '', min: 1.2, max: 2.4, step: 0.05, precision: 2 },
  { key: 'paraSpacing', label: '段间距', unit: 'px', min: 0, max: 64, step: 2, precision: 0 },
  { key: 'letterSpacing', label: '字间距', unit: 'px', min: 0, max: 2, step: 0.1, precision: 1 },
  { key: 'contentPaddingX', label: '正文左右留白', unit: 'px', min: 5, max: 16, step: 1, precision: 0 }
];

/** 每个排版参数 → 需要改写的 (selector, property) */
const PARAM_TARGETS = {
  bodyFontSize: [{ selector: 'p', property: 'font-size' }, { selector: 'container', property: 'font-size' }],
  lineHeight: [
    { selector: 'container', property: 'line-height' },
    { selector: 'p', property: 'line-height' },
    { selector: 'li', property: 'line-height' },
    { selector: 'blockquote', property: 'line-height' }
  ],
  paraSpacing: [
    { selector: 'p', property: 'margin-bottom' },
    { selector: 'ul', property: 'margin-bottom' },
    { selector: 'ol', property: 'margin-bottom' },
    { selector: 'blockquote', property: 'margin-bottom' },
    { selector: 'pre', property: 'margin-bottom' },
    { selector: 'table', property: 'margin-bottom' }
  ],
  letterSpacing: [{ selector: 'container', property: 'letter-spacing' }],
  contentPaddingX: [
    { selector: 'container', property: 'padding-left' },
    { selector: 'container', property: 'padding-right' }
  ]
};

/** L3 盒子库（刷子可复制的段落级盒子） */
export const BOX_DEFS = [
  { key: 'info', name: '提示' },
  { key: 'warn', name: '注意' },
  { key: 'key', name: '重点' },
  { key: 'quote', name: '观点引用' },
  { key: 'fact', name: '数据卡' },
  { key: 'media', name: '图文卡片' },
  { key: 'steps', name: '步骤条' }
];

/** 可被样式刷子复制的段落级盒子 class（steps 为 HTML 结构，不参与刷子） */
export const BRUSH_CLASSES = ['ogzh-info', 'ogzh-warn', 'ogzh-key', 'ogzh-quote', 'ogzh-fact', 'ogzh-media'];

/* ================= 基础工具 ================= */

function normalizeHex(hex) {
  if (!hex) return null;
  let h = String(hex).trim().replace('#', '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return h.toLowerCase();
}

/** 任意合法 hex（#rgb / #rrggbb 大小写均可）→ '#rrggbb'，非法返回 null */
export function normalizeTokenHex(hex) {
  const h = normalizeHex(hex);
  return h ? `#${h}` : null;
}

function hexToRgba(hex, opacity) {
  const h = normalizeHex(hex);
  if (!h) return `rgba(0, 0, 0, ${opacity})`;
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${opacity})`;
}

/** 解析 CSS 声明字符串 → { property: value } */
export function parseDeclarations(cssText) {
  const map = {};
  if (!cssText) return map;
  String(cssText).split(';').forEach((decl) => {
    const idx = decl.indexOf(':');
    if (idx === -1) return;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    if (!prop) return;
    map[prop] = decl.slice(idx + 1).trim();
  });
  return map;
}

/** 声明 map → CSS 字符串 */
export function serializeDeclarations(map) {
  return Object.entries(map).map(([prop, value]) => `${prop}: ${value}`).join('; ');
}

/**
 * 声明级合并：覆盖值胜出；输出统一去 !important
 * （保证后续层级——盒子样式——仍可覆盖，而非依赖 !important 运气）。
 */
export function declarationMerge(themeText, overrideText) {
  const map = parseDeclarations(themeText);
  Object.entries(parseDeclarations(overrideText)).forEach(([prop, value]) => {
    map[prop] = String(value).replace(/!\s*important\s*$/i, '').trim();
  });
  return serializeDeclarations(map);
}

function extractDeclaration(styleText, property) {
  if (!styleText || !property) return null;
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(styleText).match(new RegExp(`(?:^|;)\\s*${escaped}\\s*:\\s*([^;]+)`, 'i'));
  return match ? match[1].trim() : null;
}

function firstHexIn(text) {
  if (!text) return null;
  const m = String(text).match(/#([0-9a-fA-F]{3,8})/);
  if (!m) return null;
  return normalizeTokenHex(m[1]);
}

/** 从样式字符串中提取颜色（属性值本身可能是 hex，也可能夹在复合值里） */
function extractTokenColor(styleText, property) {
  const value = extractDeclaration(styleText, property);
  if (!value) return null;
  return firstHexIn(value);
}

/**
 * 非 gzh 主题没有 token 表，从样式字符串反推一套可用的语义色，
 * 使 L1 主题色覆盖与 L3 盒子在所有主题上都能工作。
 */
export function gzhFallbackFromStyles(styles) {
  const p = styles.p || styles.container || '';
  const heading = styles.h1 || styles.h2 || styles.strong || '';
  return {
    accent: extractTokenColor(heading, 'color') || '#2563EB',
    body: extractTokenColor(p, 'color') || '#3F3F3F',
    muted: extractTokenColor(styles.em || styles.blockquote || '', 'color') || '#9CA3AF',
    line: extractTokenColor(styles.hr || '', 'background') || extractTokenColor(styles.hr || '', 'background-color')
      || firstHexIn(extractDeclaration(styles.th || '', 'border-bottom')) || '#E4E4E7',
    soft: extractTokenColor(styles.th || '', 'background') || extractTokenColor(styles.blockquote || '', 'background') || '#F5F3F0',
    title: extractTokenColor(heading, 'color') || '#111111',
    tagBg: extractTokenColor(styles.code || '', 'background') || '#F0F0F0'
  };
}

/* ================= L1 / L2 归一化 ================= */

const ELEMENT_SELECTOR_RE = /^[a-zA-Z][a-zA-Z0-9\s:>#.,()[\]_\-]*$/;

/** 校准用户输入为合法的 styleOverride（见设计文档 §4.2） */
export function normalizeStyleOverride(input) {
  if (!input || typeof input !== 'object') return {};
  const out = {};

  const tokens = input.tokens && typeof input.tokens === 'object' ? input.tokens : {};
  const tokenEntries = TOKEN_KEYS.filter((key) => normalizeHex(tokens[key]));
  if (tokenEntries.length > 0) {
    out.tokens = {};
    tokenEntries.forEach((key) => { out.tokens[key] = normalizeTokenHex(tokens[key]); });
  }

  const params = input.params && typeof input.params === 'object' ? input.params : {};
  const paramEntries = PARAM_DEFS.filter((def) => {
    const value = Number(params[def.key]);
    return Number.isFinite(value) && value >= def.min && value <= def.max;
  });
  if (paramEntries.length > 0) {
    out.params = {};
    paramEntries.forEach((def) => {
      out.params[def.key] = Number(Number(params[def.key]).toFixed(def.precision));
    });
  }

  const elements = input.elements && typeof input.elements === 'object' ? input.elements : {};
  const elementEntries = Object.entries(elements)
    .filter(([selector, css]) => (
      typeof css === 'string' && css.trim() && selector.length <= 60 && ELEMENT_SELECTOR_RE.test(selector)
    ))
    .map(([selector, css]) => [selector, css.trim()]);
  if (elementEntries.length > 0) {
    out.elements = {};
    elementEntries.forEach(([selector, css]) => { out.elements[selector] = css; });
  }

  return out;
}

/* ================= mergeTheme ================= */

function substituteTokenColors(styles, originalColors, overriddenTokens) {
  const replacements = {};
  Object.entries(overriddenTokens).forEach(([key, next]) => {
    const from = normalizeHex(originalColors[key]);
    const to = normalizeHex(next);
    if (from && to && from !== to) replacements[`#${from}`] = `#${to}`;
  });
  if (Object.keys(replacements).length === 0) return styles;

  const result = {};
  Object.entries(styles).forEach(([selector, text]) => {
    let str = String(text || '');
    Object.entries(replacements).forEach(([from, to]) => {
      str = str.split(from).join(to);
      str = str.split(from.toUpperCase()).join(to);
    });
    result[selector] = str;
  });
  return result;
}

function formatParamValue(key, value) {
  const def = PARAM_DEFS.find((d) => d.key === key);
  if (!def) return String(value);
  const rounded = Number(Number(value).toFixed(def.precision));
  return def.unit ? `${rounded}${def.unit}` : String(rounded);
}

function applyParams(styles, params) {
  Object.entries(PARAM_TARGETS).forEach(([paramKey, targets]) => {
    const value = params[paramKey];
    if (value == null || !Number.isFinite(Number(value))) return;
    const formatted = formatParamValue(paramKey, Number(value));
    targets.forEach(({ selector, property }) => {
      styles[selector] = declarationMerge(styles[selector] || '', `${property}: ${formatted}`);
    });
  });
}

/**
 * 主题 ⊗ 文档覆盖 = 最终样式配置（设计文档 §5.1）。
 * - L1 tokens：替换 gzh 对应色，并把 styles 字符串里的「主题原色」联动替换；
 * - L2 elements：声明级合并；
 * - L1 params：按 PARAM_TARGETS 映射改写。
 */
export function mergeTheme(theme, styleOverride = {}) {
  const themeStyles = theme?.styles || {};
  const styles = { ...themeStyles };
  const gzh = { ...(theme?.gzh || {}) };
  const sv = normalizeStyleOverride(styleOverride);
  const tokens = sv.tokens || {};
  const params = sv.params || {};
  const elements = sv.elements || {};

  const originalColors = { ...gzhFallbackFromStyles(themeStyles), ...gzh };

  // L1 tokens
  const overridden = {};
  TOKEN_KEYS.forEach((key) => {
    if (key in tokens) {
      gzh[key] = tokens[key];
      overridden[key] = tokens[key];
    }
  });

  // 主题色联动：替换 styles 字符串中的主题原色
  const substituted = substituteTokenColors(styles, originalColors, overridden);

  // L2 elements 声明级合并
  const mergedStyles = { ...substituted };
  Object.entries(elements).forEach(([selector, cssText]) => {
    mergedStyles[selector] = declarationMerge(substituted[selector] || '', cssText);
  });

  // L1 params
  applyParams(mergedStyles, params);

  return { ...theme, gzh, styles: mergedStyles };
}

/** 从合并后的 styles 读取某 selector 的声明值（供 UI 回显主题默认值） */
export function getMergedDeclaration(styles, selector, property) {
  return extractDeclaration(styles?.[selector], property);
}

/** 读取合并后 styles 中某排版参数的当前值（供滑块回显） */
export function readParamFromStyles(styles, key) {
  const targets = PARAM_TARGETS[key];
  if (!targets) return null;
  for (const { selector, property } of targets) {
    const value = extractDeclaration(styles?.[selector], property);
    if (value == null) continue;
    const num = parseFloat(String(value).replace(/px$/i, ''));
    if (Number.isFinite(num)) return num;
  }
  return null;
}

/* ================= L3 盒子 ================= */

function boxColors(gzh) {
  const g = gzh || {};
  const accent = g.accent || '#2563EB';
  const dk = g.bg ? accent : darken(accent);
  const body = g.body || '#3F3F3F';
  const muted = g.muted || '#9CA3AF';
  const line = g.line || '#E4E4E7';
  const soft = g.soft || '#F5F3F0';
  const tagBg = g.tagBg || '#F0F0F0';
  return { accent, dk, body, muted, line, soft, tagBg, bg: g.bg };
}

/**
 * 渲染管线内调用：把 .ogzh-* 盒子的「类名样式」内联化（预览与复制一致）。
 * 关键属性一律带 !important，保证覆盖主题/图片设置（它们带 !important）。
 */
export function applyBlockStyles(doc, gzh) {
  if (!doc?.querySelectorAll) return;
  const boxed = doc.querySelectorAll('.ogzh-box');
  if (boxed.length === 0 && !doc.querySelector('[class*="ogzh-"]')) return;

  const c = boxColors(gzh);

  const shared = `margin: 26px 10px; padding: 14px 16px; border-radius: 8px;`;

  doc.querySelectorAll('.ogzh-callout').forEach((el) => {
    el.setAttribute('style', appendStyle(el, `${shared} background: ${c.soft} !important; color: ${c.body} !important; border: 1px solid ${c.line} !important;`));
  });
  doc.querySelectorAll('.ogzh-info').forEach((el) => {
    el.setAttribute('style', appendStyle(el, `border-left: 4px solid ${c.dk} !important;`));
  });
  doc.querySelectorAll('.ogzh-warn').forEach((el) => {
    el.setAttribute('style', appendStyle(el, `border-left: 4px solid #B45309 !important; background: #FEF3C7 !important; color: #7C2D12 !important;`));
  });
  doc.querySelectorAll('.ogzh-key').forEach((el) => {
    el.setAttribute('style', appendStyle(el, `border-left: 4px solid ${c.dk} !important; background: ${c.tagBg} !important; font-weight: 700 !important;`));
  });
  doc.querySelectorAll('.ogzh-quote').forEach((el) => {
    el.setAttribute('style', appendStyle(el, `${shared} background: ${c.soft} !important; border-left: 4px solid ${c.dk} !important; color: ${c.body} !important;`));
  });
  doc.querySelectorAll('.ogzh-fact').forEach((el) => {
    el.setAttribute('style', appendStyle(el, `${shared} background: ${c.soft} !important; border-left: 4px solid ${c.dk} !important; color: ${c.body} !important;`));
  });
  doc.querySelectorAll('.ogzh-media').forEach((el) => {
    el.setAttribute('style', appendStyle(el, `${shared} background: ${c.soft} !important; border: 1px solid ${c.line} !important; color: ${c.body} !important; text-align: center;`));
  });
  doc.querySelectorAll('.ogzh-media img').forEach((img) => {
    img.setAttribute('style', appendStyle(img, `border-radius: 10px !important; box-shadow: 0 10px 24px rgba(0,0,0,0.12) !important; margin-bottom: 10px !important;`));
  });

  doc.querySelectorAll('.ogzh-steps').forEach((el) => {
    el.setAttribute('style', appendStyle(el, `${shared} background: ${c.soft} !important; border: 1px solid ${c.line} !important; color: ${c.body} !important;`));
  });
  doc.querySelectorAll('.ogzh-steps .ogzh-step').forEach((el) => {
    el.setAttribute('style', appendStyle(el, `margin: 12px 0 !important; padding-left: 2px !important; color: ${c.body} !important;`));
  });
  doc.querySelectorAll('.ogzh-steps .ogzh-step strong').forEach((el) => {
    el.setAttribute('style', appendStyle(el, `display: inline-block !important; min-width: 22px; height: 22px; line-height: 22px; text-align: center; border-radius: 50%; background: ${c.dk} !important; color: #ffffff !important; font-size: 13px !important; margin-right: 8px; padding: 0 4px; box-sizing: border-box;`));
  });

  doc.querySelectorAll('.ogzh-callout strong, .ogzh-quote strong, .ogzh-fact strong').forEach((el) => {
    el.setAttribute('style', appendStyle(el, `color: ${c.dk} !important;`));
  });
}

function appendStyle(el, styleText) {
  const current = el?.getAttribute('style') || '';
  if (!styleText) return current;
  return current ? `${current.replace(/;\s*$/, '')}; ${styleText}` : styleText;
}

/** 生成插入到 Markdown 的盒子模板（段落级盒子用 {.class} 标记，步骤条用原生 HTML） */
export function insertBoxMarkdown(type) {
  switch (type) {
    case 'info':
      return '**提示：** 这里是提示内容。\n{.ogzh-info}\n\n';
    case 'warn':
      return '**注意：** 这里是需要注意的内容。\n{.ogzh-warn}\n\n';
    case 'key':
      return '**重点：** 这里是本段核心内容。\n{.ogzh-key}\n\n';
    case 'quote':
      return '**观点：** 这里引用某人的观点。\n{.ogzh-quote}\n\n';
    case 'fact':
      return '**数据：** 这里放关键数据结论。\n{.ogzh-fact}\n\n';
    case 'media':
      return '![图片说明](图片地址)\n{.ogzh-media}\n\n';
    case 'steps':
      return '<section class="ogzh-box ogzh-steps"><p class="ogzh-step"><strong>1.</strong> 第一步内容</p><p class="ogzh-step"><strong>2.</strong> 第二步内容</p><p class="ogzh-step"><strong>3.</strong> 第三步内容</p></section>\n\n';
    default:
      return '';
  }
}

export function getBoxName(key) {
  return BOX_DEFS.find((box) => box.key === key)?.name || key;
}

/* ================= {.class} 标记插件 ================= */

const ATTR_TRAILING_RE = /\n\s*\{\.([\w-]+(?:\s+\.[\w-]+)*)\}\s*$/;
const ATTR_ONLY_RE = /^\s*\{\.([\w-]+(?:\s+\.[\w-]+)*)\}\s*$/;

/** 纯函数：段落内文末尾的 `{.cls}` 行 → { classes, content }（便于单测） */
export function parseAttrLine(content) {
  if (typeof content !== 'string') return null;
  const match = content.match(ATTR_TRAILING_RE);
  if (!match) return null;
  return {
    classes: splitAttrClasses(match[1]),
    content: content.slice(0, content.length - match[0].length)
  };
}

function splitAttrClasses(group) {
  return String(group).split(/\s+/).map((cls) => cls.replace(/^\./, '')).filter(Boolean);
}

function findMatchingOpen(tokens, closeIndex) {
  const closeType = tokens[closeIndex]?.type || '';
  const openType = closeType.replace(/_close$/, '_open');
  let depth = 1;
  for (let i = closeIndex - 1; i >= 0; i--) {
    const type = tokens[i]?.type;
    if (type === closeType) depth += 1;
    else if (type === openType) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function appendClasses(openToken, classes) {
  if (!openToken || classes.length === 0) return;
  const existing = openToken.attrGet('class');
  openToken.attrSet('class', existing ? `${existing} ${classes.join(' ')}` : classes.join(' '));
}

/**
 * markdown-it 插件：支持行尾 / 独立行 `{.ogzh-info}` 块级标记。
 * - 段落/引用：`内容\n{.cls}`（同一段落末尾行）
 * - 标题：标题行后紧邻的独立 `{.cls}` 行
 *
 * 注册在 core 'inline' 之前：直接改写块级 token 的文本内容，
 * 后续内联解析（token.children）自然基于剥离后的内容生成。
 */
export function registerAttrClasses(md) {
  md.core.ruler.before('inline', 'ogzh_attrs', (state) => {
    const tokens = state.tokens;

    // 第一遍：段落/引用内末尾行标记
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type !== 'inline') continue;
      const open = tokens[i - 1];
      if (open?.type !== 'paragraph_open') continue;
      const parsed = parseAttrLine(token.content);
      if (!parsed) continue;
      if (!parsed.content.trim()) continue; // 纯属性行留给第二遍
      appendClasses(open, parsed.classes);
      token.content = parsed.content;
    }

    // 第二遍：独立属性行（紧跟段落/标题/引用的下一个块）
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type !== 'inline') continue;
      if (tokens[i - 1]?.type !== 'paragraph_open' || tokens[i + 1]?.type !== 'paragraph_close') continue;
      const match = token.content.match(ATTR_ONLY_RE);
      if (!match) continue;

      const prev = tokens[i - 2];
      const prevType = prev?.type;
      let openIndex = -1;
      if (prevType === 'paragraph_close' || prevType === 'heading_close' || prevType === 'blockquote_close') {
        openIndex = findMatchingOpen(tokens, i - 2);
      }
      if (openIndex < 0) continue;

      appendClasses(tokens[openIndex], splitAttrClasses(match[1]));
      // 移除属性段落（paragraph_open, inline, paragraph_close）
      tokens.splice(i - 1, 3);
      i -= 3;
    }
  });
}

/* ================= Front Matter ================= */

/** 把 styleOverride 序列化为文档头部 front matter（JSON 单行，闭世界解析） */
export function serializeStyleFrontMatter(styleOverride) {
  const sv = normalizeStyleOverride(styleOverride);
  if (Object.keys(sv).length === 0) return '';
  const payload = {};
  if (sv.tokens) payload.tokens = sv.tokens;
  if (sv.params) payload.params = sv.params;
  if (sv.elements) payload.elements = sv.elements;
  return `---\nopengzh-style: true\nstyle: ${JSON.stringify(payload)}\n---\n`;
}

/**
 * 解析导入 MD 的 front matter。
 * @returns {{ content: string, styleOverride: Object|null }}
 */
export function parseStyleFrontMatter(content) {
  const text = String(content || '');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { content: text, styleOverride: null };

  const block = match[1];
  if (!/opengzh-style\s*:\s*true/i.test(block)) return { content: text, styleOverride: null };

  const styleLine = block.split('\n').find((line) => line.trim().startsWith('style:'));
  let styleOverride = null;
  if (styleLine) {
    try {
      const parsed = JSON.parse(styleLine.split('style:')[1].trim());
      styleOverride = normalizeStyleOverride({
        tokens: parsed.tokens,
        params: parsed.params,
        elements: parsed.elements
      });
    } catch (_error) {
      styleOverride = null;
    }
  }

  return { content: text.slice(match[0].length), styleOverride };
}
