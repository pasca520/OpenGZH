/**
 * Immutable article package shared by distribution targets.
 * @module distribution/article-package
 */

export const DISTRIBUTION_SCHEMA_VERSION = 1;
export const IMAGE_READ_FAILED = 'IMAGE_READ_FAILED';
export const ARTICLE_INVALID = 'ARTICLE_INVALID';

const DATA_IMAGE_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i;
const MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg'
};
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function contractError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function isDirectiveOpen(line) {
  return /^\s*:::[a-z][\w-]*(?:\s|$)/i.test(line);
}

function parseFenceStart(line) {
  const match = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
  if (!match || (match[1][0] === '`' && match[2].includes('`'))) return null;
  return { char: match[1][0], length: match[1].length };
}

function isFenceEnd(line, fence) {
  const escapedChar = fence.char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^ {0,3}${escapedChar}{${fence.length},}\\s*$`).test(line);
}

function isIndentedCode(line) {
  return /^(?: {4}|\t)/.test(line);
}

function maskLine(line) {
  return line.replace(/[^\n]/g, ' ');
}

function maskInlineCode(line) {
  const masked = line.split('');
  let index = 0;
  while (index < line.length) {
    if (line[index] !== '`') {
      index += 1;
      continue;
    }
    const start = index;
    while (index < line.length && line[index] === '`') index += 1;
    const marker = line.slice(start, index);
    let close = line.indexOf(marker, index);
    while (close >= 0 && (line[close - 1] === '`' || line[close + marker.length] === '`')) {
      close = line.indexOf(marker, close + 1);
    }
    if (close < 0) continue;
    masked.fill(' ', start, close + marker.length);
    index = close + marker.length;
  }
  return masked.join('');
}

function maskMarkdownCode(markdown) {
  let fence = null;
  return String(markdown).split('\n').map((line) => {
    if (fence) {
      const masked = maskLine(line);
      if (isFenceEnd(line, fence)) fence = null;
      return masked;
    }
    const opening = parseFenceStart(line);
    if (opening) {
      fence = opening;
      return maskLine(line);
    }
    if (isIndentedCode(line)) return maskLine(line);
    return maskInlineCode(line);
  }).join('\n');
}

/**
 * Remove only OpenGZH's outer card/page syntax while retaining article content.
 * Generic fenced directives are kept verbatim, including ones nested in a card.
 */
export function toPortableMarkdown(markdown = '') {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const output = [];
  let cardDepth = 0;
  let fence = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (fence) {
      output.push(line);
      if (isFenceEnd(line, fence)) fence = null;
      continue;
    }
    const opening = parseFenceStart(line);
    if (opening) {
      output.push(line);
      fence = opening;
      continue;
    }
    if (isIndentedCode(line)) {
      output.push(line);
      continue;
    }

    if (cardDepth === 0) {
      if (/^:::ogzh-card(?:\s+.*)?$/.test(trimmed)) {
        cardDepth = 1;
        continue;
      }
      if (/^<!--\s*xhs-page\s*-->$/i.test(trimmed)) continue;
      output.push(line);
      continue;
    }

    if (/^:::\s*$/.test(trimmed)) {
      cardDepth -= 1;
      if (cardDepth > 0) output.push(line);
      continue;
    }
    if (/^<!--\s*xhs-page\s*-->$/i.test(trimmed)) continue;
    if (isDirectiveOpen(line)) cardDepth += 1;
    output.push(line);
  }

  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function parseTagAttributes(source) {
  const attributes = [];
  const attributeSource = source.replace(/^\s*[a-z][\w:-]*/i, '');
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = pattern.exec(attributeSource))) {
    attributes.push({
      name: match[1],
      value: match[2] ?? match[3] ?? match[4] ?? null
    });
  }
  return attributes;
}

function serializeAttributes(attributes) {
  return attributes.map(({ name, value }) => value == null ? name : `${name}="${value.replace(/"/g, '&quot;')}"`).join(' ');
}

