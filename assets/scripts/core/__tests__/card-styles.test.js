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
});

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
    const presentation = buildCardPresentation('minimal-outline', tokens);

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

  it('keeps every real theme and card text surface at WCAG AA contrast', () => {
    const failures = [];

    for (const [themeId, theme] of Object.entries(STYLES)) {
      const resolved = resolveCardTokens(theme);
      for (const card of CARD_STYLES) {
        const presentation = buildCardPresentation(card.id, resolved);
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
    expect(renderCardPreviewHtml('quote-frame', theme)).toMatch(
      /<span[^>]+data-ogzh-card-decoration="quote"[^>]*>/
    );
    expect(renderCardPreviewHtml('numbered-conclusion', theme)).toMatch(
      /<span[^>]+data-ogzh-card-decoration="number"[^>]*>/
    );
  });

  it('renders the numbered preview with one badge, a de-numbered title, and placeholder body', () => {
    const presentation = buildCardPresentation(
      'numbered-conclusion',
      resolveCardTokens(theme)
    );
    const titlePair = presentation.contrastPairs.find(({ role }) => role === 'title');
    const headingStyle = `display: inline-block; margin: 0 0 12px; color: ${titlePair.foreground} !important; font-size: 16px; line-height: 1.5;`;
    const html = renderCardPreviewHtml('numbered-conclusion', theme);

    expect(html).toBe(
      `<section data-ogzh-card-preview="numbered-conclusion" style="${presentation.containerStyle}">` +
      `<span data-ogzh-card-decoration="number" aria-hidden="true" style="${presentation.titleStyle}">01</span>` +
      `<h4 aria-label="01 阶段结论" style="${headingStyle}">阶段结论</h4>` +
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
