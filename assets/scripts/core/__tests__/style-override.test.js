import { describe, it, expect } from 'vitest';
import {
  normalizeStyleOverride,
  declarationMerge,
  mergeTheme,
  gzhFallbackFromStyles,
  readParamFromStyles,
  parseDeclarations,
  serializeDeclarations,
  parseAttrLine,
  serializeStyleFrontMatter,
  parseStyleFrontMatter,
  insertBoxMarkdown,
  normalizeTokenHex,
  BRUSH_CLASSES
} from '../style-override.js';

const baseTheme = {
  name: '测试主题',
  gzh: {
    body: '#52525B', title: '#27272A', muted: '#A1A1AA', line: '#E4E4E7',
    accent: '#27272A', soft: '#FAFAFA', tagBg: '#F4F4F5',
    numStyle: 'watermark'
  },
  styles: {
    container: 'max-width: 100%; font-size: 15px; line-height: 1.8; color: #52525B;',
    p: 'margin: 0 10px 22px; font-size: 15px; line-height: 1.8 !important; color: #52525B !important;',
    h2: 'font-size: 19px; font-weight: 800; color: #27272A !important;',
    h3: 'font-size: 15px; color: #27272A !important; border-left: 3px solid #27272A;',
    strong: 'font-weight: 700; color: #27272A !important;',
    blockquote: 'border-left: 3px solid #27272A; color: #27272A !important;',
    hr: 'border: none; height: 1px; background: #E4E4E7;',
    th: 'background: #FAFAFA !important; color: #27272A !important;',
    code: 'background: #F4F4F5 !important;'
  }
};

describe('normalizeStyleOverride', () => {
  it('非法输入返回 {}', () => {
    expect(normalizeStyleOverride(null)).toEqual({});
    expect(normalizeStyleOverride('x')).toEqual({});
    expect(normalizeStyleOverride(undefined)).toEqual({});
  });

  it('合法 token 归一化为 #rrggbb（小写）', () => {
    const out = normalizeStyleOverride({ tokens: { accent: '#B22222', body: 'fff' } });
    expect(out.tokens).toEqual({ accent: '#b22222', body: '#ffffff' });
  });

  it('非法 hex 被丢弃', () => {
    expect(normalizeStyleOverride({ tokens: { accent: 'red', body: '#12345' } })).toEqual({});
  });

  it('params 越界被丢弃、范围内保留并四舍五入', () => {
    const out = normalizeStyleOverride({ params: { bodyFontSize: 99, lineHeight: 1.934, paraSpacing: 20, letterSpacing: -2, contentPaddingX: 10 } });
    expect(out.params).toEqual({ lineHeight: 1.93, paraSpacing: 20, contentPaddingX: 10 });
  });

  it('elements 只保留合法 selector 与字符串值', () => {
    const out = normalizeStyleOverride({
      elements: {
        h2: 'font-size: 20px; color: red !important;',
        'tbody tr:nth-child(even)': 'background: rgba(0,0,0,0.05) !important;',
        'bad;selector': 'x: 1',
        '123': 'y: 2',
        p2: 42
      }
    });
    expect(out.elements).not.toHaveProperty('bad;selector');
    expect(out.elements).not.toHaveProperty('123');
    expect(out.elements).not.toHaveProperty('p2');
    expect(out.elements).toHaveProperty('h2');
    expect(out.elements).toHaveProperty('tbody tr:nth-child(even)');
  });
});

