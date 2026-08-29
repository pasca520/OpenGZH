import { describe, expect, it } from 'vitest';
import {
  PLATFORM_IDS,
  PLATFORMS,
  applyImageMap,
  articleContentForPlatform,
  assertAdapter,
  platformContentContract,
} from '../src/core/adapter-contract.js';
import { validateArticle, validateSelectedPlatformImages } from '../src/core/article-validator.js';

const article = {
  schemaVersion: 1,
  documentId: 'doc-1',
  title: '标题',
  markdown: '# 标题',
  portableMarkdown: '# 标题\n\n![图](img://hero)',
  semanticHtml: '<h1>标题</h1><img src="img://hero">',
  wechatHtml: '<h1>标题</h1><img src="img://hero">',
  images: [{
    ref: 'img://hero',
    kind: 'indexed-db',
    imageId: 'hero',
    mimeType: 'image/png',
    filename: 'hero.png',
    alt: '',
  }],
  createdAt: 1787529600000,
};

describe('adapter contract', () => {
  it('exposes the locked platforms and metadata', () => {
    expect(PLATFORM_IDS).toEqual(['weixin', 'zhihu', 'juejin', 'woshipm']);
    expect(PLATFORMS).toEqual({
      weixin: { name: '微信公众号', loginUrl: 'https://mp.weixin.qq.com/', content: { field: 'wechatHtml', format: 'html' }, capabilities: { imageUpload: true, draftOnly: true, retryUpdate: true } },
      zhihu: { name: '知乎', loginUrl: 'https://www.zhihu.com/signin', content: { field: 'semanticHtml', format: 'html' }, capabilities: { imageUpload: true, draftOnly: true, retryUpdate: true } },
      juejin: { name: '掘金', loginUrl: 'https://juejin.cn/login', content: { field: 'portableMarkdown', format: 'markdown' }, capabilities: { imageUpload: true, draftOnly: true, retryUpdate: true } },
      woshipm: { name: '人人都是产品经理', loginUrl: 'https://www.woshipm.com/login.html', content: { field: 'semanticHtml', format: 'html' }, capabilities: { imageUpload: true, draftOnly: true, retryUpdate: true } },
    });
    expect(platformContentContract('juejin')).toEqual({ field: 'portableMarkdown', format: 'markdown' });
    expect(() => platformContentContract('unknown')).toThrowError(/未知平台/);
  });

  it('requires each adapter to implement the three privileged operations', () => {
    const adapter = { id: 'weixin', checkAuth() {}, uploadImage() {}, saveDraft() {} };
    expect(assertAdapter(adapter)).toBe(adapter);
    expect(() => assertAdapter({ ...adapter, uploadImage: undefined })).toThrow();
    expect(() => assertAdapter({ ...adapter, id: 'unknown' })).toThrow();
  });

  it('selects the exact content field for each platform', () => {
    expect(articleContentForPlatform(article, 'weixin')).toBe(article.wechatHtml);
    expect(articleContentForPlatform(article, 'juejin')).toBe(article.portableMarkdown);
    expect(articleContentForPlatform(article, 'zhihu')).toBe(article.semanticHtml);
    expect(articleContentForPlatform(article, 'woshipm')).toBe(article.semanticHtml);
  });

  it('replaces exact image references without treating the values as regular expressions', () => {
    const html = '<img src="img://hero-2"><img src="img://hero">\n<code>img://hero</code>';
    expect(applyImageMap(html, new Map([
      ['img://hero-2', 'https://cdn.test/hero-2'],
      ['img://hero', 'https://cdn.test/img://hero-2'],
    ]))).toBe('<img src="https://cdn.test/hero-2"><img src="https://cdn.test/img://hero-2">\n<code>img://hero</code>');
    expect(applyImageMap('![nested [alt]](img://hero-2)\n![reference][hero]\n\n[hero]: img://hero', new Map([
      ['img://hero-2', 'https://cdn.test/hero-2'],
      ['img://hero', 'https://cdn.test/img://hero-2'],
    ]))).toBe('![nested [alt]](https://cdn.test/hero-2)\n![reference][hero]\n\n[hero]: https://cdn.test/img://hero-2');
  });

  it('does not replace ordinary text or a longer ref when only the short ref is mapped', () => {
    expect(applyImageMap(
      '<p>img://hero-2</p><img src="img://hero-2">',
      new Map([['img://hero', 'https://cdn.test/hero.png']]),
    )).toBe('<p>img://hero-2</p><img src="img://hero-2">');
    expect(applyImageMap('<p>![literal](img://hero)</p>', new Map([['img://hero', 'https://cdn.test/hero.png']]))).toBe(
      '<p>![literal](img://hero)</p>',
    );
  });

  it('does not cascade when a replacement target contains another source', () => {
    expect(applyImageMap(
      '<img src="img://first"><img src="img://second">',
      new Map([
        ['img://first', 'https://cdn.test/img://second'],
        ['img://second', 'https://cdn.test/second'],
      ]),
    )).toBe('<img src="https://cdn.test/img://second"><img src="https://cdn.test/second">');
  });

  it('supports mixed Juejin Markdown and inline HTML when markdown mode is explicit', () => {
    expect(applyImageMap(
      '<p><img src="img://html"></p>\n![markdown](img://markdown)',
      new Map([
        ['img://html', 'https://cdn.test/html.png'],
        ['img://markdown', 'https://cdn.test/markdown.png'],
      ]),
      { markdown: true },
    )).toBe('<p><img src="https://cdn.test/html.png"></p>\n![markdown](https://cdn.test/markdown.png)');
  });
});

