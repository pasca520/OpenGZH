import { describe, it, expect } from 'vitest';
import { encodeGif } from '../gif-encoder.js';

function rgbaFrame(width, height, { r = 0, g = 0, b = 0, a = 255 } = {}) {
  const frame = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < frame.length; i += 4) {
    frame[i] = r;
    frame[i + 1] = g;
    frame[i + 2] = b;
    frame[i + 3] = a;
  }
  return frame;
}

function readU16LE(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

describe('encodeGif', () => {
  it('头部为 GIF89a', () => {
    const bytes = encodeGif([rgbaFrame(4, 4, { r: 255 })], 4, 4);
    expect(String.fromCharCode(...bytes.slice(0, 6))).toBe('GIF89a');
  });

  it('逻辑屏幕尺寸正确（小端）', () => {
    const bytes = encodeGif([rgbaFrame(7, 5)], 7, 5);
    expect(readU16LE(bytes, 6)).toBe(7);
    expect(readU16LE(bytes, 8)).toBe(5);
  });

  it('尾部为 0x3B（trailer）', () => {
    const bytes = encodeGif([rgbaFrame(4, 4)], 4, 4);
    expect(bytes[bytes.length - 1]).toBe(0x3b);
  });

  it('含 Netscape 循环扩展（无限循环）', () => {
    const bytes = encodeGif([rgbaFrame(4, 4)], 4, 4);
    const ascii = String.fromCharCode(...bytes);
    expect(ascii).toContain('NETSCAPE2.0');
  });

  it('transparent 时 Graphic Control Extension 带透明标志', () => {
    const bytes = encodeGif([rgbaFrame(4, 4, { a: 0 })], 4, 4, { transparent: true });
    // 定位 GCE：0x21 0xF9 0x04（跳过头部/色表/循环扩展）
    const gceIndex = bytes.findIndex((_b, i) => bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04);
    expect(gceIndex).toBeGreaterThan(-1);
    expect(bytes[gceIndex]).toBe(0x21);
    expect(bytes[gceIndex + 1]).toBe(0xf9);
    expect(bytes[gceIndex + 2]).toBe(0x04); // 块长
    expect(bytes[gceIndex + 3]).toBe(0x01); // packed：透明标志位
  });

  it('多帧全透明背景时调色板仍有效、可编码', () => {
    const frames = [rgbaFrame(6, 6, { a: 0 }), rgbaFrame(6, 6, { a: 0 })];
    const bytes = encodeGif(frames, 6, 6, { transparent: true });
    expect(bytes.length).toBeGreaterThan(20);
  });

  it('不同颜色入调色板，输出长度随之变化', () => {
    const single = encodeGif([rgbaFrame(8, 8, { r: 10, g: 20, b: 30 })], 8, 8);
    const multi = encodeGif([
      rgbaFrame(8, 8, { r: 255, g: 0, b: 0 }),
      rgbaFrame(8, 8, { r: 0, g: 255, b: 0 }),
      rgbaFrame(8, 8, { r: 0, g: 0, b: 255 })
    ], 8, 8);
    expect(multi.length).not.toBe(single.length);
  });

  it('全局色表大小正确编码在 packed bits0-2（GIF 规范）', () => {
    // 3 种不同颜色 → bits=2，色表 4 项
    const frames = [
      rgbaFrame(4, 4, { r: 255 }), // 红
      rgbaFrame(4, 4, { g: 255 }), // 绿
      rgbaFrame(4, 4, { b: 255 })  // 蓝
    ];
    const bytes = encodeGif(frames, 4, 4);
    const packed = bytes[10];
    const tableEntries = 2 << (packed & 0x07);
    expect(tableEntries).toBe(4);
    // 从色表之后开始，应能定位到 image descriptor（0x2C），说明偏移正确
    let pos = 13 + tableEntries * 3;
    let sawImage = false;
    while (pos < bytes.length && bytes[pos] !== 0x3b) {
      if (bytes[pos] === 0x21) {
        let i = pos + 2;
        while (bytes[i] !== 0) i += 1 + bytes[i];
        pos = i + 1;
      } else if (bytes[pos] === 0x2c) {
        sawImage = true;
        break;
      } else break;
    }
    expect(sawImage).toBe(true);
  });

  it('平滑渐变（>256 色）经中位切分量化后仍可编码', () => {
    // 每列一种颜色 → 远超 256 色
    const w = 300, h = 4;
    const frame = new Uint8ClampedArray(w * h * 4);
    for (let x = 0; x < w; x += 1) {
      for (let y = 0; y < h; y += 1) {
        const p = (y * w + x) * 4;
        frame[p] = x % 256;
        frame[p + 1] = (x * 2) % 256;
        frame[p + 2] = (x * 3) % 256;
        frame[p + 3] = 255;
      }
    }
    expect(() => encodeGif([frame, frame], w, h)).not.toThrow();
    const bytes = encodeGif([frame, frame], w, h);
    expect(String.fromCharCode(...bytes.slice(0, 6))).toBe('GIF89a');
  });

  it('非法参数抛出', () => {
    expect(() => encodeGif([], 4, 4)).toThrow();
    expect(() => encodeGif([rgbaFrame(4, 4)], 0, 4)).toThrow();
    expect(() => encodeGif([rgbaFrame(4, 4)], 4, -1)).toThrow();
  });
});
