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
  it('badge：圆角徽标 + 编号 + 插槽', () => {
    const html = buildH2WrapperHTML(1, base);
    expect(html).toContain('border-radius:9999px');
    expect(html).toContain('>01<');
    expect(html).toContain('data-gzh-slot');
    expect(html).toContain('background:#059669');
  });
  it('chip：方框描边', () => {
    const html = buildH2WrapperHTML(2, { ...base, numStyle: 'chip' });
    expect(html).toContain('border:1.5px solid');
    expect(html).toContain('>02<');
  });
  it('watermark：44px 水印大号数字用 line 色', () => {
    const html = buildH2WrapperHTML(3, { ...base, numStyle: 'watermark' });
    expect(html).toContain('font-size:44px');
    expect(html).toContain('color:#e5e7eb');
    expect(html).toContain('>03<');
  });
  it('plain：小编号 + 36px 短横线', () => {
    const html = buildH2WrapperHTML(1, { ...base, numStyle: 'plain' });
    expect(html).toContain('letter-spacing:3px');
    expect(html).toContain('width:36px');
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
  it('dots：三个圆点', () => {
    const html = buildEndHTML({ ...base, endStyle: 'dots' });
    expect(html).toContain('border-radius:50%');
    expect(html).toContain('data-gzh-end');
    expect(html).not.toContain('END');
  });
  it('diamond：菱形符号', () => {
    const html = buildEndHTML({ ...base, endStyle: 'diamond' });
    expect(html).toContain('◆');
    expect(html).toContain('#9ca3af');
  });
  it('asterism：三个星号', () => {
    const html = buildEndHTML({ ...base, endStyle: 'asterism' });
    expect(html).toContain('*');
    expect(html).toContain('data-gzh-end');
  });
  it('wave：波浪线', () => {
    const html = buildEndHTML({ ...base, endStyle: 'wave' });
    expect(html).toContain('～');
    expect(html).toContain('#e5e7eb');
  });
  it('feather：羽毛装饰', () => {
    const html = buildEndHTML({ ...base, endStyle: 'feather' });
    expect(html).toContain('❦');
    expect(html).toContain('data-gzh-end');
  });
  it('minimal：极简单线无文字', () => {
    const html = buildEndHTML({ ...base, endStyle: 'minimal' });
    expect(html).toContain('width:80px');
    expect(html).not.toContain('END');
    expect(html).not.toContain('◆');
  });
  it('ornament：装饰花体', () => {
    const html = buildEndHTML({ ...base, endStyle: 'ornament' });
    expect(html).toContain('❋');
    expect(html).toContain('data-gzh-end');
  });
});
