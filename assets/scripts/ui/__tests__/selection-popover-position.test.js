import { describe, expect, it } from 'vitest';
import { placeSelectionPopover } from '../selection-popover-position.js';

describe('placeSelectionPopover', () => {
  const bounds = { left: 100, right: 900, top: 50, bottom: 750 };
  const size = { width: 340, height: 420 };

  it('places right first, flips left, then clamps to safe bounds', () => {
    expect(placeSelectionPopover({ x: 400, y: 200 }, size, bounds)).toMatchObject({
      side: 'right', left: 412
    });
    expect(placeSelectionPopover({ x: 800, y: 200 }, size, bounds)).toMatchObject({
      side: 'left', left: 448
    });
    expect(placeSelectionPopover({ x: 500, y: 720 }, size, bounds).top).toBe(318);
  });

  it('returns the editor top-right fallback for an invalid anchor', () => {
    expect(placeSelectionPopover(null, size, bounds)).toEqual({
      side: 'fallback', left: 548, top: 62
    });
  });

  it('stays inside narrow bounds even when the popover is wider than the editor', () => {
    expect(placeSelectionPopover({ x: 140, y: 70 }, { width: 500, height: 800 }, {
      left: 100, right: 420, top: 50, bottom: 500
    })).toEqual({ side: 'clamped', left: 112, top: 62 });
  });
});
