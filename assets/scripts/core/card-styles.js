const BODY_PLACEHOLDER = '在这里输入卡片内容';
const HISTORY_DOCUMENT_BODY = [
  '- 第一版方案 ｜ 2026.08.12',
  '- 第二版方案 ｜ 2026.08.18',
  '- 当前版本 ｜ 2026.08.22'
].join('\n');
const CARD_OPENER_PATTERN = /^:::ogzh-card\s+([a-z0-9-]+)\s*$/;
const CARD_CLOSER_PATTERN = /^:::\s*$/;
const FORBIDDEN_TOKEN_REASONS = Object.freeze({
  heading_open: '选区包含标题，请选择普通段落或列表项。',
  image: '选区包含图片，请单独保留图片。',
  table_open: '选区包含表格，请选择普通段落或列表项。',
  fence: '选区包含代码块，请单独保留代码块。',
  code_block: '选区包含代码块，请单独保留代码块。',
  blockquote_open: '选区包含引用块，请选择普通段落或列表项。',
  html_block: '选区包含原始 HTML，请先转换为普通 Markdown。',
  html_inline: '选区包含原始 HTML，请先转换为普通 Markdown。',
  math_block: '选区包含公式块，请单独保留公式块。',
  hr: '选区包含分割线，请选择分割线两侧的内容。'
});

const defineCard = (item) => Object.freeze({ animated: false, ...item });

/**
 * 卡片场景分类（选择器分组 tab）。
 * 分类越细，用户在 24 张卡片里定位越准；全部卡片必须归属一个分类。
 */
export const CARD_CATEGORIES = Object.freeze([
  { id: 'callout', name: '重点提示' },
  { id: 'quote', name: '金句摘录' },
  { id: 'summary', name: '结论复盘' },
  { id: 'process', name: '步骤流程' },
  { id: 'list', name: '清单记录' },
  { id: 'heading', name: '标题正文' }
]);

export const CARD_STYLES = Object.freeze([
  // ── 重点提示 ──────────────────────────────────────────
  { id: 'minimal-outline', name: '极简框线卡', slots: 'body', preview: '清晰陈述', category: 'callout' },
  { id: 'soft-fill', name: '柔和底色卡', slots: 'body', preview: '温和提示', category: 'callout' },
  { id: 'top-rule', name: '顶线观点卡', slots: 'body', preview: '核心观点', category: 'callout' },
  { id: 'folded-note', name: '折角便签卡', slots: 'body', preview: '记住这一件事', category: 'callout' },
  { id: 'soft-halo', name: '柔光晕染卡', slots: 'body', preview: '让结论先被看见', category: 'callout' },
  {
    id: 'warning-alert',
    name: '警示注意卡',
    slots: 'body',
    preview: '这里存在需要注意的边界或风险',
    category: 'callout'
  },
  {
    id: 'corner-badge',
    name: '角标提醒卡',
    slots: 'title-body',
    defaultTitle: '特别推荐',
    preview: '这里有一条值得注意的内容',
    category: 'callout'
  },
  // ── 金句摘录 ──────────────────────────────────────────
  { id: 'quote-frame', name: '引号金句卡', slots: 'body', preview: '一句值得记住的话', category: 'quote' },
  { id: 'diagonal-note', name: '斜纹注释卡', slots: 'body', preview: '这里有一个重要边界', category: 'quote' },
  { id: 'bracket-focus', name: '括号观点卡', slots: 'body', preview: '产品不是功能的集合', category: 'quote' },
  {
    id: 'highlight-sweep',
    name: '高光摘录卡',
    slots: 'title-body',
    defaultTitle: '关键结论',
    preview: '先定义问题，再讨论答案',
    category: 'quote',
    animated: true
  },
  // ── 结论复盘 ──────────────────────────────────────────
  { id: 'solid-contrast', name: '实色反差卡', slots: 'body', preview: '强提醒', category: 'summary' },
  {
    id: 'numbered-conclusion',
    name: '编号结论卡',
    slots: 'title-body',
    defaultTitle: '01 阶段结论',
    preview: '01 阶段结论',
    category: 'summary'
  },
  {
    id: 'split-index',
    name: '双色索引卡',
    slots: 'title-body',
    defaultTitle: '01 阶段复盘',
    preview: '阶段摘要',
    category: 'summary'
  },
  { id: 'dark-contrast', name: '深色反差卡', slots: 'body', preview: '在深色里强调关键信息', category: 'summary' },
  // ── 步骤流程 ──────────────────────────────────────────
  { id: 'paper-grid', name: '细格纸纹卡', slots: 'body', preview: '拆成可以验证的步骤', category: 'process' },
  {
    id: 'step-relay',
    name: '步骤接力卡',
    slots: 'title-body',
    defaultTitle: '三步完成',
    preview: '从洞察走到验证',
    category: 'process',
    animated: true
  },
  {
    id: 'relationship-weave',
    name: '关系编织卡',
    slots: 'title-body',
    defaultTitle: '系统关系',
    preview: '真正的价值来自系统协同',
    category: 'process',
    animated: true
  },
  // ── 清单记录 ──────────────────────────────────────────
  {
    id: 'history-document',
    name: '历史文档卡',
    slots: 'title-list',
    defaultTitle: '历史文档',
    preview: '第一版方案 ｜ 2026.08.12',
    category: 'list',
    animated: true
  },
  {
    id: 'check-list',
    name: '圆点清单卡',
    slots: 'title-list',
    defaultTitle: '要点清单',
    preview: '第一项要点',
    category: 'list'
  },
  {
    id: 'timeline',
    name: '时间轴卡',
    slots: 'title-list',
    defaultTitle: '时间轴',
    preview: '阶段一：从零到一',
    category: 'list'
  },
  {
    id: 'index-badge',
    name: '序号徽章卡',
    slots: 'title-list',
    defaultTitle: '执行清单',
    preview: '第一步：确认目标',
    category: 'list'
  },
  // ── 标题正文 ──────────────────────────────────────────
  {
    id: 'capsule-title',
    name: '胶囊标题卡',
    slots: 'title-body',
    defaultTitle: '核心观点',
    preview: '标题与正文',
    category: 'heading'
  },
  {
    id: 'bookmark-reminder',
    name: '书签提醒卡',
    slots: 'title-body',
    defaultTitle: '请注意',
    preview: '请先确认这个前置条件',
    category: 'heading',
    animated: true
  }
].map(defineCard));

const LEGACY_CARD_STYLES = Object.freeze([
  { id: 'accent-bar', name: '左线强调卡', slots: 'body', preview: '重点内容', legacy: true },
  { id: 'double-frame', name: '双层框线卡', slots: 'body', preview: '重点信息', legacy: true },
  {
    id: 'label-title',
    name: '标签标题卡',
    slots: 'title-body',
    defaultTitle: '核心观点',
    preview: '标签与正文',
    legacy: true
  }
].map(defineCard));

const CARD_STYLE_BY_ID = new Map(
  [...CARD_STYLES, ...LEGACY_CARD_STYLES].map((item) => [item.id, item])
);

const DEFAULT_CARD_TOKENS = Object.freeze({
  accent: '#576b95',
  body: '#262626',
  muted: '#666666',
  line: '#d9d9d9',
  soft: '#f6f7f9',
  surface: '#ffffff'
});
const SRGB_LINEAR_THRESHOLD = 0.04045;

const BORDER_COLOR_PROPERTIES = Object.freeze([
  'border-left-color',
  'border-left',
  'border-color',
  'border',
  'border-bottom-color',
  'border-bottom',
  'border-top-color',
  'border-top'
]);
const BACKGROUND_COLOR_PROPERTIES = Object.freeze(['background-color', 'background']);

