/**
 * Fixed page-side bridge for extension snapshot requests.
 * @module distribution/extension-bridge
 */

export const PAGE_EVENTS = Object.freeze({
  request: 'opengzh:distribution:request',
  ready: 'opengzh:distribution:ready',
  error: 'opengzh:distribution:error',
  open: 'opengzh:distribution:open',
  opened: 'opengzh:distribution:opened'
});

const ERROR_CODES = new Set(['ARTICLE_INVALID', 'IMAGE_READ_FAILED']);
const SAFE_MESSAGES = new Set(['读取失败', '图片读取失败', '文章快照生成失败']);
const DEFAULT_ERROR_MESSAGE = '文章快照生成失败';

function getSafeError(error) {
  const code = ERROR_CODES.has(error?.code) ? error.code : 'ARTICLE_INVALID';
  const message = SAFE_MESSAGES.has(error?.message) ? error.message : DEFAULT_ERROR_MESSAGE;
  return { code, message };
}

export function requestDistributionOpen({
  target = document,
  CustomEventCtor = CustomEvent,
  requestId = crypto.randomUUID(),
  timeoutMs = 500,
  storeUrl = '',
  notifyUnavailable = () => {},
  openWindow = (...args) => window.open(...args)
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let timerId;

    const cleanup = () => {
      target.removeEventListener(PAGE_EVENTS.opened, onOpened);
      clearTimeout(timerId);
    };

    const isSafeStoreUrl = () => {
      try {
        return new URL(storeUrl).origin === 'https://chromewebstore.google.com';
      } catch {
        return false;
      }
    };

    const settle = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (result) {
        resolve(true);
        return;
      }

      if (isSafeStoreUrl()) {
        try {
          openWindow(storeUrl, '_blank', 'noopener');
        } catch {
          notifyUnavailable();
        }
      } else {
        notifyUnavailable();
      }
      resolve(false);
    };

    const onOpened = (event) => {
      if (event.detail?.requestId !== requestId) return;
      settle(true);
    };

    target.addEventListener(PAGE_EVENTS.opened, onOpened);
    timerId = setTimeout(() => settle(false), timeoutMs);

    try {
      const dispatched = target.dispatchEvent(new CustomEventCtor(PAGE_EVENTS.open, {
        detail: { requestId }
      }));
      if (dispatched === false) settle(false);
    } catch {
      settle(false);
    }
  });
}

export function createDistributionBridgeLifecycle() {
  let disposed = false;
  let installed = false;
  let disposeInstalled = null;

  return {
    install(installBridge) {
      if (disposed || installed) return;
      installed = true;
      const disposer = installBridge();
      if (disposed) {
        disposer?.();
        return;
      }
      disposeInstalled = typeof disposer === 'function' ? disposer : null;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const disposer = disposeInstalled;
      disposeInstalled = null;
      disposer?.();
    }
  };
}

export function installDistributionBridge({
  target = document,
  createPackage,
  CustomEventCtor = CustomEvent
}) {
  let disposed = false;
  const onRequest = async (event) => {
    const requestId = event.detail?.requestId;
    if (typeof requestId !== 'string' || !requestId.trim()) return;

    try {
      const article = await createPackage();
      if (disposed) return;
      target.dispatchEvent(new CustomEventCtor(PAGE_EVENTS.ready, {
        detail: { requestId, article }
      }));
    } catch (error) {
      if (disposed) return;
      const { code, message } = getSafeError(error);
      target.dispatchEvent(new CustomEventCtor(PAGE_EVENTS.error, {
        detail: { requestId, code, message }
      }));
    }
  };

  target.addEventListener(PAGE_EVENTS.request, onRequest);
  return () => {
    if (disposed) return;
    disposed = true;
    target.removeEventListener(PAGE_EVENTS.request, onRequest);
  };
}
