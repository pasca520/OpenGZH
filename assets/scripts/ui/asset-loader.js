// Static-host asset loader. Keep one release version for every cacheable asset.
const ASSET_VERSION = '2026.08.24';
const withVersion = (path) => `${path}?v=${ASSET_VERSION}`;

const stylesheets = [
  'assets/styles/base.css',
  'assets/styles/editor.css',
  'assets/styles/panel.css',
  'assets/styles/cover.css',
  'assets/vendor/katex.min.css',
  'assets/vendor/texmath.min.css',
  'assets/styles/fonts.css',
  'assets/styles/xhs.css'
];

const scripts = [
  { path: 'assets/vendor/markdown-it.min.js' },
  { path: 'assets/vendor/katex.min.js' },
  { path: 'assets/vendor/texmath.min.js' },
  { path: 'assets/scripts/ui/mathjax-config.js' },
  { path: 'assets/vendor/tex-svg-full.js', id: 'mathjax-script', defer: true },
  { path: 'assets/vendor/highlight.min.js' },
  { path: 'assets/vendor/turndown.js' },
  { path: 'assets/vendor/vue.global.prod.js' }
];

document.write(stylesheets.map((path) => `<link rel="stylesheet" href="${withVersion(path)}">`).join(''));
document.write(scripts.map(({ path, id, defer }) => `<script${id ? ` id="${id}"` : ''}${defer ? ' defer' : ''} src="${withVersion(path)}"></script>`).join(''));
