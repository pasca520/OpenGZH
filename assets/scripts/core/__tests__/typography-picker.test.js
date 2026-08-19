import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../..', import.meta.url));
const html = readFileSync(`${root}/index.html`, 'utf8');
const pickerStart = html.indexOf('<!-- Typography Dropdown -->');
const pickerEnd = html.indexOf('<div class="device-toggle"', pickerStart);
const picker = html.slice(pickerStart, pickerEnd);

describe('typography picker markup', () => {
  it('shows only fixed-choice controls', () => {
    expect(pickerStart).toBeGreaterThan(-1);
    expect(pickerEnd).toBeGreaterThan(pickerStart);
    expect(picker).not.toMatch(/type="(?:color|range|number)"/);
    expect(picker).not.toContain('imageStyleModeOptions');
    expect(picker).not.toContain('自定义');
  });

  it('keeps common choices visible and low-frequency choices disclosed', () => {
    const disclosure = picker.indexOf('<details class="typography-more">');
    expect(disclosure).toBeGreaterThan(-1);
    expect(picker.indexOf('fontScaleOptions')).toBeLessThan(disclosure);
    expect(picker.indexOf('fontFamilyOptions')).toBeLessThan(disclosure);
    expect(picker.indexOf('lineHeightOptions')).toBeLessThan(disclosure);
    expect(picker.indexOf('letterSpacingOptions')).toBeLessThan(disclosure);
    expect(picker.indexOf('contentPaddingOptions')).toBeLessThan(disclosure);
    expect(picker.indexOf('imageEffectOptions')).toBeGreaterThan(disclosure);
    expect(picker.indexOf('codeThemeList')).toBeGreaterThan(disclosure);
    expect(picker.indexOf('quotePresetOptions')).toBeGreaterThan(disclosure);
    expect(picker.indexOf('endStyleOptions')).toBeGreaterThan(disclosure);
  });

  it('offers researched fixed spacing choices without custom inputs', () => {
    expect(picker).toContain('>行间距<');
    expect(picker).toContain('>字间距<');
    expect(picker).toContain('>正文留白<');
    expect(picker).toContain("setStyleParamPreset('lineHeight', option.value)");
    expect(picker).toContain("setStyleParamPreset('letterSpacing', option.value)");
    expect(picker).toContain("setStyleParamPreset('contentPaddingX', option.value)");
  });

  it('行间距/字间距行回显当前数值', () => {
    expect(picker).toContain("styleParamCurrentLabel('lineHeight')");
    expect(picker).toContain("styleParamCurrentLabel('letterSpacing')");
    const lineHeightLabel = picker.slice(picker.indexOf('行间距'), picker.indexOf('行间距') + 200);
    const letterSpacingLabel = picker.slice(picker.indexOf('字间距'), picker.indexOf('字间距') + 200);
    expect(lineHeightLabel).toContain('typography-spacing-current');
    expect(letterSpacingLabel).toContain('typography-spacing-current');
  });
});
