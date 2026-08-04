/**
 * 结尾分隔线 GIF 生成 —— 预览用 CSS 动效，复制到公众号时把同一结尾渲染成 GIF 动图。
 *
 * 公众号后台会剥离 `<style>` 与 `animation`，CSS 动效无法存活；GIF 是唯一可靠的
 * 动画载体。本模块用 canvas 逐帧手绘 12 种结尾样式（透明背景），再交给 gif-encoder
 * 编码为 GIF，嵌入复制产物的 `<img>`。
 *
 * 分层设计：
 * - `layoutEndDivider(endStyle, colors, tSeconds)`：纯函数，输出某时间点该样式的几何原语。
 *   几何/延迟/时长**严格镜像 gzh-structure.js 的 buildEndHTML**，改动必须两侧同步。
 * - `drawPrimitives(ctx, w, h, primitives)`：把原语画到 canvas（浏览器侧）。
 * - `buildEndDividerGif(...)`：逐帧布局→绘制→编码→返回 data URL（浏览器侧，失败回退 null）。
 *
 * @module end-divider-gif
 */

import { encodeGif } from './gif-encoder.js';

/* ============ 缓动/进度工具（近似 CSS 计时函数） ============ */

/** cubic ease-in-out，近似 CSS `ease-in-out`。 */
export function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** cubic ease-out，近似 CSS `ease-out`。 */
export function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

/** cubic ease-in，近似 CSS `ease-in`。 */
export function easeIn(t) {
  return t * t * t;
}

/** 三角波 ping-pong：输入 [0,1]，输出 0→1→0。 */
export function pingpong(t) {
  return t < 0.5 ? t * 2 : (1 - t) * 2;
}

/** 按 CSS 语义计算元素动画进度：`(t + delay) % duration / duration`。 */
function frameProgress(t, delay, duration) {
  return ((t + delay) % duration) / duration;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ============ 色相旋转（holo 的 hue-rotate） ============ */

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h /= 6;
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  ];
}

/** 将 rgb 各分量按角度旋转色相。 */
function rotateHueColor(hex, deg) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return hex;
  let full = m[1];
  if (full.length === 3) full = full.split('').map((c) => c + c).join('');
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const [h, s, l] = rgbToHsl(r, g, b);
  const [nr, ng, nb] = hslToRgb((h + deg / 360) % 1, s, l);
  const hex2 = (v) => v.toString(16).padStart(2, '0');
  return `#${hex2(nr)}${hex2(ng)}${hex2(nb)}`;
}

/* ============ 各样式布局（纯函数，几何镜像 buildEndHTML） ============ */

/**
 * 各样式元数据：duration（秒，CSS 时长）、animated（是否需要生成 GIF）。
 * classic 为静态，无需 GIF。
 */
export const END_DIVIDER_META = {
  aurora: { duration: 3.5, animated: true },
  pulse: { duration: 2, animated: true },
  scan: { duration: 2.2, animated: true },
  orbit: { duration: 3, animated: true },
  neon: { duration: 3, animated: true },
  pixel: { duration: 1.6, animated: true },
  breathe: { duration: 3, animated: true },
  equalizer: { duration: 1.15, animated: true },
  datastream: { duration: 1.4, animated: true },
  particle: { duration: 2.4, animated: true },
  holo: { duration: 4, animated: true },
  classic: { duration: 0, animated: false }
};

function linePrim(y, w, h, color) {
  return { kind: 'line', x: 0, y: y - h / 2, w, h, color, alpha: 1 };
}

function auroraLayout(t, colors) {
  const meta = END_DIVIDER_META.aurora;
  const p = frameProgress(t, 0, meta.duration);
  const offsetPx = easeInOut(pingpong(p)) * 360; // bg-size 300%，可视窗滑过 2*180px
  return {
    width: 180,
    height: 3,
    primitives: [{
      kind: 'gradient-bar',
      x: 0, y: 0, w: 180, h: 3, r: 2,
      span: 3,
      stops: [
        { offset: 0, color: '#22d3ee' },
        { offset: 0.33, color: '#818cf8' },
        { offset: 0.66, color: '#e879f9' },
        { offset: 1, color: '#22d3ee' }
      ],
      offsetPx,
      alpha: 1
    }]
  };
}

