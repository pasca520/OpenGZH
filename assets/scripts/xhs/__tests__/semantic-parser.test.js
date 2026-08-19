import { describe, expect, it } from 'vitest';
import {
  buildLineOffsets,
  parseXhsDocument,
  renderTokensWithoutLinks,
  sanitizeRawHtmlToken
} from '../semantic-parser.js';

function token(type, map, extra = {}) {
  return { type, map, level: 0, tag: '', nesting: 0, content: '', children: null, ...extra };
}

function makeTokenMarkdownEngine() {
  return {
    parse: () => [
      token('heading_open', [0, 1], { tag: 'h1', nesting: 1 }),
      token('inline', [0, 1], { content: '标题', children: [token('text', null, { content: '标题' })] }),
      token('heading_close', null, { tag: 'h1', nesting: -1 }),
      token('paragraph_open', [2, 3], { tag: 'p', nesting: 1 }),
      token('inline', [2, 3], { content: '这是链接。', children: [
        token('text', null, { content: '这是' }), token('link_open', null),
        token('text', null, { content: '链接' }), token('link_close', null), token('text', null, { content: '。' })
      ] }),
      token('paragraph_close', null, { tag: 'p', nesting: -1 }),
      token('html_block', [4, 5], { content: '<!-- xhs-page -->' }),
      token('heading_open', [6, 7], { tag: 'h2', nesting: 1 }),
      token('inline', [6, 7], { content: '章节', children: [token('text', null, { content: '章节' })] }),
      token('heading_close', null, { tag: 'h2', nesting: -1 }),
      token('bullet_list_open', [8, 10], { tag: 'ul', nesting: 1 }),
      token('list_item_open', [8, 9], { tag: 'li', nesting: 1 }), token('inline', [8, 9], { content: 'A' }), token('list_item_close', null, { nesting: -1 }),
      token('list_item_open', [9, 10], { tag: 'li', nesting: 1 }), token('inline', [9, 10], { content: 'B' }), token('list_item_close', null, { nesting: -1 }),
      token('bullet_list_close', null, { tag: 'ul', nesting: -1 })
    ],
    renderer: {
      render: (tokens) => tokens.some((item) => item.type === 'paragraph_open')
        ? '<p>这是链接。</p>'
        : tokens.some((item) => item.type === 'bullet_list_open') ? '<ul><li>A</li><li>B</li></ul>' : ''
    }
  };
}

