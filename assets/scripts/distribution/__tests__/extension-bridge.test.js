import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { installDistributionBridge, PAGE_EVENTS } from '../extension-bridge.js';

const mainSource = readFileSync(fileURLToPath(new URL('../../main.js', import.meta.url)), 'utf8');

class TestCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    removeEventListener(name, listener) {
      if (listeners.get(name) === listener) listeners.delete(name);
    },
    dispatchEvent: vi.fn((event) => listeners.get(event.type)?.(event)),
    listeners
  };
}

function dispatchRequest(target, detail) {
  target.dispatchEvent({ type: PAGE_EVENTS.request, detail });
}

describe('installDistributionBridge', () => {
  it('waits for the initial render before persisting and installing the bridge', () => {
    const mountedBlock = mainSource.slice(
      mainSource.indexOf('onMounted(async () =>'),
      mainSource.indexOf('onBeforeUnmount(() =>')
    );
    const renderIndex = mountedBlock.indexOf('await renderMarkdown();');
    const persistIndex = mountedBlock.indexOf('await persistDocumentState();', renderIndex);
    const bridgeIndex = mountedBlock.indexOf('disposeDistributionBridge = installDistributionBridge({', persistIndex);

    expect(renderIndex).toBeGreaterThanOrEqual(0);
    expect(persistIndex).toBeGreaterThan(renderIndex);
    expect(bridgeIndex).toBeGreaterThan(persistIndex);
  });

  it('exports the fixed page event names', () => {
    expect(PAGE_EVENTS).toEqual({
      request: 'opengzh:distribution:request',
      ready: 'opengzh:distribution:ready',
      error: 'opengzh:distribution:error'
    });
    expect(Object.isFrozen(PAGE_EVENTS)).toBe(true);
  });

  it('accepts only a non-empty requestId and ignores request detail inputs', async () => {
    const target = createEventTarget();
    const article = { schemaVersion: 1, title: '标题' };
    const createPackage = vi.fn(async () => article);
    const dispose = installDistributionBridge({ target, createPackage, CustomEventCtor: TestCustomEvent });

    for (const detail of [null, {}, { requestId: '' }, { requestId: '   ' }, { requestId: 42 }]) {
      dispatchRequest(target, detail);
    }
    target.dispatchEvent({ type: `${PAGE_EVENTS.request}:other`, detail: { requestId: 'ignored' } });
    expect(createPackage).not.toHaveBeenCalled();

    dispatchRequest(target, {
      requestId: 'request-1',
      url: 'https://evil.example/article',
      platform: 'weixin',
      article: 'ignored input'
    });
    await vi.waitFor(() => expect(createPackage).toHaveBeenCalledTimes(1));
    expect(createPackage).toHaveBeenCalledWith();
    expect(target.dispatchEvent).toHaveBeenLastCalledWith(expect.objectContaining({
      type: PAGE_EVENTS.ready,
      detail: { requestId: 'request-1', article }
    }));
    dispose();
  });

  it('removes the same request listener on dispose and stops responding', async () => {
    const target = createEventTarget();
    const createPackage = vi.fn(async () => ({ schemaVersion: 1 }));
    const dispose = installDistributionBridge({ target, createPackage, CustomEventCtor: TestCustomEvent });

    dispose();
    expect(target.listeners.has(PAGE_EVENTS.request)).toBe(false);
    dispatchRequest(target, { requestId: 'after-dispose' });
    await Promise.resolve();
    expect(createPackage).not.toHaveBeenCalled();
    expect(target.dispatchEvent).toHaveBeenCalledTimes(1);
  });

  it('sanitizes failure code and message without leaking error fields', async () => {
    const target = createEventTarget();
    const createPackage = vi.fn(async () => {
      throw Object.assign(new Error('secret message token=secret-token'), {
        code: 'UNKNOWN_CODE',
        token: 'secret-token',
        stack: 'secret stack',
        details: { password: 'secret-password' }
      });
    });
    installDistributionBridge({ target, createPackage, CustomEventCtor: TestCustomEvent });

    dispatchRequest(target, { requestId: 'request-2' });
    await vi.waitFor(() => expect(target.dispatchEvent).toHaveBeenLastCalledWith(expect.objectContaining({
      type: PAGE_EVENTS.error
    })));
    const errorEvent = target.dispatchEvent.mock.lastCall[0];
    expect(errorEvent.detail).toEqual({
      requestId: 'request-2',
      code: 'ARTICLE_INVALID',
      message: '文章快照生成失败'
    });
    expect(JSON.stringify(errorEvent.detail)).not.toContain('secret');
    expect(Object.keys(errorEvent.detail)).toEqual(['requestId', 'code', 'message']);
  });
});
