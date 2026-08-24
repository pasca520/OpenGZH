export const ERROR_CODES = Object.freeze([
  'AUTH_REQUIRED', 'PERMISSION_DENIED', 'ARTICLE_INVALID', 'IMAGE_NOT_LOCAL',
  'IMAGE_READ_FAILED', 'IMAGE_UPLOAD_FAILED', 'DRAFT_CREATE_FAILED',
  'DRAFT_UPDATE_FAILED', 'PLATFORM_CHANGED', 'RATE_LIMITED', 'NETWORK_ERROR',
  'UNKNOWN_REMOTE_STATE',
]);

const SECRET_KEY = /^(?:token|ticket|csrf|jltoken|accesskeyid|secretaccesskey|sessiontoken|access_id|access_key|access_token|authorization|cookie|password|secret|x-csrf-token)$/i;
const SECRET_QUERY = /([?&](?:token|ticket|csrf|jltoken|sessiontoken|access[_-]?key(?:id)?|secret[_-]?access[_-]?key|access[_-]?token|authorization|x-csrf-token)=)[^&#\s]*/gi;
const SECRET_JSON = /((?:["']?)(?:token|ticket|csrf|jltoken|accesskeyid|secretaccesskey|sessiontoken|access_id|access_key|access_token|x-csrf-token)(?:["']?\s*[:=]\s*["']?))([^"'\s,}&]+)/gi;
const SECRET_AUTH_JSON = /((?:["']?authorization["']?\s*[:=]\s*["']))([^"'\s,}&]+)/gi;
const BEARER = /(Authorization\s*:\s*Bearer\s+)([^\s,}"']+)/gi;

export class PlatformError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'PlatformError';
    this.code = ERROR_CODES.includes(code) ? code : 'PLATFORM_CHANGED';
    Object.assign(this, details);
    this.retryable = Boolean(details.retryable);
  }
}

function redactString(value) {
  return value
    .replace(SECRET_QUERY, '$1[REDACTED]')
    .replace(BEARER, '$1[REDACTED]')
    .replace(SECRET_JSON, '$1[REDACTED]')
    .replace(SECRET_AUTH_JSON, '$1[REDACTED]');
}

export function redactSecrets(value) {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEY.test(key) ? '[REDACTED]' : redactSecrets(entry),
    ]));
  }
  if (typeof value === 'string') return redactString(value);
  return value;
}

export function summarizeRemote(value, maxLength = 160) {
  return redactString(String(value ?? ''))
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function serializeError(error) {
  return {
    code: ERROR_CODES.includes(error?.code) ? error.code : 'PLATFORM_CHANGED',
    message: summarizeRemote(error?.message || '平台响应异常'),
    ...(Number.isInteger(error?.httpStatus) ? { httpStatus: error.httpStatus } : {}),
    ...(error?.remoteSummary ? { remoteSummary: summarizeRemote(error.remoteSummary) } : {}),
    ...(error?.draftId ? { draftId: String(error.draftId) } : {}),
    retryable: Boolean(error?.retryable),
  };
}

export function remoteStateError(error, message = '无法确认远端是否已创建草稿') {
  if (error instanceof PlatformError) return error;
  return new PlatformError('UNKNOWN_REMOTE_STATE', message, { retryable: false });
}
