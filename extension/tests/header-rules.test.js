import { describe, expect, it, vi } from 'vitest';
import { HEADER_RULE_IDS, withSessionHeaderRules } from '../src/core/header-rules.js';

describe('header rules', () => {
  it('locks rule IDs by platform', () => {
    expect(HEADER_RULE_IDS).toEqual({
      weixin: [1001],
      zhihu: [2001, 2002],
      juejin: [3001, 3002],
      woshipm: [4001],
    });
  });

  it.each(['success', 'throw'])('removes rules after %s', async (mode) => {
    const updateSessionRules = vi.fn(async () => {});
    const work = mode === 'success'
      ? vi.fn(async () => 'done')
      : vi.fn(async () => { throw new Error('network'); });
    const promise = withSessionHeaderRules(
      { updateSessionRules },
      [{ id: 1001, priority: 1, action: { type: 'modifyHeaders', requestHeaders: [] }, condition: { urlFilter: '*://example.test/*' } }],
      work,
    );
    if (mode === 'success') await expect(promise).resolves.toBe('done');
    else await expect(promise).rejects.toThrow('network');
    expect(updateSessionRules).toHaveBeenNthCalledWith(1, {
      removeRuleIds: [1001],
      addRules: [expect.objectContaining({ id: 1001 })],
    });
    expect(updateSessionRules).toHaveBeenLastCalledWith({ removeRuleIds: [1001] });
  });

  it('attempts cleanup when add itself throws and preserves the primary failure', async () => {
    const addError = new Error('add failed');
    const cleanupError = new Error('cleanup failed');
    const updateSessionRules = vi.fn()
      .mockRejectedValueOnce(addError)
      .mockRejectedValueOnce(cleanupError);
    await expect(withSessionHeaderRules(
      { updateSessionRules },
      [{ id: 2001 }],
      vi.fn(),
    )).rejects.toBe(addError);
    expect(updateSessionRules).toHaveBeenNthCalledWith(1, { removeRuleIds: [2001], addRules: [{ id: 2001 }] });
    expect(updateSessionRules).toHaveBeenNthCalledWith(2, { removeRuleIds: [2001] });
    expect(addError.cleanupError).toBe(cleanupError);
  });

  it('surfaces a cleanup failure when the protected work succeeded', async () => {
    const cleanupError = new Error('cleanup failed');
    const updateSessionRules = vi.fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(cleanupError);
    await expect(withSessionHeaderRules(
      { updateSessionRules },
      [{ id: 4001 }],
      async () => 'done',
    )).rejects.toBe(cleanupError);
  });
});