function pulseLayout(t, colors) {
  const { accent, line } = colors;
  const meta = END_DIVIDER_META.pulse;
  const W = 145, H = 12;
  const cy = H / 2;
  const primitives = [
    linePrim(cy, 52, 1, line),
    linePrim(cy, 52, 1, line)
  ];
  // 两个同心环，延迟 0/1s，scale .3→1.7 ease-out，opacity .9→0
  [0, 1].forEach((delay) => {
    const p = frameProgress(t, delay, 2);
    const scale = 0.3 + 1.4 * easeOut(p);
    primitives.push({
      kind: 'ring', cx: 74, cy, r: 6 * scale,
      color: accent, alpha: 0.9 * (1 - p), lw: 1
    });
  });
  // 中心光点，scale 1→1.5→1 呼吸
  const dotScale = 1 + 0.5 * easeInOut(pingpong(frameProgress(t, 0, 2)));
  primitives.push({ kind: 'dot', cx: 74, cy, r: 3 * dotScale, color: accent, alpha: 1 });
  // line1/line2 的 x 定位（左侧 [0,52]，右侧 [93,145]）
  primitives[0].x = 0;
  primitives[1].x = 93;
  return { width: W, height: H, primitives };
}

function scanLayout(t, colors) {
  const { accent, line } = colors;
  const meta = END_DIVIDER_META.scan;
  const p = frameProgress(t, 0, meta.duration);
  const beamCx = 100 - 88 + 176 * p; // translateX(-88px→88px)，相对线条中心 100
  const alpha = p < 0.12 ? p / 0.12 : p > 0.88 ? (1 - p) / 0.12 : 1;
  return {
    width: 200,
    height: 2,
    primitives: [
      { kind: 'line', x: 0, y: 0, w: 200, h: 2, r: 1, color: line, alpha: 1 },
      {
        kind: 'line', x: beamCx - 12, y: 0, w: 24, h: 2, r: 1,
        color: accent, alpha, glow: 8, glowColor: accent
      }
    ]
  };
}

function orbitLayout(t, colors) {
  const { accent, line, muted } = colors;
  const meta = END_DIVIDER_META.orbit;
  const W = 154, H = 22;
  const cy = H / 2;
  const coreAlpha = 0.4 + 0.6 * easeInOut(pingpong(frameProgress(t, 0, meta.duration)));
  return {
    width: W,
    height: H,
    primitives: [
      { kind: 'line', x: 0, y: cy - 0.5, w: 48, h: 1, color: line, alpha: 1 },
      { kind: 'line', x: 106, y: cy - 0.5, w: 48, h: 1, color: line, alpha: 1 },
      {
        kind: 'dashed-ring', cx: 77, cy, r: 11,
        color: muted, alpha: 1, lw: 1, dash: [3, 3]
      },
      { kind: 'dot', cx: 77, cy, r: 2, color: accent, alpha: coreAlpha, glow: 6, glowColor: accent }
    ]
  };
}

function neonFrameOpacity(p) {
  const keypoints = [
    [0, 1], [0.07, 0.3], [0.09, 1], [0.43, 1], [0.45, 0.45],
    [0.47, 1], [0.72, 1], [0.74, 0.6], [0.76, 1], [1, 1]
  ];
  for (let i = 0; i < keypoints.length - 1; i += 1) {
    const [t0, v0] = keypoints[i];
    const [t1, v1] = keypoints[i + 1];
    if (p >= t0 && p <= t1) {
      const f = (p - t0) / (t1 - t0 || 1);
      return v0 + (v1 - v0) * f;
    }
  }
  return 1;
}

function neonLayout(t, colors) {
  const { accent } = colors;
  const meta = END_DIVIDER_META.neon;
  const p = frameProgress(t, 0, meta.duration);
  const opacity = neonFrameOpacity(p);
  const glowScale = 0.88 + 0.12 * easeInOut(pingpong(p));
  return {
    width: 64,
    height: 32,
    primitives: [
      {
        kind: 'rect', x: 0, y: 0, w: 64, h: 32, r: 8,
        color: accent, alpha: opacity, stroke: true, lw: 1.5,
        glow: 18, glowColor: accent
      },
      {
        kind: 'text', cx: 32, cy: 16, text: '◈',
        font: 'sans-serif', size: 12, weight: 'normal',
        color: accent, alpha: opacity, scale: glowScale,
        glow: 14, glowColor: accent
      }
    ]
  };
}

