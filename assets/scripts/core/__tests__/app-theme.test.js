import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (path) => readFileSync(`${root}${path}`, 'utf8');
const baseCss = read('assets/styles/base.css');

function token(name) {
  const match = baseCss.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})\\s*;`));
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

describe('Inkstone Coral application theme', () => {
  it('locks the approved semantic palette', () => {
    expect({
      base: token('--color-surface-base'),
      muted: token('--color-surface-muted'),
      raised: token('--color-surface-raised'),
      border: token('--color-border-default'),
      text: token('--color-text-primary'),
      inverse: token('--color-text-inverse'),
      secondary: token('--color-text-secondary'),
      tertiary: token('--color-text-tertiary'),
      accent: token('--color-accent'),
      onAccent: token('--color-on-accent'),
    }).toEqual({
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
    });
  });

  it('keeps normal text and filled actions at WCAG AA contrast', () => {
    expect(contrast(token('--color-text-primary'), token('--color-surface-raised'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--color-text-inverse'), token('--color-surface-base'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--color-text-tertiary'), token('--color-surface-raised'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--color-accent'), token('--color-surface-base'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('--color-on-accent'), token('--color-accent'))).toBeGreaterThanOrEqual(4.5);
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
});
