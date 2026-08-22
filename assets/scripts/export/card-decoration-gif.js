/** Transparent GIFs for semantic card decorations copied into WeChat. */
import { encodeGif } from './gif-encoder.js';

export const CARD_DECORATION_META = Object.freeze({
  highlight: { width: 176, height: 28, duration: 3.6 },
  steps: { width: 40, height: 96, duration: 4.2 },
  relationship: { width: 128, height: 118, duration: 5 },
  bookmark: { width: 48, height: 96, duration: 4.2 },
  documents: { width: 32, height: 32, duration: 4.6 }
});

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const easeOut = (value) => 1 - ((1 - value) ** 3);

export function layoutCardDecoration(kind, colors = {}, tSeconds = 0) {
  const meta = CARD_DECORATION_META[kind];
  if (!meta) return { width: 0, height: 0, primitives: [], resting: true };

  const accent = colors.accent || '#576b95';
  const line = colors.line || '#d9d9d9';
  const soft = colors.soft || '#f6f7f9';
  const surface = colors.surface || '#ffffff';
  const progress = easeOut(clamp01(tSeconds / 1.4));
  const resting = tSeconds >= 1.4;
  const layouts = {
    highlight: () => [{
      kind: 'rect', x: 0, y: 4, width: 176 * progress, height: 20,
      radius: 4, color: accent, alpha: 0.42
    }],
    steps: () => [0, 1, 2].map((index) => ({
      kind: 'circle', x: 20, y: 16 + index * 32, radius: 7,
      color: index <= Math.floor(progress * 3) ? accent : line
    })),
    relationship: () => [
      { kind: 'line', x1: 22, y1: 22, x2: 104, y2: 58, progress, color: line, width: 2 },
      { kind: 'line', x1: 20, y1: 94, x2: 104, y2: 58, progress, color: line, width: 2 },
      { kind: 'circle', x: 22, y: 22, radius: 6, color: accent, alpha: 0.35 + 0.65 * progress },
      { kind: 'circle', x: 20, y: 94, radius: 6, color: accent, alpha: 0.35 + 0.65 * progress },
      { kind: 'circle', x: 104, y: 58, radius: 7, color: accent, alpha: 0.35 + 0.65 * progress }
    ],
    bookmark: () => [{
      kind: 'bookmark', x: 4, y: -48 + 48 * progress, width: 40, height: 82,
      color: accent
    }],
    documents: () => [
      { kind: 'rect', x: 9 + 2 * progress, y: 4 - 3 * progress, width: 20, height: 24, radius: 3, color: soft, stroke: line },
      { kind: 'rect', x: 2, y: 7, width: 20, height: 24, radius: 3, color: surface, stroke: accent }
    ]
  };

  return { width: meta.width, height: meta.height, primitives: layouts[kind](), resting };
}

function roundedRect(context, x, y, width, height, radius = 0) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function drawCardPrimitives(context, width, height, primitives) {
  context.clearRect(0, 0, width, height);
  for (const item of primitives) {
    context.save();
    context.globalAlpha = item.alpha ?? 1;
    context.fillStyle = item.color || 'transparent';
    context.strokeStyle = item.stroke || item.color || 'transparent';
    context.lineWidth = item.width || 1;
    if (item.kind === 'circle') {
      context.beginPath();
      context.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
      context.fill();
    } else if (item.kind === 'line') {
      context.beginPath();
      context.moveTo(item.x1, item.y1);
      context.lineTo(
        item.x1 + (item.x2 - item.x1) * item.progress,
        item.y1 + (item.y2 - item.y1) * item.progress
      );
      context.stroke();
    } else if (item.kind === 'bookmark') {
      context.beginPath();
      context.moveTo(item.x, item.y);
      context.lineTo(item.x + item.width, item.y);
      context.lineTo(item.x + item.width, item.y + item.height);
      context.lineTo(item.x + item.width / 2, item.y + item.height - 12);
      context.lineTo(item.x, item.y + item.height);
      context.closePath();
      context.fill();
    } else {
      roundedRect(context, item.x, item.y, item.width, item.height, item.radius);
      context.fill();
      if (item.stroke) context.stroke();
    }
    context.restore();
  }
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export function buildCardDecorationGif({ kind, colors, fps = 12 }) {
  if (typeof document === 'undefined' || !CARD_DECORATION_META[kind]) return null;
  try {
    const { width, height, duration } = CARD_DECORATION_META[kind];
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    const frames = [];
    const frameCount = Math.max(2, Math.round(duration * fps));
    for (let frame = 0; frame < frameCount; frame += 1) {
      const layout = layoutCardDecoration(kind, colors, frame / fps);
      drawCardPrimitives(context, width, height, layout.primitives);
      frames.push(context.getImageData(0, 0, width, height).data);
    }
    const bytes = encodeGif(frames, width, height, {
      delayCs: Math.max(1, Math.round(100 / fps)),
      transparent: true,
      repeat: 0
    });
    return { dataUrl: `data:image/gif;base64,${bytesToBase64(bytes)}`, width, height };
  } catch (error) {
    console.warn('卡片动图生成失败，保留静态装饰:', error);
    return null;
  }
}