function pixelValue(p) {
  const v = p < 0.4 ? p / 0.4 : p < 0.8 ? 1 - (p - 0.4) / 0.4 : 0;
  return { alpha: 0.15 + 0.85 * v, scale: 0.8 + 0.35 * v };
}

function pixelLayout(t, colors) {
  const { accent } = colors;
  const delays = [0, 0.15, 0.3, 0.45, 0.6];
  const primitives = delays.map((delay, i) => {
    const p = frameProgress(t, delay, 1.6);
    const { alpha, scale } = pixelValue(p);
    const size = 6 * scale;
    return {
      kind: 'rect', x: i * 16 + (6 - size) / 2, y: (6 - size) / 2,
      w: size, h: size, r: 1, color: accent, alpha
    };
  });
  return { width: 70, height: 6, primitives };
}

function breatheLayout(t, colors) {
  const { accent, line } = colors;
  const meta = END_DIVIDER_META.breathe;
  const W = 150, H = 18;
  const cy = H / 2;
  const primitives = [
    linePrim(cy, 48, 1, line),
    linePrim(cy, 48, 1, line)
  ];
  primitives[0].x = 0;
  primitives[1].x = 102;
  // 三层涟漪，延迟 0/1/2s，scale .3→1.6 ease-out，opacity .7→0
  [0, 1, 2].forEach((delay) => {
    const p = frameProgress(t, delay, 3);
    primitives.push({
      kind: 'radial', cx: 75, cy, r: 9 * (0.3 + 1.3 * easeOut(p)),
      stops: [
        { offset: 0, color: accent },
        { offset: 1, color: 'transparent' }
      ],
      alpha: 0.7 * (1 - p)
    });
  });
  // 光核呼吸
  const coreScale = 0.85 + 0.3 * easeInOut(pingpong(frameProgress(t, 0, 3)));
  primitives.push({
    kind: 'radial', cx: 75, cy, r: 5 * coreScale,
    stops: [
      { offset: 0.2, color: accent },
      { offset: 1, color: 'transparent' }
    ],
    alpha: 0.8 + 0.2 * easeInOut(pingpong(frameProgress(t, 0, 3)))
  });
  return { width: W, height: H, primitives };
}

function equalizerLayout(t, colors) {
  const { accent, muted, line } = colors;
  const durations = [1, 0.9, 1.1, 0.8, 1.05, 0.95, 1.15];
  const delays = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
  const cy = 8;
  const primitives = [
    { kind: 'line', x: 0, y: cy - 0.5, w: 44, h: 1, color: line, alpha: 1 },
    { kind: 'line', x: 119, y: cy - 0.5, w: 44, h: 1, color: line, alpha: 1 }
  ];
  durations.forEach((duration, i) => {
    const p = frameProgress(t, delays[i], duration);
    const scale = 0.25 + 0.75 * easeInOut(p);
    const h = 16 * scale;
    primitives.push({
      kind: 'rect', x: 62 + i * 6, y: cy - h / 2, w: 3, h, r: 1,
      color: i === 0 || i === 6 ? muted : accent, alpha: 1
    });
  });
  return { width: 163, height: 16, primitives };
}

function datastreamLayout(t, colors) {
  const { accent, line } = colors;
  const bits = ['0', '1', '0', '0', '1', '1', '0', '1'];
  const primitives = [
    { kind: 'line', x: 0, y: 5, w: 36, h: 1, color: line, alpha: 1 },
    { kind: 'line', x: 150, y: 5, w: 36, h: 1, color: line, alpha: 1 }
  ];
  bits.forEach((bit, i) => {
    const p = frameProgress(t, 0.12 * i, 1.4);
    primitives.push({
      kind: 'text', cx: 52 + i * 8.6, cy: 5.5, text: bit,
      font: 'monospace', size: 11, weight: 'normal',
      color: accent, alpha: 0.15 + 0.85 * easeInOut(p)
    });
  });
  // 块状光标，step 闪烁（前 49% 可见）
  const cursorAlpha = ((t % 1) < 0.5) ? 1 : 0;
  primitives.push({
    kind: 'line', x: 126.8, y: 0, w: 7, h: 11,
    color: accent, alpha: cursorAlpha
  });
  return { width: 186, height: 11, primitives };
}

