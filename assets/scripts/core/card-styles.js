const BODY_PLACEHOLDER = '在这里输入卡片内容';
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
].map((item) => Object.freeze(item)));

const CARD_STYLE_BY_ID = new Map(CARD_STYLES.map((item) => [item.id, item]));

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
  decoration = 'none',
  solidBackground = null,
  solidText = null,
  contrastPairs
}) {
  return {
    containerStyle,
    titleStyle,
    headingStyle,
    bodyStyle,
    decoration,
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

export function renderCardPreviewHtml(styleId, styleConfig) {
  const card = getCardStyle(styleId);
  if (!card) return '';
  const presentation = buildCardPresentation(
    styleId,
    resolveCardTokens(styleConfig),
    { nativeDark: Boolean(normalizeColor(styleConfig?.gzh?.bg)) }
  );
  const containerStyle = escapeHtml(presentation.containerStyle);
  const bodyStyle = escapeHtml(presentation.bodyStyle);
  const headingStyle = escapeHtml(presentation.headingStyle);
  let content;

  if (presentation.decoration === 'quote') {
    const quotePair = presentation.contrastPairs.find(({ role }) => role === 'quote-mark');
    const quoteStyle = escapeHtml(`display: inline-block; margin: 0 8px 4px 0; color: ${quotePair.foreground} !important; font-size: 30px; line-height: 1;`);
    content = `<span data-ogzh-card-decoration="quote" aria-hidden="true" style="${quoteStyle}">“</span><p style="${bodyStyle}">${escapeHtml(card.preview)}</p>`;
  } else if (presentation.decoration === 'number') {
    const title = card.defaultTitle.trim();
    const titleParts = /^(\d{1,2})\s+(.+)$/.exec(title);
    const badge = titleParts?.[1] || '';
    const visibleTitle = titleParts?.[2] || title;
    const preview = card.preview === card.defaultTitle ? BODY_PLACEHOLDER : card.preview;
    content = `<span data-ogzh-card-decoration="number" aria-hidden="true" style="${escapeHtml(presentation.titleStyle)}">${escapeHtml(badge)}</span><h4 aria-label="${escapeHtml(title)}" style="${headingStyle}">${escapeHtml(visibleTitle)}</h4><p style="${bodyStyle}">${escapeHtml(preview)}</p>`;
  } else if (card.slots === 'title-body') {
    content = `<h4 style="${headingStyle}">${escapeHtml(card.defaultTitle)}</h4><p style="${bodyStyle}">${escapeHtml(card.preview)}</p>`;
  } else {
    content = `<p style="${bodyStyle}">${escapeHtml(card.preview)}</p>`;
  }

  return `<section data-ogzh-card-preview="${escapeHtml(card.id)}" style="${containerStyle}">${content}</section>`;
}

export function getCardStyle(styleId) {
  return CARD_STYLE_BY_ID.get(styleId) || null;
}

const BODY_HEADING_RESET_STYLE = 'background: transparent !important; background-color: transparent !important; padding: 0 !important; border: none !important; border-top: none !important; border-right: none !important; border-bottom: none !important; border-left: none !important;';

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
    .filter((child) => child.hasAttribute('data-ogzh-card-decoration'))
    .forEach((child) => child.remove());
}

function createCardDecoration(doc, kind, text, styleText) {
  const decoration = doc.createElement('span');
  decoration.setAttribute('data-ogzh-card-decoration', kind);
  decoration.setAttribute('aria-hidden', 'true');
  decoration.textContent = text;
  applyTrustedStyle(decoration, styleText);
  return decoration;
}

function applyBodyStyles(section, bodyStyle) {
  Array.from(section.children).forEach((child) => {
    if (!['P', 'UL', 'OL'].includes(child.tagName)) return;
    applyTrustedStyle(child, bodyStyle);
    if (child.tagName === 'P') return;

    Array.from(child.children)
      .filter(({ tagName }) => tagName === 'LI')
      .forEach((item) => applyTrustedStyle(item, bodyStyle));
  });
}

function applyQuoteDecoration(doc, section, presentation) {
  const quotePair = presentation.contrastPairs.find(({ role }) => role === 'quote-mark');
  if (!quotePair) return;

  const common = `display: inline-block; color: ${quotePair.foreground} !important; font-size: 30px; line-height: 1;`;
  const opening = createCardDecoration(
    doc,
    'quote',
    '“',
    `${common} margin: 0 8px 4px 0;`
  );
  opening.setAttribute('data-ogzh-card-decoration-side', 'opening');
  const closing = createCardDecoration(
    doc,
    'quote',
    '”',
    `${common} display: block; margin: 4px 0 0; text-align: right;`
  );
  closing.setAttribute('data-ogzh-card-decoration-side', 'closing');

  section.insertBefore(opening, section.firstChild);
  section.appendChild(closing);
}

function applyNumberDecoration(doc, section, heading, presentation) {
  if (!heading) return;

  const labelledTitle = heading.getAttribute('aria-label');
  const fullTitle = String(labelledTitle !== null ? labelledTitle : heading.textContent).trim();
  const titleParts = /^(\d{1,2})\s+(.+)$/.exec(fullTitle);
  if (!titleParts) return;

  const badge = createCardDecoration(doc, 'number', titleParts[1], presentation.titleStyle);
  heading.setAttribute('aria-label', fullTitle);
  heading.textContent = titleParts[2];
  section.insertBefore(badge, heading);
}

export function applyCardStyles(doc, styleConfig) {
  const tokens = resolveCardTokens(styleConfig);
  const nativeDark = Boolean(normalizeColor(styleConfig?.gzh?.bg));

  doc.querySelectorAll('section[data-ogzh-card]').forEach((section) => {
    const styleId = section.getAttribute('data-ogzh-card');
    const card = getCardStyle(styleId);
    if (!card) return;

    const presentation = buildCardPresentation(styleId, tokens, { nativeDark });
    applyTrustedStyle(section, presentation.containerStyle);
    removeCardDecorations(section);

    const heading = directHeading(section);
    if (card.slots === 'title-body') {
      if (heading) applyTrustedStyle(heading, presentation.headingStyle);
    } else if (heading) {
      applyTrustedStyle(heading, BODY_HEADING_RESET_STYLE);
      applyTrustedStyle(heading, presentation.bodyStyle);
    }

    applyBodyStyles(section, presentation.bodyStyle);

    if (presentation.decoration === 'quote') {
      applyQuoteDecoration(doc, section, presentation);
    } else if (presentation.decoration === 'number') {
      applyNumberDecoration(doc, section, heading, presentation);
    }
  });
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
  const body = selectedBody || BODY_PLACEHOLDER;
  const opener = `:::ogzh-card ${card.id}${lineEnding}`;
  const titleLine = card.slots === 'title-body'
    ? `#### ${card.defaultTitle}${lineEnding}${lineEnding}`
    : '';
  const markdown = `${opener}${titleLine}${body}${lineEnding}:::`;
  const focusedText = card.slots === 'title-body' ? card.defaultTitle : body;
  const focusStart = opener.length + (card.slots === 'title-body' ? '#### '.length : 0);
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

  if (currentStyle?.slots === 'body' && nextStyle.slots === 'title-body') {
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
