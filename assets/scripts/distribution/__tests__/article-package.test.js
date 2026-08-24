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
        alt: 'Hero'
      },
      {
        ref: pngDataUrl,
        kind: 'data-url',
        dataUrl: pngDataUrl,
        mimeType: 'image/png',
        filename: 'generated-2.png',
        alt: 'Generated'
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
      renderedHtml: '<p><img src="img://second"></p>',
      imageStore,
      prepareWechatContent
    });

    expect(snapshot.images.map(({ ref }) => ref)).toEqual([
      'img://first',
      'img://second',
      'img://third'
    ]);
  });

  it('does not inventory image examples inside markdown code', async () => {
    const markdown = [
      '```markdown',
      '![fenced](img://missing)',
      '<img src="img://missing">',
      '```',
      '`![inline](img://missing)`',
      '    ![indented](img://missing)',
      '    <img src="img://missing">',
      `![real](<${pngDataUrl}>)`
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

    expect(snapshot.images).toEqual([{
      ref: pngDataUrl,
      kind: 'data-url',
      dataUrl: pngDataUrl,
      mimeType: 'image/png',
      filename: 'generated-1.png',
      alt: 'real'
    }]);
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
      renderedHtml: '<p>正文</p>',
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
        markdown: `![bad](<${ref}>)`,
        renderedHtml: '<p>正文</p>',
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
