import { describe, expect, it } from 'vitest';
import {
  shouldCopyExtensionPath,
  validateArchiveListing,
  validateArchiveRootListing,
  validateExtensionManifest,
} from '../build-extension.mjs';

const manifest = {
  manifest_version: 3,
  name: 'OpenGZH',
  short_name: 'OpenGZH',
  description: '微信公众号、知乎、掘金、人人都是产品经理文章同步助手',
  version: '0.1.0',
  permissions: ['storage', 'declarativeNetRequestWithHostAccess'],
  host_permissions: [
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
  ],
};

describe('extension build', () => {
  it.each([
    ['src/background/service-worker.js', true],
    ['assets/icon-128.png', true],
    ['tests/adapters/weixin.test.js', false],
    ['tests\\adapters\\weixin.test.js', false],
    ['src\\tests\\nested\\file.js', false],
    ['src/background/service-worker.js.map', false],
    ['src\\background\\worker.js.map', false],
    ['docs/README.md', false],
    ['docs/README.MD', false],
    ['.DS_Store', false],
    ['assets\\.DS_Store', false],
    ['account.har', false],
    ['src\\archive.HAR', false],
    ['.env', false],
    ['assets\\.env\\secret', false],
    ['src/my.harbor', true],
    ['src/.envoy/config.js', true],
    ['../outside.js', false],
    ['..\\outside.js', false],
    ['/absolute.js', false],
    ['C:\\absolute.js', false],
  ])('filters %s', (path, expected) => {
    expect(shouldCopyExtensionPath(path)).toBe(expected);
  });

  it('accepts only the locked identity and safe permissions', () => {
    expect(() => validateExtensionManifest(manifest)).not.toThrow();
    for (const permissions of [
      undefined,
      ['storage'],
      ['declarativeNetRequestWithHostAccess'],
      ['storage', 'declarativeNetRequestWithHostAccess', 'tabs'],
      ['declarativeNetRequestWithHostAccess', 'storage'],
    ]) {
      expect(() => validateExtensionManifest({ ...manifest, permissions })).toThrowError(/权限/);
    }
    expect(() => validateExtensionManifest({ ...manifest, host_permissions: manifest.host_permissions.slice(1) })).toThrowError(/域名/);
    expect(() => validateExtensionManifest({ ...manifest, optional_host_permissions: ['https://mp.weixin.qq.com/*'] })).toThrowError(/可选域名/);
    expect(() => validateExtensionManifest({ ...manifest, optional_host_permissions: null })).toThrowError(/可选域名/);
    expect(() => validateExtensionManifest({ ...manifest, externally_connectable: false })).toThrowError(/externally_connectable/);
    expect(() => validateExtensionManifest({ ...manifest, version: '0.1.1' })).toThrowError(/版本/);
  });

  it('normalizes archive paths before applying exact forbidden checks', () => {
    expect(() => validateArchiveListing('extension\\tests\\adapters\\bad.js\n')).toThrowError(/tests/);
    expect(() => validateArchiveListing('extension/src/.env\\secret\n')).toThrowError(/\.env/);
    expect(() => validateArchiveListing('extension/src/archive.HAR\n')).toThrowError(/archive.HAR/);
    expect(() => validateArchiveListing('extension/docs/README.Md\n')).toThrowError(/README.Md/);
    expect(() => validateArchiveListing('extension/src/my.harbor\n')).not.toThrow();
    expect(() => validateArchiveListing('extension/src/.envoy/config.js\n')).not.toThrow();
  });

  it('requires runtime entries at the ZIP root', () => {
    expect(() => validateArchiveRootListing([
      'extension/manifest.json',
      'extension/src/content/open-gzh.js',
      'extension/src/background/service-worker.js',
      'extension/assets/icon-128.png',
    ].join('\n'))).toThrowError(/根目录|manifest/);

    expect(() => validateArchiveRootListing([
      'manifest.json',
      'src/content/open-gzh.js',
      'src/background/service-worker.js',
      'assets/icon-128.png',
    ].join('\n'))).not.toThrow();
  });
});
