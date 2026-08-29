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
      '<!-- xhs-page -->',
      '卡片正文 **重点**',
      ':::',
      '',
      '<!-- xhs-page -->',
      '',
      '外部正文 A',
      '',
      '',
      '',
      '外部正文 B',
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
      '外部正文 A',
      '',
      '外部正文 B',
      '',
      ':::note',
      '保留这个指令',
      ':::'
    ].join('\n'));
  });

  it('拆除卡片包装时严格匹配单个样式参数和无缩进 opener', () => {
    const markdown = [
      ':::ogzh-card accent-bar',
      '真实卡片正文',
      ':::',
      '  :::ogzh-card accent-bar',
      '保留缩进 opener',
      ':::',
      ':::ogzh-card',
      '保留无样式 opener',
      ':::',
      ':::ogzh-card accent-bar extra',
      '保留多参数 opener',
      ':::'
    ].join('\n');

    expect(toPortableMarkdown(markdown)).toBe([
      '真实卡片正文',
      '  :::ogzh-card accent-bar',
      '保留缩进 opener',
      ':::',
      ':::ogzh-card',
      '保留无样式 opener',
      ':::',
      ':::ogzh-card accent-bar extra',
      '保留多参数 opener',
      ':::'
    ].join('\n'));
  });

  it('keeps card-like examples in matched fenced and indented code', () => {
    const markdown = [
      '正文前',
      '````markdown',
      ':::ogzh-card',
      '<!-- xhs-page -->',
      ':::',
      '```',
      ':::ogzh-card',
      '<!-- xhs-page -->',
      ':::',
      '````',
      '~~~markdown',
      ':::ogzh-card',
      '<!-- xhs-page -->',
      ':::',
      '```',
      ':::ogzh-card',
      '<!-- xhs-page -->',
      ':::',
      '~~~',
      '    :::ogzh-card',
      '    <!-- xhs-page -->',
      '    :::',
      '正文后'
    ].join('\n');

    expect(toPortableMarkdown(markdown)).toBe(markdown);
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
    const now = vi.fn(() => 1787529600000);
    const prepareWechatContent = vi.fn(async () => ({
      html: '<article><img src="img://hero" alt="Prepared hero"><img src="' + pngDataUrl + '" alt="Prepared generated"></article>',
      imageFailures: []
    }));
    const imageStore = {
      getImageRecord: vi.fn(async (id) => id === 'hero'
        ? { id, name: 'hero.png', mimeType: 'image/gif', blob: new Blob(['hero'], { type: 'image/png' }) }
        : null)
    };
    const markdown = `# 标题\n\n![Hero](img://hero)\n\n![Generated](<${pngDataUrl}>)`;
    const renderedHtml = `<section class="styled"><img src="img://hero" alt="Semantic hero"><img src="${pngDataUrl}" alt="Semantic generated"></section>`;

    const snapshot = await buildDistributionPackage({
      documentId: 42,
      title: ' 标题 ',
      markdown,
      renderedHtml,
      now,
      styleConfig: { styles: { container: 'color: red' } },
      imageStore,
      codeTheme: 'github',
      displaySettings: { fontScale: 1 },
      prepareWechatContent
    });

    expect(snapshot).toMatchObject({
      schemaVersion: DISTRIBUTION_SCHEMA_VERSION,
      documentId: '42',
      title: '标题',
      markdown,
      portableMarkdown: toPortableMarkdown(markdown),
      semanticHtml: toSemanticHtml(renderedHtml),
      wechatHtml: expect.stringContaining('img://hero'),
      createdAt: 1787529600000
    });
    expect(snapshot.images).toEqual([
      {
        ref: 'img://hero',
        kind: 'indexed-db',
        imageId: 'hero',
        mimeType: 'image/png',
        filename: 'hero.png',
        alt: 'Semantic hero'
      },
      {
        ref: pngDataUrl,
        kind: 'data-url',
        dataUrl: pngDataUrl,
        mimeType: 'image/png',
        filename: 'generated-2.png',
        alt: 'Semantic generated'
      }
    ]);
    expect(snapshot.images.every((image) => !('blob' in image || 'source' in image || 'id' in image || 'name' in image))).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.images)).toBe(true);
    expect(snapshot.images.every((image) => Object.isFrozen(image))).toBe(true);
    expect(now).toHaveBeenCalledTimes(1);
    expect(prepareWechatContent).toHaveBeenCalledWith(expect.objectContaining({
      renderedHTML: renderedHtml,
      styleConfig: expect.any(Object),
      imageStore,
      codeTheme: 'github',
      displaySettings: { fontScale: 1 },
      imagePolicy: 'defer-local',
      showToast: expect.any(Function)
    }));
    expect(imageStore.getImageRecord).toHaveBeenCalledWith('hero');
  });

  it('deduplicates semantic and prepared HTML image references in rendered order', async () => {
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
      markdown: '![markdown-only](img://markdown-only)\n\n![second](img://second)',
      renderedHtml: '<p><img src="img://second"><img src="img://first"></p>',
      imageStore,
      prepareWechatContent
    });

    expect(snapshot.images.map(({ ref }) => ref)).toEqual([
      'img://second',
      'img://first',
      'img://third'
    ]);
  });

  it('inventories HTTPS images as remote assets without reading the local image store', async () => {
    const remote = 'https://demo-1257065623.cos.ap-guangzhou.myqcloud.com/%E4%BA%A7%E5%93%81/article-cover.png?version=1';
    const imageStore = { getImageRecord: vi.fn() };

    const snapshot = await buildDistributionPackage({
      documentId: 'doc-remote',
      title: '远程图片',
      markdown: `![远程图片](${remote})`,
      renderedHtml: `<p><img src="${remote}" alt="远程图片"></p>`,
      imageStore,
      prepareWechatContent: async () => ({ html: `<p><img src="${remote}" alt="远程图片"></p>`, imageFailures: [] }),
      now: () => 1787529600000
    });

    expect(snapshot.images).toEqual([{
      ref: remote,
      kind: 'remote-url',
      url: remote,
      filename: 'article-cover.png',
      alt: '远程图片'
    }]);
    expect(imageStore.getImageRecord).not.toHaveBeenCalled();
  });

  it('does not inventory image-like syntax outside rendered HTML', async () => {
    const markdown = [
      '<!-- ![comment](img://missing) <img src="img://missing"> -->',
      '\\![escaped](img://missing)',
      '`![inline](img://missing)`',
      '`![cross',
      'line](img://missing)`',
      '```markdown',
      '![fenced](img://missing)',
      '<img src="img://missing">',
      '```',
      '    ![indented](img://missing)',
      '    <img src="img://missing">'
    ].join('\n');

    const snapshot = await buildDistributionPackage({
      documentId: 'doc-code-images',
      title: '代码示例',
      markdown,
      renderedHtml: '<p>正文</p>',
      imageStore: { getImageRecord: vi.fn(async () => null) },
      prepareWechatContent: async () => ({ html: '<p>正文</p>', imageFailures: [] }),
      now: () => 1787529600000
    });

    expect(snapshot.images).toEqual([]);
    expect(snapshot.imageStore).toBeUndefined();
    expect(snapshot.semanticHtml).toBe('<p>正文</p>');
  });

  it('inventories semantic HTML first and appends unique WeChat-generated images', async () => {
    const sharedRef = 'img://shared';
    const semanticRef = 'img://semantic-first';
    const markdownOnlyRef = 'img://markdown-only';
    const imageStore = {
      getImageRecord: vi.fn(async (id) => {
        if (id === 'shared') return { name: 'shared.png', blob: new Blob(['shared'], { type: 'image/png' }) };
        if (id === 'semantic-first') return { name: 'semantic-first.png', blob: new Blob(['first'], { type: 'image/png' }) };
        return null;
      })
    };

    const snapshot = await buildDistributionPackage({
      documentId: 'doc-rendered-inventory',
      title: '渲染图片清单',
      markdown: `![Markdown only](${markdownOnlyRef})\n![Shared markdown](${sharedRef})`,
      renderedHtml: `<p><img src="${sharedRef}" alt="Rendered shared"><img src="${semanticRef}" alt="Rendered first"></p>`,
      imageStore,
      prepareWechatContent: async () => ({
        html: `<p><img src="${pngDataUrl}" alt="Generated"><img src="${sharedRef}" alt="Prepared duplicate"></p>`,
        imageFailures: []
      }),
      now: () => 1787529600000
    });

    expect(snapshot.images).toEqual([
      {
        ref: sharedRef,
        kind: 'indexed-db',
        imageId: 'shared',
        mimeType: 'image/png',
        filename: 'shared.png',
        alt: 'Rendered shared'
      },
      {
        ref: semanticRef,
        kind: 'indexed-db',
        imageId: 'semantic-first',
        mimeType: 'image/png',
        filename: 'semantic-first.png',
        alt: 'Rendered first'
      },
      {
        ref: pngDataUrl,
        kind: 'data-url',
        dataUrl: pngDataUrl,
        mimeType: 'image/png',
        filename: 'generated-3.png',
        alt: 'Generated'
      }
    ]);
    expect(imageStore.getImageRecord).toHaveBeenCalledTimes(2);
    expect(imageStore.getImageRecord).not.toHaveBeenCalledWith('markdown-only');
  });

  it('uses quote-aware HTML tag boundaries and removes only xhs page comments', () => {
    expect(toSemanticHtml(
      '<!-- ordinary --><p title="A > B">正文</p><!-- XHS-PAGE -->'
    )).toBe('<!-- ordinary --><p title="A > B">正文</p>');
  });

  it('fails closed when an img protocol record is missing', async () => {
    await expect(buildDistributionPackage({
      documentId: 'doc-missing',
      title: '缺失',
      markdown: '![missing](img://missing)',
      renderedHtml: '<p><img src="img://missing"></p>',
      imageStore: { getImageRecord: vi.fn(async () => null) },
      prepareWechatContent: async () => ({ html: '<p>正文</p>', imageFailures: [] })
    })).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
  });

  it('rejects non-base64 image data URLs as invalid article input', async () => {
    for (const ref of [
      'data:image/png,not-base64',
      'data:image/png evil;base64,cG5n',
      'data:image/../../html;base64,cG5n'
    ]) {
      await expect(buildDistributionPackage({
        documentId: 'doc-invalid',
        title: '非法',
        markdown: '# 非法图片',
        renderedHtml: `<p><img src="${ref}"></p>`,
        imageStore: { getImageRecord: vi.fn() },
        prepareWechatContent: async () => ({ html: '<p>正文</p>', imageFailures: [] }),
        now: () => 1787529600000
      })).rejects.toMatchObject({ code: ARTICLE_INVALID });
    }
  });

  it('rejects missing or malformed WeChat preparation results', async () => {
    const invalidPreparations = [
      undefined,
      null,
      {},
      'html',
      async () => null,
      async () => ({}),
      async () => ({ html: '<p>正文</p>', imageFailures: null }),
      async () => ({ wechatHtml: '<p>正文</p>', imageFailures: [] })
    ];

    for (const prepareWechatContent of invalidPreparations) {
      await expect(buildDistributionPackage({
        documentId: 'doc-invalid-prepare',
        title: '准备结果非法',
        markdown: '# 标题',
        renderedHtml: '<p>正文</p>',
        imageStore: { getImageRecord: vi.fn() },
        prepareWechatContent,
        now: () => 1787529600000
      })).rejects.toMatchObject({ code: ARTICLE_INVALID });
    }
  });

  it('fails closed when WeChat preparation reports image failures', async () => {
    await expect(buildDistributionPackage({
      documentId: 'doc-wechat-failure',
      title: '微信图片失败',
      markdown: '# 标题',
      renderedHtml: '<p>正文</p>',
      imageStore: { getImageRecord: vi.fn() },
      prepareWechatContent: async () => ({
        html: '<p>正文</p>',
        imageFailures: [{ src: 'img://missing', message: 'not found' }]
      })
    })).rejects.toMatchObject({ code: 'IMAGE_READ_FAILED' });
  });
});
