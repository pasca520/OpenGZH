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

function renderTextLines(text, x, y, fontSize, lineHeight, letterSpacing, textAlign, fill, fontWeight, fontFamily) {
  if (!text) return '';
  const lines = text.split('\n');
  const anchor = textAlign === 'center' ? 'middle' : textAlign === 'right' ? 'end' : 'start';
  return lines.map((line, i) => {
    const dy = i * lineHeight;
    return `<text x="${x}" y="${y + dy}" font-size="${fontSize}" font-weight="${fontWeight || 'normal'}" font-family="${fontFamily || FONT_FAMILY}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${letterSpacing || 0}">${esc(line)}</text>`;
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
  ${renderTextLines(content.title, cx, 210, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing + 2, 'center', '#F5F0E1', '400', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 330, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#D4AF37', '300', typo.subtitleFontFamily) : ''}
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
  ${renderTextLines(content.title, 110, 190, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#111827', '800', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 110, 370, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#6B7280', '400', typo.subtitleFontFamily) : ''}
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
  ${renderTextLines(content.title, cx, 220, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#3E2723', '600', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 340, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#795548', '400', typo.subtitleFontFamily) : ''}
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
  ${renderTextLines(content.title, 80, 210, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#1E1B4B', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 380, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#6D28D9', '400', typo.subtitleFontFamily) : ''}
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
    <radialGradient id="iv-o2" cx="0.85" cy="0.2"><stop offset="0%" stop-color="white" stop-opacity="0.07"/><stop offset="100%" stop-color="white" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#iv-bg)"/>
  <rect width="1200" height="480" fill="url(#iv-o1)"/><rect width="1200" height="480" fill="url(#iv-o2)"/>
  <ellipse cx="200" cy="400" rx="200" ry="180" fill="white" opacity="0.03"/>
  <ellipse cx="1000" cy="80" rx="250" ry="200" fill="white" opacity="0.04"/>
  <path d="M100 200Q150 100 250 150Q300 180 280 250Q250 300 180 280Q120 260 100 200" fill="white" opacity="0.02"/>
  <path d="M900 300Q950 220 1050 260Q1100 290 1080 360Q1050 400 980 380Q920 360 900 300" fill="white" opacity="0.025"/>
  <circle cx="150" cy="80" r="2" fill="white" opacity="0.3"/><circle cx="300" cy="50" r="1.5" fill="white" opacity="0.25"/>
  <circle cx="450" cy="70" r="2" fill="white" opacity="0.2"/><circle cx="750" cy="60" r="1.5" fill="white" opacity="0.25"/>
  <circle cx="900" cy="420" r="2" fill="white" opacity="0.2"/><circle cx="1050" cy="400" r="1.5" fill="white" opacity="0.25"/>
  <circle cx="100" cy="350" r="2" fill="white" opacity="0.15"/><circle cx="350" cy="430" r="1.5" fill="white" opacity="0.2"/>
  <circle cx="850" cy="100" r="2.5" fill="white" opacity="0.2"/>
  <circle cx="300" cy="120" r="30" fill="none" stroke="white" stroke-width="0.5" opacity="0.1"/>
  <circle cx="900" cy="360" r="40" fill="none" stroke="white" stroke-width="0.5" opacity="0.08"/>
  <path d="M0 400Q200 360 400 380Q600 400 800 370Q1000 340 1200 360" stroke="white" stroke-width="0.5" fill="none" opacity="0.08"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 20)}" y="80" width="${tagW(content.tag, typo.tagSize) + 40}" height="34" rx="17" fill="white" opacity="0.15"/>
  ${renderTextLines(content.tag, cx, 104, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#E0E7FF', '500', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, cx, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#FFFFFF', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 340, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#C7D2FE', '400', typo.subtitleFontFamily) : ''}
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
  ${renderTextLines(content.title, 80, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#E2E8F0', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 360, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#94A3B8', '400', typo.subtitleFontFamily) : ''}
</svg>`;
  }
};

// ============================================================
// 7. coral-blend
// ============================================================
const coralBlend = {
  id: 'coral-blend', name: '珊瑚渐变', category: 'gradient',
  elements: { tag: false, title: true, subtitle: true, author: true, image: false },
  render(content, typo) {
    const cx = 600;
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="cb-bg" x1="0" y1="0" x2="1" y2="0.5"><stop offset="0%" stop-color="#F472B6"/><stop offset="50%" stop-color="#A78BFA"/><stop offset="100%" stop-color="#6366F1"/></linearGradient></defs>
  <rect width="1200" height="480" fill="url(#cb-bg)"/>
  <circle cx="150" cy="80" r="200" fill="white" opacity="0.06"/>
  <circle cx="1050" cy="420" r="180" fill="white" opacity="0.05"/>
  <path d="M0 300Q200 250 400 280Q600 310 800 270Q1000 230 1200 260" stroke="white" stroke-width="1" fill="none" opacity="0.1"/>
  <path d="M0 320Q200 270 400 300Q600 330 800 290Q1000 250 1200 280" stroke="white" stroke-width="0.5" fill="none" opacity="0.08"/>
  <path d="M0 100Q300 130 600 90Q900 50 1200 80" stroke="white" stroke-width="0.8" fill="none" opacity="0.07"/>
  <circle cx="300" cy="100" r="25" fill="white" opacity="0.05"/>
  <circle cx="300" cy="100" r="15" fill="none" stroke="white" stroke-width="0.5" opacity="0.1"/>
  <circle cx="900" cy="80" r="30" fill="white" opacity="0.04"/>
  <rect x="800" y="380" width="40" height="40" rx="6" fill="none" stroke="white" stroke-width="0.8" opacity="0.1" transform="rotate(20 820 400)"/>
  <rect x="150" y="360" width="30" height="30" rx="4" fill="none" stroke="white" stroke-width="0.6" opacity="0.08" transform="rotate(-15 165 375)"/>
  <circle cx="500" cy="50" r="2" fill="white" opacity="0.3"/><circle cx="700" cy="430" r="2" fill="white" opacity="0.25"/>
  <circle cx="1100" cy="200" r="2" fill="white" opacity="0.2"/>
  <polygon points="1100,50 1120,80 1080,80" fill="white" opacity="0.05"/>
  ${renderTextLines(content.title, cx, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#FFFFFF', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 330, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', 'rgba(255,255,255,0.8)', '400', typo.subtitleFontFamily) : ''}
  ${content.author ? renderTextLines(content.author, cx, 440, typo.authorSize, typo.authorSize * 1.4, 1, 'center', 'rgba(255,255,255,0.5)', '300', typo.subtitleFontFamily) : ''}
</svg>`;
  }
};

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
  ${renderTextLines(content.title, cx, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#1E1B4B', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 360, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#4C1D95', '400', typo.subtitleFontFamily) : ''}
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
  </defs>
  <rect width="1200" height="480" fill="url(#au-bg)"/>
  <ellipse cx="300" cy="0" rx="400" ry="200" fill="white" opacity="0.04"/>
  <ellipse cx="900" cy="480" rx="500" ry="200" fill="white" opacity="0.04"/>
  <path d="M0 80Q200 40 400 70Q600 100 800 60Q1000 20 1200 50" stroke="white" stroke-width="30" fill="none" opacity="0.04"/>
  <rect x="0" y="50" width="1200" height="80" fill="url(#au-s1)"/>
  <rect x="0" y="350" width="1200" height="80" fill="url(#au-s2)"/>
  <path d="M100 0Q120 80 100 160Q80 240 100 320" stroke="#34D399" stroke-width="2" fill="none" opacity="0.1"/>
  <path d="M300 0Q320 100 300 200Q280 300 300 400" stroke="#60A5FA" stroke-width="1.5" fill="none" opacity="0.08"/>
  <path d="M900 0Q920 90 900 180Q880 270 900 360" stroke="#A78BFA" stroke-width="2" fill="none" opacity="0.08"/>
  <path d="M1100 0Q1120 70 1100 140Q1080 210 1100 280" stroke="#34D399" stroke-width="1.5" fill="none" opacity="0.06"/>
  <circle cx="200" cy="100" r="2" fill="white" opacity="0.5"/><circle cx="400" cy="50" r="1.5" fill="white" opacity="0.4"/>
  <circle cx="600" cy="80" r="2" fill="white" opacity="0.35"/><circle cx="800" cy="60" r="1.5" fill="white" opacity="0.45"/>
  <circle cx="1000" cy="90" r="2" fill="white" opacity="0.3"/>
  <circle cx="150" cy="380" r="1.5" fill="white" opacity="0.3"/><circle cx="350" cy="420" r="2" fill="white" opacity="0.25"/>
  <circle cx="700" cy="400" r="1.5" fill="white" opacity="0.3"/><circle cx="1050" cy="380" r="2" fill="white" opacity="0.25"/>
  <polygon points="250,60 253,68 262,68 255,73 257,81 250,76 243,81 245,73 238,68 247,68" fill="white" opacity="0.2"/>
  <polygon points="1050,420 1052,426 1058,426 1053,430 1055,436 1050,432 1045,436 1047,430 1042,426 1048,426" fill="white" opacity="0.15"/>
  <line x1="500" y1="150" x2="700" y2="150" stroke="white" stroke-width="1" opacity="0.3"/>
  <line x1="520" y1="156" x2="680" y2="156" stroke="white" stroke-width="0.5" opacity="0.2"/>
  ${renderTextLines(content.title, cx, 230, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#FFFFFF', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 360, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', 'rgba(255,255,255,0.75)', '400', typo.subtitleFontFamily) : ''}
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
  ${renderTextLines(content.title, cx, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#1E1B4B', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 350, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#6B7280', '400', typo.subtitleFontFamily) : ''}
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
  ${renderTextLines(content.title, cx, 220, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#111827', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 330, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#6B7280', '400', typo.subtitleFontFamily) : ''}
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
  ${renderTextLines(content.title, cx, 210, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#F1F5F9', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 360, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#94A3B8', '400', typo.subtitleFontFamily) : ''}
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
  <defs><linearGradient id="fg-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#312E81"/><stop offset="100%" stop-color="#4F46E5"/></linearGradient></defs>
  <rect width="1200" height="480" fill="url(#fg-bg)"/>
  <circle cx="250" cy="100" r="200" fill="#6366F1" opacity="0.3"/>
  <circle cx="950" cy="380" r="250" fill="#818CF8" opacity="0.2"/>
  <circle cx="600" cy="240" r="300" fill="#7C3AED" opacity="0.15"/>
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
  <circle cx="200" cy="200" r="3" fill="white" opacity="0.3"/><circle cx="450" cy="150" r="2" fill="white" opacity="0.25"/>
  <circle cx="750" cy="350" r="3" fill="white" opacity="0.2"/><circle cx="900" cy="200" r="2" fill="white" opacity="0.25"/>
  <circle cx="350" cy="300" r="2.5" fill="white" opacity="0.2"/><circle cx="1100" cy="250" r="2" fill="white" opacity="0.2"/>
  <rect x="120" y="60" width="960" height="360" rx="20" fill="white" opacity="0.12"/>
  <rect x="120" y="60" width="960" height="360" rx="20" fill="none" stroke="white" stroke-width="1" opacity="0.2"/>
  <line x1="140" y1="80" x2="1060" y2="80" stroke="white" stroke-width="0.5" opacity="0.1"/>
  <line x1="140" y1="400" x2="1060" y2="400" stroke="white" stroke-width="0.5" opacity="0.08"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="95" width="${tagW(content.tag, typo.tagSize) + 32}" height="30" rx="15" fill="white" opacity="0.15"/>
  ${renderTextLines(content.tag, cx, 117, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#C7D2FE', '500', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, cx, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#FFFFFF', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 350, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#C7D2FE', '400', typo.subtitleFontFamily) : ''}
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
  ${renderTextLines(content.title, cx, 220, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#2C1810', '600', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 330, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#6B5B4F', '400', typo.titleFontFamily) : ''}
  ${content.author ? renderTextLines(content.author, cx, 420, typo.authorSize, typo.authorSize * 1.4, 2, 'center', '#9C8B7D', '300', typo.subtitleFontFamily) : ''}
</svg>`;
  }
};

// ============================================================
// 15. magazine
// ============================================================
const magazine = {
  id: 'magazine', name: '杂志排版', category: 'editorial',
  elements: { tag: true, title: true, subtitle: true, author: true, image: false },
  render(content, typo) {
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="mag-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#111827"/><stop offset="100%" stop-color="#1F2937"/></linearGradient></defs>
  <rect width="1200" height="480" fill="#FAFAFA"/>
  <rect x="820" y="0" width="380" height="480" fill="url(#mag-d)"/>
  <circle cx="1010" cy="240" r="100" fill="#4F46E5" opacity="0.15"/>
  <circle cx="1010" cy="240" r="70" fill="none" stroke="#6366F1" stroke-width="1" opacity="0.4"/>
  <circle cx="1010" cy="240" r="40" fill="none" stroke="#818CF8" stroke-width="0.5" opacity="0.3"/>
  <circle cx="1010" cy="240" r="15" fill="#6366F1" opacity="0.2"/>
  <line x1="860" y1="120" x2="1160" y2="120" stroke="#333" stroke-width="0.5"/>
  <line x1="860" y1="360" x2="1160" y2="360" stroke="#333" stroke-width="0.5"/>
  <line x1="1010" y1="130" x2="1010" y2="350" stroke="#333" stroke-width="0.3" opacity="0.3"/>
  <rect x="870" y="135" width="40" height="4" rx="2" fill="#4F46E5" opacity="0.5"/>
  <rect x="870" y="145" width="60" height="3" rx="1" fill="#4B5563" opacity="0.4"/>
  <rect x="870" y="155" width="50" height="3" rx="1" fill="#4B5563" opacity="0.3"/>
  <rect x="870" y="340" width="55" height="3" rx="1" fill="#4B5563" opacity="0.3"/>
  <rect x="1090" y="135" width="50" height="3" rx="1" fill="#4B5563" opacity="0.3"/>
  <rect x="80" y="40" width="60" height="3" fill="#4F46E5"/>
  <rect x="150" y="40" width="30" height="3" fill="#E5E7EB"/>
  <rect x="190" y="40" width="30" height="3" fill="#E5E7EB"/>
  <line x1="80" y1="60" x2="80" y2="460" stroke="#E5E7EB" stroke-width="0.3"/>
  <line x1="780" y1="60" x2="780" y2="460" stroke="#E5E7EB" stroke-width="0.3"/>
  <line x1="80" y1="460" x2="780" y2="460" stroke="#E5E7EB" stroke-width="0.5"/>
  <rect x="80" y="465" width="100" height="3" rx="1" fill="#D1D5DB" opacity="0.5"/>
  <circle cx="750" cy="80" r="3" fill="#4F46E5" opacity="0.2"/><circle cx="730" cy="80" r="3" fill="#4F46E5" opacity="0.15"/>
  ${content.tag ? renderTextLines(content.tag, 80, 80, typo.tagSize, typo.tagSize * 1.2, 3, 'left', '#4F46E5', '700', typo.subtitleFontFamily) : ''}
  ${renderTextLines(content.title, 80, 170, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#111827', '900', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 350, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#6B7280', '400', typo.subtitleFontFamily) : ''}
  ${content.author ? renderTextLines(content.author, 80, 440, typo.authorSize, typo.authorSize * 1.4, 1, 'left', '#9CA3AF', '400', typo.subtitleFontFamily) : ''}
  <text x="1010" y="248" font-size="14" font-family="${typo.subtitleFontFamily}" fill="#6B7280" text-anchor="middle" letter-spacing="3">FEATURE</text>
</svg>`;
  }
};

// ============================================================
// 16. polaroid
// ============================================================
const polaroid = {
  id: 'polaroid', name: '拍立得框', category: 'editorial',
  elements: { tag: false, title: true, subtitle: false, author: false, image: true },
  render(content, typo) {
    const cx = 600;
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="ps"><feDropShadow dx="3" dy="5" stdDeviation="8" flood-color="#000" flood-opacity="0.1"/></filter>
    <linearGradient id="pbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F3F4F6"/><stop offset="100%" stop-color="#E5E7EB"/></linearGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#pbg)"/>
  <rect x="370" y="18" width="60" height="20" rx="1" fill="#FDE68A" opacity="0.6" transform="rotate(-5 400 28)"/>
  <rect x="770" y="18" width="60" height="20" rx="1" fill="#FDE68A" opacity="0.5" transform="rotate(5 800 28)"/>
  <circle cx="200" cy="400" r="60" fill="#E0E7FF" opacity="0.3"/>
  <circle cx="200" cy="400" r="35" fill="none" stroke="#C7D2FE" stroke-width="0.8" opacity="0.3"/>
  <circle cx="1000" cy="80" r="40" fill="#E0E7FF" opacity="0.3"/>
  <circle cx="1000" cy="80" r="22" fill="none" stroke="#C7D2FE" stroke-width="0.8" opacity="0.25"/>
  <polygon points="150,100 153,108 162,108 155,113 157,121 150,116 143,121 145,113 138,108 147,108" fill="none" stroke="#A5B4FC" stroke-width="1" opacity="0.3"/>
  <polygon points="1050,380 1052,386 1058,386 1053,390 1055,396 1050,392 1045,396 1047,390 1042,386 1048,386" fill="none" stroke="#A5B4FC" stroke-width="1" opacity="0.25"/>
  <path d="M280 100Q280 90 288 90Q296 90 296 100Q296 110 288 118Q280 110 280 100" fill="none" stroke="#F9A8D4" stroke-width="1" opacity="0.3"/>
  <path d="M900 420L940 420L935 415M940 420L935 425" stroke="#94A3B8" stroke-width="1" fill="none" opacity="0.25" stroke-linecap="round"/>
  <circle cx="100" cy="200" r="2" fill="#C7D2FE" opacity="0.3"/><circle cx="120" cy="200" r="2" fill="#C7D2FE" opacity="0.25"/>
  <circle cx="100" cy="220" r="2" fill="#C7D2FE" opacity="0.25"/><circle cx="120" cy="220" r="2" fill="#C7D2FE" opacity="0.2"/>
  <circle cx="1080" cy="250" r="2" fill="#C7D2FE" opacity="0.3"/><circle cx="1100" cy="250" r="2" fill="#C7D2FE" opacity="0.25"/>
  <rect x="350" y="30" width="500" height="360" rx="4" fill="white" filter="url(#ps)"/>
  <rect x="375" y="50" width="450" height="270" rx="2" fill="#E5E7EB"/>
  ${content.image ? `<image x="375" y="50" width="450" height="270" preserveAspectRatio="xMidYMid slice" href="${esc(content.image)}"/>` : ''}
  <rect x="375" y="50" width="450" height="270" rx="2" fill="none" stroke="#D1D5DB" stroke-width="0.5"/>
  ${renderTextLines(content.title, cx, 370, Math.min(typo.titleSize, 24), typo.titleLineHeight, 0, 'center', '#374151', '400', typo.titleFontFamily)}
  <rect x="550" y="395" width="100" height="3" rx="1" fill="#D1D5DB" opacity="0.5"/>
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
  ${renderTextLines(content.title, cx, 210, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#111827', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 350, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#6B7280', '400', typo.subtitleFontFamily) : ''}
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
  </defs>
  <rect width="1200" height="480" fill="#FAFAFA"/>
  <rect x="0" y="0" width="420" height="480" fill="url(#ss-l)"/>
  <circle cx="210" cy="240" r="120" fill="white" opacity="0.05"/>
  <circle cx="210" cy="240" r="80" fill="none" stroke="white" stroke-width="1" opacity="0.1"/>
  <circle cx="210" cy="240" r="40" fill="none" stroke="white" stroke-width="0.5" opacity="0.15"/>
  <circle cx="210" cy="240" r="10" fill="white" opacity="0.08"/>
  <path d="M20 20L20 50" stroke="white" stroke-width="0.5" opacity="0.2"/>
  <path d="M20 20L50 20" stroke="white" stroke-width="0.5" opacity="0.2"/>
  <path d="M400 430L400 460" stroke="white" stroke-width="0.5" opacity="0.2"/>
  <path d="M370 460L400 460" stroke="white" stroke-width="0.5" opacity="0.2"/>
  <circle cx="80" cy="100" r="2" fill="white" opacity="0.2"/><circle cx="340" cy="80" r="1.5" fill="white" opacity="0.15"/>
  <circle cx="100" cy="380" r="2" fill="white" opacity="0.15"/><circle cx="320" cy="400" r="1.5" fill="white" opacity="0.12"/>
  <rect x="420" y="0" width="3" height="480" fill="url(#ss-d)" opacity="0.5"/>
  <circle cx="1100" cy="60" r="50" fill="#EEF2FF" opacity="0.6"/>
  <circle cx="1100" cy="60" r="30" fill="none" stroke="#C7D2FE" stroke-width="0.5" opacity="0.4"/>
  <rect x="1050" y="400" width="40" height="40" fill="none" stroke="#E0E7FF" stroke-width="0.8" opacity="0.4" transform="rotate(15 1070 420)"/>
  <circle cx="1100" cy="200" r="2" fill="#D1D5DB" opacity="0.3"/><circle cx="1120" cy="200" r="2" fill="#D1D5DB" opacity="0.25"/>
  <circle cx="1140" cy="200" r="2" fill="#D1D5DB" opacity="0.2"/><circle cx="1100" cy="220" r="2" fill="#D1D5DB" opacity="0.25"/>
  <circle cx="1120" cy="220" r="2" fill="#D1D5DB" opacity="0.2"/><circle cx="1140" cy="220" r="2" fill="#D1D5DB" opacity="0.15"/>
  <line x1="480" y1="440" x2="700" y2="440" stroke="#E5E7EB" stroke-width="0.5"/>
  ${content.tag ? renderTextLines(content.tag, 210, 180, typo.tagSize, typo.tagSize * 1.2, 2, 'center', '#A5B4FC', '500', typo.subtitleFontFamily) : ''}
  <line x1="150" y1="210" x2="270" y2="210" stroke="white" stroke-width="0.5" opacity="0.3"/>
  ${content.author ? renderTextLines(content.author, 210, 380, typo.authorSize, typo.authorSize * 1.4, 1.5, 'center', 'rgba(255,255,255,0.4)', '300', typo.subtitleFontFamily) : ''}
  ${renderTextLines(content.title, 480, 190, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#111827', '800', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 480, 350, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#6B7280', '400', typo.subtitleFontFamily) : ''}
</svg>`;
  }
};

// ============================================================
// 19. tech-wave / 科技浪潮 (NEW)
// ============================================================
const techWave = {
  id: 'tech-wave', name: '科技浪潮', category: 'gradient',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    const cx = 600;
    const tagPillW = content.tag ? tagW(content.tag, typo.tagSize) + 48 : 0;
    const subW = content.subtitle ? Math.min(content.subtitle.length * typo.subtitleSize * 0.7 + 48, 500) : 0;
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tw-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0891B2"/><stop offset="40%" stop-color="#2563EB"/><stop offset="100%" stop-color="#1E3A8A"/></linearGradient>
    <linearGradient id="tw-w1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="white" stop-opacity="0"/><stop offset="30%" stop-color="white" stop-opacity="0.08"/><stop offset="70%" stop-color="#93C5FD" stop-opacity="0.06"/><stop offset="100%" stop-color="white" stop-opacity="0"/></linearGradient>
    <linearGradient id="tw-w2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#67E8F9" stop-opacity="0"/><stop offset="50%" stop-color="#67E8F9" stop-opacity="0.1"/><stop offset="100%" stop-color="#67E8F9" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#tw-bg)"/>
  <image href="assets/images/cover-illustrations/tech-wave-bg.svg" x="0" y="0" width="1200" height="480" opacity="0.5"/>
  <path d="M0 350Q150 310 300 340Q450 370 600 330Q750 290 900 320Q1050 350 1200 310" stroke="white" stroke-width="2" fill="none" opacity="0.08"/>
  <path d="M0 370Q150 330 300 360Q450 390 600 350Q750 310 900 340Q1050 370 1200 330" stroke="#67E8F9" stroke-width="1.5" fill="none" opacity="0.1"/>
  <path d="M0 120Q200 90 400 110Q600 130 800 100Q1000 70 1200 90" stroke="white" stroke-width="1.5" fill="none" opacity="0.06"/>
  <path d="M0 100Q200 70 400 90Q600 110 800 80Q1000 50 1200 70" stroke="#67E8F9" stroke-width="1" fill="none" opacity="0.08"/>
  <rect x="0" y="140" width="1200" height="40" fill="url(#tw-w1)"/>
  <rect x="0" y="300" width="1200" height="50" fill="url(#tw-w2)"/>
  <circle cx="200" cy="100" r="3" fill="white" opacity="0.3"/><circle cx="500" cy="80" r="2" fill="#67E8F9" opacity="0.4"/>
  <circle cx="800" cy="60" r="2.5" fill="white" opacity="0.25"/><circle cx="350" cy="400" r="2" fill="#93C5FD" opacity="0.3"/>
  <circle cx="700" cy="420" r="2.5" fill="white" opacity="0.2"/><circle cx="1000" cy="380" r="2" fill="#67E8F9" opacity="0.25"/>
  ${content.tag ? `<line x1="${cx - 180}" y1="120" x2="${cx - 60}" y2="120" stroke="white" stroke-width="0.8" opacity="0.3"/>
  <rect x="${cx - tagPillW / 2}" y="104" width="${tagPillW}" height="32" rx="16" fill="white" opacity="0.12"/>
  ${renderTextLines(content.tag, cx, 126, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#E0F2FE', '500', typo.subtitleFontFamily)}
  <line x1="${cx + 60}" y1="120" x2="${cx + 180}" y2="120" stroke="white" stroke-width="0.8" opacity="0.3"/>` : ''}
  ${renderTextLines(content.title, cx, 220, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#FFFFFF', '700', typo.titleFontFamily)}
  ${content.subtitle ? `<rect x="${cx - subW / 2}" y="350" width="${subW}" height="38" rx="19" fill="white" opacity="0.12"/>
  <rect x="${cx - subW / 2}" y="350" width="${subW}" height="38" rx="19" fill="none" stroke="white" stroke-width="0.5" opacity="0.2"/>
  ${renderTextLines(content.subtitle, cx, 376, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#BAE6FD', '400', typo.subtitleFontFamily)}` : ''}
</svg>`;
  }
};

// ============================================================
// 20. digital-scene / 数字场景 (NEW)
// ============================================================
const digitalScene = {
  id: 'digital-scene', name: '数字场景', category: 'solid-dark',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="ds-gl" cx="0.75" cy="0.5"><stop offset="0%" stop-color="#1E40AF" stop-opacity="0.3"/><stop offset="100%" stop-color="#0A192F" stop-opacity="0"/></radialGradient>
    <linearGradient id="ds-ln" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#60A5FA" stop-opacity="0"/><stop offset="50%" stop-color="#60A5FA" stop-opacity="0.6"/><stop offset="100%" stop-color="#60A5FA" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1200" height="480" fill="#0A192F"/>
  <rect width="1200" height="480" fill="url(#ds-gl)"/>
  <image href="assets/images/cover-illustrations/isometric-devices.svg" x="620" y="30" width="560" height="420" opacity="0.85"/>
  <line x1="500" y1="200" x2="650" y2="180" stroke="url(#ds-ln)" stroke-width="1"/>
  <line x1="500" y1="280" x2="650" y2="300" stroke="url(#ds-ln)" stroke-width="0.8"/>
  <g opacity="0.06">
    <line x1="80" y1="0" x2="80" y2="480" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="160" y1="0" x2="160" y2="480" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="240" y1="0" x2="240" y2="480" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="320" y1="0" x2="320" y2="480" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="400" y1="0" x2="400" y2="480" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="0" y1="80" x2="560" y2="80" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="0" y1="160" x2="560" y2="160" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="0" y1="240" x2="560" y2="240" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="0" y1="320" x2="560" y2="320" stroke="#60A5FA" stroke-width="0.5"/>
    <line x1="0" y1="400" x2="560" y2="400" stroke="#60A5FA" stroke-width="0.5"/>
  </g>
  <circle cx="160" cy="160" r="3" fill="#60A5FA" opacity="0.15"/>
  <circle cx="320" cy="240" r="3" fill="#60A5FA" opacity="0.12"/>
  <circle cx="480" cy="160" r="3" fill="#60A5FA" opacity="0.1"/>
  <circle cx="240" cy="320" r="3" fill="#60A5FA" opacity="0.12"/>
  <circle cx="500" cy="200" r="5" fill="#60A5FA" opacity="0.4"/>
  <circle cx="500" cy="200" r="3" fill="#93C5FD" opacity="0.7"/>
  <circle cx="500" cy="280" r="5" fill="#38BDF8" opacity="0.35"/>
  <circle cx="500" cy="280" r="3" fill="#7DD3FC" opacity="0.6"/>
  <circle cx="150" cy="80" r="1.5" fill="#60A5FA" opacity="0.3"/>
  <circle cx="350" cy="430" r="2" fill="#38BDF8" opacity="0.25"/>
  ${content.tag ? `<rect x="80" y="90" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 24)}" height="32" rx="4" fill="#60A5FA" opacity="0.15"/>
  <rect x="80" y="90" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 24)}" height="32" rx="4" fill="none" stroke="#60A5FA" stroke-width="0.5" opacity="0.3"/>
  ${renderTextLines(content.tag, 92, 113, typo.tagSize, typo.tagSize * 1.2, 1, 'left', '#93C5FD', '500', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 80, 190, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#E2E8F0', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 370, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#64748B', '400', typo.subtitleFontFamily) : ''}
</svg>`;
  }
};

// ============================================================
// 21. b-end-guide / B端指南 (NEW)
// ============================================================
const bEndGuide = {
  id: 'b-end-guide', name: 'B端指南', category: 'editorial',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false },
  render(content, typo) {
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="beg-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#1E3A8A"/><stop offset="100%" stop-color="#1E40AF"/></linearGradient>
    <linearGradient id="beg-ac" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3B82F6"/><stop offset="100%" stop-color="#2563EB"/></linearGradient>
  </defs>
  <rect width="1200" height="480" fill="url(#beg-bg)"/>
  <g opacity="0.04"><circle cx="100" cy="100" r="80" fill="white"/><circle cx="300" cy="400" r="60" fill="white"/><circle cx="500" cy="60" r="40" fill="white"/></g>
  <rect x="80" y="80" width="80" height="36" rx="6" fill="url(#beg-ac)"/>
  <text x="120" y="104" font-size="16" font-weight="700" font-family="${typo.subtitleFontFamily}" fill="white" text-anchor="middle" letter-spacing="2">B端</text>
  <line x1="80" y1="130" x2="200" y2="130" stroke="#60A5FA" stroke-width="2" opacity="0.5"/>
  <line x1="80" y1="136" x2="160" y2="136" stroke="#60A5FA" stroke-width="1" opacity="0.3"/>
  ${renderTextLines(content.title, 80, 190, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '700', typo.titleFontFamily)}
  ${content.tag ? renderTextLines(content.tag, 80, 340, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#93C5FD', '500', typo.subtitleFontFamily) : ''}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 380, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#60A5FA', '400', typo.subtitleFontFamily) : ''}
  <line x1="80" y1="430" x2="500" y2="430" stroke="#3B82F6" stroke-width="1" opacity="0.3"/>
  <rect x="80" y="440" width="40" height="3" rx="1" fill="#60A5FA" opacity="0.4"/>
  <rect x="130" y="440" width="30" height="3" rx="1" fill="#60A5FA" opacity="0.3"/>
  <image href="assets/images/cover-illustrations/person-presenting.svg" x="620" y="30" width="560" height="430" opacity="0.9"/>
  <circle cx="600" cy="240" r="4" fill="#3B82F6" opacity="0.4"/>
  <circle cx="600" cy="240" r="2" fill="#93C5FD" opacity="0.7"/>
  <rect x="580" y="120" width="20" height="20" rx="3" fill="none" stroke="#60A5FA" stroke-width="0.8" opacity="0.2" transform="rotate(15 590 130)"/>
  <polygon points="590,360 600,345 610,360" fill="none" stroke="#60A5FA" stroke-width="0.8" opacity="0.15"/>
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
  ${renderTextLines(content.title, 80, 180, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '800', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 350, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#FED7AA', '400', typo.subtitleFontFamily) : ''}
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
  ${renderTextLines(content.title, 80, 170, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#134E4A', '900', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 340, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#0F766E', '400', typo.subtitleFontFamily) : ''}
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
  <rect width="1200" height="480" fill="#F8FAFC"/>
  <rect x="0" y="0" width="600" height="480" fill="white" opacity="0.5"/>
  <line x1="600" y1="40" x2="600" y2="440" stroke="#E2E8F0" stroke-width="0.5" opacity="0.5"/>
  <rect x="80" y="100" width="6" height="50" rx="3" fill="#4F46E5"/>
  ${content.tag ? `<rect x="80" y="100" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="30" rx="15" fill="#EEF2FF"/>
  ${renderTextLines(content.tag, 94, 121, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#4F46E5', '600', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 80, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#0F172A', '800', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 370, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#64748B', '400', typo.subtitleFontFamily) : ''}
  <line x1="80" y1="420" x2="300" y2="420" stroke="#E2E8F0" stroke-width="0.5"/>
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
  ${renderTextLines(content.title, 1140, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'right', '#F1F5F9', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 1140, 360, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'right', '#94A3B8', '400', typo.subtitleFontFamily) : ''}
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
  ${renderTextLines(content.title, cx, 330, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#3E2723', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 430, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#795548', '400', typo.subtitleFontFamily) : ''}
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
  ${renderTextLines(content.title, 660, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 660, 370, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#C4B5FD', '400', typo.subtitleFontFamily) : ''}
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
  </defs>
  <rect width="1200" height="480" fill="url(#ih-bg)"/>
  <circle cx="200" cy="80" r="120" fill="white" opacity="0.04"/>
  <circle cx="100" cy="350" r="80" fill="white" opacity="0.03"/>
  ${illustBlock}
  ${content.tag ? `<rect x="80" y="80" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="32" rx="6" fill="#134E4A" opacity="0.5"/>
  ${renderTextLines(content.tag, 94, 103, typo.tagSize, typo.tagSize * 1.2, 1, 'left', '#99F6E4', '600', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 80, 190, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '800', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 350, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#A7F3D0', '400', typo.subtitleFontFamily) : ''}
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
    <pattern id="ic-dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="1" fill="#E2E8F0" opacity="0.5"/></pattern>
  </defs>
  <rect width="1200" height="480" fill="#F8FAFC"/>
  <rect width="1200" height="480" fill="url(#ic-dots)"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="18" width="${tagW(content.tag, typo.tagSize) + 32}" height="32" rx="16" fill="#EEF2FF"/>
  ${renderTextLines(content.tag, cx, 40, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', '#4F46E5', '600', typo.subtitleFontFamily)}` : ''}
  <rect x="240" y="55" width="720" height="370" rx="20" fill="white" filter="url(#ic-shadow)"/>
  <rect x="240" y="55" width="720" height="370" rx="20" fill="none" stroke="#E2E8F0" stroke-width="1"/>
  <line x1="270" y1="290" x2="930" y2="290" stroke="#F1F5F9" stroke-width="1"/>
  ${illustInner}
  ${renderTextLines(content.title, cx, 330, Math.min(typo.titleSize, 36), typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#0F172A', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 395, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#64748B', '400', typo.subtitleFontFamily) : ''}
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
  ${renderTextLines(content.title, 110, 220, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#0C4A6E', '800', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 110, 380, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#64748B', '400', typo.subtitleFontFamily) : ''}
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
  </defs>
  <rect width="1200" height="480" fill="url(#idg-bg)"/>
  <circle cx="200" cy="100" r="2" fill="#A855F7" opacity="0.3"/><circle cx="400" cy="60" r="1.5" fill="#C084FC" opacity="0.25"/>
  <circle cx="100" cy="380" r="2" fill="#7C3AED" opacity="0.2"/><circle cx="500" cy="430" r="1.5" fill="#A855F7" opacity="0.2"/>
  ${illustBlock}
  ${content.tag ? `<rect x="80" y="100" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="30" rx="15" fill="#A855F7" opacity="0.2"/>
  <rect x="80" y="100" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="30" rx="15" fill="none" stroke="#A855F7" stroke-width="0.5" opacity="0.4"/>
  ${renderTextLines(content.tag, 94, 121, typo.tagSize, typo.tagSize * 1.2, 1, 'left', '#D8B4FE', '600', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 80, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 370, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#C084FC', '400', typo.subtitleFontFamily) : ''}
  <line x1="80" y1="420" x2="350" y2="420" stroke="#A855F7" stroke-width="1" opacity="0.3"/>
</svg>`;
  }
};

// ============================================================
// 32. illust-magazine / 杂志插画
// ============================================================
const illustMagazine = {
  id: 'illust-magazine', name: '杂志插画', category: 'illustration',
  illustFit: 'side',
  elements: { tag: true, title: true, subtitle: true, author: true, image: false, illustration: true },
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
  <text x="80" y="80" font-size="72" font-family="${SERIF_FAMILY}" fill="#E5E7EB" font-weight="700" letter-spacing="-2">No.01</text>
  <line x1="80" y1="100" x2="580" y2="100" stroke="#111827" stroke-width="2"/>
  <line x1="80" y1="106" x2="400" y2="106" stroke="#D1D5DB" stroke-width="0.5"/>
  ${content.tag ? renderTextLines(content.tag, 80, 140, typo.tagSize, typo.tagSize * 1.2, 3, 'left', '#6B7280', '500', typo.subtitleFontFamily) : ''}
  ${renderTextLines(content.title, 80, 200, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#111827', '700', SERIF_FAMILY)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 360, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', '#6B7280', '400', typo.subtitleFontFamily) : ''}
  <line x1="80" y1="400" x2="580" y2="400" stroke="#E5E7EB" stroke-width="1"/>
  ${content.author ? renderTextLines(content.author, 80, 440, typo.authorSize, typo.authorSize * 1.4, 1, 'left', '#9CA3AF', '400', typo.subtitleFontFamily) : ''}
  <line x1="620" y1="40" x2="620" y2="440" stroke="#E5E7EB" stroke-width="1"/>
  ${illustBlock}
</svg>`;
  }
};

// ============================================================
// 33. illust-minimal / 极简插画
// ============================================================
const illustMinimal = {
  id: 'illust-minimal', name: '极简插画', category: 'illustration',
  illustFit: 'small',
  elements: { tag: false, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    const cx = 600;
    const illustBlock = content.illustrationSvg
      ? illustrationLayer(embedIllustration(content.illustrationSvg, 960, 30, 200, 160, illustrationOpacity(content, 0.85)))
      : `<circle cx="1060" cy="100" r="40" fill="none" stroke="#E5E7EB" stroke-width="1"/>
        <circle cx="1060" cy="100" r="20" fill="none" stroke="#D1D5DB" stroke-width="0.5"/>
        <circle cx="1060" cy="100" r="4" fill="#D1D5DB" opacity="0.4"/>`;
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="480" fill="#FFFFFF"/>
  ${illustBlock}
  ${renderTextLines(content.title, cx, 210, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#111827', '300', typo.titleFontFamily)}
  <line x1="${cx - 40}" y1="290" x2="${cx + 40}" y2="290" stroke="#D1D5DB" stroke-width="1"/>
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 330, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', '#9CA3AF', '300', typo.subtitleFontFamily) : ''}
</svg>`;
  }
};

// ============================================================
// 34. illust-fullbleed / 满版插画
// ============================================================
const illustFullbleed = {
  id: 'illust-fullbleed', name: '满版插画', category: 'illustration',
  illustFit: 'hero',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    const cx = 600;
    const illustBg = content.illustrationSvg
      ? illustrationLayer(embedIllustration(content.illustrationSvg, 0, 0, 1200, 480, illustrationOpacity(content, 0.25)))
      : `<g opacity="0.06">
          <circle cx="300" cy="150" r="200" fill="white"/>
          <circle cx="900" cy="350" r="180" fill="white"/>
          <rect x="500" y="100" width="200" height="200" rx="24" fill="white"/>
        </g>`;
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ifb-ov" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0F172A" stop-opacity="0.7"/><stop offset="50%" stop-color="#0F172A" stop-opacity="0.85"/><stop offset="100%" stop-color="#0F172A" stop-opacity="0.9"/></linearGradient>
  </defs>
  <rect width="1200" height="480" fill="#0F172A"/>
  ${illustBg}
  <rect width="1200" height="480" fill="url(#ifb-ov)"/>
  ${content.tag ? `<rect x="${cx - (tagW(content.tag, typo.tagSize) / 2 + 16)}" y="120" width="${tagW(content.tag, typo.tagSize) + 32}" height="30" rx="15" fill="white" opacity="0.12"/>
  ${renderTextLines(content.tag, cx, 142, typo.tagSize, typo.tagSize * 1.2, 1.5, 'center', 'rgba(255,255,255,0.7)', '500', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, cx, 230, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'center', '#FFFFFF', '700', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, cx, 370, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'center', 'rgba(255,255,255,0.6)', '400', typo.subtitleFontFamily) : ''}
</svg>`;
  }
};

// ============================================================
// 35. illust-duo / 双色插画
// ============================================================
const illustDuo = {
  id: 'illust-duo', name: '双色插画', category: 'illustration',
  illustFit: 'square',
  elements: { tag: true, title: true, subtitle: true, author: false, image: false, illustration: true },
  render(content, typo) {
    const illustBlock = content.illustrationSvg
      ? illustrationLayer(embedIllustration(content.illustrationSvg, 400, 40, 400, 400, illustrationOpacity(content, 0.95)))
      : `<g opacity="0.12">
          <circle cx="600" cy="240" r="120" fill="#111827"/>
          <rect x="520" y="180" width="160" height="120" rx="16" fill="#111827"/>
        </g>
        <circle cx="600" cy="240" r="80" fill="none" stroke="#111827" stroke-width="1" opacity="0.1"/>
        <circle cx="600" cy="240" r="40" fill="none" stroke="#111827" stroke-width="0.5" opacity="0.08"/>`;
    return `<svg viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="480" fill="#FFFFFF"/>
  <rect x="0" y="0" width="600" height="480" fill="#F472B6"/>
  <circle cx="100" cy="80" r="2" fill="white" opacity="0.3"/><circle cx="300" cy="50" r="1.5" fill="white" opacity="0.2"/>
  <circle cx="200" cy="400" r="2" fill="white" opacity="0.2"/>
  ${content.tag ? `<rect x="80" y="120" width="${Math.max(60, tagW(content.tag, typo.tagSize) + 28)}" height="30" rx="15" fill="white" opacity="0.2"/>
  ${renderTextLines(content.tag, 94, 141, typo.tagSize, typo.tagSize * 1.2, 1.5, 'left', '#FFFFFF', '600', typo.subtitleFontFamily)}` : ''}
  ${renderTextLines(content.title, 80, 210, typo.titleSize, typo.titleLineHeight, typo.titleLetterSpacing, 'left', '#FFFFFF', '800', typo.titleFontFamily)}
  ${content.subtitle ? renderTextLines(content.subtitle, 80, 380, typo.subtitleSize, typo.subtitleLineHeight, typo.subtitleLetterSpacing, 'left', 'rgba(255,255,255,0.8)', '400', typo.subtitleFontFamily) : ''}
  <line x1="80" y1="420" x2="300" y2="420" stroke="white" stroke-width="0.5" opacity="0.3"/>
  ${illustBlock}
  <circle cx="900" cy="100" r="40" fill="none" stroke="#F9A8D4" stroke-width="0.8" opacity="0.3"/>
  <circle cx="1050" cy="380" r="30" fill="none" stroke="#FBCFE8" stroke-width="0.5" opacity="0.25"/>
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
  'digital-scene':      { scenario: '技术分享、产品介绍',     styleTags: ['深色', '科技', '专业'] },
  'pure-white':         { scenario: '简洁公告、品牌声明',     styleTags: ['极简', '留白', '纯净'] },
  'warm-cream':         { scenario: '生活方式、读书笔记',     styleTags: ['暖色', '柔和', '文艺'] },
  'lavender-light':     { scenario: '心理情感、女性话题',     styleTags: ['淡紫', '轻盈', '温柔'] },
  'indigo-violet':      { scenario: '科技前沿、AI 话题',      styleTags: ['渐变', '深色', '未来感'] },
  'dark-fade':          { scenario: '深度分析、行业报告',     styleTags: ['深色', '渐变', '沉稳'] },
  'coral-blend':        { scenario: '活动推广、营销传播',     styleTags: ['渐变', '活力', '温暖'] },
  'dawn-light':         { scenario: '早报资讯、晨间阅读',     styleTags: ['渐变', '清新', '柔和'] },
  'aurora':             { scenario: '创意设计、视觉展示',     styleTags: ['渐变', '炫彩', '梦幻'] },
  'tech-wave':          { scenario: '互联网技术、开发者社区',  styleTags: ['渐变', '波浪', '科技感'] },
  'warm-showcase':      { scenario: '产品展示、功能介绍',     styleTags: ['暖色', '渐变', '活力'] },
  'playful-mascot':     { scenario: '品牌故事、趣味科普',     styleTags: ['插画', '活泼', '趣味'] },
  'dot-matrix':         { scenario: '数据报告、逻辑分析',     styleTags: ['几何', '秩序', '理性'] },
  'geo-overlap':        { scenario: '设计趋势、艺术评论',     styleTags: ['几何', '色块', '现代'] },
  'triangle-comp':      { scenario: '建筑美学、结构思维',     styleTags: ['几何', '构成', '锐利'] },
  'frosted-glass':      { scenario: '产品 UI、界面设计',      styleTags: ['毛玻璃', '透明', '现代'] },
  'paper-texture':      { scenario: '学术论文、深度长文',     styleTags: ['纸质', '质感', '经典'] },
  'magazine':           { scenario: '人物专访、品牌故事',     styleTags: ['杂志', '排版', '高级'] },
  'polaroid':           { scenario: '旅行游记、摄影分享',     styleTags: ['拍立得', '复古', '文艺'] },
  'frame-border':       { scenario: '艺术展览、画作赏析',     styleTags: ['画框', '留白', '典雅'] },
  'split-screen':       { scenario: '对比分析、双主题展示',   styleTags: ['分割', '对比', '构图'] },
  'b-end-guide':        { scenario: 'B端产品、SaaS 推广',    styleTags: ['专业', '结构化', '清晰'] },
  'illust-right':       { scenario: '技术教程、工具介绍',     styleTags: ['图文', '右侧', '清爽'] },
  'illust-left':        { scenario: '观点输出、思想分享',     styleTags: ['图文', '左侧', '阅读'] },
  'illust-center-top':  { scenario: '活动海报、线上直播',     styleTags: ['图文', '居上', '聚焦'] },
  'illust-split':       { scenario: '产品介绍、功能对比',     styleTags: ['图文', '分割', '均衡'] },
  'illust-hero':        { scenario: '重磅发布、大事件',       styleTags: ['图文', '英雄', '震撼'] },
  'illust-card':        { scenario: '课程推广、知识分享',       styleTags: ['图文', '卡片', '精致'] },
  'illust-wave':        { scenario: '品牌宣传、创意展示',     styleTags: ['图文', '波浪', '动感'] },
  'illust-dark-glow':   { scenario: '暗夜主题、游戏电竞',     styleTags: ['图文', '发光', '炫酷'] },
  'illust-magazine':    { scenario: '人物故事、专题报道',     styleTags: ['图文', '杂志', '叙事'] },
  'illust-minimal':     { scenario: '极简风格、品牌声明',     styleTags: ['图文', '极简', '克制'] },
  'illust-fullbleed':   { scenario: '视觉大片、活动主视觉',   styleTags: ['图文', '满版', '沉浸'] },
  'illust-duo':         { scenario: '双栏资讯、栏目分类',     styleTags: ['图文', '双色', '活泼'] }
};

export const COVER_TEMPLATES = [
  // Solid Dark (2)
  blackGold,
  digitalScene,
  // Solid Light (3)
  pureWhite,
  warmCream,
  lavenderLight,
  // Gradient (8)
  indigoViolet,
  darkFade,
  coralBlend,
  dawnLight,
  aurora,
  techWave,
  warmShowcase,
  playfulMascot,
  // Geometric (3)
  dotMatrix,
  geoOverlap,
  triangleComp,
  // Glass & Texture (2)
  frostedGlass,
  paperTexture,
  // Editorial & Layout (5)
  magazine,
  polaroid,
  frameBorder,
  splitScreen,
  bEndGuide,
  // Illustration (12)
  illustRight,
  illustLeft,
  illustCenterTop,
  illustSplit,
  illustHero,
  illustCard,
  illustWave,
  illustDarkGlow,
  illustMagazine,
  illustMinimal,
  illustFullbleed,
  illustDuo,
];