function normalizeColor(value) {
  if (typeof value !== 'string') return null;
  const color = value.trim().toLowerCase();
  const shortHex = /^#([0-9a-f]{3})$/.exec(color);
  if (shortHex) {
    return `#${Array.from(shortHex[1], (digit) => digit + digit).join('')}`;
  }
  if (/^#[0-9a-f]{6}$/.test(color)) return color;
  return null;
}

function cssDeclarations(styleText) {
  if (typeof styleText !== 'string') return [];
  return styleText.split(';').flatMap((declaration) => {
    const colon = declaration.indexOf(':');
    if (colon < 1) return [];
    return [[
      declaration.slice(0, colon).trim().toLowerCase(),
      declaration.slice(colon + 1).trim().replace(/\s*!important\s*$/i, '')
    ]];
  });
}

function colorFromDeclaration(value, property) {
  const isBorderShorthand = property.startsWith('border') && !property.endsWith('-color');
  if (!isBorderShorthand) {
    return normalizeColor(value);
  }

  const border = /^(?:0|(?:\d+(?:\.\d+)?|\.\d+)(?:px|em|rem|pt))\s+(?:none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)\s+(#[0-9a-f]{3}|#[0-9a-f]{6})$/i.exec(value);
  return border ? normalizeColor(border[1]) : null;
}

function colorFromStyle(styleText, properties) {
  const declarations = cssDeclarations(styleText);
  for (const property of properties) {
    const declaration = declarations.findLast(([name]) => name === property);
    if (!declaration) continue;
    const color = colorFromDeclaration(declaration[1], property);
    if (color) return color;
  }
  return null;
}

function colorFromSelectors(styles, candidates) {
  for (const [selector, properties] of candidates) {
    const color = colorFromStyle(styles?.[selector], properties);
    if (color) return color;
  }
  return null;
}

export function resolveCardTokens(styleConfig) {
  const gzh = styleConfig?.gzh || {};
  const styles = styleConfig?.styles || {};
  const accentFromStyles = colorFromSelectors(styles, [
    ['h2', BORDER_COLOR_PROPERTIES],
    ['h1', BORDER_COLOR_PROPERTIES],
    ['blockquote', BORDER_COLOR_PROPERTIES],
    ['h2', BACKGROUND_COLOR_PROPERTIES],
    ['h1', BACKGROUND_COLOR_PROPERTIES],
    ['blockquote', BACKGROUND_COLOR_PROPERTIES],
    ['h2', ['color']],
    ['h1', ['color']],
    ['blockquote', ['color']]
  ]);
  const bodyFromStyles = colorFromSelectors(styles, [
    ['p', ['color']],
    ['container', ['color']]
  ]);
  const mutedFromStyles = colorFromSelectors(styles, [
    ['em', ['color']],
    ['blockquote', ['color']]
  ]);
  const lineFromStyles = colorFromSelectors(styles, [
    ['table', BORDER_COLOR_PROPERTIES],
    ['table', BACKGROUND_COLOR_PROPERTIES],
    ['td', BORDER_COLOR_PROPERTIES],
    ['td', BACKGROUND_COLOR_PROPERTIES],
    ['hr', BORDER_COLOR_PROPERTIES],
    ['hr', BACKGROUND_COLOR_PROPERTIES]
  ]);
  const softFromStyles = colorFromSelectors(styles, [
    ['blockquote', BACKGROUND_COLOR_PROPERTIES],
    ['th', BACKGROUND_COLOR_PROPERTIES],
    ['code', BACKGROUND_COLOR_PROPERTIES]
  ]);
  const surfaceFromStyles = colorFromSelectors(styles, [
    ['container', BACKGROUND_COLOR_PROPERTIES]
  ]);

  return {
    accent: normalizeColor(gzh.accent) || accentFromStyles || DEFAULT_CARD_TOKENS.accent,
    body: normalizeColor(gzh.body) || bodyFromStyles || DEFAULT_CARD_TOKENS.body,
    muted: normalizeColor(gzh.muted) || mutedFromStyles || DEFAULT_CARD_TOKENS.muted,
    line: normalizeColor(gzh.line) || lineFromStyles || DEFAULT_CARD_TOKENS.line,
    soft: normalizeColor(gzh.soft) || softFromStyles || DEFAULT_CARD_TOKENS.soft,
    surface: normalizeColor(gzh.bg) || surfaceFromStyles || DEFAULT_CARD_TOKENS.surface
  };
}

function normalizedTokenSet(tokens) {
  return Object.fromEntries(Object.entries(DEFAULT_CARD_TOKENS).map(([role, fallback]) => [
    role,
    normalizeColor(tokens?.[role]) || fallback
  ]));
}

function relativeLuminance(color) {
  const normalized = normalizeColor(color);
  if (!normalized) return null;
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return value <= SRGB_LINEAR_THRESHOLD
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrastRatio(colorA, colorB) {
  const luminanceA = relativeLuminance(colorA);
  const luminanceB = relativeLuminance(colorB);
  if (luminanceA === null || luminanceB === null) return 0;
  const lighter = Math.max(luminanceA, luminanceB);
  const darker = Math.min(luminanceA, luminanceB);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgbChannels(color) {
  const normalized = normalizeColor(color);
  if (!normalized) return null;
  return [1, 3, 5].map((offset) =>
    Number.parseInt(normalized.slice(offset, offset + 2), 16)
  );
}

function previewChannels(color) {
  const source = rgbChannels(color);
  if (!source) return null;
  const clamp = (value) => Math.min(255, Math.max(0, value));
  const [r, g, b] = source.map((channel) => 255 - channel);
  return [
    clamp(-0.574 * r + 1.43 * g + 0.144 * b),
    clamp(0.426 * r + 0.43 * g + 0.144 * b),
    clamp(0.426 * r + 1.43 * g - 0.856 * b)
  ];
}

function channelLuminance(channels) {
  const linear = channels.map((channel) => {
    const normalized = channel / 255;
    return normalized <= SRGB_LINEAR_THRESHOLD
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function channelContrast(channelsA, channelsB) {
  const luminanceA = channelLuminance(channelsA);
  const luminanceB = channelLuminance(channelsB);
  return (Math.max(luminanceA, luminanceB) + 0.05) /
    (Math.min(luminanceA, luminanceB) + 0.05);
}

function previewContrastRatio(foreground, background) {
  const transformedForeground = previewChannels(foreground);
  const transformedBackground = previewChannels(background);
  if (!transformedForeground || !transformedBackground) return 0;
  return channelContrast(transformedForeground, transformedBackground);
}

function minimumPairContrast(foreground, background, includePreview) {
  const light = contrastRatio(foreground, background);
  return includePreview
    ? Math.min(light, previewContrastRatio(foreground, background))
    : light;
}

function readableForeground(foreground, background, includePreview) {
  if (minimumPairContrast(foreground, background, includePreview) >= 4.5) {
    return foreground;
  }
  const fallbacks = ['#000000', '#ffffff']
    .map((color) => ({
      color,
      contrast: minimumPairContrast(color, background, includePreview)
    }))
    .sort((left, right) => right.contrast - left.contrast);
  return fallbacks[0].color;
}

function channelsToHex(channels) {
  return `#${channels.map((channel) =>
    Math.round(channel).toString(16).padStart(2, '0')
  ).join('')}`;
}

function adjustedSolidPair(foreground, background, includePreview) {
  const foregroundCandidates = [foreground, '#000000', '#ffffff'];
  for (const candidate of foregroundCandidates) {
    if (minimumPairContrast(candidate, background, includePreview) >= 4.5) {
      return { foreground: candidate, background };
    }
  }

  const source = rgbChannels(background);
  const adjustments = [
    { target: [0, 0, 0], foreground: '#ffffff' },
    { target: [255, 255, 255], foreground: '#000000' }
  ].flatMap(({ target, foreground: adjustedForeground }) => {
    for (let step = 1; step <= 255; step += 1) {
      const ratio = step / 255;
      const adjustedBackground = channelsToHex(source.map((channel, index) =>
        channel + (target[index] - channel) * ratio
      ));
      if (minimumPairContrast(adjustedForeground, adjustedBackground, includePreview) < 4.5) {
        continue;
      }
      const adjustedChannels = rgbChannels(adjustedBackground);
      const distance = Math.hypot(...source.map((channel, index) =>
        channel - adjustedChannels[index]
      ));
      return [{
        foreground: adjustedForeground,
        background: adjustedBackground,
        distance
      }];
    }
    return [];
  });
  adjustments.sort((left, right) => left.distance - right.distance);
  return adjustments[0];
}

function contrastPair(role, foreground, background) {
  return { role, foreground, background, minimum: 4.5 };
}

function presentationResult({
  containerStyle,
  titleStyle = '',
  headingStyle = '',
  bodyStyle,
  bodyContrastRole = 'body',
  headingContrastRole = bodyContrastRole,
  decoration = 'none',
  rows = null,
  solidBackground = null,
  solidText = null,
  contrastPairs
}) {
  return {
    containerStyle,
    titleStyle,
    headingStyle,
    bodyStyle,
    bodyContrastRole,
    headingContrastRole,
    decoration,
    rows,
    solidBackground,
    solidText,
    contrastPairs
  };
}

export function buildCardPresentation(styleId, tokenInput, options = {}) {
  if (!getCardStyle(styleId)) return null;

  const tokens = normalizedTokenSet(tokenInput);
  const includePreview = options?.nativeDark !== true;
  const common = 'margin: 20px 0; padding: 18px 20px; box-sizing: border-box; max-width: 100%; overflow-wrap: break-word;';
  const bodyOnSoft = readableForeground(tokens.body, tokens.soft, includePreview);
  const bodyOnSurface = readableForeground(tokens.body, tokens.surface, includePreview);
  const solid = adjustedSolidPair(tokens.surface, tokens.accent, includePreview);
  const solidBackground = solid.background;
  const solidText = solid.foreground;
  const bodyStyle = (foreground) =>
    `margin: 0 !important; color: ${foreground} !important; line-height: 1.75 !important; text-align: left; overflow-wrap: break-word;`;
  const bodyPair = (foreground, background) =>
    contrastPair('body', foreground, background);
  const headingStyle = (foreground, margin = '0 0 12px') =>
    `display: block; margin: ${margin} !important; padding: 0 !important; background: transparent !important; background-color: transparent !important; color: ${foreground} !important; border: none !important; border-top: none !important; border-right: none !important; border-bottom: none !important; border-left: none !important; border-radius: 0 !important; font-size: 16px; line-height: 1.5 !important;`;

  switch (styleId) {
    case 'accent-bar':
      return presentationResult({
        containerStyle: `${common} border-left: 4px solid ${tokens.accent}; background-color: ${tokens.soft}; border-radius: 6px; color: ${bodyOnSoft} !important;`,
        bodyStyle: bodyStyle(bodyOnSoft),
        contrastPairs: [bodyPair(bodyOnSoft, tokens.soft)]
      });
    case 'minimal-outline':
      return presentationResult({
        containerStyle: `${common} border: 1px solid ${tokens.line}; background-color: transparent; border-radius: 6px; color: ${bodyOnSurface} !important;`,
        bodyStyle: bodyStyle(bodyOnSurface),
        contrastPairs: [bodyPair(bodyOnSurface, tokens.surface)]
      });
    case 'soft-fill':
      return presentationResult({
        containerStyle: `${common} border: none; background-color: ${tokens.soft}; border-radius: 14px; color: ${bodyOnSoft} !important;`,
        bodyStyle: bodyStyle(bodyOnSoft),
        contrastPairs: [bodyPair(bodyOnSoft, tokens.soft)]
      });
    case 'quote-frame': {
      const quoteText = readableForeground(
        tokens.accent,
        tokens.surface,
        includePreview
      );
      return presentationResult({
        containerStyle: `${common} border: 1px solid ${tokens.line}; background-color: ${tokens.surface}; border-radius: 10px; color: ${bodyOnSurface} !important;`,
        bodyStyle: bodyStyle(bodyOnSurface),
        decoration: 'quote',
        contrastPairs: [
          bodyPair(bodyOnSurface, tokens.surface),
          contrastPair('quote-mark', quoteText, tokens.surface)
        ]
      });
    }
    case 'top-rule':
      return presentationResult({
        containerStyle: `${common} border-top: 4px solid ${tokens.accent}; background-color: ${tokens.soft}; border-radius: 0 0 8px 8px; color: ${bodyOnSoft} !important;`,
        bodyStyle: bodyStyle(bodyOnSoft),
        contrastPairs: [bodyPair(bodyOnSoft, tokens.soft)]
      });
    case 'double-frame':
      return presentationResult({
        containerStyle: `${common} border: 3px double ${tokens.line}; background-color: ${tokens.surface}; border-radius: 8px; color: ${bodyOnSurface} !important;`,
        bodyStyle: bodyStyle(bodyOnSurface),
        contrastPairs: [bodyPair(bodyOnSurface, tokens.surface)]
      });
    case 'solid-contrast':
      return presentationResult({
        containerStyle: `${common} border: none; background-color: ${solidBackground}; border-radius: 10px; color: ${solidText} !important;`,
        bodyStyle: bodyStyle(solidText),
        bodyContrastRole: 'solid-fill',
        solidBackground,
        solidText,
        contrastPairs: [contrastPair('solid-fill', solidText, solidBackground)]
      });
    case 'capsule-title': {
      const headingStyle = `display: inline-block; margin: 0 auto 12px !important; padding: 5px 14px !important; background: ${solidBackground} !important; background-color: ${solidBackground} !important; color: ${solidText} !important; border: none !important; border-top: none !important; border-right: none !important; border-bottom: none !important; border-left: none !important; border-radius: 999px !important; font-size: 15px; line-height: 1.5 !important;`;
      return presentationResult({
        containerStyle: `${common} border: 1px solid ${tokens.line}; background-color: ${tokens.surface}; border-radius: 12px; color: ${bodyOnSurface} !important; text-align: center;`,
        titleStyle: headingStyle,
        headingStyle,
        bodyStyle: bodyStyle(bodyOnSurface),
        headingContrastRole: 'capsule-title',
        solidBackground,
        solidText,
        contrastPairs: [
          bodyPair(bodyOnSurface, tokens.surface),
          contrastPair('capsule-title', solidText, solidBackground)
        ]
      });
    }
    case 'label-title': {
      const headingStyle = `display: block; margin: -18px -20px 14px !important; padding: 10px 20px !important; background: ${solidBackground} !important; background-color: ${solidBackground} !important; color: ${solidText} !important; border: none !important; border-top: none !important; border-right: none !important; border-bottom: none !important; border-left: none !important; border-radius: 8px 8px 0 0 !important; font-size: 16px; line-height: 1.5 !important;`;
      return presentationResult({
        containerStyle: `${common} border: none; background-color: ${tokens.soft}; border-radius: 8px; color: ${bodyOnSoft} !important;`,
        titleStyle: headingStyle,
        headingStyle,
        bodyStyle: bodyStyle(bodyOnSoft),
        headingContrastRole: 'title-strip',
        solidBackground,
        solidText,
        contrastPairs: [
          bodyPair(bodyOnSoft, tokens.soft),
          contrastPair('title-strip', solidText, solidBackground)
        ]
      });
    }
    case 'numbered-conclusion': {
      const titleText = readableForeground(
        tokens.body,
        tokens.surface,
        includePreview
      );
      const headingStyle = `display: inline-block; margin: 0 0 12px !important; padding: 0 !important; background: transparent !important; background-color: transparent !important; color: ${titleText} !important; border: none !important; border-top: none !important; border-right: none !important; border-bottom: none !important; border-left: none !important; border-radius: 0 !important; font-size: 16px; line-height: 1.5 !important;`;
      return presentationResult({
        containerStyle: `${common} border: 1px solid ${tokens.line}; background-color: ${tokens.surface}; border-radius: 8px; color: ${bodyOnSurface} !important;`,
        titleStyle: `display: inline-block; margin: 0 10px 12px 0 !important; padding: 4px 9px; background-color: ${solidBackground} !important; color: ${solidText} !important; border-radius: 6px; font-weight: 700; line-height: 1.4 !important;`,
        headingStyle,
        bodyStyle: bodyStyle(bodyOnSurface),
        headingContrastRole: 'title',
        decoration: 'number',
        solidBackground,
        solidText,
        contrastPairs: [
          bodyPair(bodyOnSurface, tokens.surface),
          contrastPair('title', titleText, tokens.surface),
          contrastPair('number-badge', solidText, solidBackground)
        ]
      });
    }
    case 'soft-halo':
      return presentationResult({
        containerStyle: `${common} border: 1px solid ${tokens.line}; background-color: ${tokens.soft}; border-radius: 20px 6px 20px 6px; color: ${bodyOnSoft} !important;`,
        bodyStyle: bodyStyle(bodyOnSoft),
        decoration: 'soft-halo',
        contrastPairs: [bodyPair(bodyOnSoft, tokens.soft)]
      });
    case 'paper-grid':
      return presentationResult({
        containerStyle: `${common} border: 1px solid ${tokens.line}; background-color: ${tokens.surface}; border-radius: 10px; color: ${bodyOnSurface} !important; box-shadow: inset 0 0 0 4px ${tokens.soft};`,
        bodyStyle: bodyStyle(bodyOnSurface),
        decoration: 'paper-grid',
        contrastPairs: [bodyPair(bodyOnSurface, tokens.surface)]
      });
    case 'diagonal-note':
      return presentationResult({
        containerStyle: `${common} border-left: 7px solid ${tokens.accent}; border-top: 1px solid ${tokens.line}; border-right: 1px solid ${tokens.line}; border-bottom: 1px solid ${tokens.line}; background-color: ${tokens.soft}; border-radius: 3px 14px 14px 3px; color: ${bodyOnSoft} !important;`,
        bodyStyle: bodyStyle(bodyOnSoft),
        decoration: 'diagonal-note',
        contrastPairs: [bodyPair(bodyOnSoft, tokens.soft)]
      });
    case 'folded-note':
      return presentationResult({
        containerStyle: `${common} border: 1px solid ${tokens.line}; background-color: ${tokens.soft}; border-radius: 6px; color: ${bodyOnSoft} !important; box-shadow: 4px 5px 0 ${tokens.line};`,
        bodyStyle: bodyStyle(bodyOnSoft),
        decoration: 'folded-note',
        contrastPairs: [bodyPair(bodyOnSoft, tokens.soft)]
      });
    case 'bracket-focus':
      return presentationResult({
        containerStyle: `${common} padding-left: 30px; padding-right: 30px; border: none; background-color: ${tokens.surface}; color: ${bodyOnSurface} !important;`,
        bodyStyle: bodyStyle(bodyOnSurface),
        decoration: 'bracket-focus',
        contrastPairs: [bodyPair(bodyOnSurface, tokens.surface)]
      });
    case 'split-index': {
      const titleText = readableForeground(tokens.body, tokens.surface, includePreview);
      const title = headingStyle(titleText, '0 0 14px');
      return presentationResult({
        containerStyle: `${common} border: 1px solid ${tokens.line}; background-color: ${tokens.surface}; border-radius: 13px; color: ${bodyOnSurface} !important;`,
        titleStyle: title,
        headingStyle: title,
        bodyStyle: bodyStyle(bodyOnSurface),
        headingContrastRole: 'split-title',
        decoration: 'split-index',
        solidBackground,
        solidText,
        contrastPairs: [
          bodyPair(bodyOnSurface, tokens.surface),
          contrastPair('split-title', titleText, tokens.surface)
        ]
      });
    }
    case 'highlight-sweep': {
      const titleText = readableForeground(tokens.body, tokens.surface, includePreview);
      const title = headingStyle(titleText);
      return presentationResult({
        containerStyle: `${common} border: 1px solid ${tokens.line}; background-color: ${tokens.surface}; border-radius: 12px; color: ${bodyOnSurface} !important;`,
        titleStyle: title,
        headingStyle: title,
        bodyStyle: bodyStyle(bodyOnSurface),
        headingContrastRole: 'title',
        decoration: 'highlight',
        contrastPairs: [bodyPair(bodyOnSurface, tokens.surface), contrastPair('title', titleText, tokens.surface)]
      });
    }
    case 'step-relay': {
      const titleText = readableForeground(tokens.body, tokens.soft, includePreview);
      const title = headingStyle(titleText);
      return presentationResult({
        containerStyle: `${common} padding-left: 88px; border: none; background-color: ${tokens.soft}; border-radius: 13px; color: ${bodyOnSoft} !important;`,
        titleStyle: title,
        headingStyle: title,
        bodyStyle: bodyStyle(bodyOnSoft),
        headingContrastRole: 'title',
        decoration: 'steps',
        contrastPairs: [bodyPair(bodyOnSoft, tokens.soft), contrastPair('title', titleText, tokens.soft)]
      });
    }
    case 'relationship-weave': {
      const titleText = readableForeground(tokens.body, tokens.soft, includePreview);
      const title = headingStyle(titleText);
      return presentationResult({
        containerStyle: `${common} padding-right: 148px; border: 1px solid ${tokens.line}; background-color: ${tokens.soft}; border-radius: 7px 22px 7px 7px; color: ${bodyOnSoft} !important;`,
        titleStyle: title,
        headingStyle: title,
        bodyStyle: bodyStyle(bodyOnSoft),
        headingContrastRole: 'title',
        decoration: 'relationship',
        contrastPairs: [bodyPair(bodyOnSoft, tokens.soft), contrastPair('title', titleText, tokens.soft)]
      });
    }
    case 'bookmark-reminder': {
      const titleText = readableForeground(tokens.body, tokens.surface, includePreview);
      const title = headingStyle(titleText);
      return presentationResult({
        containerStyle: `${common} padding-right: 84px; border: 1px solid ${tokens.line}; background-color: ${tokens.surface}; border-radius: 12px; color: ${bodyOnSurface} !important;`,
        titleStyle: title,
        headingStyle: title,
        bodyStyle: bodyStyle(bodyOnSurface),
        headingContrastRole: 'title',
        decoration: 'bookmark',
        contrastPairs: [bodyPair(bodyOnSurface, tokens.surface), contrastPair('title', titleText, tokens.surface)]
      });
    }
    case 'warning-alert':
      return presentationResult({
        containerStyle: `${common} border-left: 5px solid ${tokens.accent}; border-top: 1px solid ${tokens.line}; border-right: 1px solid ${tokens.line}; border-bottom: 1px solid ${tokens.line}; background-color: ${tokens.soft}; border-radius: 3px 12px 12px 3px; color: ${bodyOnSoft} !important;`,
        bodyStyle: bodyStyle(bodyOnSoft),
        decoration: 'alert',
        contrastPairs: [bodyPair(bodyOnSoft, tokens.soft)]
      });
    case 'dark-contrast': {
      const darkBackground = '#26292f';
      const darkText = '#f2f3f5';
      return presentationResult({
        containerStyle: `${common} border: 1px solid rgba(255,255,255,0.14); border-left: 4px solid ${tokens.accent}; background-color: ${darkBackground}; border-radius: 10px; color: ${darkText} !important;`,
        bodyStyle: bodyStyle(darkText),
        contrastPairs: [bodyPair(darkText, darkBackground)]
      });
    }
    case 'corner-badge': {
      const titleText = readableForeground(tokens.body, tokens.surface, includePreview);
      const title = headingStyle(titleText);
      return presentationResult({
        containerStyle: `${common} padding-right: 64px; border: 1px solid ${tokens.line}; background-color: ${tokens.surface}; border-radius: 12px; color: ${bodyOnSurface} !important;`,
        titleStyle: title,
        headingStyle: title,
        bodyStyle: bodyStyle(bodyOnSurface),
        headingContrastRole: 'title',
        decoration: 'corner',
        contrastPairs: [bodyPair(bodyOnSurface, tokens.surface), contrastPair('title', titleText, tokens.surface)]
      });
    }
    case 'check-list': {
      const titleText = readableForeground(tokens.body, tokens.soft, includePreview);
      const title = headingStyle(titleText);
      return presentationResult({
        containerStyle: `${common} border: 1px solid ${tokens.line}; background-color: ${tokens.soft}; border-radius: 12px; color: ${bodyOnSoft} !important;`,
        titleStyle: title,
        headingStyle: title,
        bodyStyle: bodyStyle(bodyOnSoft),
        headingContrastRole: 'title',
        decoration: 'check',
        rows: 'check',
        contrastPairs: [bodyPair(bodyOnSoft, tokens.soft), contrastPair('title', titleText, tokens.soft)]
      });
    }
    case 'timeline': {
      const titleText = readableForeground(tokens.body, tokens.surface, includePreview);
      const title = headingStyle(titleText);
      return presentationResult({
        containerStyle: `${common} border-top: 2px solid ${tokens.accent}; border-right: 1px solid ${tokens.line}; border-bottom: 1px solid ${tokens.line}; border-left: 1px solid ${tokens.line}; background-color: ${tokens.surface}; border-radius: 6px 6px 10px 10px; color: ${bodyOnSurface} !important;`,
        titleStyle: title,
        headingStyle: title,
        bodyStyle: bodyStyle(bodyOnSurface),
        headingContrastRole: 'title',
        decoration: 'none',
        rows: 'timeline',
        contrastPairs: [bodyPair(bodyOnSurface, tokens.surface), contrastPair('title', titleText, tokens.surface)]
      });
    }
    case 'index-badge': {
      const titleText = readableForeground(tokens.body, tokens.surface, includePreview);
      const title = headingStyle(titleText);
      return presentationResult({
        containerStyle: `${common} border: 1px solid ${tokens.line}; background-color: ${tokens.surface}; border-radius: 14px; color: ${bodyOnSurface} !important;`,
        titleStyle: title,
        headingStyle: title,
        bodyStyle: bodyStyle(bodyOnSurface),
        headingContrastRole: 'title',
        decoration: 'none',
        rows: 'index',
        contrastPairs: [bodyPair(bodyOnSurface, tokens.surface), contrastPair('title', titleText, tokens.surface)]
      });
    }
    case 'history-document': {
      const titleText = readableForeground(tokens.body, tokens.surface, includePreview);
      const title = `${headingStyle(titleText, '0 0 17px')} min-height: 31px; padding-top: 3px !important;`;
      return presentationResult({
        containerStyle: `${common} padding: 29px 25px 22px; border: 1px solid ${tokens.line}; background-color: ${tokens.surface}; border-radius: 4px 14px 4px 4px; color: ${bodyOnSurface} !important; box-shadow: 4px 5px 0 ${tokens.line};`,
        titleStyle: title,
        headingStyle: title,
        bodyStyle: bodyStyle(bodyOnSurface),
        headingContrastRole: 'title',
        decoration: 'documents',
        contrastPairs: [bodyPair(bodyOnSurface, tokens.surface), contrastPair('title', titleText, tokens.surface)]
      });
    }
    default:
      return null;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function quoteDecorationStyles(presentation) {
  const quotePair = presentation.contrastPairs.find(({ role }) => role === 'quote-mark');
  if (!quotePair) return null;

  const common = `color: ${quotePair.foreground} !important; font-size: 30px; line-height: 1;`;
  return {
    opening: `display: inline-block; ${common} margin: 0 8px 4px 0;`,
    closing: `display: block; ${common} margin: 4px 0 0; text-align: right;`
  };
}

const ANIMATION_CHILDREN = Object.freeze({
  highlight: ['highlight'],
  steps: ['step-1', 'step-2', 'step-3'],
  relationship: ['node-1', 'line-1', 'node-2', 'line-2', 'node-3', 'line-3'],
  bookmark: ['bookmark'],
  documents: ['page-back', 'page-front']
});

function cardDecorationSpec(kind, tokens, presentation) {
  const solidBackground = presentation.solidBackground || tokens.accent;
  const solidText = presentation.solidText || readableForeground(tokens.surface, solidBackground, false);
  const specs = {
    alert: {
      style: 'display: block; margin: 0 0 12px; line-height: 0;',
      parts: [{
        name: 'alert-badge',
        text: '注意',
        style: `display: inline-block; box-sizing: border-box; min-width: 56px; padding: 2px 10px; background-color: ${solidBackground}; color: ${solidText}; border-radius: 999px; font-size: 12px; font-weight: 700; line-height: 20px; text-align: center;`
      }]
    },
    corner: {
      style: 'display: block; float: right; width: 26px; height: 26px; margin: -18px -64px 0 16px; line-height: 0;',
      parts: [{
        name: 'corner-badge',
        text: '荐',
        style: `display: block; box-sizing: border-box; width: 26px; height: 26px; padding-top: 3px; background-color: ${solidBackground}; color: ${solidText}; border-radius: 8px; font-size: 13px; font-weight: 700; line-height: 20px; text-align: center;`
      }]
    },
    check: {
      style: 'display: block; height: 8px; margin: 0 0 13px; line-height: 0;',
      parts: Array.from({ length: 3 }, (_, index) => ({
        name: `check-dot-${index + 1}`,
        style: `display: inline-block; width: 8px; height: 8px; margin-right: 6px; background-color: ${index === 0 ? tokens.accent : tokens.line}; border-radius: 50%;`
      }))
    },
    'soft-halo': {
      style: 'display: block; height: 8px; margin: 0 0 14px; line-height: 0;',
      parts: [0.24, 0.5, 0.82].map((opacity, index) => ({
        name: `halo-${index + 1}`,
        style: `display: inline-block; width: ${index === 1 ? 22 : 12}px; height: ${index === 1 ? 8 : 6}px; margin-right: 5px; background-color: ${tokens.accent}; border-radius: 999px; opacity: ${opacity};`
      }))
    },
    'paper-grid': {
      style: 'display: block; width: 54px; height: 20px; margin: 0 0 13px; line-height: 0;',
      parts: Array.from({ length: 8 }, (_, index) => ({
        name: `cell-${index + 1}`,
        style: `display: inline-block; box-sizing: border-box; width: 10px; height: 8px; margin: 0 3px 3px 0; border: 1px solid ${index === 5 ? tokens.accent : tokens.line}; border-radius: 2px;`
      }))
    },
    'diagonal-note': {
      style: `display: block; margin: 0 0 12px; color: ${tokens.accent}; font-size: 13px; font-weight: 700; letter-spacing: 3px; line-height: 1;`,
      text: '╱╱╱'
    },
    'folded-note': {
      style: 'display: block; float: right; width: 24px; height: 24px; margin: -18px -20px 8px 12px; line-height: 0;',
      parts: [{
        name: 'fold',
        style: `display: block; width: 24px; height: 24px; background-color: ${tokens.accent}; border-radius: 0 5px 0 18px; opacity: 0.22;`
      }]
    },
    'bracket-focus': {
      style: `display: block; width: 56px; height: 12px; margin: 0 0 13px; border-left: 3px solid ${tokens.accent}; border-right: 3px solid ${tokens.accent}; border-radius: 3px; opacity: 0.72;`
    },
    'split-index': {
      style: `display: block; float: left; box-sizing: border-box; width: 56px; min-height: 56px; margin: 0 14px 8px 0; padding: 16px 8px; background-color: ${solidBackground}; color: ${solidText}; border-radius: 9px 3px 9px 3px; font-size: 15px; font-weight: 700; line-height: 24px; text-align: center;`,
      text: '01'
    },
    highlight: {
      style: `display: block; width: 176px; max-width: 70%; height: 8px; margin: -3px 0 13px; overflow: hidden; background-color: ${tokens.soft}; border-radius: 999px; line-height: 0;`,
      parts: [{ name: 'highlight', style: `display: block; width: 100%; height: 8px; background-color: ${tokens.accent}; border-radius: 999px; opacity: 0.4;` }]
    },
    steps: {
      style: 'display: block; float: left; width: 40px; height: 96px; margin: 0 0 0 -68px; line-height: 0;',
      parts: [1, 2, 3].map((step) => ({
        name: `step-${step}`,
        style: `display: block; box-sizing: border-box; width: 15px; height: 15px; margin: ${step === 1 ? 2 : 16}px auto 0; background-color: ${step === 1 ? tokens.accent : tokens.surface}; border: 2px solid ${tokens.accent}; border-radius: 999px;`
      }))
    },
    relationship: {
      style: `display: block; float: right; width: 110px; min-height: 82px; margin: 0 -128px 0 16px; color: ${tokens.accent}; font-size: 17px; letter-spacing: 1px; line-height: 1.55; text-align: center;`,
      parts: [
        { name: 'node-1', text: '●', style: 'display: inline;' },
        { name: 'line-1', text: '──', style: `display: inline; color: ${tokens.line};` },
        { name: 'node-2', text: '●', style: 'display: inline;' },
        { name: 'line-2', text: '\n╲    ╱\n', style: `display: inline; white-space: pre; color: ${tokens.line};` },
        { name: 'node-3', text: '●', style: 'display: inline;' },
        { name: 'line-3', text: '', style: 'display: inline;' }
      ]
    },
    bookmark: {
      style: 'display: block; float: right; width: 34px; height: 72px; margin: -18px -64px 0 16px; line-height: 0;',
      parts: [{ name: 'bookmark', text: '⌄', style: `display: block; box-sizing: border-box; width: 32px; height: 66px; padding-top: 34px; background-color: ${tokens.accent}; color: ${solidText}; border-radius: 0 0 10px 10px; font-size: 22px; line-height: 24px; text-align: center;` }]
    },
    documents: {
      style: 'display: block; float: left; width: 31px; height: 31px; margin: 0 10px 15px 0; line-height: 0;',
      parts: [
        { name: 'page-back', style: `display: block; float: right; box-sizing: border-box; width: 20px; height: 24px; margin: 2px 1px 0 0; background-color: ${tokens.soft}; border: 1px solid ${tokens.line}; border-radius: 3px;` },
        { name: 'page-front', style: `display: block; float: left; box-sizing: border-box; width: 20px; height: 24px; margin: -20px 0 0 2px; background-color: ${tokens.surface}; border: 1px solid ${tokens.accent}; border-radius: 3px; box-shadow: 2px 2px 0 ${tokens.soft};` }
      ]
    }
  };
  return specs[kind] || null;
}

function renderCardDecorationHtml(kind, tokens, presentation) {
  const spec = cardDecorationSpec(kind, tokens, presentation);
  if (!spec) return '';
  const animation = ANIMATION_CHILDREN[kind]
    ? ` data-ogzh-card-animation="${escapeHtml(kind)}"`
    : '';
  const parts = (spec.parts || []).map((part) =>
    `<i data-ogzh-card-animation-part="${escapeHtml(part.name)}" style="${escapeHtml(part.style)}">${escapeHtml(part.text || '')}</i>`
  ).join('');
  return `<span data-ogzh-card-decoration="${escapeHtml(kind)}"${animation} aria-hidden="true" style="${escapeHtml(spec.style)}">${escapeHtml(spec.text || '')}${parts}</span>`;
}

export function renderCardPreviewHtml(styleId, styleConfig) {
  const card = getCardStyle(styleId);
  if (!card) return '';
  const tokens = resolveCardTokens(styleConfig);
  const presentation = buildCardPresentation(
    styleId,
    tokens,
    { nativeDark: Boolean(normalizeColor(styleConfig?.gzh?.bg)) }
  );
  const containerStyle = escapeHtml(presentation.containerStyle);
  const bodyStyle = escapeHtml(presentation.bodyStyle);
  const headingStyle = escapeHtml(presentation.headingStyle);
  let content;

  if (presentation.decoration === 'quote') {
    const quoteStyles = quoteDecorationStyles(presentation);
    content = `<span data-ogzh-card-decoration="quote-open" aria-hidden="true" style="${escapeHtml(quoteStyles.opening)}">“</span><p style="${bodyStyle}">${escapeHtml(card.preview)}</p><span data-ogzh-card-decoration="quote-close" aria-hidden="true" style="${escapeHtml(quoteStyles.closing)}">”</span>`;
  } else if (presentation.decoration === 'number') {
    const title = card.defaultTitle.trim();
    const titleParts = /^(\d{1,2})\s+(.+)$/.exec(title);
    const badge = titleParts?.[1] || '';
    const visibleTitle = titleParts?.[2] || title;
    const preview = card.preview === card.defaultTitle ? BODY_PLACEHOLDER : card.preview;
    content = `<span data-ogzh-card-decoration="number" aria-hidden="true" style="${escapeHtml(presentation.titleStyle)}">${escapeHtml(badge)}</span><h4 aria-label="${escapeHtml(title)}" style="${headingStyle}">${escapeHtml(visibleTitle)}</h4><p style="${bodyStyle}">${escapeHtml(preview)}</p>`;
  } else if (styleId === 'history-document') {
    const { name, meta } = splitHistoryDocumentItem(card.preview);
    const rowStyles = historyDocumentRowStyles(presentation.bodyStyle, tokens, Boolean(meta));
    content = `<span data-ogzh-card-decoration="history-bar" aria-hidden="true" style="${escapeHtml(historyDocumentBarStyle(tokens))}"></span>` +
      `<h4 style="${headingStyle}">${escapeHtml(card.defaultTitle)}</h4>` +
      `<p aria-label="${escapeHtml(card.preview)}" style="${escapeHtml(`${rowStyles.item} clear: both; border-top: 1px solid ${tokens.line};`)}">` +
      `<span data-ogzh-history-index="true" aria-hidden="true" style="${escapeHtml(rowStyles.index)}">01</span>` +
      `<span data-ogzh-history-name="true" style="${escapeHtml(rowStyles.name)}">${escapeHtml(name)}</span>` +
      `<span data-ogzh-history-meta="true" style="${escapeHtml(rowStyles.metadata)}">${escapeHtml(meta)}</span>` +
      '</p>';
  } else if (presentation.rows) {
    const spec = rowMarkerSpec(presentation.rows, tokens, presentation);
    content = `<h4 style="${headingStyle}">${escapeHtml(card.defaultTitle)}</h4>` +
      `<p aria-label="${escapeHtml(card.preview)}" style="${escapeHtml(spec.item)}">` +
      `<span data-ogzh-row-marker="true" aria-hidden="true" style="${escapeHtml(spec.marker)}">${escapeHtml(spec.markerText(0))}</span>` +
      `${escapeHtml(card.preview)}</p>`;
  } else if (cardHasTitle(card)) {
    content = `<h4 style="${headingStyle}">${escapeHtml(card.defaultTitle)}</h4><p style="${bodyStyle}">${escapeHtml(card.preview)}</p>`;
  } else {
    content = `<p style="${bodyStyle}">${escapeHtml(card.preview)}</p>`;
  }

  if (!['none', 'quote', 'number'].includes(presentation.decoration)) {
    content = `${renderCardDecorationHtml(presentation.decoration, tokens, presentation)}${content}`;
  }

  return `<section data-ogzh-card-preview="${escapeHtml(card.id)}" style="${containerStyle}">${content}</section>`;
}

export function getCardStyle(styleId) {
  return CARD_STYLE_BY_ID.get(styleId) || null;
}

function cardHasTitle(card) {
  return card?.slots === 'title-body' || card?.slots === 'title-list';
}

export function splitHistoryDocumentItem(value) {
  const source = String(value || '').trim();
  const separator = Math.max(source.lastIndexOf('｜'), source.lastIndexOf('|'));
  if (separator < 0) return { name: source, meta: '' };
  return {
    name: source.slice(0, separator).trim(),
    meta: source.slice(separator + 1).trim()
  };
}

function historyDocumentBarStyle(tokens) {
  return `display: block; height: 9px; margin: -29px -25px 20px; border-radius: 4px 14px 0 0; background-color: ${tokens.accent}; background-image: linear-gradient(90deg, ${tokens.accent} 0, ${tokens.accent} 112px, transparent 112px); background-repeat: no-repeat; background-size: 100% 9px;`;
}

/**
 * 行内标记列表的视觉规格（圆点清单 / 时间轴 / 序号徽章）。
 * 只在行首插入 span 标记，不拆分 li 文本，微信复制安全。
 */
function rowMarkerSpec(kind, tokens, presentation = {}) {
  const solidBackground = presentation.solidBackground || tokens.accent;
  const solidText = presentation.solidText
    || readableForeground(tokens.surface, solidBackground, false);
  const common = `${presentation.bodyStyle || ''} display: block; box-sizing: border-box; list-style: none !important; list-style-type: none !important; white-space: normal; overflow-wrap: anywhere;`;
  switch (kind) {
    case 'check':
      return {
        list: 'margin: 0 !important; padding: 0 !important; list-style: none !important; list-style-type: none !important;',
        item: `${common} padding: 8px 0 !important; border-bottom: 1px solid ${tokens.line};`,
        marker: `display: inline-block; width: 12px; height: 12px; margin: 0 10px 0 0; background-color: ${tokens.accent}; border-radius: 999px; vertical-align: middle;`,
        markerText: () => ''
      };
    case 'timeline':
      return {
        list: 'margin: 0 0 0 5px !important; padding: 0 0 0 2px !important; list-style: none !important; list-style-type: none !important;',
        item: `${common} padding: 4px 0 14px 24px !important; border-left: 2px solid ${tokens.line};`,
        marker: `display: inline-block; width: 10px; height: 10px; margin: 5px 10px 0 -29px; background-color: ${tokens.accent}; border-radius: 999px;`,
        markerText: () => ''
      };
    case 'index':
      return {
        list: 'margin: 0 !important; padding: 0 !important; list-style: none !important; list-style-type: none !important;',
        item: `${common} padding: 9px 0 !important; border-bottom: 1px solid ${tokens.line};`,
        marker: `display: inline-block; box-sizing: border-box; width: 22px; height: 22px; margin: 0 10px 0 0; background-color: ${solidBackground}; color: ${solidText}; border-radius: 6px; font-size: 11px; font-weight: 700; line-height: 22px; text-align: center; vertical-align: middle;`,
        markerText: (index) => String(index + 1).padStart(2, '0')
      };
    default:
      return null;
  }
}

function restoreRowMarkers(section) {
  Array.from(section.children).forEach((list) => {
    if (!['UL', 'OL'].includes(list.tagName)) return;
    const state = ROW_MARKER_STATES.get(list);
    if (!state) return;
    state.items.forEach(({ item, style, paragraph, paragraphStyle }) => {
      item.querySelectorAll('[data-ogzh-row-marker]').forEach((marker) => marker.remove());
      restoreInlineStyle(item, style);
      if (paragraph) restoreInlineStyle(paragraph, paragraphStyle);
    });
    restoreInlineStyle(list, state.style);
    ROW_MARKER_STATES.delete(list);
  });
}

function applyRowMarkerList(doc, section, presentation, tokens) {
  const kind = presentation.rows;
  const spec = rowMarkerSpec(kind, tokens, presentation);
  if (!spec) return;

  const list = Array.from(section.children).find((child) => ['UL', 'OL'].includes(child.tagName));
  if (!list) return;

  const items = Array.from(list.children).filter((child) => child.tagName === 'LI');
  const itemStates = items.map((item) => {
    const paragraph = Array.from(item.children).find((child) => child.tagName === 'P') || null;
    return {
      item,
      style: item.getAttribute('style'),
      paragraph,
      paragraphStyle: paragraph?.getAttribute('style') || null
    };
  });
  ROW_MARKER_STATES.set(list, { style: list.getAttribute('style'), items: itemStates });

  itemStates.forEach(({ item, paragraph }, index) => {
    item.querySelectorAll('[data-ogzh-row-marker]').forEach((marker) => marker.remove());
    const marker = doc.createElement('span');
    marker.setAttribute('data-ogzh-row-marker', 'true');
    marker.setAttribute('aria-hidden', 'true');
    marker.textContent = spec.markerText(index);
    applyTrustedStyle(marker, spec.marker);
    const rowContent = paragraph || item;
    rowContent.insertBefore(marker, rowContent.firstChild);
    const last = index === items.length - 1;
    applyTrustedStyle(item, last ? spec.item.replace(/border-bottom:[^;]+;\s*/i, '') : spec.item);
  });
  applyTrustedStyle(list, spec.list);
}

function historyDocumentRowStyles(bodyStyle, tokens, hasMetadata) {
  return {
    list: `clear: both; margin: 0 !important; padding: 0 !important; border-top: 1px solid ${tokens.line}; list-style: none !important; list-style-type: none !important;`,
    item: `${bodyStyle} display: block; box-sizing: border-box; min-height: 45px; padding: 10px 0 !important; border-bottom: 1px solid ${tokens.line}; list-style: none !important; list-style-type: none !important; overflow: visible; text-overflow: clip; white-space: normal;`,
    index: `display: inline-block; box-sizing: border-box; width: 25px; height: 25px; margin: 0 10px 0 0; background-color: ${tokens.soft}; color: ${tokens.accent}; border-radius: 50%; font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 25px; text-align: center; vertical-align: top;`,
    name: `display: inline-block; box-sizing: border-box; width: ${hasMetadata ? 'calc(76% - 35px)' : 'calc(100% - 35px)'}; min-width: 0; overflow-wrap: anywhere; word-break: break-word; white-space: normal; font-weight: 700; vertical-align: top;`,
    metadata: `display: ${hasMetadata ? 'inline-block' : 'none'}; box-sizing: border-box; width: 24%; padding-left: 12px; overflow: hidden; color: ${tokens.muted}; font-size: 12px; text-align: right; text-overflow: ellipsis; white-space: nowrap; vertical-align: top;`
  };
}

const BODY_HEADING_RESET_STYLE = 'display: block !important; background: transparent !important; background-color: transparent !important; padding: 0 !important; border: none !important; border-top: none !important; border-right: none !important; border-bottom: none !important; border-left: none !important; border-radius: 0 !important; font-size: inherit !important; font-weight: inherit !important; font-style: normal !important; font-family: inherit !important; font-variant: inherit !important; letter-spacing: inherit !important; text-transform: none !important; text-align: left !important; text-decoration: none !important; text-indent: 0 !important; word-break: normal !important;';
const OWNED_DECORATIONS = new WeakSet();
const NUMBERED_HEADING_STATES = new WeakMap();
const HISTORY_ROW_STATES = new WeakMap();
const ROW_MARKER_STATES = new WeakMap();

function restoreInlineStyle(element, styleText) {
  if (styleText === null) element.removeAttribute('style');
  else element.setAttribute('style', styleText);
}

function applyTrustedStyle(element, styleText) {
  String(styleText || '').split(';').forEach((declaration) => {
    const colon = declaration.indexOf(':');
    if (colon < 1) return;

    const property = declaration.slice(0, colon).trim().toLowerCase();
    if (!/^-?[a-z][a-z0-9-]*$/.test(property)) return;

    const rawValue = declaration.slice(colon + 1).trim();
    const important = /\s*!important\s*$/i.test(rawValue);
    const value = rawValue.replace(/\s*!important\s*$/i, '').trim();
    if (!value) return;

    element.style.removeProperty(property);
    element.style.setProperty(property, value, important ? 'important' : '');
  });
}

function directHeading(section) {
  return Array.from(section.children).find(({ tagName }) => tagName === 'H4') || null;
}

function removeCardDecorations(section) {
  Array.from(section.children)
    .filter((child) => OWNED_DECORATIONS.has(child))
    .forEach((child) => child.remove());
}

function createCardDecoration(doc, kind, text, styleText) {
  const decoration = doc.createElement('span');
  decoration.setAttribute('data-ogzh-card-decoration', kind);
  decoration.setAttribute('aria-hidden', 'true');
  decoration.textContent = text;
  applyTrustedStyle(decoration, styleText);
  OWNED_DECORATIONS.add(decoration);
  return decoration;
}

function applyVisualDecoration(doc, section, kind, tokens, presentation) {
  const spec = cardDecorationSpec(kind, tokens, presentation);
  if (!spec) return;
  const decoration = createCardDecoration(doc, kind, spec.text || '', spec.style);
  if (ANIMATION_CHILDREN[kind]) {
    decoration.setAttribute('data-ogzh-card-animation', kind);
  }
  (spec.parts || []).forEach((part) => {
    const child = doc.createElement('i');
    child.setAttribute('data-ogzh-card-animation-part', part.name);
    child.textContent = part.text || '';
    applyTrustedStyle(child, part.style);
    decoration.appendChild(child);
  });
  section.insertBefore(decoration, section.firstChild);
}

function textNodesWithin(element) {
  const nodes = [];
  const visit = (node) => {
    for (const child of Array.from(node.childNodes || [])) {
      if (child.nodeType === 3) nodes.push(child);
      else if (!(child.tagName === 'SECTION' && child.hasAttribute('data-ogzh-card'))) visit(child);
    }
  };
  visit(element);
  return nodes;
}

function restoreHistoryDocumentRows(section) {
  Array.from(section.children).forEach((list) => {
    if (!['UL', 'OL'].includes(list.tagName)) return;
    Array.from(list.children).forEach((item) => {
      const state = HISTORY_ROW_STATES.get(item);
      if (!state) return;
      state.textNodes.forEach(({ node, value }) => { node.nodeValue = value; });
      while (state.name.firstChild) item.insertBefore(state.name.firstChild, state.name);
      state.index.remove();
      state.name.remove();
      state.metadata.remove();
      HISTORY_ROW_STATES.delete(item);
    });
  });
}

function applyHistoryDocumentRows(doc, section, bodyStyle, tokens) {
  const list = Array.from(section.children).find((child) => ['UL', 'OL'].includes(child.tagName));
  if (!list) return;
  Array.from(list.children).forEach((item, itemIndex) => {
    const raw = String(item.textContent || '');
    const trimmedEnd = raw.trimEnd();
    const separator = Math.max(trimmedEnd.lastIndexOf('｜'), trimmedEnd.lastIndexOf('|'));
    const { meta } = splitHistoryDocumentItem(raw);
    const changedTextNodes = [];
    if (separator >= 0 && meta) {
      let suffixStart = separator;
      while (suffixStart > 0 && /\s/.test(raw[suffixStart - 1])) suffixStart -= 1;
      let remaining = raw.length - suffixStart;
      for (const node of textNodesWithin(item).reverse()) {
        if (remaining <= 0) break;
        const value = node.nodeValue || '';
        const removed = Math.min(remaining, value.length);
        if (removed > 0) changedTextNodes.push({ node, value });
        node.nodeValue = value.slice(0, value.length - removed);
        remaining -= removed;
      }
    }
    const index = doc.createElement('span');
    index.setAttribute('aria-hidden', 'true');
    index.setAttribute('data-ogzh-history-index', 'true');
    index.textContent = String(itemIndex + 1).padStart(2, '0');
    const name = doc.createElement('span');
    name.setAttribute('data-ogzh-history-name', 'true');
    while (item.firstChild) name.appendChild(item.firstChild);
    const metadata = doc.createElement('span');
    metadata.setAttribute('data-ogzh-history-meta', 'true');
    metadata.textContent = meta;
    const rowStyles = historyDocumentRowStyles(bodyStyle, tokens, Boolean(meta));
    applyTrustedStyle(index, rowStyles.index);
    applyTrustedStyle(name, rowStyles.name);
    applyTrustedStyle(metadata, rowStyles.metadata);
    item.appendChild(index);
    item.appendChild(name);
    item.appendChild(metadata);
    applyTrustedStyle(item, rowStyles.item);
    HISTORY_ROW_STATES.set(item, { textNodes: changedTextNodes, index, name, metadata });
  });
  applyTrustedStyle(list, historyDocumentRowStyles(bodyStyle, tokens, true).list);
}

const SAFE_INLINE_TAGS = new Set(['STRONG', 'EM', 'A', 'DEL']);

export function normalizeCardTextForWechat(doc, styleConfig) {
  if (normalizeColor(styleConfig?.gzh?.bg)) return;

  const visit = (element) => {
    Array.from(element.children).forEach((child) => {
      if (child.tagName === 'SECTION' && child.hasAttribute('data-ogzh-card')) return;
      if (child.tagName === 'CODE') return;
      if (SAFE_INLINE_TAGS.has(child.tagName)) {
        child.style.removeProperty('-webkit-text-fill-color');
      }
      visit(child);
    });
  };

  doc.querySelectorAll('section[data-ogzh-card]').forEach(visit);
}

function applyInlineTextStyles(element, foreground) {
  Array.from(element.children).forEach((child) => {
    if (child.tagName === 'SECTION' && child.hasAttribute('data-ogzh-card')) return;
    if (child.tagName === 'CODE') {
      applyTrustedStyle(
        child,
        '-webkit-text-fill-color: currentColor !important; -webkit-text-stroke-color: currentColor !important; -webkit-text-stroke-width: 0 !important;'
      );
      return;
    }
    if (SAFE_INLINE_TAGS.has(child.tagName)) {
      const linkStyle = child.tagName === 'A'
        ? ' border-color: currentColor !important; text-decoration-color: currentColor !important; -webkit-text-decoration-color: currentColor !important;'
        : '';
      applyTrustedStyle(
        child,
        `color: ${foreground} !important; -webkit-text-fill-color: ${foreground} !important; -webkit-text-stroke-color: currentColor !important; -webkit-text-stroke-width: 0 !important; background: transparent !important; background-color: transparent !important; background-image: none !important;${linkStyle}`
      );
    }
    applyInlineTextStyles(child, foreground);
  });
}

function applyBodyStyles(section, bodyStyle, foreground) {
  Array.from(section.children).forEach((child) => {
    if (!['P', 'UL', 'OL'].includes(child.tagName)) return;
    applyTrustedStyle(child, bodyStyle);
    applyInlineTextStyles(child, foreground);
    if (child.tagName === 'P') return;
    applyListItemStyles(child, bodyStyle);
  });
}

function applyListItemStyles(element, bodyStyle) {
  Array.from(element.children).forEach((child) => {
    if (child.tagName === 'SECTION' && child.hasAttribute('data-ogzh-card')) return;
    if (child.tagName === 'LI' || child.tagName === 'P') {
      applyTrustedStyle(child, bodyStyle);
    }
    applyListItemStyles(child, bodyStyle);
  });
}

function applyQuoteDecoration(doc, section, presentation) {
  const quoteStyles = quoteDecorationStyles(presentation);
  if (!quoteStyles) return;

  const opening = createCardDecoration(
    doc,
    'quote-open',
    '“',
    quoteStyles.opening
  );
  const closing = createCardDecoration(
    doc,
    'quote-close',
    '”',
    quoteStyles.closing
  );

  section.insertBefore(opening, section.firstChild);
  section.appendChild(closing);
}

function applyNumberDecoration(doc, section, heading, presentation) {
  if (!heading) return;

  const fullTitle = String(heading.textContent || '').trim();
  const titleParts = /^(\d{1,2})\s+(.+)$/.exec(fullTitle);
  if (!titleParts) return;

  const state = {
    hadAriaLabel: heading.hasAttribute('aria-label'),
    ariaLabel: heading.getAttribute('aria-label'),
    textNodes: removeVisibleNumberPrefix(heading, titleParts[1])
  };
  NUMBERED_HEADING_STATES.set(heading, state);
  const badge = createCardDecoration(doc, 'number', titleParts[1], presentation.titleStyle);
  heading.setAttribute('aria-label', fullTitle);
  section.insertBefore(badge, heading);
}

function removeVisibleNumberPrefix(heading, badge) {
  const visiblePrefix = /^(\d{1,2}\s+)/.exec(String(heading.textContent || ''));
  if (!visiblePrefix || visiblePrefix[1].trim() !== badge) return [];

  let remaining = visiblePrefix[1].length;
  const textNodes = [];
  const visit = (node) => {
    for (const child of Array.from(node.childNodes || [])) {
      if (remaining === 0) return;
      if (child.nodeType === 3) {
        const removed = Math.min(remaining, child.nodeValue.length);
        if (removed > 0) textNodes.push({ node: child, value: child.nodeValue });
        child.nodeValue = child.nodeValue.slice(removed);
        remaining -= removed;
      } else {
        visit(child);
      }
    }
  };
  visit(heading);
  return textNodes;
}

function restoreNumberedHeading(heading) {
  const state = heading && NUMBERED_HEADING_STATES.get(heading);
  if (!state) return;

  state.textNodes.forEach(({ node, value }) => {
    node.nodeValue = value;
  });
  if (state.hadAriaLabel) {
    heading.setAttribute('aria-label', state.ariaLabel);
  } else {
    heading.removeAttribute('aria-label');
  }
  NUMBERED_HEADING_STATES.delete(heading);
}

export function applyCardStyles(doc, styleConfig) {
  const tokens = resolveCardTokens(styleConfig);
  const nativeDark = Boolean(normalizeColor(styleConfig?.gzh?.bg));

  doc.querySelectorAll('section[data-ogzh-card]').forEach((section) => {
    const heading = directHeading(section);
    restoreNumberedHeading(heading);
    restoreHistoryDocumentRows(section);
    restoreRowMarkers(section);
    removeCardDecorations(section);

    const styleId = section.getAttribute('data-ogzh-card');
    const card = getCardStyle(styleId);
    if (!card) return;

    const presentation = buildCardPresentation(styleId, tokens, { nativeDark });
    const bodyPair = presentation.contrastPairs.find(
      ({ role }) => role === presentation.bodyContrastRole
    );
    const headingPair = presentation.contrastPairs.find(
      ({ role }) => role === presentation.headingContrastRole
    );
    applyTrustedStyle(section, presentation.containerStyle);

    if (cardHasTitle(card)) {
      if (heading) applyTrustedStyle(heading, presentation.headingStyle);
    } else if (heading) {
      applyTrustedStyle(heading, presentation.bodyStyle);
      applyTrustedStyle(heading, BODY_HEADING_RESET_STYLE);
    }
    if (heading) applyInlineTextStyles(heading, headingPair.foreground);

    applyBodyStyles(section, presentation.bodyStyle, bodyPair.foreground);

    if (presentation.decoration === 'quote') {
      applyQuoteDecoration(doc, section, presentation);
    } else if (presentation.decoration === 'number') {
      applyNumberDecoration(doc, section, heading, presentation);
    } else if (presentation.decoration !== 'none') {
      applyVisualDecoration(doc, section, presentation.decoration, tokens, presentation);
    }
    if (styleId === 'history-document') {
      applyHistoryDocumentRows(doc, section, presentation.bodyStyle, tokens);
      applyHistoryDocumentBar(doc, section, tokens);
    } else if (presentation.rows) {
      applyRowMarkerList(doc, section, presentation, tokens);
    }
  });
}

function applyHistoryDocumentBar(doc, section, tokens) {
  const bar = createCardDecoration(doc, 'history-bar', '', historyDocumentBarStyle(tokens));
  section.insertBefore(bar, section.firstChild);
}

function buildCardDirectiveIndex(source) {
  const lines = [];
  const linePattern = /([^\r\n]*)(\r\n|\n|$)/g;
  while (linePattern.lastIndex <= source.length) {
    const match = linePattern.exec(source);
    if (!match || match[0] === '') break;
    lines.push({
      text: match[1],
      start: match.index,
      textEnd: match.index + match[1].length,
      end: match.index + match[0].length
    });
  }

  const records = [];
  const stack = [];
  for (let line = 0; line < lines.length; line += 1) {
    const openerMatch = CARD_OPENER_PATTERN.exec(lines[line].text);
    if (openerMatch) {
      const cluster = stack.length > 0 ? stack[0].cluster : { invalid: false };
      if (stack.length > 0) cluster.invalid = true;
      const record = {
        styleId: openerMatch[1],
        startLine: line,
        opener: lines[line],
        closingLine: null,
        closer: null,
        cluster
      };
      records.push(record);
      stack.push(record);
      continue;
    }

    if (!CARD_CLOSER_PATTERN.test(lines[line].text) || stack.length === 0) continue;
    const record = stack.pop();
    record.closingLine = line;
    record.closer = lines[line];
  }

  for (const record of stack) record.cluster.invalid = true;

  const index = new Map();
  for (const record of records) {
    if (record.cluster.invalid || !record.closer) continue;
    let contentEnd = record.closer.start;
    if (contentEnd > record.opener.end) {
      contentEnd -= source.slice(contentEnd - 2, contentEnd) === '\r\n' ? 2 : 1;
    }
    index.set(record.startLine, {
      styleId: record.styleId,
      known: Boolean(getCardStyle(record.styleId)),
      content: source.slice(record.opener.end, contentEnd),
      startLine: record.startLine,
      closingLine: record.closingLine,
      start: record.opener.start,
      end: record.closer.textEnd,
      openerStart: record.opener.start,
      openerEnd: record.opener.textEnd,
      contentStart: record.opener.end,
      contentEnd,
      closerStart: record.closer.start,
      closerEnd: record.closer.textEnd
    });
  }
  return index;
}

export function parseCardFence(source, startLine) {
  if (!Number.isInteger(startLine) || startLine < 0) return null;
  const card = buildCardDirectiveIndex(source).get(startLine);
  if (!card) return null;
  return {
    styleId: card.styleId,
    known: card.known,
    content: card.content,
    startLine: card.startLine,
    closingLine: card.closingLine
  };
}

export function registerCardDirective(md) {
  const directiveCaches = new WeakMap();

  function analyzeDirectiveCandidate(state, startLine, endLine, styleId, cache) {
    const openers = [startLine];
    let depth = 1;

    for (let lineNumber = startLine + 1; lineNumber < endLine; lineNumber += 1) {
      const line = state.src.slice(state.bMarks[lineNumber], state.eMarks[lineNumber]);
      const openerMatch = CARD_OPENER_PATTERN.exec(line);
      if (openerMatch) {
        openers.push(lineNumber);
        depth += 1;
        continue;
      }
      if (!CARD_CLOSER_PATTERN.test(line)) continue;

      depth -= 1;
      if (depth > 0) continue;
      if (openers.length > 1) {
        for (const opener of openers) cache.set(opener, null);
        return null;
      }

      const card = {
        styleId,
        known: Boolean(getCardStyle(styleId)),
        startLine,
        closingLine: lineNumber
      };
      cache.set(startLine, card);
      return card;
    }

    for (const opener of openers) cache.set(opener, null);
    return null;
  }

  function cardDirectiveRule(state, startLine, endLine, silent) {
    const lineStart = state.bMarks?.[startLine];
    const lineEnd = state.eMarks?.[startLine];
    const shift = state.tShift?.[startLine];
    if (
      !Number.isInteger(lineStart) ||
      !Number.isInteger(lineEnd) ||
      shift !== 0
    ) {
      return false;
    }
    const line = state.src.slice(lineStart, lineEnd);
    const openerMatch = line.startsWith(':::ogzh-card')
      ? CARD_OPENER_PATTERN.exec(line)
      : null;
    if (!openerMatch) {
      return false;
    }

    let cache = directiveCaches.get(state);
    if (!cache) {
      cache = new Map();
      directiveCaches.set(state, cache);
    }
    const card = cache.has(startLine)
      ? cache.get(startLine)
      : analyzeDirectiveCandidate(state, startLine, endLine, openerMatch[1], cache);
    if (!card || card.closingLine >= endLine) return false;
    if (silent) return true;

    const opening = state.push('ogzh_card_open', 'section', 1);
    opening.block = true;
    opening.map = [startLine, card.closingLine + 1];
    if (card.known) opening.attrSet('data-ogzh-card', card.styleId);

    const oldParentType = state.parentType;
    const oldLineMax = state.lineMax;
    try {
      state.parentType = 'ogzh_card';
      state.lineMax = card.closingLine;
      state.md.block.tokenize(state, startLine + 1, card.closingLine);
    } finally {
      state.parentType = oldParentType;
      state.lineMax = oldLineMax;
    }

    const closing = state.push('ogzh_card_close', 'section', -1);
    closing.block = true;
    state.line = card.closingLine + 1;
    return true;
  }

  md.block.ruler.before('fence', 'ogzh_card', cardDirectiveRule, {
    alt: ['paragraph', 'reference', 'blockquote', 'list']
  });
}

function buildCardSnippetForStyle(card, selectedBody, lineEnding) {
  const body = selectedBody || (
    card.id === 'history-document' ? HISTORY_DOCUMENT_BODY : BODY_PLACEHOLDER
  );
  const opener = `:::ogzh-card ${card.id}${lineEnding}`;
  const titleLine = cardHasTitle(card)
    ? `#### ${card.defaultTitle}${lineEnding}${lineEnding}`
    : '';
  const markdown = `${opener}${titleLine}${body}${lineEnding}:::`;
  const focusedText = cardHasTitle(card) ? card.defaultTitle : body;
  const focusStart = opener.length + (cardHasTitle(card) ? '#### '.length : 0);
  return {
    markdown,
    focusStart,
    focusEnd: focusStart + focusedText.length
  };
}

export function buildCardSnippet(styleId, selectedBody = '') {
  const card = getCardStyle(styleId);
  if (!card) {
    throw new Error(`Unknown card style: ${styleId}`);
  }
  return buildCardSnippetForStyle(card, selectedBody, '\n');
}

export function scanCardRanges(source) {
  return Array.from(buildCardDirectiveIndex(source).values(), (card) => ({
    styleId: card.styleId,
    start: card.start,
    end: card.end,
    openerStart: card.openerStart,
    openerEnd: card.openerEnd,
    contentStart: card.contentStart,
    contentEnd: card.contentEnd,
    closerStart: card.closerStart,
    closerEnd: card.closerEnd
  }));
}

export function findCardAtSelection(source, selectionStart, selectionEnd) {
  if (selectionStart > selectionEnd) return null;

  return scanCardRanges(source).find((range) => {
    if (selectionStart === selectionEnd) {
      return selectionStart >= range.start && selectionStart < range.end;
    }
    return selectionStart >= range.start && selectionEnd <= range.end;
  }) || null;
}

function unchangedEdit(source, selectionStart, selectionEnd, reason) {
  return {
    ok: false,
    markdown: source,
    selectionStart,
    selectionEnd,
    kind: 'unchanged',
    reason
  };
}

function mapReplacedOffset(offset, replacedStart, replacedEnd, replacementLength) {
  if (offset <= replacedStart) return offset;
  if (offset >= replacedEnd) return offset + replacementLength - (replacedEnd - replacedStart);
  return replacedStart + Math.min(offset - replacedStart, replacementLength);
}

function startsWithH4Block(content) {
  return /^(?:[\t ]*(?:\r\n|\n))* {0,3}####(?:[\t ]+|(?=\r?\n|$))/.test(content);
}

export function replaceCardStyleEdit(source, selectionStart, selectionEnd, nextStyleId) {
  const nextStyle = getCardStyle(nextStyleId);
  if (!nextStyle) {
    return unchangedEdit(source, selectionStart, selectionEnd, 'unknown-style');
  }

  const range = findCardAtSelection(source, selectionStart, selectionEnd);
  if (!range) {
    return unchangedEdit(source, selectionStart, selectionEnd, 'card-not-found');
  }

  const opener = source.slice(range.openerStart, range.openerEnd);
  const idStart = range.openerStart + opener.indexOf(range.styleId, ':::ogzh-card'.length);
  const idEnd = idStart + range.styleId.length;
  let markdown = source.slice(0, idStart) + nextStyleId + source.slice(idEnd);
  const mappedSelectionStart = mapReplacedOffset(
    selectionStart,
    idStart,
    idEnd,
    nextStyleId.length
  );
  const mappedSelectionEnd = mapReplacedOffset(
    selectionEnd,
    idStart,
    idEnd,
    nextStyleId.length
  );
  const currentStyle = getCardStyle(range.styleId);

  const currentContent = source.slice(range.contentStart, range.contentEnd);
  if (
    !cardHasTitle(currentStyle) &&
    cardHasTitle(nextStyle) &&
    !startsWithH4Block(currentContent)
  ) {
    const idLengthDelta = nextStyleId.length - range.styleId.length;
    const insertAt = range.contentStart + idLengthDelta;
    const lineEnding = source.slice(range.openerEnd, range.contentStart);
    const titlePrefix = '#### ';
    const titleBlock = `${titlePrefix}${nextStyle.defaultTitle}${lineEnding}${lineEnding}`;
    markdown = markdown.slice(0, insertAt) + titleBlock + markdown.slice(insertAt);
    return {
      ok: true,
      markdown,
      selectionStart: insertAt + titlePrefix.length,
      selectionEnd: insertAt + titlePrefix.length + nextStyle.defaultTitle.length,
      kind: 'replace'
    };
  }

  return {
    ok: true,
    markdown,
    selectionStart: mappedSelectionStart,
    selectionEnd: mappedSelectionEnd,
    kind: 'replace'
  };
}

export function removeCardEdit(source, selectionStart, selectionEnd) {
  const range = findCardAtSelection(source, selectionStart, selectionEnd);
  if (!range) {
    return unchangedEdit(source, selectionStart, selectionEnd, 'card-not-found');
  }

  const content = source.slice(range.contentStart, range.contentEnd);
  const unwrappedStart = range.start;
  return {
    ok: true,
    markdown: source.slice(0, range.start) + content + source.slice(range.end),
    selectionStart: unwrappedStart,
    selectionEnd: unwrappedStart + content.length,
    kind: 'remove'
  };
}

function sourceLineBounds(source) {
  const lines = [];
  let lineStart = 0;

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\r' && source[index + 1] === '\n') {
      lines.push({
        start: lineStart,
        textEnd: index,
        isBlank: source.slice(lineStart, index).trim() === ''
      });
      lineStart = index + 2;
      index += 1;
    } else if (source[index] === '\n') {
      lines.push({
        start: lineStart,
        textEnd: index,
        isBlank: source.slice(lineStart, index).trim() === ''
      });
      lineStart = index + 1;
    }
  }
  lines.push({
    start: lineStart,
    textEnd: source.length,
    isBlank: source.slice(lineStart).trim() === ''
  });
  return lines;
}

function tokenSourceRange(token, lines) {
  if (!Array.isArray(token?.map) || token.map.length < 2) return null;
  const [startLine, endLine] = token.map;
  if (
    !Number.isInteger(startLine) ||
    !Number.isInteger(endLine) ||
    startLine < 0 ||
    endLine <= startLine ||
    !lines[startLine] ||
    !lines[endLine - 1]
  ) {
    return null;
  }
  let lastContentLine = endLine - 1;
  while (lastContentLine >= startLine && lines[lastContentLine].isBlank) {
    lastContentLine -= 1;
  }
  if (lastContentLine < startLine) return null;

  return {
    start: lines[startLine].start,
    end: lines[lastContentLine].textEnd
  };
}

function rangesOverlap(start, end, range) {
  return start < range.end && end > range.start;
}

function selectionValidationReason(source, selectionStart, selectionEnd) {
  if (
    !Number.isInteger(selectionStart) ||
    !Number.isInteger(selectionEnd) ||
    selectionStart < 0 ||
    selectionStart > selectionEnd ||
    selectionEnd > source.length
  ) {
    return '选区偏移无效：起止位置必须是文档范围内的整数，且起点不能晚于终点。';
  }

  const splitsCrlf = (offset) =>
    offset > 0 && source[offset - 1] === '\r' && source[offset] === '\n';
  if (splitsCrlf(selectionStart) || splitsCrlf(selectionEnd)) {
    return '选区端点不能位于 CRLF 换行符中间。';
  }
  return null;
}

function forbiddenReasonInRange(tokens, lines, start, end) {
  for (const token of tokens) {
    const range = tokenSourceRange(token, lines);
    if (!range || !rangesOverlap(start, end, range)) continue;

    const directReason = FORBIDDEN_TOKEN_REASONS[token.type];
    if (directReason) return directReason;

    for (const child of token.children || []) {
      const childReason = FORBIDDEN_TOKEN_REASONS[child.type];
      if (childReason) return childReason;
    }
  }
  return null;
}

function isEligibleTargetToken(token) {
  return (
    (token.type === 'paragraph_open' && token.level === 0) ||
    (token.type === 'list_item_open' && token.level === 1)
  );
}

function isSupportedTopLevelContainer(token) {
  return token.type === 'bullet_list_open' || token.type === 'ordered_list_open';
}

function sourceLineEnding(source) {
  const firstLf = source.indexOf('\n');
  return firstLf > 0 && source[firstLf - 1] === '\r' ? '\r\n' : '\n';
}

function insertCardEdit(source, cursor, card) {
  const lineEnding = sourceLineEnding(source);
  const snippet = buildCardSnippetForStyle(card, '', lineEnding);
  const leftIsLineBoundary = cursor === 0 || source[cursor - 1] === '\n';
  const rightIsLineBoundary =
    cursor === source.length || source[cursor] === '\r' || source[cursor] === '\n';
  const prefix = leftIsLineBoundary ? '' : lineEnding;
  const suffix = rightIsLineBoundary ? '' : lineEnding;
  const snippetStart = cursor + prefix.length;

  return {
    ok: true,
    markdown:
      source.slice(0, cursor) + prefix + snippet.markdown + suffix + source.slice(cursor),
    selectionStart: snippetStart + snippet.focusStart,
    selectionEnd: snippetStart + snippet.focusEnd,
    kind: 'insert'
  };
}

function wrapCardEdit(source, targetStart, targetEnd, card) {
  const selectedBody = source.slice(targetStart, targetEnd);
  const snippet = buildCardSnippetForStyle(
    card,
    selectedBody,
    sourceLineEnding(source)
  );

  return {
    ok: true,
    markdown:
      source.slice(0, targetStart) + snippet.markdown + source.slice(targetEnd),
    selectionStart: targetStart + snippet.focusStart,
    selectionEnd: targetStart + snippet.focusEnd,
    kind: 'wrap'
  };
}

export function inspectCardTarget(source, selectionStart, selectionEnd, tokens) {
  const invalidSelectionReason = selectionValidationReason(
    source,
    selectionStart,
    selectionEnd
  );
  if (invalidSelectionReason) {
    return { ok: false, reason: invalidSelectionReason };
  }
  if (selectionStart === selectionEnd) {
    return { ok: false, reason: '请选择普通段落或列表项。' };
  }

  const overlappingCard = scanCardRanges(source).find((range) =>
    rangesOverlap(selectionStart, selectionEnd, range)
  );
  if (overlappingCard) {
    return {
      ok: false,
      reason: '选区跨越卡片边界，请缩小选区或先移除卡片。'
    };
  }

  const parsedTokens = Array.isArray(tokens) ? tokens : [];
  const lines = sourceLineBounds(source);
  const selectedForbiddenReason = forbiddenReasonInRange(
    parsedTokens,
    lines,
    selectionStart,
    selectionEnd
  );
  if (selectedForbiddenReason) {
    return { ok: false, reason: selectedForbiddenReason };
  }

  const eligibleRanges = parsedTokens
    .filter(isEligibleTargetToken)
    .map((token) => tokenSourceRange(token, lines))
    .filter((range) => range && rangesOverlap(selectionStart, selectionEnd, range));

  if (eligibleRanges.length === 0) {
    return { ok: false, reason: '请选择完整的普通段落或列表项。' };
  }

  const start = Math.min(...eligibleRanges.map((range) => range.start));
  const end = Math.max(...eligibleRanges.map((range) => range.end));
  const expandedForbiddenReason = forbiddenReasonInRange(parsedTokens, lines, start, end);
  if (expandedForbiddenReason) {
    return { ok: false, reason: expandedForbiddenReason };
  }

  const hasUnsupportedRoot = parsedTokens.some((token) => {
    if (token.level !== 0 || !token.map) return false;
    const range = tokenSourceRange(token, lines);
    if (!range || !rangesOverlap(start, end, range)) return false;
    return !isEligibleTargetToken(token) && !isSupportedTopLevelContainer(token);
  });
  if (hasUnsupportedRoot) {
    return { ok: false, reason: '选区不是可支持的普通段落或列表项。' };
  }

  return { ok: true, start, end };
}

export function applyCardEdit(source, selectionStart, selectionEnd, styleId, tokens) {
  const invalidSelectionReason = selectionValidationReason(
    source,
    selectionStart,
    selectionEnd
  );
  if (invalidSelectionReason) {
    return unchangedEdit(source, selectionStart, selectionEnd, invalidSelectionReason);
  }

  const card = getCardStyle(styleId);
  if (!card) {
    return unchangedEdit(source, selectionStart, selectionEnd, 'unknown-style');
  }

  const existing = findCardAtSelection(source, selectionStart, selectionEnd);
  if (existing) {
    return replaceCardStyleEdit(source, selectionStart, selectionEnd, styleId);
  }

  if (selectionStart === selectionEnd) {
    return insertCardEdit(source, selectionStart, card);
  }

  const target = inspectCardTarget(source, selectionStart, selectionEnd, tokens);
  if (!target.ok) {
    return unchangedEdit(source, selectionStart, selectionEnd, target.reason);
  }
  return wrapCardEdit(source, target.start, target.end, card);
}
