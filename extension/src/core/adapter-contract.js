export const PLATFORM_IDS = Object.freeze(['weixin', 'zhihu', 'juejin', 'woshipm']);

export const PLATFORMS = Object.freeze({
  weixin: Object.freeze({ name: '微信公众号', loginUrl: 'https://mp.weixin.qq.com/' }),
  zhihu: Object.freeze({ name: '知乎', loginUrl: 'https://www.zhihu.com/signin' }),
  juejin: Object.freeze({ name: '掘金', loginUrl: 'https://juejin.cn/login' }),
  woshipm: Object.freeze({ name: '人人都是产品经理', loginUrl: 'https://www.woshipm.com/login.html' }),
});

export function assertAdapter(adapter) {
  if (!PLATFORM_IDS.includes(adapter?.id)) throw new TypeError('未知平台适配器');
  for (const method of ['checkAuth', 'uploadImage', 'saveDraft']) {
    if (typeof adapter[method] !== 'function') throw new TypeError(`${adapter.id}.${method} 必须是函数`);
  }
  return adapter;
}

export function articleContentForPlatform(article, platformId) {
  if (platformId === 'weixin') return article.wechatHtml;
  if (platformId === 'juejin') return article.portableMarkdown;
  return article.semanticHtml;
}

function findTagEnd(source, start) {
  let quote = null;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index + 1;
    }
  }
  return source.length;
}

function readAttribute(source, start, end) {
  let cursor = start;
  while (cursor < end) {
    while (cursor < end && /\s/.test(source[cursor])) cursor += 1;
    if (cursor >= end || source[cursor] === '>' || source[cursor] === '/') break;
    const nameStart = cursor;
    while (cursor < end && !/[\s=/>]/.test(source[cursor])) cursor += 1;
    const name = source.slice(nameStart, cursor).toLowerCase();
    while (cursor < end && /\s/.test(source[cursor])) cursor += 1;
    if (source[cursor] !== '=') {
      while (cursor < end && !/[\s>]/.test(source[cursor])) cursor += 1;
      continue;
    }
    cursor += 1;
    while (cursor < end && /\s/.test(source[cursor])) cursor += 1;
    const valueStart = cursor;
    let valueEnd = cursor;
    if (source[cursor] === '"' || source[cursor] === "'") {
      const quote = source[cursor];
      cursor += 1;
      const contentStart = cursor;
      while (cursor < end && source[cursor] !== quote) cursor += 1;
      valueEnd = cursor;
      if (name === 'src') return { value: source.slice(contentStart, valueEnd), start: contentStart, end: valueEnd };
      cursor += 1;
      continue;
    }
    while (cursor < end && !/[\s>]/.test(source[cursor])) cursor += 1;
    valueEnd = cursor;
    if (name === 'src') return { value: source.slice(valueStart, valueEnd), start: valueStart, end: valueEnd };
  }
  return null;
}

function findBalanced(source, start, opening, closing) {
  let depth = 1;
  for (let index = start + 1; index < source.length; index += 1) {
    if (source[index] === '\\') {
      index += 1;
      continue;
    }
    if (source[index] === opening) depth += 1;
    if (source[index] === closing && --depth === 0) return index;
  }
  return -1;
}

function findFenceEnd(source, openerEnd, marker, length) {
  let cursor = source.indexOf('\n', openerEnd);
  if (cursor < 0) return source.length;
  cursor += 1;
  const close = new RegExp(`^ {0,3}${marker}{${length},}[ \\t]*$`);
  while (cursor <= source.length) {
    const lineEnd = source.indexOf('\n', cursor);
    const end = lineEnd < 0 ? source.length : lineEnd;
    const line = source.slice(cursor, end).replace(/\r$/, '');
    if (close.test(line)) return lineEnd < 0 ? end : lineEnd + 1;
    if (lineEnd < 0) break;
    cursor = lineEnd + 1;
  }
  return source.length;
}

function findInlineCodeClose(source, start, length) {
  for (let index = start; index < source.length;) {
    if (source[index] !== '`') {
      index += 1;
      continue;
    }
    let run = 1;
    while (source[index + run] === '`') run += 1;
    if (run === length) return index;
    index += run;
  }
  return -1;
}