describe('xhs semantic parser', () => {
  it('extracts cover metadata and preserves ordered semantic blocks', () => {
    const markdown = `# 标题\n\n这是[链接](https://example.com)。\n\n<!-- xhs-page -->\n\n## 章节\n\n- A\n- B`;
    const fakeMd = makeTokenMarkdownEngine(markdown);
    const result = parseXhsDocument(markdown, fakeMd);
    expect(result.meta.title).toBe('标题');
    expect(result.meta.summary).toBe('这是链接。');
    expect(result.blocks.map((block) => block.type)).toEqual(['paragraph', 'page-break', 'heading', 'list']);
    expect(result.blocks[0].html).not.toContain('<a');
    expect(result.blocks[0].html).toContain('链接');
    expect(result.blocks[0].sourceStart).toBeLessThan(result.blocks[0].sourceEnd);
  });

  it('computes source ranges from line offsets like real markdown-it maps', () => {
    const markdown = `# 标题\n\n这是[链接](https://example.com)。\n\n<!-- xhs-page -->\n\n## 章节\n\n- A\n- B`;
    const offsets = buildLineOffsets(markdown);
    const fakeMd = makeTokenMarkdownEngine();
    const result = parseXhsDocument(markdown, fakeMd);
    expect(result.blocks[0].sourceStart).toBe(offsets[2]);
    expect(result.blocks[0].sourceEnd).toBe(offsets[3]);
    const pageBreak = result.blocks[1];
    expect(pageBreak.type).toBe('page-break');
    expect(pageBreak.sourceStart).toBe(offsets[4]);
    expect(pageBreak.sourceEnd).toBe(offsets[5]);
    expect(pageBreak.html).toBe('');
  });

  it('strips link tokens at token level, never by regex over html', () => {
    const md = {
      renderer: {
        render: (tokens) => JSON.stringify(tokens.flatMap((item) => {
          if (item.type === 'inline') return item.children.map((child) => child.type);
          return [item.type];
        }))
      }
    };
    const html = renderTokensWithoutLinks([
      token('paragraph_open', [0, 1]),
      token('inline', [0, 1], {
        content: 'a b',
        children: [
          token('text', null, { content: 'a' }),
          token('link_open', null, { tag: 'a' }),
          token('text', null, { content: 'b' }),
          token('link_close', null, { tag: 'a' })
        ]
      }),
      token('paragraph_close', null)
    ], md);
    expect(html).not.toContain('link_open');
    expect(html).not.toContain('link_close');
  });

  it('recognizes image-only paragraphs as image blocks', () => {
    const markdown = '![图](img://abc123)\n\n正文';
    const fakeMd = {
      parse: () => [
        token('paragraph_open', [0, 1], { tag: 'p', nesting: 1 }),
        token('inline', [0, 1], {
          content: '图',
          children: [
            token('text', null, { content: '' }),
            token('image', null, { attrs: [['src', 'img://abc123'], ['alt', '图']], content: '图' })
          ]
        }),
        token('paragraph_close', null, { tag: 'p', nesting: -1 }),
        token('paragraph_open', [2, 3], { tag: 'p', nesting: 1 }),
        token('inline', [2, 3], { content: '正文', children: [token('text', null, { content: '正文' })] }),
        token('paragraph_close', null, { tag: 'p', nesting: -1 })
      ],
      renderer: { render: () => '' }
    };
    const result = parseXhsDocument(markdown, fakeMd);
    expect(result.blocks[0].type).toBe('image');
    expect(result.blocks[0].data.images).toEqual([{ src: 'img://abc123', alt: '图' }]);
    expect(result.images.map((image) => image.src)).toEqual(['img://abc123']);
  });

  it('keeps tables with headers and rows from the token stream', () => {
    const markdown = '| a | b |\n| - | - |\n| 1 | 2 |';
    const fakeMd = {
      parse: () => [
        token('table_open', [0, 3], { nesting: 1, tag: 'table' }),
        token('thead_open', [0, 1], { nesting: 1, tag: 'thead' }),
        token('tr_open', [0, 1], { nesting: 1, tag: 'tr' }),
        token('th_open', [0, 1], { nesting: 1, tag: 'th' }), token('inline', [0, 1], { content: 'a' }), token('th_close', null, { nesting: -1, tag: 'th' }),
        token('th_open', [0, 1], { nesting: 1, tag: 'th' }), token('inline', [0, 1], { content: 'b' }), token('th_close', null, { nesting: -1, tag: 'th' }),
        token('tr_close', null, { nesting: -1, tag: 'tr' }),
        token('thead_close', null, { nesting: -1, tag: 'thead' }),
        token('tbody_open', [1, 3], { nesting: 1, tag: 'tbody' }),
        token('tr_open', [2, 3], { nesting: 1, tag: 'tr' }),
        token('td_open', [2, 3], { nesting: 1, tag: 'td' }), token('inline', [2, 3], { content: '1' }), token('td_close', null, { nesting: -1, tag: 'td' }),
        token('td_open', [2, 3], { nesting: 1, tag: 'td' }), token('inline', [2, 3], { content: '2' }), token('td_close', null, { nesting: -1, tag: 'td' }),
        token('tr_close', null, { nesting: -1, tag: 'tr' }),
        token('tbody_close', null, { nesting: -1, tag: 'tbody' }),
        token('table_close', null, { nesting: -1, tag: 'table' })
      ],
      renderer: { render: () => '' }
    };
    const result = parseXhsDocument(markdown, fakeMd);
    expect(result.blocks[0].type).toBe('table');
    expect(result.blocks[0].data.headers).toEqual(['a', 'b']);
    expect(result.blocks[0].data.rows).toEqual([['1', '2']]);
  });

  it('keeps fenced code with language, lines and starting line number', () => {
    const markdown = '```js\nconst a = 1;\nconst b = 2;\n```';
    const fakeMd = {
      parse: () => [
        token('fence', [0, 3], { tag: 'code', content: 'const a = 1;\nconst b = 2;', info: 'js' })
      ],
      renderer: { render: () => '' }
    };
    const result = parseXhsDocument(markdown, fakeMd);
    expect(result.blocks[0].type).toBe('code');
    expect(result.blocks[0].data.language).toBe('js');
    expect(result.blocks[0].data.lines).toEqual(['const a = 1;', 'const b = 2;']);
    expect(result.blocks[0].data.startLineNumber).toBe(1);
  });

  it('recognizes display math as formula blocks', () => {
    const markdown = '$$e^{i\\pi} + 1 = 0$$';
    const fakeMd = {
      parse: () => [
        token('math_block', [0, 2], { content: 'e^{i\\pi} + 1 = 0', tag: 'math' })
      ],
      renderer: { render: () => '' }
    };
    const result = parseXhsDocument(markdown, fakeMd);
    expect(result.blocks[0].type).toBe('formula');
    expect(result.blocks[0].data.display).toBe(true);
  });

  it('keeps card contents but never exposes directive markers in xhs pages', () => {
    const markdown = [
      ':::ogzh-card accent-bar',
      '卡片正文 **重点**',
      ':::'
    ].join('\n');
    const fakeMd = {
      parse: () => [
        token('ogzh_card_open', [0, 3], {
          tag: 'section',
          nesting: 1,
          attrs: [['data-ogzh-card', 'accent-bar']]
        }),
        token('paragraph_open', [1, 2], { level: 1, tag: 'p', nesting: 1 }),
        token('inline', [1, 2], {
          level: 2,
          content: '卡片正文 重点',
          children: [token('text', null, { content: '卡片正文 重点' })]
        }),
        token('paragraph_close', null, { level: 1, tag: 'p', nesting: -1 }),
        token('ogzh_card_close', null, { tag: 'section', nesting: -1 })
      ],
      renderer: {
        render: () => '<section data-ogzh-card="accent-bar"><p>卡片正文 <strong>重点</strong></p></section>'
      }
    };

    const result = parseXhsDocument(markdown, fakeMd);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]).toMatchObject({ type: 'html', sourceStart: 0 });
    expect(result.blocks[0].html).toContain('卡片正文');
    expect(result.blocks[0].html).toContain('<strong>重点</strong>');
    expect(JSON.stringify(result)).not.toContain(':::ogzh-card');
    expect(JSON.stringify(result)).not.toContain(':::');
  });
});

