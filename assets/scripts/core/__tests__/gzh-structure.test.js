import { describe, it, expect } from 'vitest';
import { pad2, accentOf, buildH2WrapperHTML, buildMarkHTML, buildEndHTML } from '../gzh-structure.js';

const base = {
  body: '#374151', title: '#111827', muted: '#9ca3af', line: '#e5e7eb',
  accent: '#059669', soft: '#ecfdf5', tagBg: '#d1fae5',
  quoteStyle: 'card', numStyle: 'badge', endStyle: 'classic'
};

describe('pad2', () => {
  it('单位数补零', () => expect(pad2(1)).toBe('01'));
  it('两位数不补', () => expect(pad2(12)).toBe('12'));
});

describe('accentOf', () => {
  it('无 palette 返回固定 accent', () => {
    expect(accentOf(base, 1)).toBe('#059669');
    expect(accentOf(base, 5)).toBe('#059669');
  });
  it('有 palette 轮转并回绕', () => {
    const g = { ...base, palette: ['#F24E1E', '#A259FF', '#1ABCFE', '#0ACF83', '#FF7262'] };
    expect(accentOf(g, 1)).toBe('#F24E1E');
    expect(accentOf(g, 5)).toBe('#FF7262');
    expect(accentOf(g, 6)).toBe('#F24E1E');
  });
});

describe('buildH2WrapperHTML', () => {
  it('badge：实心方块并置 + 插槽', () => {
    const html = buildH2WrapperHTML(1, base);
    expect(html).toContain('display:flex');
    expect(html).toContain('font-size:20px');
    expect(html).toContain('>01<');
    expect(html).toContain('data-gzh-slot');
    expect(html).toContain('background:#059669');
  });
  it('chip：描边方块并置', () => {
    const html = buildH2WrapperHTML(2, { ...base, numStyle: 'chip' });
    expect(html).toContain('border:1.5px solid');
    expect(html).toContain('font-size:20px');
    expect(html).toContain('display:flex');
    expect(html).toContain('>02<');
  });
  it('watermark：44px 水印大号数字用 line 色', () => {
    const html = buildH2WrapperHTML(3, { ...base, numStyle: 'watermark' });
    expect(html).toContain('font-size:44px');
    expect(html).toContain('color:#e5e7eb');
    expect(html).toContain('>03<');
  });
  it('plain：34px 大编号与标题并置', () => {
    const html = buildH2WrapperHTML(1, { ...base, numStyle: 'plain' });
    expect(html).toContain('font-size:34px');
    expect(html).toContain('font-weight:900');
    expect(html).toContain('display:flex');
  });
  it('palette 主题编号徽标用轮转色', () => {
    const g = { ...base, palette: ['#F24E1E', '#A259FF'] };
    expect(buildH2WrapperHTML(2, g)).toContain('background:#A259FF');
  });
});

describe('buildMarkHTML', () => {
  it('用 tagBg/title 并转义内容', () => {
    const html = buildMarkHTML('<重点>', base);
    expect(html).toContain('background:#d1fae5');
    expect(html).toContain('color:#111827');
    expect(html).toContain('&lt;重点&gt;');
  });
});

describe('buildEndHTML', () => {
  it('classic（默认）：含 END 文字与 line 色横线', () => {
    const html = buildEndHTML(base);
    expect(html).toContain('END');
    expect(html).toContain('#e5e7eb');
    expect(html).toContain('letter-spacing:4px');
  });
  it('aurora：流光渐变带', () => {
    const html = buildEndHTML({ ...base, endStyle: 'aurora' });
    expect(html).toContain('linear-gradient');
    expect(html).toContain('gzh-aurora');
    expect(html).toContain('data-gzh-end');
    expect(html).not.toContain('END');
  });
  it('pulse：雷达扩散光环', () => {
    const html = buildEndHTML({ ...base, endStyle: 'pulse' });
    expect(html).toContain('gzh-pulse-ring');
    expect(html).toContain('border-radius:50%');
    expect(html).toContain('data-gzh-end');
  });
  it('scan：光束扫描线', () => {
    const html = buildEndHTML({ ...base, endStyle: 'scan' });
    expect(html).toContain('gzh-scan');
    expect(html).toContain('#e5e7eb');
    expect(html).not.toContain('END');
  });
  it('orbit：环绕星轨', () => {
    const html = buildEndHTML({ ...base, endStyle: 'orbit' });
    expect(html).toContain('gzh-orbit');
    expect(html).toContain('border:1px dashed');
    expect(html).toContain('data-gzh-end');
  });
  it('neon：霓虹灯牌边框闪烁', () => {
    const html = buildEndHTML({ ...base, endStyle: 'neon' });
    expect(html).toContain('gzh-neon-frame');
    expect(html).toContain('border-radius:8px');
    expect(html).toContain('text-shadow');
    expect(html).not.toContain('END');
  });
  it('pixel：方块逐格点亮', () => {
    const html = buildEndHTML({ ...base, endStyle: 'pixel' });
    expect(html).toContain('gzh-pixel');
    expect(html).toContain('animation-delay:.6s');
    expect(html).toContain('data-gzh-end');
  });
  it('breathe：三层光晕涟漪扩散', () => {
    const html = buildEndHTML({ ...base, endStyle: 'breathe' });
    expect(html).toContain('gzh-breathe-halo');
    expect(html).toContain('radial-gradient');
    expect(html).toContain('animation-delay:2s');
    expect(html).not.toContain('END');
  });
  it('equalizer：声浪柱跳动', () => {
    const html = buildEndHTML({ ...base, endStyle: 'equalizer' });
    expect(html).toContain('gzh-eq');
    expect(html).toContain('scaleY');
    expect(html).toContain('data-gzh-end');
  });
  it('datastream：码流明灭 + 块状光标', () => {
    const html = buildEndHTML({ ...base, endStyle: 'datastream' });
    expect(html).toContain('gzh-data-cursor');
    expect(html).toContain('monospace');
    expect(html).not.toContain('END');
  });
  it('particle：星火升腾', () => {
    const html = buildEndHTML({ ...base, endStyle: 'particle' });
    expect(html).toContain('gzh-particle');
    expect(html).toContain('translateY(-20px)');
    expect(html).toContain('data-gzh-end');
  });
  it('holo：幻彩光带色相流转', () => {
    const html = buildEndHTML({ ...base, endStyle: 'holo' });
    expect(html).toContain('gzh-holo');
    expect(html).toContain('hue-rotate');
    expect(html).toContain('repeating-linear-gradient');
    expect(html).not.toContain('END');
  });
});