describe('validateArticle', () => {
  it('accepts the locked schema and returns a deep clone', () => {
    const result = validateArticle(article);
    expect(result).toEqual(article);
    expect(result).not.toBe(article);
    expect(result.images).not.toBe(article.images);
    expect(result.images[0]).not.toBe(article.images[0]);
  });

  it.each([
    [{ ...article, schemaVersion: 2 }, 'schema version'],
    [{ ...article, documentId: '  ' }, 'document id'],
    [{ ...article, title: '' }, 'title'],
    [{ ...article, images: [{ ...article.images[0], kind: 'remote' }] }, 'image kind'],
    [{ ...article, images: [{ ...article.images[0], mimeType: 'text/html' }] }, 'image MIME'],
    [{ ...article, images: [{ ...article.images[0], ref: 'img://other' }] }, 'image ref'],
    [{ ...article, images: [{ ...article.images[0], ref: 'img://hero', imageId: 'other' }] }, 'image id'],
    [{ ...article, images: [{ ...article.images[0], ref: 'img://hero', extra: 'leak' }] }, 'image extra key'],
    [{ ...article, extra: { privileged: true } }, 'article extra key'],
    [{ ...article, createdAt: new Date() }, 'non-finite timestamp'],
    [{ ...article, semanticHtml: '', portableMarkdown: '', wechatHtml: '' }, 'empty body'],
  ])('rejects invalid package (%s)', (input) => {
    expect(() => validateArticle(input)).toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
  });

  it('rejects Blob objects and malformed or non-image Data URLs at the boundary', () => {
    expect(() => validateArticle({ ...article, images: [new Blob(['secret'], { type: 'image/png' })] }))
      .toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
    expect(() => validateArticle({
      ...article,
      images: [{
        ref: 'data:image/png,not-base64',
        kind: 'data-url',
        dataUrl: 'data:image/png,not-base64',
        mimeType: 'image/png',
        filename: 'x.png',
        alt: '',
      }],
    })).toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
    expect(() => validateArticle({
      ...article,
      images: [{
        ref: 'data:image/svg+xml;base64,PHN2Zy8+',
        kind: 'data-url',
        dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
        mimeType: 'image/svg+xml',
        filename: 'x.svg',
        alt: '',
        imageId: 'must-not-cross',
      }],
    })).toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
  });

  it('requires unique image refs and exact data-url references', () => {
    expect(() => validateArticle({
      ...article,
      images: [article.images[0], { ...article.images[0], filename: 'duplicate.png' }],
    })).toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
    expect(() => validateArticle({
      ...article,
      images: [{
        ref: 'data:image/png;base64,cG5n',
        kind: 'data-url',
        dataUrl: 'data:image/png;base64,other',
        mimeType: 'image/png',
        filename: 'x.png',
        alt: '',
      }],
    })).toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
  });

  it('accepts exact HTTPS remote image assets and rejects unsafe remote URLs', () => {
    const remote = 'https://images.example.com/path/hero.png?version=1';
    const remoteImage = { ref: remote, kind: 'remote-url', url: remote, filename: 'hero.png', alt: 'Hero' };
    expect(validateArticle({
      ...article,
      semanticHtml: `<img src="${remote}">`,
      images: [remoteImage],
    }).images).toEqual([remoteImage]);
    expect(() => validateSelectedPlatformImages({
      ...article,
      semanticHtml: `<img src="${remote}">`,
      images: [remoteImage],
    }, ['zhihu'])).not.toThrow();

    for (const url of [
      'http://images.example.com/hero.png',
      'https://user:pass@images.example.com/hero.png',
      'https://images.example.com:8443/hero.png',
      'https://localhost/hero.png',
    ]) {
      expect(() => validateArticle({
        ...article,
        semanticHtml: `<img src="${url}">`,
        images: [{ ref: url, kind: 'remote-url', url, filename: 'hero.png', alt: '' }],
      })).toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
    }
  });

  it('rejects accessors before a valid getter can cross the boundary', () => {
    let valid = true;
    const accessorArticle = { ...article };
    Object.defineProperty(accessorArticle, 'title', {
      configurable: true,
      get: () => valid ? '标题' : '',
    });
    expect(() => validateArticle(accessorArticle)).toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
    valid = false;
    expect(() => validateArticle(accessorArticle)).toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
  });

  it('rejects sparse images and arrays with extra properties', () => {
    const sparse = { ...article, images: Array(1) };
    expect(() => validateArticle(sparse)).toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
    const extra = [article.images[0]];
    extra.extra = 'must not cross';
    expect(() => validateArticle({ ...article, images: extra }))
      .toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
  });

  it('maps Proxy descriptor failures to ARTICLE_INVALID', () => {
    const proxied = new Proxy(article, {
      ownKeys: () => { throw new Error('descriptor failure'); },
    });
    expect(() => validateArticle(proxied)).toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
  });

  it('maps Proxy prototype failures to ARTICLE_INVALID', () => {
    const proxied = new Proxy(article, {
      getPrototypeOf: () => { throw new Error('prototype failure'); },
    });
    expect(() => validateArticle(proxied)).toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
  });
});

