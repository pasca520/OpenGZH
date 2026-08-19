import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseXhsDocument } from '../semantic-parser.js';
import { paginateXhsDocument } from '../paginator.js';
import { renderXhsPage } from '../renderer.js';

const fixture = readFileSync(fileURLToPath(new URL('./fixtures/comprehensive.md', import.meta.url)), 'utf8');

const settings = {
  themeId: 'minimal-white', density: 'standard', tocEnabled: false,
  footer: { authorEnabled: true },
  cover: { titleOverride: '', summaryOverride: '', author: '测试作者', imageRef: null, focalPoint: { x: 50, y: 50 } }
};

function token(type, map, extra = {}) {
  return { type, map, level: 0, tag: '', nesting: 0, content: '', children: null, ...extra };
}

const L = (line) => [line, line + 1];

function textToken(content) {
  return token('text', null, { content });
}

function inlineToken(line, content, children) {
  return token('inline', L(line), { content, children });
}

function heading(line, content) {
  return [
    token('heading_open', L(line), { tag: 'h2', nesting: 1 }),
    inlineToken(line, content, [textToken(content)]),
    token('heading_close', null, { tag: 'h2', nesting: -1 })
  ];
}

function paragraph(line, content) {
  return [
    token('paragraph_open', L(line), { tag: 'p', nesting: 1 }),
    inlineToken(line, content, [textToken(content)]),
    token('paragraph_close', null, { tag: 'p', nesting: -1 })
  ];
}

function imageParagraph(line, alt, src) {
  return [
    token('paragraph_open', L(line), { tag: 'p', nesting: 1 }),
    inlineToken(line, alt, [token('image', null, { attrs: [['src', src], ['alt', alt]], content: alt })]),
    token('paragraph_close', null, { tag: 'p', nesting: -1 })
  ];
}

function buildFixtureTokens() {
  const tokens = [];

  tokens.push(
    token('heading_open', L(0), { tag: 'h1', nesting: 1 }),
    inlineToken(0, '小红书图片模式测试文章', [textToken('小红书图片模式测试文章')]),
    token('heading_close', null, { tag: 'h1', nesting: -1 })
  );

  tokens.push(
    token('paragraph_open', L(2), { tag: 'p', nesting: 1 }),
    inlineToken(2, '这是首段，包含一个链接和加粗与斜体。', [
      textToken('这是首段，包含一个'),
      token('link_open', null, { tag: 'a', nesting: 1, attrs: [['href', 'https://example.com']] }),
      textToken('链接'),
      token('link_close', null, { tag: 'a', nesting: -1 }),
      textToken('和加粗与斜体。')
    ]),
    token('paragraph_close', null, { tag: 'p', nesting: -1 })
  );

  tokens.push(...heading(4, '第一节：短段落'));
  tokens.push(...paragraph(6, '这是第一节的第一段内容。'));
  tokens.push(...paragraph(8, '这是第一节的第二段内容。'));
  tokens.push(...heading(10, '第二节：超长中文段落'));
  tokens.push(...paragraph(12, '从前有一个很长的故事，它讲述了非常多的细节。第一句话介绍了背景。第二句话介绍了人物。第三句话介绍了冲突。第四句话介绍了转折。第五句话介绍了结局。第六句话还有补充。第七句话做总结。第八句话收尾。'));

  tokens.push(
    token('blockquote_open', L(14), { tag: 'blockquote', nesting: 1 }),
    token('paragraph_open', L(14), { tag: 'p', nesting: 1, level: 1 }),
    inlineToken(14, '引用块内容，包含一个引用链接。', [
      textToken('引用块内容，包含一个'),
      token('link_open', null, { tag: 'a', nesting: 1, attrs: [['href', 'https://example.com/q']] }),
      textToken('引用链接'),
      token('link_close', null, { tag: 'a', nesting: -1 }),
      textToken('。')
    ]),
    token('paragraph_close', null, { tag: 'p', nesting: -1, level: 1 }),
    token('blockquote_close', null, { tag: 'blockquote', nesting: -1 })
  );

  tokens.push(token('bullet_list_open', [16, 26], { tag: 'ul', nesting: 1 }));
  for (let index = 0; index < 10; index += 1) {
    tokens.push(
      token('list_item_open', L(16 + index), { tag: 'li', nesting: 1, level: 1 }),
      inlineToken(16 + index, `列表项 ${index + 1}`, [textToken(`列表项 ${index + 1}`)]),
      token('list_item_close', null, { tag: 'li', nesting: -1, level: 1 })
    );
  }
  tokens.push(token('bullet_list_close', null, { tag: 'ul', nesting: -1 }));

  tokens.push(token('html_block', L(27), { content: '<!-- xhs-page -->' }));

  tokens.push(...imageParagraph(29, '本地图片', 'img://fixture-local-image'));
  tokens.push(...imageParagraph(31, '远程图片', 'https://cdn.example.com/remote.png'));
  tokens.push(...imageParagraph(33, 'GIF 动图', 'img://fixture-gif'));
  tokens.push(token('html_block', L(35), { content: '<video src="img://fixture-video"></video>' }));

  const codeLines = Array.from({ length: 25 }, (_, index) => index === 0
    ? 'import os'
    : `line_${String(index + 1).padStart(2, '0')} = "${['second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth', 'twenty-first', 'twenty-second', 'twenty-third', 'twenty-fourth', 'twenty-fifth'][index - 1]}"`);
  tokens.push(token('fence', [37, 64], { tag: 'code', content: codeLines.join('\n'), info: 'python' }));

  tokens.push(
    token('table_open', [65, 88], { tag: 'table', nesting: 1 }),
    token('thead_open', [65, 66], { tag: 'thead', nesting: 1, level: 1 }),
    token('tr_open', [65, 66], { tag: 'tr', nesting: 1, level: 2 }),
    token('th_open', [65, 66], { tag: 'th', nesting: 1, level: 3 }), inlineToken(65, '列A', [textToken('列A')]), token('th_close', null, { tag: 'th', nesting: -1, level: 3 }),
    token('th_open', [65, 66], { tag: 'th', nesting: 1, level: 3 }), inlineToken(65, '列B', [textToken('列B')]), token('th_close', null, { tag: 'th', nesting: -1, level: 3 }),
    token('tr_close', null, { tag: 'tr', nesting: -1, level: 2 }),
    token('thead_close', null, { tag: 'thead', nesting: -1, level: 1 }),
    token('tbody_open', [66, 88], { tag: 'tbody', nesting: 1, level: 1 })
  );
  for (let row = 0; row < 20; row += 1) {
    const line = 66 + row;
    tokens.push(
      token('tr_open', L(line), { tag: 'tr', nesting: 1, level: 2 }),
      token('td_open', L(line), { tag: 'td', nesting: 1, level: 3 }), inlineToken(line, `${row + 1}a`, [textToken(`${row + 1}a`)]), token('td_close', null, { tag: 'td', nesting: -1, level: 3 }),
      token('td_open', L(line), { tag: 'td', nesting: 1, level: 3 }), inlineToken(line, `${row + 1}b`, [textToken(`${row + 1}b`)]), token('td_close', null, { tag: 'td', nesting: -1, level: 3 }),
      token('tr_close', null, { tag: 'tr', nesting: -1, level: 2 })
    );
  }
  tokens.push(
    token('tbody_close', null, { tag: 'tbody', nesting: -1, level: 1 }),
    token('table_close', null, { tag: 'table', nesting: -1 })
  );

  tokens.push(
    token('paragraph_open', L(88), { tag: 'p', nesting: 1 }),
    inlineToken(88, '行内公式 的段落。', [
      textToken('行内公式 '),
      token('math_inline', null, { content: 'E = mc^2' }),
      textToken(' 的段落。')
    ]),
    token('paragraph_close', null, { tag: 'p', nesting: -1 })
  );

  tokens.push(token('math_block', [90, 91], { content: 'E = \\int_0^\\infty e^{-x^2} dx', tag: 'math' }));

  tokens.push(...heading(92, '最后一节'));
  tokens.push(...paragraph(94, '结尾段落。'));
  return tokens;
}

