import { describe, it, expect } from 'vitest';
import { pad2, accentOf, darken, buildH2WrapperHTML, buildMarkHTML, buildEndHTML } from '../gzh-structure.js';

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

describe('darken', () => {
  it('按系数加深并保持色相（白字/浅色在微信反色后可读）', () => {
    expect(darken('#059669')).toBe('#035a3f');
    expect(darken('#A259FF')).toBe('#613599');
    expect(darken('#ffffff')).toBe('#999999');
  });
  it('非法输入原样返回', () => {
    expect(darken('transparent')).toBe('transparent');
    expect(darken('')).toBe('');
  });
});

describe('buildH2WrapperHTML', () => {
  it('badge：居中深彩圆章 + 白字编号 + 插槽', () => {
    const html = buildH2WrapperHTML(1, base);
    expect(html).toContain('border-radius:50%');
    expect(html).toContain('text-align:center');
    expect(html).toContain('>01<');
    expect(html).toContain('data-gzh-slot');
    expect(html).toContain('background:#035a3f');
    expect(html).toContain('color:#ffffff');
  });
  it('chip：soft 浅底色带页眉 + 深色编号', () => {
    const html = buildH2WrapperHTML(2, { ...base, numStyle: 'chip' });
    expect(html).toContain('background:#ecfdf5');
    expect(html).toContain('color:#035a3f');
    expect(html).toContain('font-size:22px');
    expect(html).toContain('display:flex');
    expect(html).toContain('>02<');
  });
  it('watermark：44px 水印数字用黑色低透明度（反色后成淡白水印）', () => {
    const html = buildH2WrapperHTML(3, { ...base, numStyle: 'watermark' });
    expect(html).toContain('font-size:44px');
    expect(html).toContain('color:rgba(0,0,0,0.07)');
    expect(html).toContain('>03<');
    // 分隔线仍用 line 色
    expect(html).toContain('border-bottom:1px solid #e5e7eb');
  });
  it('plain：26px 深色大编号堆叠 + 44px 短横线', () => {
    const html = buildH2WrapperHTML(1, { ...base, numStyle: 'plain' });
    expect(html).toContain('font-size:26px');
    expect(html).toContain('font-weight:900');
    expect(html).toContain('color:#035a3f');
    expect(html).toContain('width:44px');
  });
  it('palette 主题编号徽标用轮转色加深版', () => {
    const g = { ...base, palette: ['#F24E1E', '#A259FF'] };
    expect(buildH2WrapperHTML(2, g)).toContain('background:#613599');
  });
  it('深色底主题（有 bg）微信不反色，编号保持原色不加深', () => {
    const dark = { ...base, bg: '#191414', numStyle: 'plain' };
    const html = buildH2WrapperHTML(1, dark);
    expect(html).toContain('color:#059669');
    expect(html).not.toContain('color:#035a3f');
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
    expect(html).toContain('translateY(-16px)');
    expect(html).toContain('data-gzh-end');
  });
  it('holo：幻彩光带色相流转', () => {
    const html = buildEndHTML({ ...base, endStyle: 'holo' });
    expect(html).toContain('gzh-holo');
    expect(html).toContain('hue-rotate');
    expect(html).toContain('repeating-linear-gradient');
    expect(html).not.toContain('END');
  });
  it('全部结尾样式不含 position 定位（公众号会剥离，静态布局必须成立）', () => {
    const styles = ['classic', 'aurora', 'pulse', 'scan', 'orbit', 'neon', 'pixel', 'breathe', 'equalizer', 'datastream', 'particle', 'holo'];
    styles.forEach((endStyle) => {
      const html = buildEndHTML({ ...base, endStyle });
      expect(html).not.toMatch(/(?<![\w-])position:/);
    });
  });
});
