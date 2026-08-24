import { describe, expect, it } from 'vitest';
import { md5Hex } from '../src/core/md5.js';

describe('md5Hex', () => {
  it.each([
    ['', 'd41d8cd98f00b204e9800998ecf8427e'],
    ['abc', '900150983cd24fb0d6963f7d28e17f72'],
    ['OpenGZH', 'bbe83eda5192a3f6af350a4bfc23cf9c'],
  ])('matches the standard vector for %j', (value, expected) => {
    expect(md5Hex(new TextEncoder().encode(value))).toBe(expected);
  });

  it('handles multi-block, binary, and a TypedArray view without hashing outside bytes', () => {
    const bytes = new Uint8Array(129);
    bytes.forEach((_byte, index) => { bytes[index] = (index * 31) & 0xff; });
    expect(md5Hex(bytes)).toBe('e77386b196f7f30d56263ee7527f50c8');

    const binary = Uint8Array.from([0, 255, 128, 1, 254]);
    expect(md5Hex(binary)).toBe('c99df7466bdfbe68dde20859c67f50fb');

    const backing = Uint8Array.from([90, 88, 1, 2, 3, 4, 89]);
    const view = new Uint8Array(backing.buffer, 2, 4);
    expect(md5Hex(view)).toBe('08d6c05a21512a79a1dfeb9d2a8f262f');
  });

  it.each([null, undefined, 'abc', 123, new ArrayBuffer(2), new DataView(new ArrayBuffer(2))])(
    'rejects unsupported input type %j', (input) => {
      expect(() => md5Hex(input)).toThrow(TypeError);
    },
  );
});
