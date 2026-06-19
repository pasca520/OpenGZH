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

function renderTextLines(text, x, y, fontSize, lineHeight, letterSpacing, textAlign, fill, fontWeight, fontFamily, offsetY = 0, offsetX = 0) {
  if (!text) return '';
  const baseX = x + (offsetX || 0);
  const baseY = y + (offsetY || 0);
  const resolvedLineHeight = lineHeight <= 4 ? fontSize * lineHeight : lineHeight;
  const lines = text.split('\n');
  const anchor = textAlign === 'center' ? 'middle' : textAlign === 'right' ? 'end' : 'start';
  return lines.map((line, i) => {
    const dy = i * resolvedLineHeight;
    return `<text x="${baseX}" y="${baseY + dy}" font-size="${fontSize}" font-weight="${fontWeight || 'normal'}" font-family="${fontFamily || FONT_FAMILY}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${letterSpacing || 0}">${esc(line)}</text>`;
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#D4AF37" stop-opacity="0.1"/><stop offset="50%" stop-color="#D4AF37" stop-opacity="0"/><stop offset="100%" stop-color="#D4AF37" stop-opacity="0.05"/></linearGradient>
    <linearGradient id="gold-shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#D4AF37" stop-opacity="0"/><stop offset="50%" stop-color="#FFD700" stop-opacity="0.15"/><stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/></linearGradient>
    <radialGradient id="gold-glow1" cx="0.2" cy="0.3"><stop offset="0%" stop-color="#D4AF37" stop-opacity="0.08"/><stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/></radialGradient>
    <radialGradient id="gold-glow2" cx="0.8" cy="0.7"><stop offset="0%" stop-color="#D4AF37" stop-opacity="0.06"/><stop offset="100%" stop-color="#D4AF37" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="480" fill="#111111"/>
  <rect width="1200" height="480" fill="url(#bg-gold)"/>
  <rect width="1200" height="480" fill="url(#gold-glow1)"/>
  <rect width="1200" height="480" fill="url(#gold-glow2)"/>
  <rect x="0" y="200" width="1200" height="80" fill="url(#gold-shine)"/>
  <rect x="40" y="40" width="1120" height="400" fill="none" stroke="#D4AF37" stroke-width="1" opacity="0.4"/>
  <rect x="50" y="50" width="1100" height="380" fill="none" stroke="#D4AF37" stroke-width="0.5" opacity="0.2"/>
  <path d="M 40 60 L 40 40 L 60 40" fill="none" stroke="#D4AF37" stroke-width="2.5" opacity="0.7"/>
  <path d="M 1140 40 L 1160 40 L 1160 60" fill="none" stroke="#D4AF37" stroke-width="2.5" opacity="0.7"/>
  <path d="M 1160 420 L 1160 440 L 1140 440" fill="none" stroke="#D4AF37" stroke-width="2.5" opacity="0.7"/>
  <path d="M 60 440 L 40 440 L 40 420" fill="none" stroke="#D4AF37" stroke-width="2.5" opacity="0.7"/>
  <polygon points="55,55 60,50 65,55 60,60" fill="#D4AF37" opacity="0.4"/>
  <polygon points="1135,55 1140,50 1145,55 1140,60" fill="#D4AF37" opacity="0.4"/>
  <polygon points="1135,425 1140,420 1145,425 1140,430" fill="#D4AF37" opacity="0.4"/>
  <polygon points="55,425 60,420 65,425 60,430" fill="#D4AF37" opacity="0.4"/>
  <line x1="480" y1="90" x2="720" y2="90" stroke="#D4AF37" stroke-width="1" opacity="0.6"/>
  <line x1="500" y1="96" x2="700" y2="96" stroke="#D4AF37" stroke-width="0.5" opacity="0.3"/>
  <line x1="480" y1="390" x2="720" y2="390" stroke="#D4AF37" stroke-width="1" opacity="0.6"/>
  <line x1="500" y1="384" x2="700" y2="384" stroke="#D4AF37" stroke-width="0.5" opacity="0.3"/>
  <circle cx="150" cy="120" r="2" fill="#D4AF37" opacity="0.5"/><circle cx="300" cy="80" r="1.5" fill="#FFD700" opacity="0.4"/>
  <circle cx="900" cy="100" r="2" fill="#D4AF37" opacity="0.35"/><circle cx="1050" cy="150" r="1.5" fill="#FFD700" opacity="0.3"/>
  <circle cx="200" cy="380" r="2" fill="#D4AF37" opacity="0.4"/><circle cx="1000" cy="370" r="1.5" fill="#FFD700" opacity="0.35"/>
  <polygon points="100,200 103,208 112,208 105,213 107,221 100,216 93,221 95,213 88,208 97,208" fill="#D4AF37" opacity="0.15"/>
  <polygon points="1100,280 1102,286 1108,286 1103,290 1105,296 1100,292 1095,296 1097,290 1092,286 1098,286" fill="#FFD700" opacity="0.12"/>
  ${renderTextLines(content.title, cx, 210, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing + 2, 'center', '#F5F0E1', '400', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 250, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#D4AF37', '300', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  ${content.author ? renderTextLines(content.author, cx, 440, typo.authorSize, typo.authorSize * 1.4, 2, 'center', '#8B7D3C', '300', typo.subtitleFontFamily) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="pw-ov" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4F46E5" stop-opacity="0.02"/><stop offset="100%" stop-color="#7C3AED" stop-opacity="0.04"/></linearGradient></defs>
  <rect width="1200" height="480" fill="#FAFAFA"/><rect width="1200" height="480" fill="url(#pw-ov)"/>
  <rect x="80" y="80" width="5" height="320" fill="#4F46E5"/><rect x="80" y="80" width="5" height="60" fill="#7C3AED"/>
  <circle cx="1050" cy="100" r="60" fill="#EEF2FF" opacity="0.8"/>
  <circle cx="1050" cy="100" r="40" fill="none" stroke="#C7D2FE" stroke-width="1" opacity="0.6"/>
  <circle cx="1050" cy="100" r="20" fill="none" stroke="#A5B4FC" stroke-width="0.5" opacity="0.5"/>
  <rect x="950" y="350" width="80" height="80" fill="none" stroke="#E0E7FF" stroke-width="1.5" transform="rotate(15,990,390)" opacity="0.6"/>
  <rect x="960" y="360" width="60" height="60" fill="none" stroke="#C7D2FE" stroke-width="0.8" transform="rotate(15,990,390)" opacity="0.4"/>
  <circle cx="900" cy="80" r="3" fill="#4F46E5" opacity="0.15"/><circle cx="920" cy="80" r="3" fill="#4F46E5" opacity="0.12"/>
  <circle cx="940" cy="80" r="3" fill="#4F46E5" opacity="0.09"/><circle cx="900" cy="100" r="3" fill="#4F46E5" opacity="0.12"/>
  <line x1="110" y1="360" x2="500" y2="360" stroke="#E5E7EB" stroke-width="0.5"/>
  <line x1="110" y1="160" x2="250" y2="160" stroke="#4F46E5" stroke-width="0.5" opacity="0.3"/>
  <polygon points="1100,420 1130,460 1070,460" fill="#4F46E5" opacity="0.06"/>
  <polygon points="150,430 170,460 130,460" fill="#7C3AED" opacity="0.05"/>
  ${content.tag ? renderTextLines(content.tag, 110, 120, typo.tagSize, typo.tagSize * 1.2, 2, 'left', '#4F46E5', '600', typo.subtitleFontFamily) : ''}
  ${renderTextLines(content.title, 110, 190, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#111827', '800', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 110, 250, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#6B7280', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="wc-g1" cx="0.85" cy="0.15"><stop offset="0%" stop-color="#FFECD2" stop-opacity="0.6"/><stop offset="100%" stop-color="#FFECD2" stop-opacity="0"/></radialGradient>
    <radialGradient id="wc-g2" cx="0.1" cy="0.85"><stop offset="0%" stop-color="#FFECD2" stop-opacity="0.5"/><stop offset="100%" stop-color="#FFECD2" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="480" fill="#FFF8F0"/>
  <rect width="1200" height="480" fill="url(#wc-g1)"/><rect width="1200" height="480" fill="url(#wc-g2)"/>
  <path d="M1050 50Q1080 20 1100 50Q1080 40 1060 60Z" fill="#A8D5BA" opacity="0.3"/>
  <path d="M1050 50Q1070 45 1090 55" stroke="#86C9A0" stroke-width="0.8" fill="none" opacity="0.4"/>
  <path d="M1080 70Q1110 50 1120 80Q1100 65 1085 80Z" fill="#B5D8C7" opacity="0.25"/>
  <path d="M100 400Q130 370 150 400Q130 390 110 410Z" fill="#A8D5BA" opacity="0.25"/>
  <circle cx="1050" cy="80" r="120" fill="#FFECD2" opacity="0.4"/>
  <circle cx="1050" cy="80" r="80" fill="none" stroke="#F5DEB3" stroke-width="0.8" opacity="0.4"/>
  <circle cx="150" cy="420" r="80" fill="#FFECD2" opacity="0.35"/>
  <circle cx="150" cy="420" r="50" fill="none" stroke="#F5DEB3" stroke-width="0.8" opacity="0.3"/>
  <circle cx="200" cy="80" r="4" fill="#A8D5BA" opacity="0.3"/>
  <circle cx="980" cy="400" r="4" fill="#A8D5BA" opacity="0.25"/>
  <line x1="460" y1="140" x2="740" y2="140" stroke="#D7CCC8" stroke-width="1"/>
  <line x1="480" y1="146" x2="720" y2="146" stroke="#D7CCC8" stroke-width="0.5" opacity="0.5"/>
  <line x1="460" y1="370" x2="740" y2="370" stroke="#D7CCC8" stroke-width="0.5" opacity="0.4"/>
  <polygon points="600,125 605,130 600,135 595,130" fill="#D7CCC8" opacity="0.5"/>
  <polygon points="600,375 604,379 600,383 596,379" fill="#D7CCC8" opacity="0.4"/>
  ${renderTextLines(content.title, cx, 220, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#3E2723', '600', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 260, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#795548', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  ${content.author ? renderTextLines(content.author, cx, 430, typo.authorSize, typo.authorSize * 1.4, 1.5, 'center', '#A1887F', '300', typo.subtitleFontFamily) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lav-ac" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7C3AED"/><stop offset="100%" stop-color="#A78BFA"/></linearGradient>
    <radialGradient id="lav-orb" cx="0.5" cy="0.5"><stop offset="0%" stop-color="#C4B5FD" stop-opacity="0.3"/><stop offset="100%" stop-color="#C4B5FD" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="480" fill="#F3E8FF"/>
  <circle cx="1080" cy="100" r="160" fill="#DDD6FE" opacity="0.4"/>
  <circle cx="1080" cy="100" r="120" fill="#C4B5FD" opacity="0.2"/>
  <circle cx="1080" cy="100" r="80" fill="none" stroke="#A78BFA" stroke-width="1" opacity="0.3"/>
  <circle cx="1080" cy="100" r="40" fill="none" stroke="#8B5CF6" stroke-width="0.5" opacity="0.25"/>
  <circle cx="1000" cy="400" r="100" fill="#DDD6FE" opacity="0.2"/>
  <circle cx="1000" cy="400" r="60" fill="none" stroke="#C4B5FD" stroke-width="0.8" opacity="0.3"/>
  <circle cx="200" cy="400" r="80" fill="url(#lav-orb)"/>
  <circle cx="400" cy="60" r="60" fill="url(#lav-orb)"/>
  <circle cx="900" cy="60" r="3" fill="#7C3AED" opacity="0.4"/>
  <circle cx="950" cy="45" r="2" fill="#8B5CF6" opacity="0.35"/>
  <circle cx="920" cy="80" r="2.5" fill="#A78BFA" opacity="0.3"/>
  <circle cx="1150" cy="250" r="3" fill="#7C3AED" opacity="0.3"/>
  <circle cx="550" cy="440" r="20" fill="none" stroke="#DDD6FE" stroke-width="1" opacity="0.4"/>
  <circle cx="580" cy="450" r="15" fill="none" stroke="#C4B5FD" stroke-width="0.8" opacity="0.3"/>
  <rect x="80" y="100" width="4" height="60" rx="2" fill="url(#lav-ac)"/>
  <line x1="100" y1="380" x2="300" y2="380" stroke="#C4B5FD" stroke-width="0.5" opacity="0.3"/>
  ${content.tag ? renderTextLines(content.tag, 100, 130, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#7C3AED', '600', typo.subtitleFontFamily) : ''}
  ${renderTextLines(content.title, 80, 210, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#1E1B4B', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 260, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#6D28D9', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="iv-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4F46E5"/><stop offset="100%" stop-color="#7C3AED"/></linearGradient>
    <radialGradient id="iv-o1" cx="0.15" cy="0.8"><stop offset="0%" stop-color="white" stop-opacity="0.06"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient>
    <radialGradient id="iv-o2" cx="0.85" cy="0.2"><stop offset="0%" stop-color="white" stop-opacity="0.08"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient>
    <radialGradient id="iv-glow" cx="0.5" cy="0.45"><stop offset="0%" stop-color="#A78BFA" stop-opacity="0.18"/><stop offset="60%" stop-color="#7C3AED" stop-opacity="0.05"/><stop offset="100%" stop-color="#4F46E5" stop-opacity="0"/></radialGradient>
    <pattern id="iv-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0L0 0 0 60" fill="none" stroke="white" stroke-width="0.3" opacity="0.06"/></pattern>
  </defs>
  <rect width="1200" height="480" fill="url(#iv-bg)"/>
  <rect width="1200" height="480" fill="url(#iv-o1)"/><rect width="1200" height="480" fill="url(#iv-o2)"/>
  <rect width="1200" height="480" fill="url(#iv-glow)"/>
  <rect width="1200" height="480" fill="url(#iv-grid)"/>
  <!-- Organic blob shapes -->
  <path d="M120 380Q180 300 280 340Q360 370 340 440Q320 490 220 470Q130 450 120 380" fill="white" opacity="0.03"/>
  <path d="M880 60Q960 20 1060 80Q1140 130 1100 220Q1060 290 960 260Q870 230 880 140Z" fill="white" opacity="0.035"/>
  <path d="M500 420Q580 380 680 410Q760 440 720 480Q640 500 560 480Q500 460 500 420" fill="white" opacity="0.025"/>
  <!-- Multi-layer glow orbs -->
  <ellipse cx="200" cy="400" rx="180" ry="160" fill="white" opacity="0.03"/>
  <ellipse cx="1000" cy="80" rx="220" ry="180" fill="white" opacity="0.04"/>
  <circle cx="1000" cy="80" r="120" fill="none" stroke="white" stroke-width="0.5" opacity="0.06"/>
  <!-- Star-burst decorations -->
  <g opacity="0.25">
    <line x1="150" y1="70" x2="150" y2="90" stroke="white" stroke-width="1"/><line x1="140" y1="80" x2="160" y2="80" stroke="white" stroke-width="1"/>
    <line x1="143" y1="73" x2="157" y2="87" stroke="white" stroke-width="0.5"/><line x1="157" y1="73" x2="143" y2="87" stroke="white" stroke-width="0.5"/>
  </g>
  <g opacity="0.18">
    <line x1="1050" y1="400" x2="1050" y2="416" stroke="white" stroke-width="1"/><line x1="1042" y1="408" x2="1058" y2="408" stroke="white" stroke-width="1"/>
    <line x1="1044" y1="402" x2="1056" y2="414" stroke="white" stroke-width="0.5"/><line x1="1056" y1="402" x2="1044" y2="414" stroke="white" stroke-width="0.5"/>
  </g>
  <g opacity="0.15">
    <line x1="350" y1="430" x2="350" y2="442" stroke="white" stroke-width="0.8"/><line x1="344" y1="436" x2="356" y2="436" stroke="white" stroke-width="0.8"/>
  </g>
  <!-- Scattered dots with varying sizes -->
  <circle cx="150" cy="80" r="2.5" fill="white" opacity="0.35"/><circle cx="300" cy="50" r="2" fill="white" opacity="0.25"/>
  <circle cx="450" cy="70" r="2.5" fill="white" opacity="0.2"/><circle cx="750" cy="60" r="2" fill="white" opacity="0.3"/>
  <circle cx="900" cy="420" r="2.5" fill="white" opacity="0.2"/><circle cx="1050" cy="400" r="2" fill="white" opacity="0.25"/>
  <circle cx="100" cy="350" r="2" fill="white" opacity="0.15"/><circle cx="350" cy="430" r="2" fill="white" opacity="0.2"/>
  <circle cx="850" cy="100" r="3" fill="white" opacity="0.2"/>
  <!-- Decorative arcs and rings -->
  <circle cx="300" cy="120" r="35" fill="none" stroke="white" stroke-width="0.5" opacity="0.1"/>
  <circle cx="300" cy="120" r="20" fill="none" stroke="white" stroke-width="0.3" opacity="0.08"/>
  <circle cx="900" cy="360" r="45" fill="none" stroke="white" stroke-width="0.5" opacity="0.08"/>
  <circle cx="900" cy="360" r="25" fill="none" stroke="white" stroke-width="0.3" opacity="0.06"/>
  <!-- Flowing wave lines -->
  <path d="M0 400Q150 370 300 385Q450 400 600 375Q750 350 900 370Q1050 390 1200 360" stroke="white" stroke-width="0.6" fill="none" opacity="0.08"/>
  <path d="M0 415Q150 385 300 400Q450 415 600 390Q750 365 900 385Q1050 405 1200 375" stroke="white" stroke-width="0.3" fill="none" opacity="0.06"/>
  <!-- Corner bracket decorations -->
  <path d="M30 30L30 60" stroke="white" stroke-width="0.5" opacity="0.12"/><path d="M30 30L60 30" stroke="white" stroke-width="0.5" opacity="0.12"/>
  <path d="M1170 30L1170 60" stroke="white" stroke-width="0.5" opacity="0.12"/><path d="M1170 30L1140 30" stroke="white" stroke-width="0.5" opacity="0.12"/>
  <path d="M30 450L30 420" stroke="white" stroke-width="0.5" opacity="0.12"/><path d="M30 450L60 450" stroke="white" stroke-width="0.5" opacity="0.12"/>
  <path d="M1170 450L1170 420" stroke="white" stroke-width="0.5" opacity="0.12"/><path d="M1170 450L1140 450" stroke="white" stroke-width="0.5" opacity="0.12"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 20)}" y="76" width="${tagW(content.tag, typo.tagSize) + 40}" height="38" rx="19" fill="white" opacity="0.15"/>
  <rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 20)}" y="76" width="${tagW(content.tag, typo.tagSize) + 40}" height="38" rx="19" fill="none" stroke="white" stroke-width="0.5" opacity="0.12"/>
  ${renderTextLines(content.tag, cx, 102, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#E0E7FF', '500', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, cx, 195, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#FFFFFF', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 260, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#C7D2FE', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  ${content.author ? renderTextLines(content.author, cx, 440, typo.authorSize, typo.authorSize * 1.4, 1, 'center', 'rgba(255,255,255,0.5)', '300', typo.subtitleFontFamily) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="df-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0F172A"/><stop offset="100%" stop-color="#1E1B4B"/></linearGradient>
    <radialGradient id="df-o1" cx="0.7" cy="0.3"><stop offset="0%" stop-color="#6366F1" stop-opacity="0.15"/><stop offset="100%" stop-color="#6366F1" stop-opacity="0"/></radialGradient>
    <radialGradient id="df-o2" cx="0.2" cy="0.7"><stop offset="0%" stop-color="#818CF8" stop-opacity="0.1"/><stop offset="100%" stop-color="#818CF8" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#df-bg)"/>
  <rect width="1200" height="480" fill="url(#df-o1)"/><rect width="1200" height="480" fill="url(#df-o2)"/>
  <circle cx="850" cy="120" r="150" fill="#6366F1" opacity="0.06"/>
  <circle cx="850" cy="120" r="100" fill="none" stroke="#818CF8" stroke-width="0.5" opacity="0.1"/>
  <circle cx="200" cy="380" r="120" fill="#818CF8" opacity="0.04"/>
  <circle cx="1100" cy="400" r="80" fill="#A78BFA" opacity="0.05"/>
  <line x1="80" y1="380" x2="300" y2="380" stroke="#6366F1" stroke-width="2" opacity="0.5"/>
  <line x1="80" y1="386" x2="200" y2="386" stroke="#818CF8" stroke-width="1" opacity="0.3"/>
  <line x1="80" y1="100" x2="180" y2="100" stroke="#6366F1" stroke-width="1" opacity="0.3"/>
  <circle cx="400" cy="80" r="2" fill="#818CF8" opacity="0.4"/>
  <circle cx="600" cy="60" r="1.5" fill="#A78BFA" opacity="0.3"/>
  <circle cx="700" cy="430" r="2" fill="#6366F1" opacity="0.35"/>
  <circle cx="500" cy="400" r="1.5" fill="#818CF8" opacity="0.25"/>
  <circle cx="1000" cy="250" r="2" fill="#A78BFA" opacity="0.2"/>
  <line x1="900" y1="0" x2="1200" y2="300" stroke="#6366F1" stroke-width="0.3" opacity="0.1"/>
  <line x1="950" y1="0" x2="1200" y2="250" stroke="#818CF8" stroke-width="0.3" opacity="0.08"/>
  <rect x="1050" y="60" width="20" height="20" fill="none" stroke="#6366F1" stroke-width="0.8" opacity="0.2" transform="rotate(45 1060 70)"/>
  <polygon points="950,440 960,425 970,440" fill="none" stroke="#818CF8" stroke-width="0.8" opacity="0.15"/>
  ${renderTextLines(content.title, 80, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#E2E8F0', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 260, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#94A3B8', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dl-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#C4B5FD"/><stop offset="50%" stop-color="#DDD6FE"/><stop offset="100%" stop-color="#EDE9FE"/></linearGradient>
    <radialGradient id="dl-sun" cx="0.8" cy="0.1"><stop offset="0%" stop-color="#FDE68A" stop-opacity="0.3"/><stop offset="50%" stop-color="#FDE68A" stop-opacity="0.1"/><stop offset="100%" stop-color="#FDE68A" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#dl-bg)"/><rect width="1200" height="480" fill="url(#dl-sun)"/>
  <line x1="960" y1="40" x2="900" y2="150" stroke="#FDE68A" stroke-width="1" opacity="0.2"/>
  <line x1="960" y1="40" x2="850" y2="100" stroke="#FDE68A" stroke-width="0.8" opacity="0.15"/>
  <line x1="960" y1="40" x2="1050" y2="150" stroke="#FDE68A" stroke-width="1" opacity="0.2"/>
  <line x1="960" y1="40" x2="1100" y2="100" stroke="#FDE68A" stroke-width="0.8" opacity="0.15"/>
  <line x1="960" y1="40" x2="960" y2="160" stroke="#FDE68A" stroke-width="0.8" opacity="0.12"/>
  <g opacity="0.15"><ellipse cx="200" cy="60" rx="60" ry="20" fill="white"/><ellipse cx="230" cy="55" rx="40" ry="18" fill="white"/><ellipse cx="170" cy="55" rx="35" ry="15" fill="white"/></g>
  <g opacity="0.1"><ellipse cx="700" cy="40" rx="50" ry="16" fill="white"/><ellipse cx="725" cy="35" rx="35" ry="14" fill="white"/></g>
  <g opacity="0.08"><ellipse cx="450" cy="430" rx="70" ry="18" fill="white"/><ellipse cx="485" cy="425" rx="45" ry="15" fill="white"/></g>
  <circle cx="100" cy="200" r="40" fill="white" opacity="0.08"/>
  <circle cx="100" cy="200" r="25" fill="none" stroke="white" stroke-width="0.5" opacity="0.15"/>
  <circle cx="1100" cy="350" r="50" fill="white" opacity="0.06"/>
  <circle cx="300" cy="100" r="2.5" fill="#7C3AED" opacity="0.2"/><circle cx="500" cy="80" r="2" fill="#8B5CF6" opacity="0.15"/>
  <circle cx="800" cy="120" r="2.5" fill="#7C3AED" opacity="0.15"/>
  <line x1="100" y1="380" x2="350" y2="380" stroke="#A78BFA" stroke-width="0.5" opacity="0.2"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="70" width="${tagW(content.tag, typo.tagSize) + 32}" height="30" rx="15" fill="#7C3AED" opacity="0.15"/>
  ${renderTextLines(content.tag, cx, 92, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#5B21B6', '600', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, cx, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#1E1B4B', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 260, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#4C1D95', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="au-bg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#2DD4BF"/><stop offset="50%" stop-color="#6366F1"/><stop offset="100%" stop-color="#A855F7"/></linearGradient>
    <linearGradient id="au-s1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#34D399" stop-opacity="0"/><stop offset="30%" stop-color="#34D399" stop-opacity="0.15"/><stop offset="70%" stop-color="#60A5FA" stop-opacity="0.1"/><stop offset="100%" stop-color="#60A5FA" stop-opacity="0"/></linearGradient>
    <linearGradient id="au-s2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#A78BFA" stop-opacity="0"/><stop offset="40%" stop-color="#A78BFA" stop-opacity="0.12"/><stop offset="60%" stop-color="#34D399" stop-opacity="0.08"/><stop offset="100%" stop-color="#34D399" stop-opacity="0"/></linearGradient>
    <radialGradient id="au-glow1" cx="0.3" cy="0.3"><stop offset="0%" stop-color="#34D399" stop-opacity="0.15"/><stop offset="100%" stop-color="#34D399" stop-opacity="0"/></radialGradient>
    <radialGradient id="au-glow2" cx="0.7" cy="0.7"><stop offset="0%" stop-color="#A78BFA" stop-opacity="0.12"/><stop offset="100%" stop-color="#A78BFA" stop-opacity="0"/></radialGradient>
    <pattern id="au-mesh" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><line x1="0" y1="0" x2="40" y2="0" stroke="white" stroke-width="0.2" opacity="0.04"/><line x1="0" y1="0" x2="0" y2="40" stroke="white" stroke-width="0.2" opacity="0.04"/></pattern>
  </defs>
  <rect width="1200" height="480" fill="url(#au-bg)"/>
  <rect width="1200" height="480" fill="url(#au-glow1)"/><rect width="1200" height="480" fill="url(#au-glow2)"/>
  <rect width="1200" height="480" fill="url(#au-mesh)"/>
  <!-- Aurora bands - more layers for richness -->
  <ellipse cx="300" cy="0" rx="400" ry="200" fill="white" opacity="0.04"/>
  <ellipse cx="900" cy="480" rx="500" ry="200" fill="white" opacity="0.04"/>
  <path d="M0 80Q200 40 400 70Q600 100 800 60Q1000 20 1200 50" stroke="white" stroke-width="30" fill="none" opacity="0.04"/>
  <rect x="0" y="50" width="1200" height="80" fill="url(#au-s1)"/>
  <rect x="0" y="350" width="1200" height="80" fill="url(#au-s2)"/>
  <!-- Enhanced aurora curtains -->
  <path d="M100 0Q120 80 100 160Q80 240 100 320" stroke="#34D399" stroke-width="2.5" fill="none" opacity="0.1"/>
  <path d="M115 0Q135 90 115 180Q95 260 115 340" stroke="#34D399" stroke-width="1" fill="none" opacity="0.06"/>
  <path d="M300 0Q320 100 300 200Q280 300 300 400" stroke="#60A5FA" stroke-width="2" fill="none" opacity="0.08"/>
  <path d="M315 0Q335 110 315 220Q295 320 315 420" stroke="#60A5FA" stroke-width="0.8" fill="none" opacity="0.05"/>
  <path d="M900 0Q920 90 900 180Q880 270 900 360" stroke="#A78BFA" stroke-width="2.5" fill="none" opacity="0.08"/>
  <path d="M915 0Q935 100 915 200Q895 290 915 380" stroke="#A78BFA" stroke-width="1" fill="none" opacity="0.05"/>
  <path d="M1100 0Q1120 70 1100 140Q1080 210 1100 280" stroke="#34D399" stroke-width="2" fill="none" opacity="0.06"/>
  <path d="M1115 0Q1135 80 1115 160Q1095 230 1115 300" stroke="#34D399" stroke-width="0.8" fill="none" opacity="0.04"/>
  <!-- Organic floating blobs -->
  <path d="M60 350Q100 310 160 340Q200 360 180 410Q160 450 100 430Q50 410 60 350" fill="white" opacity="0.025"/>
  <path d="M1050 100Q1100 70 1150 110Q1180 140 1150 180Q1110 210 1060 180Q1030 150 1050 100" fill="white" opacity="0.03"/>
  <!-- Star particles -->
  <circle cx="200" cy="100" r="2.5" fill="white" opacity="0.5"/><circle cx="400" cy="50" r="2" fill="white" opacity="0.4"/>
  <circle cx="600" cy="80" r="2.5" fill="white" opacity="0.35"/><circle cx="800" cy="60" r="2" fill="white" opacity="0.45"/>
  <circle cx="1000" cy="90" r="2.5" fill="white" opacity="0.3"/>
  <circle cx="150" cy="380" r="2" fill="white" opacity="0.3"/><circle cx="350" cy="420" r="2.5" fill="white" opacity="0.25"/>
  <circle cx="700" cy="400" r="2" fill="white" opacity="0.3"/><circle cx="1050" cy="380" r="2.5" fill="white" opacity="0.25"/>
  <!-- Cross decorations -->
  <g opacity="0.2">
    <line x1="250" y1="52" x2="250" y2="68" stroke="white" stroke-width="0.8"/><line x1="242" y1="60" x2="258" y2="60" stroke="white" stroke-width="0.8"/>
  </g>
  <g opacity="0.15">
    <line x1="1050" y1="412" x2="1050" y2="428" stroke="white" stroke-width="0.8"/><line x1="1042" y1="420" x2="1058" y2="420" stroke="white" stroke-width="0.8"/>
  </g>
  <!-- Star shapes -->
  <polygon points="250,60 253,68 262,68 255,73 257,81 250,76 243,81 245,73 238,68 247,68" fill="white" opacity="0.2"/>
  <polygon points="1050,420 1052,426 1058,426 1053,430 1055,436 1050,432 1045,436 1047,430 1042,426 1048,426" fill="white" opacity="0.15"/>
  <!-- Decorative line under title area -->
  <line x1="500" y1="150" x2="700" y2="150" stroke="white" stroke-width="1" opacity="0.3"/>
  <line x1="520" y1="156" x2="680" y2="156" stroke="white" stroke-width="0.5" opacity="0.2"/>
  <!-- Diamond accent -->
  <polygon points="600,145 604,150 600,155 596,150" fill="white" opacity="0.25"/>
  ${renderTextLines(content.title, cx, 220, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#FFFFFF', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 255, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', 'rgba(255,255,255,0.75)', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    let dots = '';
    for (let row = 0; row < 12; row++) {
      for (let col = 0; col < 30; col++) {
        const x = 20 + col * 40, y = 20 + row * 40;
        const dist = Math.sqrt((x - cx) ** 2 + (y - 240) ** 2);
        const r = Math.max(1.5, 5 - dist / 120);
        const op = Math.max(0.06, 0.2 - dist / 3000);
        dots += `<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="#4F46E5" opacity="${op.toFixed(2)}"/>`;
      }
    }
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="480" fill="#FFFFFF"/>${dots}
  <circle cx="50" cy="50" r="40" fill="none" stroke="#C7D2FE" stroke-width="0.8" opacity="0.3"/>
  <circle cx="50" cy="50" r="25" fill="none" stroke="#A5B4FC" stroke-width="0.5" opacity="0.25"/>
  <circle cx="1150" cy="430" r="50" fill="none" stroke="#C7D2FE" stroke-width="0.8" opacity="0.25"/>
  <rect x="1050" y="40" width="30" height="30" rx="4" fill="none" stroke="#818CF8" stroke-width="1" opacity="0.2" transform="rotate(15 1065 55)"/>
  <polygon points="100,420 115,400 130,420" fill="none" stroke="#818CF8" stroke-width="1" opacity="0.15"/>
  <rect x="150" y="60" width="900" height="360" rx="16" fill="white" opacity="0.92" stroke="#E0E7FF" stroke-width="1"/>
  <line x1="200" y1="340" x2="1000" y2="340" stroke="#E0E7FF" stroke-width="0.5"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="90" width="${tagW(content.tag, typo.tagSize) + 32}" height="30" rx="15" fill="#EEF2FF"/>
  ${renderTextLines(content.tag, cx, 112, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#4F46E5', '600', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, cx, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#1E1B4B', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 255, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#6B7280', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="go-ov" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#FAFAFA"/><stop offset="100%" stop-color="#F3F4F6"/></linearGradient></defs>
  <rect width="1200" height="480" fill="url(#go-ov)"/>
  <circle cx="200" cy="120" r="180" fill="#6366F1" opacity="0.08"/>
  <circle cx="200" cy="120" r="130" fill="none" stroke="#818CF8" stroke-width="1" opacity="0.12"/>
  <circle cx="350" cy="300" r="140" fill="#A855F7" opacity="0.08"/>
  <circle cx="350" cy="300" r="90" fill="none" stroke="#C084FC" stroke-width="0.8" opacity="0.1"/>
  <rect x="800" y="50" width="300" height="200" fill="#EC4899" opacity="0.06" transform="rotate(10,950,150)"/>
  <rect x="810" y="60" width="280" height="180" fill="none" stroke="#F472B6" stroke-width="0.8" opacity="0.1" transform="rotate(10,950,150)"/>
  <rect x="900" y="280" width="200" height="200" fill="#4F46E5" opacity="0.06" transform="rotate(-5,1000,380)"/>
  <circle cx="1050" cy="100" r="60" fill="#8B5CF6" opacity="0.1"/>
  <circle cx="1050" cy="100" r="40" fill="none" stroke="#A78BFA" stroke-width="0.8" opacity="0.15"/>
  <polygon points="600,30 650,100 550,100" fill="#F59E0B" opacity="0.06"/>
  <polygon points="600,40 640,95 560,95" fill="none" stroke="#FBBF24" stroke-width="0.8" opacity="0.1"/>
  <circle cx="700" cy="400" r="80" fill="#14B8A6" opacity="0.05"/>
  <circle cx="100" cy="400" r="100" fill="#F472B6" opacity="0.04"/>
  <circle cx="500" cy="50" r="2" fill="#6366F1" opacity="0.15"/><circle cx="520" cy="50" r="2" fill="#6366F1" opacity="0.12"/>
  <circle cx="540" cy="50" r="2" fill="#6366F1" opacity="0.09"/><circle cx="500" cy="70" r="2" fill="#6366F1" opacity="0.12"/>
  <rect x="100" y="140" width="1000" height="220" rx="12" fill="white" opacity="0.85"/>
  <rect x="100" y="140" width="1000" height="220" rx="12" fill="none" stroke="#E5E7EB" stroke-width="0.5"/>
  ${renderTextLines(content.title, cx, 220, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#111827', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 260, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#6B7280', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tc-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0F172A"/><stop offset="100%" stop-color="#1E293B"/></linearGradient>
    <linearGradient id="tc-ac" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4F46E5" stop-opacity="0.15"/><stop offset="100%" stop-color="#4F46E5" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#tc-bg)"/>
  <polygon points="0,480 400,200 800,480" fill="#1E293B" stroke="#334155" stroke-width="1" opacity="0.6"/>
  <polygon points="10,480 400,210 790,480" fill="none" stroke="#475569" stroke-width="0.5" opacity="0.3"/>
  <polygon points="600,0 1200,300 1200,0" fill="#1E293B" stroke="#334155" stroke-width="1" opacity="0.4"/>
  <polygon points="610,10 1190,295 1190,10" fill="none" stroke="#475569" stroke-width="0.5" opacity="0.2"/>
  <polygon points="900,480 1100,300 1200,480" fill="#4F46E5" opacity="0.08"/>
  <polygon points="910,480 1100,310 1190,480" fill="none" stroke="#6366F1" stroke-width="0.5" opacity="0.15"/>
  <polygon points="0,0 200,0 0,150" fill="#6366F1" opacity="0.06"/>
  <polygon points="5,5 195,5 5,145" fill="none" stroke="#818CF8" stroke-width="0.5" opacity="0.1"/>
  <polygon points="100,350 180,280 260,350" fill="none" stroke="#475569" stroke-width="0.8" opacity="0.2"/>
  <polygon points="1000,100 1060,40 1120,100" fill="none" stroke="#4F46E5" stroke-width="0.8" opacity="0.15"/>
  <polygon points="500,450 550,400 600,450" fill="#6366F1" opacity="0.05"/>
  <polygon points="700,30 740,0 780,30" fill="#818CF8" opacity="0.04"/>
  <polygon points="400,100 800,100 600,350" fill="url(#tc-ac)"/>
  <circle cx="200" cy="340" r="2" fill="#6366F1" opacity="0.4"/><circle cx="400" cy="240" r="2" fill="#818CF8" opacity="0.35"/>
  <circle cx="600" cy="340" r="2" fill="#6366F1" opacity="0.3"/><circle cx="800" cy="150" r="2" fill="#818CF8" opacity="0.25"/>
  <line x1="200" y1="340" x2="400" y2="240" stroke="#4F46E5" stroke-width="0.5" opacity="0.15"/>
  <line x1="400" y1="240" x2="600" y2="340" stroke="#4F46E5" stroke-width="0.5" opacity="0.12"/>
  <circle cx="300" cy="100" r="1.5" fill="#94A3B8" opacity="0.3"/><circle cx="900" cy="350" r="1.5" fill="#94A3B8" opacity="0.25"/>
  ${renderTextLines(content.title, cx, 210, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#F1F5F9', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 265, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#94A3B8', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fg-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#312E81"/><stop offset="100%" stop-color="#4F46E5"/></linearGradient>
    <radialGradient id="fg-center" cx="0.5" cy="0.5"><stop offset="0%" stop-color="#7C3AED" stop-opacity="0.2"/><stop offset="100%" stop-color="#4F46E5" stop-opacity="0"/></radialGradient>
    <filter id="fg-noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" result="n"/><feColorMatrix type="saturate" values="0" in="n" result="g"/><feBlend in="SourceGraphic" in2="g" mode="multiply"/></filter>
  </defs>
  <rect width="1200" height="480" fill="url(#fg-bg)"/>
  <rect width="1200" height="480" fill="url(#fg-center)"/>
  <!-- Rich color orbs with layering -->
  <circle cx="250" cy="100" r="200" fill="#6366F1" opacity="0.3"/>
  <circle cx="250" cy="100" r="140" fill="#818CF8" opacity="0.15"/>
  <circle cx="950" cy="380" r="250" fill="#818CF8" opacity="0.2"/>
  <circle cx="950" cy="380" r="160" fill="#A78BFA" opacity="0.12"/>
  <circle cx="600" cy="240" r="300" fill="#7C3AED" opacity="0.15"/>
  <circle cx="600" cy="240" r="200" fill="#8B5CF6" opacity="0.08"/>
  <circle cx="100" cy="350" r="80" fill="#A78BFA" opacity="0.12"/>
  <circle cx="400" cy="50" r="60" fill="#C4B5FD" opacity="0.1"/>
  <circle cx="1100" cy="150" r="90" fill="#818CF8" opacity="0.1"/>
  <circle cx="800" cy="100" r="70" fill="#6366F1" opacity="0.08"/>
  <circle cx="300" cy="400" r="40" fill="#A5B4FC" opacity="0.15"/>
  <circle cx="700" cy="420" r="35" fill="#C4B5FD" opacity="0.1"/>
  <circle cx="1050" cy="350" r="45" fill="#818CF8" opacity="0.12"/>
  <circle cx="500" cy="380" r="30" fill="#A78BFA" opacity="0.08"/>
  <circle cx="150" cy="180" r="25" fill="#C4B5FD" opacity="0.12"/>
  <circle cx="1000" cy="60" r="30" fill="#A5B4FC" opacity="0.1"/>
  <!-- Organic blob shapes -->
  <path d="M80 280Q120 240 180 270Q220 290 200 340Q180 380 120 360Q70 340 80 280" fill="#A78BFA" opacity="0.08"/>
  <path d="M1020 180Q1070 150 1120 190Q1150 220 1120 260Q1080 290 1040 260Q1010 230 1020 180" fill="#818CF8" opacity="0.06"/>
  <!-- Noise texture overlay -->
  <rect width="1200" height="480" fill="#7C3AED" filter="url(#fg-noise)" opacity="0.04"/>
  <!-- Scattered light particles -->
  <circle cx="200" cy="200" r="3" fill="white" opacity="0.3"/><circle cx="450" cy="150" r="2.5" fill="white" opacity="0.25"/>
  <circle cx="750" cy="350" r="3" fill="white" opacity="0.2"/><circle cx="900" cy="200" r="2.5" fill="white" opacity="0.25"/>
  <circle cx="350" cy="300" r="2.5" fill="white" opacity="0.2"/><circle cx="1100" cy="250" r="2" fill="white" opacity="0.2"/>
  <circle cx="600" cy="60" r="2" fill="white" opacity="0.15"/><circle cx="800" cy="430" r="2.5" fill="white" opacity="0.18"/>
  <!-- Glass panel with enhanced border -->
  <rect x="120" y="60" width="960" height="360" rx="20" fill="white" opacity="0.1"/>
  <rect x="120" y="60" width="960" height="360" rx="20" fill="none" stroke="white" stroke-width="1.5" opacity="0.2"/>
  <rect x="125" y="65" width="950" height="350" rx="18" fill="none" stroke="white" stroke-width="0.3" opacity="0.1"/>
  <!-- Top highlight line -->
  <line x1="140" y1="80" x2="1060" y2="80" stroke="white" stroke-width="0.5" opacity="0.12"/>
  <line x1="140" y1="400" x2="1060" y2="400" stroke="white" stroke-width="0.5" opacity="0.08"/>
  <!-- Refraction accents -->
  <line x1="160" y1="100" x2="160" y2="380" stroke="white" stroke-width="0.3" opacity="0.06"/>
  <line x1="1040" y1="100" x2="1040" y2="380" stroke="white" stroke-width="0.3" opacity="0.06"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 20)}" y="92" width="${tagW(content.tag, typo.tagSize) + 40}" height="36" rx="18" fill="white" opacity="0.15"/>
  <rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 20)}" y="92" width="${tagW(content.tag, typo.tagSize) + 40}" height="36" rx="18" fill="none" stroke="white" stroke-width="0.5" opacity="0.12"/>
  ${renderTextLines(content.tag, cx, 117, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#C7D2FE', '500', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, cx, 195, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#FFFFFF', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 250, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#C7D2FE', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs><filter id="pn"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" result="n"/><feColorMatrix type="saturate" values="0" in="n" result="g"/><feBlend in="SourceGraphic" in2="g" mode="multiply"/></filter></defs>
  <rect width="1200" height="480" fill="#F5F0E8"/>
  <rect width="1200" height="480" fill="#EDE8DC" filter="url(#pn)" opacity="0.3"/>
  <g opacity="0.25">
    <path d="M100 60Q120 40 140 55Q160 70 180 50Q200 30 220 45" stroke="#8B7D6B" stroke-width="1" fill="none"/>
    <path d="M130 50Q125 35 135 30" stroke="#8B7D6B" stroke-width="0.8" fill="none"/>
    <path d="M160 55Q155 40 165 35" stroke="#8B7D6B" stroke-width="0.8" fill="none"/>
    <path d="M135 30Q140 20 145 30Q140 28 135 30" fill="#A8D5BA" opacity="0.4"/>
    <path d="M165 35Q170 25 175 35Q170 33 165 35" fill="#A8D5BA" opacity="0.35"/>
  </g>
  <g opacity="0.2">
    <path d="M980 420Q1000 400 1020 415Q1040 430 1060 410Q1080 390 1100 405" stroke="#8B7D6B" stroke-width="1" fill="none"/>
    <path d="M1015 390Q1020 380 1025 390Q1020 388 1015 390" fill="#A8D5BA" opacity="0.4"/>
    <path d="M1045 395Q1050 385 1055 395Q1050 393 1045 395" fill="#A8D5BA" opacity="0.35"/>
  </g>
  <path d="M150 400Q170 380 190 400Q170 395 150 400" fill="#B5D8C7" opacity="0.15"/>
  <line x1="200" y1="130" x2="1000" y2="130" stroke="#D4C9B8" stroke-width="0.5"/>
  <line x1="220" y1="136" x2="980" y2="136" stroke="#D4C9B8" stroke-width="0.3" opacity="0.5"/>
  <line x1="200" y1="370" x2="1000" y2="370" stroke="#D4C9B8" stroke-width="0.5"/>
  <polygon points="600,120 605,125 600,130 595,125" fill="#C9B99A" opacity="0.4"/>
  <polygon points="600,375 604,379 600,383 596,379" fill="#C9B99A" opacity="0.35"/>
  <circle cx="300" cy="100" r="1.5" fill="#C9B99A" opacity="0.3"/><circle cx="900" cy="110" r="1.5" fill="#C9B99A" opacity="0.25"/>
  ${renderTextLines(content.title, cx, 220, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#2C1810', '600', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 255, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#6B5B4F', '400', typo.titleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  ${content.author ? renderTextLines(content.author, cx, 420, typo.authorSize, typo.authorSize * 1.4, 2, 'center', '#9C8B7D', '300', typo.subtitleFontFamily) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="fb-ac" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#4F46E5" stop-opacity="0"/><stop offset="50%" stop-color="#4F46E5" stop-opacity="1"/><stop offset="100%" stop-color="#4F46E5" stop-opacity="0"/></linearGradient></defs>
  <rect width="1200" height="480" fill="#FFFFFF"/>
  <rect x="60" y="40" width="1080" height="400" fill="none" stroke="#E5E7EB" stroke-width="1.5"/>
  <rect x="80" y="55" width="1040" height="370" fill="none" stroke="#E5E7EB" stroke-width="0.5"/>
  <path d="M60 55L60 40L75 40" fill="none" stroke="#4F46E5" stroke-width="2" opacity="0.5"/>
  <circle cx="68" cy="48" r="3" fill="#4F46E5" opacity="0.15"/>
  <path d="M80 65L80 55L90 55" fill="none" stroke="#C7D2FE" stroke-width="1" opacity="0.4"/>
  <path d="M1125 40L1140 40L1140 55" fill="none" stroke="#4F46E5" stroke-width="2" opacity="0.5"/>
  <circle cx="1132" cy="48" r="3" fill="#4F46E5" opacity="0.15"/>
  <path d="M1110 55L1120 55L1120 65" fill="none" stroke="#C7D2FE" stroke-width="1" opacity="0.4"/>
  <path d="M1140 425L1140 440L1125 440" fill="none" stroke="#4F46E5" stroke-width="2" opacity="0.5"/>
  <circle cx="1132" cy="432" r="3" fill="#4F46E5" opacity="0.15"/>
  <path d="M1120 415L1120 425L1110 425" fill="none" stroke="#C7D2FE" stroke-width="1" opacity="0.4"/>
  <path d="M75 440L60 440L60 425" fill="none" stroke="#4F46E5" stroke-width="2" opacity="0.5"/>
  <circle cx="68" cy="432" r="3" fill="#4F46E5" opacity="0.15"/>
  <path d="M90 425L80 425L80 415" fill="none" stroke="#C7D2FE" stroke-width="1" opacity="0.4"/>
  <circle cx="600" cy="40" r="2" fill="#D1D5DB" opacity="0.4"/><circle cx="600" cy="440" r="2" fill="#D1D5DB" opacity="0.4"/>
  <circle cx="60" cy="240" r="2" fill="#D1D5DB" opacity="0.4"/><circle cx="1140" cy="240" r="2" fill="#D1D5DB" opacity="0.4"/>
  ${content.tag ? `<line x1="${cx - 40}" y1="95" x2="${cx + 40}" y2="95" stroke="url(#fb-ac)" stroke-width="2"/>
  ${renderTextLines(content.tag, cx, 125, typo.tagSize, typo.tagSize * 1.2, 3, 'center', '#4F46E5', '600', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, cx, 210, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#111827', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 260, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#6B7280', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ss-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4F46E5"/><stop offset="100%" stop-color="#3730A3"/></linearGradient>
    <linearGradient id="ss-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366F1"/><stop offset="50%" stop-color="#818CF8"/><stop offset="100%" stop-color="#6366F1"/></linearGradient>
    <pattern id="ss-lines" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="20" stroke="white" stroke-width="0.2" opacity="0.04"/></pattern>
  </defs>
  <rect width="1200" height="480" fill="#FAFAFA"/>
  <rect x="0" y="0" width="420" height="480" fill="url(#ss-l)"/>
  <rect x="0" y="0" width="420" height="480" fill="url(#ss-lines)"/>
  <!-- Left panel organic shapes -->
  <circle cx="210" cy="240" r="120" fill="white" opacity="0.05"/>
  <circle cx="210" cy="240" r="80" fill="none" stroke="white" stroke-width="1" opacity="0.1"/>
  <circle cx="210" cy="240" r="40" fill="none" stroke="white" stroke-width="0.5" opacity="0.15"/>
  <circle cx="210" cy="240" r="10" fill="white" opacity="0.08"/>
  <path d="M60 120Q100 80 160 110Q200 130 180 180Q160 220 100 200Q50 180 60 120" fill="white" opacity="0.02"/>
  <path d="M250 340Q290 310 340 340Q370 360 350 400Q330 430 280 420Q240 400 250 340" fill="white" opacity="0.02"/>
  <!-- Corner brackets -->
  <path d="M20 20L20 50" stroke="white" stroke-width="0.5" opacity="0.2"/><path d="M20 20L50 20" stroke="white" stroke-width="0.5" opacity="0.2"/>
  <path d="M400 430L400 460" stroke="white" stroke-width="0.5" opacity="0.2"/><path d="M370 460L400 460" stroke="white" stroke-width="0.5" opacity="0.2"/>
  <circle cx="80" cy="100" r="2.5" fill="white" opacity="0.2"/><circle cx="340" cy="80" r="2" fill="white" opacity="0.15"/>
  <circle cx="100" cy="380" r="2" fill="white" opacity="0.15"/><circle cx="320" cy="400" r="2" fill="white" opacity="0.12"/>
  <!-- Gradient divider with accents -->
  <rect x="420" y="0" width="4" height="480" fill="url(#ss-d)" opacity="0.5"/>
  <circle cx="422" cy="120" r="4" fill="#818CF8" opacity="0.3"/>
  <circle cx="422" cy="240" r="3" fill="#6366F1" opacity="0.25"/>
  <circle cx="422" cy="360" r="4" fill="#818CF8" opacity="0.3"/>
  <!-- Right panel decorations -->
  <circle cx="1100" cy="60" r="50" fill="#EEF2FF" opacity="0.6"/>
  <circle cx="1100" cy="60" r="30" fill="none" stroke="#C7D2FE" stroke-width="0.5" opacity="0.4"/>
  <circle cx="1100" cy="60" r="12" fill="#E0E7FF" opacity="0.3"/>
  <rect x="1050" y="400" width="40" height="40" fill="none" stroke="#E0E7FF" stroke-width="0.8" opacity="0.4" transform="rotate(15 1070 420)"/>
  <rect x="1056" y="406" width="28" height="28" fill="none" stroke="#C7D2FE" stroke-width="0.4" opacity="0.3" transform="rotate(15 1070 420)"/>
  <circle cx="1100" cy="200" r="2.5" fill="#D1D5DB" opacity="0.3"/><circle cx="1120" cy="200" r="2.5" fill="#D1D5DB" opacity="0.25"/>
  <circle cx="1140" cy="200" r="2.5" fill="#D1D5DB" opacity="0.2"/><circle cx="1100" cy="220" r="2.5" fill="#D1D5DB" opacity="0.25"/>
  <circle cx="1120" cy="220" r="2.5" fill="#D1D5DB" opacity="0.2"/><circle cx="1140" cy="220" r="2.5" fill="#D1D5DB" opacity="0.15"/>
  <line x1="480" y1="440" x2="700" y2="440" stroke="#E5E7EB" stroke-width="0.5"/>
  <polygon points="710,440 718,435 718,445" fill="#E5E7EB" opacity="0.4"/>
  ${content.tag ? renderTextLines(content.tag, 210, 175, typo.tagSize, typo.tagSize * 1.2, 2, 'center', '#A5B4FC', '500', typo.subtitleFontFamily) : ''}
  <line x1="150" y1="205" x2="270" y2="205" stroke="white" stroke-width="0.5" opacity="0.3"/>
  ${content.author ? renderTextLines(content.author, 210, 380, typo.authorSize, typo.authorSize * 1.4, 1.5, 'center', 'rgba(255,255,255,0.4)', '300', typo.subtitleFontFamily) : ''}
  ${renderTextLines(content.title, 480, 185, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#111827', '800', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 480, 265, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#6B7280', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="ds-gl" cx="0.75" cy="0.5"><stop offset="0%" stop-color="#1E40AF" stop-opacity="0.3"/><stop offset="100%" stop-color="#0A192F" stop-opacity="0"/></radialGradient>
    <radialGradient id="ds-gl2" cx="0.2" cy="0.8"><stop offset="0%" stop-color="#3B82F6" stop-opacity="0.1"/><stop offset="100%" stop-color="#0A192F" stop-opacity="0"/></radialGradient>
    <linearGradient id="ds-ln" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#60A5FA" stop-opacity="0"/><stop offset="50%" stop-color="#60A5FA" stop-opacity="0.6"/><stop offset="100%" stop-color="#60A5FA" stop-opacity="0"/></linearGradient>
    <linearGradient id="ds-holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#60A5FA" stop-opacity="0.05"/><stop offset="50%" stop-color="#A78BFA" stop-opacity="0.03"/><stop offset="100%" stop-color="#60A5FA" stop-opacity="0.05"/></linearGradient>
  </defs>
  <rect width="1200" height="480" fill="#0A192F"/>
  <rect width="1200" height="480" fill="url(#ds-gl)"/>
  <rect width="1200" height="480" fill="url(#ds-gl2)"/>
  <rect width="1200" height="480" fill="url(#ds-holo)"/>
  <image href="assets/images/cover-illustrations/isometric-devices.svg" x="620" y="30" width="560" height="420" opacity="0.85"/>
  <!-- Connection lines -->
  <line x1="500" y1="200" x2="650" y2="180" stroke="url(#ds-ln)" stroke-width="1"/>
  <line x1="500" y1="280" x2="650" y2="300" stroke="url(#ds-ln)" stroke-width="0.8"/>
  <!-- Enhanced perspective grid -->
  <g opacity="0.06">
    <line x1="80" y1="0" x2="80" y2="480" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="160" y1="0" x2="160" y2="480" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="240" y1="0" x2="240" y2="480" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="320" y1="0" x2="320" y2="480" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="400" y1="0" x2="400" y2="480" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="480" y1="0" x2="480" y2="480" stroke="#60A5FA" stroke-width="0.3"/>
    <line x1="0" y1="80" x2="560" y2="80" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="0" y1="160" x2="560" y2="160" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="0" y1="240" x2="560" y2="240" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="0" y1="320" x2="560" y2="320" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="0" y1="400" x2="560" y2="400" stroke="#60A5FA" stroke-width="0.5"/>
  </g>
  <!-- Perspective vanishing lines -->
  <g opacity="0.04">
    <line x1="0" y1="480" x2="300" y2="0" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="0" y1="480" x2="500" y2="100" stroke="#3B82F6" stroke-width="0.3"/>
    <line x1="560" y1="480" x2="300" y2="0" stroke="#60A5FA" stroke-width="0.5"/>
  </g>
  <!-- Grid intersection nodes -->
  <circle cx="160" cy="160" r="4" fill="#60A5FA" opacity="0.15"/><circle cx="160" cy="160" r="2" fill="#93C5FD" opacity="0.4"/>
  <circle cx="320" cy="240" r="4" fill="#60A5FA" opacity="0.12"/><circle cx="320" cy="240" r="2" fill="#93C5FD" opacity="0.35"/>
  <circle cx="240" cy="320" r="3.5" fill="#60A5FA" opacity="0.1"/><circle cx="240" cy="320" r="2" fill="#93C5FD" opacity="0.3"/>
  <circle cx="480" cy="160" r="3" fill="#60A5FA" opacity="0.1"/><circle cx="480" cy="160" r="2" fill="#93C5FD" opacity="0.3"/>
  <!-- Data flow connection points -->
  <circle cx="500" cy="200" r="6" fill="#60A5FA" opacity="0.4"/>
  <circle cx="500" cy="200" r="3.5" fill="#93C5FD" opacity="0.7"/>
  <circle cx="500" cy="280" r="5" fill="#38BDF8" opacity="0.35"/>
  <circle cx="500" cy="280" r="3" fill="#7DD3FC" opacity="0.6"/>
  <!-- Scattered data particles -->
  <circle cx="150" cy="80" r="2" fill="#60A5FA" opacity="0.3"/>
  <circle cx="350" cy="430" r="2.5" fill="#38BDF8" opacity="0.25"/>
  <circle cx="80" cy="400" r="1.5" fill="#60A5FA" opacity="0.2"/>
  <circle cx="450" cy="60" r="2" fill="#93C5FD" opacity="0.2"/>
  <!-- Decorative bracket -->
  <path d="M520 140L540 140L540 160" stroke="#60A5FA" stroke-width="0.8" fill="none" opacity="0.2"/>
  <path d="M520 340L540 340L540 320" stroke="#60A5FA" stroke-width="0.8" fill="none" opacity="0.15"/>
  <rect x="60" y="440" width="40" height="3" rx="1" fill="#60A5FA" opacity="0.3"/>
  <rect x="110" y="440" width="25" height="3" rx="1" fill="#60A5FA" opacity="0.2"/>
  <rect x="145" y="440" width="15" height="3" rx="1" fill="#3B82F6" opacity="0.15"/>
  ${content.tag ? `<rect x="80" y="88" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="36" rx="6" fill="#60A5FA" opacity="0.12"/>
  <rect x="80" y="88" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="36" rx="6" fill="none" stroke="#60A5FA" stroke-width="0.5" opacity="0.25"/>
  ${renderTextLines(content.tag, 94, 113, typo.tagSize, typo.tagSize * 1.2, 1, 'left', '#93C5FD', '500', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 80, 190, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#E2E8F0', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 280, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#64748B', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ws-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#C2410C"/><stop offset="50%" stop-color="#B45309"/><stop offset="100%" stop-color="#92400E"/></linearGradient>
    <radialGradient id="ws-gl" cx="0.3" cy="0.5"><stop offset="0%" stop-color="#F97316" stop-opacity="0.2"/><stop offset="100%" stop-color="#C2410C" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#ws-bg)"/>
  <rect width="1200" height="480" fill="url(#ws-gl)"/>
  <circle cx="200" cy="100" r="150" fill="white" opacity="0.04"/>
  <circle cx="100" cy="400" r="100" fill="white" opacity="0.03"/>
  <path d="M0 350Q200 310 400 340Q600 370 800 330" stroke="white" stroke-width="1" fill="none" opacity="0.06"/>
  <path d="M0 80Q150 100 300 70Q450 40 600 60" stroke="white" stroke-width="0.8" fill="none" opacity="0.05"/>
  ${content.tag ? `<rect x="80" y="80" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="32" rx="16" fill="#F97316"/>
  ${renderTextLines(content.tag, 94, 103, typo.tagSize, typo.tagSize * 1.2, 1, 'left', '#FFFFFF', '600', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 80, 180, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '800', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 260, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#FED7AA', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  ${content.author ? renderTextLines(content.author, 80, 430, typo.authorSize, typo.authorSize * 1.4, 1, 'left', 'rgba(255,255,255,0.5)', '300', typo.subtitleFontFamily) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pm-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0D9488"/><stop offset="100%" stop-color="#10B981"/></linearGradient>
    <radialGradient id="pm-gl" cx="0.3" cy="0.4"><stop offset="0%" stop-color="#14B8A6" stop-opacity="0.3"/><stop offset="100%" stop-color="#0D9488" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#pm-bg)"/>
  <rect width="1200" height="480" fill="url(#pm-gl)"/>
  <circle cx="200" cy="80" r="120" fill="white" opacity="0.04"/>
  <circle cx="100" cy="350" r="80" fill="white" opacity="0.03"/>
  <circle cx="500" cy="450" r="60" fill="white" opacity="0.03"/>
  <circle cx="300" cy="60" r="2" fill="white" opacity="0.2"/><circle cx="320" cy="60" r="2" fill="white" opacity="0.18"/>
  <circle cx="340" cy="60" r="2" fill="white" opacity="0.15"/><circle cx="300" cy="80" r="2" fill="white" opacity="0.18"/>
  <circle cx="320" cy="80" r="2" fill="white" opacity="0.15"/><circle cx="340" cy="80" r="2" fill="white" opacity="0.12"/>
  <circle cx="450" cy="100" r="3" fill="white" opacity="0.15"/><circle cx="500" cy="420" r="2" fill="white" opacity="0.12"/>
  <!-- Dark footer bar -->
  <rect x="0" y="430" width="1200" height="50" fill="#134E4A" opacity="0.6"/>
  <line x1="0" y1="430" x2="1200" y2="430" stroke="#0F766E" stroke-width="1" opacity="0.4"/>
  <!-- Left side bold text -->
  ${content.tag ? `<rect x="80" y="60" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 24)}" height="30" rx="6" fill="#134E4A" opacity="0.5"/>
  ${renderTextLines(content.tag, 92, 82, typo.tagSize, typo.tagSize * 1.2, 1, 'left', '#99F6E4', '600', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 80, 170, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#134E4A', '900', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 255, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#0F766E', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  ${content.author ? `<text x="80" y="458" font-size="${typo.authorSize}" font-family="${typo.subtitleFontFamily}" fill="rgba(255,255,255,0.6)" letter-spacing="1">${esc(content.author)}</text>` : ''}
  <!-- Right side mascot character -->
  <image href="assets/images/cover-illustrations/mascot-character.svg" x="680" y="10" width="480" height="420" opacity="0.9"/>
  <!-- Floating decorative elements -->
  <circle cx="640" cy="100" r="4" fill="#FBBF24" opacity="0.4"/>
  <circle cx="660" cy="350" r="3" fill="#F59E0B" opacity="0.3"/>
  <rect x="620" y="200" width="18" height="18" rx="3" fill="none" stroke="white" stroke-width="0.8" opacity="0.15" transform="rotate(20 629 209)"/>
  <polygon points="650,280 658,268 666,280" fill="none" stroke="white" stroke-width="0.8" opacity="0.12"/>
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="ir-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="0.8" fill="#C7D2FE" opacity="0.35"/></pattern>
  </defs>
  <rect width="1200" height="480" fill="#F8FAFC"/>
  <rect x="0" y="0" width="600" height="480" fill="white" opacity="0.5"/>
  <rect x="0" y="0" width="600" height="480" fill="url(#ir-dots)"/>
  <path d="M620 60 Q640 40 660 60 Q680 80 660 100 Q640 120 620 100 Q600 80 620 60Z" fill="#EEF2FF" opacity="0.5"/>
  <path d="M560 380 Q580 360 600 380 Q610 400 590 410 Q570 420 560 400Z" fill="#E0E7FF" opacity="0.35"/>
  <line x1="600" y1="40" x2="600" y2="440" stroke="#E2E8F0" stroke-width="0.5" opacity="0.5"/>
  <path d="M620 30 L620 50 M620 30 L640 30" stroke="#C7D2FE" stroke-width="1.5" fill="none" opacity="0.4"/>
  <path d="M1170 30 L1170 50 M1170 30 L1150 30" stroke="#C7D2FE" stroke-width="1.5" fill="none" opacity="0.4"/>
  <path d="M620 450 L620 430 M620 450 L640 450" stroke="#C7D2FE" stroke-width="1.5" fill="none" opacity="0.4"/>
  <path d="M1170 450 L1170 430 M1170 450 L1150 450" stroke="#C7D2FE" stroke-width="1.5" fill="none" opacity="0.4"/>
  <rect x="80" y="100" width="6" height="50" rx="3" fill="#4F46E5"/>
  ${content.tag ? `<rect x="80" y="100" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="36" rx="18" fill="#EEF2FF"/>
  <rect x="80" y="100" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="36" rx="18" fill="none" stroke="#C7D2FE" stroke-width="1" opacity="0.6"/>
  ${renderTextLines(content.tag, 94, 124, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#4F46E5', '600', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 80, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#0F172A', '800', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 280, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#64748B', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  <line x1="80" y1="380" x2="180" y2="380" stroke="#C7D2FE" stroke-width="1.5" opacity="0.5"/>
  <line x1="185" y1="380" x2="320" y2="380" stroke="#E2E8F0" stroke-width="0.5"/>
  <circle cx="180" cy="380" r="2" fill="#C7D2FE" opacity="0.5"/>
  <circle cx="50" cy="160" r="3" fill="#A5B4FC" opacity="0.25"/>
  <circle cx="540" cy="80" r="2.5" fill="#818CF8" opacity="0.2"/>
  <circle cx="30" cy="400" r="2" fill="#C7D2FE" opacity="0.3"/>
  <circle cx="500" cy="440" r="3" fill="#A5B4FC" opacity="0.2"/>
  <circle cx="280" cy="60" r="1.5" fill="#818CF8" opacity="0.2"/>
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="480" fill="#0F172A"/>
  <circle cx="100" cy="80" r="2" fill="#818CF8" opacity="0.2"/><circle cx="300" cy="50" r="1.5" fill="#A78BFA" opacity="0.15"/>
  <circle cx="500" cy="430" r="2" fill="#6366F1" opacity="0.2"/><circle cx="150" cy="400" r="1.5" fill="#818CF8" opacity="0.15"/>
  ${illustBlock}
  <line x1="620" y1="120" x2="620" y2="360" stroke="#1E293B" stroke-width="1"/>
  ${content.tag ? `<rect x="660" y="110" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="30" rx="15" fill="#6366F1" opacity="0.2"/>
  ${renderTextLines(content.tag, 674, 131, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#A5B4FC', '600', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 1140, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'right', '#F1F5F9', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 1140, 260, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'right', '#94A3B8', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  <line x1="700" y1="420" x2="1140" y2="420" stroke="#1E293B" stroke-width="0.5"/>
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="480" fill="#FFF8F0"/>
  <circle cx="200" cy="80" r="80" fill="#FFECD2" opacity="0.4"/>
  <circle cx="1000" cy="80" r="80" fill="#FFECD2" opacity="0.4"/>
  <circle cx="200" cy="80" r="50" fill="none" stroke="#F5DEB3" stroke-width="0.5" opacity="0.3"/>
  <circle cx="1000" cy="80" r="50" fill="none" stroke="#F5DEB3" stroke-width="0.5" opacity="0.3"/>
  <circle cx="440" cy="40" r="6" fill="#A8D5BA" opacity="0.2"/>
  <circle cx="760" cy="40" r="6" fill="#A8D5BA" opacity="0.2"/>
  <circle cx="420" cy="200" r="4" fill="#F59E0B" opacity="0.15"/>
  <circle cx="780" cy="200" r="4" fill="#F59E0B" opacity="0.15"/>
  ${illustBlock}
  <line x1="460" y1="250" x2="740" y2="250" stroke="#D7CCC8" stroke-width="1"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="263" width="${tagW(content.tag, typo.tagSize) + 32}" height="32" rx="16" fill="#FEF3C7"/>
  ${renderTextLines(content.tag, cx, 285, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#B45309', '600', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, cx, 330, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#3E2723', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 400, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#795548', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="is-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7C3AED"/><stop offset="100%" stop-color="#4338CA"/></linearGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#is-bg)"/>
  <circle cx="100" cy="60" r="2" fill="white" opacity="0.2"/><circle cx="300" cy="40" r="1.5" fill="white" opacity="0.15"/>
  <circle cx="500" cy="450" r="2" fill="white" opacity="0.15"/>
  <rect x="20" y="20" width="570" height="440" rx="16" fill="white" opacity="0.1"/>
  <rect x="20" y="20" width="570" height="440" rx="16" fill="none" stroke="white" stroke-width="0.5" opacity="0.15"/>
  ${illustBlock}
  <line x1="620" y1="60" x2="620" y2="420" stroke="white" stroke-width="0.5" opacity="0.1"/>
  ${content.tag ? `<rect x="660" y="100" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="30" rx="15" fill="white" opacity="0.15"/>
  ${renderTextLines(content.tag, 674, 121, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#E0E7FF', '500', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 660, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 660, 250, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#C4B5FD', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  <line x1="660" y1="420" x2="900" y2="420" stroke="white" stroke-width="0.5" opacity="0.15"/>
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ih-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0D9488"/><stop offset="100%" stop-color="#10B981"/></linearGradient>
    <linearGradient id="ih-btm" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0D9488" stop-opacity="0"/><stop offset="100%" stop-color="#064E3B" stop-opacity="0.5"/></linearGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#ih-bg)"/>
  <rect width="1200" height="480" fill="url(#ih-btm)"/>
  <circle cx="200" cy="80" r="120" fill="white" opacity="0.04"/>
  <circle cx="100" cy="350" r="80" fill="white" opacity="0.03"/>
  <path d="M40 200 Q60 170 90 190 Q120 210 100 240 Q80 270 50 250 Q20 230 40 200Z" fill="white" opacity="0.03"/>
  <path d="M500 40 Q530 20 550 45 Q570 70 545 85 Q520 100 500 80 Q480 60 500 40Z" fill="white" opacity="0.025"/>
  <path d="M30 30 L30 55 M30 30 L55 30" stroke="white" stroke-width="1" fill="none" opacity="0.12"/>
  <path d="M550 30 L550 55 M550 30 L525 30" stroke="white" stroke-width="1" fill="none" opacity="0.12"/>
  <circle cx="450" cy="120" r="3" fill="#99F6E4" opacity="0.2"/>
  <circle cx="320" cy="260" r="2" fill="#5EEAD4" opacity="0.18"/>
  <circle cx="520" cy="300" r="2.5" fill="white" opacity="0.12"/>
  <circle cx="50" cy="140" r="2" fill="#A7F3D0" opacity="0.2"/>
  <circle cx="400" cy="50" r="1.5" fill="white" opacity="0.15"/>
  <circle cx="250" cy="380" r="2" fill="#5EEAD4" opacity="0.15"/>
  ${illustBlock}
  ${content.tag ? `<rect x="80" y="80" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="38" rx="8" fill="#134E4A" opacity="0.5"/>
  <rect x="80" y="80" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="38" rx="8" fill="none" stroke="#5EEAD4" stroke-width="0.8" opacity="0.4"/>
  ${renderTextLines(content.tag, 94, 106, typo.tagSize, typo.tagSize * 1.2, 1, 'left', '#99F6E4', '600', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 80, 190, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '800', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 250, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#A7F3D0', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  <path d="M0 425 Q300 410 600 425 Q900 440 1200 420" stroke="white" stroke-width="0.5" fill="none" opacity="0.15"/>
  <path d="M0 430 Q300 415 600 430 Q900 445 1200 425" stroke="#5EEAD4" stroke-width="0.3" fill="none" opacity="0.1"/>
  <rect x="0" y="435" width="1200" height="45" fill="#134E4A" opacity="0.4"/>
  <line x1="0" y1="435" x2="1200" y2="435" stroke="#0F766E" stroke-width="0.5" opacity="0.4"/>
  ${content.author ? renderTextLines(content.author, 80, 464, typo.authorSize, typo.authorSize * 1.4, 1, 'left', 'rgba(255,255,255,0.6)', '300', typo.subtitleFontFamily) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ic-shadow"><feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="#000" flood-opacity="0.08"/></filter>
    <filter id="ic-shadow2"><feDropShadow dx="0" dy="8" stdDeviation="20" flood-color="#4F46E5" flood-opacity="0.06"/></filter>
    <pattern id="ic-dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="1" fill="#E2E8F0" opacity="0.5"/></pattern>
    <pattern id="ic-dots2" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="0.6" fill="#C7D2FE" opacity="0.3"/></pattern>
  </defs>
  <rect width="1200" height="480" fill="#F8FAFC"/>
  <rect width="1200" height="480" fill="url(#ic-dots)"/>
  <path d="M100 400 Q130 370 160 395 Q190 420 160 445 Q130 470 100 445 Q70 420 100 400Z" fill="#EEF2FF" opacity="0.4"/>
  <path d="M1050 30 Q1080 10 1100 35 Q1120 60 1095 75 Q1070 90 1050 70 Q1030 50 1050 30Z" fill="#E0E7FF" opacity="0.3"/>
  <path d="M180 80 Q200 60 220 80 Q235 100 215 115 Q195 130 180 110 Q165 90 180 80Z" fill="#EEF2FF" opacity="0.25"/>
  <circle cx="140" cy="120" r="3" fill="#A5B4FC" opacity="0.2"/>
  <circle cx="1060" cy="380" r="2.5" fill="#818CF8" opacity="0.2"/>
  <circle cx="100" cy="300" r="2" fill="#C7D2FE" opacity="0.25"/>
  <circle cx="1100" cy="200" r="3" fill="#A5B4FC" opacity="0.18"/>
  <circle cx="200" cy="450" r="1.5" fill="#818CF8" opacity="0.2"/>
  <circle cx="1000" cy="60" r="2" fill="#C7D2FE" opacity="0.22"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="18" width="${tagW(content.tag, typo.tagSize) + 32}" height="38" rx="19" fill="#EEF2FF"/>
  <rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="18" width="${tagW(content.tag, typo.tagSize) + 32}" height="38" rx="19" fill="none" stroke="#C7D2FE" stroke-width="1" opacity="0.5"/>
  ${renderTextLines(content.tag, cx, 43, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#4F46E5', '600', typo.subtitleFontFamily)}` : ''}
  <rect x="240" y="55" width="720" height="370" rx="20" fill="white" filter="url(#ic-shadow2)"/>
  <rect x="240" y="55" width="720" height="370" rx="20" fill="white" filter="url(#ic-shadow)"/>
  <rect x="240" y="55" width="720" height="370" rx="20" fill="url(#ic-dots2)"/>
  <rect x="240" y="55" width="720" height="370" rx="20" fill="none" stroke="#E2E8F0" stroke-width="1"/>
  <line x1="260" y1="52" x2="290" y2="52" stroke="#C7D2FE" stroke-width="1.5" opacity="0.4"/>
  <line x1="910" y1="428" x2="940" y2="428" stroke="#C7D2FE" stroke-width="1.5" opacity="0.4"/>
  <line x1="270" y1="290" x2="930" y2="290" stroke="#F1F5F9" stroke-width="1"/>
  ${illustInner}
  ${renderTextLines(content.title, cx, 330, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#0F172A', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 310, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#64748B', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="iw-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E0F2FE"/><stop offset="100%" stop-color="#FFFFFF"/></linearGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#iw-bg)"/>
  <path d="M0 60Q200 20 400 50Q600 80 800 40Q1000 0 1200 30" stroke="#BAE6FD" stroke-width="2" fill="none" opacity="0.4"/>
  <path d="M0 80Q200 40 400 70Q600 100 800 60Q1000 20 1200 50" stroke="#7DD3FC" stroke-width="1" fill="none" opacity="0.3"/>
  <path d="M0 420Q200 450 400 430Q600 410 800 440Q1000 470 1200 450" stroke="#BAE6FD" stroke-width="2" fill="none" opacity="0.3"/>
  <path d="M0 440Q200 470 400 450Q600 430 800 460Q1000 490 1200 470" stroke="#7DD3FC" stroke-width="1" fill="none" opacity="0.2"/>
  <rect x="80" y="140" width="6" height="200" rx="3" fill="#0EA5E9"/>
  ${content.tag ? renderTextLines(content.tag, 110, 170, typo.tagSize, typo.tagSize * 1.2, 2, 'left', '#0284C7', '600', typo.subtitleFontFamily) : ''}
  ${renderTextLines(content.title, 110, 220, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#0C4A6E', '800', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 110, 280, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#64748B', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="idg-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0A0A1A"/><stop offset="100%" stop-color="#1A1A3E"/></linearGradient>
    <radialGradient id="idg-glow2" cx="0.3" cy="0.7"><stop offset="0%" stop-color="#7C3AED" stop-opacity="0.12"/><stop offset="100%" stop-color="#7C3AED" stop-opacity="0"/></radialGradient>
    <radialGradient id="idg-glow3" cx="0.15" cy="0.3"><stop offset="0%" stop-color="#C084FC" stop-opacity="0.08"/><stop offset="100%" stop-color="#C084FC" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#idg-bg)"/>
  <rect width="1200" height="480" fill="url(#idg-glow2)"/>
  <rect width="1200" height="480" fill="url(#idg-glow3)"/>
  <circle cx="200" cy="100" r="2" fill="#A855F7" opacity="0.3"/><circle cx="400" cy="60" r="1.5" fill="#C084FC" opacity="0.25"/>
  <circle cx="100" cy="380" r="2" fill="#7C3AED" opacity="0.2"/><circle cx="500" cy="430" r="1.5" fill="#A855F7" opacity="0.2"/>
  <circle cx="300" cy="30" r="1.8" fill="#D8B4FE" opacity="0.2"/><circle cx="550" cy="100" r="1.2" fill="#E9D5FF" opacity="0.18"/>
  <circle cx="150" cy="250" r="2.2" fill="#A855F7" opacity="0.15"/><circle cx="450" cy="350" r="1.5" fill="#C084FC" opacity="0.2"/>
  <circle cx="350" cy="450" r="1.8" fill="#7C3AED" opacity="0.18"/><circle cx="50" cy="60" r="1.5" fill="#D8B4FE" opacity="0.22"/>
  <circle cx="520" cy="200" r="1" fill="#E9D5FF" opacity="0.15"/><circle cx="250" cy="180" r="1.8" fill="#A855F7" opacity="0.12"/>
  <circle cx="80" cy="440" r="2" fill="#C084FC" opacity="0.15"/><circle cx="580" cy="50" r="1.2" fill="#D8B4FE" opacity="0.2"/>
  <path d="M60 150 Q80 120 110 140 Q140 160 120 190 Q100 220 70 200 Q40 180 60 150Z" fill="#7C3AED" opacity="0.04"/>
  <path d="M480 380 Q510 360 530 385 Q550 410 525 425 Q500 440 480 420 Q460 400 480 380Z" fill="#A855F7" opacity="0.03"/>
  <line x1="80" y1="180" x2="200" y2="180" stroke="#A855F7" stroke-width="0.3" opacity="0.15"/>
  <line x1="100" y1="195" x2="180" y2="195" stroke="#C084FC" stroke-width="0.2" opacity="0.1"/>
  <path d="M30 30 L30 55 M30 30 L55 30" stroke="#A855F7" stroke-width="1" fill="none" opacity="0.2"/>
  <path d="M570 30 L570 55 M570 30 L545 30" stroke="#A855F7" stroke-width="1" fill="none" opacity="0.2"/>
  <path d="M30 450 L30 425 M30 450 L55 450" stroke="#7C3AED" stroke-width="1" fill="none" opacity="0.15"/>
  ${illustBlock}
  ${content.tag ? `<rect x="80" y="100" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="36" rx="18" fill="#A855F7" opacity="0.2"/>
  <rect x="80" y="100" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="36" rx="18" fill="none" stroke="#A855F7" stroke-width="0.5" opacity="0.4"/>
  ${renderTextLines(content.tag, 94, 124, typo.tagSize, typo.tagSize * 1.2, 1, 'left', '#D8B4FE', '600', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 80, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '700', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 280, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#C084FC', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  <line x1="80" y1="380" x2="200" y2="380" stroke="#A855F7" stroke-width="1.5" opacity="0.35"/>
  <line x1="205" y1="380" x2="350" y2="380" stroke="#7C3AED" stroke-width="0.5" opacity="0.2"/>
  <circle cx="200" cy="380" r="2" fill="#A855F7" opacity="0.4"/>
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="480" fill="#FAFAFA"/>
  <text x="80" y="80" font-size="72" font-family="${SERIF_FAMILY}" fill="#E5E7EB" font-weight="700" letter-spacing="-2">${esc(content.issueNumber || 'No.01')}</text>
  <line x1="80" y1="100" x2="580" y2="100" stroke="#111827" stroke-width="2"/>
  <line x1="80" y1="106" x2="400" y2="106" stroke="#D1D5DB" stroke-width="0.5"/>
  ${renderTextLines(content.title, 80, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#111827', '700', SERIF_FAMILY, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 250, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#6B7280', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
  <line x1="80" y1="400" x2="580" y2="400" stroke="#E5E7EB" stroke-width="1"/>
  ${content.author ? renderTextLines(content.author, 80, 440, typo.authorSize, typo.authorSize * 1.4, 1, 'left', '#9CA3AF', '400', typo.subtitleFontFamily) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tng-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#07111F"/><stop offset="58%" stop-color="#10213C"/><stop offset="100%" stop-color="#0F2F3B"/></linearGradient>
    <pattern id="tng-grid" width="52" height="52" patternUnits="userSpaceOnUse"><path d="M52 0H0V52" fill="none" stroke="#67E8F9" stroke-width="0.9" opacity="0.13"/></pattern>
    <radialGradient id="tng-glow" cx="0.76" cy="0.47" r="0.5"><stop offset="0%" stop-color="#22D3EE" stop-opacity="0.32"/><stop offset="100%" stop-color="#22D3EE" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#tng-bg)"/>
  <rect width="1200" height="480" fill="url(#tng-grid)"/>
  <rect width="1200" height="480" fill="url(#tng-glow)"/>
  <path d="M70 50H220M70 68H156" stroke="#67E8F9" stroke-width="1" opacity="0.16"/>
  <circle cx="160" cy="128" r="3" fill="#67E8F9" opacity="0.3"/><circle cx="310" cy="92" r="2" fill="#A3E635" opacity="0.24"/>
  <circle cx="515" cy="390" r="2.5" fill="#38BDF8" opacity="0.18"/><circle cx="95" cy="375" r="2" fill="#67E8F9" opacity="0.2"/>
  <path d="M156 396H440" stroke="#38BDF8" stroke-width="4" opacity="0.4"/>
  <path d="M456 396H600" stroke="#A3E635" stroke-width="2" opacity="0.28"/>
  <path d="M42 42L42 80M42 42L80 42" stroke="#67E8F9" stroke-width="1.4" fill="none" opacity="0.24"/>
  <path d="M560 438L560 404M560 438L520 438" stroke="#A3E635" stroke-width="1" fill="none" opacity="0.18"/>
  ${illustBlock}
  ${content.tag ? `<rect x="80" y="58" width="${Math.max(92, tagW(content.tag, typo.tagSize) + 34)}" height="38" rx="8" fill="#22D3EE" opacity="0.12"/>
  <rect x="80" y="58" width="${Math.max(92, tagW(content.tag, typo.tagSize) + 34)}" height="38" rx="8" fill="none" stroke="#67E8F9" stroke-width="0.8" opacity="0.34"/>
  ${renderTextLines(content.tag, 97, 84, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#67E8F9', '700', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 80, 170, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#F8FAFC', '800', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 282, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#A7F3D0', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tlc-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F8FAFC"/><stop offset="48%" stop-color="#EEF2FF"/><stop offset="100%" stop-color="#DCFCE7"/></linearGradient>
    <linearGradient id="tlc-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#2563EB"/><stop offset="100%" stop-color="#16A34A"/></linearGradient>
    <pattern id="tlc-dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#1D4ED8" opacity="0.08"/></pattern>
  </defs>
  <rect width="1200" height="480" fill="url(#tlc-bg)"/>
  <rect width="1200" height="480" fill="url(#tlc-dots)"/>
  <path d="M112 88H312M112 108H224" stroke="#1D4ED8" stroke-width="1.2" opacity="0.18"/>
  <path d="M108 408H384" stroke="#2563EB" stroke-width="4" opacity="0.24"/>
  <circle cx="1068" cy="384" r="68" fill="#22C55E" opacity="0.08"/>
  <circle cx="650" cy="84" r="9" fill="#2563EB" opacity="0.1"/><circle cx="604" cy="390" r="7" fill="#16A34A" opacity="0.12"/>
  ${illustBlock}
  ${content.tag ? renderTextLines(content.tag, 80, 88, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#1D4ED8', '700', typo.subtitleFontFamily) : ''}
  ${renderTextLines(content.title, 80, 172, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#111827', '800', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 284, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#475569', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="plp-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F8FAFC"/><stop offset="58%" stop-color="#EFF6FF"/><stop offset="100%" stop-color="#ECFEFF"/></linearGradient>
    <linearGradient id="plp-accent" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#2563EB"/><stop offset="100%" stop-color="#14B8A6"/></linearGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#plp-bg)"/>
  <circle cx="104" cy="92" r="28" fill="#DBEAFE" opacity="0.7"/>
  <circle cx="604" cy="392" r="18" fill="#CCFBF1" opacity="0.9"/>
  <path d="M180 404C292 356 424 356 564 404" stroke="#14B8A6" stroke-width="4" fill="none" opacity="0.35"/>
  <path d="M80 54H248M80 72H160" stroke="#2563EB" stroke-width="1.2" opacity="0.14"/>
  ${illustBlock}
  ${content.tag ? `<rect x="80" y="58" width="${Math.max(86, tagW(content.tag, typo.tagSize) + 34)}" height="38" rx="19" fill="#DBEAFE"/>
  ${renderTextLines(content.tag, 97, 84, typo.tagSize, typo.tagSize * 1.2, 1.8, 'left', '#2563EB', '700', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 80, 172, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#0F172A', '850', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 284, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#475569', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pc-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFF7ED"/><stop offset="50%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#ECFDF5"/></linearGradient>
    <linearGradient id="pc-ribbon" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F97316"/><stop offset="100%" stop-color="#0F766E"/></linearGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#pc-bg)"/>
  <path d="M128 84C220 48 332 62 396 128" stroke="#F97316" stroke-width="2.8" fill="none" opacity="0.26"/>
  <path d="M144 404H444" stroke="#0F766E" stroke-width="4" opacity="0.28"/>
  <circle cx="620" cy="76" r="10" fill="#F97316" opacity="0.12"/>
  <circle cx="1104" cy="400" r="20" fill="#0F766E" opacity="0.1"/>
  ${illustBlock}
  ${content.tag ? renderTextLines(content.tag, 80, 88, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#C2410C', '700', typo.subtitleFontFamily) : ''}
  ${renderTextLines(content.title, 80, 172, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#1F2937', '850', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 284, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#6B7280', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tbp-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F8FAFC"/><stop offset="52%" stop-color="#F7FEE7"/><stop offset="100%" stop-color="#E0F2FE"/></linearGradient>
    <pattern id="tbp-dots" width="36" height="36" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.2" fill="#0F172A" opacity="0.12"/></pattern>
  </defs>
  <rect width="1200" height="480" fill="url(#tbp-bg)"/>
  <rect width="1200" height="480" fill="url(#tbp-dots)"/>
  <path d="M702 72L1096 128L1032 408L640 348Z" fill="#18181B" opacity="0.055"/>
  <path d="M744 116L1048 158L998 352L694 308Z" fill="none" stroke="#18181B" stroke-width="2.4" opacity="0.2"/>
  <path d="M788 164H972M768 216H1012M744 268H924" stroke="#18181B" stroke-width="2" opacity="0.23"/>
  <path d="M784 164L848 216L816 268" stroke="#65A30D" stroke-width="4" fill="none" opacity="0.58"/>
  <circle cx="784" cy="164" r="8" fill="#65A30D"/><circle cx="848" cy="216" r="8" fill="#0284C7"/><circle cx="816" cy="268" r="8" fill="#18181B"/>
  <path d="M104 76H236M104 96H184" stroke="#18181B" stroke-width="2" opacity="0.2"/>
  <path d="M140 408H448" stroke="#65A30D" stroke-width="4" opacity="0.44"/>
  <circle cx="632" cy="90" r="9" fill="#0284C7" opacity="0.12"/><circle cx="1080" cy="412" r="14" fill="#65A30D" opacity="0.12"/>
  ${content.tag ? renderTextLines(content.tag, 80, 90, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#365314', '700', typo.subtitleFontFamily) : ''}
  ${renderTextLines(content.title, 80, 172, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#18181B', '850', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 284, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#475569', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ttm-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0F172A"/><stop offset="60%" stop-color="#111827"/><stop offset="100%" stop-color="#172554"/></linearGradient>
    <pattern id="ttm-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" stroke="#93C5FD" stroke-width="0.9" fill="none" opacity="0.12"/></pattern>
  </defs>
  <rect width="1200" height="480" fill="url(#ttm-bg)"/>
  <rect width="1200" height="480" fill="url(#ttm-grid)"/>
  <rect x="692" y="96" width="352" height="236" rx="26" fill="#020617" opacity="0.52" stroke="#38BDF8" stroke-opacity="0.28" stroke-width="1.5"/>
  <circle cx="732" cy="140" r="8" fill="#38BDF8" opacity="0.76"/>
  <circle cx="764" cy="140" r="8" fill="#22C55E" opacity="0.72"/>
  <circle cx="796" cy="140" r="8" fill="#FACC15" opacity="0.66"/>
  <path d="M736 196H884M736 240H988M736 284H924" stroke="#93C5FD" stroke-width="4" opacity="0.32"/>
  <path d="M840 400C944 356 1024 380 1104 324" stroke="#38BDF8" stroke-width="2.8" fill="none" opacity="0.48"/>
  <circle cx="840" cy="400" r="8" fill="#22C55E"/><circle cx="1104" cy="324" r="8" fill="#38BDF8"/>
  <circle cx="164" cy="92" r="3" fill="#93C5FD" opacity="0.2"/><circle cx="514" cy="402" r="2" fill="#22C55E" opacity="0.2"/>
  <path d="M116 404H368" stroke="#38BDF8" stroke-width="4" opacity="0.38"/>
  <path d="M46 46L46 82M46 46L82 46" stroke="#93C5FD" stroke-width="1.2" opacity="0.22"/>
  <path d="M1148 436L1148 398M1148 436L1110 436" stroke="#38BDF8" stroke-width="1.2" opacity="0.22"/>
  ${content.tag ? renderTextLines(content.tag, 80, 90, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#93C5FD', '700', typo.subtitleFontFamily) : ''}
  ${renderTextLines(content.title, 80, 172, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#F8FAFC', '850', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 284, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#A7F3D0', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="prm-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFF7ED"/><stop offset="48%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#FEF3C7"/></linearGradient>
    <linearGradient id="prm-accent" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F97316"/><stop offset="100%" stop-color="#0F766E"/></linearGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#prm-bg)"/>
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
  ${content.tag ? renderTextLines(content.tag, 80, 90, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#C2410C', '700', typo.subtitleFontFamily) : ''}
  ${renderTextLines(content.title, 80, 172, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#1F2937', '850', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 284, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#6B7280', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pdb-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F9FAFB"/><stop offset="54%" stop-color="#F0FDFA"/><stop offset="100%" stop-color="#FDF2F8"/></linearGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#pdb-bg)"/>
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
  ${content.tag ? renderTextLines(content.tag, 80, 90, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#0F766E', '700', typo.subtitleFontFamily) : ''}
  ${renderTextLines(content.title, 80, 172, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#111827', '850', typo.titleFontFamily, typo.titleOffsetY || 0, typo.titleOffsetX || 0)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 284, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#4B5563', '400', typo.subtitleFontFamily, typo.subtitleOffsetY || 0, typo.subtitleOffsetX || 0) : ''}
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
