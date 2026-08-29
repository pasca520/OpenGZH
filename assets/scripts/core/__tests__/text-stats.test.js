import { describe, it, expect } from 'vitest';
import { extractBodyText, countChars, countWords } from '../text-stats.js';

/** 构造 markdown-it 风格的 block token 数组（仅覆盖统计关心的字段）。 */
function inline(children) {
  return { type: 'inline', children };
}
function text(content) {
  return { type: 'text', content };
}
function block(type) {
  return { type };
}

describe('extractBodyText', () => {
  it('统计段落正文，忽略结构 token', () => {
    const tokens = [
      block('heading_open'),
      inline([text('标题')]),
      block('heading_close'),
      block('paragraph_open'),
      inline([text('这是正文。')]),
      block('paragraph_close')
    ];
    expect(extractBodyText(tokens)).toBe('标题\n这是正文。');
  });

  it('不统计 markdown 语法符号（#、**、` 等只出现在结构 token 中）', () => {
    const tokens = [
      block('paragraph_open'),
      inline([text('加粗'), text('文本')]),
      block('paragraph_close')
    ];
    const body = extractBodyText(tokens);
    expect(body).toBe('加粗文本');
    expect(body).not.toMatch(/[*#`]/);
  });

  it('图片地址与 alt 不计入正文', () => {
    const tokens = [
      block('paragraph_open'),
      inline([
        text('配图：'),
        { type: 'image', content: 'alt文字', attrs: [['src', 'https://cdn.example.com/x.png']] },
        text('如上。')
      ]),
      block('paragraph_close')
    ];
    expect(extractBodyText(tokens)).toBe('配图：如上。');
  });

  it('链接只统计可见文本，不计 URL', () => {
    const tokens = [
      block('paragraph_open'),
      inline([
        { type: 'link_open', attrs: [['href', 'https://example.com/long/path']] },
        text('点击这里'),
        { type: 'link_close' }
      ]),
      block('paragraph_close')
    ];
    expect(extractBodyText(tokens)).toBe('点击这里');
  });

  it('代码块内容属于正文', () => {
    const tokens = [
      { type: 'fence', content: 'const a = 1;\nconsole.log(a);' }
    ];
    expect(extractBodyText(tokens)).toContain('const a = 1;');
  });

  it('原始 HTML 块剥离标签后计入正文', () => {
    const tokens = [
      { type: 'html_block', content: '<div class="box"><b>重点</b>内容</div>' }
    ];
    expect(extractBodyText(tokens).replace(/\s+/g, '')).toBe('重点内容');
  });

  it('块级公式源码计入正文', () => {
    const tokens = [
      { type: 'math_block', content: 'x^2 + y^2 = z^2' }
    ];
    expect(extractBodyText(tokens)).toBe('x^2 + y^2 = z^2');
  });

  it('换行符计入分隔但字符统计时不占字符', () => {
    const tokens = [inline([text('第一行'), { type: 'softbreak' }, text('第二行')])];
    expect(extractBodyText(tokens)).toBe('第一行 第二行');
    expect(countChars(extractBodyText(tokens))).toBe(6);
  });
});

describe('countChars', () => {
  it('忽略空白（空格、换行）', () => {
    expect(countChars('你好 world\n第二行')).toBe(10); // 5 中文 + 5 英文
  });
  it('标点计入字符', () => {
    expect(countChars('你好，world!')).toBe(9);
  });
});

describe('countWords', () => {
  it('汉字逐个计 + 英文按词计', () => {
    expect(countWords('你好 world 123')).toBe(4); // 2 汉字 + 2 英文/数字词
  });
  it('纯中文', () => {
    expect(countWords('这是一段正文')).toBe(6);
  });
  it('空文本为 0', () => {
    expect(countWords('')).toBe(0);
    expect(countChars('')).toBe(0);
  });
});