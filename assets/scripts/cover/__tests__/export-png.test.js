import { describe, expect, it } from 'vitest';
import { waitForDocumentFonts } from '../export-png.js';

describe('cover PNG font readiness', () => {
  it('waits for the supplied font set before export', async () => {
    let resolveReady;
    const ready = new Promise(resolve => { resolveReady = resolve; });
    let settled = false;

    const waiting = waitForDocumentFonts({ ready }).then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);

    resolveReady();
    await waiting;
    expect(settled).toBe(true);
  });

  it('does not fail when the font API is unavailable', async () => {
    await expect(waitForDocumentFonts(undefined)).resolves.toBeUndefined();
  });
});
