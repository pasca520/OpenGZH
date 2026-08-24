const encoder = new TextEncoder();
const SAFE_TOKEN = /^[^\u0000-\u001f\u007f]{1,4096}$/u;

function assertString(value, message, { allowEmpty = false } = {}) {
  if (typeof value !== 'string' || (!allowEmpty && !value) || /[\u0000-\u001f\u007f]/u.test(value)) throw new TypeError(message);
  return value;
}

function hex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesFor(value, message) {
  if (typeof value === 'string') return encoder.encode(value);
  if (value instanceof Uint8Array) return value;
  throw new TypeError(message);
}

async function sha256(value) {
  const bytes = bytesFor(value, 'SigV4 body 必须是字符串或 Uint8Array');
  return hex(await crypto.subtle.digest('SHA-256', bytes));
}

async function hmac(key, value) {
  const keyBytes = bytesFor(key, 'SigV4 key 类型无效');
  const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value)));
}

function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/gu, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalQuery(url) {
  const compare = (left, right) => left === right ? 0 : left < right ? -1 : 1;
  return Array.from(url.searchParams.entries())
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)])
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => compare(leftKey, rightKey) || compare(leftValue, rightValue))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

function canonicalPath(url) {
  const path = url.pathname || '/';
  return path.split('/').map((segment) => {
    try {
      return encodeRfc3986(decodeURIComponent(segment));
    } catch (_error) {
      throw new TypeError('SigV4 路径编码无效');
    }
  }).join('/') || '/';
}

function normalizedHeaders(url, headers, amzDate, securityToken) {
  if (!headers || typeof headers !== 'object' || Array.isArray(headers)) throw new TypeError('SigV4 headers 格式无效');
  const entries = Object.entries({
    ...headers,
    host: url.host,
    'x-amz-date': amzDate,
    ...(securityToken ? { 'x-amz-security-token': securityToken } : {}),
  });
  const output = {};
  for (const [key, value] of entries) {
    assertString(key, 'SigV4 header 名称无效');
    const normalizedKey = key.toLowerCase();
    if (!/^[a-z0-9!#$%&'*+.^_`|~-]+$/u.test(normalizedKey)) throw new TypeError('SigV4 header 名称无效');
    assertString(String(value), 'SigV4 header 值无效');
    output[normalizedKey] = String(value).trim().replace(/\s+/gu, ' ');
  }
  return output;
}

export async function signAws4({
  method,
  url: input,
  accessKeyId,
  secretAccessKey,
  securityToken = '',
  region = 'cn-north-1',
  service = 'imagex',
  headers = {},
  body = '',
  now = new Date(),
} = {}) {
  assertString(method, 'SigV4 method 无效');
  assertString(input, 'SigV4 URL 无效');
  assertString(accessKeyId, 'SigV4 AccessKey 无效');
  assertString(secretAccessKey, 'SigV4 SecretKey 无效');
  if (securityToken !== '') assertString(securityToken, 'SigV4 SessionToken 无效');
  assertString(region, 'SigV4 region 无效');
  assertString(service, 'SigV4 service 无效');
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) throw new TypeError('SigV4 时间无效');
  bytesFor(body, 'SigV4 body 必须是字符串或 Uint8Array');

  let url;
  try {
    url = new URL(input);
  } catch (_error) {
    throw new TypeError('SigV4 URL 无效');
  }
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !url.hostname) throw new TypeError('SigV4 URL 无效');
  if (!SAFE_TOKEN.test(accessKeyId) || !SAFE_TOKEN.test(secretAccessKey) || (securityToken && !SAFE_TOKEN.test(securityToken))) throw new TypeError('SigV4 凭证无效');

  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/gu, '');
  const dateStamp = amzDate.slice(0, 8);
  const normalized = normalizedHeaders(url, headers, amzDate, securityToken);
  const headerNames = Object.keys(normalized).sort();
  const canonicalHeaders = `${headerNames.map((key) => `${key}:${normalized[key]}`).join('\n')}\n`;
  const signedHeaders = headerNames.join(';');
  const canonicalRequest = [
    method.toUpperCase(), canonicalPath(url), canonicalQuery(url), canonicalHeaders, signedHeaders, await sha256(body),
  ].join('\n');
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256(canonicalRequest)].join('\n');
  const dateKey = await hmac(encoder.encode(`AWS4${secretAccessKey}`), dateStamp);
  const regionKey = await hmac(dateKey, region);
  const serviceKey = await hmac(regionKey, service);
  const signingKey = await hmac(serviceKey, 'aws4_request');
  const signature = hex(await hmac(signingKey, stringToSign));
  return {
    headers: {
      authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      'x-amz-date': amzDate,
      ...(securityToken ? { 'x-amz-security-token': securityToken } : {}),
    },
  };
}
