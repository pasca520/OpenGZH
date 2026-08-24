import { describe, expect, it } from 'vitest';
import { md5Hex } from '../src/core/md5.js';
import { crc32Hex } from '../src/core/crc32.js';
import { signAws4 } from '../src/core/aws4.js';

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

describe('crc32Hex', () => {
  it.each([
    [new TextEncoder().encode('123456789'), 'cbf43926'],
    [Uint8Array.from([0, 255, 128, 1, 254]), 'ba0c0436'],
    [new Uint8Array(0), '00000000'],
  ])('matches IEEE CRC32 for bytes', (bytes, expected) => {
    expect(crc32Hex(bytes)).toBe(expected);
  });

  it('hashes only a TypedArray view', () => {
    const backing = Uint8Array.from([99, 1, 2, 3, 4, 100]);
    expect(crc32Hex(new Uint8Array(backing.buffer, 1, 4))).toBe('b63cfbcd');
  });

  it.each([null, undefined, '123456789', new ArrayBuffer(2), new DataView(new ArrayBuffer(2))])(
    'rejects unsupported CRC input type %j', (input) => {
      expect(() => crc32Hex(input)).toThrow(TypeError);
    },
  );
});

describe('signAws4', () => {
  it('matches the fixed ImageX SigV4 vector', async () => {
    const result = await signAws4({
      method: 'GET',
      url: 'https://imagex.bytedanceapi.com/?Action=ApplyImageUpload&Version=2018-08-01&ServiceId=73owjymdk6',
      accessKeyId: 'test-access',
      secretAccessKey: 'test-secret',
      securityToken: 'test-session',
      region: 'cn-north-1',
      service: 'imagex',
      now: new Date('2026-08-24T00:00:00.000Z'),
    });
    expect(result.headers.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=test-access/20260824/cn-north-1/imagex/aws4_request, SignedHeaders=host;x-amz-date;x-amz-security-token, Signature=0f9be43c7823fcd822bc49b3f6caa678cd9e88d38e9d0295df0e5d960ea64c69',
    );
    expect(result.headers['x-amz-date']).toBe('20260824T000000Z');
    expect(result.headers['x-amz-security-token']).toBe('test-session');
  });

  it('sorts duplicate query parameters and signs a body hash', async () => {
    const result = await signAws4({
      method: 'POST',
      url: 'https://imagex.bytedanceapi.com/a%20b?z=last&a=two&a=one&space=a+b',
      accessKeyId: 'access',
      secretAccessKey: 'secret',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      now: new Date('2026-08-24T00:00:00.000Z'),
    });
    expect(result.headers.authorization).toContain('SignedHeaders=content-type;host;x-amz-date');
    expect(result.headers.authorization).toMatch(/Signature=[0-9a-f]{64}$/);
  });

  it.each([
    {},
    { method: 'GET', url: 'http://imagex.bytedanceapi.com/' },
    { method: 'GET', url: 'https://user:pass@imagex.bytedanceapi.com/' },
    { method: 'GET', url: 'https://imagex.bytedanceapi.com/', accessKeyId: '', secretAccessKey: 'secret' },
    { method: 'GET', url: 'https://imagex.bytedanceapi.com/', accessKeyId: 'access', secretAccessKey: '' },
  ])('fails closed for invalid SigV4 input %j', async (input) => {
    await expect(signAws4(input)).rejects.toThrow(TypeError);
  });

  it('does not include credential values in validation errors', async () => {
    const error = await signAws4({
      method: 'GET', url: 'http://imagex.bytedanceapi.com/', accessKeyId: 'secret-access-id', secretAccessKey: 'secret-key',
    }).catch((value) => value);
    expect(JSON.stringify(error)).not.toMatch(/secret-access-id|secret-key/);
  });
});
