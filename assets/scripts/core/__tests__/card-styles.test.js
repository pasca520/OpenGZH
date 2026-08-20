import { describe, expect, it } from 'vitest';
import { STYLES } from '../../../styles/themes/index.js';
import * as cardStyles from '../card-styles.js';
import {
  CARD_STYLES,
  applyCardEdit,
  buildCardPresentation,
  buildCardSnippet,
  contrastRatio,
  findCardAtSelection,
  getCardStyle,
  inspectCardTarget,
  parseCardFence,
  removeCardEdit,
  renderCardPreviewHtml,
  replaceCardStyleEdit,
  resolveCardTokens,
  scanCardRanges
} from '../card-styles.js';

class FakeStyle {
  constructor() {
    this.declarations = new Map();
  }

  get cssText() {
    return Array.from(this.declarations, ([property, { value, priority }]) =>
      `${property}: ${value}${priority ? ` !${priority}` : ''};`
    ).join(' ');
  }

  set cssText(styleText) {
    this.declarations.clear();
    String(styleText || '').split(';').forEach((declaration) => {
      const colon = declaration.indexOf(':');
      if (colon < 1) return;
      const property = declaration.slice(0, colon).trim().toLowerCase();
      const rawValue = declaration.slice(colon + 1).trim();
      const important = /\s*!important\s*$/i.test(rawValue);
      const value = rawValue.replace(/\s*!important\s*$/i, '');
      this.setProperty(property, value, important ? 'important' : '');
    });
  }

  setProperty(property, value, priority = '') {
    this.declarations.set(String(property).toLowerCase(), {
      value: String(value),
      priority: String(priority).toLowerCase()
    });
  }

  removeProperty(property) {
    this.declarations.delete(String(property).toLowerCase());
  }

  getPropertyValue(property) {
    return this.declarations.get(String(property).toLowerCase())?.value || '';
  }

  getPropertyPriority(property) {
    return this.declarations.get(String(property).toLowerCase())?.priority || '';
  }
}

class FakeText {
  constructor(value) {
    this.nodeType = 3;
    this.nodeValue = String(value);
    this.parentNode = null;
  }

  get textContent() {
    return this.nodeValue;
  }

  set textContent(value) {
    this.nodeValue = String(value);
  }

  remove() {
    this.parentNode?.removeChild(this);
  }
}

class FakeElement {
  constructor(tagName) {
    this.nodeType = 1;
    this.tagName = String(tagName).toUpperCase();
    this.attributes = new Map();
    this.childNodes = [];
    this.parentNode = null;
    this.style = new FakeStyle();
  }

  get children() {
    return this.childNodes.filter(({ nodeType }) => nodeType === 1);
  }

  setAttribute(name, value) {
    const normalizedName = String(name).toLowerCase();
    if (normalizedName === 'style') {
      this.style.cssText = value;
      return;
    }
    this.attributes.set(normalizedName, String(value));
  }

  getAttribute(name) {
    const normalizedName = String(name).toLowerCase();
    if (normalizedName === 'style') return this.style.cssText || null;
    return this.attributes.get(normalizedName) ?? null;
  }

  hasAttribute(name) {
    const normalizedName = String(name).toLowerCase();
    return normalizedName === 'style'
      ? Boolean(this.style.cssText)
      : this.attributes.has(normalizedName);
  }

  removeAttribute(name) {
    const normalizedName = String(name).toLowerCase();
    if (normalizedName === 'style') {
      this.style.cssText = '';
      return;
    }
    this.attributes.delete(normalizedName);
  }

  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  insertBefore(child, reference) {
    if (child.parentNode) child.parentNode.removeChild(child);
    const index = this.childNodes.indexOf(reference);
    if (index === -1) return this.appendChild(child);
    child.parentNode = this;
    this.childNodes.splice(index, 0, child);
    return child;
  }

