import { describe, expect, it, vi } from 'vitest';
import { createAdapterRegistry } from '../src/core/adapter-registry.js';

function validAdapter(id = 'weixin') {
  return { id, checkAuth: vi.fn(), uploadImage: vi.fn(), saveDraft: vi.fn() };
}

describe('adapter registry', () => {
  it('exposes registered fixed IDs and creates a validated adapter on demand', () => {
    const factory = vi.fn(() => validAdapter());
    const registry = createAdapterRegistry({ weixin: factory });

    expect(registry.registeredIds()).toEqual(['weixin']);
    expect(registry.create('weixin')).toMatchObject({ id: 'weixin' });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('fails closed for missing factories and mismatched adapter identities', () => {
    const registry = createAdapterRegistry({ weixin: () => validAdapter('zhihu') });
    expect(() => registry.create('zhihu')).toThrowError(expect.objectContaining({ code: 'PLATFORM_CHANGED', retryable: false }));
    expect(() => registry.create('weixin')).toThrowError(expect.objectContaining({ code: 'PLATFORM_CHANGED', retryable: false }));
  });
});
