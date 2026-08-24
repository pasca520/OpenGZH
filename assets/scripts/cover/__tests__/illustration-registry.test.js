import { describe, expect, it, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_ILLUSTRATIONS,
  getIllustration,
  getIllustrationsByCategory,
  loadIllustrationRegistry
} from '../illustration-registry.js';

const registryPath = fileURLToPath(new URL('../../../images/cover-illustrations/registry.json', import.meta.url));

describe('illustration registry', () => {
  afterEach(() => {
    delete globalThis.fetch;
  });

  it('keeps the large registry out of the initial module and loads it on demand', async () => {
    expect(DEFAULT_ILLUSTRATIONS).toEqual([]);
    const entries = JSON.parse(readFileSync(registryPath, 'utf8'));
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => entries
    });

    await loadIllustrationRegistry('assets/images/cover-illustrations/registry.json');
    expect(DEFAULT_ILLUSTRATIONS.length).toBeGreaterThan(1000);
    expect(getIllustration('undraw-tech-ai-data').category).toBe('tech');
    expect(getIllustrationsByCategory('tech').length).toBeGreaterThan(0);
  });
});
