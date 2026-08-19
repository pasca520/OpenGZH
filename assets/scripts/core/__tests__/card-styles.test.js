import { describe, expect, it } from 'vitest';
import * as cardStyles from '../card-styles.js';
import {
  CARD_STYLES,
  applyCardEdit,
  buildCardSnippet,
  findCardAtSelection,
  getCardStyle,
  inspectCardTarget,
  removeCardEdit,
  replaceCardStyleEdit,
  scanCardRanges
} from '../card-styles.js';

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

  it('keeps both sides byte-for-byte when inserting in a line and separates all blocks', () => {
    const source = '左侧文字右侧文字';
    const cursor = source.indexOf('右侧');
    const result = applyCardEdit(source, cursor, cursor, 'soft-fill', []);

    expect(result.markdown).toBe(
      '左侧文字\n\n:::ogzh-card soft-fill\n在这里输入卡片内容\n:::\n\n右侧文字'
    );
    expect(result.markdown.startsWith(source.slice(0, cursor))).toBe(true);
    expect(result.markdown.endsWith(source.slice(cursor))).toBe(true);
    expect(result.markdown.slice(result.selectionStart, result.selectionEnd)).toBe(
      '在这里输入卡片内容'
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