function particleLayout(t, colors) {
  const { accent, line } = colors;
  const delays = [0, 0.5, 1.1, 0.3, 0.8];
  const sizes = [3, 3, 4, 3, 3];
  const centers = [12, 43.5, 75, 106.5, 138];
  const baseY = 22;
  const primitives = delays.map((delay, i) => {
    const p = frameProgress(t, delay, 2.4);
    const alpha = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    const rise = 16 * easeIn(p);
    const scale = 1 - 0.7 * p;
    return {
      kind: 'dot', cx: centers[i], cy: baseY - sizes[i] / 2 - rise,
      r: (sizes[i] / 2) * scale, color: accent, alpha,
      glow: 5, glowColor: accent
    };
  });
  primitives.push({ kind: 'line', x: 0, y: 24, w: 150, h: 1, color: line, alpha: 1 });
  return { width: 150, height: 26, primitives };
}

function holoLayout(t, colors) {
  const meta = END_DIVIDER_META.holo;
  const p = frameProgress(t, 0, meta.duration);
  const hue = p * 360;
  const stops = ['#22d3ee', '#818cf8', '#e879f9', '#facc15', '#22d3ee'];
  const rotated = stops.map((c) => ({ color: rotateHueColor(c, hue) }));
  rotated[0].offset = 0;
  rotated[1].offset = 0.25;
  rotated[2].offset = 0.5;
  rotated[3].offset = 0.75;
  rotated[4].offset = 1;
  return {
    width: 160,
    height: 6,
    primitives: [
      {
        kind: 'gradient-bar', x: 0, y: 0, w: 160, h: 6, r: 3,
        stops: rotated, offsetPx: 0, alpha: 1
      },
      {
        kind: 'scanlines', x: 0, y: 0, w: 160, h: 6, step: 3,
        color: 'rgba(255,255,255,0.3)', alpha: 1
      }
    ]
  };
}

const LAYOUTS = {
  aurora: auroraLayout,
  pulse: pulseLayout,
  scan: scanLayout,
  orbit: orbitLayout,
  neon: neonLayout,
  pixel: pixelLayout,
  breathe: breatheLayout,
  equalizer: equalizerLayout,
  datastream: datastreamLayout,
  particle: particleLayout,
  holo: holoLayout
};

/**
 * 计算某时间点结尾样式的几何原语。
 * 纯函数，node 可测。classic 返回空 primitives（静态，无需 GIF）。
 *
 * @param {string} endStyle
 * @param {{line?: string, muted?: string, accent?: string}} [colors]
 * @param {number} [t] 秒
 * @returns {{width: number, height: number, primitives: object[]}}
 */
export function layoutEndDivider(endStyle, colors = {}, t = 0) {
  const drawer = LAYOUTS[endStyle];
  if (!drawer) return { width: 0, height: 0, primitives: [] };
  return drawer(t, {
    line: colors.line || '#e5e7eb',
    muted: colors.muted || '#9ca3af',
    accent: colors.accent || '#818cf8'
  });
}