function findTagEnd(source, start) {
  let quote = null;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

function nextHtmlTag(source, cursor) {
  const index = source.indexOf('<', cursor);
  if (index < 0) return null;
  if (source.startsWith('<!--', index)) {
    const commentEnd = source.indexOf('-->', index + 4);
    const end = commentEnd < 0 ? source.length : commentEnd + 3;
    return { index, raw: source.slice(index, end), end };
  }
  const tagEnd = findTagEnd(source, index);
  const end = tagEnd < 0 ? source.length : tagEnd + 1;
  return { index, raw: source.slice(index, end), end };
}

function normalizeTag(rawTag, tagName) {
  const attributes = parseTagAttributes(rawTag.slice(1, -1).replace(/\/\s*$/, ''));
  const lowerTagName = tagName.toLowerCase();
  const wrapper = (lowerTagName === 'div' || lowerTagName === 'section')
    && attributes.some(({ name }) => /^data-(?:ogzh-card|xhs-page)$/i.test(name));
  let imageId = null;
  const kept = [];

  for (const attribute of attributes) {
    const lowerName = attribute.name.toLowerCase();
    if (lowerName === 'data-image-id') imageId = attribute.value || '';
    if (lowerName === 'class' || lowerName === 'style' || lowerName === 'id' || lowerName.startsWith('data-')) continue;
    kept.push(attribute);
  }

  if (lowerTagName === 'img' && imageId) {
    const src = { name: 'src', value: `img://${imageId}` };
    const srcIndex = kept.findIndex(({ name }) => name.toLowerCase() === 'src');
    if (srcIndex === -1) kept.unshift(src);
    else kept[srcIndex] = src;
  }

  if (wrapper) return { wrapper: true, tagName: lowerTagName };
  const attributesText = serializeAttributes(kept);
  const selfClosing = /\/\s*>$/.test(rawTag);
  return {
    wrapper: false,
    tagName: lowerTagName,
    html: `<${lowerTagName}${attributesText ? ` ${attributesText}` : ''}${selfClosing ? ' /' : ''}>`
  };
}

/**
 * Keep semantic HTML and remove editor-only presentation metadata.
 * This intentionally has a small tokenizer fallback because the contract is
 * also consumed by Node-side packaging where DOMParser is unavailable.
 */
export function toSemanticHtml(html = '') {
  const source = String(html || '');
  const output = [];
  const stack = [];
  let cursor = 0;
  let tag;

  while ((tag = nextHtmlTag(source, cursor))) {
    output.push(source.slice(cursor, tag.index));
    const raw = tag.raw;
    cursor = tag.end;

    if (raw.startsWith('<!--')) {
      if (!/^<!--[\s\S]*?-->$/.test(raw) || !/^<!--\s*xhs-page\s*-->$/i.test(raw)) output.push(raw);
      continue;
    }
    const openMatch = raw.match(/^<\s*([a-z][\w:-]*)\b([\s\S]*?)>$/i);
    const closeMatch = raw.match(/^<\s*\/\s*([a-z][\w:-]*)\s*>$/i);
    if (closeMatch) {
      const tagName = closeMatch[1].toLowerCase();
      let entry = stack.pop();
      while (entry && entry.tagName !== tagName) entry = stack.pop();
      if (entry && !entry.wrapper) output.push(`</${tagName}>`);
      continue;
    }
    if (!openMatch) {
      output.push(raw);
      continue;
    }

    const tagName = openMatch[1].toLowerCase();
    const normalized = normalizeTag(raw, tagName);
    if (!VOID_TAGS.has(tagName)) stack.push({ tagName, wrapper: normalized.wrapper });
    if (!normalized.wrapper) output.push(normalized.html);
  }

  output.push(source.slice(cursor));
  return output.join('').trim();
}

function imageSourcesFromMarkdown(markdown) {
  const matches = [];
  const pattern = /!\[([^\]]*)\]\(\s*(?:<([^>]+)>|([^\s)]+))/g;
  let match;
  while ((match = pattern.exec(markdown))) {
    matches.push({ index: match.index, source: match[2] || match[3], alt: match[1] || '' });
  }
  return matches;
}

function imageSourcesFromHtml(html) {
  const matches = [];
  let cursor = 0;
  let tag;
  while ((tag = nextHtmlTag(html, cursor))) {
    cursor = tag.end;
    if (tag.raw.startsWith('<!--') || !/^<\s*img\b/i.test(tag.raw)) continue;
    const sourceTag = tag.raw;
    const sourceMatch = sourceTag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!sourceMatch) continue;
    const altMatch = sourceTag.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    matches.push({
      index: tag.index,
      source: sourceMatch[1] ?? sourceMatch[2] ?? sourceMatch[3],
      alt: altMatch ? (altMatch[1] ?? altMatch[2] ?? altMatch[3]) : ''
    });
  }
  return matches;
}

function portableImageSources(markdown) {
  const maskedMarkdown = maskMarkdownCode(markdown);
  return [
    ...imageSourcesFromMarkdown(maskedMarkdown),
    ...imageSourcesFromHtml(maskedMarkdown)
  ].sort((left, right) => left.index - right.index);
}

function isImageSource(source) {
  return source.startsWith('img://') || source.startsWith('data:');
}

