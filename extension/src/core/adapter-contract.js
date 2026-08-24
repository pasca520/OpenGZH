export const PLATFORM_IDS = Object.freeze(['weixin', 'zhihu', 'juejin', 'woshipm']);

export const PLATFORMS = Object.freeze({
  weixin: Object.freeze({ name: '微信公众号', loginUrl: 'https://mp.weixin.qq.com/' }),
  zhihu: Object.freeze({ name: '知乎', loginUrl: 'https://www.zhihu.com/signin' }),
  juejin: Object.freeze({ name: '掘金', loginUrl: 'https://juejin.cn/login' }),
  woshipm: Object.freeze({ name: '人人都是产品经理', loginUrl: 'https://www.woshipm.com/login.html' }),
});

export function assertAdapter(adapter) {
  if (!PLATFORM_IDS.includes(adapter?.id)) throw new TypeError('未知平台适配器');
  for (const method of ['checkAuth', 'uploadImage', 'saveDraft']) {
    if (typeof adapter[method] !== 'function') throw new TypeError(`${adapter.id}.${method} 必须是函数`);
  }
  return adapter;
}

export function articleContentForPlatform(article, platformId) {
  if (platformId === 'weixin') return article.wechatHtml;
  if (platformId === 'juejin') return article.portableMarkdown;
  return article.semanticHtml;
}

export function applyImageMap(content, imageMap) {
  let output = String(content || '');
  const entries = imageMap instanceof Map ? imageMap.entries() : Object.entries(imageMap || {});
  for (const [source, target] of entries) output = output.split(String(source)).join(String(target));
  return output;
}