/* ============ canvas 绘制（浏览器侧） ============ */

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function colorWithAlpha(color, alpha) {
  // 透传 'transparent' 与已含透明度写法，其余转 rgba
  if (color === 'transparent') return 'transparent';
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(color).trim());
  if (!m) return color;
  let full = m[1];
  if (full.length === 3) full = full.split('').map((c) => c + c).join('');
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${clamp01(alpha)})`;
}

/**
 * 把布局原语绘制到 canvas（透明背景）。浏览器侧。
 */
export function drawPrimitives(ctx, width, height, primitives) {
  ctx.clearRect(0, 0, width, height);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  primitives.forEach((p) => {
    const alpha = clamp01(p.alpha == null ? 1 : p.alpha);
    ctx.save();
    if (p.glow && p.glowColor) {
      ctx.shadowBlur = p.glow;
      ctx.shadowColor = p.glowColor;
    }
    switch (p.kind) {
      case 'rect': {
        ctx.globalAlpha = alpha;
        if (p.stroke) {
          roundRectPath(ctx, p.x, p.y, p.w, p.h, p.r || 0);
          ctx.lineWidth = p.lw || 1;
          ctx.strokeStyle = colorWithAlpha(p.color, alpha);
          ctx.stroke();
        } else {
          roundRectPath(ctx, p.x, p.y, p.w, p.h, p.r || 0);
          ctx.fillStyle = colorWithAlpha(p.color, alpha);
          ctx.fill();
        }
        break;
      }
      case 'line': {
        ctx.globalAlpha = alpha;
        if (p.r) {
          roundRectPath(ctx, p.x, p.y, p.w, p.h, p.r);
        } else {
          ctx.beginPath();
          ctx.rect(p.x, p.y, p.w, p.h);
        }
        ctx.fillStyle = colorWithAlpha(p.color, alpha);
        ctx.fill();
        break;
      }
      case 'ring': {
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
        ctx.lineWidth = p.lw || 1;
        ctx.strokeStyle = colorWithAlpha(p.color, alpha);
        ctx.stroke();
        break;
      }
      case 'dot': {
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = colorWithAlpha(p.color, alpha);
        ctx.fill();
        break;
      }
      case 'dashed-ring': {
        ctx.globalAlpha = alpha;
        ctx.setLineDash(p.dash || [3, 3]);
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
        ctx.lineWidth = p.lw || 1;
        ctx.strokeStyle = colorWithAlpha(p.color, alpha);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }
      case 'gradient-bar': {
        // span>1 时渐变加宽并平移（aurora 的 background-size:300% 滑动）
        ctx.globalAlpha = alpha;
        const span = p.span || 1;
        const grad = ctx.createLinearGradient(p.x - p.offsetPx, 0, p.x + span * p.w - p.offsetPx, 0);
        p.stops.forEach((s) => grad.addColorStop(s.offset, s.color));
        roundRectPath(ctx, p.x, p.y, p.w, p.h, p.r || 0);
        ctx.clip();
        ctx.fillStyle = grad;
        ctx.fillRect(p.x - p.offsetPx, p.y, span * p.w, p.h);
        break;
      }
      case 'radial': {
        ctx.globalAlpha = alpha;
        const grad = ctx.createRadialGradient(p.cx, p.cy, 0, p.cx, p.cy, p.r);
        p.stops.forEach((s) => {
          grad.addColorStop(s.offset, s.color === 'transparent'
            ? colorWithAlpha(p.stops[0].color, 0)
            : s.color);
        });
        ctx.beginPath();
        ctx.arc(p.cx, p.cy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        break;
      }
      case 'scanlines': {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        for (let y = p.y; y < p.y + p.h; y += p.step) {
          ctx.fillRect(p.x, y, p.w, 1);
        }
        break;
      }
      case 'text': {
        ctx.globalAlpha = alpha;
        ctx.font = `${p.weight || 'normal'} ${p.size}px ${p.font}`;
        ctx.translate(p.cx, p.cy);
        if (p.scale && p.scale !== 1) ctx.scale(p.scale, p.scale);
        ctx.fillStyle = colorWithAlpha(p.color, alpha);
        ctx.fillText(p.text, 0, 0);
        break;
      }
      default:
        break;
    }
    ctx.restore();
  });
}

/* ============ GIF 封装（浏览器侧） ============ */

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * 把结尾样式渲染为透明背景 GIF 动图，返回 data URL。
 * 任何异常（无 canvas / 样式未知）返回 null，调用方回退静态 HTML。
 *
 * @param {object} options
 * @param {string} options.endStyle
 * @param {{line?: string, muted?: string, accent?: string}} options.colors
 * @param {number} [options.fps=20]
 * @returns {{dataUrl: string, width: number, height: number} | null}
 */
export function buildEndDividerGif({ endStyle, colors, fps = 20 }) {
  if (typeof document === 'undefined') return null;

  try {
    const base = layoutEndDivider(endStyle, colors, 0);
    if (!base.width || !base.height || base.primitives.length === 0) return null;

    const duration = END_DIVIDER_META[endStyle]?.duration || 0;
    const frameCount = Math.max(2, Math.round(duration * fps));
    const canvas = document.createElement('canvas');
    canvas.width = base.width;
    canvas.height = base.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    const frames = [];
    for (let i = 0; i < frameCount; i += 1) {
      const layout = layoutEndDivider(endStyle, colors, i / fps);
      drawPrimitives(ctx, base.width, base.height, layout.primitives);
      frames.push(ctx.getImageData(0, 0, base.width, base.height).data);
    }

    const delayCs = Math.max(1, Math.round(100 / fps));
    const bytes = encodeGif(frames, base.width, base.height, {
      delayCs,
      transparent: true,
      repeat: 0
    });
    return {
      dataUrl: `data:image/gif;base64,${bytesToBase64(bytes)}`,
      width: base.width,
      height: base.height
    };
  } catch (error) {
    console.warn('结尾动图生成失败，回退静态:', error);
    return null;
  }
}
