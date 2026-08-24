/**
 * Sanitizes markdown-it HTML before it reaches v-html or clipboard output.
 * @module core/html-sanitizer
 */

const ALLOWED_TAGS = new Set([
  'a', 'article', 'b', 'blockquote', 'br', 'code', 'del', 'details', 'div', 'em',
  'figcaption', 'figure', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i',
  'img', 'input', 'li', 'math', 'mi', 'mn', 'mo', 'mrow', 'ms', 'msup', 'mtext',
  'ol', 'p', 'path', 'polyline', 'pre', 'q', 'section', 'semantics', 'span',
  'strong', 'sub', 'summary', 'sup', 'svg', 'table', 'tbody', 'td', 'tfoot',
  'th', 'thead', 'tr', 'u', 'ul', 'use', 'g', 'style'
]);

const DROP_CONTENT_TAGS = new Set(['script', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form']);
const URL_ATTRIBUTES = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster']);
const DATA_ATTRIBUTES = new Set([
  'data-image-id', 'data-code-block', 'data-language', 'data-formula-source',
  'data-field', 'data-field-line', 'data-line-height', 'data-media-ref', 'data-page-id'
]);
const SAFE_ATTRIBUTES = new Set([
  'alt', 'aria-hidden', 'aria-label', 'aria-live', 'aria-selected', 'aria-describedby',
  'checked', 'class', 'colspan', 'disabled', 'fill', 'focusable', 'height', 'id',
  'lang', 'max', 'min', 'name', 'readonly', 'rel', 'role', 'rowspan', 'stroke',
  'href', 'src', 'xlink:href', 'stroke-linecap', 'stroke-linejoin', 'stroke-width', 'style', 'tabindex', 'target',
  'title', 'type', 'value', 'viewbox', 'width', 'x', 'x1', 'x2', 'xmlns', 'xmlns:xlink',
  'y', 'y1', 'y2', 'd', 'fill-rule', 'clip-rule', 'opacity', 'points', 'rx', 'ry',
  'transform', 'preserveaspectratio', 'version'
]);

function isSafeUrl(value, attribute) {
  const normalized = String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, '');
  if (!normalized) return true;
  if (normalized.startsWith('#') || normalized.startsWith('/') || normalized.startsWith('./') || normalized.startsWith('../')) return true;
  if (attribute === 'src' && normalized.startsWith('img://')) return true;
  if (/^(https?:|blob:)/i.test(normalized)) return true;
  if (attribute === 'src' && /^data:image\/(?:png|gif|jpe?g|webp|avif|svg\+xml);/i.test(normalized)) return true;
  if (attribute === 'href' && /^mailto:/i.test(normalized)) return true;
  return false;
}

function sanitizeStyleText(value) {
  const declarations = String(value || '').split(';');
  return declarations
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => !/(?:url\s*\(|expression\s*\(|javascript\s*:|behavior\s*:|binding\s*:|@import|<|>)/i.test(declaration))
    .join('; ');
}

function sanitizeAttributeValue(name, value) {
  if (name === 'style') return sanitizeStyleText(value);
  if (URL_ATTRIBUTES.has(name) && !isSafeUrl(value, name)) return null;
  if (name === 'target' && value !== '_blank') return null;
  if (name === 'type' && value.toLowerCase() !== 'checkbox') return null;
  if (/^(?:id|class|data-|aria-|role|title|alt|name|value|lang|fill|stroke|viewbox|transform|points|d|xmlns)/i.test(name)
    && /[\u0000<>]/.test(value)) return null;
  return value;
}

function sanitizeAttributes(element) {
  const tagName = element.tagName.toLowerCase();
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    const allowed = SAFE_ATTRIBUTES.has(name) || DATA_ATTRIBUTES.has(name);
    if (!allowed || name.startsWith('on')) {
      element.removeAttribute(attribute.name);
      continue;
    }
    const value = sanitizeAttributeValue(name, attribute.value);
    if (value == null || (name === 'style' && !value)) element.removeAttribute(attribute.name);
    else if (value !== attribute.value) element.setAttribute(attribute.name, value);
  }

  if (tagName === 'a') {
    if (element.getAttribute('target') === '_blank') element.setAttribute('rel', 'noopener noreferrer');
    else if (element.hasAttribute('rel')) element.removeAttribute('rel');
  }
  if (tagName === 'input') {
    if (element.getAttribute('type')?.toLowerCase() !== 'checkbox') element.remove();
    else {
      element.setAttribute('type', 'checkbox');
      element.setAttribute('readonly', '');
      element.setAttribute('disabled', '');
    }
  }
}

function sanitizeDom(html) {
  const parser = new DOMParser();
  const document = parser.parseFromString(String(html || ''), 'text/html');
  const root = document.body;
  for (const element of Array.from(root.querySelectorAll('*'))) {
    const tagName = element.tagName.toLowerCase();
    if (DROP_CONTENT_TAGS.has(tagName)) {
      element.remove();
      continue;
    }
    if (!ALLOWED_TAGS.has(tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      continue;
    }
    sanitizeAttributes(element);
    if (tagName === 'style') element.textContent = sanitizeStyleText(element.textContent);
  }
  return root.innerHTML;
}

function parseFallbackAttributes(source) {
  const attributes = [];
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(source))) {
    attributes.push({ name: match[1], value: match[2] ?? match[3] ?? match[4] ?? '' });
  }
  return attributes;
}

