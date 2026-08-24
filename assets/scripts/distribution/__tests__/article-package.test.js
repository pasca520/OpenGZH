import { describe, expect, it, vi } from 'vitest';
import {
  ARTICLE_INVALID,
  DISTRIBUTION_SCHEMA_VERSION,
  buildDistributionPackage,
  toPortableMarkdown,
  toSemanticHtml
} from '../article-package.js';

const pngDataUrl = 'data:image/png;base64,cG5n';

describe('article distribution contract', () => {
  it('removes only OpenGZH card fences and xhs page markers from portable markdown', () => {
    const markdown = [
      '# 标题',
      '',
      ':::ogzh-card accent-bar',
      '卡片正文 **重点**',
      ':::',
      '',
      '<!-- xhs-page -->',
      '',
      ':::note',
      '保留这个指令',
      ':::',
      '',
      '',
      ''
    ].join('\n');

    expect(toPortableMarkdown(markdown)).toBe([
      '# 标题',
      '',
      '卡片正文 **重点**',
      '',
      ':::note',
      '保留这个指令',
      ':::'
    ].join('\n'));
  });

  it('normalizes image references, unwraps OpenGZH containers, and preserves table semantics', () => {
    const html = [
      '<section data-ogzh-card="accent-bar" class="card" style="color:red" id="card">',
      '<div data-xhs-page="page-1" class="page">',
      '<img data-image-id="hero" src="blob:https://example.test/hero" class="image" style="width:1px" id="image" data-extra="remove">',
      '<table class="table"><tbody><tr><th id="head">列</th><td data-value="remove">值</td></tr></tbody></table>',
      '</div>',
      '</section>'
    ].join('');

    const result = toSemanticHtml(html);

    expect(result).toContain('<img src="img://hero">');
    expect(result).toContain('<table><tbody><tr><th>列</th><td>值</td></tr></tbody></table>');
    expect(result).not.toMatch(/class=|style=|\sid=|data-/i);
    expect(result).not.toMatch(/data-ogzh-card|data-xhs-page/);
    expect(result).not.toMatch(/<\/?(?:section|div)\b/i);
  });

  it('builds one frozen schema-v1 snapshot and passes deferred image policy to WeChat preparation', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1787529600000);
    const prepareWechatContent = vi.fn(async () => ({
      html: '<article><img src="img://hero"><img src="' + pngDataUrl + '"></article>',
      imageFailures: []
    }));
    const imageStore = {
      getImageRecord: vi.fn(async (id) => id === 'hero'
        ? { id, name: 'hero.png', blob: new Blob(['hero'], { type: 'image/png' }) }
        : null)
    };
    const markdown = `# 标题\n\n![Hero](img://hero)\n\n<img src="${pngDataUrl}">`;
    const renderedHTML = `<section class="styled"><img src="img://hero"><img src="${pngDataUrl}"></section>`;

    try {
      const snapshot = await buildDistributionPackage({
        documentId: 'doc-1',
        title: '标题',
        markdown,
        renderedHTML,
        styleConfig: { styles: { container: 'color: red' } },
        imageStore,
        codeTheme: 'github',
        displaySettings: { fontScale: 1 },
        prepareWechatContent
      });

      expect(snapshot).toMatchObject({
        schemaVersion: DISTRIBUTION_SCHEMA_VERSION,
        documentId: 'doc-1',
        title: '标题',
        markdown,
        portableMarkdown: toPortableMarkdown(markdown),
        semanticHtml: toSemanticHtml(renderedHTML),
        wechatHtml: expect.stringContaining('img://hero'),
        createdAt: 1787529600000
      });
      expect(snapshot.images.map(({ filename }) => filename)).toEqual(['hero.png', 'generated-2.png']);
      expect(snapshot.images.map(({ source }) => source)).toEqual(['img://hero', pngDataUrl]);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(Object.isFrozen(snapshot.images)).toBe(true);
      expect(snapshot.images.every((image) => Object.isFrozen(image))).toBe(true);
      expect(prepareWechatContent).toHaveBeenCalledWith(expect.objectContaining({
        renderedHTML,
        styleConfig: expect.any(Object),
        imageStore,
        codeTheme: 'github',
        displaySettings: { fontScale: 1 },
        imagePolicy: 'defer-local',
        showToast: expect.any(Function)
      }));
      expect(imageStore.getImageRecord).toHaveBeenCalledWith('hero');
    } finally {
      vi.restoreAllMocks();
    }
  });

  it('deduplicates image references in portable markdown, semantic html, and prepared html order', async () => {
    const prepareWechatContent = async () => ({
      html: '<p><img src="img://third"><img src="img://first"></p>',
      imageFailures: []
    });
    const imageStore = {
      getImageRecord: vi.fn(async (id) => ({
        id,
        name: `${id}.png`,
        blob: new Blob([id], { type: 'image/png' })
      }))
    };

    const snapshot = await buildDistributionPackage({
      documentId: 'doc-order',
      title: '顺序',
      markdown: '![first](img://first)\n\n![second](img://second)',
      renderedHTML: '<p><img src="img://second"></p>',
      imageStore,
      prepareWechatContent
    });

    expect(snapshot.images.map(({ source }) => source)).toEqual([
      'img://first',
      'img://second',
      'img://third'
    ]);
  });

  it('fails closed when an img protocol record is missing', async () => {
    await expect(buildDistributionPackage({
      documentId: 'doc-missing',
      title: '缺失',
      markdown: '![missing](img://missing)',
      renderedHTML: '<p>正文</p>',
      imageStore: { getImageRecord: vi.fn(async () => null) },
      prepareWechatContent: async () => ({ html: '<p>正文</p>', imageFailures: [] })
    })).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
  });

  it('rejects non-base64 image data URLs as invalid article input', async () => {
    await expect(buildDistributionPackage({
      documentId: 'doc-invalid',
      title: '非法',
      markdown: '![bad](data:image/png,not-base64)',
      renderedHTML: '<p>正文</p>',
      imageStore: { getImageRecord: vi.fn() },
      prepareWechatContent: async () => ({ html: '<p>正文</p>', imageFailures: [] })
    })).rejects.toMatchObject({ code: ARTICLE_INVALID });
  });

  it('fails closed when WeChat preparation reports image failures', async () => {
    await expect(buildDistributionPackage({
      documentId: 'doc-wechat-failure',
      title: '微信图片失败',
      markdown: '# 标题',
      renderedHTML: '<p>正文</p>',
      imageStore: { getImageRecord: vi.fn() },
      prepareWechatContent: async () => ({
        html: '<p>正文</p>',
        imageFailures: [{ src: 'img://missing', message: 'not found' }]
      })
    })).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
  });
});
