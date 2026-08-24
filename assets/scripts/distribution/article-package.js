/**
 * Immutable article package shared by distribution targets.
 * @module distribution/article-package
 */

export const DISTRIBUTION_SCHEMA_VERSION = 1;
export const IMAGE_READ_FAILED = 'IMAGE_READ_FAILED';
export const ARTICLE_INVALID = 'ARTICLE_INVALID';

const DATA_IMAGE_PATTERN = /^data:([^;,]+);base64,([A-Za-z0-9+/]+={0,2})$/i;
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

/**
 * Remove only OpenGZH's outer card/page syntax while retaining article content.
 * Generic fenced directives are kept verbatim, including ones nested in a card.
 */
export function toPortableMarkdown(markdown = '') {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  const output = [];
  let cardDepth = 0;
  let fencedCode = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const codeFence = /^(`{3,}|~{3,})/.test(trimmed);

    if (cardDepth === 0) {
      if (!fencedCode && /^:::ogzh-card(?:\s+.*)?$/.test(trimmed)) {
        cardDepth = 1;
        continue;
      }
      if (!fencedCode && /^<!--\s*xhs-page\s*-->$/.test(trimmed)) continue;
      output.push(line);
      if (codeFence) fencedCode = !fencedCode;
      continue;
    }

    if (/^:::\s*$/.test(trimmed)) {
      cardDepth -= 1;
      if (cardDepth > 0) output.push(line);
      continue;
    }
    if (/^<!--\s*xhs-page\s*-->$/.test(trimmed)) continue;
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
  const tagPattern = /<!--[\s\S]*?-->|<[^>]*>/g;
  let cursor = 0;
  let match;

  while ((match = tagPattern.exec(source))) {
    output.push(source.slice(cursor, match.index));
    const raw = match[0];
    cursor = match.index + raw.length;

    if (raw.startsWith('<!--')) {
      output.push(raw);
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
  const pattern = /<img\b[^>]*>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const tag = match[0];
    const sourceMatch = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!sourceMatch) continue;
    const altMatch = tag.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    matches.push({
      index: match.index,
      source: sourceMatch[1] ?? sourceMatch[2] ?? sourceMatch[3],
      alt: altMatch ? (altMatch[1] ?? altMatch[2] ?? altMatch[3]) : ''
    });
  }
  return matches;
}

function portableImageSources(markdown) {
  return [
    ...imageSourcesFromMarkdown(markdown),
    ...imageSourcesFromHtml(markdown)
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
  prepareWechatContent = async ({ renderedHTML: html }) => ({ html, imageFailures: [] }),
  now = Date.now
}) {
  const createdAt = now();
  const normalizedDocumentId = String(documentId || '');
  const normalizedTitle = String(title || '').trim();
  const normalizedMarkdown = String(markdown || '');
  const normalizedRenderedHtml = String(renderedHtml || '');
  const portableMarkdown = toPortableMarkdown(normalizedMarkdown);
  const semanticHtml = toSemanticHtml(normalizedRenderedHtml);
  const prepared = await prepareWechatContent({
    renderedHTML: normalizedRenderedHtml,
    styleConfig,
    imageStore,
    codeTheme,
    displaySettings,
    imagePolicy: 'defer-local',
    showToast: () => {}
  });
  if (prepared?.imageFailures?.length) {
    throw contractError(IMAGE_READ_FAILED, 'WeChat image preparation failed');
  }
  const wechatHtml = typeof prepared === 'string' ? prepared : (prepared?.html ?? prepared?.wechatHtml ?? '');
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