function sanitizeFallbackAttributes(source, tagName) {
  const output = [];
  for (const attribute of parseFallbackAttributes(source)) {
    const name = attribute.name.toLowerCase();
    if (!(SAFE_ATTRIBUTES.has(name) || DATA_ATTRIBUTES.has(name)) || name.startsWith('on')) continue;
    const value = sanitizeAttributeValue(name, attribute.value);
    if (value == null || (name === 'style' && !value)) continue;
    const escaped = value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    output.push(`${name}="${escaped}"`);
  }
  if (tagName === 'a' && output.some((value) => value.startsWith('target="_blank"'))) {
    output.push('rel="noopener noreferrer"');
  }
  if (tagName === 'input') {
    if (!output.some((value) => value.toLowerCase() === 'type="checkbox"')) return '';
    output.push('readonly=""', 'disabled=""');
  }
  return output.length ? ` ${output.join(' ')}` : '';
}

function sanitizeFallback(html) {
  const source = String(html || '');
  const output = [];
  const dropStack = [];
  let cursor = 0;
  const findTagEnd = (start) => {
    let quote = null;
    for (let index = start + 1; index < source.length; index += 1) {
      const char = source[index];
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '>') {
        return index;
      }
    }
    return -1;
  };

  while (cursor < source.length) {
    const start = source.indexOf('<', cursor);
    if (start === -1) {
      if (!dropStack.length) output.push(source.slice(cursor));
      break;
    }
    if (!dropStack.length) output.push(source.slice(cursor, start));
    const end = source.startsWith('<!--', start) ? source.indexOf('-->', start + 4) + 2 : findTagEnd(start);
    if (end < 1) break;
    const raw = source.slice(start, end + 1);
    const tagMatch = raw.match(/^<\/?\s*([a-z][\w:-]*)\b([\s\S]*?)(?:\/?>)$/i);
    const tagName = (tagMatch?.[1] || '').toLowerCase();
    const closing = /^<\//.test(raw);
    if (raw.startsWith('<!--')) {
      cursor = end + 1;
      continue;
    }
    if (DROP_CONTENT_TAGS.has(tagName)) {
      if (!closing && !raw.endsWith('/>')) dropStack.push(tagName);
      else if (closing) dropStack.pop();
      cursor = end + 1;
      continue;
    }
    if (dropStack.length) {
      if (closing && tagName === dropStack.at(-1)) dropStack.pop();
      cursor = end + 1;
      continue;
    }
    if (closing) {
      if (ALLOWED_TAGS.has(tagName) && tagName !== 'img' && tagName !== 'input' && tagName !== 'br' && tagName !== 'hr') output.push(`</${tagName}>`);
    } else if (ALLOWED_TAGS.has(tagName)) {
      const attrs = sanitizeFallbackAttributes(tagMatch?.[2] || '', tagName);
      if (tagName !== 'input' || attrs) output.push(`<${tagName}${attrs}${raw.endsWith('/>') ? ' /' : ''}>`);
    }
    cursor = end + 1;
  }
  return output.join('');
}

export function sanitizeHtml(html) {
  if (typeof DOMParser === 'function') return sanitizeDom(html);
  return sanitizeFallback(html);
}
