export const ERROR_CODES = Object.freeze([
  'AUTH_REQUIRED', 'PERMISSION_DENIED', 'ARTICLE_INVALID', 'IMAGE_NOT_LOCAL',
  'IMAGE_READ_FAILED', 'IMAGE_UPLOAD_FAILED', 'DRAFT_CREATE_FAILED',
  'DRAFT_UPDATE_FAILED', 'PLATFORM_CHANGED', 'RATE_LIMITED', 'NETWORK_ERROR',
  'UNKNOWN_REMOTE_STATE',
]);

const SECRET_KEY = /^(?:token|ticket|csrf|jltoken|accesskeyid|secretaccesskey|sessiontoken|access_id|access_key|access_token|authorization|cookie|password|secret|x-csrf-token)$/i;
const SECRET_QUERY = /([?&](?:token|ticket|csrf|jltoken|sessiontoken|access[_-]?key(?:id)?|secret[_-]?access[_-]?key|access[_-]?token|authorization|x-csrf-token)=)[^&#\s]*/gi;
const SECRET_JSON = /((?:["']?)(?:token|ticket|csrf|jltoken|accesskeyid|secretaccesskey|sessiontoken|access_id|access_key|access_token|authorization|cookie|x-csrf-token)(?:["']?\s*[:=]\s*["']))([\s\S]*?)(?=["'])/gi;
const SECRET_UNQUOTED = /((?:^|[\s{,])(?:token|ticket|csrf|jltoken|accesskeyid|secretaccesskey|sessiontoken|access_id|access_key|access_token|x-csrf-token)\s*[:=]\s*)([^,}\r\n]+?)(?=\s+(?:token|ticket|csrf|jltoken|accesskeyid|secretaccesskey|sessiontoken|access_id|access_key|access_token|authorization|cookie|x-csrf-token)\s*[:=]|[,}\r\n]|$)/gi;
const SECRET_AUTH_COOKIE_ASSIGN = /((?:^|[\s{,])["']?(?:authorization|cookie)["']?\s*=\s*)([^,}\r\n]+?)(?=\s+[A-Za-z][\w-]*\s*[:=]|[,}\r\n]|$)/gi;
const SECRET_AUTH_COOKIE_COLON = /((?:^|[\s{,])["']?(?:authorization|cookie)["']?\s*:\s*)(?!Bearer\b|Basic\b)([^,}\r\n]+?)(?=\s+[A-Za-z][\w-]*\s*[:=]|[,}\r\n]|$)/gi;
const AUTH_HEADER = /(Authorization\s*:\s*(?:Bearer|Basic)\s+)([^\r\n,}]+)/gi;
const COOKIE_HEADER = /(Cookie\s*:\s*)([^\r\n,}]+)/gi;
const BARE_CREDENTIAL = /\b(Bearer|Basic)\s+([^\s,}]+)/gi;

export class PlatformError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'PlatformError';
    this.code = ERROR_CODES.includes(code) ? code : 'PLATFORM_CHANGED';
    Object.assign(this, details);
    this.retryable = Boolean(details.retryable);
  }
}

function stripHtml(value) {
  return String(value).replace(/<[^>]*>/g, ' ');
}

function redactAuthCookieColon(match, prefix, value) {
  const trimmed = value.trim();
  if (/^(?:Bearer|Basic)\b/i.test(trimmed) || (/^["'][\s\S]*["']$/.test(trimmed))) return match;
  return `${prefix}[REDACTED]`;
}

function redactString(value) {
  return stripHtml(value)
    .replace(SECRET_QUERY, '$1[REDACTED]')
    .replace(SECRET_JSON, '$1[REDACTED]')
    .replace(SECRET_AUTH_COOKIE_ASSIGN, '$1[REDACTED]')
    .replace(SECRET_AUTH_COOKIE_COLON, redactAuthCookieColon)
    .replace(SECRET_UNQUOTED, '$1[REDACTED]')
    .replace(AUTH_HEADER, '$1[REDACTED]')
    .replace(COOKIE_HEADER, '$1[REDACTED]')
    .replace(BARE_CREDENTIAL, '$1 [REDACTED]');
}

export function redactSecrets(value) {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEY.test(String(key).trim()) ? '[REDACTED]' : redactSecrets(entry),
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
    ...(error?.remoteSummary != null ? { remoteSummary: summarizeRemote(error.remoteSummary) } : {}),
    ...(error?.draftId != null ? { draftId: summarizeRemote(error.draftId) } : {}),
    retryable: Boolean(error?.retryable),
  };
}

export function remoteStateError(error, message = '无法确认远端是否已创建草稿') {
  if (error instanceof PlatformError) return error;
  return new PlatformError('UNKNOWN_REMOTE_STATE', message, { retryable: false });
}