function makeFakeEngine() {
  return {
    parse: () => buildFixtureTokens(),
    renderer: {
      render(tokens) {
        const inline = tokens.find((item) => item.type === 'inline');
        const text = inline ? inline.content : '';
        if (tokens.some((item) => item.type === 'heading_open')) {
          const open = tokens.find((item) => item.type === 'heading_open');
          return `<${open.tag}>${text}</${open.tag}>`;
        }
        if (tokens.some((item) => item.type === 'paragraph_open')) return `<p>${text}</p>`;
        if (tokens.some((item) => item.type === 'bullet_list_open')) {
          const count = tokens.filter((item) => item.type === 'list_item_open').length;
          return `<ul>${'<li>x</li>'.repeat(count)}</ul>`;
        }
        if (tokens.some((item) => item.type === 'blockquote_open')) return `<blockquote>${text}</blockquote>`;
        if (tokens.some((item) => item.type === 'math_block')) return `<span class="katex">${text}</span>`;
        if (tokens.some((item) => item.type === 'fence')) return `<pre><code>${text}</code></pre>`;
        if (tokens.some((item) => item.type === 'table_open')) return '<table></table>';
        return '';
      }
    }
  };
}

function blockWeight(block) {
  switch (block.type) {
    case 'heading': return 0.5;
    case 'quote': return 1.5;
    case 'image': return 1;
    case 'formula': return 1.2;
    case 'html': return 1;
    case 'paragraph': return Math.max(1, block.text.length / 40);
    case 'list': return (block.data.items || []).length;
    case 'table': return (block.data.rows || []).length * 1.2;
    case 'code': return (block.data.lines || []).length;
    default: return 1;
  }
}

const fakeFits = async (blocks) => blocks.reduce((sum, block) => sum + blockWeight(block), 0) <= 10;