  removeChild(child) {
    const index = this.childNodes.indexOf(child);
    if (index !== -1) {
      this.childNodes.splice(index, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    this.parentNode?.removeChild(this);
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  get textContent() {
    return this.childNodes.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    this.childNodes.forEach((child) => {
      child.parentNode = null;
    });
    this.childNodes = [];
    if (String(value)) this.appendChild(new FakeText(value));
  }
}

class FakeDocument {
  constructor() {
    this.body = this.createElement('body');
  }

  createElement(tagName) {
    return new FakeElement(tagName);
  }

  createTextNode(value) {
    return new FakeText(value);
  }

  querySelectorAll(selector) {
    if (selector !== 'section[data-ogzh-card]') {
      throw new Error(`Unsupported fake selector: ${selector}`);
    }
    const matches = [];
    const visit = (element) => {
      if (element.tagName === 'SECTION' && element.hasAttribute('data-ogzh-card')) {
        matches.push(element);
      }
      element.children.forEach(visit);
    };
    visit(this.body);
    return matches;
  }
}

function appendElement(doc, parent, tagName, text = '') {
  const element = doc.createElement(tagName);
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function createCard(doc, styleId, children = []) {
  const section = doc.createElement('section');
  section.setAttribute('data-ogzh-card', styleId);
  children.forEach((child) => section.appendChild(child));
  doc.body.appendChild(section);
  return section;
}

function decorations(section, kind) {
  return section.children.filter((child) => (
    child.hasAttribute('data-ogzh-card-decoration') &&
    (!kind || child.getAttribute('data-ogzh-card-decoration') === kind)
  ));
}

function applyCardStyles(...args) {
  return cardStyles.applyCardStyles(...args);
}

describe('card directive parsing', () => {
  it('parses a known directive and preserves inner markdown', () => {
    expect(parseCardFence(':::ogzh-card accent-bar\n正文 **重点**\n:::', 0)).toEqual({
      styleId: 'accent-bar',
      known: true,
      content: '正文 **重点**',
      startLine: 0,
      closingLine: 2
    });
  });

  it('keeps an unknown directive body but does not mark the id as known', () => {
    expect(parseCardFence('前文\n:::ogzh-card future-card\n正文\n:::', 1)).toEqual({
      styleId: 'future-card',
      known: false,
      content: '正文',
      startLine: 1,
      closingLine: 3
    });
  });

  it('preserves CRLF bytes inside a directive', () => {
    expect(
      parseCardFence(':::ogzh-card soft-fill\r\n第一行\r\n\r\n第二行\r\n:::', 0)
    ).toMatchObject({
      content: '第一行\r\n\r\n第二行',
      closingLine: 4
    });
  });

  it('refuses non-openers, unclosed directives, and nested directives', () => {
    expect(parseCardFence('前文\n:::ogzh-card accent-bar\n正文\n:::', 0)).toBeNull();
    expect(parseCardFence(':::ogzh-card accent-bar\n正文', 0)).toBeNull();
    const nested =
      ':::ogzh-card accent-bar\n:::ogzh-card soft-fill\n正文\n:::\n:::';
    expect(parseCardFence(nested, 0)).toBeNull();
    expect(parseCardFence(nested, 1)).toBeNull();
  });

  it('keeps adjacent non-nested directives valid', () => {
    const adjacent =
      ':::ogzh-card accent-bar\n卡片一\n:::\n:::ogzh-card soft-fill\n卡片二\n:::';

    expect(parseCardFence(adjacent, 0)).toMatchObject({
      styleId: 'accent-bar',
      content: '卡片一',
      closingLine: 2
    });
    expect(parseCardFence(adjacent, 3)).toMatchObject({
      styleId: 'soft-fill',
      content: '卡片二',
      closingLine: 5
    });
  });
});

describe('card edit public API', () => {
  it('exports selection inspection and unified edit entry points', () => {
    expect(cardStyles.inspectCardTarget).toBeTypeOf('function');
    expect(cardStyles.applyCardEdit).toBeTypeOf('function');
  });
});

describe('new card target validation', () => {
  const source = '前文\n\n第一段 **重点** 和 [链接](https://example.com) `代码`。\n\n- A\n- B\n\n后文';
  const tokens = [
    { type: 'paragraph_open', level: 0, map: [0, 1] },
    { type: 'inline', level: 1, map: [0, 1], children: [{ type: 'text' }] },
    { type: 'paragraph_close', level: 0 },
    { type: 'paragraph_open', level: 0, map: [2, 3] },
    {
      type: 'inline',
      level: 1,
      map: [2, 3],
      children: [
        { type: 'text' },
        { type: 'strong_open' },
        { type: 'text' },
        { type: 'strong_close' },
        { type: 'link_open' },
        { type: 'text' },
        { type: 'link_close' },
        { type: 'code_inline' }
      ]
    },
    { type: 'paragraph_close', level: 0 },
    { type: 'bullet_list_open', level: 0, map: [4, 6] },
    { type: 'list_item_open', level: 1, map: [4, 5] },
    { type: 'paragraph_open', level: 2, map: [4, 5] },
    { type: 'inline', level: 3, map: [4, 5], children: [{ type: 'text' }] },
    { type: 'paragraph_close', level: 2 },
    { type: 'list_item_close', level: 1 },
    { type: 'list_item_open', level: 1, map: [5, 6] },
    { type: 'paragraph_open', level: 2, map: [5, 6] },
    { type: 'inline', level: 3, map: [5, 6], children: [{ type: 'text' }] },
    { type: 'paragraph_close', level: 2 },
    { type: 'list_item_close', level: 1 },
    { type: 'bullet_list_close', level: 0 },
    { type: 'paragraph_open', level: 0, map: [7, 8] },
    { type: 'inline', level: 1, map: [7, 8], children: [{ type: 'text' }] },
    { type: 'paragraph_close', level: 0 }
  ];

  it('expands a partial inline-Markdown selection to the complete top-level paragraph', () => {
    const selectionStart = source.indexOf('重点');
    const target = inspectCardTarget(
      source,
      selectionStart,
      selectionStart + '重点'.length,
      tokens
    );

    expect(target).toMatchObject({ ok: true });
    expect(source.slice(target.start, target.end)).toBe(
      '第一段 **重点** 和 [链接](https://example.com) `代码`。'
    );
  });

  it('expands a selection touching two list items and retains their source markers', () => {
    const selectionStart = source.indexOf('A');
    const selectionEnd = source.indexOf('B') + 1;
    const target = inspectCardTarget(source, selectionStart, selectionEnd, tokens);

    expect(target).toMatchObject({ ok: true });
    expect(source.slice(target.start, target.end)).toBe('- A\n- B');
  });

  it.each([
    ['unordered LF', '- A\n\n- B', 'bullet_list_open', '- A'],
    ['ordered LF', '1. A\n\n2. B', 'ordered_list_open', '1. A'],
    ['unordered CRLF', '- A\r\n\r\n- B', 'bullet_list_open', '- A'],
    ['ordered CRLF', '1. A\r\n\r\n2. B', 'ordered_list_open', '1. A']
  ])('excludes trailing separator lines from a loose %s item map', (_, looseSource, listType, expected) => {
    const secondItemLine = 2;
    const looseTokens = [
      { type: listType, level: 0, map: [0, 3] },
      { type: 'list_item_open', level: 1, map: [0, 2] },
      { type: 'paragraph_open', level: 2, map: [0, 1] },
      { type: 'inline', level: 3, map: [0, 1], children: [{ type: 'text' }] },
      { type: 'paragraph_close', level: 2 },
      { type: 'list_item_close', level: 1 },
      { type: 'list_item_open', level: 1, map: [secondItemLine, 3] },
      { type: 'list_item_close', level: 1 },
      { type: listType.replace('_open', '_close'), level: 0 }
    ];
    const selectionStart = looseSource.indexOf('A');
    const target = inspectCardTarget(
      looseSource,
      selectionStart,
      selectionStart + 1,
      looseTokens
    );

    expect(target).toMatchObject({ ok: true });
    expect(looseSource.slice(target.start, target.end)).toBe(expected);
  });

  it.each([
    ['LF', '- A\n\n- B'],
    ['CRLF', '- A\r\n\r\n- B']
  ])('rejects a selection containing only the %s loose-list separator', (_, looseSource) => {
    const firstSeparatorStart = looseSource.indexOf('\n') - (looseSource.includes('\r\n') ? 1 : 0);
    const secondItemStart = looseSource.lastIndexOf('- B');
    const result = inspectCardTarget(
      looseSource,
      firstSeparatorStart,
      secondItemStart,
      [
        { type: 'bullet_list_open', level: 0, map: [0, 3] },
        { type: 'list_item_open', level: 1, map: [0, 2] },
        { type: 'list_item_close', level: 1 },
        { type: 'list_item_open', level: 1, map: [2, 3] },
        { type: 'list_item_close', level: 1 },
        { type: 'bullet_list_close', level: 0 }
      ]
    );

    expect(result).toMatchObject({ ok: false });
    expect(result.reason).toContain('段落或列表项');
  });

  it('maps CRLF token lines to exact character offsets without taking separator lines', () => {
    const crlfSource = '前文\r\n\r\n第二段 **重点**\r\n\r\n后文';
    const crlfTokens = [
      { type: 'paragraph_open', level: 0, map: [0, 1] },
      { type: 'inline', level: 1, map: [0, 1], children: [{ type: 'text' }] },
      { type: 'paragraph_close', level: 0 },
      { type: 'paragraph_open', level: 0, map: [2, 3] },
      { type: 'inline', level: 1, map: [2, 3], children: [{ type: 'strong_open' }] },
      { type: 'paragraph_close', level: 0 },
      { type: 'paragraph_open', level: 0, map: [4, 5] },
      { type: 'inline', level: 1, map: [4, 5], children: [{ type: 'text' }] },
      { type: 'paragraph_close', level: 0 }
    ];
    const selectionStart = crlfSource.indexOf('重点');
    const target = inspectCardTarget(
      crlfSource,
      selectionStart,
      selectionStart + '重点'.length,
      crlfTokens
    );

    expect(crlfSource.slice(target.start, target.end)).toBe('第二段 **重点**');
    expect(crlfSource.slice(target.end, target.end + 4)).toBe('\r\n\r\n');
  });

  it.each([
    ['heading_open', '标题'],
    ['image', '图片'],
    ['table_open', '表格'],
    ['fence', '代码块'],
    ['code_block', '代码块'],
    ['blockquote_open', '引用块'],
    ['html_block', '原始 HTML'],
    ['math_block', '公式块'],
    ['hr', '分割线']
  ])('rejects covered %s tokens with a specific %s reason', (type, label) => {
    const invalidSource = type === 'heading_open' ? '## 内容' : '内容';
    const result = inspectCardTarget(
      invalidSource,
      0,
      invalidSource.length,
      [{ type, level: 0, map: [0, 1] }]
    );

    expect(result).toMatchObject({ ok: false });
    expect(result.reason).toContain(label);
  });

  it.each([
    ['image', '图片'],
    ['html_inline', '原始 HTML']
  ])('rejects %s found in inline children with a specific reason', (childType, label) => {
    const inlineSource = '普通文字与危险内容';
    const result = inspectCardTarget(inlineSource, 0, inlineSource.length, [
      { type: 'paragraph_open', level: 0, map: [0, 1] },
      {
        type: 'inline',
        level: 1,
        map: [0, 1],
        children: [{ type: 'text' }, { type: childType }]
      },
      { type: 'paragraph_close', level: 0 }
    ]);

    expect(result).toMatchObject({ ok: false });
    expect(result.reason).toContain(label);
  });

  it('rejects a mapped root that is not a supported paragraph or list item', () => {
    const result = inspectCardTarget('自定义块', 0, '自定义块'.length, [
      { type: 'custom_block_open', level: 0, map: [0, 1] }
    ]);

    expect(result).toMatchObject({ ok: false });
    expect(result.reason).toContain('段落或列表项');
  });

  it('rejects a selection crossing an existing card boundary', () => {
    const cardSource = '前文\n:::ogzh-card accent-bar\n正文\n:::\n后文';
    const result = inspectCardTarget(
      cardSource,
      cardSource.indexOf('前文'),
      cardSource.indexOf('正文') + '正文'.length,
      []
    );

    expect(result).toMatchObject({ ok: false });
    expect(result.reason).toContain('缩小选区');
    expect(result.reason).toContain('移除卡片');
  });

  it('leaves markdown, selection, and kind unchanged when validation fails', () => {
    const invalidSource = '## 标题';
    const selectionStart = invalidSource.indexOf('标题');
    const selectionEnd = invalidSource.length;
    const result = applyCardEdit(
      invalidSource,
      selectionStart,
      selectionEnd,
      'accent-bar',
      [{ type: 'heading_open', level: 0, map: [0, 1] }]
    );

    expect(result).toEqual({
      ok: false,
      markdown: invalidSource,
      selectionStart,
      selectionEnd,
      kind: 'unchanged',
      reason: expect.stringContaining('标题')
    });
  });
});

describe('unified card edits', () => {
  function paragraphTokens(line, children = [{ type: 'text' }]) {
    return [
      { type: 'paragraph_open', level: 0, map: [line, line + 1] },
      { type: 'inline', level: 1, map: [line, line + 1], children },
      { type: 'paragraph_close', level: 0 }
    ];
  }

  it.each([
    ['negative start', 'abc', -1, -1, '选区偏移无效'],
    ['negative end', 'abc', 0, -1, '选区偏移无效'],
    ['start beyond source', 'abc', 4, 4, '选区偏移无效'],
    ['end beyond source', 'abc', 0, 4, '选区偏移无效'],
    ['non-integer start', 'abc', 1.5, 2, '选区偏移无效'],
    ['non-integer end', 'abc', 0, 1.5, '选区偏移无效'],
    ['reversed range', 'abc', 2, 1, '选区偏移无效'],
    ['CRLF midpoint', 'a\r\nb', 2, 2, 'CRLF']
  ])('rejects %s selection offsets without editing', (_, source, selectionStart, selectionEnd, reasonPart) => {
    const result = applyCardEdit(
      source,
      selectionStart,
      selectionEnd,
      'accent-bar',
      []
    );

    expect(result).toEqual({
      ok: false,
      markdown: source,
      selectionStart,
      selectionEnd,
      kind: 'unchanged',
      reason: expect.stringContaining(reasonPart)
    });
  });

  it.each([
    ['out-of-range offsets', 'abc', -1, 2, '选区偏移无效'],
    ['a CRLF midpoint endpoint', 'a\r\nb', 0, 2, 'CRLF']
  ])('keeps inspectCardTarget consistent for %s', (_, source, selectionStart, selectionEnd, reasonPart) => {
    const result = inspectCardTarget(source, selectionStart, selectionEnd, []);

    expect(result).toMatchObject({
      ok: false,
      reason: expect.stringContaining(reasonPart)
    });
  });

  it('validates the style whitelist before inspecting or editing any target', () => {
    const source = ':::ogzh-card accent-bar\n#### 卡内标题\n\n正文\n:::';
    const cursor = source.indexOf('正文');

    expect(applyCardEdit(source, cursor, cursor, 'future-card', [])).toEqual({
      ok: false,
      markdown: source,
      selectionStart: cursor,
      selectionEnd: cursor,
      kind: 'unchanged',
      reason: 'unknown-style'
    });
  });

  it('changes a card selected at its inner h4 without validating or nesting it', () => {
    const source = ':::ogzh-card capsule-title\n#### 原标题\n\n正文\n:::';
    const selectionStart = source.indexOf('原标题');
    const selectionEnd = selectionStart + '原标题'.length;
    const result = applyCardEdit(
      source,
      selectionStart,
      selectionEnd,
      'soft-fill',
      [{ type: 'heading_open', level: 0, map: [1, 2] }]
    );

    expect(result).toMatchObject({ ok: true, kind: 'replace' });
    expect(result.markdown).toBe(':::ogzh-card soft-fill\n#### 原标题\n\n正文\n:::');
    expect(result.markdown.match(/:::ogzh-card/g)).toHaveLength(1);
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe('原标题');
  });

  it('inserts a body card at an empty document cursor and focuses its placeholder', () => {
    const result = applyCardEdit('', 0, 0, 'accent-bar', []);

    expect(result).toMatchObject({ ok: true, kind: 'insert' });
    expect(result.markdown).toBe(
      ':::ogzh-card accent-bar\n在这里输入卡片内容\n:::'
    );
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe(
      '在这里输入卡片内容'
    );
  });

  it('inserts a title-body card directly and focuses only its title placeholder', () => {
    const source = '前文\n\n后文';
    const cursor = source.indexOf('后文');
    const result = applyCardEdit(source, cursor, cursor, 'numbered-conclusion', []);

    expect(result).toMatchObject({ ok: true, kind: 'insert' });
    expect(result.markdown).toBe(
      '前文\n\n:::ogzh-card numbered-conclusion\n#### 01 阶段结论\n\n在这里输入卡片内容\n:::\n后文'
    );
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe(
      '01 阶段结论'
    );
  });

  it('keeps both sides byte-for-byte and adds only required LF boundaries in a line', () => {
    const source = '左侧文字右侧文字';
    const cursor = source.indexOf('右侧');
    const result = applyCardEdit(source, cursor, cursor, 'soft-fill', []);

    expect(result.markdown).toBe(
      '左侧文字\n:::ogzh-card soft-fill\n在这里输入卡片内容\n:::\n右侧文字'
    );
    expect(result.markdown.startsWith(source.slice(0, cursor))).toBe(true);
    expect(result.markdown.endsWith(source.slice(cursor))).toBe(true);
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe(
      '在这里输入卡片内容'
    );
  });

  it('adds only required CRLF boundaries and keeps the inserted focus exact', () => {
    const source = '左侧右侧\r\n后文';
    const cursor = source.indexOf('右侧');
    const result = applyCardEdit(source, cursor, cursor, 'accent-bar', []);

    expect(result.markdown).toBe(
      '左侧\r\n:::ogzh-card accent-bar\r\n在这里输入卡片内容\r\n:::\r\n右侧\r\n后文'
    );
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe(
      '在这里输入卡片内容'
    );
  });

  it('does not add line endings at document edges that are already line boundaries', () => {
    const atStart = applyCardEdit('\n后文', 0, 0, 'accent-bar', []);
    const atEndSource = '前文\n';
    const atEnd = applyCardEdit(
      atEndSource,
      atEndSource.length,
      atEndSource.length,
      'accent-bar',
      []
    );

    expect(atStart.markdown).toBe(
      ':::ogzh-card accent-bar\n在这里输入卡片内容\n:::\n后文'
    );
    expect(atEnd.markdown).toBe(
      '前文\n:::ogzh-card accent-bar\n在这里输入卡片内容\n:::'
    );
  });

  it('wraps the complete mapped paragraph in a body card and selects only its body', () => {
    const source = '前文\n\n第一段 **重点**。\n\n后文';
    const selectionStart = source.indexOf('重点');
    const selectionEnd = selectionStart + '重点'.length;
    const result = applyCardEdit(
      source,
      selectionStart,
      selectionEnd,
      'accent-bar',
      paragraphTokens(2, [{ type: 'strong_open' }, { type: 'text' }])
    );

    expect(result).toMatchObject({ ok: true, kind: 'wrap' });
    expect(result.markdown).toBe(
      '前文\n\n:::ogzh-card accent-bar\n第一段 **重点**。\n:::\n\n后文'
    );
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe(
      '第一段 **重点**。'
    );
  });

  it('wraps the complete mapped paragraph in a title-body card and selects only its title', () => {
    const source = '前文\n\n目标段落\n\n后文';
    const selectionStart = source.indexOf('标段');
    const result = applyCardEdit(
      source,
      selectionStart,
      selectionStart + '标段'.length,
      'capsule-title',
      paragraphTokens(2)
    );

    expect(result).toMatchObject({ ok: true, kind: 'wrap' });
    expect(result.markdown).toBe(
      '前文\n\n:::ogzh-card capsule-title\n#### 核心观点\n\n目标段落\n:::\n\n后文'
    );
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe('核心观点');
  });

  it('preserves CRLF bytes while wrapping and maps focus to the exact body', () => {
    const source = '前文\r\n\r\nCRLF 正文\r\n\r\n后文';
    const selectionStart = source.indexOf('正文');
    const result = applyCardEdit(
      source,
      selectionStart,
      selectionStart + '正文'.length,
      'minimal-outline',
      paragraphTokens(2)
    );

    expect(result.markdown).toBe(
      '前文\r\n\r\n:::ogzh-card minimal-outline\r\nCRLF 正文\r\n:::\r\n\r\n后文'
    );
    expect(result.markdown.replaceAll('\r\n', '')).not.toContain('\n');
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe(
      'CRLF 正文'
    );
  });

  it('rejects a selection spanning card content and outside text without changing bytes', () => {
    const source = '前文\n:::ogzh-card accent-bar\n卡内\n:::\n后文';
    const selectionStart = source.indexOf('卡内');
    const selectionEnd = source.length;
    const result = applyCardEdit(
      source,
      selectionStart,
      selectionEnd,
      'soft-fill',
      []
    );

    expect(result).toEqual({
      ok: false,
      markdown: source,
      selectionStart,
      selectionEnd,
      kind: 'unchanged',
      reason: expect.stringContaining('移除卡片')
    });
  });
});

describe('card style registry', () => {
  it('contains exactly the approved 7 body and 3 title-body cards', () => {
    expect(CARD_STYLES).toEqual([
      { id: 'accent-bar', name: '左线强调卡', slots: 'body', preview: '重点内容' },
      { id: 'minimal-outline', name: '极简框线卡', slots: 'body', preview: '清晰陈述' },
      { id: 'soft-fill', name: '柔和底色卡', slots: 'body', preview: '温和提示' },
      { id: 'quote-frame', name: '引号金句卡', slots: 'body', preview: '一句值得记住的话' },
      { id: 'top-rule', name: '顶线观点卡', slots: 'body', preview: '核心观点' },
      { id: 'double-frame', name: '双层框线卡', slots: 'body', preview: '重点信息' },
      { id: 'solid-contrast', name: '实色反差卡', slots: 'body', preview: '强提醒' },
      {
        id: 'capsule-title',
        name: '胶囊标题卡',
        slots: 'title-body',
        defaultTitle: '核心观点',
        preview: '标题与正文'
      },
      {
        id: 'label-title',
        name: '标签标题卡',
        slots: 'title-body',
        defaultTitle: '核心观点',
        preview: '标签与正文'
      },
      {
        id: 'numbered-conclusion',
        name: '编号结论卡',
        slots: 'title-body',
        defaultTitle: '01 阶段结论',
        preview: '01 阶段结论'
      }
    ]);
  });

  it('is frozen and has unique ids', () => {
    expect(Object.isFrozen(CARD_STYLES)).toBe(true);
    expect(new Set(CARD_STYLES.map((item) => item.id)).size).toBe(10);
  });

  it('freezes every registry entry', () => {
    expect(CARD_STYLES.every(Object.isFrozen)).toBe(true);
  });

  it('returns the registered style and rejects unknown ids', () => {
    expect(getCardStyle('accent-bar')).toBe(CARD_STYLES[0]);
    expect(getCardStyle('user-css')).toBeNull();
  });

  it('throws when building an unknown style', () => {
    expect(() => buildCardSnippet('user-css')).toThrow('Unknown card style: user-css');
  });

  it('builds a body snippet and focuses only its body placeholder', () => {
    const result = buildCardSnippet('accent-bar');

    expect(result.markdown).toBe(
      ':::ogzh-card accent-bar\n在这里输入卡片内容\n:::'
    );
    expect(result.markdown.slice(result.focusStart, result.focusEnd)).toBe(
      '在这里输入卡片内容'
    );
  });

  it('builds a title-body snippet and focuses only its title text', () => {
    const result = buildCardSnippet('numbered-conclusion');

    expect(result.markdown).toBe(
      ':::ogzh-card numbered-conclusion\n#### 01 阶段结论\n\n在这里输入卡片内容\n:::'
    );
    expect(result.markdown.slice(result.focusStart, result.focusEnd)).toBe(
      '01 阶段结论'
    );
    expect(result.markdown.slice(result.focusStart - 5, result.focusStart)).toBe('#### ');
  });

  it('preserves selected body bytes and keeps a title-body focus on the title', () => {
    const selected = '第一段 **重点**。\n\n- A\n- B';
    const result = buildCardSnippet('capsule-title', selected);

    expect(result.markdown).toBe(
      `:::ogzh-card capsule-title\n#### 核心观点\n\n${selected}\n:::`
    );
    expect(result.markdown.slice(result.focusStart, result.focusEnd)).toBe('核心观点');
  });

  it('focuses a selected body even when it matches text in the opener', () => {
    const selected = 'accent';
    const result = buildCardSnippet('accent-bar', selected);
    const bodyStart = result.markdown.indexOf('\n') + 1;

    expect(result.focusStart).toBe(bodyStart);
    expect(result.markdown.slice(result.focusStart, result.focusEnd)).toBe(selected);
  });
});

describe('card source edits', () => {
  it('scans an unknown complete card and finds a cursor in its exact content range', () => {
    const source = '前文\n:::ogzh-card future-card\n正文 **不改**\n:::\n后文';
    const openerStart = source.indexOf(':::ogzh-card');
    const openerEnd = source.indexOf('\n', openerStart);
    const contentStart = openerEnd + 1;
    const contentEnd = source.indexOf('\n:::', contentStart);
    const closerStart = contentEnd + 1;
    const closerEnd = closerStart + ':::'.length;

    expect(scanCardRanges(source)).toEqual([
      {
        styleId: 'future-card',
        start: openerStart,
        end: closerEnd,
        openerStart,
        openerEnd,
        contentStart,
        contentEnd,
        closerStart,
        closerEnd
      }
    ]);
    expect(source.slice(contentStart, contentEnd)).toBe('正文 **不改**');
    expect(findCardAtSelection(source, source.indexOf('**'), source.indexOf('**')))
      .toEqual(scanCardRanges(source)[0]);
  });

  it('does not scan an unclosed card', () => {
    expect(scanCardRanges(':::ogzh-card accent-bar\n正文')).toEqual([]);
  });

  it('rejects an outer card containing another opener without returning the nested card', () => {
    const source = [
      ':::ogzh-card accent-bar',
      '外层正文',
      ':::ogzh-card soft-fill',
      '内层正文',
      ':::',
      '外层结尾',
      ':::'
    ].join('\n');

    expect(scanCardRanges(source)).toEqual([]);
  });

  it('finds no card when a selection crosses text or another card boundary', () => {
    const source = [
      '前文',
      ':::ogzh-card accent-bar',
      '第一张',
      ':::',
      ':::ogzh-card soft-fill',
      '第二张',
      ':::',
      '后文'
    ].join('\n');
    const firstBody = source.indexOf('第一张');
    const secondBody = source.indexOf('第二张');

    expect(findCardAtSelection(source, 0, firstBody + 1)).toBeNull();
    expect(findCardAtSelection(source, firstBody, secondBody + 1)).toBeNull();
    expect(findCardAtSelection(source, secondBody, source.length)).toBeNull();
  });

  it('replaces only the opener id when changing between body cards', () => {
    const source = '前文\n:::ogzh-card accent-bar\n正文 **逐字保留**\n:::\n后文';
    const selectionStart = source.indexOf('正文');
    const result = replaceCardStyleEdit(
      source,
      selectionStart,
      selectionStart + '正文'.length,
      'soft-fill'
    );

    expect(result.ok).toBe(true);
    expect(result.kind).toBe('replace');
    expect(result.markdown).toBe(
      '前文\n:::ogzh-card soft-fill\n正文 **逐字保留**\n:::\n后文'
    );
    expect(result.markdown.match(/:::ogzh-card/g)).toHaveLength(1);
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe('正文');
  });

  it('replaces an unknown source id without matching text in the directive name', () => {
    const source = ':::ogzh-card card\n正文\n:::';
    const cursor = source.indexOf('正文');
    const result = replaceCardStyleEdit(source, cursor, cursor, 'accent-bar');

    expect(result.markdown).toBe(':::ogzh-card accent-bar\n正文\n:::');
  });

  it('inserts and focuses the default title when changing body to title-body', () => {
    const source = ':::ogzh-card accent-bar\n正文 **逐字保留**\n:::';
    const cursor = source.indexOf('正文');
    const result = replaceCardStyleEdit(
      source,
      cursor,
      cursor,
      'numbered-conclusion'
    );

    expect(result).toMatchObject({ ok: true, kind: 'replace' });
    expect(result.markdown).toBe(
      ':::ogzh-card numbered-conclusion\n#### 01 阶段结论\n\n正文 **逐字保留**\n:::'
    );
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe(
      '01 阶段结论'
    );
  });

  it('inserts and focuses the default title when changing an unknown card to title-body', () => {
    const source = ':::ogzh-card future-card\n正文 **逐字保留**\n:::';
    const cursor = source.indexOf('正文');
    const result = replaceCardStyleEdit(source, cursor, cursor, 'capsule-title');

    expect(result).toMatchObject({ ok: true, kind: 'replace' });
    expect(result.markdown).toBe(
      ':::ogzh-card capsule-title\n#### 核心观点\n\n正文 **逐字保留**\n:::'
    );
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe('核心观点');
  });

  it('does not duplicate an existing first H4 when changing an unknown card to title-body', () => {
    const source = ':::ogzh-card future-card\n\n#### 原标题\n\n正文\n:::';
    const cursor = source.indexOf('正文');
    const result = replaceCardStyleEdit(source, cursor, cursor, 'label-title');

    expect(result.markdown).toBe(
      ':::ogzh-card label-title\n\n#### 原标题\n\n正文\n:::'
    );
    expect(result.markdown.match(/^ {0,3}#### /gm)).toHaveLength(1);
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe('');
  });

  it('recognizes a three-space H4 after CRLF blank lines in an unknown card', () => {
    const source = ':::ogzh-card future-card\r\n \r\n   #### 原标题\r\n\r\n正文\r\n:::';
    const cursor = source.indexOf('正文');
    const result = replaceCardStyleEdit(source, cursor, cursor, 'capsule-title');

    expect(result.markdown).toBe(
      ':::ogzh-card capsule-title\r\n \r\n   #### 原标题\r\n\r\n正文\r\n:::'
    );
    expect(result.markdown.replaceAll('\r\n', '')).not.toContain('\n');
    expect(result.markdown.match(/^ {0,3}#### /gm)).toHaveLength(1);
  });

  it('uses CRLF for an inserted title when changing an unknown card to title-body', () => {
    const source = ':::ogzh-card future-card\r\n正文\r\n:::';
    const cursor = source.indexOf('正文');
    const result = replaceCardStyleEdit(source, cursor, cursor, 'label-title');

    expect(result.markdown).toBe(
      ':::ogzh-card label-title\r\n#### 核心观点\r\n\r\n正文\r\n:::'
    );
    expect(result.markdown.replaceAll('\r\n', '')).not.toContain('\n');
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe('核心观点');
  });

  it('does not duplicate an existing first H4 when changing a known body card to title-body', () => {
    const source = ':::ogzh-card accent-bar\n#### 原标题\n\n正文\n:::';
    const cursor = source.indexOf('正文');
    const result = replaceCardStyleEdit(source, cursor, cursor, 'capsule-title');

    expect(result.markdown).toBe(
      ':::ogzh-card capsule-title\n#### 原标题\n\n正文\n:::'
    );
    expect(result.markdown.match(/^ {0,3}#### /gm)).toHaveLength(1);
  });

  it('keeps the original title and body when changing title-body to body', () => {
    const source = ':::ogzh-card capsule-title\n#### 原标题\n\n正文 **逐字保留**\n:::';
    const cursor = source.indexOf('正文');
    const result = replaceCardStyleEdit(source, cursor, cursor, 'accent-bar');

    expect(result).toMatchObject({ ok: true, kind: 'replace' });
    expect(result.markdown).toBe(
      ':::ogzh-card accent-bar\n#### 原标题\n\n正文 **逐字保留**\n:::'
    );
  });

  it('removes only directive boundaries and selects the unwrapped content', () => {
    const source = '前文\n\n:::ogzh-card accent-bar\n正文 **不改**\n:::\n\n后文';
    const cursor = source.indexOf('正文');
    const result = removeCardEdit(source, cursor, cursor);

    expect(result).toMatchObject({ ok: true, kind: 'remove' });
    expect(result.markdown).toBe('前文\n\n正文 **不改**\n\n后文');
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe(
      '正文 **不改**'
    );
  });

  it('fails without changing source or selection for an unknown target id', () => {
    const source = ':::ogzh-card accent-bar\n正文\n:::';
    const selectionStart = source.indexOf('正文');
    const selectionEnd = selectionStart + '正文'.length;

    expect(
      replaceCardStyleEdit(source, selectionStart, selectionEnd, 'future-card')
    ).toEqual({
      ok: false,
      markdown: source,
      selectionStart,
      selectionEnd,
      kind: 'unchanged',
      reason: 'unknown-style'
    });
  });

  it('preserves CRLF line endings while replacing and inserting a title', () => {
    const source = '前文\r\n:::ogzh-card accent-bar\r\n正文\r\n:::\r\n后文';
    const cursor = source.indexOf('正文');
    const result = replaceCardStyleEdit(source, cursor, cursor, 'capsule-title');

    expect(result.markdown).toBe(
      '前文\r\n:::ogzh-card capsule-title\r\n#### 核心观点\r\n\r\n正文\r\n:::\r\n后文'
    );
    expect(result.markdown.replaceAll('\r\n', '')).not.toContain('\n');
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe('核心观点');
  });
});

describe('theme-aware card tokens', () => {
  const SAFE_COLOR = /^#[0-9a-f]{6}$/;

  it('prefers and normalizes every explicit gzh semantic token', () => {
    expect(resolveCardTokens({
      gzh: {
        accent: '#AbC',
        body: '#123456',
        muted: '#667788',
        line: '#DDEEFF',
        soft: '#f0f1f2',
        bg: '#010203'
      },
      styles: {
        h2: 'border-left: 4px solid #ffffff;',
        p: 'color: #ffffff;'
      }
    })).toEqual({
      accent: '#aabbcc',
      body: '#123456',
      muted: '#667788',
      line: '#ddeeff',
      soft: '#f0f1f2',
      surface: '#010203'
    });
  });

  it('derives semantic colors from relevant style declarations without gzh', () => {
    expect(resolveCardTokens({
      styles: {
        container: 'color: #243447; background-color: #fdfefe;',
        h2: 'color: #111111; border-left: 4px solid #1a73e8;',
        p: 'color: #345678 !important;',
        em: 'color: #657786;',
        blockquote: 'background: #eef4fb; color: #556677;',
        td: 'border-bottom: 1px solid #ccd6dd;',
        code: 'background-color: #edf2f7;'
      }
    })).toEqual({
      accent: '#1a73e8',
      body: '#345678',
      muted: '#657786',
      line: '#ccd6dd',
      soft: '#eef4fb',
      surface: '#fdfefe'
    });
  });

  it('uses the last repeated declaration because that is the effective CSS value', () => {
    expect(resolveCardTokens({
      styles: {
        blockquote: 'background-color: #fafafa; background-color: #e9f3fd;'
      }
    }).soft).toBe('#e9f3fd');
  });

  it('returns only safe non-empty colors when theme values are missing or malicious', () => {
    const tokens = resolveCardTokens({
      gzh: {
        accent: '#f00; position: fixed',
        body: 'url(javascript:alert(1))',
        muted: 'expression(alert(1))',
        line: 'var(--attacker)',
        soft: '<style>body{display:grid}</style>',
        bg: 'transparent; background:url(https://evil.invalid)'
      },
      styles: {
        h2: 'color: url(javascript:alert(1)); position: fixed;',
        container: 'background-image: url(https://evil.invalid);'
      }
    });

    expect(Object.values(tokens).every((value) => SAFE_COLOR.test(value))).toBe(true);
    expect(JSON.stringify(tokens)).not.toMatch(/position|javascript|expression|url|style/i);
  });

  it('accepts only complete hex tokens and safe border shorthand values', () => {
    expect(resolveCardTokens({
      gzh: {
        accent: 'rgb(18, 52, 86)',
        body: 'black',
        muted: 'rgba(1, 2, 3, 1)'
      },
      styles: {
        h2: 'border: linear-gradient(#abc, #def);',
        p: 'color: white;',
        blockquote: 'background: rgba(238, 244, 251, 1);',
        td: 'border-bottom: 1px solid #ccd6dd trailing-junk;'
      }
    })).toEqual({
      accent: '#576b95',
      body: '#262626',
      muted: '#666666',
      line: '#d9d9d9',
      soft: '#f6f7f9',
      surface: '#ffffff'
    });

    expect(resolveCardTokens({
      styles: {
        h2: 'border-left: 4px solid #ABC;',
        td: 'border-bottom: 1px dashed #C0FFEE;'
      }
    })).toMatchObject({ accent: '#aabbcc', line: '#c0ffee' });

    expect(resolveCardTokens({
      styles: { h2: 'border: #abc;' }
    }).accent).toBe('#576b95');
  });

  it('prefers a safe heading background over heading text when no border accent exists', () => {
    expect(resolveCardTokens(STYLES['latepost-depth']).accent).toBe('#b44d4d');
  });
});

function cardPreviewColor(color) {
  const raw = color.slice(1);
  const expanded = raw.length === 3
    ? raw.split('').map((digit) => digit + digit).join('')
    : raw;
  const source = [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16));
  const clamp = (value) => Math.min(255, Math.max(0, value));
  const [r, g, b] = source.map((channel) => 255 - channel);
  return [
    clamp(-0.574 * r + 1.43 * g + 0.144 * b),
    clamp(0.426 * r + 0.43 * g + 0.144 * b),
    clamp(0.426 * r + 1.43 * g - 0.856 * b)
  ];
}

function cardPreviewContrast(colorA, colorB) {
  const luminance = (color) => {
    const linear = color.map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const luminanceA = luminance(cardPreviewColor(colorA));
  const luminanceB = luminance(cardPreviewColor(colorB));
  return (Math.max(luminanceA, luminanceB) + 0.05) /
    (Math.min(luminanceA, luminanceB) + 0.05);
}

function mergeHeadingStyles(...styleTexts) {
  const properties = new Map();
  const apply = (property, value, important) => {
    const current = properties.get(property);
    if (current?.important && !important) return;
    properties.set(property, { value, important });
  };
  const expandPadding = (value) => {
    const parts = value.trim().split(/\s+/);
    const [top, right = top, bottom = top, left = right] = parts.length === 3
      ? [parts[0], parts[1], parts[2], parts[1]]
      : parts;
    return { top, right, bottom, left };
  };

  for (const styleText of styleTexts) {
    for (const rawDeclaration of styleText.split(';')) {
      const colon = rawDeclaration.indexOf(':');
      if (colon < 1) continue;
      const property = rawDeclaration.slice(0, colon).trim().toLowerCase();
      const rawValue = rawDeclaration.slice(colon + 1).trim();
      const important = /\s*!important\s*$/i.test(rawValue);
      const value = rawValue.replace(/\s*!important\s*$/i, '').trim();

      apply(property, value, important);
      if (property === 'border') {
        for (const side of ['top', 'right', 'bottom', 'left']) {
          apply(`border-${side}`, value, important);
        }
      } else if (property === 'padding') {
        for (const [side, sideValue] of Object.entries(expandPadding(value))) {
          apply(`padding-${side}`, sideValue, important);
        }
      } else if (property === 'background' && /^#[0-9a-f]{3,6}$|^transparent$/i.test(value)) {
        apply('background-color', value, important);
      }
    }
  }
  return Object.fromEntries(Array.from(properties, ([property, entry]) => [
    property,
    entry.value
  ]));
}

describe('card presentation recipes', () => {
  const tokens = {
    accent: '#1a73e8',
    body: '#243447',
    muted: '#657786',
    line: '#ccd6dd',
    soft: '#eef4fb',
    surface: '#ffffff'
  };

  it('computes WCAG contrast and fails closed for invalid colors', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.478, 3);
    expect(contrastRatio('not-a-color', '#ffffff')).toBe(0);
    expect(contrastRatio('#ffffff', 'url(javascript:1)')).toBe(0);
  });

  it('builds ten structurally distinct, static-flow presentations', () => {
    const presentations = CARD_STYLES.map((card) =>
      buildCardPresentation(card.id, tokens)
    );
    const serialized = JSON.stringify(presentations);

    expect(presentations).toHaveLength(10);
    expect(new Set(presentations.map((item) => item.containerStyle)).size).toBe(10);
    expect(presentations.every((item) => (
      typeof item.containerStyle === 'string' &&
      typeof item.titleStyle === 'string' &&
      typeof item.headingStyle === 'string' &&
      typeof item.bodyStyle === 'string' &&
      Array.isArray(item.contrastPairs)
    ))).toBe(true);
    expect(presentations.map((item) => item.decoration)).toEqual([
      'none', 'none', 'none', 'quote', 'none', 'none', 'none', 'none', 'none', 'number'
    ]);
    expect(serialized).not.toMatch(/display\s*:\s*(?:flex|grid)|position\s*:|::(?:before|after)|<table/i);
  });

  it('uses the ten approved container and title recipes', () => {
    const presentation = Object.fromEntries(CARD_STYLES.map(({ id }) => [
      id,
      buildCardPresentation(id, tokens)
    ]));
    const common = /margin:\s*20px 0.*padding:\s*18px 20px.*box-sizing:\s*border-box.*max-width:\s*100%.*overflow-wrap:\s*break-word/;

    expect(Object.values(presentation).every((item) => common.test(item.containerStyle))).toBe(true);
    expect(presentation['accent-bar'].containerStyle).toMatch(/border-left:\s*4px solid #1a73e8.*background-color:\s*#eef4fb.*border-radius:\s*6px/);
    expect(presentation['minimal-outline'].containerStyle).toMatch(/border:\s*1px solid #ccd6dd.*background-color:\s*transparent.*border-radius:\s*6px/);
    expect(presentation['soft-fill'].containerStyle).toMatch(/border:\s*none.*background-color:\s*#eef4fb.*border-radius:\s*14px/);
    expect(presentation['quote-frame'].containerStyle).toMatch(/border:\s*1px solid #ccd6dd.*border-radius:\s*10px/);
    expect(presentation['top-rule'].containerStyle).toMatch(/border-top:\s*4px solid #1a73e8.*background-color:\s*#eef4fb.*border-radius:\s*0 0 8px 8px/);
    expect(presentation['double-frame'].containerStyle).toMatch(/border:\s*3px double #ccd6dd.*background-color:\s*#ffffff.*border-radius:\s*8px/);
    expect(presentation['solid-contrast'].containerStyle).toMatch(/background-color:\s*#1a73e8.*border-radius:\s*10px/);
    expect(presentation['capsule-title'].titleStyle).toMatch(/display:\s*inline-block.*border-radius:\s*999px/);
    expect(presentation['label-title'].titleStyle).toMatch(/display:\s*block.*background-color:\s*#1a73e8/);
    expect(presentation['numbered-conclusion'].titleStyle).toMatch(/display:\s*inline-block/);
    expect(presentation['numbered-conclusion'].containerStyle).not.toMatch(/table/i);
  });

  it('keeps transparent minimal-outline text contrasted against the parent surface', () => {
    const tokens = resolveCardTokens(STYLES['gzh-yehang']);
    const presentation = buildCardPresentation(
      'minimal-outline',
      tokens,
      { nativeDark: true }
    );

    expect(presentation.containerStyle).toContain('background-color: transparent;');
    expect(presentation.contrastPairs).toEqual([
      {
        role: 'body',
        foreground: '#d7d5d3',
        background: '#191414',
        minimum: 4.5
      }
    ]);
    expect(contrastRatio('#d7d5d3', '#191414')).toBeGreaterThanOrEqual(4.5);
  });

  it('marks only theme-conflicting body and title declarations important', () => {
    expect(STYLES['latepost-depth'].styles.p).toMatch(/margin:[^;]+!important/);
    expect(STYLES['latepost-depth'].styles.p).toMatch(/line-height:[^;]+!important/);
    expect(STYLES['latepost-depth'].styles.h4).toMatch(/background-color:[^;]+!important/);

    const presentations = CARD_STYLES.map(({ id }) =>
      buildCardPresentation(id, resolveCardTokens(STYLES['latepost-depth']))
    );
    for (const presentation of presentations) {
      expect(presentation.bodyStyle).toMatch(/color:[^;]+!important/);
      expect(presentation.bodyStyle).toMatch(/margin:\s*0\s*!important/);
      expect(presentation.bodyStyle).toMatch(/line-height:\s*1\.75\s*!important/);
      expect(presentation.bodyStyle).not.toMatch(/text-align:[^;]+!important/);
      expect(presentation.bodyStyle).not.toMatch(/overflow-wrap:[^;]+!important/);
    }

    for (const styleId of ['capsule-title', 'label-title', 'numbered-conclusion']) {
      const titleStyle = buildCardPresentation(
        styleId,
        resolveCardTokens(STYLES['latepost-depth'])
      ).titleStyle;
      expect(titleStyle).toMatch(/color:[^;]+!important/);
      expect(titleStyle).toMatch(/margin:[^;]+!important/);
      expect(titleStyle).toMatch(/line-height:[^;]+!important/);
      expect(titleStyle).toMatch(/background-color:[^;]+!important/);
      if (styleId !== 'numbered-conclusion') {
        expect(titleStyle).toMatch(/padding:[^;]+!important/);
      }
      expect(titleStyle).not.toMatch(/font-size:[^;]+!important/);
    }
  });

  it('exposes heading styles that clear inherited h4 box styles after cascade', () => {
    const tokens = resolveCardTokens(STYLES['latepost-depth']);
    const presentations = Object.fromEntries(CARD_STYLES.map(({ id }) => [
      id,
      buildCardPresentation(id, tokens)
    ]));

    expect(Object.values(presentations).every((item) =>
      typeof item.headingStyle === 'string'
    )).toBe(true);
    expect(presentations['capsule-title'].headingStyle).toBe(
      presentations['capsule-title'].titleStyle
    );
    expect(presentations['label-title'].headingStyle).toBe(
      presentations['label-title'].titleStyle
    );
    expect(presentations['numbered-conclusion'].headingStyle).not.toBe(
      presentations['numbered-conclusion'].titleStyle
    );

    const expected = {
      'capsule-title': {
        background: 'solid',
        padding: { top: '5px', right: '14px', bottom: '5px', left: '14px' }
      },
      'label-title': {
        background: 'solid',
        padding: { top: '10px', right: '20px', bottom: '10px', left: '20px' }
      },
      'numbered-conclusion': {
        background: 'transparent',
        padding: { top: '0', right: '0', bottom: '0', left: '0' }
      }
    };

    for (const themeId of ['latepost-depth', 'guardian']) {
      for (const [styleId, contract] of Object.entries(expected)) {
        const presentation = buildCardPresentation(
          styleId,
          resolveCardTokens(STYLES[themeId])
        );
        const merged = mergeHeadingStyles(
          STYLES[themeId].styles.h4,
          presentation.headingStyle
        );
        const expectedBackground = contract.background === 'solid'
          ? presentation.solidBackground
          : contract.background;

        expect(merged.background, `${themeId}/${styleId}/background`).toBe(
          expectedBackground
        );
        expect(merged['background-color'], `${themeId}/${styleId}/background-color`).toBe(
          expectedBackground
        );
        for (const side of ['top', 'right', 'bottom', 'left']) {
          expect(merged[`border-${side}`], `${themeId}/${styleId}/border-${side}`).toBe('none');
          expect(merged[`padding-${side}`], `${themeId}/${styleId}/padding-${side}`).toBe(
            contract.padding[side]
          );
        }
      }
    }

    expect(presentations['numbered-conclusion'].headingStyle).toMatch(/display:\s*inline-block/);
    expect(presentations['numbered-conclusion'].headingStyle).not.toMatch(/font-size:[^;]+!important/);
  });

  it('uses explicit nativeDark options without token identity semantics', () => {
    const nativeTokens = resolveCardTokens(STYLES['gzh-yehang']);
    const clonedNativeTokens = { ...nativeTokens };
    const ordinaryTokens = resolveCardTokens(STYLES['wechat-default']);

    expect(Object.keys(nativeTokens)).toEqual([
      'accent', 'body', 'muted', 'line', 'soft', 'surface'
    ]);
    expect(buildCardPresentation('solid-contrast', ordinaryTokens)).toEqual(
      buildCardPresentation('solid-contrast', { ...ordinaryTokens }, { nativeDark: false })
    );
    expect(buildCardPresentation('solid-contrast', nativeTokens, { nativeDark: true })).toEqual(
      buildCardPresentation('solid-contrast', clonedNativeTokens, { nativeDark: true })
    );

    const nativePresentation = buildCardPresentation(
      'solid-contrast',
      clonedNativeTokens,
      { nativeDark: true }
    );
    expect(nativePresentation.solidBackground).toBe(nativeTokens.accent);
    expect(nativePresentation.contrastPairs).toContainEqual({
      role: 'solid-fill',
      foreground: nativeTokens.surface,
      background: nativeTokens.accent,
      minimum: 4.5
    });
  });

  it('returns a safe null result for an unknown card id', () => {
    expect(buildCardPresentation('future-card', tokens)).toBeNull();
  });

  it('chooses a readable solid foreground', () => {
    const presentation = buildCardPresentation('solid-contrast', {
      ...tokens,
      accent: '#777777',
      surface: '#888888'
    });

    expect(contrastRatio(
      presentation.solidText,
      presentation.solidBackground
    )).toBeGreaterThanOrEqual(4.5);
    expect(['#000000', '#ffffff']).toContain(presentation.solidText);
  });

  it('uses one adjusted accent value in every solid style, field, and contrast pair', () => {
    const tokens = resolveCardTokens(STYLES['wechat-default']);
    const roles = {
      'solid-contrast': 'solid-fill',
      'capsule-title': 'capsule-title',
      'label-title': 'title-strip',
      'numbered-conclusion': 'number-badge'
    };

    for (const [styleId, role] of Object.entries(roles)) {
      const presentation = buildCardPresentation(styleId, tokens);
      const pair = presentation.contrastPairs.find((item) => item.role === role);
      const solidStyle = styleId === 'solid-contrast'
        ? presentation.containerStyle
        : presentation.titleStyle;

      expect(presentation.solidBackground, styleId).not.toBe(tokens.accent);
      expect(pair.background, styleId).toBe(presentation.solidBackground);
      expect(pair.foreground, styleId).toBe(presentation.solidText);
      expect(solidStyle, styleId).toContain(
        `background-color: ${presentation.solidBackground}`
      );
      expect(solidStyle, styleId).toContain(`color: ${presentation.solidText}`);
    }
  });

  it('keeps every real theme and card text surface at WCAG AA contrast', () => {
    const failures = [];

    for (const [themeId, theme] of Object.entries(STYLES)) {
      const resolved = resolveCardTokens(theme);
      for (const card of CARD_STYLES) {
        const presentation = buildCardPresentation(card.id, resolved, {
          nativeDark: Boolean(theme.gzh?.bg)
        });
        for (const pair of presentation.contrastPairs) {
          const ratio = contrastRatio(pair.foreground, pair.background);
          if (ratio < pair.minimum) {
            failures.push(`${themeId}/${card.id}/${pair.role}=${ratio.toFixed(2)}`);
          }
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
    expect(resolveCardTokens(STYLES['gzh-yehang']).surface).toBe('#191414');
  });

  it('keeps every ordinary theme pair readable after the exact dark preview transform', () => {
    const failures = [];

    for (const [themeId, theme] of Object.entries(STYLES)) {
      const resolved = resolveCardTokens(theme);
      for (const card of CARD_STYLES) {
        const presentation = buildCardPresentation(card.id, resolved, {
          nativeDark: Boolean(theme.gzh?.bg)
        });
        for (const pair of presentation.contrastPairs) {
          const lightRatio = contrastRatio(pair.foreground, pair.background);
          const darkRatio = theme.gzh?.bg
            ? lightRatio
            : cardPreviewContrast(pair.foreground, pair.background);
          if (lightRatio < pair.minimum || darkRatio < pair.minimum) {
            failures.push(
              `${themeId}/${card.id}/${pair.role}: light=${lightRatio.toFixed(2)}, dark=${darkRatio.toFixed(2)}`
            );
          }
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
  });
});

describe('card presentation DOM application', () => {
  const theme = STYLES['latepost-depth'];

  it('keeps emphasized body text readable on the card surface', () => {
    const doc = new FakeDocument();
    const presentation = buildCardPresentation(
      'solid-contrast',
      resolveCardTokens(theme)
    );
    const paragraph = doc.createElement('p');
    const strong = appendElement(doc, paragraph, 'strong', '重点');
    strong.setAttribute('style', theme.styles.strong);
    createCard(doc, 'solid-contrast', [paragraph]);

    expect(contrastRatio('#b44d4d', presentation.solidBackground)).toBe(1);

    applyCardStyles(doc, theme);

    expect(strong.style.getPropertyValue('color')).toBe(presentation.solidText);
    expect(strong.style.getPropertyPriority('color')).toBe('important');
    expect(strong.style.getPropertyValue('background')).toBe('transparent');
    expect(strong.style.getPropertyValue('background-color')).toBe('transparent');
    expect(strong.style.getPropertyValue('background-image')).toBe('none');
    expect(strong.style.getPropertyValue('-webkit-text-fill-color')).toBe(
      presentation.solidText
    );
    expect(contrastRatio(
      strong.style.getPropertyValue('color'),
      presentation.solidBackground
    )).toBeGreaterThanOrEqual(4.5);
  });

  it('secures standard heading and body inline text without crossing code or nested cards', () => {
    const doc = new FakeDocument();
    const presentation = buildCardPresentation(
      'capsule-title',
      resolveCardTokens(theme)
    );
    const unsafe = 'color: #b44d4d !important; -webkit-text-fill-color: #b44d4d !important; background: linear-gradient(red, red) !important; background-color: #b44d4d !important; background-image: linear-gradient(red, red) !important; border-bottom: 1px solid #b44d4d !important; text-decoration-color: #b44d4d !important;';
    const heading = doc.createElement('h4');
    const paragraph = doc.createElement('p');
    const headingInline = ['strong', 'em', 'a', 'del'].map((tagName) => {
      const element = appendElement(doc, heading, tagName, tagName);
      element.setAttribute('style', unsafe);
      return element;
    });
    const bodyInline = ['strong', 'em', 'a', 'del'].map((tagName) => {
      const element = appendElement(doc, paragraph, tagName, tagName);
      element.setAttribute('style', unsafe);
      return element;
    });
    const code = appendElement(doc, paragraph, 'code', '代码');
    code.setAttribute('style', theme.styles.code);
    const codeStrong = appendElement(doc, code, 'strong', '代码内容');
    codeStrong.setAttribute('style', unsafe);
    const codeBefore = Object.fromEntries([
      'color',
      'background',
      'background-color',
      'background-image',
      'font-family',
      'font-size',
      'padding'
    ].map((property) => [property, code.style.getPropertyValue(property)]));
    const codeStrongBefore = codeStrong.getAttribute('style');
    const nestedCard = doc.createElement('section');
    nestedCard.setAttribute('data-ogzh-card', 'future-card');
    const nestedParagraph = doc.createElement('p');
    const nestedStrong = appendElement(doc, nestedParagraph, 'strong', '嵌套内容');
    nestedStrong.setAttribute('style', unsafe);
    const nestedBefore = nestedStrong.getAttribute('style');
    nestedCard.appendChild(nestedParagraph);
    createCard(doc, 'capsule-title', [heading, paragraph, nestedCard]);

    applyCardStyles(doc, theme);

    for (const [elements, expected] of [
      [headingInline, presentation.solidText],
      [bodyInline, presentation.contrastPairs.find(({ role }) => role === 'body').foreground]
    ]) {
      for (const element of elements) {
        expect(element.style.getPropertyValue('color')).toBe(expected);
        expect(element.style.getPropertyPriority('color')).toBe('important');
        expect(element.style.getPropertyValue('-webkit-text-fill-color')).toBe(expected);
        expect(element.style.getPropertyPriority('-webkit-text-fill-color')).toBe('important');
        expect(element.style.getPropertyValue('background')).toBe('transparent');
        expect(element.style.getPropertyValue('background-color')).toBe('transparent');
        expect(element.style.getPropertyValue('background-image')).toBe('none');
      }
    }
    for (const link of [headingInline[2], bodyInline[2]]) {
      expect(link.style.getPropertyValue('border-color')).toBe('currentColor');
      expect(link.style.getPropertyValue('text-decoration-color')).toBe('currentColor');
    }
    for (const [property, value] of Object.entries(codeBefore)) {
      expect(code.style.getPropertyValue(property), `direct-code/${property}`).toBe(value);
    }
    expect(code.style.getPropertyValue('-webkit-text-fill-color')).toBe('currentColor');
    expect(code.style.getPropertyValue('-webkit-text-stroke-color')).toBe('currentColor');
    expect(code.style.getPropertyValue('-webkit-text-stroke-width')).toBe('0');
    expect(codeStrong.getAttribute('style')).toBe(codeStrongBefore);
    expect(nestedStrong.getAttribute('style')).toBe(nestedBefore);
  });

  it('isolates code colors inherited through safe inline wrappers on every card surface', () => {
    const scenarios = [
      { styleId: 'solid-contrast', surface: 'body', wrapperTag: 'strong' },
      { styleId: 'capsule-title', surface: 'heading', wrapperTag: 'a' },
      { styleId: 'capsule-title', surface: 'body', wrapperTag: 'a' }
    ];

    for (const { styleId, surface, wrapperTag } of scenarios) {
      const doc = new FakeDocument();
      const presentation = buildCardPresentation(styleId, resolveCardTokens(theme));
      const heading = styleId === 'capsule-title' ? doc.createElement('h4') : null;
      const paragraph = doc.createElement('p');
      const root = surface === 'heading' ? heading : paragraph;
      const wrapper = doc.createElement(wrapperTag);
      wrapper.setAttribute('style', theme.styles[wrapperTag]);
      const code = appendElement(doc, wrapper, 'code', '保留代码');
      code.setAttribute('style', theme.styles.code);
      root.appendChild(wrapper);
      createCard(doc, styleId, heading ? [heading, paragraph] : [paragraph]);
      const preserved = Object.fromEntries([
        'color',
        'background',
        'background-color',
        'background-image',
        'font-family',
        'font-size',
        'padding'
      ].map((property) => [property, code.style.getPropertyValue(property)]));
      const role = surface === 'heading'
        ? presentation.headingContrastRole
        : presentation.bodyContrastRole;
      const safeForeground = presentation.contrastPairs.find(
        (pair) => pair.role === role
      ).foreground;

      applyCardStyles(doc, theme);

      expect(wrapper.style.getPropertyValue('color')).toBe(safeForeground);
      expect(code.textContent).toBe('保留代码');
      for (const [property, value] of Object.entries(preserved)) {
        expect(code.style.getPropertyValue(property), `${styleId}/${surface}/${property}`).toBe(value);
      }
      expect(code.style.getPropertyValue('-webkit-text-fill-color')).toBe('currentColor');
      expect(code.style.getPropertyPriority('-webkit-text-fill-color')).toBe('important');
      expect(code.style.getPropertyValue('-webkit-text-stroke-color')).toBe('currentColor');
      expect(code.style.getPropertyPriority('-webkit-text-stroke-color')).toBe('important');
      expect(code.style.getPropertyValue('-webkit-text-stroke-width')).toBe('0');
      expect(code.style.getPropertyPriority('-webkit-text-stroke-width')).toBe('important');
    }
  });

  it('styles only known card containers and their direct body blocks', () => {
    const doc = new FakeDocument();
    const paragraph = appendElement(doc, doc.createElement('div'), 'p', '已知正文');
    const known = createCard(doc, 'accent-bar', [paragraph]);
    known.setAttribute('style', 'letter-spacing: 1px; background-color: pink !important;');
    paragraph.setAttribute('style', 'margin: 16px !important;');
    const nested = doc.createElement('div');
    const nestedParagraph = appendElement(doc, nested, 'p', '嵌套正文');
    known.appendChild(nested);
    const unknownParagraph = appendElement(doc, doc.createElement('div'), 'p', '未知正文');
    const unknown = createCard(doc, 'future-card" onmouseover="alert(1)', [unknownParagraph]);
    unknown.setAttribute('style', 'color: purple;');
    const unknownBefore = unknown.getAttribute('style');

    applyCardStyles(doc, theme);

    expect(known.style.getPropertyValue('letter-spacing')).toBe('1px');
    expect(known.style.getPropertyValue('border-left')).toContain('solid');
    expect(known.style.getPropertyValue('background-color')).not.toBe('pink');
    expect(paragraph.style.getPropertyValue('margin')).toBe('0');
    expect(paragraph.style.getPropertyPriority('margin')).toBe('important');
    expect(paragraph.style.getPropertyValue('line-height')).toBe('1.75');
    expect(nestedParagraph.getAttribute('style')).toBeNull();
    expect(unknown.getAttribute('style')).toBe(unknownBefore);
    expect(unknownParagraph.getAttribute('style')).toBeNull();
  });

  it('styles the first direct title without fabricating a missing h4', () => {
    const doc = new FakeDocument();
    const heading = appendElement(doc, doc.createElement('div'), 'h4', '核心观点');
    const paragraph = appendElement(doc, doc.createElement('div'), 'p', '正文');
    const titled = createCard(doc, 'capsule-title', [heading, paragraph]);
    const bodyOnly = createCard(doc, 'label-title', [appendElement(doc, doc.createElement('div'), 'p', '无标题正文')]);

    applyCardStyles(doc, theme);

    expect(heading.style.getPropertyValue('display')).toBe('inline-block');
    expect(heading.style.getPropertyValue('border')).toBe('none');
    expect(heading.textContent).toBe('核心观点');
    expect(titled.children).toContain(heading);
    expect(bodyOnly.children.map((child) => child.tagName)).toEqual(['P']);
  });

  it('normalizes a retained h4 when a card changes to a body-only style', () => {
    const doc = new FakeDocument();
    const heading = doc.createElement('h4');
    const strong = appendElement(doc, heading, 'strong', '保留的标题');
    heading.setAttribute(
      'style',
      'background: red !important; background-color: red !important; padding: 12px !important; border: 3px solid blue !important; border-left: 8px solid blue !important; color: pink !important; font-size: 32px !important; font-weight: 900 !important; font-style: italic !important; font-family: fantasy !important; letter-spacing: 8px !important; text-transform: uppercase !important; text-align: center !important; text-decoration: underline !important;'
    );
    createCard(doc, 'soft-fill', [heading, appendElement(doc, doc.createElement('div'), 'p', '正文')]);

    applyCardStyles(doc, theme);

    expect(heading.textContent).toBe('保留的标题');
    expect(heading.children).toEqual([strong]);
    expect(heading.style.getPropertyValue('background')).toBe('transparent');
    expect(heading.style.getPropertyValue('background-color')).toBe('transparent');
    expect(heading.style.getPropertyValue('padding')).toBe('0');
    expect(heading.style.getPropertyValue('border')).toBe('none');
    expect(heading.style.getPropertyValue('border-left')).toBe('none');
    expect(heading.style.getPropertyValue('margin')).toBe('0');
    expect(heading.style.getPropertyValue('line-height')).toBe('1.75');
    expect(heading.style.getPropertyValue('font-size')).toBe('inherit');
    expect(heading.style.getPropertyValue('font-weight')).toBe('inherit');
    expect(heading.style.getPropertyValue('font-style')).toBe('normal');
    expect(heading.style.getPropertyValue('font-family')).toBe('inherit');
    expect(heading.style.getPropertyValue('letter-spacing')).toBe('inherit');
    expect(heading.style.getPropertyValue('text-transform')).toBe('none');
    expect(heading.style.getPropertyValue('text-align')).toBe('left');
    expect(heading.style.getPropertyValue('text-decoration')).toBe('none');
    expect(heading.style.getPropertyPriority('font-size')).toBe('important');
  });

  it('resets the real wechat-ft small-caps heading variant on a body card', () => {
    const doc = new FakeDocument();
    const heading = appendElement(doc, doc.createElement('div'), 'h4', '正文标题');
    const ftTheme = STYLES['wechat-ft'];

    expect(ftTheme.styles.h4).toMatch(/font-variant:\s*small-caps/);
    heading.setAttribute('style', ftTheme.styles.h4);
    createCard(doc, 'accent-bar', [heading]);

    applyCardStyles(doc, ftTheme);

    expect(heading.style.getPropertyValue('font-variant')).toBe('inherit');
    expect(heading.style.getPropertyPriority('font-variant')).toBe('important');
  });

  it('resets the real paperpress break-all heading behavior on a body card', () => {
    const doc = new FakeDocument();
    const heading = appendElement(doc, doc.createElement('div'), 'h4', '正文标题');
    const paperpress = STYLES['wechat-paperpress'];

    expect(paperpress.styles.h4).toMatch(/word-break:\s*break-all/);
    heading.setAttribute('style', paperpress.styles.h4);
    createCard(doc, 'accent-bar', [heading]);

    applyCardStyles(doc, paperpress);

    expect(heading.style.getPropertyValue('word-break')).toBe('normal');
    expect(heading.style.getPropertyPriority('word-break')).toBe('important');
  });

  it('creates two real quote spans and stays stable when applied twice', () => {
    const doc = new FakeDocument();
    const userDecoration = appendElement(doc, doc.createElement('div'), 'span', '用户元素');
    userDecoration.setAttribute('data-ogzh-card-decoration', 'user-note');
    const conflictingUserDecoration = appendElement(doc, doc.createElement('div'), 'span', 'USER');
    conflictingUserDecoration.setAttribute('data-ogzh-card-decoration', 'quote-open');
    conflictingUserDecoration.setAttribute('aria-hidden', 'true');
    const nonSpan = appendElement(doc, doc.createElement('div'), 'div', '非渲染器 span');
    nonSpan.setAttribute('data-ogzh-card-decoration', 'quote-open');
    nonSpan.setAttribute('aria-hidden', 'true');
    const section = createCard(doc, 'quote-frame', [
      userDecoration,
      conflictingUserDecoration,
      nonSpan,
      appendElement(doc, doc.createElement('div'), 'p', '金句')
    ]);

    applyCardStyles(doc, theme);
    const firstStyle = section.getAttribute('style');
    const opening = decorations(section, 'quote-open').filter(({ textContent }) => textContent === '“');
    const closing = decorations(section, 'quote-close').filter(({ textContent }) => textContent === '”');

    expect(opening).toHaveLength(1);
    expect(closing).toHaveLength(1);
    expect(opening[0].tagName).toBe('SPAN');
    expect(closing[0].tagName).toBe('SPAN');
    expect([opening[0].textContent, closing[0].textContent]).toEqual(['“', '”']);
    expect([opening[0], closing[0]].every((item) => item.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect([opening[0], closing[0]].every((item) => Boolean(item.getAttribute('style')))).toBe(true);
    expect(section.children).toContain(userDecoration);
    expect(section.children).toContain(conflictingUserDecoration);
    expect(section.children).toContain(nonSpan);

    applyCardStyles(doc, theme);

    expect(decorations(section, 'quote-open').filter(({ textContent }) => textContent === '“')).toHaveLength(1);
    expect(decorations(section, 'quote-close').filter(({ textContent }) => textContent === '”')).toHaveLength(1);
    expect(section.children).toContain(userDecoration);
    expect(section.children).toContain(conflictingUserDecoration);
    expect(conflictingUserDecoration.textContent).toBe('USER');
    expect(section.children).toContain(nonSpan);
    expect(section.getAttribute('style')).toBe(firstStyle);
  });

  it('turns a numbered title into a real badge and remains stable on reapplication', () => {
    const doc = new FakeDocument();
    const heading = doc.createElement('h4');
    const prefix = doc.createTextNode('01 ');
    const strong = appendElement(doc, doc.createElement('div'), 'strong', '阶段');
    const gap = doc.createTextNode(' ');
    const emphasis = appendElement(doc, doc.createElement('div'), 'em', '结论');
    heading.appendChild(prefix);
    heading.appendChild(strong);
    heading.appendChild(gap);
    heading.appendChild(emphasis);
    const section = createCard(doc, 'numbered-conclusion', [heading, appendElement(doc, doc.createElement('div'), 'p', '正文')]);

    applyCardStyles(doc, theme);
    const firstStyle = heading.getAttribute('style');

    expect(decorations(section, 'number')).toHaveLength(1);
    expect(decorations(section, 'number')[0].textContent).toBe('01');
    expect(decorations(section, 'number')[0].getAttribute('aria-hidden')).toBe('true');
    expect(decorations(section, 'number')[0].style.getPropertyValue('display')).toBe('inline-block');
    expect(prefix.nodeValue).toBe('');
    expect(heading.children).toEqual([strong, emphasis]);
    expect(heading.childNodes).toContain(gap);
    expect(heading.textContent).toBe('阶段 结论');
    expect(heading.textContent.replace(/\s+/g, '')).toBe('阶段结论');
    expect(heading.getAttribute('aria-label')).toBe('01 阶段 结论');

    applyCardStyles(doc, theme);

    expect(decorations(section, 'number')).toHaveLength(1);
    expect(decorations(section, 'number')[0].textContent).toBe('01');
    expect(prefix.nodeValue).toBe('');
    expect(heading.children).toEqual([strong, emphasis]);
    expect(heading.textContent).toBe('阶段 结论');
    expect(heading.getAttribute('aria-label')).toBe('01 阶段 结论');
    expect(heading.getAttribute('style')).toBe(firstStyle);

    section.setAttribute('data-ogzh-card', 'accent-bar');
    applyCardStyles(doc, theme);

    expect(prefix.nodeValue).toBe('01 ');
    expect(heading.children).toEqual([strong, emphasis]);
    expect(heading.textContent).toBe('01 阶段 结论');
    expect(heading.getAttribute('aria-label')).toBeNull();
    expect(decorations(section, 'number')).toHaveLength(0);
  });

  it('derives numbered state from visible text and restores user aria on a body switch', () => {
    const doc = new FakeDocument();
    const heading = doc.createElement('h4');
    const prefix = doc.createTextNode('01 ');
    const strong = appendElement(doc, doc.createElement('div'), 'strong', '阶段结论');
    heading.appendChild(prefix);
    heading.appendChild(strong);
    heading.setAttribute('aria-label', '99 用户辅助标题');
    const section = createCard(doc, 'numbered-conclusion', [heading]);

    applyCardStyles(doc, theme);

    expect(decorations(section, 'number')).toHaveLength(1);
    expect(decorations(section, 'number')[0].textContent).toBe('01');
    expect(prefix.nodeValue).toBe('');
    expect(heading.children).toEqual([strong]);
    expect(heading.getAttribute('aria-label')).toBe('01 阶段结论');

    applyCardStyles(doc, theme);

    expect(decorations(section, 'number')).toHaveLength(1);
    expect(decorations(section, 'number')[0].textContent).toBe('01');
    expect(prefix.nodeValue).toBe('');
    expect(heading.children).toEqual([strong]);

    section.setAttribute('data-ogzh-card', 'accent-bar');
    applyCardStyles(doc, theme);

    expect(decorations(section, 'number')).toHaveLength(0);
    expect(prefix.nodeValue).toBe('01 ');
    expect(heading.textContent).toBe('01 阶段结论');
    expect(heading.children).toEqual([strong]);
    expect(heading.getAttribute('aria-label')).toBe('99 用户辅助标题');
  });

  it('keeps an unnumbered conclusion title unchanged and badge-free', () => {
    const doc = new FakeDocument();
    const heading = appendElement(doc, doc.createElement('div'), 'h4', '阶段结论');
    const section = createCard(doc, 'numbered-conclusion', [heading]);

    applyCardStyles(doc, theme);

    expect(heading.textContent).toBe('阶段结论');
    expect(heading.getAttribute('aria-label')).toBeNull();
    expect(heading.style.getPropertyValue('display')).toBe('inline-block');
    expect(decorations(section, 'number')).toHaveLength(0);
  });

  it('styles direct lists and items without replacing standard inline content', () => {
    const doc = new FakeDocument();
    const presentation = buildCardPresentation(
      'accent-bar',
      resolveCardTokens(theme)
    );
    const bodyForeground = presentation.contrastPairs.find(
      ({ role }) => role === presentation.bodyContrastRole
    ).foreground;
    const strong = appendElement(doc, doc.createElement('div'), 'strong', '重点');
    const link = appendElement(doc, doc.createElement('div'), 'a', '链接');
    const paragraph = doc.createElement('p');
    paragraph.appendChild(strong);
    paragraph.appendChild(link);
    const list = doc.createElement('ul');
    const item = appendElement(doc, list, 'li', '一级列表项');
    const nestedList = doc.createElement('ul');
    const nestedItem = appendElement(doc, nestedList, 'li', '二级列表项');
    item.appendChild(nestedList);
    const nestedCard = doc.createElement('section');
    nestedCard.setAttribute('data-ogzh-card', 'future-card');
    const nestedCardList = doc.createElement('ol');
    const nestedCardItem = appendElement(doc, nestedCardList, 'li', '嵌套卡片列表项');
    nestedCard.appendChild(nestedCardList);
    nestedItem.appendChild(nestedCard);
    createCard(doc, 'accent-bar', [paragraph, list]);

    applyCardStyles(doc, theme);

    expect(paragraph.children).toEqual([strong, link]);
    expect(paragraph.textContent).toBe('重点链接');
    expect(list.children).toEqual([item]);
    expect(list.style.getPropertyValue('margin')).toBe('0');
    expect(item.style.getPropertyValue('line-height')).toBe('1.75');
    expect(nestedItem.style.getPropertyValue('line-height')).toBe('1.75');
    expect(nestedCardItem.getAttribute('style')).toBeNull();
    expect(strong.style.getPropertyValue('color')).toBe(bodyForeground);
    expect(link.style.getPropertyValue('color')).toBe(bodyForeground);
    expect(link.style.getPropertyValue('border-color')).toBe('currentColor');
    expect(link.style.getPropertyValue('text-decoration-color')).toBe('currentColor');
  });

  it('overrides loose-list paragraphs without crossing a nested card boundary', () => {
    const doc = new FakeDocument();
    const latepost = STYLES['latepost-depth'];
    const presentation = buildCardPresentation(
      'solid-contrast',
      resolveCardTokens(latepost)
    );
    const list = doc.createElement('ul');
    const item = doc.createElement('li');
    const paragraph = appendElement(doc, item, 'p', '松散列表正文');
    paragraph.setAttribute('style', latepost.styles.p);
    const nestedCard = doc.createElement('section');
    nestedCard.setAttribute('data-ogzh-card', 'future-card');
    const nestedParagraph = appendElement(doc, nestedCard, 'p', '嵌套卡片正文');
    nestedParagraph.setAttribute('style', latepost.styles.p);
    const nestedBefore = nestedParagraph.getAttribute('style');
    item.appendChild(nestedCard);
    list.appendChild(item);
    createCard(doc, 'solid-contrast', [list]);

    applyCardStyles(doc, latepost);

    expect(paragraph.style.getPropertyValue('color')).toBe(presentation.solidText);
    expect(paragraph.style.getPropertyPriority('color')).toBe('important');
    expect(paragraph.style.getPropertyValue('margin')).toBe('0');
    expect(paragraph.style.getPropertyValue('line-height')).toBe('1.75');
    expect(contrastRatio(
      paragraph.style.getPropertyValue('color'),
      presentation.solidBackground
    )).toBeGreaterThanOrEqual(4.5);
    expect(nestedParagraph.getAttribute('style')).toBe(nestedBefore);
  });

  it('uses a valid native background to keep the native-dark contrast path', () => {
    const nativeTheme = STYLES['gzh-yehang'];
    const ordinaryTheme = { ...nativeTheme, gzh: { ...nativeTheme.gzh } };
    delete ordinaryTheme.gzh.bg;
    const nativeDoc = new FakeDocument();
    const ordinaryDoc = new FakeDocument();
    const nativeCard = createCard(nativeDoc, 'solid-contrast', [appendElement(nativeDoc, nativeDoc.createElement('div'), 'p', '正文')]);
    const ordinaryCard = createCard(ordinaryDoc, 'solid-contrast', [appendElement(ordinaryDoc, ordinaryDoc.createElement('div'), 'p', '正文')]);

    applyCardStyles(nativeDoc, nativeTheme);
    applyCardStyles(ordinaryDoc, ordinaryTheme);

    expect(nativeCard.style.getPropertyValue('background-color')).toBe('#1db954');
    expect(ordinaryCard.style.getPropertyValue('background-color')).not.toBe('#1db954');
  });

  it('keeps all standard inline text readable across every theme and card surface', () => {
    const failures = [];
    let checked = 0;

    for (const [themeId, styleConfig] of Object.entries(STYLES)) {
      for (const card of CARD_STYLES) {
        const doc = new FakeDocument();
        const presentation = buildCardPresentation(
          card.id,
          resolveCardTokens(styleConfig),
          { nativeDark: Boolean(styleConfig.gzh?.bg) }
        );
        const paragraph = doc.createElement('p');
        const bodyInline = ['strong', 'em', 'a', 'del'].map((tagName) => {
          const element = appendElement(doc, paragraph, tagName, tagName);
          element.setAttribute(
            'style',
            styleConfig.styles[tagName] || styleConfig.styles.strong || 'color: #777777 !important;'
          );
          return element;
        });
        const children = [];
        let headingInline = [];
        if (card.slots === 'title-body') {
          const heading = doc.createElement('h4');
          headingInline = ['strong', 'em', 'a', 'del'].map((tagName) => {
            const element = appendElement(doc, heading, tagName, tagName);
            element.setAttribute(
              'style',
              styleConfig.styles[tagName] || styleConfig.styles.strong || 'color: #777777 !important;'
            );
            return element;
          });
          children.push(heading);
        }
        children.push(paragraph);
        createCard(doc, card.id, children);

        applyCardStyles(doc, styleConfig);

        for (const [surface, elements, role] of [
          ['body', bodyInline, presentation.bodyContrastRole],
          ['heading', headingInline, presentation.headingContrastRole]
        ]) {
          const pair = presentation.contrastPairs.find((item) => item.role === role);
          for (const element of elements) {
            const foreground = element.style.getPropertyValue('color');
            const ratio = contrastRatio(foreground, pair.background);
            checked += 1;
            if (
              foreground !== pair.foreground ||
              element.style.getPropertyPriority('color') !== 'important' ||
              element.style.getPropertyValue('background') !== 'transparent' ||
              element.style.getPropertyValue('background-image') !== 'none' ||
              ratio < 4.5
            ) {
              failures.push(
                `${themeId}/${card.id}/${surface}/${element.tagName.toLowerCase()}=${ratio.toFixed(2)}`
              );
            }
          }
        }
      }
    }

    expect(failures, failures.join('\n')).toEqual([]);
    expect(checked).toBe(
      Object.keys(STYLES).length *
      (CARD_STYLES.length * 4 + CARD_STYLES.filter(({ slots }) => slots === 'title-body').length * 4)
    );
  });
});

describe('card preview HTML', () => {
  const theme = STYLES['gzh-yehang'];

  it('renders every registry card from trusted inline presentation styles', () => {
    for (const card of CARD_STYLES) {
      const html = renderCardPreviewHtml(card.id, theme);

      expect(html, card.id).toContain(`data-ogzh-card-preview="${card.id}"`);
      expect(html, card.id).toContain('style="');
      expect(html, card.id).toContain(card.preview);
      if (card.defaultTitle) expect(html, card.id).toContain(card.defaultTitle);
      expect(html, card.id).not.toContain(':::ogzh-card');
      expect(html, card.id).not.toMatch(/class=|<table|display\s*:\s*(?:flex|grid)|position\s*:|::(?:before|after)/i);
    }
  });

  it('uses real spans for quote and number decorations', () => {
    const quoteHtml = renderCardPreviewHtml('quote-frame', theme);
    expect(quoteHtml).toMatch(
      /<span[^>]+data-ogzh-card-decoration="quote-open"[^>]*>/
    );
    expect(quoteHtml).toMatch(
      /<span[^>]+data-ogzh-card-decoration="quote-close"[^>]*>/
    );
    expect(renderCardPreviewHtml('numbered-conclusion', theme)).toMatch(
      /<span[^>]+data-ogzh-card-decoration="number"[^>]*>/
    );
  });

  it('renders quote preview with exactly two styled decorations around the body', () => {
    const presentation = buildCardPresentation(
      'quote-frame',
      resolveCardTokens(theme),
      { nativeDark: true }
    );
    const quotePair = presentation.contrastPairs.find(({ role }) => role === 'quote-mark');
    const common = `color: ${quotePair.foreground} !important; font-size: 30px; line-height: 1;`;
    const html = renderCardPreviewHtml('quote-frame', theme);

    expect(html).toBe(
      `<section data-ogzh-card-preview="quote-frame" style="${presentation.containerStyle}">` +
      `<span data-ogzh-card-decoration="quote-open" aria-hidden="true" style="display: inline-block; ${common} margin: 0 8px 4px 0;">“</span>` +
      `<p style="${presentation.bodyStyle}">一句值得记住的话</p>` +
      `<span data-ogzh-card-decoration="quote-close" aria-hidden="true" style="display: block; ${common} margin: 4px 0 0; text-align: right;">”</span>` +
      '</section>'
    );
    expect(html.match(/data-ogzh-card-decoration=/g)).toHaveLength(2);
  });

  it('renders the numbered preview with one badge, a de-numbered title, and placeholder body', () => {
    const presentation = buildCardPresentation(
      'numbered-conclusion',
      resolveCardTokens(theme),
      { nativeDark: true }
    );
    const html = renderCardPreviewHtml('numbered-conclusion', theme);

    expect(html).toBe(
      `<section data-ogzh-card-preview="numbered-conclusion" style="${presentation.containerStyle}">` +
      `<span data-ogzh-card-decoration="number" aria-hidden="true" style="${presentation.titleStyle}">01</span>` +
      `<h4 aria-label="01 阶段结论" style="${presentation.headingStyle}">阶段结论</h4>` +
      `<p style="${presentation.bodyStyle}">在这里输入卡片内容</p></section>`
    );
    expect(html.match(/01 阶段结论/g)).toHaveLength(1);
    expect(html.match(/>01<\/span>/g)).toHaveLength(1);
    expect(html.match(/>阶段结论<\/h4>/g)).toHaveLength(1);
    expect(html).not.toContain('>01 阶段结论</');
  });

  it('returns empty HTML for unknown ids and cannot copy malicious theme CSS', () => {
    expect(renderCardPreviewHtml('future-card', theme)).toBe('');

    const html = renderCardPreviewHtml('accent-bar', {
      gzh: {
        accent: '#f00; position:fixed',
        body: '<img src=x onerror=alert(1)>',
        soft: 'url(javascript:alert(1))',
        bg: '" onmouseover="alert(1)'
      }
    });
    expect(html).not.toMatch(/position|onerror|onmouseover|javascript|<img/i);
  });
});
