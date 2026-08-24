import { describe, expect, it } from 'vitest';
import { shouldCopyExtensionPath, validateExtensionManifest } from '../build-extension.mjs';

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
    'https://*.volces.com/*',
    'https://www.woshipm.com/*',
  ],
};

describe('extension build', () => {
  it.each([
    ['src/background/service-worker.js', true],
    ['assets/icon-128.png', true],
    ['tests/adapters/weixin.test.js', false],
    ['src/background/service-worker.js.map', false],
    ['.DS_Store', false],
    ['account.har', false],
    ['.env', false],
  ])('filters %s', (path, expected) => {
    expect(shouldCopyExtensionPath(path)).toBe(expected);
  });

  it('accepts only the locked identity and safe permissions', () => {
    expect(() => validateExtensionManifest(manifest)).not.toThrow();
    expect(() => validateExtensionManifest({ ...manifest, permissions: [...manifest.permissions, 'cookies'] })).toThrowError(/权限/);
    expect(() => validateExtensionManifest({ ...manifest, host_permissions: manifest.host_permissions.slice(1) })).toThrowError(/域名/);
    expect(() => validateExtensionManifest({ ...manifest, optional_host_permissions: ['https://mp.weixin.qq.com/*'] })).toThrowError(/可选域名/);
    expect(() => validateExtensionManifest({ ...manifest, version: '0.1.1' })).toThrowError(/版本/);
  });
});