describe('declarationMerge', () => {
  it('覆盖值胜出，输出统一去 !important', () => {
    const merged = declarationMerge(
      'color: #52525B !important; line-height: 1.8 !important;',
      'color: #3C3C3C'
    );
    expect(merged).toContain('color: #3C3C3C');
    expect(merged).not.toContain('color: #52525B');
    expect(merged).not.toMatch(/color:\s*#3C3C3C\s*!/);
    expect(merged).toContain('line-height: 1.8 !important');
  });

  it('覆盖值为 !important 时同样去除', () => {
    const merged = declarationMerge('color: #000;', 'color: #fff !important');
    expect(merged).toBe('color: #fff');
  });

  it('保留主题独有的声明', () => {
    const merged = declarationMerge('font-size: 15px; color: #000;', 'letter-spacing: 0.5px');
    expect(parseDeclarations(merged)).toMatchObject({ 'font-size': '15px', color: '#000', 'letter-spacing': '0.5px' });
  });
});

describe('gzhFallbackFromStyles', () => {
  it('从无 gzh 的主题反推语义色（统一小写 hex）', () => {
    const fallback = gzhFallbackFromStyles(baseTheme.styles);
    expect(fallback.body).toBe('#52525b');
    expect(fallback.accent).toBe('#27272a');
    expect(fallback.line).toBe('#e4e4e7');
    expect(fallback.soft).toBe('#fafafa');
  });
});

describe('mergeTheme', () => {
  it('L1 tokens 联动替换 styles 中的主题原色', () => {
    const merged = mergeTheme(baseTheme, { tokens: { accent: '#B22222' } });
    expect(merged.gzh.accent).toBe('#b22222');
    expect(merged.styles.h2).toContain('color: #b22222 !important');
    expect(merged.styles.blockquote).toContain('color: #b22222');
    // 未覆盖的 body 颜色保持不变
    expect(merged.styles.p).toContain('color: #52525B');
  });

  it('L2 elements 声明级合并（覆盖值去 !important，主题其余声明保留）', () => {
    const merged = mergeTheme(baseTheme, {
      elements: { h2: 'color: #00AA00; font-size: 22px !important;' }
    });
    const css = parseDeclarations(merged.styles.h2);
    expect(css.color).toBe('#00AA00');
    expect(css['font-size']).toBe('22px');
    expect(css['font-weight']).toBe('800');
  });

  it('L1 params 按映射改写 p 与 container', () => {
    const merged = mergeTheme(baseTheme, {
      params: { bodyFontSize: 16, lineHeight: 2, paraSpacing: 28, letterSpacing: 1.5, contentPaddingX: 10 }
    });
    expect(parseDeclarations(merged.styles.p)['font-size']).toBe('16px');
    expect(parseDeclarations(merged.styles.container)['font-size']).toBe('16px');
    expect(parseDeclarations(merged.styles.p)['line-height']).toBe('2');
    expect(parseDeclarations(merged.styles.p)['margin-bottom']).toBe('28px');
    expect(parseDeclarations(merged.styles.container)['letter-spacing']).toBe('1.5px');
    expect(parseDeclarations(merged.styles.container)['padding-left']).toBe('10px');
    expect(parseDeclarations(merged.styles.container)['padding-right']).toBe('10px');
  });

  it('字间距覆盖同时改写 p/li/blockquote，避免各元素自带 letter-spacing 覆盖容器继承值', () => {
    const theme = {
      ...baseTheme,
      styles: {
        ...baseTheme.styles,
        container: 'font-size: 15px; letter-spacing: 0.3px;',
        p: 'font-size: 15px; letter-spacing: 0.3px;',
        li: 'font-size: 14px; letter-spacing: 0.2px;',
        blockquote: 'letter-spacing: 0.1px;'
      }
    };
    const merged = mergeTheme(theme, { params: { letterSpacing: 2 } });
    expect(parseDeclarations(merged.styles.container)['letter-spacing']).toBe('2px');
    expect(parseDeclarations(merged.styles.p)['letter-spacing']).toBe('2px');
    expect(parseDeclarations(merged.styles.li)['letter-spacing']).toBe('2px');
    expect(parseDeclarations(merged.styles.blockquote)['letter-spacing']).toBe('2px');
  });

  it('readParamFromStyles 可回显当前值', () => {
    const merged = mergeTheme(baseTheme, { params: { lineHeight: 1.9, contentPaddingX: 16 } });
    expect(readParamFromStyles(merged.styles, 'lineHeight')).toBe(1.9);
    expect(readParamFromStyles(merged.styles, 'contentPaddingX')).toBe(16);
    expect(readParamFromStyles(baseTheme.styles, 'lineHeight')).toBe(1.8);
  });

  it('readParamFromStyles 回显字间距当前值（覆盖优先，其次模板默认）', () => {
    const theme = { ...baseTheme, styles: { ...baseTheme.styles, container: 'font-size: 15px; letter-spacing: 0.3px;' } };
    expect(readParamFromStyles(theme.styles, 'letterSpacing')).toBe(0.3);
    const merged = mergeTheme(theme, { params: { letterSpacing: 1.5 } });
    expect(readParamFromStyles(merged.styles, 'letterSpacing')).toBe(1.5);
  });

  it('空覆盖 = 原样返回', () => {
    const merged = mergeTheme(baseTheme, null);
    expect(merged.styles).toEqual(baseTheme.styles);
    expect(merged.gzh).toEqual(baseTheme.gzh);
  });
});

describe('parseAttrLine', () => {
  it('识别段落末尾的 {.class} 行', () => {
    expect(parseAttrLine('这是内容\n{.ogzh-info}')).toEqual({
      classes: ['ogzh-info'],
      content: '这是内容'
    });
  });

  it('识别多 class', () => {
    const parsed = parseAttrLine('内容\n{.ogzh-info .ogzh-callout}');
    expect(parsed.classes).toEqual(['ogzh-info', 'ogzh-callout']);
  });

  it('不误伤普通文本', () => {
    expect(parseAttrLine('普通段落')).toBeNull();
    expect(parseAttrLine('代码 {.foo} 中间')).toBeNull();
  });
});

describe('front matter', () => {
  it('round-trip 序列化与解析', () => {
    const override = { tokens: { accent: '#B22222' }, params: { bodyFontSize: 16 }, elements: { h2: 'color: #00AA00;' } };
    const serialized = serializeStyleFrontMatter(override);
    expect(serialized).toContain('opengzh-style: true');

    const source = `${serialized}# 标题\n\n正文内容\n`;
    const parsed = parseStyleFrontMatter(source);
    expect(parsed.content).toBe('# 标题\n\n正文内容\n');
    expect(parsed.styleOverride.tokens.accent).toBe('#b22222');
    expect(parsed.styleOverride.params.bodyFontSize).toBe(16);
    expect(parsed.styleOverride.elements.h2).toContain('#00AA00');
  });

  it('认识不到的 front matter 不剥离', () => {
    const source = '---\nauthor: pasca\n---\n正文';
    const parsed = parseStyleFrontMatter(source);
    expect(parsed.styleOverride).toBeNull();
    expect(parsed.content).toBe(source);
  });

  it('无覆盖时不序列化', () => {
    expect(serializeStyleFrontMatter({})).toBe('');
  });
});

describe('盒子与刷子', () => {
  it('insertBoxMarkdown 输出带 {.ogzh-*} 标记的模板', () => {
    expect(insertBoxMarkdown('info')).toContain('{.ogzh-info}');
    expect(insertBoxMarkdown('steps')).toContain('ogzh-steps');
    expect(insertBoxMarkdown('unknown')).toBe('');
  });

  it('BRUSH_CLASSES 与盒子模板一致', () => {
    expect(BRUSH_CLASSES).toContain('ogzh-info');
    expect(BRUSH_CLASSES.length).toBeGreaterThanOrEqual(5);
  });

  it('normalizeTokenHex 处理 #rgb / 大写', () => {
    expect(normalizeTokenHex('#fff')).toBe('#ffffff');
    expect(normalizeTokenHex('#B22222')).toBe('#b22222');
    expect(normalizeTokenHex('nope')).toBeNull();
  });
});

describe('序列化声明往返', () => {
  it('serializeDeclarations(parseDeclarations(css)) 保持键值', () => {
    const css = 'color: #52525B !important; line-height: 1.8;';
    const round = serializeDeclarations(parseDeclarations(css));
    expect(parseDeclarations(round)).toEqual(parseDeclarations(css));
  });
});