function extensionFromMime(mime) {
  if (MIME_EXTENSIONS[mime.toLowerCase()]) return MIME_EXTENSIONS[mime.toLowerCase()];
  return mime.slice(mime.indexOf('/') + 1).replace(/\+xml$/i, '').replace(/[^a-z0-9]+/gi, '') || 'bin';
}

function dataImageAsset(ref, index, alt) {
  const match = ref.match(DATA_IMAGE_PATTERN);
  if (!match || !/^image\//i.test(match[1])) {
    throw contractError(ARTICLE_INVALID, `Invalid image data URL: ${ref.slice(0, 40)}`);
  }
  const mimeType = match[1].toLowerCase();
  const extension = extensionFromMime(mimeType);
  try {
    atob(match[2]);
  } catch {
    throw contractError(ARTICLE_INVALID, `Invalid image data URL: ${ref.slice(0, 40)}`);
  }
  const filename = `generated-${index}.${extension}`;
  return { ref, kind: 'data-url', dataUrl: ref, mimeType, filename, alt };
}

async function imageAsset(ref, index, imageStore, alt) {
  if (ref.startsWith('data:')) return dataImageAsset(ref, index, alt);
  const imageId = ref.slice('img://'.length);
  let record;
  try {
    record = await imageStore?.getImageRecord?.(imageId);
  } catch {
    throw contractError(IMAGE_READ_FAILED, `Image record could not be read: ${imageId}`);
  }
  if (!record?.blob) throw contractError(IMAGE_READ_FAILED, `Image record is missing: ${imageId}`);
  const mimeType = record.blob.type || 'application/octet-stream';
  const filename = record.name || `generated-${index}.${extensionFromMime(mimeType)}`;
  return { ref, kind: 'indexed-db', imageId, mimeType, filename, alt };
}

function freezeImages(images) {
  return Object.freeze(images.map((image) => Object.freeze(image)));
}

/**
 * Build one immutable snapshot. `prepareWechatContent` is injected so this
 * contract stays independent from the browser clipboard implementation.
 */
export async function buildDistributionPackage({
  documentId,
  title,
  markdown = '',
  renderedHtml = '',
  styleConfig,
  imageStore,
  codeTheme,
  displaySettings,
  prepareWechatContent,
  now = Date.now
}) {
  const createdAt = now();
  const normalizedDocumentId = String(documentId || '');
  const normalizedTitle = String(title || '').trim();
  const normalizedMarkdown = String(markdown || '');
  const normalizedRenderedHtml = String(renderedHtml || '');
  const portableMarkdown = toPortableMarkdown(normalizedMarkdown);
  const semanticHtml = toSemanticHtml(normalizedRenderedHtml);
  if (typeof prepareWechatContent !== 'function') {
    throw contractError(ARTICLE_INVALID, 'prepareWechatContent must be a function');
  }
  const prepared = await prepareWechatContent({
    renderedHTML: normalizedRenderedHtml,
    styleConfig,
    imageStore,
    codeTheme,
    displaySettings,
    imagePolicy: 'defer-local',
    showToast: () => {}
  });
  if (!prepared || typeof prepared !== 'object' || Array.isArray(prepared)
    || typeof prepared.html !== 'string' || !Array.isArray(prepared.imageFailures)) {
    throw contractError(ARTICLE_INVALID, 'Invalid WeChat preparation result');
  }
  if (prepared?.imageFailures?.length) {
    throw contractError(IMAGE_READ_FAILED, 'WeChat image preparation failed');
  }
  const wechatHtml = prepared.html;
  const imageOccurrences = [
    ...portableImageSources(portableMarkdown),
    ...imageSourcesFromHtml(semanticHtml),
    ...imageSourcesFromHtml(wechatHtml)
  ].filter(({ source }) => isImageSource(source));
  const seenRefs = new Set();
  const uniqueImages = imageOccurrences.filter(({ source }) => {
    if (seenRefs.has(source)) return false;
    seenRefs.add(source);
    return true;
  });
  const images = [];
  for (let index = 0; index < uniqueImages.length; index += 1) {
    const { source, alt } = uniqueImages[index];
    images.push(await imageAsset(source, index + 1, imageStore, alt));
  }

  return Object.freeze({
    schemaVersion: DISTRIBUTION_SCHEMA_VERSION,
    documentId: normalizedDocumentId,
    title: normalizedTitle,
    markdown: normalizedMarkdown,
    portableMarkdown,
    semanticHtml,
    wechatHtml,
    images: freezeImages(images),
    createdAt
  });
}
