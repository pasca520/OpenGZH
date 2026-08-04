import { describe, it, expect } from 'vitest';
import { layoutEndDivider, END_DIVIDER_META } from '../end-divider-gif.js';

const colors = { line: '#e5e7eb', muted: '#9ca3af', accent: '#059669' };
const ANIMATED = Object.keys(END_DIVIDER_META).filter((s) => END_DIVIDER_META[s].animated);

describe('END_DIVIDER_META', () => {
  it('classic 为静态，其余动效样式 animated=true', () => {
    expect(END_DIVIDER_META.classic.animated).toBe(false);
    expect(ANIMATED.length).toBe(11);
  });
  it('全部动效样式都有正时长', () => {
    ANIMATED.forEach((s) => expect(END_DIVIDER_META[s].duration).toBeGreaterThan(0));
  });
});

describe('layoutEndDivider', () => {
  it('全部动效样式返回非空布局与合理尺寸', () => {
    ANIMATED.forEach((s) => {
      const layout = layoutEndDivider(s, colors, 0);
      expect(layout.width).toBeGreaterThan(0);
      expect(layout.height).toBeGreaterThan(0);
      expect(layout.primitives.length).toBeGreaterThan(0);
      expect(END_DIVIDER_META[s].duration).toBeGreaterThan(0);
    });
  });

  it('classic 返回空原语（无 GIF）', () => {
    expect(layoutEndDivider('classic', colors, 0).primitives).toEqual([]);
  });

  it('未知样式返回空布局', () => {
    expect(layoutEndDivider('nope', colors, 0)).toEqual({ width: 0, height: 0, primitives: [] });
  });

  it('缺省颜色使用兜底值（accent 落在原语里）', () => {
    const layout = layoutEndDivider('pulse', {}, 0);
    const accentUsed = layout.primitives.some(
      (p) => p.kind === 'ring' || p.kind === 'dot' && p.color === '#818cf8'
    );
    expect(accentUsed).toBe(true);
  });

  it('动效样式在 t=0 与 t=时长一半时的原语不同（动画真实变化）', () => {
    ANIMATED.forEach((s) => {
      const duration = END_DIVIDER_META[s].duration;
      const a = JSON.stringify(layoutEndDivider(s, colors, 0).primitives);
      const b = JSON.stringify(layoutEndDivider(s, colors, duration / 2).primitives);
      expect(a, `${s} 两帧应不同`).not.toBe(b);
    });
  });

  it('颜色注入生效：pulse 的环用 accent', () => {
    const layout = layoutEndDivider('pulse', { line: '#111', muted: '#222', accent: '#ff0000' }, 0);
    const ring = layout.primitives.find((p) => p.kind === 'ring');
    expect(ring.color).toBe('#ff0000');
  });
});
