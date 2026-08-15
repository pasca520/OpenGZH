/**
 * Convert markdown-it tokens into ordered semantic blocks with source ranges.
 * Pure functions operating on token streams; no DOM access (a documentRef may
 * be injected for raw-HTML sanitization).
 * @module xhs/semantic-parser
 */

const PAGE_BREAK_RE = /^<!--\s*xhs-page\s*-->\s*$/i;

const ALLOWED_RAW_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li', 'img', 'video',
  'table', 'thead', 'tbody', 'tr', 'th', 'td'
]);
const FORBIDDEN_RAW_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'
]);
const IMG_ATTRS = new Set(['src', 'alt', 'title', 'width', 'height']);
const VIDEO_ATTRS = new Set(['src', 'poster', 'width', 'height']);
const BLOCKED_ATTRS = new Set(['srcdoc', 'style', 'class', 'id']);
const DANGEROUS_ATTR_RE = /^on/i;

/**
 * Byte offsets of every line start, so token `map` rows become char ranges.
 * @param {string} markdown
 * @returns {number[]}
 */
export function buildLineOffsets(markdown) {
  const offsets = [0];
  const source = String(markdown || '');
  for (let i = 0; i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) offsets.push(i + 1);
  }
  return offsets;
}

function cloneToken(token) {
  const copy = Object.create(Object.getPrototypeOf(token) || Object.prototype);
  Object.assign(copy, token);
  if (token.children) copy.children = token.children.map(cloneToken);
  if (token.attrs) copy.attrs = token.attrs.map((attr) => [attr[0], attr[1]]);
  return copy;
}

/**
 * Remove link_open/link_close tokens at every depth so only link text
 * remains; never a regex pass over HTML.
 * @param {object[]} tokens
 * @returns {object[]}
 */
function stripLinkTokens(tokens) {
  return tokens
    .filter((token) => token.type !== 'link_open' && token.type !== 'link_close')
    .map((token) => {
      if (token.children) token.children = stripLinkTokens(token.children);
      return token;
    });
}

/**
 * Render a token group without any link wrapper tokens.
 * @param {object[]} tokens
 * @param {object} md markdown-it instance
 * @returns {string}
 */
export function renderTokensWithoutLinks(tokens, md) {
  const copy = tokens.map(cloneToken);
  return md.renderer.render(stripLinkTokens(copy), md.options, {});
}

/**
 * Sanitize a raw HTML token through an injected documentRef.
 * @param {string} html
 * @param {object} documentRef document-like object with createElement
 * @returns {string}
 */
export function sanitizeRawHtmlToken(html, documentRef) {
  const doc = documentRef || (typeof document !== 'undefined' ? document : null);
  if (!doc || typeof doc.createElement !== 'function') return '';
  const template = doc.createElement('template');
  template.innerHTML = String(html || '');
  const root = template.content || template;
  cleanRawNodes(root.childNodes);
  return template.innerHTML || '';
}

function cleanRawNodes(nodeList) {
  for (let i = nodeList.length - 1; i >= 0; i -= 1) {
    const node = nodeList[i];
    if (node.nodeType === 3) continue;
    if (node.nodeType !== 1) {
      node.parentNode?.removeChild(node);
      continue;
    }
    const tag = String(node.tagName || '').toLowerCase();
    if (FORBIDDEN_RAW_TAGS.has(tag) || !ALLOWED_RAW_TAGS.has(tag)) {
      node.parentNode?.removeChild(node);
      continue;
    }
    filterRawAttributes(node, tag);
    if (node.childNodes?.length) cleanRawNodes(node.childNodes);
  }
}

function collectAttributes(node) {
  if (node.attributes instanceof Map) {
    return Array.from(node.attributes.entries());
  }
  if (node.attributes) {
    return Array.from(node.attributes, (attr) => [attr.name, attr.value]);
  }
  return [];
}