function protectedRanges(source) {
  const ranges = [];
  const add = (start, end) => ranges.push({ start, end: Math.max(end, start + 1) });
  for (let index = 0; index < source.length;) {
    if (source.startsWith('<!--', index)) {
      const end = source.indexOf('-->', index + 4);
      add(index, end < 0 ? source.length : end + 3);
      index = end < 0 ? source.length : end + 3;
      continue;
    }
    const lineStart = index === 0 || source[index - 1] === '\n';
    if (lineStart) {
      const fence = source.slice(index).match(/^ {0,3}(`{3,}|~{3,})/);
      if (fence) {
        const marker = fence[1][0];
        const length = fence[1].length;
        const lineEnd = source.indexOf('\n', index + fence[0].length);
        const info = source.slice(index + fence[0].length, lineEnd < 0 ? source.length : lineEnd);
        if (marker !== '`' || !info.includes('`')) {
          const end = findFenceEnd(source, index + fence[0].length, marker, length);
          add(index, end);
          index = end;
          continue;
        }
        index += length;
        continue;
      }
      const indented = source.slice(index).match(/^(?: {4}|\t)[^\n]*(?:\n|$)/);
      if (indented) {
        add(index, index + indented[0].length);
        index += indented[0].length;
        continue;
      }
    }
    if (source[index] === '`') {
      let run = 1;
      while (source[index + run] === '`') run += 1;
      const close = findInlineCodeClose(source, index + run, run);
      if (close >= 0) {
        add(index, close + run);
        index = close + run;
      } else {
        index += run;
      }
      continue;
    }
    index += 1;
  }
  return ranges.sort((left, right) => left.start - right.start);
}

function isPotentialHtmlTag(source, index) {
  const remainder = source.slice(index);
  return source.startsWith('<!--', index)
    || /^<\/?[A-Za-z][\w:-]*(?:[\s/>]|$)/.test(remainder)
    || /^<![A-Za-z]/.test(remainder)
    || /^<\?/.test(remainder);
}

function isEscaped(source, index) {
  let slashes = 0;
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor -= 1) slashes += 1;
  return slashes % 2 === 1;
}

function rangeAt(ranges, index) {
  // ponytail: this O(n*ranges) scan is bounded by the small article snapshot; use a cursor or interval index if very large documents become a supported input.
  return ranges.find((range) => index >= range.start && index < range.end);
}

function markdownDestination(source, start) {
  let cursor = start;
  while (/\s/.test(source[cursor] || '')) cursor += 1;
  if (source[cursor] === '<') {
    const end = source.indexOf('>', cursor + 1);
    return end < 0 ? null : { value: source.slice(cursor + 1, end), start: cursor + 1, end };
  }
  const valueStart = cursor;
  let parentheses = 0;
  while (cursor < source.length) {
    const character = source[cursor];
    if (character === '\\') {
      cursor += 2;
      continue;
    }
    if (character === '(') parentheses += 1;
    if (character === ')' && parentheses === 0) break;
    if (/\s/.test(character) && parentheses === 0) break;
    if (character === ')') parentheses -= 1;
    cursor += 1;
  }
  return cursor > valueStart ? { value: source.slice(valueStart, cursor), start: valueStart, end: cursor } : null;
}

function normalizeLabel(label) {
  return String(label || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function imageReferencesInContent(content, markdown = false) {
  const source = String(content || '');
  const ranges = protectedRanges(source);
  const spans = [];
  const referenceLabels = new Set();
  const referenceUsages = [];
  const add = (destination, kind = 'markdown') => {
    if (destination?.value) spans.push({ ...destination, kind });
  };

  for (let index = 0; index < source.length;) {
    const protectedRange = rangeAt(ranges, index);
    if (protectedRange) {
      index = protectedRange.end;
      continue;
    }
    if (source[index] === '<' && isPotentialHtmlTag(source, index)) {
      const end = findTagEnd(source, index);
      if (/^<img\b/i.test(source.slice(index, end))) add(readAttribute(source, index + 4, end - 1), 'html');
      index = end;
      continue;
    }
    if (!markdown || source[index] !== '!' || isEscaped(source, index) || source[index + 1] !== '[') {
      index += 1;
      continue;
    }
    const altEnd = findBalanced(source, index + 1, '[', ']');
    if (altEnd < 0) {
      index += 1;
      continue;
    }
    const cursor = altEnd + 1;
    if (source[cursor] === '(') {
      add(markdownDestination(source, cursor + 1), 'markdown');
      index = cursor + 1;
      continue;
    }
    if (source[cursor] === '[') {
      const labelEnd = findBalanced(source, cursor, '[', ']');
      if (labelEnd >= 0) {
        const label = normalizeLabel(source.slice(cursor + 1, labelEnd)) || normalizeLabel(source.slice(index + 2, altEnd));
        referenceLabels.add(label);
        referenceUsages.push({ label, start: index });
        index = labelEnd + 1;
        continue;
      }
    }
    const label = normalizeLabel(source.slice(index + 2, altEnd));
    referenceLabels.add(label);
    referenceUsages.push({ label, start: index });
    index = altEnd + 1;
  }

  if (markdown && referenceLabels.size) {
    const resolvedLabels = new Set();
    const definition = /^[ \t]{0,3}\[([^\]\r\n]+)\]:[ \t]*(?:<([^>\r\n]+)>|([^\s\r\n]+))/gm;
    for (const match of source.matchAll(definition)) {
      if (!referenceLabels.has(normalizeLabel(match[1])) || rangeAt(ranges, match.index)) continue;
      resolvedLabels.add(normalizeLabel(match[1]));
      const value = match[2] ?? match[3];
      const lineStart = match.index + match[0].indexOf(value);
      add({ value, start: lineStart, end: lineStart + value.length }, 'markdown');
    }
    for (const usage of referenceUsages) {
      if (!resolvedLabels.has(usage.label)) spans.push({ value: '', start: usage.start, end: usage.start, kind: 'markdown' });
    }
  }
  return spans;
}

export function applyImageMap(content, imageMap, options = {}) {
  const source = String(content || '');
  const mapping = imageMap instanceof Map ? imageMap : new Map(Object.entries(imageMap || {}));
  // Juejin's portable Markdown may contain inline HTML; its adapter must pass { markdown: true }.
  const markdown = options?.markdown ?? !/<[a-z]/i.test(source);
  const replacements = imageReferencesInContent(source, markdown)
    .filter(({ kind }) => markdown || kind === 'html')
    .filter(({ value }) => mapping.has(value))
    .sort((left, right) => right.start - left.start);
  let output = source;
  for (const replacement of replacements) {
    output = `${output.slice(0, replacement.start)}${mapping.get(replacement.value)}${output.slice(replacement.end)}`;
  }
  return output;
}
