import { describe, expect, it } from 'vitest';
import { CARD_STYLES, buildCardSnippet, getCardStyle } from '../card-styles.js';

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
});
