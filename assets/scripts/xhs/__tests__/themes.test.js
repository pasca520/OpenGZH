import { describe, expect, it } from 'vitest';
import { XHS_THEMES, XHS_REQUIRED_VARIANTS } from '../themes.js';

it('registers five complete and distinct themes', () => {
  expect(Object.keys(XHS_THEMES)).toHaveLength(5);
  for (const theme of Object.values(XHS_THEMES)) {
    expect(theme.variants).toEqual(expect.arrayContaining(XHS_REQUIRED_VARIANTS));
    expect(theme.fonts.body).toMatch(/^Noto (Sans|Serif) SC$/);
    expect(theme.fonts.code).toBe('JetBrains Mono');
    expect(theme.colors.background).toMatch(/^#/);
    expect(theme.colors.text).toMatch(/^#/);
  }
  expect(new Set(Object.values(XHS_THEMES).map((theme) => theme.visualDirection)).size).toBe(5);
});
