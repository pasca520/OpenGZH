// Blocking theme bootstrap: prevent a saved dark theme from flashing light.
(() => {
  let theme = 'light';
  try {
    theme = localStorage.getItem('opengzh-app-theme') === 'dark' ? 'dark' : 'light';
  } catch (_error) {
    // Storage can be unavailable; light remains the product default.
  }
  document.documentElement.dataset.appTheme = theme;
})();
