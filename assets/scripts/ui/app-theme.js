export const APP_THEME_STORAGE_KEY = 'opengzh-app-theme';
export const DEFAULT_APP_THEME = 'light';

export function normalizeAppTheme(value) {
  return value === 'dark' ? 'dark' : DEFAULT_APP_THEME;
}

export function readStoredAppTheme(storage = globalThis.localStorage) {
  try {
    return normalizeAppTheme(storage?.getItem(APP_THEME_STORAGE_KEY));
  } catch (_error) {
    return DEFAULT_APP_THEME;
  }
}

export function applyAppTheme(
  value,
  { root = globalThis.document?.documentElement, storage = globalThis.localStorage, persist = true } = {},
) {
  const theme = normalizeAppTheme(value);
  if (root?.dataset) root.dataset.appTheme = theme;
  if (persist) {
    try {
      storage?.setItem(APP_THEME_STORAGE_KEY, theme);
    } catch (_error) {
      // Persistence is optional; the current page still keeps the selected theme.
    }
  }
  return theme;
}

export function toggleAppTheme(value) {
  return normalizeAppTheme(value) === 'dark' ? 'light' : 'dark';
}