describe('validateSelectedPlatformImages', () => {
  it('allows exact local refs for all selected platforms', () => {
    expect(() => validateSelectedPlatformImages(article, PLATFORM_IDS)).not.toThrow();
  });

  it('allows a platform CDN only for that platform', () => {
    const weixinArticle = {
      ...article,
      wechatHtml: '<img src="https://mmbiz.qpic.cn/a.png">',
      images: [],
    };
    expect(() => validateSelectedPlatformImages(weixinArticle, ['weixin'])).not.toThrow();
    expect(() => validateSelectedPlatformImages(
      { ...weixinArticle, semanticHtml: weixinArticle.wechatHtml },
      ['zhihu'],
    )).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
  });

  it.each([
    'blob:missing',
    'https://images.example.com/a.png',
    'https://mmbiz.qpic.cn.evil.test/a.png',
    'http://mmbiz.qpic.cn/a.png',
    '../a.png',
  ])('blocks unresolved, malicious, or non-HTTPS source %s', (src) => {
    expect(() => validateSelectedPlatformImages(
      { ...article, semanticHtml: `<img src="${src}">`, images: [] },
      ['zhihu'],
    )).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
  });

  it('scans Juejin Markdown image syntax as well as local references', () => {
    const markdownArticle = { ...article, portableMarkdown: '![remote](https://images.example.com/a.png)', images: [] };
    expect(() => validateSelectedPlatformImages(markdownArticle, ['juejin']))
      .toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
    expect(() => validateSelectedPlatformImages({
      ...markdownArticle,
      portableMarkdown: '![cdn](https://p3-juejin.byteimg.com/tos-cn-i/a.png)',
    }, ['juejin'])).not.toThrow();
  });

  it('requires a non-empty unique list of fixed platform IDs', () => {
    expect(() => validateSelectedPlatformImages(article, [])).toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
    expect(() => validateSelectedPlatformImages(article, ['zhihu', 'zhihu']))
      .toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
    expect(() => validateSelectedPlatformImages(article, ['unknown']))
      .toThrowError(expect.objectContaining({ code: 'ARTICLE_INVALID' }));
  });

  it('scans quote-aware HTML attributes, reference Markdown, and nested alt text', () => {
    const external = 'https://images.example.com/evil.png';
    expect(() => validateSelectedPlatformImages({
      ...article,
      semanticHtml: `<img alt=">" src="${external}">`,
      images: [],
    }, ['zhihu'])).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
    expect(() => validateSelectedPlatformImages({
      ...article,
      portableMarkdown: `![x][hero]\n\n[hero]: ${external}`,
      images: [],
    }, ['juejin'])).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
    expect(() => validateSelectedPlatformImages({
      ...article,
      portableMarkdown: `![outer [nested]](${external})`,
      images: [],
    }, ['juejin'])).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
  });

  it('ignores comments, code blocks, and escaped Markdown while scanning real images', () => {
    const safe = {
      ...article,
      semanticHtml: '<!-- <img src="https://images.example.com/comment.png"> --><img src="img://hero">',
    };
    expect(() => validateSelectedPlatformImages(safe, ['zhihu'])).not.toThrow();
    expect(() => validateSelectedPlatformImages({
      ...article,
      portableMarkdown: '\\![escaped](https://images.example.com/escaped.png)\n\n`![code](https://images.example.com/code.png)`\n\n```\n![fenced](https://images.example.com/fenced.png)\n```\n\n    ![indented](https://images.example.com/indented.png)\n\n![real](https://images.example.com/real.png)',
      images: [],
    }, ['juejin'])).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
  });

  it('uses odd and even backslash parity for Markdown image escapes', () => {
    const external = 'https://images.example.com/escaped.png';
    expect(() => validateSelectedPlatformImages({
      ...article,
      portableMarkdown: String.raw`\![escaped](${external})`,
      images: [],
    }, ['juejin'])).not.toThrow();
    expect(() => validateSelectedPlatformImages({
      ...article,
      portableMarkdown: String.raw`\\![active](${external})`,
      images: [],
    }, ['juejin'])).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
  });

  it('does not protect the rest of Markdown after an unclosed inline code marker', () => {
    expect(() => validateSelectedPlatformImages({
      ...article,
      portableMarkdown: 'unclosed ` code\n\n![real](https://images.example.com/real.png)',
      images: [],
    }, ['juejin'])).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
  });

  it('rejects backticks in backtick fence info strings but accepts tilde info strings', () => {
    expect(() => validateSelectedPlatformImages({
      ...article,
      portableMarkdown: '```js`\n![real](https://images.example.com/real.png)\n```',
      images: [],
    }, ['juejin'])).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
    expect(() => validateSelectedPlatformImages({
      ...article,
      portableMarkdown: '~~~js`\n![fenced](https://images.example.com/fenced.png)\n~~~',
      images: [],
    }, ['juejin'])).not.toThrow();
  });

  it('scans rendered HTML images while ignoring Markdown code ranges and plain less-than text', () => {
    const external = 'https://images.example.com/code.png';
    expect(() => validateSelectedPlatformImages({
      ...article,
      semanticHtml: `2 < 3\n<pre><code><img src="${external}"></code></pre>`,
      images: [],
    }, ['zhihu'])).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
    expect(() => validateSelectedPlatformImages({
      ...article,
      portableMarkdown: `\`<img src="${external}">\``,
      images: [],
    }, ['juejin'])).not.toThrow();
    expect(() => validateSelectedPlatformImages({
      ...article,
      portableMarkdown: `~~~html\n<img src="${external}">\n~~~`,
      images: [],
    }, ['juejin'])).not.toThrow();
  });

  it('scans image tags inside backticks in semantic HTML', () => {
    const external = 'https://images.example.com/semantic-literal.png';
    expect(() => validateSelectedPlatformImages({
      ...article,
      semanticHtml: '<p>`literal <img src="' + external + '">`</p>',
      images: [],
    }, ['zhihu'])).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
  });

  it('scans a Markdown image after ordinary less-than text', () => {
    const external = 'https://images.example.com/less-than.png';
    expect(() => validateSelectedPlatformImages({
      ...article,
      portableMarkdown: `2 < 3\n\n![remote](${external})`,
      images: [],
    }, ['juejin'])).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
  });

  it('does not let escaped Markdown backticks hide a later image', () => {
    const external = 'https://images.example.com/escaped-backtick.png';
    expect(() => validateSelectedPlatformImages({
      ...article,
      portableMarkdown: ['\\`not code', `![remote](${external})`, '\\`'].join('\n'),
      images: [],
    }, ['juejin'])).toThrowError(expect.objectContaining({ code: 'IMAGE_NOT_LOCAL' }));
  });

  it('still ignores images inside valid Markdown inline code and fenced code', () => {
    const external = 'https://images.example.com/code-only.png';
    expect(() => validateSelectedPlatformImages({
      ...article,
      portableMarkdown: [
        '`![inline](' + external + ')`',
        '```',
        `![fenced](${external})`,
        '```',
      ].join('\n'),
      images: [],
    }, ['juejin'])).not.toThrow();
  });
});
