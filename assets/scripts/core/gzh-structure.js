/**
 * 公众号结构化排版 —— 自动编号标题 / ==高亮== / 文末 END 分隔线。
 *
 * 仅对带 `gzh` 配置的主题生效（render-pipeline 中以 `styleConfig.gzh` 为开关），
 * 不影响现有 28 套纯样式主题。视觉 token 逐字取自 kongge.space 的 THEMES 表。
 *
 * 拆为纯字符串 builder（node 可测）+ 薄 DOM 胶水（手动验证）。
 * @module gzh-structure
 */

/* ================= 纯函数 builder ================= */

export function pad2(n) {
  return String(n).padStart(2, '0');
}

/** 章节主题色：有 palette 则轮转（虹彩），否则固定 accent。 */
export function accentOf(gzh, num) {
  return gzh.palette ? gzh.palette[(num - 1) % gzh.palette.length] : gzh.accent;
}

/**
 * 把颜色加深（保持色相）。
 * 面向微信深色模式：微信对文章整体反色，中亮度饱和色反色后仍为中亮度，
 * 深色底上看不清；接近黑白的颜色反色后变得可读。编号文字/徽标统一用加深色，
 * 浅色模式下是深彩字，深色模式下反色成浅彩字，明暗两态对比度都足够。
 */
