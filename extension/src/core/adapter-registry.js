import { PLATFORM_IDS, assertAdapter } from './adapter-contract.js';
import { PlatformError } from './platform-errors.js';

export function createAdapterRegistry(factories = {}) {
  const registered = PLATFORM_IDS.filter((platformId) => typeof factories[platformId] === 'function');
  return Object.freeze({
    registeredIds: () => registered.slice(),
    create(platformId) {
      if (!PLATFORM_IDS.includes(platformId) || typeof factories[platformId] !== 'function') {
        throw new PlatformError('PLATFORM_CHANGED', '平台适配器未注册', { retryable: false });
      }
      let adapter;
      try {
        adapter = assertAdapter(factories[platformId]());
      } catch (error) {
        if (error instanceof TypeError) throw new PlatformError('PLATFORM_CHANGED', error.message, { retryable: false });
        throw error;
      }
      if (adapter.id !== platformId) {
        throw new PlatformError('PLATFORM_CHANGED', '平台适配器标识与注册键不一致', { retryable: false });
      }
      return adapter;
    },
  });
}
