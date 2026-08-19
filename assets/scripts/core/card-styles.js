const BODY_PLACEHOLDER = '在这里输入卡片内容';

export const CARD_STYLES = Object.freeze([
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

const CARD_STYLE_BY_ID = new Map(CARD_STYLES.map((item) => [item.id, item]));

export function getCardStyle(styleId) {
  return CARD_STYLE_BY_ID.get(styleId) || null;
}

export function buildCardSnippet(styleId, selectedBody = '') {
  const card = getCardStyle(styleId);
  if (!card) {
    throw new Error(`Unknown card style: ${styleId}`);
  }

  const body = selectedBody || BODY_PLACEHOLDER;
  const titleLine = card.slots === 'title-body' ? `#### ${card.defaultTitle}\n\n` : '';
  const markdown = `:::ogzh-card ${card.id}\n${titleLine}${body}\n:::`;
  const focusedText = card.slots === 'title-body' ? card.defaultTitle : body;
  const focusStart = markdown.indexOf(focusedText);
  return {
    markdown,
    focusStart,
    focusEnd: focusStart + focusedText.length
  };
}
