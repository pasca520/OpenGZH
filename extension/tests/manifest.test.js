import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));

describe('OpenGZH MV3 manifest', () => {
  it('locks identity, version, action and worker', () => {
    expect(manifest).toMatchObject({
      manifest_version: 3,
      name: 'OpenGZH',
      short_name: 'OpenGZH',
      version: '0.1.0',
      description: '微信公众号、知乎、掘金、人人都是产品经理文章同步助手',
      minimum_chrome_version: '116',
      background: { service_worker: 'src/background/service-worker.js', type: 'module' },
      action: {
        default_title: 'OpenGZH 文章同步助手',
        default_icon: {
          16: 'assets/icon-16.png',
          48: 'assets/icon-48.png',
          128: 'assets/icon-128.png',
        },
      },
    });
    expect(manifest.icons).toEqual({
      16: 'assets/icon-16.png',
      48: 'assets/icon-48.png',
      128: 'assets/icon-128.png',
    });
  });

  it('has only the two base API permissions and exact required hosts', () => {
    expect(manifest.permissions).toEqual(['storage', 'declarativeNetRequestWithHostAccess']);
    expect(manifest.host_permissions).toEqual([
      'https://mp.weixin.qq.com/*',
      'https://www.zhihu.com/*',
      'https://zhuanlan.zhihu.com/*',
      'https://api.zhihu.com/*',
      'https://zhihu-pics-upload.zhimg.com/*',
      'https://juejin.cn/*',
      'https://api.juejin.cn/*',
      'https://imagex.bytedanceapi.com/*',
      'https://tos-d-x-lf.douyin.com/*',
      'https://*.volces.com/*',
      'https://www.woshipm.com/*',
    ]);
    expect(manifest.optional_host_permissions).toBeUndefined();
    const serialized = JSON.stringify(manifest);
    for (const forbidden of ['<all_urls>', 'cookies', 'unlimitedStorage', 'externally_connectable']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('injects only into OpenGZH production and loopback development pages', () => {
    expect(manifest.content_scripts).toEqual([expect.objectContaining({
      matches: [
        'https://opengzh.pasca.fun/*',
        'http://localhost/*',
        'http://127.0.0.1/*',
      ],
      js: ['src/content/open-gzh.js'],
      run_at: 'document_idle',
      all_frames: false,
    })]);
  });
});