export function darken(hex, factor = 0.6) {
  const m = String(hex).trim().replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return hex;
  const r = Math.round(parseInt(full.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(full.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(full.slice(4, 6), 16) * factor);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * h2 编号 wrapper。返回的 HTML 中留有 data-gzh-slot 插槽，
 * h2 自身由调用方移动进来（保留主题 h2 样式与 TOC id）。
 *
 * 三种小编号各有独立构图轴，禁止收敛为同一版式：
 * badge = 居中圆章（圆 + 居中标题）；chip = 浅底色带页眉（soft 底色整行）；
 * plain = 大编号上置堆叠 + 短横线。watermark 独立保留 44px 浅色水印大数字。
 */
export function buildH2WrapperHTML(num, gzh) {
  const ac = accentOf(gzh, num);
  const label = pad2(num);
  // 深色底主题（有 gzh.bg，如夜航）微信不反色，保持原设计用色；
  // 浅色底主题会被微信整体反色，编号用色需加深，反色后变浅、明暗两态才都可读。
  const dk = gzh.bg ? ac : darken(ac);
  const watermarkColor = gzh.bg ? gzh.line : 'rgba(0,0,0,0.07)';

  if (gzh.numStyle === 'watermark') {
    // 浅色主题：水印数字用黑色低透明度，反色后成淡白水印，始终隐约可辨
    return `<section style="margin:52px 10px 28px;"><section style="padding-bottom:18px;border-bottom:1px solid ${gzh.line};"><p style="font-size:44px;font-weight:900;color:${watermarkColor};margin:0;line-height:1;letter-spacing:-2px;">${label}</p><span data-gzh-slot></span></section></section>`;
  }
  if (gzh.numStyle === 'badge') {
    // 居中圆章：主题色底 + 白字编号（浅色主题用加深色，反色后变浅色底 + 深字）
    return `<section style="margin:52px 10px 28px;text-align:center;"><p style="margin:0 0 12px;"><span style="display:inline-block;width:46px;height:46px;border-radius:50%;background:${dk};color:#ffffff;font-size:17px;font-weight:800;line-height:46px;text-align:center;">${label}</span></p><span data-gzh-slot></span></section>`;
  }
  if (gzh.numStyle === 'chip') {
    // 浅底色带页眉：soft 底色整行圆角带，22px 编号与标题同行
    return `<section style="margin:48px 10px 24px;background:${gzh.soft};border-radius:10px;padding:12px 16px;display:flex;align-items:center;"><p style="margin:0 12px 0 0;font-size:22px;font-weight:900;color:${dk};line-height:1;letter-spacing:-0.5px;">${label}</p><span data-gzh-slot></span></section>`;
  }
  // plain：26px 大编号上置堆叠 + 标题 + 44px 短横线
  return `<section style="margin:52px 10px 26px;"><p style="margin:0 0 8px;font-size:26px;font-weight:900;color:${dk};line-height:1;letter-spacing:-0.5px;">${label}</p><span data-gzh-slot></span><section style="width:44px;height:3px;background:${dk};margin-top:12px;"></section></section>`;
}

/** ==高亮== chip。 */
export function buildMarkHTML(text, gzh) {
  return `<mark style="background:${gzh.tagBg};color:${gzh.title};padding:2px 7px;border-radius:3px;font-weight:700;font-size:14px;">${esc(text)}</mark>`;
}

/** 文末分隔线。根据 endStyle 切换样式，默认 classic。每种样式自带 <style> 动效。 */
export function buildEndHTML(gzh) {
  const endStyle = gzh.endStyle || 'classic';
  const line = gzh.line;
  const muted = gzh.muted;
  const accent = gzh.accent || muted;
  const readableMuted = gzh.bg ? muted : darken(muted);

  switch (endStyle) {
    case 'aurora':
      // 极光：流光渐变带循环流动
      return `<section data-gzh-end style="margin:48px 10px 24px;"><style>@keyframes gzh-aurora{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}</style><section style="display:flex;justify-content:center;"><span style="display:inline-block;width:180px;height:3px;border-radius:2px;background:linear-gradient(90deg,#22d3ee,#818cf8,#e879f9,#22d3ee);background-size:300% 100%;animation:gzh-aurora 3.5s ease-in-out infinite;"></span></section></section>`;

    case 'pulse':
      // 脉冲：同心双环 + 中心光点（负 margin 重叠，无 position，公众号静态不塌）
      return `<section data-gzh-end style="margin:48px 10px 24px;"><style>@keyframes gzh-pulse-ring{0%{transform:scale(.3);opacity:.9}100%{transform:scale(1.7);opacity:0}}@keyframes gzh-pulse-dot{0%,100%{transform:scale(1)}50%{transform:scale(1.5)}}</style><section style="display:flex;align-items:center;justify-content:center;"><span style="display:inline-block;height:1px;width:52px;background:${line};"></span><span style="display:inline-block;margin:0 16px;line-height:0;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid ${accent};box-sizing:border-box;vertical-align:middle;animation:gzh-pulse-ring 2s ease-out infinite;"></span><span style="display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid ${accent};box-sizing:border-box;vertical-align:middle;margin-left:-12px;animation:gzh-pulse-ring 2s ease-out infinite;animation-delay:1s;"></span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${accent};vertical-align:middle;margin-left:-9px;animation:gzh-pulse-dot 2s ease-in-out infinite;"></span></span><span style="display:inline-block;height:1px;width:52px;background:${line};"></span></section></section>`;

    case 'scan':
      // 扫描：光束压在线条中央（负 margin 重叠，无 position），动画沿线条扫过
      return `<section data-gzh-end style="margin:48px 10px 24px;"><style>@keyframes gzh-scan{0%{transform:translateX(-88px);opacity:0}12%{opacity:1}88%{opacity:1}100%{transform:translateX(88px);opacity:0}}</style><section style="display:flex;justify-content:center;"><span style="display:inline-block;line-height:0;"><span style="display:inline-block;width:200px;height:2px;border-radius:1px;background:${line};vertical-align:middle;"></span><span style="display:inline-block;width:24px;height:2px;border-radius:1px;background:${accent};box-shadow:0 0 8px ${accent};vertical-align:middle;margin-left:-112px;animation:gzh-scan 2.2s ease-in-out infinite;"></span></span></section></section>`;

    case 'orbit':
      // 星轨：虚线轨道整体旋转 + 中心光点呼吸（负 margin 重叠，无 position）
      return `<section data-gzh-end style="margin:48px 10px 24px;"><style>@keyframes gzh-orbit{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}@keyframes gzh-orbit-core{0%,100%{opacity:.4}50%{opacity:1}}</style><section style="display:flex;align-items:center;justify-content:center;"><span style="display:inline-block;height:1px;width:48px;background:${line};"></span><span style="display:inline-block;margin:0 18px;line-height:0;"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;border:1px dashed ${muted};box-sizing:border-box;vertical-align:middle;animation:gzh-orbit 3s linear infinite;"></span><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${accent};box-shadow:0 0 6px ${accent};vertical-align:middle;margin-left:-14px;animation:gzh-orbit-core 3s ease-in-out infinite;"></span></span><span style="display:inline-block;height:1px;width:48px;background:${line};"></span></section></section>`;

    case 'neon':
      // 霓虹：发光灯牌边框 + 符号，不规则电流闪烁
      return `<section data-gzh-end style="margin:48px 10px 24px;"><style>@keyframes gzh-neon-frame{0%,100%{opacity:1}7%{opacity:.3}9%{opacity:1}43%{opacity:1}45%{opacity:.45}47%{opacity:1}72%{opacity:1}74%{opacity:.6}76%{opacity:1}}@keyframes gzh-neon-glow{0%,100%{transform:scale(1)}50%{transform:scale(.88)}}</style><section style="display:flex;justify-content:center;"><span style="display:inline-block;padding:8px 24px;border:1.5px solid ${accent};border-radius:8px;box-shadow:0 0 6px ${accent},0 0 18px ${accent},inset 0 0 8px ${accent};animation:gzh-neon-frame 3s linear infinite;"><span style="display:inline-block;font-size:12px;color:${accent};line-height:1;text-shadow:0 0 6px ${accent},0 0 14px ${accent};animation:gzh-neon-glow 3s ease-in-out infinite;">◈</span></span></section></section>`;

    case 'pixel':
      // 像素：方块逐格点亮循环
      return `<section data-gzh-end style="margin:48px 10px 24px;"><style>@keyframes gzh-pixel{0%,100%{opacity:.15;transform:scale(.8)}40%{opacity:1;transform:scale(1.15)}80%{opacity:.15;transform:scale(.8)}}</style><section style="display:flex;align-items:center;justify-content:center;"><span style="display:inline-block;width:6px;height:6px;border-radius:1px;background:${accent};margin:0 5px;animation:gzh-pixel 1.6s ease-in-out infinite;animation-delay:0s;"></span><span style="display:inline-block;width:6px;height:6px;border-radius:1px;background:${accent};margin:0 5px;animation:gzh-pixel 1.6s ease-in-out infinite;animation-delay:.15s;"></span><span style="display:inline-block;width:6px;height:6px;border-radius:1px;background:${accent};margin:0 5px;animation:gzh-pixel 1.6s ease-in-out infinite;animation-delay:.3s;"></span><span style="display:inline-block;width:6px;height:6px;border-radius:1px;background:${accent};margin:0 5px;animation:gzh-pixel 1.6s ease-in-out infinite;animation-delay:.45s;"></span><span style="display:inline-block;width:6px;height:6px;border-radius:1px;background:${accent};margin:0 5px;animation:gzh-pixel 1.6s ease-in-out infinite;animation-delay:.6s;"></span></section></section>`;

    case 'breathe':
      // 灵晕：三层柔光圆盘负 margin 叠放 + 光核常驻呼吸（无 position，静态不散）
      return `<section data-gzh-end style="margin:48px 10px 24px;"><style>@keyframes gzh-breathe-halo{0%{transform:scale(.3);opacity:.7}100%{transform:scale(1.6);opacity:0}}@keyframes gzh-breathe-core{0%,100%{transform:scale(.85);opacity:.8}50%{transform:scale(1.15);opacity:1}}</style><section style="display:flex;align-items:center;justify-content:center;"><span style="display:inline-block;height:1px;width:48px;background:${line};"></span><span style="display:inline-block;margin:0 18px;line-height:0;"><span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:radial-gradient(circle,${accent} 0%,transparent 70%);vertical-align:middle;animation:gzh-breathe-halo 3s ease-out infinite;"></span><span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:radial-gradient(circle,${accent} 0%,transparent 70%);vertical-align:middle;margin-left:-18px;animation:gzh-breathe-halo 3s ease-out infinite;animation-delay:1s;"></span><span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:radial-gradient(circle,${accent} 0%,transparent 70%);vertical-align:middle;margin-left:-18px;animation:gzh-breathe-halo 3s ease-out infinite;animation-delay:2s;"></span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:radial-gradient(circle,${accent} 20%,transparent 75%);vertical-align:middle;margin-left:-14px;animation:gzh-breathe-core 3s ease-in-out infinite;"></span></span><span style="display:inline-block;height:1px;width:48px;background:${line};"></span></section></section>`;

    case 'equalizer':
      // 频谱：声浪柱起伏跳动
      return `<section data-gzh-end style="margin:48px 10px 24px;"><style>@keyframes gzh-eq{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}</style><section style="display:flex;align-items:center;justify-content:center;"><span style="display:inline-block;height:1px;width:44px;background:${line};"></span><span style="display:inline-block;margin:0 18px;line-height:0;"><span style="display:inline-block;width:3px;height:16px;margin:0 3px;border-radius:1px;background:${muted};transform-origin:center center;animation:gzh-eq 1s ease-in-out infinite;animation-delay:0s;"></span><span style="display:inline-block;width:3px;height:16px;margin:0 3px;border-radius:1px;background:${accent};transform-origin:center center;animation:gzh-eq .9s ease-in-out infinite;animation-delay:.15s;"></span><span style="display:inline-block;width:3px;height:16px;margin:0 3px;border-radius:1px;background:${accent};transform-origin:center center;animation:gzh-eq 1.1s ease-in-out infinite;animation-delay:.3s;"></span><span style="display:inline-block;width:3px;height:16px;margin:0 3px;border-radius:1px;background:${accent};transform-origin:center center;animation:gzh-eq .8s ease-in-out infinite;animation-delay:.45s;"></span><span style="display:inline-block;width:3px;height:16px;margin:0 3px;border-radius:1px;background:${accent};transform-origin:center center;animation:gzh-eq 1.05s ease-in-out infinite;animation-delay:.6s;"></span><span style="display:inline-block;width:3px;height:16px;margin:0 3px;border-radius:1px;background:${accent};transform-origin:center center;animation:gzh-eq .95s ease-in-out infinite;animation-delay:.75s;"></span><span style="display:inline-block;width:3px;height:16px;margin:0 3px;border-radius:1px;background:${muted};transform-origin:center center;animation:gzh-eq 1.15s ease-in-out infinite;animation-delay:.9s;"></span></span><span style="display:inline-block;height:1px;width:44px;background:${line};"></span></section></section>`;

    case 'datastream':
      // 数据流：二进制码流明灭 + 块状光标闪烁
      return `<section data-gzh-end style="margin:48px 10px 24px;"><style>@keyframes gzh-data{0%,100%{opacity:.15}50%{opacity:1}}@keyframes gzh-data-cursor{0%,49%{opacity:1}50%,100%{opacity:0}}</style><section style="display:flex;align-items:center;justify-content:center;"><span style="display:inline-block;height:1px;width:36px;background:${line};"></span><span style="display:inline-block;margin:0 16px;font-family:Menlo,Consolas,monospace;font-size:11px;color:${accent};letter-spacing:2px;line-height:1;"><span style="animation:gzh-data 1.4s ease-in-out infinite;animation-delay:0s;">0</span><span style="animation:gzh-data 1.4s ease-in-out infinite;animation-delay:.12s;">1</span><span style="animation:gzh-data 1.4s ease-in-out infinite;animation-delay:.24s;">0</span><span style="animation:gzh-data 1.4s ease-in-out infinite;animation-delay:.36s;">0</span><span style="animation:gzh-data 1.4s ease-in-out infinite;animation-delay:.48s;">1</span><span style="animation:gzh-data 1.4s ease-in-out infinite;animation-delay:.6s;">1</span><span style="animation:gzh-data 1.4s ease-in-out infinite;animation-delay:.72s;">0</span><span style="animation:gzh-data 1.4s ease-in-out infinite;animation-delay:.84s;">1</span><span style="display:inline-block;width:7px;height:11px;margin-left:6px;background:${accent};vertical-align:-1px;animation:gzh-data-cursor 1s step-end infinite;"></span></span><span style="display:inline-block;height:1px;width:36px;background:${line};"></span></section></section>`;

    case 'particle':
      // 粒子：星火点排于基线上方（正常流，无 position），动画自基线升腾熄灭
      return `<section data-gzh-end style="margin:48px 10px 24px;"><style>@keyframes gzh-particle{0%{transform:translateY(0) scale(1);opacity:0}15%{opacity:1}100%{transform:translateY(-16px) scale(.3);opacity:0}}</style><section style="display:flex;justify-content:center;"><span style="display:inline-block;text-align:center;line-height:0;"><span style="display:inline-block;width:3px;height:3px;border-radius:50%;background:${accent};box-shadow:0 0 5px ${accent};margin:0 11px;animation:gzh-particle 2.4s ease-in infinite;animation-delay:0s;"></span><span style="display:inline-block;width:3px;height:3px;border-radius:50%;background:${accent};box-shadow:0 0 5px ${accent};margin:0 11px;animation:gzh-particle 2.4s ease-in infinite;animation-delay:.5s;"></span><span style="display:inline-block;width:4px;height:4px;border-radius:50%;background:${accent};box-shadow:0 0 6px ${accent};margin:0 11px;animation:gzh-particle 2.4s ease-in infinite;animation-delay:1.1s;"></span><span style="display:inline-block;width:3px;height:3px;border-radius:50%;background:${accent};box-shadow:0 0 5px ${accent};margin:0 11px;animation:gzh-particle 2.4s ease-in infinite;animation-delay:.3s;"></span><span style="display:inline-block;width:3px;height:3px;border-radius:50%;background:${accent};box-shadow:0 0 5px ${accent};margin:0 11px;animation:gzh-particle 2.4s ease-in infinite;animation-delay:.8s;"></span><span style="display:block;width:150px;height:1px;background:${line};margin:8px auto 0;"></span></span></section></section>`;

    case 'holo':
      // 全息：幻彩光带 + 扫描线纹理（单元素多背景，无 position），色相流转
      return `<section data-gzh-end style="margin:48px 10px 24px;"><style>@keyframes gzh-holo{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}</style><section style="display:flex;justify-content:center;"><span style="display:inline-block;width:160px;height:6px;border-radius:3px;background:repeating-linear-gradient(0deg,rgba(255,255,255,.3) 0px,rgba(255,255,255,.3) 1px,transparent 1px,transparent 3px),linear-gradient(90deg,#22d3ee,#818cf8,#e879f9,#facc15,#22d3ee);animation:gzh-holo 4s linear infinite;"></span></section></section>`;

    default:
      // classic
      return `<section data-gzh-end style="margin:44px 10px 20px;"><section style="display:flex;align-items:center;justify-content:center;"><span style="display:inline-block;height:1px;width:44px;background:${gzh.line};margin-right:14px;"></span><span style="font-size:10px;color:${readableMuted};letter-spacing:4px;font-weight:500;">END</span><span style="display:inline-block;height:1px;width:44px;background:${gzh.line};margin-left:14px;"></span></section></section>`;
  }
}

/**
 * 独立的文末分隔线（所有主题可用）。
 * endStyle='theme' 时：gzh 主题使用其自带 endStyle（默认 classic），非 gzh 主题不显示。
 * endStyle 为具体值时：所有主题均应用该样式。
 */
export function applyEndDivider(doc, endStyle, themeColors) {
  if (!doc.body) return;

  if (endStyle === 'theme' || !endStyle) {
    // 跟随主题：gzh 主题默认 classic，非 gzh 不显示
    if (!themeColors) return;
    endStyle = themeColors.endStyle || 'classic';
  }

  const colors = themeColors || { line: '#e5e7eb', muted: '#9ca3af', accent: '#818cf8' };
  doc.body.appendChild(htmlToElement(doc, buildEndHTML({ ...colors, endStyle })));
}

/* ================= DOM 胶水 ================= */

function htmlToElement(doc, html) {
  const tpl = doc.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}

/** 把 ==text== 换成主题化 <mark>（跳过代码/公式/标题）。 */
function replaceHighlightMarkers(doc, gzh) {
  const SKIP = 'code, pre, .md-code-block, .katex, h1, h2, h3, h4, h5, h6, mark';
  const walker = doc.createTreeWalker(doc.body, 4 /* NodeFilter.SHOW_TEXT */);
  const targets = [];
  let node;
  while ((node = walker.nextNode())) {
    if (!node.nodeValue || node.nodeValue.indexOf('==') === -1) continue;
    if (node.parentElement && node.parentElement.closest(SKIP)) continue;
    targets.push(node);
  }

  targets.forEach((textNode) => {
    const re = /==([^=]+)==/g;
    if (!re.test(textNode.nodeValue)) return;
    re.lastIndex = 0;
    const frag = doc.createDocumentFragment();
    let last = 0;
    let m;
    while ((m = re.exec(textNode.nodeValue))) {
      if (m.index > last) frag.appendChild(doc.createTextNode(textNode.nodeValue.slice(last, m.index)));
      frag.appendChild(htmlToElement(doc, buildMarkHTML(m[1], gzh)));
      last = m.index + m[0].length;
    }
    if (last < textNode.nodeValue.length) frag.appendChild(doc.createTextNode(textNode.nodeValue.slice(last)));
    textNode.parentNode.replaceChild(frag, textNode);
  });
}

/**
 * 结构化主流程：==高亮== → h2 自动编号。
 * 直接就地修改 doc（须在 selector 样式循环之后、容器包裹之前调用）。
 */
export function applyGzhStructure(doc, gzh) {
  const body = doc.body;
  if (!body || !body.children.length) return;

  replaceHighlightMarkers(doc, gzh);

  // h2 自动编号：不替换 h2，而是生成编号 wrapper 并把 h2 移入插槽。
  Array.from(body.children)
    .filter((el) => el.tagName === 'H2')
    .forEach((h2, i) => {
      const wrapper = htmlToElement(doc, buildH2WrapperHTML(i + 1, gzh));
      h2.parentNode.insertBefore(wrapper, h2);
      const slot = wrapper.querySelector('[data-gzh-slot]');
      slot.parentNode.insertBefore(h2, slot);
      slot.parentNode.removeChild(slot);
    });
}
