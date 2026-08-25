import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDistributionBridgeLifecycle,
  installDistributionBridge,
  PAGE_EVENTS,
  requestDistributionOpen
} from '../extension-bridge.js';

const mainSource = readFileSync(fileURLToPath(new URL('../../main.js', import.meta.url)), 'utf8');

afterEach(() => {
  vi.useRealTimers();
});

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
    const lifecycleIndex = mountedBlock.indexOf('createDistributionBridgeLifecycle();');
    const firstAwaitIndex = mountedBlock.indexOf('await ');
    const renderIndex = mountedBlock.indexOf('await renderMarkdown();');
    const persistIndex = mountedBlock.indexOf('await persistDocumentState();', renderIndex);
    const bridgeIndex = mountedBlock.indexOf('bridgeLifecycle.install(() => installDistributionBridge({', persistIndex);

    expect(lifecycleIndex).toBeGreaterThanOrEqual(0);
    expect(firstAwaitIndex).toBeGreaterThan(lifecycleIndex);
    expect(renderIndex).toBeGreaterThanOrEqual(0);
    expect(persistIndex).toBeGreaterThan(renderIndex);
    expect(bridgeIndex).toBeGreaterThan(persistIndex);
  });

  it('disposes the mount lifecycle before clearing it during unmount', () => {
    const unmountStart = mainSource.indexOf('onBeforeUnmount(() =>');
    const unmountBlock = mainSource.slice(unmountStart, mainSource.indexOf('return {', unmountStart));

    expect(unmountBlock).toContain('distributionBridgeLifecycle?.dispose();');
    expect(unmountBlock).toContain('distributionBridgeLifecycle = null;');
  });

  it('keeps render revision and in-flight cleanup race-safe', () => {
    const performStart = mainSource.indexOf('function performRender(');
    const renderStart = mainSource.indexOf('function renderMarkdown()', performStart);
    const performBlock = mainSource.slice(performStart, renderStart);
    const renderEnd = mainSource.indexOf('/** 尾沿防抖', renderStart);
    const renderBlock = mainSource.slice(renderStart, renderEnd);
    const flushStart = mainSource.indexOf('async function flushPendingRender()', renderEnd);
    const flushEnd = mainSource.indexOf('function sortDocumentsByCurrentOrder()', flushStart);
    const flushBlock = mainSource.slice(flushStart, flushEnd);

    expect(performBlock).toContain('if (renderInFlight === job)');
    expect(performBlock).toContain('renderInFlight = null;');
    expect(renderBlock).toContain('return performRender(++renderRevision);');
    expect(flushBlock).toContain('async function flushPendingRender()');
    expect(flushBlock).toContain('while (true)');
    expect(flushBlock).toContain('clearTimeout(renderTimer);');
    expect(flushBlock).toContain('await job;');
  });

  it('captures distribution inputs synchronously after the stable render flush', () => {
    const mountedStart = mainSource.indexOf('onMounted(async () =>');
    const mountedBlock = mainSource.slice(mountedStart, mainSource.indexOf('onBeforeUnmount(() =>', mountedStart));
    const factoryStart = mountedBlock.indexOf('createPackage: async');
    const factoryBlock = mountedBlock.slice(factoryStart, mountedBlock.indexOf('nextTick', factoryStart));

    expect(factoryBlock).toContain('await flushPendingRender();');
    expect(factoryBlock).toContain('const documentId = activeDocument?.id || \'\';');
    expect(factoryBlock).toContain('const title = resolveDocumentDisplayTitle(activeDocument);');
    expect(factoryBlock).toContain('const markdown = markdownInput.value;');
    expect(factoryBlock).toContain('const renderedHtml = renderedContent.value;');
    expect(factoryBlock).toContain('const styleConfig = mergeTheme(');
    expect(factoryBlock).toContain('const codeTheme = getResolvedCodeTheme();');
    expect(factoryBlock).toContain('const displaySettingsSnapshot = { ...displaySettings.value };');
    expect(factoryBlock).toContain('displaySettings: displaySettingsSnapshot');
    expect(factoryBlock).not.toContain('displaySettings: displaySettings.value');
  });

  it('exports the fixed page event names', () => {
    expect(PAGE_EVENTS).toEqual({
      request: 'opengzh:distribution:request',
      ready: 'opengzh:distribution:ready',
      error: 'opengzh:distribution:error',
      open: 'opengzh:distribution:open',
      opened: 'opengzh:distribution:opened'
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

  it.each(['resolve', 'reject'])('does not dispatch a late %s response after disposal', async (outcome) => {
    const target = createEventTarget();
    let settle;
    const createPackage = vi.fn(() => new Promise((resolve, reject) => {
      settle = outcome === 'resolve' ? resolve : reject;
    }));
    const dispose = installDistributionBridge({ target, createPackage, CustomEventCtor: TestCustomEvent });

    dispatchRequest(target, { requestId: `late-${outcome}` });
    await vi.waitFor(() => expect(createPackage).toHaveBeenCalledTimes(1));
    dispose();
    settle(outcome === 'resolve' ? { schemaVersion: 1 } : new Error('late failure'));
    await Promise.resolve();
    await Promise.resolve();

    expect(target.dispatchEvent.mock.calls.filter(([event]) => [PAGE_EVENTS.ready, PAGE_EVENTS.error].includes(event.type))).toHaveLength(0);
  });

  it('does not install a bridge after lifecycle disposal happens before install', () => {
    const lifecycle = createDistributionBridgeLifecycle();
    const install = vi.fn(() => vi.fn());

    lifecycle.dispose();
    lifecycle.install(install);
    lifecycle.install(install);

    expect(install).not.toHaveBeenCalled();
  });

  it('disposes an installed bridge exactly once and is idempotent', () => {
    const lifecycle = createDistributionBridgeLifecycle();
    const dispose = vi.fn();
    const install = vi.fn(() => dispose);

    lifecycle.install(install);
    lifecycle.install(install);
    lifecycle.dispose();
    lifecycle.dispose();

    expect(install).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
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

describe('requestDistributionOpen', () => {
  it('resolves true for a matching acknowledgement and cleans up', async () => {
    const target = createEventTarget();
    const openWindow = vi.fn();
    const promise = requestDistributionOpen({
      target,
      CustomEventCtor: TestCustomEvent,
      requestId: 'open-1',
      timeoutMs: 500,
      openWindow
    });

    expect(target.dispatchEvent).toHaveBeenCalledWith({
      type: PAGE_EVENTS.open,
      detail: { requestId: 'open-1' }
    });
    expect(target.listeners.has(PAGE_EVENTS.opened)).toBe(true);

    target.dispatchEvent({ type: PAGE_EVENTS.opened, detail: { requestId: 'open-1' } });

    await expect(promise).resolves.toBe(true);
    expect(target.listeners.has(PAGE_EVENTS.opened)).toBe(false);
    expect(openWindow).not.toHaveBeenCalled();
  });

  it('ignores mismatched acknowledgement IDs until the matching one arrives', async () => {
    const target = createEventTarget();
    vi.useFakeTimers();
    const promise = requestDistributionOpen({
      target,
      CustomEventCtor: TestCustomEvent,
      requestId: 'open-2',
      timeoutMs: 500,
      openWindow: vi.fn()
    });

    target.dispatchEvent({ type: PAGE_EVENTS.opened, detail: { requestId: 'other' } });
    await Promise.resolve();
    let settled = false;
    promise.then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);

    target.dispatchEvent({ type: PAGE_EVENTS.opened, detail: { requestId: 'open-2' } });
    await expect(promise).resolves.toBe(true);
  });

  it('notifies after the default 500ms timeout when the store URL is empty', async () => {
    const target = createEventTarget();
    const notifyUnavailable = vi.fn();
    const openWindow = vi.fn();
    vi.useFakeTimers();
    const promise = requestDistributionOpen({
      target,
      CustomEventCtor: TestCustomEvent,
      requestId: 'open-timeout',
      notifyUnavailable,
      openWindow
    });

    await vi.advanceTimersByTimeAsync(499);
    expect(notifyUnavailable).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    await expect(promise).resolves.toBe(false);
    expect(notifyUnavailable).toHaveBeenCalledTimes(1);
    expect(openWindow).not.toHaveBeenCalled();
    expect(target.listeners.has(PAGE_EVENTS.opened)).toBe(false);
  });

  it('opens a valid HTTPS Chrome Web Store URL on timeout', async () => {
    const target = createEventTarget();
    const openWindow = vi.fn();
    vi.useFakeTimers();
    const storeUrl = 'https://chromewebstore.google.com/detail/opengzh/abc123';
    const promise = requestDistributionOpen({
      target,
      CustomEventCtor: TestCustomEvent,
      requestId: 'open-store',
      timeoutMs: 10,
      storeUrl,
      openWindow,
      notifyUnavailable: vi.fn()
    });

    await vi.advanceTimersByTimeAsync(10);

    await expect(promise).resolves.toBe(false);
    expect(openWindow).toHaveBeenCalledWith(storeUrl, '_blank', 'noopener');
  });

  it('notifies instead of opening an unsafe store URL', async () => {
    const target = createEventTarget();
    const openWindow = vi.fn();
    const notifyUnavailable = vi.fn();
    vi.useFakeTimers();
    const promise = requestDistributionOpen({
      target,
      CustomEventCtor: TestCustomEvent,
      requestId: 'open-unsafe',
      timeoutMs: 10,
      storeUrl: 'https://evil.example/extension',
      openWindow,
      notifyUnavailable
    });

    await vi.advanceTimersByTimeAsync(10);

    await expect(promise).resolves.toBe(false);
    expect(openWindow).not.toHaveBeenCalled();
    expect(notifyUnavailable).toHaveBeenCalledTimes(1);
  });

  it('cleans up the listener and timer after a matching acknowledgement', async () => {
    const target = createEventTarget();
    const openWindow = vi.fn();
    vi.useFakeTimers();
    const promise = requestDistributionOpen({
      target,
      CustomEventCtor: TestCustomEvent,
      requestId: 'open-clean',
      timeoutMs: 500,
      openWindow
    });

    target.dispatchEvent({ type: PAGE_EVENTS.opened, detail: { requestId: 'open-clean' } });
    await expect(promise).resolves.toBe(true);
    expect(target.listeners.has(PAGE_EVENTS.opened)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);

    await vi.advanceTimersByTimeAsync(500);
    expect(openWindow).not.toHaveBeenCalled();
  });

  it('cleans up after dispatch failure and ignores a late acknowledgement', async () => {
    const target = createEventTarget();
    const originalDispatch = target.dispatchEvent;
    target.dispatchEvent = vi.fn((event) => {
      if (event.type === PAGE_EVENTS.open) throw new Error('dispatch failed');
      return originalDispatch(event);
    });
    const notifyUnavailable = vi.fn();
    const openWindow = vi.fn();
    vi.useFakeTimers();
    const promise = requestDistributionOpen({
      target,
      CustomEventCtor: TestCustomEvent,
      requestId: 'open-dispatch-failure',
      timeoutMs: 500,
      openWindow,
      notifyUnavailable
    });

    await expect(promise).resolves.toBe(false);
    expect(target.listeners.has(PAGE_EVENTS.opened)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(notifyUnavailable).toHaveBeenCalledTimes(1);
    target.dispatchEvent({ type: PAGE_EVENTS.opened, detail: { requestId: 'open-dispatch-failure' } });
    await vi.advanceTimersByTimeAsync(500);
    expect(openWindow).not.toHaveBeenCalled();
  });
});
