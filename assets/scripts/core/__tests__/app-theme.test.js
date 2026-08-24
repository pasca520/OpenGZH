import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, 'utf8');
const baseCss = read('assets/styles/base.css');
const html = read('index.html');
const mainSource = read('assets/scripts/main.js');
const themeBootstrap = read('assets/scripts/ui/app-theme-bootstrap.js');
const assetLoader = read('assets/scripts/ui/asset-loader.js');

function tokenFromBlock(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})\\s*;`));
  if (!match) throw new Error(`Missing hex token: ${name}`);
  return match[1].toUpperCase();
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((part) => parseInt(part, 16) / 255);
  const linear = channels.map((value) => value <= 0.03928
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function selectorBlock(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]+)\\}`));
  if (!match) throw new Error(`Missing selector: ${selector}`);
  return match[1];
}

function palette(selector) {
  const block = selectorBlock(baseCss, selector);
  return {
    base: tokenFromBlock(block, '--color-surface-base'),
    muted: tokenFromBlock(block, '--color-surface-muted'),
    raised: tokenFromBlock(block, '--color-surface-raised'),
    border: tokenFromBlock(block, '--color-border-default'),
    text: tokenFromBlock(block, '--color-text-primary'),
    inverse: tokenFromBlock(block, '--color-text-inverse'),
    secondary: tokenFromBlock(block, '--color-text-secondary'),
    tertiary: tokenFromBlock(block, '--color-text-tertiary'),
    accent: tokenFromBlock(block, '--color-accent'),
    onAccent: tokenFromBlock(block, '--color-on-accent'),
    danger: tokenFromBlock(block, '--color-danger'),
    warning: tokenFromBlock(block, '--color-warning'),
  };
}

describe('application theme palettes', () => {
  it('locks the approved light default and dark override palettes', () => {
    expect(palette(':root')).toEqual({
      base: '#F7F1E8',
      muted: '#EFE6DB',
      raised: '#FFFDF8',
      border: '#D8C8B8',
      text: '#332821',
      inverse: '#FFF7ED',
      secondary: '#6F5E52',
      tertiary: '#766354',
      accent: '#B64B39',
      onAccent: '#FFF7ED',
      danger: '#B33D30',
      warning: '#8A5700',
    });

    expect(palette(':root[data-app-theme="dark"]')).toEqual({
      base: '#181512',
      muted: '#211D19',
      raised: '#29231E',
      border: '#4A3D35',
      text: '#FFF7ED',
      inverse: '#FFF7ED',
      secondary: '#D7C7B8',
      tertiary: '#B9A494',
      accent: '#FF8A76',
      onAccent: '#26120F',
      danger: '#FF9A9A',
      warning: '#FBBF70',
    });
  });

  it('keeps text, semantic states, and filled actions at WCAG AA contrast', () => {
    for (const selector of [':root', ':root[data-app-theme="dark"]']) {
      const colors = palette(selector);
      expect(contrast(colors.text, colors.raised)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.tertiary, colors.raised)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.accent, colors.base)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.danger, colors.raised)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors.warning, colors.raised)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('uses the on-accent token for shared filled actions', () => {
    for (const selector of ['.header-tab.active', '.sidebar-action-btn.primary', '.toast-success', '.modal-btn-primary']) {
      expect(selectorBlock(baseCss, selector)).toMatch(/color:\s*var\(--color-on-accent\)/);
    }
  });

  it('uses the on-accent token for workspace filled actions', () => {
    const contracts = [
      ['assets/styles/editor.css', ['.copy-btn', '.cover-header-export-btn']],
      ['assets/styles/panel.css', ['.theme-card-badge']],
      ['assets/styles/cover.css', ['.cover-export-btn', '.cover-illust-cat-btn.active']],
      ['assets/styles/xhs.css', ['.xhs-download-btn']],
    ];

    for (const [path, selectors] of contracts) {
      const css = read(path);
      for (const selector of selectors) {
        expect(selectorBlock(css, selector)).toMatch(/color:\s*var\(--color-on-accent\)/);
      }
    }
  });

  it('themes browser-focusable picker scroll regions', () => {
    const editorCss = read('assets/styles/editor.css');
    for (const selector of ['.template-dropdown-scroll:focus-visible', '.typo-dropdown-scroll:focus-visible']) {
      expect(selectorBlock(editorCss, selector))
        .toMatch(/outline:\s*2px solid var\(--color-accent\)/);
    }
  });

  it('uses theme-aware semantic colors in application chrome', () => {
    const xhsCss = read('assets/styles/xhs.css');
    expect(selectorBlock(baseCss, '.sidebar-icon-btn.danger:hover')).toMatch(/color:\s*var\(--color-danger\)/);
    expect(selectorBlock(baseCss, '.status-error')).toMatch(/color:\s*var\(--color-danger\)/);
    expect(selectorBlock(xhsCss, '.xhs-warning')).toMatch(/color:\s*var\(--color-warning\)/);
    for (const selector of ['.xhs-issue', '.xhs-break-remove', '.xhs-cover-clear']) {
      expect(selectorBlock(xhsCss, selector)).toMatch(/color:\s*var\(--color-danger\)/);
    }
  });

  it('restores the saved theme before application styles load', () => {
    const bootstrapIndex = html.indexOf('assets/scripts/ui/app-theme-bootstrap.js');
    const stylesheetIndex = html.indexOf('assets/scripts/ui/asset-loader.js');
    expect(bootstrapIndex).toBeGreaterThan(-1);
    expect(bootstrapIndex).toBeLessThan(stylesheetIndex);
    expect(assetLoader).toContain("'assets/styles/base.css'");
    expect(themeBootstrap).toContain("let theme = 'light'");
    expect(themeBootstrap).toContain('document.documentElement.dataset.appTheme = theme');
  });

  it('keeps app theme and article preview controls distinct', () => {
    expect(html).toContain('class="app-theme-toggle"');
    expect(html).toMatch(/:aria-label="appTheme === 'dark' \? '切换到浅色界面' : '切换到深色界面'"/);
    expect(html).toMatch(/:title="appTheme === 'dark' \? '切换到浅色界面' : '切换到深色界面'"/);
    expect(html).toMatch(/文章预览切换到浅色/);
    expect(html).toMatch(/文章预览切换到深色/);
  });

  it('wires Vue state to the application theme module', () => {
    expect(mainSource).toMatch(/from '\.\/ui\/app-theme\.js'/);
    expect(mainSource).toMatch(/const appTheme = ref\(normalizeAppTheme\(document\.documentElement\.dataset\.appTheme\)\)/);
    expect(mainSource).toMatch(/function switchAppTheme\(\)/);
    expect(mainSource).toMatch(/applyAppTheme\(toggleAppTheme\(appTheme\.value\)\)/);
    expect(mainSource).toMatch(/\bappTheme,\s*\n\s*switchAppTheme,/);
  });
});
