import { describe, expect, it } from 'vitest';
import {
  PLATFORM_IDS,
  PLATFORMS,
  applyImageMap,
  articleContentForPlatform,
  assertAdapter,
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
      weixin: { name: '微信公众号', loginUrl: 'https://mp.weixin.qq.com/' },
      zhihu: { name: '知乎', loginUrl: 'https://www.zhihu.com/signin' },
      juejin: { name: '掘金', loginUrl: 'https://juejin.cn/login' },
      woshipm: { name: '人人都是产品经理', loginUrl: 'https://www.woshipm.com/login.html' },
    });
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
    const content = '<img src="img://hero"><img src="img://hero-2">';
    expect(applyImageMap(content, new Map([['img://hero', 'https://cdn.test/hero.png']]))).toBe(
      '<img src="https://cdn.test/hero.png"><img src="https://cdn.test/hero.png-2">',
    );
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
});
