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

  it.each([undefined, null, false, 0, ''])('preserves a falsy thrown value: %p', async (thrown) => {
    const updateSessionRules = vi.fn(async () => {});
    await expect(withSessionHeaderRules(
      { updateSessionRules },
      [{ id: 1001 }],
      async () => { throw thrown; },
    )).rejects.toBe(thrown);
    expect(updateSessionRules).toHaveBeenCalledTimes(2);
  });

  it.each([
    [],
    [{ id: 0 }],
    [{ id: -1 }],
    [{ id: 1.5 }],
    [{ id: '1' }],
    [{ id: 1 }, { id: 1 }],
  ])('rejects unsafe rule input %j before touching DNR', async (rules) => {
    const updateSessionRules = vi.fn(async () => {});
    await expect(withSessionHeaderRules({ updateSessionRules }, rules, async () => 'done')).rejects.toThrow();
    expect(updateSessionRules).not.toHaveBeenCalled();
  });

  it('serializes concurrent protected work and cleans A before adding B', async () => {
    let releaseA;
    const workA = vi.fn(() => new Promise((resolve) => { releaseA = resolve; }));
    const workB = vi.fn(async () => 'b');
    const updateSessionRules = vi.fn(async () => {});
    const first = withSessionHeaderRules({ updateSessionRules }, [{ id: 1001 }], workA);
    await vi.waitFor(() => expect(workA).toHaveBeenCalledTimes(1));
    const second = withSessionHeaderRules({ updateSessionRules }, [{ id: 2001 }], workB);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(updateSessionRules).toHaveBeenCalledTimes(1);
    releaseA();
    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBe('b');
    expect(updateSessionRules.mock.calls.map(([request]) => request)).toEqual([
      { removeRuleIds: [1001], addRules: [{ id: 1001 }] },
      { removeRuleIds: [1001] },
      { removeRuleIds: [2001], addRules: [{ id: 2001 }] },
      { removeRuleIds: [2001] },
    ]);
  });
});
