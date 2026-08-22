import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CARD_DECORATION_META,
  buildCardDecorationGif,
  layoutCardDecoration
} from '../card-decoration-gif.js';

const colors = { accent: '#315b4d', line: '#a69c89', soft: '#faf8f1', surface: '#ffffff' };
const kinds = ['highlight', 'steps', 'relationship', 'bookmark', 'documents'];

describe('card decoration GIF layouts', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('defines exactly five compact semantic decorations', () => {
    expect(Object.keys(CARD_DECORATION_META)).toEqual(kinds);
    for (const kind of kinds) {
      const layout = layoutCardDecoration(kind, colors, 0);
      expect(layout.width).toBeGreaterThan(0);
      expect(layout.height).toBeGreaterThan(0);
      expect(layout.width * layout.height).toBeLessThan(20000);
      expect(layout.primitives.length).toBeGreaterThan(0);
    }
  });

  it.each(kinds)('changes %s before settling into a readable resting phase', (kind) => {
    expect(layoutCardDecoration(kind, colors, 0).primitives)
      .not.toEqual(layoutCardDecoration(kind, colors, 1).primitives);
    expect(layoutCardDecoration(kind, colors, 3.5).resting).toBe(true);
  });

  it('fails closed outside the browser and for unknown kinds', () => {
    expect(layoutCardDecoration('unknown', colors, 0)).toEqual({
      width: 0,
      height: 0,
      primitives: [],
      resting: true
    });
    expect(buildCardDecorationGif({ kind: 'highlight', colors })).toBeNull();
  });

  it('encodes a browser canvas sequence as a GIF89a data URL', () => {
    const canvas = { width: 0, height: 0 };
    const context = {
      beginPath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() {},
      clearRect() {}, fill() {}, stroke() {}, save() {}, restore() {}, arc() {},
      getImageData() {
        const data = new Uint8ClampedArray(canvas.width * canvas.height * 4);
        data.set([49, 91, 77, 255]);
        return { data };
      }
    };
    canvas.getContext = () => context;
    vi.stubGlobal('document', { createElement: () => canvas });

    const gif = buildCardDecorationGif({ kind: 'highlight', colors, fps: 1 });

    expect(gif).toMatchObject({ width: 176, height: 28 });
    expect(gif.dataUrl).toMatch(/^data:image\/gif;base64,R0lGODlh/);
  });
});
