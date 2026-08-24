/**
 * Fixed page-side bridge for extension snapshot requests.
 * @module distribution/extension-bridge
 */

export const PAGE_EVENTS = Object.freeze({
  request: 'opengzh:distribution:request',
  ready: 'opengzh:distribution:ready',
  error: 'opengzh:distribution:error'
});

const ERROR_CODES = new Set(['ARTICLE_INVALID', 'IMAGE_READ_FAILED']);
const SAFE_MESSAGES = new Set(['读取失败', '图片读取失败', '文章快照生成失败']);
const DEFAULT_ERROR_MESSAGE = '文章快照生成失败';

function getSafeError(error) {
  const code = ERROR_CODES.has(error?.code) ? error.code : 'ARTICLE_INVALID';
  const message = SAFE_MESSAGES.has(error?.message) ? error.message : DEFAULT_ERROR_MESSAGE;
  return { code, message };
}

export function installDistributionBridge({
  target = document,
  createPackage,
  CustomEventCtor = CustomEvent
}) {
  const onRequest = async (event) => {
    const requestId = event.detail?.requestId;
    if (typeof requestId !== 'string' || !requestId.trim()) return;

    try {
      const article = await createPackage();
      target.dispatchEvent(new CustomEventCtor(PAGE_EVENTS.ready, {
        detail: { requestId, article }
      }));
    } catch (error) {
      const { code, message } = getSafeError(error);
      target.dispatchEvent(new CustomEventCtor(PAGE_EVENTS.error, {
        detail: { requestId, code, message }
      }));
    }
  };

  target.addEventListener(PAGE_EVENTS.request, onRequest);
  return () => target.removeEventListener(PAGE_EVENTS.request, onRequest);
}