function filterRawAttributes(node, tag) {
  const allowSet = tag === 'img' ? IMG_ATTRS : tag === 'video' ? VIDEO_ATTRS : null;
  for (const [name, value] of collectAttributes(node)) {
    const lower = String(name).toLowerCase();
    const dangerous = DANGEROUS_ATTR_RE.test(lower) || BLOCKED_ATTRS.has(lower);
    const notAllowed = allowSet && !allowSet.has(lower);
    const badUrl = (lower === 'src' || lower === 'href') && /^\s*javascript:/i.test(String(value));
    if (dangerous || notAllowed || badUrl) node.removeAttribute(name);
  }
}

function getAttr(token, name) {
  if (!token.attrs) return null;
  const found = token.attrs.find(([key]) => key === name);
  return found ? found[1] : null;
}

function groupTopLevelTokens(tokens) {
  const groups = [];
  let index = 0;
  while (index < tokens.length) {
    const first = tokens[index];
    if (first.level !== 0) {
      index += 1;
      continue;
    }
    if (first.nesting === 1) {
      let depth = 0;
      let end = index;
      for (let j = index; j < tokens.length; j += 1) {
        if (tokens[j].level !== 0) continue;
        depth += tokens[j].nesting;
        if (depth === 0) {
          end = j;
          break;
        }
      }
      groups.push(tokens.slice(index, end + 1));
      index = end + 1;
    } else {
      groups.push([first]);
      index += 1;
    }
  }
  return groups;
}

function firstInline(group) {
  return group.find((item) => item.type === 'inline') || null;
}

function groupText(group) {
  const inline = firstInline(group);
  return inline ? inline.content : '';
}

function isImageOnlyInline(inline) {
  if (!inline || !Array.isArray(inline.children) || inline.children.length === 0) return false;
  return inline.children.every((child) => {
    if (child.type === 'image') return true;
    if (child.type === 'text') return /^\s*$/.test(child.content);
    return false;
  });
}

function collectTable(group) {
  const headers = [];
  const rows = [];
  let currentRow = null;
  let currentCell = null;
  let inHeader = false;

  for (const item of group) {
    if (item.type === 'tr_open') {
      currentRow = [];
      currentCell = null;
    } else if (item.type === 'th_open') {
      inHeader = true;
      currentCell = { html: '', text: '' };
    } else if (item.type === 'td_open') {
      inHeader = false;
      currentCell = { html: '', text: '' };
    } else if (item.type === 'inline' && currentCell) {
      currentCell.text = item.content;
      currentCell.html = item.content;
    } else if (item.type === 'th_close' || item.type === 'td_close') {
      if (currentCell && currentRow) currentRow.push(currentCell.text);
      currentCell = null;
    } else if (item.type === 'tr_close') {
      if (currentRow) {
        if (inHeader || headers.length === 0 && currentRow.length && currentRow !== rows[rows.length - 1]) {
          headers.push(...currentRow);
        } else {
          rows.push(currentRow);
        }
      }
      currentRow = null;
    }
  }
  return { headers, rows };
}

