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
 */
export function buildH2WrapperHTML(num, gzh) {
  const ac = accentOf(gzh, num);
  const label = pad2(num);

  if (gzh.numStyle === 'watermark') {
    return `<section style="margin:52px 10px 28px;"><section style="padding-bottom:18px;border-bottom:1px solid ${gzh.line};"><p style="font-size:44px;font-weight:900;color:${gzh.line};margin:0;line-height:1;letter-spacing:-2px;">${label}</p><span data-gzh-slot></span></section></section>`;
  }
  if (gzh.numStyle === 'badge') {
    return `<section style="margin:48px 10px 24px;"><p style="margin:0 0 10px;"><span style="display:inline-block;background:${ac};color:#ffffff;font-size:12px;font-weight:700;padding:3px 12px;border-radius:9999px;letter-spacing:1px;">${label}</span></p><span data-gzh-slot></span></section>`;
  }
  if (gzh.numStyle === 'chip') {
    return `<section style="margin:48px 10px 24px;"><p style="margin:0 0 10px;"><span style="display:inline-block;border:1.5px solid ${ac};color:${ac};font-size:12px;font-weight:700;padding:2px 9px;letter-spacing:1.5px;">${label}</span></p><span data-gzh-slot></span></section>`;
  }
  // plain：小编号 + 标题 + 短横线
  return `<section style="margin:52px 10px 26px;"><p style="font-size:13px;color:${ac};font-weight:600;letter-spacing:3px;margin:0 0 8px;">${label}</p><span data-gzh-slot></span><section style="width:36px;height:3px;background:${ac};"></section></section>`;
}

/** ==高亮== chip。 */
export function buildMarkHTML(text, gzh) {
  return `<mark style="background:${gzh.tagBg};color:${gzh.title};padding:2px 7px;border-radius:3px;font-weight:700;font-size:14px;">${esc(text)}</mark>`;
}

/** 文末 END 分隔线。根据 gzh.endStyle 切换样式，默认 classic。 */
export function buildEndHTML(gzh) {
  const endStyle = gzh.endStyle || 'classic';
  const line = gzh.line;
  const muted = gzh.muted;

  switch (endStyle) {
    case 'dots':
      // 三个小圆点
      return `<section data-gzh-end style="margin:44px 10px 20px;"><section style="display:flex;align-items:center;justify-content:center;gap:14px;"><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${muted};"></span><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${muted};"></span><span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${muted};"></span></section></section>`;

    case 'diamond':
      // 菱形 ◆ 左右细线
      return `<section data-gzh-end style="margin:44px 10px 20px;"><section style="display:flex;align-items:center;justify-content:center;"><span style="display:inline-block;height:1px;width:60px;background:${line};"></span><span style="display:inline-block;margin:0 16px;font-size:10px;color:${muted};line-height:1;">◆</span><span style="display:inline-block;height:1px;width:60px;background:${line};"></span></section></section>`;

    case 'asterism':
      // 三个小星号 * * *
      return `<section data-gzh-end style="margin:44px 10px 20px;"><section style="display:flex;align-items:center;justify-content:center;"><span style="display:inline-block;height:1px;width:32px;background:${line};margin-right:16px;"></span><span style="font-size:14px;color:${muted};letter-spacing:10px;font-weight:400;">*&nbsp;*&nbsp;*</span><span style="display:inline-block;height:1px;width:32px;background:${line};margin-left:16px;"></span></section></section>`;

    case 'wave':
      // 波浪线
      return `<section data-gzh-end style="margin:44px 10px 20px;"><section style="text-align:center;font-size:14px;color:${line};letter-spacing:2px;line-height:1;">～～～～～～</section></section>`;

    case 'feather':
      // 羽毛 ❦ 左右细线
      return `<section data-gzh-end style="margin:44px 10px 20px;"><section style="display:flex;align-items:center;justify-content:center;"><span style="display:inline-block;height:1px;width:50px;background:${line};"></span><span style="display:inline-block;margin:0 16px;font-size:16px;color:${muted};line-height:1;">❦</span><span style="display:inline-block;height:1px;width:50px;background:${line};"></span></section></section>`;

    case 'minimal':
      // 极简单线
      return `<section data-gzh-end style="margin:44px 10px 20px;"><section style="display:flex;justify-content:center;"><span style="display:inline-block;height:1px;width:80px;background:${line};"></span></section></section>`;

    case 'ornament':
      // 装饰花体 ❋ 双层
      return `<section data-gzh-end style="margin:44px 10px 20px;"><section style="display:flex;align-items:center;justify-content:center;"><span style="display:inline-block;height:1px;width:40px;background:${line};margin-right:8px;"></span><span style="display:inline-block;height:1px;width:16px;background:${muted};margin-right:14px;"></span><span style="font-size:12px;color:${muted};line-height:1;">❋</span><span style="display:inline-block;height:1px;width:16px;background:${muted};margin-left:14px;"></span><span style="display:inline-block;height:1px;width:40px;background:${line};margin-left:8px;"></span></section></section>`;

    default:
      // classic：— END —
      return `<section data-gzh-end style="margin:44px 10px 20px;"><section style="display:flex;align-items:center;justify-content:center;"><span style="display:inline-block;height:1px;width:44px;background:${line};margin-right:14px;"></span><span style="font-size:10px;color:${muted};letter-spacing:4px;font-weight:500;">END</span><span style="display:inline-block;height:1px;width:44px;background:${line};margin-left:14px;"></span></section></section>`;
  }
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
 * 结构化主流程：==高亮== → h2 自动编号 → END 分隔线。
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

  body.appendChild(htmlToElement(doc, buildEndHTML(gzh)));
}
