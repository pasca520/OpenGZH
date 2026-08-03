// ============================================================
// Cover Templates for WeChat Article Cover Image Editor
// 35 unique SVG templates across 7 categories
// ============================================================

const FONT_FAMILY = "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif";
const SERIF_FAMILY = "'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif";

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Estimate rendered pixel width of tag text, accounting for CJK (full-width) vs Latin characters.
 * @param {string} text - Tag text
 * @param {number} fontSize - Font size in px
 * @returns {number} Estimated width in px
 */
function tagW(text, fontSize) {
  if (!text) return 0;
  let w = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    // CJK Unified Ideographs, CJK Radicals, CJK Symbols/Punctuation, Fullwidth Forms, etc.
    const isWide = code > 0x2E7F;
    w += isWide ? fontSize : fontSize * 0.58;
  }
  return Math.ceil(w);
}

// Detect calling convention:
//   New: renderTextLines(..., dataField)        → arg10 is a known field string
//   New: renderTextLines(..., dataField, offY)   → arg10 string, arg11 number
//   New: renderTextLines(..., dataField, offY, offX) → arg10 string, arg11 number, arg12 number
//   Old: renderTextLines(..., offY)              → arg10 number
//   Old: renderTextLines(..., offY, offX)        → arg10 number, arg11 number
function renderTextLines(text, x, y, fontSize, lineHeight, letterSpacing, textAlign, fill, fontWeight, fontFamily, arg10, arg11, arg12) {
  if (!text) return '';
  const FIELD_NAMES = new Set(['tag', 'title', 'subtitle', 'author', 'issueNumber']);
  let offsetY = 0, offsetX = 0, dataField = null;

  if (typeof arg10 === 'string' && FIELD_NAMES.has(arg10)) {
    // New calling convention: dataField comes before offsetY/offsetX
    dataField = arg10;
    offsetY = arg11 != null ? arg11 : 0;
    offsetX = arg12 != null ? arg12 : 0;
  } else {
    // Old calling convention: offsetY, offsetX
    offsetY = arg10 != null ? arg10 : 0;
    offsetX = arg11 != null ? arg11 : 0;
    // arg12 may be dataField from transitional calls
    if (typeof arg12 === 'string' && FIELD_NAMES.has(arg12)) dataField = arg12;
  }

  const baseX = x + (offsetX || 0);
  const baseY = y + (offsetY || 0);
  const resolvedLineHeight = lineHeight <= 4 ? fontSize * lineHeight : lineHeight;
  const lines = text.split('\n');
  const anchor = textAlign === 'center' ? 'middle' : textAlign === 'right' ? 'end' : 'start';
  const fieldAttr = dataField ? ` data-field="${dataField}"` : '';
  const lhAttr = dataField ? ` data-line-height="${resolvedLineHeight}"` : '';
  return lines.map((line, i) => {
    const dy = i * resolvedLineHeight;
    const lineAttr = dataField ? ` data-field-line="${i}"` : '';
    return `<text x="${baseX}" y="${baseY + dy}" font-size="${fontSize}" font-weight="${fontWeight || 'normal'}" font-family="${fontFamily || FONT_FAMILY}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${letterSpacing || 0}"${fieldAttr}${lineAttr}${lhAttr}>${esc(line)}</text>`;
  }).join('\n');
}

/**
 * Embed an illustration SVG string into a positioned SVG container.
 * Strips the outer SVG wrapper and preserves its coordinate system so imported
 * illustrations keep their original aspect ratio instead of stretching/cropping.
 */
function getSvgAttr(svgStr, name) {
  const match = svgStr.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? match[1] : '';
}

function extractSvgViewBox(svgStr) {
  const viewBox = getSvgAttr(svgStr, 'viewBox');
  if (viewBox) return viewBox;

  const width = parseFloat(getSvgAttr(svgStr, 'width'));
  const height = parseFloat(getSvgAttr(svgStr, 'height'));
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1200;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 800;
  return `0 0 ${safeWidth} ${safeHeight}`;
}

function illustrationOpacity(content, base = 1) {
  const raw = Number(content?.illustrationOpacity ?? 1);
  const factor = raw > 1 ? raw / 100 : raw;
  const opacity = Number.isFinite(factor) ? factor : 1;
  return Math.max(0.08, Math.min(1, base * opacity)).toFixed(3);
}

