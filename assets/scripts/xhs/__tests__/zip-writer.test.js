import { expect, it } from 'vitest';
import { crc32, createStoredZip } from '../zip-writer.js';

it('creates a standards-shaped zip with utf-8 filenames', async () => {
  const blob = createStoredZip([
    { name: '01-封面.png', data: new Uint8Array([1, 2, 3]) },
    { name: '02.png', data: new Uint8Array([4, 5]) }
  ]);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
  expect(new TextDecoder().decode(bytes)).toContain('01-封面.png');
  expect(Array.from(bytes.slice(-22, -18))).toEqual([0x50, 0x4b, 0x05, 0x06]);
});

it('rejects empty, duplicate and oversized entries', () => {
  expect(() => createStoredZip([{ name: '', data: new Uint8Array(1) }]))
    .toThrow(/文件名不能为空/);
  expect(() => createStoredZip([
    { name: 'a.png', data: new Uint8Array(1) },
    { name: 'a.png', data: new Uint8Array(1) }
  ])).toThrow(/重复/);
  expect(() => createStoredZip([{ name: 'big.bin', data: new Uint8Array(0xFFFFFFFF + 1) }]))
    .toThrow(/ZIP64/);
});

it('computes the crc32 of arbitrary bytes', () => {
  expect(crc32(new Uint8Array([1, 2, 3]))).toBe(1438416925);
  expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xCBF43926);
});
