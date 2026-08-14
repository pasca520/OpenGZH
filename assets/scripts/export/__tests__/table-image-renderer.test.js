import { describe, expect, it, vi } from 'vitest';
import {
  TABLE_IMAGE_SCALE,
  TABLE_LOGICAL_WIDTH_FALLBACK,
  buildTableImageAlt,
  buildTableSvgMarkup,
  getTableCanvasSize,
  renderTableToPng,
} from '../table-image-renderer.js';

function makeTable(headers, bodyRows) {
  return {
    querySelectorAll(selector) {
      if (selector === 'th') return headers.map((textContent) => ({ textContent }));
      if (selector === 'tbody tr') return Array.from({ length: bodyRows }, () => ({}));
      return [];
    },
  };
}

describe('table image helpers', () => {
  it('uses a 2x retina canvas', () => {
    expect(TABLE_IMAGE_SCALE).toBe(2);
    expect(TABLE_LOGICAL_WIDTH_FALLBACK).toBe(750);
    expect(getTableCanvasSize(750, 121)).toEqual({ width: 1500, height: 242 });
  });

  it('rejects dimensions above the conservative canvas limit', () => {
    expect(() => getTableCanvasSize(750, 9000)).toThrow('表格尺寸过大');
  });

  it('builds an accessible summary from headers and row count', () => {
    expect(buildTableImageAlt(makeTable([' 名称 ', '状态'], 3))).toBe('表格：名称、状态，共 3 行');
    expect(buildTableImageAlt(makeTable([], 1))).toBe('表格，共 1 行');
  });

  it('builds an SVG foreignObject with an escaped background', () => {
    const svg = buildTableSvgMarkup('<div xmlns="http://www.w3.org/1999/xhtml">表格</div>', 750, 120, 'rgb(1, 2, 3)');
    expect(svg).toContain('<foreignObject width="100%" height="100%">');
    expect(svg).toContain('background:rgb(1, 2, 3)');
    expect(svg).toContain('width="750" height="120"');
  });
});

describe('renderTableToPng', () => {
  it('waits for fonts, passes 2x dimensions to rasterization, and cleans up', async () => {
    const order = [];
    const cleanup = vi.fn(() => order.push('cleanup'));
    const rasterize = vi.fn(async (_svg, size) => {
      order.push('rasterize');
      expect(size).toEqual({ width: 1500, height: 240 });
      return new Blob(['png'], { type: 'image/png' });
    });

    const result = await renderTableToPng({}, {
      fontsReady: Promise.resolve().then(() => order.push('fonts')),
      measureTable: () => ({
        xhtml: '<div xmlns="http://www.w3.org/1999/xhtml">table</div>',
        width: 750,
        height: 120,
        cleanup,
      }),
      rasterize,
    });

    expect(result.blob.type).toBe('image/png');
    expect(result.logicalWidth).toBe(750);
    expect(result.logicalHeight).toBe(120);
    expect(order).toEqual(['fonts', 'rasterize', 'cleanup']);
  });

  it('cleans up when rasterization fails', async () => {
    const cleanup = vi.fn();

    await expect(renderTableToPng({}, {
      fontsReady: Promise.resolve(),
      measureTable: () => ({
        xhtml: '<div xmlns="http://www.w3.org/1999/xhtml">table</div>',
        width: 750,
        height: 120,
        cleanup,
      }),
      rasterize: async () => { throw new Error('decode failed'); },
    })).rejects.toThrow('decode failed');

    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('rejects an empty Canvas blob', async () => {
    await expect(renderTableToPng({}, {
      fontsReady: Promise.resolve(),
      measureTable: () => ({
        xhtml: '<div xmlns="http://www.w3.org/1999/xhtml">table</div>',
        width: 750,
        height: 120,
        cleanup: () => {},
      }),
      rasterize: async () => null,
    })).rejects.toThrow('表格图片生成失败');
  });
});
