import { describe, expect, it } from 'vitest';
import {
  CARD_STYLES,
  buildCardSnippet,
  findCardAtSelection,
  getCardStyle,
  removeCardEdit,
  replaceCardStyleEdit,
  scanCardRanges
} from '../card-styles.js';

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