describe('xhs raw html sanitizer', () => {
  const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link']);

  class FakeNode {
    constructor(tagName) {
      this.nodeType = 1;
      this.tagName = String(tagName).toLowerCase();
      this.attributes = new Map();
      this.childNodes = [];
      this.parentNode = null;
    }

    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    }

    removeAttribute(name) {
      this.attributes.delete(name);
    }

    appendChild(child) {
      child.parentNode = this;
      this.childNodes.push(child);
      return child;
    }

    removeChild(child) {
      const index = this.childNodes.indexOf(child);
      if (index >= 0) {
        this.childNodes.splice(index, 1);
        child.parentNode = null;
      }
      return child;
    }

    set innerHTML(value) {
      this.childNodes = parseFakeHtml(value, this);
    }

    get innerHTML() {
      return this.childNodes.map(serializeFakeNode).join('');
    }

    get content() {
      return this;
    }
  }

  function pushText(parent, text) {
    if (!text) return;
    parent.childNodes.push({ nodeType: 3, textContent: text, parentNode: parent });
  }

  function parseAttrs(text, node) {
    const attrRe = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    let match;
    while ((match = attrRe.exec(text)) !== null) {
      node.setAttribute(match[1], match[2] ?? match[3] ?? match[4] ?? '');
    }
  }

  function parseFakeHtml(source, parent) {
    const stack = [parent];
    const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^"'>])*)>/g;
    let lastIndex = 0;
    let match;
    while ((match = tagRe.exec(source)) !== null) {
      pushText(stack[stack.length - 1], source.slice(lastIndex, match.index));
      const closing = match[1] === '/';
      const tag = match[2].toLowerCase();
      if (closing) {
        for (let i = stack.length - 1; i > 0; i -= 1) {
          if (stack[i].tagName === tag) {
            stack.length = i;
            break;
          }
        }
      } else {
        const node = new FakeNode(tag);
        parseAttrs(match[3], node);
        stack[stack.length - 1].appendChild(node);
        if (!VOID.has(tag)) stack.push(node);
      }
      lastIndex = tagRe.lastIndex;
    }
    pushText(stack[stack.length - 1], source.slice(lastIndex));
    return parent.childNodes;
  }

  function serializeFakeNode(node) {
    if (node.nodeType === 3) return node.textContent;
    const attrs = Array.from(node.attributes.entries())
      .map(([name, value]) => ` ${name}="${value}"`)
      .join('');
    if (VOID.has(node.tagName)) return `<${node.tagName}${attrs}>`;
    return `<${node.tagName}${attrs}>${node.childNodes.map(serializeFakeNode).join('')}</${node.tagName}>`;
  }

  function createFakeDom() {
    return { createElement: (tag) => new FakeNode(tag) };
  }

  it('drops scripts, dangerous attributes and javascript urls', () => {
    const doc = createFakeDom();
    const out = sanitizeRawHtmlToken(
      '<p onclick="x()" style="color:red" class="c" id="i">hi</p>'
      + '<script>alert(1)</script>'
      + '<a href="javascript:alert(1)">x</a>'
      + '<img src="a.png" onerror="x()" alt="图">',
      doc
    );
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('script');
    expect(out).not.toContain('style=');
    expect(out).not.toContain('class=');
    expect(out).not.toContain('id=');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('<p>hi</p>');
    expect(out).toContain('<img src="a.png" alt="图">');
  });

  it('keeps only whitelisted attributes on media', () => {
    const doc = createFakeDom();
    const out = sanitizeRawHtmlToken(
      '<video src="v.mp4" poster="p.jpg" controls autoplay loop></video>'
      + '<iframe src="https://evil.example"></iframe>'
      + '<blockquote>引用</blockquote>',
      doc
    );
    expect(out).toContain('<video src="v.mp4" poster="p.jpg">');
    expect(out).not.toContain('controls');
    expect(out).not.toContain('iframe');
    expect(out).toContain('<blockquote>引用</blockquote>');
  });
});
