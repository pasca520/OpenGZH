import { describe, expect, it } from 'vitest';
import {
  ERROR_CODES,
  PlatformError,
  redactSecrets,
  remoteStateError,
  serializeError,
  summarizeRemote,
} from '../src/core/platform-errors.js';
import { dataUrlToBlob } from '../src/core/data-url.js';

describe('platform errors', () => {
  it('locks the exact error code set and maps unknown codes to PLATFORM_CHANGED', () => {
    expect(ERROR_CODES).toEqual([
      'AUTH_REQUIRED', 'PERMISSION_DENIED', 'ARTICLE_INVALID', 'IMAGE_NOT_LOCAL',
      'IMAGE_READ_FAILED', 'IMAGE_UPLOAD_FAILED', 'DRAFT_CREATE_FAILED',
      'DRAFT_UPDATE_FAILED', 'PLATFORM_CHANGED', 'RATE_LIMITED', 'NETWORK_ERROR',
      'UNKNOWN_REMOTE_STATE',
    ]);
    expect(new PlatformError('not-real', '变化').code).toBe('PLATFORM_CHANGED');
  });

  it('redacts credential fields, URL query parameters, and nested values recursively', () => {
    const value = redactSecrets({
      token: 'token-value',
      nested: { SessionToken: 'session-value', ticket: 'ticket-value' },
      url: 'https://example.test/?csrf=csrf-value&safe=1',
      raw: '{"token":"raw-token","SessionToken":"raw-session"} Authorization: Bearer raw-bearer',
    });
    const serialized = JSON.stringify(value);
    expect(serialized).not.toMatch(/token-value|session-value|ticket-value|csrf-value|raw-token|raw-session|raw-bearer/);
    expect(value.url).toContain('safe=1');
    expect(value.raw).toContain('Authorization: Bearer [REDACTED]');
  });

  it('serializes only safe task fields with sanitized summaries', () => {
    const error = new PlatformError('PLATFORM_CHANGED', '响应字段变化', {
      httpStatus: 200,
      remoteSummary: '<script>secret</script>',
      draftId: 'draft-1',
    });
    expect(serializeError(error)).toEqual({
      code: 'PLATFORM_CHANGED',
      message: '响应字段变化',
      httpStatus: 200,
      remoteSummary: 'secret',
      draftId: 'draft-1',
      retryable: false,
    });
    expect(serializeError({ code: 'unknown', message: 'bad', secret: 'must not cross' })).toEqual({
      code: 'PLATFORM_CHANGED',
      message: 'bad',
      retryable: false,
    });
  });

  it('redacts credentials embedded in raw response text and compresses to 160 chars', () => {
    expect(summarizeRemote('{"token":"live-token","SessionToken":"live-session"} Authorization: Bearer live-bearer'))
      .toBe('{"token":"[REDACTED]","SessionToken":"[REDACTED]"} Authorization: Bearer [REDACTED]');
    expect(summarizeRemote('<div>one\n\t two</div>')).toBe('one two');
    expect(summarizeRemote('x'.repeat(200))).toHaveLength(160);
  });

  it('redacts whole authorization and cookie values, including HTML-separated headers and draft IDs', () => {
    const raw = '{"authorization":"Bearer live-secret value","cookie":"session=live-cookie value"}';
    expect(redactSecrets(raw)).toBe('{"authorization":"[REDACTED]","cookie":"[REDACTED]"}');
    expect(summarizeRemote('<span>Authorization:</span><b>Bearer</b>live-html-secret')).not.toContain('live-html-secret');
    expect(serializeError(new PlatformError('NETWORK_ERROR', 'safe', {
      draftId: '<b>Bearer live-draft-secret</b>',
      remoteSummary: '<p>Cookie: live-cookie-secret</p>',
    }))).toEqual({
      code: 'NETWORK_ERROR',
      message: 'safe',
      remoteSummary: 'Cookie: [REDACTED]',
      draftId: 'Bearer [REDACTED]',
      retryable: false,
    });
  });

  it('redacts unquoted raw key-value credentials with spaces', () => {
    const raw = 'token=raw-token token: raw token with spaces csrf=raw-csrf';
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain('raw-token');
    expect(redacted).not.toContain('raw token with spaces');
    expect(redacted).not.toContain('raw-csrf');
  });

  it('redacts unquoted authorization and cookie values without consuming safe following fields', () => {
    const raw = 'authorization=live-tokenonly cookie=session=live-cookie safe=keep';
    const redacted = redactSecrets(raw);
    expect(redacted).not.toContain('live-tokenonly');
    expect(redacted).not.toContain('live-cookie');
    expect(redacted).toContain('safe=keep');
    expect(redactSecrets('{"cookie": session=live-json-cookie}')).not.toContain('live-json-cookie');
  });

  it('keeps PlatformError remote state and maps ordinary errors to unknown state', () => {
    const existing = new PlatformError('DRAFT_UPDATE_FAILED', '已知失败');
    expect(remoteStateError(existing)).toBe(existing);
    expect(remoteStateError(new Error('断开'))).toMatchObject({ code: 'UNKNOWN_REMOTE_STATE', retryable: false });
  });
});

describe('dataUrlToBlob', () => {
  it('parses an approved base64 image into a correctly typed Blob', async () => {
    const blob = dataUrlToBlob('data:image/png;base64,cG5n');
    expect(blob.type).toBe('image/png');
    expect(await blob.text()).toBe('png');
  });

  it('rejects non-images separately from non-Base64 image URLs', () => {
    expect(() => dataUrlToBlob('data:text/plain;base64,dGV4dA==')).toThrowError(/图片/);
    expect(() => dataUrlToBlob('data:image/png,png')).toThrowError(/Base64/);
    expect(() => dataUrlToBlob('data:image/png;base64,%%%%')).toThrowError(/Base64/);
    expect(() => dataUrlToBlob('data:image/bmp;base64,Qk1Q')).toThrowError(/图片/);
  });
});
