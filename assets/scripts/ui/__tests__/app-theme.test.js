import { describe, expect, it, vi } from 'vitest';
import {
  APP_THEME_STORAGE_KEY,
  DEFAULT_APP_THEME,
  applyAppTheme,
  normalizeAppTheme,
  readStoredAppTheme,
  toggleAppTheme,
} from '../app-theme.js';

describe('application theme state', () => {
  it('defaults missing or invalid values to light', () => {
    expect(DEFAULT_APP_THEME).toBe('light');
    expect(normalizeAppTheme(null)).toBe('light');
    expect(normalizeAppTheme('system')).toBe('light');
    expect(normalizeAppTheme('light')).toBe('light');
    expect(normalizeAppTheme('dark')).toBe('dark');
  });

  it('reads a stored dark choice and survives unavailable storage', () => {
    expect(readStoredAppTheme({ getItem: () => 'dark' })).toBe('dark');
    expect(readStoredAppTheme({ getItem: () => 'invalid' })).toBe('light');
    expect(readStoredAppTheme({ getItem: () => { throw new Error('blocked'); } })).toBe('light');
  });

  it('applies and persists a normalized theme', () => {
    const root = { dataset: {} };
    const storage = { setItem: vi.fn() };
    expect(applyAppTheme('dark', { root, storage })).toBe('dark');
    expect(root.dataset.appTheme).toBe('dark');
    expect(storage.setItem).toHaveBeenCalledWith(APP_THEME_STORAGE_KEY, 'dark');
  });

  it('keeps the visual switch when persistence fails', () => {
    const root = { dataset: {} };
    const storage = { setItem: () => { throw new Error('blocked'); } };
    expect(applyAppTheme('dark', { root, storage })).toBe('dark');
    expect(root.dataset.appTheme).toBe('dark');
  });

  it('toggles between the two supported themes', () => {
    expect(toggleAppTheme('light')).toBe('dark');
    expect(toggleAppTheme('dark')).toBe('light');
    expect(toggleAppTheme('invalid')).toBe('dark');
  });
});