describe('xhs integration contract', () => {
  it('keeps the first h1 for the cover, strips links and preserves the first paragraph in body', async () => {
    const parsed = parseXhsDocument(fixture, makeFakeEngine());
    expect(parsed.meta.title).toBe('小红书图片模式测试文章');
    expect(parsed.meta.summary).toContain('链接');
    const pages = await paginateXhsDocument(parsed, settings, { fits: fakeFits });
    expect(pages[0].kind).toBe('cover');
    expect(pages[0].variant).toBe('cover');
    const bodyHasH1 = pages.slice(1).some((page) => page.blocks.some((block) => block.type === 'heading' && block.data.level === 1));
    expect(bodyHasH1).toBe(false);
    const firstBodyPage = pages.slice(1).find((page) => page.blocks.length);
    const rendered = renderXhsPage(firstBodyPage, settings, { meta: parsed.meta });
    expect(rendered).toContain('链接');
    expect(rendered).not.toContain('<a ');
    expect(parsed.blocks.some((block) => block.type === 'paragraph' && block.text.includes('链接'))).toBe(true);
  });

  it('honors the manual marker without leaking it into rendered output', async () => {
    const parsed = parseXhsDocument(fixture, makeFakeEngine());
    const marker = parsed.blocks.find((block) => block.type === 'page-break');
    expect(marker).toBeTruthy();
    const pages = await paginateXhsDocument(parsed, settings, { fits: fakeFits });
    expect(pages.some((page) => page.blocks.some((block) => block.type === 'page-break'))).toBe(false);
    const manualPage = pages.find((page) => page.manualBreakBefore);
    expect(manualPage).toBeTruthy();
    expect(manualPage.manualBreakMarkerStart).toBe(marker.sourceStart);
    const allRendered = pages.map((page) => renderXhsPage(page, settings, { meta: parsed.meta })).join('');
    expect(allRendered).not.toContain('<!-- xhs-page -->');
    expect(allRendered).not.toMatch(/xhs-page\s*-->/);
  });

  it('splits the 20-row table into chunks with repeated headers', async () => {
    const parsed = parseXhsDocument(fixture, makeFakeEngine());
    const pages = await paginateXhsDocument(parsed, settings, { fits: fakeFits });
    const chunks = pages.flatMap((page) => page.blocks).filter((block) => block.type === 'table');
    expect(chunks.reduce((sum, chunk) => sum + chunk.data.rows.length, 0)).toBe(20);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.data.headers).toEqual(['列A', '列B']);
    }
  });

  it('keeps code line numbers continuous across chunks', async () => {
    const parsed = parseXhsDocument(fixture, makeFakeEngine());
    const pages = await paginateXhsDocument(parsed, settings, { fits: fakeFits });
    const chunks = pages.flatMap((page) => page.blocks).filter((block) => block.type === 'code');
    expect(chunks.reduce((sum, chunk) => sum + chunk.data.lines.length, 0)).toBe(25);
    let expectedStart = 1;
    for (const chunk of chunks) {
      expect(chunk.data.startLineNumber).toBe(expectedStart);
      expectedStart += chunk.data.lines.length;
    }
    expect(chunks.every((chunk) => chunk.data.language === 'python')).toBe(true);
  });

  it('preserves every source block id in order, exactly once or as contiguous chunks', async () => {
    const parsed = parseXhsDocument(fixture, makeFakeEngine());
    const sourceIds = parsed.blocks.filter((block) => block.type !== 'page-break').map((block) => block.id);
    const pages = await paginateXhsDocument(parsed, settings, { fits: fakeFits });
    const bases = pages.flatMap((page) => page.blocks).map((block) => block.id.split('#')[0]);
    expect(new Set(bases)).toEqual(new Set(sourceIds));
    const seen = new Set();
    const firstOrder = [];
    for (const base of bases) {
      if (!seen.has(base)) {
        seen.add(base);
        firstOrder.push(base);
      }
    }
    expect(firstOrder).toEqual(sourceIds);
    for (const id of sourceIds) {
      const occurrences = [];
      bases.forEach((base, index) => {
        if (base === id) occurrences.push(index);
      });
      expect(occurrences).toEqual(Array.from({ length: occurrences.length }, (_, i) => occurrences[0] + i));
    }
  });

  it('numbers pages from the cover and matches array indexes', async () => {
    const parsed = parseXhsDocument(fixture, makeFakeEngine());
    const pages = await paginateXhsDocument(parsed, settings, { fits: fakeFits });
    pages.forEach((page, index) => {
      expect(page.pageNumber).toBe(index + 1);
      expect(page.totalPages).toBe(pages.length);
    });
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].kind).toBe('cover');
  });

  it('adds exactly one toc page when enabled without reordering body blocks', async () => {
    const parsed = parseXhsDocument(fixture, makeFakeEngine());
    const without = await paginateXhsDocument(parsed, settings, { fits: fakeFits });
    const withToc = await paginateXhsDocument(parsed, { ...settings, tocEnabled: true }, { fits: fakeFits });
    expect(withToc.length).toBe(without.length + 1);
    expect(withToc[1].kind).toBe('toc');
    const bodyOf = (pages) => pages.filter((page) => page.kind === 'content').flatMap((page) => page.blocks).map((block) => block.id);
    expect(bodyOf(withToc)).toEqual(bodyOf(without));
  });
});
