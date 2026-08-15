import { describe, expect, it } from 'vitest';
import { createDefaultXhsSettings, normalizeXhsSettings } from '../constants.js';

describe('xhs settings', () => {
  it('creates isolated defaults', () => {
    const a = createDefaultXhsSettings();
    const b = createDefaultXhsSettings();
    a.cover.focalPoint.x = 1;
    expect(b.cover.focalPoint.x).toBe(50);
  });

  it('rejects unknown enum values and clamps focal points', () => {
    expect(normalizeXhsSettings({
      themeId: 'missing', density: 'tiny', tocEnabled: 1,
      footer: { authorEnabled: false },
      cover: { titleOverride: 7, focalPoint: { x: -8, y: 190 } }
    })).toMatchObject({
      schemaVersion: 1,
      themeId: 'minimal-white',
      density: 'standard',
      tocEnabled: false,
      footer: { authorEnabled: false },
      cover: { titleOverride: '', focalPoint: { x: 0, y: 100 } }
    });
  });
});