function embedIllustration(svgStr, x, y, w, h, opacity = 1) {
  if (!svgStr) return '';
  const viewBox = extractSvgViewBox(svgStr);
  const inner = svgStr
    .replace(/<\?xml[^?]*\?>\s*/g, '')
    .replace(/<svg[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '');
  return `<svg class="cover-illustration-layer" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${esc(viewBox)}" preserveAspectRatio="xMidYMid meet" overflow="visible" opacity="${opacity}">${inner}</svg>`;
}

function illustrationLayer(markup) {
  return `<!--cover-illustration-start-->${markup}<!--cover-illustration-end-->`;
}

// ============================================================
// 1. black-gold
// ============================================================
const blackGold = {
  id: 'black-gold', name: '黑金质感', category: 'solid-dark',
  elements: { tag: false, title: true, subtitle: true, author: true, image: false },
  render(content, typo) {
    const cx = 600;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#D4AF37" stop-opacity="0.1"/><stop offset="50%" stop-color="#D4AF37" stop-opacity="0"/><stop offset="100%" stop-color="#D4AF37" stop-opacity="0.05"/></linearGradient>
    <linearGradient id="gold-shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#D4AF37" stop-opacity="0"/><stop offset="50%" stop-color="#FFD700" stop-opacity="0.15"/><stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/></linearGradient>
    <radialGradient id="gold-glow1" cx="0.2" cy="0.3"><stop offset="0%" stop-color="#D4AF37" stop-opacity="0.08"/><stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/></radialGradient>
    <radialGradient id="gold-glow2" cx="0.8" cy="0.7"><stop offset="0%" stop-color="#D4AF37" stop-opacity="0.06"/><stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="510" fill="#111111"/>
  <rect width="1200" height="510" fill="url(#bg-gold)"/>
  <rect width="1200" height="510" fill="url(#gold-glow1)"/>
  <rect width="1200" height="510" fill="url(#gold-glow2)"/>
  <rect x="0" y="200" width="1200" height="90" fill="url(#gold-shine)"/>
  <!-- Frame: single strong keyline + corner marks -->
  <rect x="40" y="40" width="1120" height="430" fill="none" stroke="#D4AF37" stroke-width="2" opacity="0.55"/>
  <rect x="52" y="52" width="1096" height="406" fill="none" stroke="#D4AF37" stroke-width="0.8" opacity="0.22"/>
  <path d="M 40 62 L 40 40 L 62 40" fill="none" stroke="#D4AF37" stroke-width="3" opacity="0.85"/>
  <path d="M 1138 40 L 1160 40 L 1160 62" fill="none" stroke="#D4AF37" stroke-width="3" opacity="0.85"/>
  <path d="M 1160 418 L 1160 440 L 1138 440" fill="none" stroke="#D4AF37" stroke-width="3" opacity="0.85"/>
  <path d="M 62 440 L 40 440 L 40 418" fill="none" stroke="#D4AF37" stroke-width="3" opacity="0.85"/>
  <!-- Bold rule above/below title -->
  <line x1="460" y1="95" x2="740" y2="95" stroke="#D4AF37" stroke-width="2" opacity="0.8"/>
  <line x1="470" y1="102" x2="730" y2="102" stroke="#D4AF37" stroke-width="0.8" opacity="0.4"/>
  <line x1="460" y1="388" x2="740" y2="388" stroke="#D4AF37" stroke-width="2" opacity="0.8"/>
  <line x1="470" y1="381" x2="730" y2="381" stroke="#D4AF37" stroke-width="0.8" opacity="0.4"/>
  <!-- Sparse star accents -->
  <polygon points="100,200 103,208 112,208 105,213 107,221 100,216 93,221 95,213 88,208 97,208" fill="#D4AF37" opacity="0.35"/>
  <polygon points="1100,280 1102,286 1108,286 1103,290 1105,296 1100,292 1095,296 1097,290 1092,286 1098,286" fill="#FFD700" opacity="0.3"/>
  <circle cx="150" cy="130" r="3" fill="#D4AF37" opacity="0.6"/><circle cx="1050" cy="150" r="2.5" fill="#FFD700" opacity="0.5"/>
  <circle cx="200" cy="380" r="3" fill="#D4AF37" opacity="0.5"/><circle cx="1000" cy="370" r="2.5" fill="#FFD700" opacity="0.4"/>
  ${renderTextLines(content.title, cx, 208, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing + 2, 'center', '#F5F0E1', '600', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 300, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#E8C766', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 2. pure-white
// ============================================================
const pureWhite = {
  id: 'pure-white', name: '素白纯净', category: 'solid-light',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="pw-ov" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4F46E5" stop-opacity="0.03"/><stop offset="100%" stop-color="#7C3AED" stop-opacity="0.05"/></linearGradient></defs>
  <rect width="1200" height="510" fill="#FAFAFA"/><rect width="1200" height="510" fill="url(#pw-ov)"/>
  <rect x="80" y="80" width="6" height="330" fill="#4F46E5"/>
  <rect x="92" y="80" width="2" height="330" fill="#7C3AED" opacity="0.35"/>
  <circle cx="1050" cy="100" r="58" fill="#EEF2FF" opacity="0.8"/>
  <circle cx="1050" cy="100" r="40" fill="none" stroke="#C7D2FE" stroke-width="2" opacity="0.7"/>
  <rect x="950" y="350" width="80" height="80" fill="none" stroke="#E0E7FF" stroke-width="2" transform="rotate(15,990,390)" opacity="0.7"/>
  <circle cx="900" cy="80" r="4" fill="#4F46E5" opacity="0.2"/><circle cx="924" cy="80" r="4" fill="#4F46E5" opacity="0.16"/>
  <circle cx="948" cy="80" r="4" fill="#4F46E5" opacity="0.12"/>
  <line x1="110" y1="360" x2="520" y2="360" stroke="#E5E7EB" stroke-width="1"/>
  <line x1="110" y1="158" x2="260" y2="158" stroke="#4F46E5" stroke-width="1.5" opacity="0.4"/>
  <polygon points="1100,420 1130,460 1070,460" fill="#4F46E5" opacity="0.08"/>
  ${content.tag ? renderTextLines(content.tag, 110, 122, typo.tagSize, typo.tagSize * 1.2, 2, 'left', '#4F46E5', '600', typo.subtitleFontFamily, 'tag') : ''}
  ${renderTextLines(content.title, 110, 195, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#111827', '800', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 110, 275, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#475569', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 3. warm-cream
// ============================================================
const warmCream = {
  id: 'warm-cream', name: '暖米色调', category: 'solid-light',
  elements: { tag: false, title: true, subtitle: true, author: true, image: false },
  render(content, typo) {
    const cx = 600;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="wc-g1" cx="0.85" cy="0.15"><stop offset="0%" stop-color="#FFECD2" stop-opacity="0.6"/><stop offset="100%" stop-color="#FFECD2" stop-opacity="0"/></radialGradient>
    <radialGradient id="wc-g2" cx="0.1" cy="0.85"><stop offset="0%" stop-color="#FFECD2" stop-opacity="0.5"/><stop offset="100%" stop-color="#FFECD2" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="510" fill="#FFF8F0"/>
  <rect width="1200" height="510" fill="url(#wc-g1)"/><rect width="1200" height="510" fill="url(#wc-g2)"/>
  <!-- Bold botanical accents -->
  <path d="M1040 46Q1070 12 1098 44Q1074 32 1046 58Z" fill="#A8D5BA" opacity="0.55"/>
  <path d="M1080 70Q1112 48 1122 84Q1098 66 1084 86Z" fill="#B5D8C7" opacity="0.4"/>
  <path d="M100 400Q132 366 156 400Q130 388 106 414Z" fill="#A8D5BA" opacity="0.4"/>
  <circle cx="1050" cy="80" r="118" fill="none" stroke="#F0D9A8" stroke-width="2" opacity="0.5"/>
  <circle cx="1050" cy="80" r="78" fill="none" stroke="#F5DEB3" stroke-width="1" opacity="0.4"/>
  <circle cx="150" cy="420" r="78" fill="none" stroke="#F0D9A8" stroke-width="2" opacity="0.45"/>
  <circle cx="200" cy="80" r="5" fill="#A8D5BA" opacity="0.4"/>
  <circle cx="980" cy="400" r="5" fill="#A8D5BA" opacity="0.35"/>
  <line x1="460" y1="138" x2="740" y2="138" stroke="#C9B8A4" stroke-width="2" opacity="0.8"/>
  <line x1="480" y1="146" x2="720" y2="146" stroke="#D7CCC8" stroke-width="1" opacity="0.6"/>
  <line x1="460" y1="372" x2="740" y2="372" stroke="#C9B8A4" stroke-width="1.5" opacity="0.6"/>
  <polygon points="600,125 605,130 600,135 595,130" fill="#B49E7C" opacity="0.7"/>
  <polygon points="600,377 604,381 600,385 596,381" fill="#B49E7C" opacity="0.6"/>
  ${renderTextLines(content.title, cx, 222, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#3E2723', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 302, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#6D4C3F', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 4. lavender-light
// ============================================================
const lavenderLight = {
  id: 'lavender-light', name: '淡紫轻语', category: 'solid-light',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lav-ac" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7C3AED"/><stop offset="100%" stop-color="#A78BFA"/></linearGradient>
    <radialGradient id="lav-orb" cx="0.5" cy="0.5"><stop offset="0%" stop-color="#C4B5FD" stop-opacity="0.3"/><stop offset="100%" stop-color="#C4B5FD" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="510" fill="#F3E8FF"/>
  <circle cx="1080" cy="100" r="160" fill="#DDD6FE" opacity="0.45"/>
  <circle cx="1080" cy="100" r="115" fill="#C4B5FD" opacity="0.22"/>
  <circle cx="1080" cy="100" r="78" fill="none" stroke="#A78BFA" stroke-width="2" opacity="0.35"/>
  <circle cx="1000" cy="400" r="100" fill="#DDD6FE" opacity="0.22"/>
  <circle cx="1000" cy="400" r="62" fill="none" stroke="#C4B5FD" stroke-width="1.5" opacity="0.35"/>
  <circle cx="200" cy="400" r="80" fill="url(#lav-orb)"/>
  <circle cx="400" cy="60" r="60" fill="url(#lav-orb)"/>
  <circle cx="900" cy="62" r="4" fill="#7C3AED" opacity="0.5"/>
  <circle cx="1150" cy="250" r="4" fill="#7C3AED" opacity="0.4"/>
  <circle cx="550" cy="440" r="22" fill="none" stroke="#DDD6FE" stroke-width="2" opacity="0.5"/>
  <rect x="80" y="100" width="5" height="62" rx="2.5" fill="url(#lav-ac)"/>
  <line x1="100" y1="382" x2="320" y2="382" stroke="#C4B5FD" stroke-width="1.5" opacity="0.4"/>
  ${content.tag ? renderTextLines(content.tag, 100, 132, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#7C3AED', '600', typo.subtitleFontFamily, 'tag') : ''}
  ${renderTextLines(content.title, 80, 215, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#1E1B4B', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 295, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#6D28D9', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 5. indigo-violet
// ============================================================
const indigoViolet = {
  id: 'indigo-violet', name: '靛紫渐变', category: 'gradient',
  elements: { tag: true, title: true, subtitle: true, author: true, image: false },
  render(content, typo) {
    const cx = 600;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="iv-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4F46E5"/><stop offset="100%" stop-color="#7C3AED"/></linearGradient>
    <radialGradient id="iv-o1" cx="0.15" cy="0.8"><stop offset="0%" stop-color="white" stop-opacity="0.07"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient>
    <radialGradient id="iv-o2" cx="0.85" cy="0.2"><stop offset="0%" stop-color="white" stop-opacity="0.09"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient>
    <radialGradient id="iv-glow" cx="0.5" cy="0.45"><stop offset="0%" stop-color="#A78BFA" stop-opacity="0.2"/><stop offset="60%" stop-color="#7C3AED" stop-opacity="0.06"/><stop offset="100%" stop-color="#4F46E5" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#iv-bg)"/>
  <rect width="1200" height="510" fill="url(#iv-o1)"/><rect width="1200" height="510" fill="url(#iv-o2)"/>
  <rect width="1200" height="510" fill="url(#iv-glow)"/>
  <!-- Large soft shapes: bold at thumbnail size, no pixel noise -->
  <ellipse cx="1000" cy="90" rx="300" ry="200" fill="white" opacity="0.045"/>
  <circle cx="1000" cy="90" r="150" fill="none" stroke="white" stroke-width="1.5" opacity="0.08"/>
  <ellipse cx="150" cy="420" rx="240" ry="170" fill="white" opacity="0.035"/>
  <circle cx="150" cy="420" r="120" fill="none" stroke="white" stroke-width="1.2" opacity="0.06"/>
  <path d="M0 380Q200 340 400 360Q600 380 800 350Q1000 320 1200 355" stroke="white" stroke-width="2" fill="none" opacity="0.09"/>
  <path d="M0 405Q200 370 400 388Q600 406 800 375Q1000 345 1200 380" stroke="white" stroke-width="1" fill="none" opacity="0.06"/>
  <!-- Bold corner accents -->
  <path d="M36 36L36 86" stroke="white" stroke-width="3" fill="none" opacity="0.2"/><path d="M36 36L86 36" stroke="white" stroke-width="3" fill="none" opacity="0.2"/>
  <path d="M1164 36L1164 86" stroke="white" stroke-width="3" fill="none" opacity="0.2"/><path d="M1164 36L1114 36" stroke="white" stroke-width="3" fill="none" opacity="0.2"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 22)}" y="74" width="${tagW(content.tag, typo.tagSize) + 44}" height="42" rx="21" fill="white" opacity="0.16"/>
  <rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 22)}" y="74" width="${tagW(content.tag, typo.tagSize) + 44}" height="42" rx="21" fill="none" stroke="white" stroke-width="1" opacity="0.2"/>
  ${renderTextLines(content.tag, cx, 102, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#E0E7FF', '500', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, cx, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#FFFFFF', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 280, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#C7D2FE', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 6. dark-fade
// ============================================================
const darkFade = {
  id: 'dark-fade', name: '暗夜渐变', category: 'gradient',
  elements: { tag: false, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="df-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0F172A"/><stop offset="100%" stop-color="#1E1B4B"/></linearGradient>
    <radialGradient id="df-o1" cx="0.7" cy="0.3"><stop offset="0%" stop-color="#6366F1" stop-opacity="0.15"/><stop offset="100%" stop-color="#6366F1" stop-opacity="0"/></radialGradient>
    <radialGradient id="df-o2" cx="0.2" cy="0.7"><stop offset="0%" stop-color="#818CF8" stop-opacity="0.1"/><stop offset="100%" stop-color="#818CF8" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#df-bg)"/>
  <rect width="1200" height="510" fill="url(#df-o1)"/><rect width="1200" height="510" fill="url(#df-o2)"/>
  <circle cx="850" cy="120" r="150" fill="#6366F1" opacity="0.07"/>
  <circle cx="850" cy="120" r="100" fill="none" stroke="#818CF8" stroke-width="1.5" opacity="0.14"/>
  <circle cx="200" cy="380" r="120" fill="#818CF8" opacity="0.05"/>
  <circle cx="1100" cy="400" r="80" fill="#A78BFA" opacity="0.06"/>
  <line x1="80" y1="382" x2="300" y2="382" stroke="#6366F1" stroke-width="3" opacity="0.6"/>
  <line x1="80" y1="390" x2="200" y2="390" stroke="#818CF8" stroke-width="1.5" opacity="0.4"/>
  <line x1="80" y1="100" x2="180" y2="100" stroke="#6366F1" stroke-width="1.5" opacity="0.4"/>
  <circle cx="400" cy="80" r="3" fill="#818CF8" opacity="0.5"/>
  <circle cx="700" cy="430" r="3" fill="#6366F1" opacity="0.45"/>
  <circle cx="1000" cy="250" r="3" fill="#A78BFA" opacity="0.3"/>
  <line x1="900" y1="0" x2="1200" y2="300" stroke="#6366F1" stroke-width="1" opacity="0.16"/>
  <rect x="1050" y="60" width="22" height="22" fill="none" stroke="#6366F1" stroke-width="1.5" opacity="0.3" transform="rotate(45 1061 71)"/>
  <polygon points="950,440 962,422 974,440" fill="none" stroke="#818CF8" stroke-width="1.5" opacity="0.25"/>
  ${renderTextLines(content.title, 80, 205, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#E2E8F0', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 285, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#CBD5E1', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================

// ============================================================
// 8. dawn-light
// ============================================================
const dawnLight = {
  id: 'dawn-light', name: '晨曦渐变', category: 'gradient',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    const cx = 600;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dl-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C4B5FD"/><stop offset="50%" stop-color="#DDD6FE"/><stop offset="100%" stop-color="#EDE9FE"/></linearGradient>
    <radialGradient id="dl-sun" cx="0.82" cy="0.08"><stop offset="0%" stop-color="#FDE68A" stop-opacity="0.4"/><stop offset="50%" stop-color="#FDE68A" stop-opacity="0.14"/><stop offset="100%" stop-color="#FDE68A" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#dl-bg)"/><rect width="1200" height="510" fill="url(#dl-sun)"/>
  <!-- Bold sun rays -->
  <line x1="980" y1="40" x2="900" y2="170" stroke="#FBBF24" stroke-width="3" opacity="0.4"/>
  <line x1="980" y1="40" x2="830" y2="110" stroke="#FBBF24" stroke-width="2.5" opacity="0.3"/>
  <line x1="980" y1="40" x2="1070" y2="170" stroke="#FBBF24" stroke-width="3" opacity="0.4"/>
  <line x1="980" y1="40" x2="1130" y2="110" stroke="#FBBF24" stroke-width="2.5" opacity="0.3"/>
  <line x1="980" y1="40" x2="980" y2="180" stroke="#FBBF24" stroke-width="2.5" opacity="0.3"/>
  <circle cx="980" cy="40" r="34" fill="#FDE68A" opacity="0.5"/>
  <circle cx="980" cy="40" r="18" fill="#FDE68A" opacity="0.65"/>
  <!-- Soft clouds: single clean shape each -->
  <g opacity="0.2"><ellipse cx="220" cy="58" rx="88" ry="26" fill="white"/><ellipse cx="262" cy="52" rx="56" ry="22" fill="white"/><ellipse cx="178" cy="52" rx="48" ry="18" fill="white"/></g>
  <g opacity="0.13"><ellipse cx="740" cy="36" rx="72" ry="22" fill="white"/><ellipse cx="772" cy="30" rx="44" ry="17" fill="white"/></g>
  <g opacity="0.1"><ellipse cx="460" cy="432" rx="96" ry="24" fill="white"/><ellipse cx="510" cy="426" rx="58" ry="18" fill="white"/></g>
  <circle cx="120" cy="210" r="44" fill="none" stroke="white" stroke-width="2" opacity="0.35"/>
  <circle cx="120" cy="210" r="26" fill="none" stroke="white" stroke-width="1" opacity="0.28"/>
  <circle cx="1090" cy="340" r="50" fill="none" stroke="white" stroke-width="2" opacity="0.3"/>
  <line x1="100" y1="380" x2="360" y2="380" stroke="#A78BFA" stroke-width="1.5" opacity="0.4"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="70" width="${tagW(content.tag, typo.tagSize) + 32}" height="34" rx="17" fill="#7C3AED" opacity="0.18"/>
  <rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="70" width="${tagW(content.tag, typo.tagSize) + 32}" height="34" rx="17" fill="none" stroke="#7C3AED" stroke-width="1" opacity="0.25"/>
  ${renderTextLines(content.tag, cx, 94, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#5B21B6', '600', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, cx, 205, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#1E1B4B', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 285, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#4C1D95', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 9. aurora
// ============================================================
const aurora = {
  id: 'aurora', name: '极光渐变', category: 'gradient',
  elements: { tag: false, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    const cx = 600;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="au-bg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#0F766E"/><stop offset="45%" stop-color="#4338CA"/><stop offset="100%" stop-color="#7E22CE"/></linearGradient>
    <linearGradient id="au-s1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#34D399" stop-opacity="0"/><stop offset="30%" stop-color="#34D399" stop-opacity="0.22"/><stop offset="70%" stop-color="#60A5FA" stop-opacity="0.18"/><stop offset="100%" stop-color="#60A5FA" stop-opacity="0"/></linearGradient>
    <linearGradient id="au-s2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#A78BFA" stop-opacity="0"/><stop offset="40%" stop-color="#A78BFA" stop-opacity="0.2"/><stop offset="60%" stop-color="#34D399" stop-opacity="0.14"/><stop offset="100%" stop-color="#34D399" stop-opacity="0"/></linearGradient>
    <radialGradient id="au-glow1" cx="0.3" cy="0.3"><stop offset="0%" stop-color="#34D399" stop-opacity="0.18"/><stop offset="100%" stop-color="#34D399" stop-opacity="0"/></radialGradient>
    <radialGradient id="au-glow2" cx="0.7" cy="0.7"><stop offset="0%" stop-color="#A78BFA" stop-opacity="0.16"/><stop offset="100%" stop-color="#A78BFA" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#au-bg)"/>
  <rect width="1200" height="510" fill="url(#au-glow1)"/><rect width="1200" height="510" fill="url(#au-glow2)"/>
  <!-- Aurora bands: wide, soft, readable at small size -->
  <rect x="0" y="40" width="1200" height="110" fill="url(#au-s1)"/>
  <rect x="0" y="330" width="1200" height="110" fill="url(#au-s2)"/>
  <path d="M0 100Q200 50 400 85Q600 120 800 70Q1000 20 1200 65" stroke="white" stroke-width="5" fill="none" opacity="0.07"/>
  <path d="M0 390Q250 430 500 395Q750 360 1000 405Q1100 425 1200 400" stroke="white" stroke-width="4" fill="none" opacity="0.06"/>
  <!-- Two bold vertical aurora curtains -->
  <path d="M160 0Q190 120 160 240Q130 360 160 510" stroke="#5EEAD4" stroke-width="6" fill="none" opacity="0.16"/>
  <path d="M880 0Q910 130 880 260Q850 380 880 510" stroke="#D8B4FE" stroke-width="6" fill="none" opacity="0.14"/>
  <ellipse cx="300" cy="255" rx="230" ry="255" fill="white" opacity="0.04"/>
  <ellipse cx="900" cy="255" rx="220" ry="255" fill="white" opacity="0.04"/>
  <!-- Few, larger particles -->
  <circle cx="220" cy="120" r="4" fill="white" opacity="0.4"/><circle cx="720" cy="90" r="3.5" fill="white" opacity="0.35"/>
  <circle cx="1020" cy="140" r="4" fill="white" opacity="0.3"/><circle cx="420" cy="420" r="3.5" fill="white" opacity="0.28"/>
  <circle cx="620" cy="440" r="3" fill="white" opacity="0.25"/>
  <!-- Strong divider under title block -->
  <line x1="480" y1="150" x2="720" y2="150" stroke="white" stroke-width="2.5" opacity="0.3"/>
  <polygon points="600,142 607,150 600,158 593,150" fill="white" opacity="0.35"/>
  ${renderTextLines(content.title, cx, 225, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#FFFFFF', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 305, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', 'rgba(255,255,255,0.82)', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 10. dot-matrix
// ============================================================
const dotMatrix = {
  id: 'dot-matrix', name: '圆点矩阵', category: 'geometric',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    const cx = 600;
    // Fewer, larger dots: a sparse radial halo that holds up at thumbnail size
    let dots = '';
    const ROWS = 7, COLS = 14;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const x = 64 + col * 82, y = 56 + row * 72;
        const dist = Math.sqrt((x - cx) ** 2 + (y - 250) ** 2);
        if (dist < 150) continue;
        const r = 3.2 + (col % 3);
        const op = Math.max(0.08, 0.16 - dist / 4200);
        dots += `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="#6366F1" opacity="${op.toFixed(2)}"/>`;
      }
    }
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dm-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F8FAFC"/><stop offset="100%" stop-color="#EEF2FF"/></linearGradient>
    <linearGradient id="dm-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#6366F1" stop-opacity="0"/><stop offset="50%" stop-color="#6366F1" stop-opacity="1"/><stop offset="100%" stop-color="#6366F1" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#dm-bg)"/>${dots}
  <circle cx="150" cy="90" r="110" fill="none" stroke="#C7D2FE" stroke-width="2.5" opacity="0.35"/>
  <circle cx="150" cy="90" r="70" fill="none" stroke="#A5B4FC" stroke-width="1.5" opacity="0.3"/>
  <rect x="1010" y="40" width="60" height="60" rx="12" fill="none" stroke="#818CF8" stroke-width="2" opacity="0.3" transform="rotate(15 1040 70)"/>
  <polygon points="90,420 115,385 140,420" fill="none" stroke="#818CF8" stroke-width="2" opacity="0.25"/>
  <rect x="150" y="70" width="900" height="360" rx="20" fill="white" opacity="0.96" stroke="#E0E7FF" stroke-width="1.5"/>
  <line x1="200" y1="150" x2="1000" y2="150" stroke="url(#dm-line)" stroke-width="2" opacity="0.5"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="86" width="${tagW(content.tag, typo.tagSize) + 32}" height="32" rx="16" fill="#EEF2FF"/>
  <rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="86" width="${tagW(content.tag, typo.tagSize) + 32}" height="32" rx="16" fill="none" stroke="#C7D2FE" stroke-width="1.5" opacity="0.6"/>
  ${renderTextLines(content.tag, cx, 109, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#4F46E5', '600', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, cx, 205, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#1E1B4B', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 285, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#4B5563', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 11. geo-overlap
// ============================================================
const geoOverlap = {
  id: 'geo-overlap', name: '几何拼接', category: 'geometric',
  elements: { tag: false, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    const cx = 600;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="go-ov" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FAFAFA"/><stop offset="100%" stop-color="#F3F4F6"/></linearGradient></defs>
  <rect width="1200" height="510" fill="url(#go-ov)"/>
  <circle cx="200" cy="120" r="180" fill="#6366F1" opacity="0.09"/>
  <circle cx="200" cy="120" r="130" fill="none" stroke="#818CF8" stroke-width="2" opacity="0.16"/>
  <circle cx="350" cy="300" r="140" fill="#A855F7" opacity="0.09"/>
  <circle cx="350" cy="300" r="90" fill="none" stroke="#C084FC" stroke-width="1.5" opacity="0.14"/>
  <rect x="800" y="50" width="300" height="200" fill="#EC4899" opacity="0.07" transform="rotate(10,950,150)"/>
  <rect x="810" y="60" width="280" height="180" fill="none" stroke="#F472B6" stroke-width="1.5" opacity="0.14" transform="rotate(10,950,150)"/>
  <rect x="900" y="280" width="200" height="200" fill="#4F46E5" opacity="0.07" transform="rotate(-5,1000,380)"/>
  <circle cx="1050" cy="100" r="60" fill="#8B5CF6" opacity="0.12"/>
  <circle cx="1050" cy="100" r="40" fill="none" stroke="#A78BFA" stroke-width="1.5" opacity="0.2"/>
  <polygon points="600,30 650,100 550,100" fill="#F59E0B" opacity="0.08"/>
  <polygon points="600,40 640,95 560,95" fill="none" stroke="#FBBF24" stroke-width="1.5" opacity="0.14"/>
  <circle cx="700" cy="400" r="80" fill="#14B8A6" opacity="0.06"/>
  <circle cx="100" cy="400" r="100" fill="#F472B6" opacity="0.05"/>
  <rect x="100" y="140" width="1000" height="220" rx="14" fill="white" opacity="0.92"/>
  <rect x="100" y="140" width="1000" height="220" rx="14" fill="none" stroke="#E5E7EB" stroke-width="1.5"/>
  <rect x="100" y="140" width="6" height="220" rx="3" fill="#6366F1"/>
  ${renderTextLines(content.title, cx, 222, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#111827', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 302, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#475569', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 12. triangle-comp
// ============================================================
const triangleComp = {
  id: 'triangle-comp', name: '三角构成', category: 'geometric',
  elements: { tag: false, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    const cx = 600;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tc-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0F172A"/><stop offset="100%" stop-color="#1E293B"/></linearGradient>
    <linearGradient id="tc-ac" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4F46E5" stop-opacity="0.15"/><stop offset="100%" stop-color="#4F46E5" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#tc-bg)"/>
  <polygon points="0,510 400,200 800,480" fill="#1E293B" stroke="#334155" stroke-width="1.5" opacity="0.65"/>
  <polygon points="600,0 1200,300 1200,0" fill="#1E293B" stroke="#334155" stroke-width="1.5" opacity="0.5"/>
  <polygon points="900,480 1100,300 1200,480" fill="#4F46E5" opacity="0.12"/>
  <polygon points="0,0 200,0 0,150" fill="#6366F1" opacity="0.1"/>
  <polygon points="100,350 180,280 260,350" fill="none" stroke="#475569" stroke-width="1.5" opacity="0.35"/>
  <polygon points="1000,100 1060,40 1120,100" fill="none" stroke="#4F46E5" stroke-width="1.5" opacity="0.3"/>
  <polygon points="500,450 550,400 600,450" fill="#6366F1" opacity="0.08"/>
  <polygon points="700,30 740,0 780,30" fill="#818CF8" opacity="0.07"/>
  <polygon points="400,100 800,100 600,350" fill="url(#tc-ac)"/>
  <line x1="200" y1="340" x2="400" y2="240" stroke="#4F46E5" stroke-width="1.5" opacity="0.3"/>
  <line x1="400" y1="240" x2="600" y2="340" stroke="#4F46E5" stroke-width="1.5" opacity="0.25"/>
  <circle cx="200" cy="340" r="3" fill="#6366F1" opacity="0.6"/><circle cx="400" cy="240" r="3" fill="#818CF8" opacity="0.5"/>
  <circle cx="600" cy="340" r="3" fill="#6366F1" opacity="0.45"/><circle cx="800" cy="150" r="3" fill="#818CF8" opacity="0.4"/>
  ${renderTextLines(content.title, cx, 215, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#F1F5F9', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 295, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#CBD5E1', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 13. frosted-glass
// ============================================================
const frostedGlass = {
  id: 'frosted-glass', name: '毛玻璃', category: 'glass-texture',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    const cx = 600;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fg-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#312E81"/><stop offset="100%" stop-color="#4F46E5"/></linearGradient>
    <radialGradient id="fg-center" cx="0.5" cy="0.5"><stop offset="0%" stop-color="#7C3AED" stop-opacity="0.25"/><stop offset="100%" stop-color="#4F46E5" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#fg-bg)"/>
  <rect width="1200" height="510" fill="url(#fg-center)"/>
  <!-- Large soft color orbs: glassy depth without pixel noise -->
  <circle cx="250" cy="110" r="210" fill="#6366F1" opacity="0.3"/>
  <circle cx="250" cy="110" r="130" fill="#818CF8" opacity="0.16"/>
  <circle cx="950" cy="400" r="240" fill="#818CF8" opacity="0.2"/>
  <circle cx="950" cy="400" r="150" fill="#A78BFA" opacity="0.13"/>
  <circle cx="600" cy="250" r="280" fill="#7C3AED" opacity="0.16"/>
  <circle cx="600" cy="250" r="180" fill="#8B5CF6" opacity="0.08"/>
  <path d="M80 300Q130 250 200 290Q250 320 220 380Q190 430 120 400Q60 370 80 300" fill="#A78BFA" opacity="0.1"/>
  <path d="M1010 190Q1060 150 1120 200Q1160 240 1120 290Q1070 330 1020 290Q980 240 1010 190" fill="#818CF8" opacity="0.08"/>
  <!-- Glass panel with bolder edge -->
  <rect x="120" y="55" width="960" height="370" rx="22" fill="white" opacity="0.12"/>
  <rect x="120" y="55" width="960" height="370" rx="22" fill="none" stroke="white" stroke-width="2" opacity="0.28"/>
  <rect x="126" y="61" width="948" height="358" rx="19" fill="none" stroke="white" stroke-width="0.6" opacity="0.14"/>
  <!-- Top highlight -->
  <line x1="145" y1="75" x2="1055" y2="75" stroke="white" stroke-width="1" opacity="0.18"/>
  <line x1="145" y1="405" x2="1055" y2="405" stroke="white" stroke-width="0.8" opacity="0.12"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 22)}" y="90" width="${tagW(content.tag, typo.tagSize) + 44}" height="40" rx="20" fill="white" opacity="0.16"/>
  <rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 22)}" y="90" width="${tagW(content.tag, typo.tagSize) + 44}" height="40" rx="20" fill="none" stroke="white" stroke-width="1" opacity="0.22"/>
  ${renderTextLines(content.tag, cx, 117, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#E0E7FF', '500', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, cx, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#FFFFFF', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 280, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#C7D2FE', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 14. paper-texture
// ============================================================
const paperTexture = {
  id: 'paper-texture', name: '纸质纹理', category: 'glass-texture',
  elements: { tag: false, title: true, subtitle: true, author: true, image: false },
  render(content, typo) {
    const cx = 600;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="510" fill="#F5F0E8"/>
  <!-- Deckled paper edge: bold, iconic, no pixel noise -->
  <path d="M0 0H1200V510H0Z" fill="#EFE9DC"/>
  <path d="M0 0H1200V36Q1190 42 1175 38Q1160 34 1145 40Q1130 46 1115 42Q1100 38 1085 44Q1070 50 1055 45Q1040 40 1025 46Q1010 52 995 47Q980 42 965 48Q950 54 935 49Q920 44 905 50Q890 56 875 51Q860 46 845 52Q830 58 815 53Q800 48 785 54Q770 60 755 55Q740 50 725 56Q710 62 695 57Q680 52 665 58Q650 64 635 59Q620 54 605 60Q590 66 575 61Q560 56 545 62Q530 68 515 63Q500 58 485 64Q470 70 455 65Q440 60 425 66Q410 72 395 67Q380 62 365 68Q350 74 335 69Q320 64 305 70Q290 76 275 71Q260 66 245 72Q230 78 215 73Q200 68 185 74Q170 80 155 75Q140 70 125 76Q110 82 95 77Q80 72 65 78Q50 84 35 79Q20 74 0 84V0Z" fill="#F5F0E8" opacity="0.8"/>
  <!-- Soft paper grain via two large radial washes instead of turbulence -->
  <ellipse cx="300" cy="140" rx="340" ry="180" fill="#E7DFCE" opacity="0.5"/>
  <ellipse cx="950" cy="380" rx="380" ry="200" fill="#EDE4D4" opacity="0.45"/>
  <!-- Minimal botanical corner accent -->
  <g opacity="0.35">
    <path d="M90 60Q112 38 140 52Q168 66 150 92Q132 118 100 108Q68 98 72 70Q74 50 90 60Z" fill="#A8D5BA"/>
    <path d="M108 84Q132 66 158 80Q184 94 166 122Q150 148 116 138Q82 128 84 98Q85 76 108 84Z" fill="#B5D8C7" opacity="0.8"/>
    <path d="M80 46Q88 30 102 34Q104 48 96 58Z" fill="#8FBF9F"/>
  </g>
  <!-- Bold rule above and below title block -->
  <line x1="200" y1="150" x2="1000" y2="150" stroke="#C9B99A" stroke-width="2" opacity="0.7"/>
  <line x1="220" y1="158" x2="980" y2="158" stroke="#D4C9B8" stroke-width="1" opacity="0.5"/>
  <line x1="200" y1="360" x2="1000" y2="360" stroke="#C9B99A" stroke-width="2" opacity="0.7"/>
  <polygon points="600,140 606,146 600,152 594,146" fill="#B49E7C" opacity="0.6"/>
  <polygon points="600,368 606,374 600,380 594,374" fill="#B49E7C" opacity="0.5"/>
  ${renderTextLines(content.title, cx, 215, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#2C1810', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 300, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#5C4B3F', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 17. frame-border
// ============================================================
const frameBorder = {
  id: 'frame-border', name: '画框留白', category: 'editorial',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    const cx = 600;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="fb-ac" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#4F46E5" stop-opacity="0"/><stop offset="50%" stop-color="#4F46E5" stop-opacity="1"/><stop offset="100%" stop-color="#4F46E5" stop-opacity="0"/></linearGradient></defs>
  <rect width="1200" height="510" fill="#FFFFFF"/>
  <rect x="60" y="40" width="1080" height="400" fill="none" stroke="#E5E7EB" stroke-width="2"/>
  <rect x="80" y="55" width="1040" height="370" fill="none" stroke="#E5E7EB" stroke-width="1" opacity="0.7"/>
  <path d="M60 55L60 40L75 40" fill="none" stroke="#4F46E5" stroke-width="3" opacity="0.7"/>
  <circle cx="68" cy="48" r="3.5" fill="#4F46E5" opacity="0.3"/>
  <path d="M1125 40L1140 40L1140 55" fill="none" stroke="#4F46E5" stroke-width="3" opacity="0.7"/>
  <circle cx="1132" cy="48" r="3.5" fill="#4F46E5" opacity="0.3"/>
  <path d="M1140 425L1140 440L1125 440" fill="none" stroke="#4F46E5" stroke-width="3" opacity="0.7"/>
  <circle cx="1132" cy="432" r="3.5" fill="#4F46E5" opacity="0.3"/>
  <path d="M75 440L60 440L60 425" fill="none" stroke="#4F46E5" stroke-width="3" opacity="0.7"/>
  <circle cx="68" cy="432" r="3.5" fill="#4F46E5" opacity="0.3"/>
  <circle cx="600" cy="40" r="3" fill="#D1D5DB" opacity="0.6"/><circle cx="600" cy="440" r="3" fill="#D1D5DB" opacity="0.6"/>
  <circle cx="60" cy="240" r="3" fill="#D1D5DB" opacity="0.6"/><circle cx="1140" cy="240" r="3" fill="#D1D5DB" opacity="0.6"/>
  <line x1="200" y1="380" x2="1000" y2="380" stroke="#E5E7EB" stroke-width="1"/>
  ${content.tag ? `<line x1="${cx - 40}" y1="95" x2="${cx + 40}" y2="95" stroke="url(#fb-ac)" stroke-width="3"/>
  ${renderTextLines(content.tag, cx, 128, typo.tagSize, typo.tagSize * 1.2, 3, 'center', '#4F46E5', '600', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, cx, 215, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#111827', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 295, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#475569', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 18. split-screen
// ============================================================
const splitScreen = {
  id: 'split-screen', name: '分割构成', category: 'editorial',
  elements: { tag: true, title: true, subtitle: true, author: true, image: false },
  render(content, typo) {
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ss-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4F46E5"/><stop offset="100%" stop-color="#3730A3"/></linearGradient>
    <linearGradient id="ss-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366F1"/><stop offset="50%" stop-color="#818CF8"/><stop offset="100%" stop-color="#6366F1"/></linearGradient>
  </defs>
  <rect width="1200" height="510" fill="#FAFAFA"/>
  <rect x="0" y="0" width="420" height="510" fill="url(#ss-l)"/>
  <!-- Left panel: bold orbit + corner brackets -->
  <circle cx="210" cy="240" r="120" fill="none" stroke="white" stroke-width="2" opacity="0.14"/>
  <circle cx="210" cy="240" r="70" fill="none" stroke="white" stroke-width="1.2" opacity="0.18"/>
  <circle cx="210" cy="240" r="26" fill="white" opacity="0.14"/>
  <circle cx="210" cy="240" r="7" fill="white" opacity="0.28"/>
  <path d="M28 28L28 66" stroke="white" stroke-width="2" opacity="0.3"/><path d="M28 28L66 28" stroke="white" stroke-width="2" opacity="0.3"/>
  <path d="M392 438L392 472" stroke="white" stroke-width="2" opacity="0.3"/><path d="M354 472L392 472" stroke="white" stroke-width="2" opacity="0.3"/>
  <!-- Gradient divider with accents -->
  <rect x="420" y="0" width="4" height="510" fill="url(#ss-d)" opacity="0.55"/>
  <circle cx="422" cy="120" r="5" fill="#818CF8" opacity="0.35"/>
  <circle cx="422" cy="255" r="4" fill="#6366F1" opacity="0.3"/>
  <circle cx="422" cy="390" r="5" fill="#818CF8" opacity="0.35"/>
  <!-- Right panel: single crisp ring -->
  <circle cx="1080" cy="80" r="54" fill="none" stroke="#C7D2FE" stroke-width="2" opacity="0.5"/>
  <circle cx="1080" cy="80" r="36" fill="none" stroke="#E0E7FF" stroke-width="1.2" opacity="0.4"/>
  <rect x="1040" y="388" width="64" height="64" rx="10" fill="none" stroke="#E0E7FF" stroke-width="2" opacity="0.45" transform="rotate(15 1072 420)"/>
  <line x1="480" y1="440" x2="740" y2="440" stroke="#D1D5DB" stroke-width="1.5"/>
  <polygon points="748,440 760,434 760,446" fill="#D1D5DB" opacity="0.6"/>
  ${content.tag ? renderTextLines(content.tag, 210, 178, typo.tagSize, typo.tagSize * 1.2, 2, 'center', '#A5B4FC', '500', typo.subtitleFontFamily, 'tag') : ''}
  <line x1="150" y1="208" x2="270" y2="208" stroke="white" stroke-width="1" opacity="0.4"/>
  ${content.author ? renderTextLines(content.author, 210, 380, typo.authorSize, typo.authorSize * 1.4, 1.5, 'center', 'rgba(255,255,255,0.45)', '300', typo.subtitleFontFamily, 'author') : ''}
  ${renderTextLines(content.title, 480, 185, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#111827', '800', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 480, 265, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#475569', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 19. digital-scene / 数字场景 (NEW)
// ============================================================
const digitalScene = {
  id: 'digital-scene', name: '数字场景', category: 'illustration',
  illustFit: 'side',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="ds-gl" cx="0.75" cy="0.5"><stop offset="0%" stop-color="#1E40AF" stop-opacity="0.35"/><stop offset="100%" stop-color="#0A192F" stop-opacity="0"/></radialGradient>
    <radialGradient id="ds-gl2" cx="0.2" cy="0.8"><stop offset="0%" stop-color="#3B82F6" stop-opacity="0.12"/><stop offset="100%" stop-color="#0A192F" stop-opacity="0"/></radialGradient>
    <linearGradient id="ds-ln" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#60A5FA" stop-opacity="0"/><stop offset="50%" stop-color="#60A5FA" stop-opacity="0.8"/><stop offset="100%" stop-color="#60A5FA" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1200" height="510" fill="#0A192F"/>
  <rect width="1200" height="510" fill="url(#ds-gl)"/>
  <rect width="1200" height="510" fill="url(#ds-gl2)"/>
  <image href="assets/images/cover-illustrations/isometric-devices.svg" x="620" y="30" width="560" height="420" opacity="0.9"/>
  <!-- Bold connection lines to the illustration -->
  <line x1="480" y1="190" x2="650" y2="170" stroke="url(#ds-ln)" stroke-width="2.5"/>
  <line x1="480" y1="290" x2="650" y2="310" stroke="url(#ds-ln)" stroke-width="2"/>
  <!-- Coarse perspective floor instead of fine grid -->
  <g opacity="0.09">
    <line x1="0" y1="200" x2="560" y2="200" stroke="#60A5FA" stroke-width="1"/>
    <line x1="0" y1="280" x2="560" y2="280" stroke="#60A5FA" stroke-width="1"/>
    <line x1="0" y1="360" x2="560" y2="360" stroke="#60A5FA" stroke-width="1"/>
    <line x1="0" y1="440" x2="560" y2="440" stroke="#60A5FA" stroke-width="1"/>
  </g>
  <g opacity="0.06">
    <line x1="0" y1="510" x2="300" y2="0" stroke="#60A5FA" stroke-width="1"/>
    <line x1="560" y1="510" x2="300" y2="0" stroke="#60A5FA" stroke-width="1"/>
  </g>
  <!-- Connection nodes -->
  <circle cx="480" cy="190" r="9" fill="#60A5FA" opacity="0.35"/>
  <circle cx="480" cy="190" r="5" fill="#93C5FD" opacity="0.8"/>
  <circle cx="480" cy="290" r="8" fill="#38BDF8" opacity="0.3"/>
  <circle cx="480" cy="290" r="4.5" fill="#7DD3FC" opacity="0.7"/>
  <!-- Sparse data chips -->
  <circle cx="200" cy="90" r="4" fill="#60A5FA" opacity="0.3"/>
  <circle cx="420" cy="420" r="4" fill="#38BDF8" opacity="0.25"/>
  <rect x="60" y="440" width="60" height="6" rx="3" fill="#60A5FA" opacity="0.3"/>
  <rect x="130" y="440" width="36" height="6" rx="3" fill="#60A5FA" opacity="0.2"/>
  <rect x="176" y="440" width="22" height="6" rx="3" fill="#3B82F6" opacity="0.15"/>
  ${content.tag ? `<rect x="80" y="86" width="${Math.max(64, tagW(content.tag, typo.tagSize) + 30)}" height="38" rx="7" fill="#60A5FA" opacity="0.14"/>
  <rect x="80" y="86" width="${Math.max(64, tagW(content.tag, typo.tagSize) + 30)}" height="38" rx="7" fill="none" stroke="#60A5FA" stroke-width="1" opacity="0.35"/>
  ${renderTextLines(content.tag, 96, 112, typo.tagSize, typo.tagSize * 1.2, 1, 'left', '#93C5FD', '500', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, 80, 190, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#F1F5F9', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 270, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#CBD5E1', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 22. warm-showcase / 暖色展示 (NEW)
// ============================================================
const warmShowcase = {
  id: 'warm-showcase', name: '暖色展示', category: 'gradient',
  elements: { tag: true, title: true, subtitle: true, author: true, image: false },
  render(content, typo) {
    const cx = 600;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ws-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#C2410C"/><stop offset="50%" stop-color="#B45309"/><stop offset="100%" stop-color="#92400E"/></linearGradient>
    <radialGradient id="ws-gl" cx="0.3" cy="0.5"><stop offset="0%" stop-color="#F97316" stop-opacity="0.2"/><stop offset="100%" stop-color="#C2410C" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#ws-bg)"/>
  <rect width="1200" height="510" fill="url(#ws-gl)"/>
  <circle cx="200" cy="100" r="150" fill="white" opacity="0.04"/>
  <circle cx="100" cy="400" r="100" fill="white" opacity="0.03"/>
  <path d="M0 350Q200 310 400 340Q600 370 800 330" stroke="white" stroke-width="1" fill="none" opacity="0.06"/>
  <path d="M0 80Q150 100 300 70Q450 40 600 60" stroke="white" stroke-width="0.8" fill="none" opacity="0.05"/>
  ${content.tag ? `<rect x="80" y="80" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="32" rx="16" fill="#F97316"/>
  ${renderTextLines(content.tag, 94, 103, typo.tagSize, typo.tagSize * 1.2, 1, 'left', '#FFFFFF', '600', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, 80, 180, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '800', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 260, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#FED7AA', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  ${content.author ? renderTextLines(content.author, 80, 430, typo.authorSize, typo.authorSize * 1.4, 1, 'left', 'rgba(255,255,255,0.5)', '300', typo.subtitleFontFamily, 'author') : ''}
  <circle cx="480" cy="400" r="30" fill="none" stroke="white" stroke-width="1.5" opacity="0.2"/>
  <circle cx="480" cy="400" r="20" fill="white" opacity="0.08"/>
  <circle cx="480" cy="400" r="4" fill="white" opacity="0.3"/>
  <image href="assets/images/cover-illustrations/mockup-cards.svg" x="600" y="20" width="580" height="440" opacity="0.85"/>
  <circle cx="560" cy="80" r="3" fill="white" opacity="0.3"/><circle cx="580" cy="400" r="2" fill="white" opacity="0.25"/>
  <rect x="540" y="200" width="16" height="16" rx="2" fill="none" stroke="white" stroke-width="0.8" opacity="0.15" transform="rotate(20 548 208)"/>
  <polygon points="570,300 578,288 586,300" fill="none" stroke="white" stroke-width="0.8" opacity="0.12"/>
  <circle cx="300" cy="60" r="2" fill="white" opacity="0.2"/><circle cx="450" cy="50" r="1.5" fill="white" opacity="0.15"/>
</svg>`;
  }
};

// ============================================================
// 23. playful-mascot / 趣味吉祥物 (NEW)
// ============================================================
const playfulMascot = {
  id: 'playful-mascot', name: '趣味吉祥物', category: 'gradient',
  elements: { tag: true, title: true, subtitle: true, author: true, image: false },
  render(content, typo) {
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pm-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0D9488"/><stop offset="100%" stop-color="#10B981"/></linearGradient>
    <radialGradient id="pm-gl" cx="0.3" cy="0.4"><stop offset="0%" stop-color="#14B8A6" stop-opacity="0.3"/><stop offset="100%" stop-color="#0D9488" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#pm-bg)"/>
  <rect width="1200" height="510" fill="url(#pm-gl)"/>
  <circle cx="200" cy="80" r="120" fill="white" opacity="0.05"/>
  <circle cx="100" cy="350" r="80" fill="white" opacity="0.04"/>
  <circle cx="500" cy="450" r="60" fill="white" opacity="0.04"/>
  <circle cx="300" cy="70" r="5" fill="white" opacity="0.35"/><circle cx="330" cy="70" r="5" fill="white" opacity="0.28"/>
  <circle cx="360" cy="70" r="5" fill="white" opacity="0.22"/>
  <circle cx="450" cy="100" r="5" fill="white" opacity="0.3"/><circle cx="500" cy="420" r="4" fill="white" opacity="0.25"/>
  <!-- Dark footer bar -->
  <rect x="0" y="430" width="1200" height="50" fill="#134E4A" opacity="0.65"/>
  <line x1="0" y1="430" x2="1200" y2="430" stroke="#0F766E" stroke-width="2" opacity="0.5"/>
  <!-- Left side bold text -->
  ${content.tag ? `<rect x="80" y="60" width="${Math.max(64, tagW(content.tag, typo.tagSize) + 28)}" height="34" rx="8" fill="#134E4A" opacity="0.55"/>
  <rect x="80" y="60" width="${Math.max(64, tagW(content.tag, typo.tagSize) + 28)}" height="34" rx="8" fill="none" stroke="#5EEAD4" stroke-width="1" opacity="0.4"/>
  ${renderTextLines(content.tag, 94, 84, typo.tagSize, typo.tagSize * 1.2, 1, 'left', '#99F6E4', '600', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, 80, 172, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '900', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 252, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#E6FFFA', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  ${content.author ? `<text x="80" y="460" font-size="${typo.authorSize}" font-family="${typo.subtitleFontFamily}" fill="rgba(255,255,255,0.65)" letter-spacing="1" data-field="author" data-field-line="0" data-line-height="${typo.authorSize * 1.4}">${esc(content.author)}</text>` : ''}
  <!-- Right side mascot character -->
  <image href="assets/images/cover-illustrations/mascot-character.svg" x="680" y="10" width="480" height="420" opacity="0.9"/>
  <!-- Floating decorative elements -->
  <circle cx="640" cy="100" r="6" fill="#FBBF24" opacity="0.5"/>
  <circle cx="660" cy="350" r="5" fill="#F59E0B" opacity="0.4"/>
  <rect x="618" y="200" width="20" height="20" rx="4" fill="none" stroke="white" stroke-width="1.5" opacity="0.25" transform="rotate(20 628 210)"/>
  <polygon points="650,280 660,266 670,280" fill="none" stroke="white" stroke-width="1.5" opacity="0.22"/>
</svg>`;
  }
};

// ============================================================
// 24. illust-right / 右图排版
// ============================================================
const illustRight = {
  id: 'illust-right', name: '右图排版', category: 'illustration',
  illustFit: 'side',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    const illustBlock = content.illustrationSvg
      ? illustrationLayer(embedIllustration(content.illustrationSvg, 620, 30, 540, 420, illustrationOpacity(content, 0.95)))
      : `<g opacity="0.08">
          <circle cx="860" cy="200" r="140" fill="#4F46E5"/>
          <circle cx="780" cy="300" r="80" fill="#818CF8"/>
          <rect x="900" y="100" width="120" height="120" rx="16" fill="#6366F1" transform="rotate(15 960 160)"/>
          <circle cx="1000" cy="350" r="60" fill="#A78BFA"/>
        </g>
        <circle cx="860" cy="200" r="100" fill="none" stroke="#C7D2FE" stroke-width="1" opacity="0.3"/>
        <circle cx="860" cy="200" r="60" fill="none" stroke="#A5B4FC" stroke-width="0.5" opacity="0.25"/>`;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="ir-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="0.8" fill="#C7D2FE" opacity="0.35"/></pattern>
  </defs>
  <rect width="1200" height="510" fill="#F8FAFC"/>
  <rect x="0" y="0" width="600" height="510" fill="white" opacity="0.55"/>
  <rect x="0" y="0" width="600" height="510" fill="url(#ir-dots)"/>
  <path d="M620 60 Q640 40 660 60 Q680 80 660 100 Q640 120 620 100 Q600 80 620 60Z" fill="#EEF2FF" opacity="0.6"/>
  <path d="M560 380 Q580 360 600 380 Q610 400 590 410 Q570 420 560 400Z" fill="#E0E7FF" opacity="0.45"/>
  <line x1="600" y1="30" x2="600" y2="450" stroke="#CBD5E1" stroke-width="1.5" opacity="0.7"/>
  <path d="M620 30 L620 54 M620 30 L644 30" stroke="#C7D2FE" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M1170 30 L1170 54 M1170 30 L1146 30" stroke="#C7D2FE" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M620 450 L620 426 M620 450 L644 450" stroke="#C7D2FE" stroke-width="2" fill="none" opacity="0.6"/>
  <path d="M1170 450 L1170 426 M1170 450 L1146 450" stroke="#C7D2FE" stroke-width="2" fill="none" opacity="0.6"/>
  <rect x="80" y="62" width="7" height="34" rx="3.5" fill="#4F46E5"/>
  ${content.tag ? `<rect x="80" y="100" width="${Math.max(64, tagW(content.tag, typo.tagSize) + 30)}" height="38" rx="19" fill="#EEF2FF"/>
  <rect x="80" y="100" width="${Math.max(64, tagW(content.tag, typo.tagSize) + 30)}" height="38" rx="19" fill="none" stroke="#C7D2FE" stroke-width="1.5" opacity="0.7"/>
  ${renderTextLines(content.tag, 96, 126, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#4F46E5', '600', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, 80, 205, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#0F172A', '800', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 285, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#475569', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  <line x1="80" y1="380" x2="200" y2="380" stroke="#C7D2FE" stroke-width="2.5" opacity="0.6"/>
  <line x1="206" y1="380" x2="340" y2="380" stroke="#E2E8F0" stroke-width="1" opacity="0.6"/>
  <circle cx="203" cy="380" r="3" fill="#C7D2FE" opacity="0.7"/>
  <circle cx="70" cy="200" r="4" fill="#A5B4FC" opacity="0.35"/>
  <circle cx="540" cy="90" r="3.5" fill="#818CF8" opacity="0.3"/>
  <circle cx="60" cy="420" r="3" fill="#C7D2FE" opacity="0.4"/>
  <circle cx="500" cy="430" r="4" fill="#A5B4FC" opacity="0.3"/>
  ${illustBlock}
</svg>`;
  }
};

// ============================================================
// 25. illust-left / 左图排版
// ============================================================
const illustLeft = {
  id: 'illust-left', name: '左图排版', category: 'illustration',
  illustFit: 'side',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    const illustBlock = content.illustrationSvg
      ? illustrationLayer(`<defs><radialGradient id="il-glow" cx="0.5" cy="0.5"><stop offset="0%" stop-color="#6366F1" stop-opacity="0.25"/><stop offset="100%" stop-color="#6366F1" stop-opacity="0"/></radialGradient></defs>
        <circle cx="280" cy="240" r="200" fill="url(#il-glow)"/>
        ${embedIllustration(content.illustrationSvg, 30, 30, 520, 420, illustrationOpacity(content, 0.9))}`)
      : `<defs><radialGradient id="il-glow" cx="0.5" cy="0.5"><stop offset="0%" stop-color="#6366F1" stop-opacity="0.2"/><stop offset="100%" stop-color="#6366F1" stop-opacity="0"/></radialGradient></defs>
        <circle cx="280" cy="240" r="200" fill="url(#il-glow)"/>
        <circle cx="280" cy="240" r="120" fill="none" stroke="#6366F1" stroke-width="1" opacity="0.2"/>
        <circle cx="280" cy="240" r="80" fill="none" stroke="#818CF8" stroke-width="0.5" opacity="0.15"/>
        <circle cx="280" cy="240" r="40" fill="#6366F1" opacity="0.06"/>
        <circle cx="200" cy="160" r="3" fill="#818CF8" opacity="0.3"/>
        <circle cx="360" cy="320" r="2.5" fill="#A78BFA" opacity="0.25"/>`;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="510" fill="#0F172A"/>
  <circle cx="120" cy="90" r="3.5" fill="#818CF8" opacity="0.3"/><circle cx="330" cy="60" r="3" fill="#A78BFA" opacity="0.25"/>
  <circle cx="520" cy="430" r="3.5" fill="#6366F1" opacity="0.3"/><circle cx="170" cy="400" r="3" fill="#818CF8" opacity="0.25"/>
  ${illustBlock}
  <line x1="620" y1="110" x2="620" y2="370" stroke="#334155" stroke-width="2"/>
  <line x1="620" y1="110" x2="620" y2="370" stroke="#4F46E5" stroke-width="1" opacity="0.4"/>
  ${content.tag ? `<rect x="660" y="108" width="${Math.max(64, tagW(content.tag, typo.tagSize) + 30)}" height="34" rx="17" fill="#6366F1" opacity="0.24"/>
  <rect x="660" y="108" width="${Math.max(64, tagW(content.tag, typo.tagSize) + 30)}" height="34" rx="17" fill="none" stroke="#818CF8" stroke-width="1" opacity="0.4"/>
  ${renderTextLines(content.tag, 676, 131, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#A5B4FC', '600', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, 1140, 205, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'right', '#F1F5F9', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 1140, 285, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'right', '#CBD5E1', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  <line x1="700" y1="422" x2="1140" y2="422" stroke="#334155" stroke-width="1.5"/>
  <line x1="700" y1="426" x2="940" y2="426" stroke="#4F46E5" stroke-width="0.8" opacity="0.5"/>
</svg>`;
  }
};

// ============================================================
// 26. illust-center-top / 居上图下
// ============================================================
const illustCenterTop = {
  id: 'illust-center-top', name: '居上图下', category: 'illustration',
  illustFit: 'landscape',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    const cx = 600;
    const illustBlock = content.illustrationSvg
      ? illustrationLayer(embedIllustration(content.illustrationSvg, 440, 15, 320, 220, illustrationOpacity(content, 0.95)))
      : `<g opacity="0.12">
          <circle cx="600" cy="110" r="70" fill="#F59E0B"/>
          <circle cx="540" cy="140" r="40" fill="#FBBF24"/>
          <circle cx="660" cy="140" r="40" fill="#FBBF24"/>
        </g>
        <circle cx="600" cy="120" r="60" fill="none" stroke="#F59E0B" stroke-width="1" opacity="0.2"/>
        <circle cx="520" cy="80" r="4" fill="#FBBF24" opacity="0.2"/>
        <circle cx="680" cy="80" r="4" fill="#FBBF24" opacity="0.2"/>
        <circle cx="500" cy="160" r="3" fill="#F59E0B" opacity="0.15"/>
        <circle cx="700" cy="160" r="3" fill="#F59E0B" opacity="0.15"/>`;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="510" fill="#FFF8F0"/>
  <circle cx="200" cy="80" r="80" fill="#FFECD2" opacity="0.45"/>
  <circle cx="1000" cy="80" r="80" fill="#FFECD2" opacity="0.45"/>
  <circle cx="200" cy="80" r="52" fill="none" stroke="#F5DEB3" stroke-width="1.5" opacity="0.4"/>
  <circle cx="1000" cy="80" r="52" fill="none" stroke="#F5DEB3" stroke-width="1.5" opacity="0.4"/>
  <circle cx="440" cy="40" r="8" fill="#A8D5BA" opacity="0.3"/>
  <circle cx="760" cy="40" r="8" fill="#A8D5BA" opacity="0.3"/>
  <circle cx="420" cy="200" r="6" fill="#F59E0B" opacity="0.25"/>
  <circle cx="780" cy="200" r="6" fill="#F59E0B" opacity="0.25"/>
  ${illustBlock}
  <line x1="460" y1="252" x2="740" y2="252" stroke="#C9B8A4" stroke-width="1.5" opacity="0.8"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="264" width="${tagW(content.tag, typo.tagSize) + 32}" height="34" rx="17" fill="#FEF3C7"/>
  <rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="264" width="${tagW(content.tag, typo.tagSize) + 32}" height="34" rx="17" fill="none" stroke="#FCD34D" stroke-width="1.5" opacity="0.7"/>
  ${renderTextLines(content.tag, cx, 288, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#B45309', '600', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, cx, 335, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#3E2723', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 415, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#6D4C3F', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 27. illust-split / 图文分割
// ============================================================
const illustSplit = {
  id: 'illust-split', name: '图文分割', category: 'illustration',
  illustFit: 'side',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    const illustBlock = content.illustrationSvg
      ? illustrationLayer(embedIllustration(content.illustrationSvg, 30, 30, 540, 420, illustrationOpacity(content, 0.95)))
      : `<g opacity="0.1">
          <circle cx="300" cy="200" r="100" fill="white"/>
          <rect x="180" y="260" width="160" height="100" rx="12" fill="white"/>
          <circle cx="220" cy="140" r="40" fill="white"/>
        </g>
        <circle cx="300" cy="220" r="80" fill="none" stroke="white" stroke-width="1" opacity="0.15"/>
        <circle cx="300" cy="220" r="40" fill="none" stroke="white" stroke-width="0.5" opacity="0.1"/>`;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="is-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7C3AED"/><stop offset="100%" stop-color="#4338CA"/></linearGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#is-bg)"/>
  <circle cx="120" cy="70" r="3.5" fill="white" opacity="0.3"/><circle cx="330" cy="50" r="3" fill="white" opacity="0.25"/>
  <circle cx="500" cy="440" r="3.5" fill="white" opacity="0.25"/>
  <rect x="20" y="20" width="570" height="440" rx="18" fill="white" opacity="0.12"/>
  <rect x="20" y="20" width="570" height="440" rx="18" fill="none" stroke="white" stroke-width="1.5" opacity="0.25"/>
  ${illustBlock}
  <line x1="620" y1="55" x2="620" y2="425" stroke="white" stroke-width="1.5" opacity="0.2"/>
  <line x1="622" y1="55" x2="622" y2="425" stroke="#C4B5FD" stroke-width="0.8" opacity="0.15"/>
  ${content.tag ? `<rect x="660" y="100" width="${Math.max(64, tagW(content.tag, typo.tagSize) + 30)}" height="34" rx="17" fill="white" opacity="0.18"/>
  <rect x="660" y="100" width="${Math.max(64, tagW(content.tag, typo.tagSize) + 30)}" height="34" rx="17" fill="none" stroke="white" stroke-width="1" opacity="0.3"/>
  ${renderTextLines(content.tag, 676, 123, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#E0E7FF', '500', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, 660, 205, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 660, 285, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#C4B5FD', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  <line x1="660" y1="420" x2="920" y2="420" stroke="white" stroke-width="1.5" opacity="0.25"/>
  <circle cx="660" cy="420" r="3" fill="white" opacity="0.35"/>
  <circle cx="920" cy="420" r="3" fill="white" opacity="0.3"/>
</svg>`;
  }
};

// ============================================================
// 28. illust-hero / 英雄横幅
// ============================================================
const illustHero = {
  id: 'illust-hero', name: '英雄横幅', category: 'illustration',
  illustFit: 'hero',
  elements: { tag: true, title: true, subtitle: true, author: true, image: false, illustration: true },
  render(content, typo) {
    const illustBlock = content.illustrationSvg
      ? illustrationLayer(`<g transform="rotate(-3, 900, 240)">
          ${embedIllustration(content.illustrationSvg, 580, 10, 600, 460, illustrationOpacity(content, 0.95))}
        </g>`)
      : `<g transform="rotate(-3, 900, 240)" opacity="0.1">
          <circle cx="860" cy="200" r="160" fill="white"/>
          <rect x="740" y="280" width="200" height="120" rx="16" fill="white"/>
        </g>
        <circle cx="860" cy="220" r="100" fill="none" stroke="white" stroke-width="1" opacity="0.12"/>`;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ih-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0D9488"/><stop offset="100%" stop-color="#10B981"/></linearGradient>
    <linearGradient id="ih-btm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0D9488" stop-opacity="0"/><stop offset="100%" stop-color="#064E3B" stop-opacity="0.5"/></linearGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#ih-bg)"/>
  <rect width="1200" height="510" fill="url(#ih-btm)"/>
  <circle cx="200" cy="80" r="120" fill="white" opacity="0.05"/>
  <circle cx="100" cy="350" r="80" fill="white" opacity="0.04"/>
  <path d="M40 200 Q60 170 90 190 Q120 210 100 240 Q80 270 50 250 Q20 230 40 200Z" fill="white" opacity="0.04"/>
  <path d="M30 30 L30 58 M30 30 L58 30" stroke="white" stroke-width="1.5" fill="none" opacity="0.16"/>
  <path d="M548 30 L548 58 M548 30 L520 30" stroke="white" stroke-width="1.5" fill="none" opacity="0.16"/>
  <circle cx="450" cy="120" r="4" fill="#99F6E4" opacity="0.3"/>
  <circle cx="320" cy="260" r="3.5" fill="#5EEAD4" opacity="0.28"/>
  <circle cx="50" cy="140" r="3.5" fill="#A7F3D0" opacity="0.3"/>
  <circle cx="250" cy="380" r="3" fill="#5EEAD4" opacity="0.25"/>
  ${illustBlock}
  ${content.tag ? `<rect x="80" y="78" width="${Math.max(64, tagW(content.tag, typo.tagSize) + 30)}" height="42" rx="9" fill="#134E4A" opacity="0.55"/>
  <rect x="80" y="78" width="${Math.max(64, tagW(content.tag, typo.tagSize) + 30)}" height="42" rx="9" fill="none" stroke="#5EEAD4" stroke-width="1.2" opacity="0.5"/>
  ${renderTextLines(content.tag, 96, 107, typo.tagSize, typo.tagSize * 1.2, 1, 'left', '#99F6E4', '600', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, 80, 195, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '800', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 275, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#A7F3D0', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  <path d="M0 428 Q300 412 600 428 Q900 444 1200 422" stroke="white" stroke-width="1.5" fill="none" opacity="0.22"/>
  <path d="M0 434 Q300 420 600 434 Q900 450 1200 428" stroke="#5EEAD4" stroke-width="0.8" fill="none" opacity="0.16"/>
  <rect x="0" y="438" width="1200" height="46" fill="#134E4A" opacity="0.5"/>
  <line x1="0" y1="438" x2="1200" y2="438" stroke="#0F766E" stroke-width="1.5" opacity="0.5"/>
  ${content.author ? renderTextLines(content.author, 80, 466, typo.authorSize, typo.authorSize * 1.4, 1, 'left', 'rgba(255,255,255,0.65)', '300', typo.subtitleFontFamily, 'author') : ''}
</svg>`;
  }
};

// ============================================================
// 29. illust-card / 卡片插画
// ============================================================
const illustCard = {
  id: 'illust-card', name: '卡片插画', category: 'illustration',
  illustFit: 'landscape',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    const cx = 600;
    const illustInner = content.illustrationSvg
      ? illustrationLayer(embedIllustration(content.illustrationSvg, 270, 65, 660, 220, illustrationOpacity(content, 0.95)))
      : `<g opacity="0.08">
          <circle cx="600" cy="160" r="60" fill="#4F46E5"/>
          <rect x="500" y="120" width="80" height="80" rx="10" fill="#818CF8"/>
          <circle cx="520" cy="180" r="30" fill="#A78BFA"/>
        </g>
        <circle cx="600" cy="160" r="50" fill="none" stroke="#C7D2FE" stroke-width="0.8" opacity="0.2"/>`;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ic-shadow"><feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="#000" flood-opacity="0.08"/></filter>
    <filter id="ic-shadow2"><feDropShadow dx="0" dy="8" stdDeviation="20" flood-color="#4F46E5" flood-opacity="0.06"/></filter>
    <pattern id="ic-dots" x="0" y="0" width="44" height="44" patternUnits="userSpaceOnUse"><circle cx="22" cy="22" r="2" fill="#C7D2FE" opacity="0.4"/></pattern>
  </defs>
  <rect width="1200" height="510" fill="#F8FAFC"/>
  <rect width="1200" height="510" fill="url(#ic-dots)"/>
  <path d="M100 400 Q130 370 160 395 Q190 420 160 445 Q130 470 100 445 Q70 420 100 400Z" fill="#EEF2FF" opacity="0.4"/>
  <path d="M1050 30 Q1080 10 1100 35 Q1120 60 1095 75 Q1070 90 1050 70 Q1030 50 1050 30Z" fill="#E0E7FF" opacity="0.3"/>
  <path d="M180 80 Q200 60 220 80 Q235 100 215 115 Q195 130 180 110 Q165 90 180 80Z" fill="#EEF2FF" opacity="0.25"/>
  <circle cx="140" cy="120" r="4" fill="#A5B4FC" opacity="0.3"/>
  <circle cx="1060" cy="380" r="3.5" fill="#818CF8" opacity="0.3"/>
  <circle cx="1100" cy="200" r="4" fill="#A5B4FC" opacity="0.28"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="18" width="${tagW(content.tag, typo.tagSize) + 32}" height="40" rx="20" fill="#EEF2FF"/>
  <rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="18" width="${tagW(content.tag, typo.tagSize) + 32}" height="40" rx="20" fill="none" stroke="#C7D2FE" stroke-width="1.5" opacity="0.6"/>
  ${renderTextLines(content.tag, cx, 45, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#4F46E5', '600', typo.subtitleFontFamily, 'tag')}` : ''}
  <rect x="240" y="55" width="720" height="370" rx="20" fill="white" filter="url(#ic-shadow2)"/>
  <rect x="240" y="55" width="720" height="370" rx="20" fill="white" filter="url(#ic-shadow)"/>
  <rect x="240" y="55" width="720" height="370" rx="20" fill="none" stroke="#E2E8F0" stroke-width="1.5"/>
  <line x1="262" y1="52" x2="294" y2="52" stroke="#C7D2FE" stroke-width="2" opacity="0.5"/>
  <line x1="908" y1="428" x2="940" y2="428" stroke="#C7D2FE" stroke-width="2" opacity="0.5"/>
  <line x1="272" y1="288" x2="928" y2="288" stroke="#F1F5F9" stroke-width="1.5"/>
  ${illustInner}
  ${renderTextLines(content.title, cx, 322, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#0F172A', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 402, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#475569', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 30. illust-wave / 波浪插画
// ============================================================
const illustWave = {
  id: 'illust-wave', name: '波浪插画', category: 'illustration',
  illustFit: 'side',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    const illustBlock = content.illustrationSvg
      ? illustrationLayer(embedIllustration(content.illustrationSvg, 640, 50, 520, 380, illustrationOpacity(content, 0.9)))
      : `<g opacity="0.08">
          <circle cx="880" cy="220" r="120" fill="#0EA5E9"/>
          <circle cx="800" cy="280" r="60" fill="#38BDF8"/>
          <rect x="920" y="140" width="80" height="80" rx="12" fill="#7DD3FC"/>
        </g>
        <circle cx="880" cy="220" r="80" fill="none" stroke="#BAE6FD" stroke-width="0.8" opacity="0.2"/>`;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="iw-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E0F2FE"/><stop offset="100%" stop-color="#FFFFFF"/></linearGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#iw-bg)"/>
  <path d="M0 60Q200 20 400 50Q600 80 800 40Q1000 0 1200 30" stroke="#BAE6FD" stroke-width="2" fill="none" opacity="0.4"/>
  <path d="M0 80Q200 40 400 70Q600 100 800 60Q1000 20 1200 50" stroke="#7DD3FC" stroke-width="1" fill="none" opacity="0.3"/>
  <path d="M0 420Q200 450 400 430Q600 410 800 440Q1000 470 1200 450" stroke="#BAE6FD" stroke-width="2" fill="none" opacity="0.3"/>
  <path d="M0 440Q200 470 400 450Q600 430 800 460Q1000 490 1200 470" stroke="#7DD3FC" stroke-width="1" fill="none" opacity="0.2"/>
  <rect x="80" y="140" width="6" height="200" rx="3" fill="#0EA5E9"/>
  ${content.tag ? renderTextLines(content.tag, 110, 170, typo.tagSize, typo.tagSize * 1.2, 2, 'left', '#0284C7', '600', typo.subtitleFontFamily, 'tag') : ''}
  ${renderTextLines(content.title, 110, 220, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#0C4A6E', '800', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 110, 300, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#475569', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  <line x1="110" y1="420" x2="350" y2="420" stroke="#BAE6FD" stroke-width="0.5"/>
  ${illustBlock}
</svg>`;
  }
};

// ============================================================
// 31. illust-dark-glow / 暗夜发光
// ============================================================
const illustDarkGlow = {
  id: 'illust-dark-glow', name: '暗夜发光', category: 'illustration',
  illustFit: 'glow',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    const cx = 600;
    const illustBlock = content.illustrationSvg
      ? illustrationLayer(`<defs>
          <filter id="idg-blur"><feGaussianBlur stdDeviation="20"/></filter>
          <radialGradient id="idg-glow" cx="0.5" cy="0.5"><stop offset="0%" stop-color="#A855F7" stop-opacity="0.4"/><stop offset="100%" stop-color="#A855F7" stop-opacity="0"/></radialGradient>
        </defs>
        <circle cx="900" cy="220" r="180" fill="url(#idg-glow)" filter="url(#idg-blur)"/>
        ${embedIllustration(content.illustrationSvg, 640, 20, 520, 420, illustrationOpacity(content, 0.95))}`)
      : `<defs>
          <filter id="idg-blur"><feGaussianBlur stdDeviation="20"/></filter>
          <radialGradient id="idg-glow" cx="0.5" cy="0.5"><stop offset="0%" stop-color="#A855F7" stop-opacity="0.35"/><stop offset="100%" stop-color="#A855F7" stop-opacity="0"/></radialGradient>
        </defs>
        <circle cx="900" cy="220" r="180" fill="url(#idg-glow)" filter="url(#idg-blur)"/>
        <circle cx="900" cy="220" r="80" fill="none" stroke="#A855F7" stroke-width="1" opacity="0.2"/>
        <circle cx="900" cy="220" r="40" fill="#A855F7" opacity="0.06"/>`;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="idg-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0A0A1A"/><stop offset="100%" stop-color="#1A1A3E"/></linearGradient>
    <radialGradient id="idg-glow2" cx="0.3" cy="0.7"><stop offset="0%" stop-color="#7C3AED" stop-opacity="0.14"/><stop offset="100%" stop-color="#7C3AED" stop-opacity="0"/></radialGradient>
    <radialGradient id="idg-glow3" cx="0.15" cy="0.3"><stop offset="0%" stop-color="#C084FC" stop-opacity="0.1"/><stop offset="100%" stop-color="#C084FC" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#idg-bg)"/>
  <rect width="1200" height="510" fill="url(#idg-glow2)"/>
  <rect width="1200" height="510" fill="url(#idg-glow3)"/>
  <!-- Few, larger sparkles instead of a particle field -->
  <circle cx="180" cy="110" r="3.5" fill="#A855F7" opacity="0.4"/>
  <circle cx="420" cy="70" r="3" fill="#C084FC" opacity="0.32"/>
  <circle cx="320" cy="420" r="3.5" fill="#7C3AED" opacity="0.3"/>
  <circle cx="520" cy="360" r="3" fill="#D8B4FE" opacity="0.3"/>
  <circle cx="130" cy="300" r="2.5" fill="#C084FC" opacity="0.28"/>
  <circle cx="260" cy="200" r="2.5" fill="#A855F7" opacity="0.26"/>
  <path d="M60 160Q90 130 120 150Q150 170 130 200Q110 230 80 210Q50 190 60 160Z" fill="#7C3AED" opacity="0.06"/>
  <path d="M480 380Q510 360 530 385Q550 410 525 425Q500 440 480 420Q460 400 480 380Z" fill="#A855F7" opacity="0.05"/>
  <line x1="90" y1="190" x2="240" y2="190" stroke="#A855F7" stroke-width="1.5" opacity="0.25"/>
  <path d="M34 34L34 64M34 34L64 34" stroke="#A855F7" stroke-width="2" fill="none" opacity="0.3"/>
  <path d="M566 34L566 64M566 34L536 34" stroke="#A855F7" stroke-width="2" fill="none" opacity="0.3"/>
  ${illustBlock}
  ${content.tag ? `<rect x="80" y="100" width="${Math.max(64, tagW(content.tag, typo.tagSize) + 30)}" height="38" rx="19" fill="#A855F7" opacity="0.22"/>
  <rect x="80" y="100" width="${Math.max(64, tagW(content.tag, typo.tagSize) + 30)}" height="38" rx="19" fill="none" stroke="#A855F7" stroke-width="1" opacity="0.45"/>
  ${renderTextLines(content.tag, 96, 126, typo.tagSize, typo.tagSize * 1.2, 1, 'left', '#D8B4FE', '600', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, 80, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '800', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 280, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#C084FC', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  <line x1="80" y1="382" x2="210" y2="382" stroke="#A855F7" stroke-width="2" opacity="0.45"/>
  <line x1="216" y1="382" x2="360" y2="382" stroke="#7C3AED" stroke-width="1" opacity="0.28"/>
  <circle cx="213" cy="382" r="3" fill="#A855F7" opacity="0.5"/>
</svg>`;
  }
};

// ============================================================
// 32. illust-magazine / 杂志插画
// ============================================================
const illustMagazine = {
  id: 'illust-magazine', name: '杂志插画', category: 'illustration',
  illustFit: 'side',
  elements: { tag: false, title: true, subtitle: true, author: true, issue: true, image: false, illustration: true },
  render(content, typo) {
    const illustBlock = content.illustrationSvg
      ? illustrationLayer(embedIllustration(content.illustrationSvg, 640, 20, 540, 440, illustrationOpacity(content, 0.95)))
      : `<g opacity="0.06">
          <circle cx="900" cy="200" r="140" fill="#111827"/>
          <rect x="800" y="280" width="160" height="100" rx="8" fill="#111827"/>
        </g>
        <circle cx="900" cy="220" r="80" fill="none" stroke="#D1D5DB" stroke-width="0.8" opacity="0.2"/>
        <line x1="820" y1="220" x2="980" y2="220" stroke="#D1D5DB" stroke-width="0.5" opacity="0.15"/>`;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="510" fill="#FAFAFA"/>
  <text x="80" y="80" font-size="72" font-family="${SERIF_FAMILY}" fill="#E5E7EB" font-weight="700" letter-spacing="-2" data-field="issueNumber" data-field-line="0" data-line-height="72">${esc(content.issueNumber || 'No.01')}</text>
  <line x1="80" y1="100" x2="580" y2="100" stroke="#111827" stroke-width="2"/>
  <line x1="80" y1="106" x2="400" y2="106" stroke="#D1D5DB" stroke-width="0.5"/>
  ${renderTextLines(content.title, 80, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#111827', '700', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 280, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#475569', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  <line x1="80" y1="400" x2="580" y2="400" stroke="#E5E7EB" stroke-width="1"/>
  ${content.author ? renderTextLines(content.author, 80, 440, typo.authorSize, typo.authorSize * 1.4, 1, 'left', '#6B7280', '400', typo.subtitleFontFamily, 'author') : ''}
  ${illustBlock}
</svg>`;
  }
};

// ============================================================
// 33. tech-neural-grid / 神经网格
// ============================================================
const techNeuralGrid = {
  id: 'tech-neural-grid', name: '神经网格', category: 'illustration',
  illustFit: 'side',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    const illustBlock = content.illustrationSvg
      ? illustrationLayer(`<defs>
          <radialGradient id="tng-ill-glow" cx="0.5" cy="0.5"><stop offset="0%" stop-color="#22D3EE" stop-opacity="0.28"/><stop offset="100%" stop-color="#22D3EE" stop-opacity="0"/></radialGradient>
        </defs>
        <path d="M760 88C850 28 1012 68 1072 164C1140 272 1034 396 902 392C778 388 700 306 720 206C728 156 740 112 760 88Z" fill="#0891B2" opacity="0.13"/>
        <circle cx="910" cy="238" r="220" fill="url(#tng-ill-glow)"/>
        ${embedIllustration(content.illustrationSvg, 640, 30, 520, 420, illustrationOpacity(content, 0.92))}`)
      : `<g opacity="0.95">
          <path d="M760 88C850 28 1012 68 1072 164C1140 272 1034 396 902 392C778 388 700 306 720 206C728 156 740 112 760 88Z" fill="#0891B2" opacity="0.14"/>
          <path d="M740 172H1066M740 248H1090M780 324H1036" stroke="#67E8F9" stroke-width="2" opacity="0.32"/>
          <path d="M802 172L950 248L864 324L802 172" stroke="#67E8F9" stroke-width="2.6" fill="none" opacity="0.42"/>
          <circle cx="802" cy="172" r="8" fill="#67E8F9"/><circle cx="950" cy="248" r="8" fill="#A3E635"/><circle cx="864" cy="324" r="8" fill="#38BDF8"/>
        </g>`;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tng-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#07111F"/><stop offset="58%" stop-color="#10213C"/><stop offset="100%" stop-color="#0F2F3B"/></linearGradient>
    <radialGradient id="tng-glow" cx="0.76" cy="0.47" r="0.5"><stop offset="0%" stop-color="#22D3EE" stop-opacity="0.34"/><stop offset="100%" stop-color="#22D3EE" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#tng-bg)"/>
  <rect width="1200" height="510" fill="url(#tng-glow)"/>
  <!-- Coarse grid nodes instead of full-grid pattern -->
  <g opacity="0.16">
    <circle cx="160" cy="120" r="3" fill="#67E8F9"/>
    <circle cx="320" cy="180" r="3" fill="#67E8F9"/>
    <circle cx="480" cy="120" r="3" fill="#A3E635"/>
    <circle cx="200" cy="300" r="3" fill="#38BDF8"/>
    <circle cx="400" cy="360" r="3" fill="#67E8F9"/>
  </g>
  <path d="M70 60H240M70 78H170" stroke="#67E8F9" stroke-width="1.5" opacity="0.24"/>
  <path d="M160 420H460" stroke="#38BDF8" stroke-width="5" opacity="0.42"/>
  <path d="M46 46L46 92M46 46L92 46" stroke="#67E8F9" stroke-width="2" fill="none" opacity="0.3"/>
  <path d="M552 440L552 396M552 440L508 440" stroke="#A3E635" stroke-width="1.5" fill="none" opacity="0.24"/>
  ${illustBlock}
  ${content.tag ? `<rect x="80" y="58" width="${Math.max(92, tagW(content.tag, typo.tagSize) + 34)}" height="40" rx="8" fill="#22D3EE" opacity="0.14"/>
  <rect x="80" y="58" width="${Math.max(92, tagW(content.tag, typo.tagSize) + 34)}" height="40" rx="8" fill="none" stroke="#67E8F9" stroke-width="1" opacity="0.4"/>
  ${renderTextLines(content.tag, 99, 85, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#67E8F9', '700', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, 80, 175, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#F8FAFC', '800', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 255, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#A7F3D0', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 34. tech-lab-console / 实验控制台
// ============================================================
const techLabConsole = {
  id: 'tech-lab-console', name: '实验控制台', category: 'illustration',
  illustFit: 'side',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    const illustBlock = content.illustrationSvg
      ? illustrationLayer(`<rect x="688" y="62" width="410" height="324" rx="30" fill="#FFFFFF" opacity="0.72" stroke="#BFDBFE" stroke-width="1.5"/>
        ${embedIllustration(content.illustrationSvg, 660, 34, 470, 390, illustrationOpacity(content, 0.9))}`)
      : `<g>
          <path d="M736 68H1072Q1120 68 1120 116V362Q1120 410 1072 410H736Q688 410 688 362V116Q688 68 736 68Z" fill="#FFFFFF" stroke="#BFDBFE" stroke-width="1.5"/>
          <rect x="732" y="122" width="136" height="20" rx="10" fill="#2563EB" opacity="0.24"/>
          <rect x="732" y="176" width="304" height="16" rx="8" fill="#94A3B8" opacity="0.18"/>
          <rect x="732" y="216" width="236" height="16" rx="8" fill="#94A3B8" opacity="0.16"/>
          <path d="M744 316C802 236 864 270 916 220C970 170 1024 204 1076 152" stroke="url(#tlc-line)" stroke-width="6" fill="none" opacity="0.76"/>
          <circle cx="744" cy="316" r="10" fill="#2563EB"/><circle cx="916" cy="220" r="10" fill="#16A34A"/><circle cx="1076" cy="152" r="10" fill="#2563EB"/>
        </g>`;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tlc-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F8FAFC"/><stop offset="48%" stop-color="#EEF2FF"/><stop offset="100%" stop-color="#DCFCE7"/></linearGradient>
    <linearGradient id="tlc-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#2563EB"/><stop offset="100%" stop-color="#16A34A"/></linearGradient>
    <pattern id="tlc-dots" width="44" height="44" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2" fill="#1D4ED8" opacity="0.14"/></pattern>
  </defs>
  <rect width="1200" height="510" fill="url(#tlc-bg)"/>
  <rect width="1200" height="510" fill="url(#tlc-dots)"/>
  <path d="M112 88H312M112 108H224" stroke="#1D4ED8" stroke-width="1.2" opacity="0.18"/>
  <path d="M108 408H384" stroke="#2563EB" stroke-width="4" opacity="0.24"/>
  <circle cx="1068" cy="384" r="68" fill="#22C55E" opacity="0.08"/>
  <circle cx="650" cy="84" r="9" fill="#2563EB" opacity="0.1"/><circle cx="604" cy="390" r="7" fill="#16A34A" opacity="0.12"/>
  ${illustBlock}
  ${content.tag ? renderTextLines(content.tag, 80, 88, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#1D4ED8', '700', typo.subtitleFontFamily, 'tag') : ''}
  ${renderTextLines(content.title, 80, 172, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#111827', '800', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 252, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#475569', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 35. product-launch-pad / 发布台
// ============================================================
const productLaunchPad = {
  id: 'product-launch-pad', name: '发布台', category: 'illustration',
  illustFit: 'side',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    const illustBlock = content.illustrationSvg
      ? illustrationLayer(`<path d="M764 72C888 40 1068 108 1110 242C1148 362 1012 434 862 400C730 370 660 254 700 156C714 120 732 88 764 72Z" fill="#DBEAFE"/>
        <path d="M784 112C892 80 1012 130 1048 226C1084 324 1000 380 894 362C796 344 740 266 764 182C772 150 780 128 784 112Z" fill="#CCFBF1" opacity="0.82"/>
        ${embedIllustration(content.illustrationSvg, 642, 40, 510, 400, illustrationOpacity(content, 0.92))}`)
      : `<g>
          <path d="M764 72C888 40 1068 108 1110 242C1148 362 1012 434 862 400C730 370 660 254 700 156C714 120 732 88 764 72Z" fill="#DBEAFE"/>
          <path d="M784 112C892 80 1012 130 1048 226C1084 324 1000 380 894 362C796 344 740 266 764 182C772 150 780 128 784 112Z" fill="#CCFBF1" opacity="0.82"/>
          <rect x="730" y="152" width="328" height="184" rx="36" fill="#FFFFFF" stroke="#BFDBFE" stroke-width="2.4"/>
          <rect x="772" y="200" width="108" height="20" rx="10" fill="#2563EB" opacity="0.22"/>
          <rect x="772" y="248" width="220" height="16" rx="8" fill="#94A3B8" opacity="0.22"/>
          <rect x="772" y="284" width="168" height="16" rx="8" fill="#94A3B8" opacity="0.18"/>
          <circle cx="1010" cy="204" r="30" fill="url(#plp-accent)" opacity="0.86"/>
        </g>`;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="plp-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F8FAFC"/><stop offset="58%" stop-color="#EFF6FF"/><stop offset="100%" stop-color="#ECFEFF"/></linearGradient>
    <linearGradient id="plp-accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#2563EB"/><stop offset="100%" stop-color="#14B8A6"/></linearGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#plp-bg)"/>
  <circle cx="104" cy="92" r="28" fill="#DBEAFE" opacity="0.7"/>
  <circle cx="604" cy="392" r="18" fill="#CCFBF1" opacity="0.9"/>
  <path d="M180 404C292 356 424 356 564 404" stroke="#14B8A6" stroke-width="4" fill="none" opacity="0.35"/>
  <path d="M80 54H248M80 72H160" stroke="#2563EB" stroke-width="1.2" opacity="0.14"/>
  ${illustBlock}
  ${content.tag ? `<rect x="80" y="58" width="${Math.max(86, tagW(content.tag, typo.tagSize) + 34)}" height="38" rx="19" fill="#DBEAFE"/>
  ${renderTextLines(content.tag, 97, 84, typo.tagSize, typo.tagSize * 1.2, 1.8, 'left', '#2563EB', '700', typo.subtitleFontFamily, 'tag')}` : ''}
  ${renderTextLines(content.title, 80, 172, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#0F172A', '850', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 252, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#475569', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 36. product-canvas / 产品画布
// ============================================================
const productCanvas = {
  id: 'product-canvas', name: '产品画布', category: 'illustration',
  illustFit: 'side',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    const illustBlock = content.illustrationSvg
      ? illustrationLayer(`<rect x="704" y="74" width="360" height="276" rx="40" fill="#FFFFFF" opacity="0.78" stroke="#FED7AA" stroke-width="1.5"/>
        ${embedIllustration(content.illustrationSvg, 650, 36, 500, 400, illustrationOpacity(content, 0.9))}`)
      : `<g>
          <rect x="704" y="84" width="360" height="276" rx="40" fill="#FFFFFF" stroke="#FED7AA" stroke-width="1.5"/>
          <rect x="756" y="136" width="116" height="116" rx="32" fill="#FFEDD5"/>
          <rect x="902" y="140" width="108" height="18" rx="9" fill="#0F766E" opacity="0.22"/>
          <rect x="902" y="192" width="144" height="16" rx="8" fill="#64748B" opacity="0.16"/>
          <rect x="902" y="232" width="116" height="16" rx="8" fill="#64748B" opacity="0.13"/>
          <path d="M744 308C816 280 890 292 960 264C1018 240 1064 252 1104 284" stroke="url(#pc-ribbon)" stroke-width="5" fill="none" opacity="0.62"/>
          <circle cx="760" cy="188" r="28" fill="#F97316" opacity="0.72"/>
          <circle cx="832" cy="188" r="28" fill="#0F766E" opacity="0.72"/>
        </g>`;
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pc-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFF7ED"/><stop offset="50%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#ECFDF5"/></linearGradient>
    <linearGradient id="pc-ribbon" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F97316"/><stop offset="100%" stop-color="#0F766E"/></linearGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#pc-bg)"/>
  <path d="M128 84C220 48 332 62 396 128" stroke="#F97316" stroke-width="2.8" fill="none" opacity="0.26"/>
  <path d="M144 404H444" stroke="#0F766E" stroke-width="4" opacity="0.28"/>
  <circle cx="620" cy="76" r="10" fill="#F97316" opacity="0.12"/>
  <circle cx="1104" cy="400" r="20" fill="#0F766E" opacity="0.1"/>
  ${illustBlock}
  ${content.tag ? renderTextLines(content.tag, 80, 88, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#C2410C', '700', typo.subtitleFontFamily, 'tag') : ''}
  ${renderTextLines(content.title, 80, 172, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#1F2937', '850', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 252, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#475569', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 37. tech-blueprint / 架构蓝图
// ============================================================
const techBlueprint = {
  id: 'tech-blueprint', name: '架构蓝图', category: 'geometric',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tbp-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F8FAFC"/><stop offset="52%" stop-color="#F7FEE7"/><stop offset="100%" stop-color="#E0F2FE"/></linearGradient>
    <pattern id="tbp-dots" width="52" height="52" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2.4" fill="#0F172A" opacity="0.12"/></pattern>
  </defs>
  <rect width="1200" height="510" fill="url(#tbp-bg)"/>
  <rect width="1200" height="510" fill="url(#tbp-dots)"/>
  <path d="M702 72L1096 128L1032 408L640 348Z" fill="#18181B" opacity="0.055"/>
  <path d="M744 116L1048 158L998 352L694 308Z" fill="none" stroke="#18181B" stroke-width="2.4" opacity="0.2"/>
  <path d="M788 164H972M768 216H1012M744 268H924" stroke="#18181B" stroke-width="2" opacity="0.23"/>
  <path d="M784 164L848 216L816 268" stroke="#65A30D" stroke-width="4" fill="none" opacity="0.58"/>
  <circle cx="784" cy="164" r="8" fill="#65A30D"/><circle cx="848" cy="216" r="8" fill="#0284C7"/><circle cx="816" cy="268" r="8" fill="#18181B"/>
  <path d="M104 76H236M104 96H184" stroke="#18181B" stroke-width="2" opacity="0.2"/>
  <path d="M140 408H448" stroke="#65A30D" stroke-width="4" opacity="0.44"/>
  <circle cx="632" cy="90" r="9" fill="#0284C7" opacity="0.12"/><circle cx="1080" cy="412" r="14" fill="#65A30D" opacity="0.12"/>
  ${content.tag ? renderTextLines(content.tag, 80, 90, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#365314', '700', typo.subtitleFontFamily, 'tag') : ''}
  ${renderTextLines(content.title, 80, 172, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#18181B', '850', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 252, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#475569', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 38. tech-terminal-map / 终端地图
// ============================================================
const techTerminalMap = {
  id: 'tech-terminal-map', name: '终端地图', category: 'solid-dark',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ttm-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0F172A"/><stop offset="60%" stop-color="#111827"/><stop offset="100%" stop-color="#172554"/></linearGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#ttm-bg)"/>
  <!-- Sparse node map instead of full grid -->
  <g opacity="0.18">
    <circle cx="180" cy="140" r="3" fill="#93C5FD"/>
    <circle cx="360" cy="240" r="3" fill="#22C55E"/>
    <circle cx="240" cy="360" r="3" fill="#38BDF8"/>
    <circle cx="520" cy="180" r="3" fill="#93C5FD"/>
  </g>
  <path d="M180 140L360 240L520 180M240 360L360 240" stroke="#93C5FD" stroke-width="1.5" fill="none" opacity="0.22"/>
  <rect x="692" y="96" width="352" height="236" rx="26" fill="#020617" opacity="0.55" stroke="#38BDF8" stroke-opacity="0.3" stroke-width="2"/>
  <circle cx="732" cy="140" r="8" fill="#38BDF8" opacity="0.8"/>
  <circle cx="764" cy="140" r="8" fill="#22C55E" opacity="0.76"/>
  <circle cx="796" cy="140" r="8" fill="#FACC15" opacity="0.7"/>
  <path d="M736 200H884M736 244H988M736 288H924" stroke="#93C5FD" stroke-width="5" opacity="0.38"/>
  <path d="M840 400C944 356 1024 380 1104 324" stroke="#38BDF8" stroke-width="3.5" fill="none" opacity="0.55"/>
  <circle cx="840" cy="400" r="9" fill="#22C55E"/>
  <circle cx="1104" cy="324" r="9" fill="#38BDF8"/>
  <path d="M120 408H380" stroke="#38BDF8" stroke-width="5" opacity="0.44"/>
  <path d="M48 48L48 92M48 48L92 48" stroke="#93C5FD" stroke-width="2" fill="none" opacity="0.28"/>
  <path d="M1144 440L1144 392M1144 440L1096 440" stroke="#38BDF8" stroke-width="2" fill="none" opacity="0.28"/>
  ${content.tag ? renderTextLines(content.tag, 80, 92, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#93C5FD', '700', typo.subtitleFontFamily, 'tag') : ''}
  ${renderTextLines(content.title, 80, 176, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#F8FAFC', '850', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 256, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#A7F3D0', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 39. product-roadmap / 路线图卡片
// ============================================================
const productRoadmap = {
  id: 'product-roadmap', name: '路线图卡片', category: 'editorial',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="prm-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFF7ED"/><stop offset="48%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#FEF3C7"/></linearGradient>
    <linearGradient id="prm-accent" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F97316"/><stop offset="100%" stop-color="#0F766E"/></linearGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#prm-bg)"/>
  <rect x="740" y="90" width="308" height="264" rx="44" fill="#FFFFFF" stroke="#FED7AA" stroke-width="2.4"/>
  <rect x="784" y="148" width="140" height="24" rx="12" fill="#FB923C" opacity="0.28"/>
  <rect x="784" y="212" width="208" height="18" rx="9" fill="#64748B" opacity="0.16"/>
  <rect x="784" y="256" width="164" height="18" rx="9" fill="#64748B" opacity="0.13"/>
  <path d="M748 396C832 340 936 340 1048 396" stroke="#0F766E" stroke-width="4" fill="none" opacity="0.42"/>
  <path d="M836 390C906 320 986 302 1090 328" stroke="#F97316" stroke-width="3" fill="none" opacity="0.35"/>
  <circle cx="1014" cy="160" r="40" fill="url(#prm-accent)" opacity="0.85"/>
  <circle cx="1084" cy="96" r="22" fill="#F97316" opacity="0.18"/>
  <circle cx="712" cy="376" r="18" fill="#0F766E" opacity="0.13"/>
  <path d="M120 84C204 48 312 60 380 120" stroke="#F97316" stroke-width="2.8" fill="none" opacity="0.3"/>
  <path d="M144 396H412" stroke="#F97316" stroke-width="4" opacity="0.36"/>
  ${content.tag ? renderTextLines(content.tag, 80, 90, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#C2410C', '700', typo.subtitleFontFamily, 'tag') : ''}
  ${renderTextLines(content.title, 80, 172, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#1F2937', '850', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 252, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#475569', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// 40. product-decision-board / 决策看板
// ============================================================
const productDecisionBoard = {
  id: 'product-decision-board', name: '决策看板', category: 'editorial',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    return `<svg viewBox="0 0 1200 510" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pdb-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F9FAFB"/><stop offset="54%" stop-color="#F0FDFA"/><stop offset="100%" stop-color="#FDF2F8"/></linearGradient>
  </defs>
  <rect width="1200" height="510" fill="url(#pdb-bg)"/>
  <rect x="708" y="84" width="140" height="224" rx="28" fill="#FFFFFF" stroke="#99F6E4" stroke-width="2"/>
  <rect x="876" y="144" width="172" height="208" rx="28" fill="#FFFFFF" stroke="#FBCFE8" stroke-width="2"/>
  <rect x="756" y="140" width="48" height="48" rx="16" fill="#14B8A6" opacity="0.2"/>
  <rect x="748" y="220" width="68" height="16" rx="8" fill="#0F766E" opacity="0.18"/>
  <rect x="916" y="200" width="88" height="18" rx="9" fill="#DB2777" opacity="0.18"/>
  <rect x="916" y="252" width="100" height="16" rx="8" fill="#64748B" opacity="0.14"/>
  <path d="M676 388C784 332 916 384 1084 308" stroke="#0F766E" stroke-width="4.4" fill="none" opacity="0.34"/>
  <path d="M764 104C852 44 992 60 1076 132" stroke="#DB2777" stroke-width="2.6" fill="none" opacity="0.22"/>
  <circle cx="1084" cy="308" r="10" fill="#DB2777" opacity="0.62"/>
  <circle cx="676" cy="388" r="10" fill="#0F766E" opacity="0.62"/>
  <path d="M116 88H292M116 108H212" stroke="#0F766E" stroke-width="2" opacity="0.22"/>
  <path d="M144 408H428" stroke="#DB2777" stroke-width="4" opacity="0.24"/>
  <circle cx="638" cy="80" r="10" fill="#0F766E" opacity="0.11"/><circle cx="1088" cy="92" r="14" fill="#DB2777" opacity="0.09"/>
  ${content.tag ? renderTextLines(content.tag, 80, 90, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#0F766E', '700', typo.subtitleFontFamily, 'tag') : ''}
  ${renderTextLines(content.title, 80, 172, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#111827', '850', typo.titleFontFamily, 'title', typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 252, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#4B5563', '400', typo.subtitleFontFamily, 'subtitle', typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
</svg>`;
  }
};

// ============================================================
// Export all 35 templates
// ============================================================
/**
 * Template metadata for preview UI — scenario descriptions and style tags.
 * Used by the template gallery to help users choose the right template.
 */
export const TEMPLATE_META = {
  'black-gold':         { scenario: '高端品牌、产品发布',     styleTags: ['深色', '金线', '高级感'] },
  'digital-scene':      { scenario: '技术分享、产品介绍',     styleTags: ['图文', '科技', '专业'] },
  'pure-white':         { scenario: '简洁公告、品牌声明',     styleTags: ['极简', '留白', '纯净'] },
  'warm-cream':         { scenario: '生活方式、读书笔记',     styleTags: ['暖色', '柔和', '文艺'] },
  'lavender-light':     { scenario: '心理情感、女性话题',     styleTags: ['淡紫', '轻盈', '温柔'] },
  'indigo-violet':      { scenario: '科技前沿、AI 话题',      styleTags: ['渐变', '深色', '未来感'] },
  'dark-fade':          { scenario: '深度分析、行业报告',     styleTags: ['深色', '渐变', '沉稳'] },
  'dawn-light':         { scenario: '早报资讯、晨间阅读',     styleTags: ['渐变', '清新', '柔和'] },
  'aurora':             { scenario: '创意设计、视觉展示',     styleTags: ['渐变', '炫彩', '梦幻'] },
  'warm-showcase':      { scenario: '产品展示、功能介绍',     styleTags: ['暖色', '渐变', '活力'] },
  'playful-mascot':     { scenario: '品牌故事、趣味科普',     styleTags: ['插画', '活泼', '趣味'] },
  'dot-matrix':         { scenario: '数据报告、逻辑分析',     styleTags: ['几何', '秩序', '理性'] },
  'geo-overlap':        { scenario: '设计趋势、艺术评论',     styleTags: ['几何', '色块', '现代'] },
  'triangle-comp':      { scenario: '建筑美学、结构思维',     styleTags: ['几何', '构成', '锐利'] },
  'frosted-glass':      { scenario: '产品 UI、界面设计',      styleTags: ['毛玻璃', '透明', '现代'] },
  'paper-texture':      { scenario: '学术论文、深度长文',     styleTags: ['纸质', '质感', '经典'] },
  'frame-border':       { scenario: '艺术展览、画作赏析',     styleTags: ['画框', '留白', '典雅'] },
  'split-screen':       { scenario: '对比分析、双主题展示',   styleTags: ['分割', '对比', '构图'] },
  'illust-right':       { scenario: '技术教程、工具介绍',     styleTags: ['图文', '右侧', '清爽'] },
  'illust-left':        { scenario: '观点输出、思想分享',     styleTags: ['图文', '左侧', '阅读'] },
  'illust-center-top':  { scenario: '活动海报、线上直播',     styleTags: ['图文', '居上', '聚焦'] },
  'illust-split':       { scenario: '产品介绍、功能对比',     styleTags: ['图文', '分割', '均衡'] },
  'illust-hero':        { scenario: '重磅发布、大事件',       styleTags: ['图文', '英雄', '震撼'] },
  'illust-card':        { scenario: '课程推广、知识分享',       styleTags: ['图文', '卡片', '精致'] },
  'illust-wave':        { scenario: '品牌宣传、创意展示',     styleTags: ['图文', '波浪', '动感'] },
  'illust-dark-glow':   { scenario: '暗夜主题、游戏电竞',     styleTags: ['图文', '发光', '炫酷'] },
  'illust-magazine':    { scenario: '人物故事、专题报道',     styleTags: ['图文', '杂志', '叙事'] },
  'tech-neural-grid':   { scenario: 'AI 工程、技术架构',      styleTags: ['技术', '图文', '网格'] },
  'tech-lab-console':   { scenario: '模型评测、实验记录',     styleTags: ['技术', '图文', '实验'] },
  'product-launch-pad': { scenario: '产品发布、功能说明',     styleTags: ['产品', '图文', '清爽'] },
  'product-canvas':     { scenario: '需求分析、体验策略',     styleTags: ['产品', '图文', '画布'] },
  'tech-blueprint':     { scenario: '系统方案、工具链文章',   styleTags: ['技术', '蓝图', '结构'] },
  'tech-terminal-map':  { scenario: '工程日志、故障复盘',     styleTags: ['技术', '深色', '终端'] },
  'product-roadmap':    { scenario: '路线图、增长复盘',       styleTags: ['产品', '卡片', '指标'] },
  'product-decision-board': { scenario: '产品决策、用户研究', styleTags: ['产品', '看板', '研究'] }
};

export const COVER_TEMPLATES = [
  // Solid Dark (2)
  blackGold,
  // Solid Light (3)
  pureWhite,
  warmCream,
  lavenderLight,
  // Gradient (6)
  indigoViolet,
  darkFade,
  dawnLight,
  aurora,
  warmShowcase,
  playfulMascot,
  // Geometric (4)
  dotMatrix,
  geoOverlap,
  triangleComp,
  // Glass & Texture (2)
  frostedGlass,
  paperTexture,
  // Editorial & Layout (4)
  frameBorder,
  splitScreen,
  // Illustration (14)
  digitalScene,
  illustRight,
  illustLeft,
  illustCenterTop,
  illustSplit,
  illustHero,
  illustCard,
  illustWave,
  illustDarkGlow,
  illustMagazine,
  techNeuralGrid,
  techLabConsole,
  productLaunchPad,
  productCanvas,
  // New technical/product decorative covers (4)
  techBlueprint,
  techTerminalMap,
  productRoadmap,
  productDecisionBoard,
];