function classifyGroup(group, md, options) {
  const first = group[0];
  const type = first.type;

  if (type === 'html_block' || type === 'html_inline') {
    if (PAGE_BREAK_RE.test(first.content || '')) {
      return { type: 'page-break', html: '', text: '', data: {} };
    }
    return {
      type: 'html',
      html: sanitizeRawHtmlToken(first.content || '', options.documentRef),
      text: first.content || '',
      data: {}
    };
  }

  if (type === 'fence') {
    return {
      type: 'code',
      html: renderTokensWithoutLinks(group, md),
      text: first.content || '',
      data: {
        language: (first.info || '').trim().split(/\s+/g)[0] || '',
        lines: String(first.content || '').split('\n'),
        startLineNumber: 1
      }
    };
  }

  if (type === 'math_block') {
    return {
      type: 'formula',
      html: renderTokensWithoutLinks(group, md),
      text: first.content || '',
      data: { display: true }
    };
  }

  if (type === 'hr') {
    return { type: 'html', html: '<hr/>', text: '', data: {} };
  }

  if (type === 'heading_open') {
    return {
      type: 'heading',
      html: renderTokensWithoutLinks(group, md),
      text: groupText(group),
      data: { level: Number((first.tag || 'h2').replace(/^h/i, '')) || 2 }
    };
  }

  if (type === 'paragraph_open') {
    const inline = firstInline(group);
    if (isImageOnlyInline(inline)) {
      return {
        type: 'image',
        html: renderTokensWithoutLinks(group, md),
        text: inline.content,
        data: {
          images: (inline.children || [])
            .filter((child) => child.type === 'image')
            .map((child) => ({ src: getAttr(child, 'src') || '', alt: getAttr(child, 'alt') || child.content || '' }))
        }
      };
    }
    return {
      type: 'paragraph',
      html: renderTokensWithoutLinks(group, md),
      text: groupText(group),
      data: {}
    };
  }

  if (type === 'bullet_list_open' || type === 'ordered_list_open') {
    const items = [];
    let current = null;
    for (const item of group) {
      if (item.type === 'list_item_open') {
        current = { html: '', text: '', tokens: [] };
      } else if (item.type === 'inline' && current) {
        current.text = item.content;
        current.tokens.push(item);
      } else if (item.type === 'list_item_close' && current) {
        current.html = renderTokensWithoutLinks(current.tokens, md);
        items.push(current);
        current = null;
      } else if (current) {
        current.tokens.push(item);
      }
    }
    return {
      type: 'list',
      html: renderTokensWithoutLinks(group, md),
      text: items.map((item) => item.text).join('\n'),
      data: { items, ordered: type === 'ordered_list_open' }
    };
  }

  if (type === 'blockquote_open') {
    return {
      type: 'quote',
      html: renderTokensWithoutLinks(group, md),
      text: groupText(group),
      data: {}
    };
  }

  if (type === 'table_open') {
    const { headers, rows } = collectTable(group);
    return {
      type: 'table',
      html: renderTokensWithoutLinks(group, md),
      text: '',
      data: { headers, rows }
    };
  }

  return {
    type: 'html',
    html: renderTokensWithoutLinks(group, md),
    text: groupText(group),
    data: {}
  };
}

/**
 * Parse Markdown into cover metadata and ordered semantic blocks.
 * @param {string} markdown
 * @param {object} md markdown-it instance
 * @param {{documentRef?: object}} [options]
 * @returns {{meta:{title:string,summary:string},blocks:object[],images:object[],headings:object[]}}
 */
export function parseXhsDocument(markdown, md, options = {}) {
  const source = String(markdown || '');
  const lineOffsets = buildLineOffsets(source);
  const tokens = md.parse(source, {});
  const groups = groupTopLevelTokens(tokens);

  const meta = { title: '', summary: '' };
  const blocks = [];
  const images = [];
  const headings = [];

  for (const group of groups) {
    const first = group[0];
    const startLine = Array.isArray(first.map) && first.map ? first.map[0] : null;
    const endLine = Array.isArray(first.map) && first.map ? first.map[1] : null;
    const sourceStart = startLine == null ? null : lineOffsets[startLine] ?? 0;
    const sourceEnd = endLine == null ? null : (lineOffsets[endLine] ?? source.length);

    const classified = classifyGroup(group, md, options);
    const block = {
      id: `${classified.type}-${sourceStart}-${sourceEnd}`,
      type: classified.type,
      sourceStart,
      sourceEnd,
      html: classified.html,
      text: classified.text,
      data: classified.data
    };

    if (block.type === 'heading' && block.data.level === 1 && !meta.title) {
      meta.title = block.text.trim();
      continue;
    }

    if (block.type === 'heading') {
      headings.push({ text: block.text.trim(), level: block.data.level, sourceStart });
    }

    if (block.type === 'image') {
      for (const image of block.data.images || []) {
        images.push({ src: image.src, alt: image.alt, sourceStart });
      }
    }

    blocks.push(block);

    if (!meta.summary && block.type === 'paragraph' && block.text.trim()) {
      meta.summary = block.text.trim();
    }
  }

  return { meta, blocks, images, headings };
}
