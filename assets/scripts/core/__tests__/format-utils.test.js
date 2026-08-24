import { describe, expect, it } from 'vitest';
import { clampNumber, hexToRgba } from '../format-utils.js';

describe('format utils', () => {
  it('preserves integer and precision-aware clamping behavior', () => {
    expect(clampNumber('12.8', 0, 10, 4)).toBe(10);
    expect(clampNumber('0.126', 0, 1, 0, 2)).toBe(0.13);
    expect(clampNumber('0.126', 0, 1, 0, null)).toBe(0.126);
    expect(clampNumber('invalid', 0, 1, 0.5, 2)).toBe(0.5);
  });

  it('converts six and three digit hex colors and falls back safely', () => {
    expect(hexToRgba('#123456', 0.2)).toBe('rgba(18, 52, 86, 0.2)');
    expect(hexToRgba('#abc', 1)).toBe('rgba(170, 187, 204, 1)');
    expect(hexToRgba('not-a-color', 0.4)).toBe('rgba(0, 0, 0, 0.4)');
  });
});
