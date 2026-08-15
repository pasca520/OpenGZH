/**
 * Render XhsPage models into measurable, capturable DOM strings.
 * Pure string building; the only DOM use lives in createXhsDomMeasurer.
 * @module xhs/renderer
 */

import { XHS_LOGICAL_WIDTH, XHS_LOGICAL_HEIGHT, XHS_DENSITY_PRESETS } from './constants.js';
import { XHS_THEMES } from './themes.js';

const VARIANT_PRIORITY = ['image', 'table', 'code', 'formula', 'quote', 'list'];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Pick the layout variant for a page. Priority is fixed:
 * image > table > code > formula > quote > list > chapter > text.
 * @param {object[]} blocks
 * @returns {string}
 */
export function selectPageVariant(blocks) {
  const types = new Set(blocks.map((block) => block.type).filter((type) => type !== 'page-break'));
  for (const type of VARIANT_PRIORITY) {
    if (types.has(type)) return type;
  }
  if (types.has('heading')) return 'chapter';
  return 'text';
}

/**
 * Rewrite inline <img src="..."> to data-media-ref so the media resolver
 * owns every remote/local reference; data: URLs keep their src.
 * @param {string} html
 * @returns {string}
 */
export function rewriteImageSources(html) {
  return String(html || '').replace(/<img\b([^>]*?)\bsrc="([^"]+)"([^>]*)>/gi, (match, before, src, after) => {
    if (/^data:/i.test(src)) return match;
    return `<img${before}data-media-ref="${escapeHtml(src)}"${after}>`;
  });
}

function renderBlock(block) {
  const data = block.data || {};
  const attrs = `data-block-id="${escapeHtml(block.id)}" data-source-start="${block.sourceStart ?? ''}" data-source-end="${block.sourceEnd ?? ''}" data-block-type="${escapeHtml(block.type)}"`;
  let inner = '';

  switch (block.type) {
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(data.level) || 2));
      const headingHtml = block.html || `<h${level}>${escapeHtml(block.text)}</h${level}>`;
      inner = `<div class="xhs-heading-wrap xhs-heading-${level}">${headingHtml}</div>`;
      break;
    }
    case 'paragraph':
    case 'quote':
    case 'html':
      inner = rewriteImageSources(block.html || '');
      break;
    case 'list': {
      const items = Array.isArray(data.items) ? data.items : [];
      const tag = data.ordered ? 'ol' : 'ul';
      const lis = items.map((item) => {
        const itemHtml = (item && item.html) ? rewriteImageSources(item.html) : escapeHtml(item && item.text || '');
        return `<li>${itemHtml}</li>`;
      }).join('');
      inner = `<${tag} class="xhs-list">${lis}</${tag}>`;
      break;
    }
    case 'image': {
      const images = Array.isArray(data.images) ? data.images : [];
      inner = images.map((image) => {
        const src = image.src || '';
        const alt = image.alt || '';
        const mediaAttr = /^data:/i.test(src) ? `src="${escapeHtml(src)}"` : `data-media-ref="${escapeHtml(src)}"`;
        const caption = alt ? `<figcaption class="xhs-image-caption">${escapeHtml(alt)}</figcaption>` : '';
        return `<figure class="xhs-image"><img ${mediaAttr} alt="${escapeHtml(alt)}" loading="lazy">${caption}</figure>`;
      }).join('');
      break;
    }
    case 'table': {
      const headers = Array.isArray(data.headers) ? data.headers : [];
      const rows = Array.isArray(data.rows) ? data.rows : [];
      const continued = data.partIndex > 0 && data.partTotal > 1
        ? '<div class="xhs-table-cont">续表</div>'
        : '';
      const headRow = headers.length
        ? `<thead><tr>${headers.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead>`
        : '';
      const bodyRows = rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
      inner = `<figure class="xhs-table">${continued}<table>${headRow}<tbody>${bodyRows}</tbody></table></figure>`;
      break;
    }
    case 'code': {
      const lines = Array.isArray(data.lines) ? data.lines : [];
      const language = data.language || '';
      const startLine = Number(data.startLineNumber) || 1;
      const continued = data.partIndex > 0 && data.partTotal > 1
        ? '<span class="xhs-code-cont">续</span>'
        : '';
      const rows = lines.map((line, index) => (
        `<span class="xhs-code-line"><span class="xhs-code-no">${startLine + index}</span><span class="xhs-code-text">${escapeHtml(line) || ' '}</span></span>`
      )).join('');
      inner = `<figure class="xhs-code"><figcaption class="xhs-code-head"><span class="xhs-code-lang">${escapeHtml(language)}</span>${continued}</figcaption><pre class="xhs-code-pre"><code>${rows}</code></pre></figure>`;
      break;
    }
    case 'formula':
      inner = `<div class="xhs-formula" data-display="${data.display ? 'true' : 'false'}">${block.html || escapeHtml(block.text)}</div>`;
      break;
    default:
      inner = rewriteImageSources(block.html || escapeHtml(block.text || ''));
  }

  return `<div class="xhs-block" ${attrs}>${inner}</div>`;
}

function renderThemeDecoration(themeId, kind) {
  const theme = XHS_THEMES[themeId] || XHS_THEMES['minimal-white'];
  switch (theme.id) {
    case 'editorial-magazine':
      return `<div class="xhs-decoration" aria-hidden="true"><span class="xhs-dec-block xhs-dec-block-a"></span><span class="xhs-dec-block xhs-dec-block-b"></span></div>`;
    case 'warm-paper':
      return `<div class="xhs-decoration" aria-hidden="true"><span class="xhs-dec-frame xhs-dec-frame-a"></span><span class="xhs-dec-frame xhs-dec-frame-b"></span></div>`;
    case 'dark-tech':
      return `<div class="xhs-decoration" aria-hidden="true"><span class="xhs-dec-grid"></span><span class="xhs-dec-tick xhs-dec-tick-a"></span><span class="xhs-dec-tick xhs-dec-tick-b"></span></div>`;
    case 'bright-knowledge':
      return `<div class="xhs-decoration" aria-hidden="true"><span class="xhs-dec-chip xhs-dec-chip-a"></span><span class="xhs-dec-chip xhs-dec-chip-b"></span><span class="xhs-dec-chip xhs-dec-chip-c"></span></div>`;
    case 'minimal-white':
    default:
      return `<div class="xhs-decoration" aria-hidden="true"><span class="xhs-dec-rule"></span></div>`;
  }
}

function renderCoverBody(page, settings, meta = {}) {
  const cover = settings.cover || {};
  const title = (cover.titleOverride || '').trim() || (meta.title || '').trim();
  const summary = (cover.summaryOverride || '').trim() || (meta.summary || '').trim();
  const author = (cover.author || '').trim();
  const imageRef = cover.imageRef || null;
  const focal = cover.focalPoint || { x: 50, y: 50 };

  const media = imageRef
    ? `<div class="xhs-cover-media"><img data-media-ref="${escapeHtml(imageRef)}" alt="" style="object-position:${Number(focal.x) || 50}% ${Number(focal.y) || 50}%"></div>`
    : '';
  const authorHtml = author ? `<div class="xhs-cover-author">${escapeHtml(author)}</div>` : '';
  const summaryHtml = summary ? `<div class="xhs-cover-summary">${escapeHtml(summary)}</div>` : '';
  return `<div class="xhs-cover">${media}<div class="xhs-cover-kicker">${escapeHtml(settings.articleTitle || '')}</div><h1 class="xhs-cover-title">${escapeHtml(title)}</h1>${summaryHtml}${authorHtml}</div>`;
}

function renderTocBody(page) {
  const items = page.blocks
    .filter((block) => block.type === 'heading' && Number(block.data?.level) === 2)
    .map((block, index) => `<li class="xhs-toc-item"><span class="xhs-toc-index">${String(index + 1).padStart(2, '0')}</span><span class="xhs-toc-text">${escapeHtml(block.text)}</span></li>`)
    .join('');
  return `<ol class="xhs-toc">${items}</ol>`;
}

function renderFooter(page, settings) {
  const authorEnabled = settings.footer?.authorEnabled !== false;
  const author = authorEnabled ? (settings.cover?.author || '').trim() : '';
  const number = `${String(page.pageNumber).padStart(2, '0')} / ${String(page.totalPages).padStart(2, '0')}`;
  return `<footer class="xhs-footer">${author ? `<span class="xhs-author">${escapeHtml(author)}</span>` : ''}<span class="xhs-page-number">${number}</span></footer>`;
}

/**
 * Render one page model to an HTML string.
 * @param {object} page XhsPage
 * @param {object} settings XhsDocumentSettings
 * @param {{meta?: {title?:string, summary?:string}, articleTitle?: string}} [options]
 * @returns {string}
 */
export function renderXhsPage(page, settings, options = {}) {
  const theme = XHS_THEMES[settings.themeId] || XHS_THEMES['minimal-white'];
  const meta = options.meta || {};
  const articleTitle = options.articleTitle || (meta.title || '').trim();

  const manualAttrs = page.manualBreakBefore
    ? ` data-manual-break="true" data-marker-start="${page.manualBreakMarkerStart ?? ''}"`
    : '';

  const parts = [];
  parts.push(`<section class="xhs-card" data-page-id="${escapeHtml(page.id)}" data-theme="${escapeHtml(theme.id)}" data-density="${escapeHtml(settings.density)}" data-variant="${escapeHtml(page.variant)}" data-kind="${escapeHtml(page.kind)}" data-page-number="${page.pageNumber}"${manualAttrs}>`);
  parts.push(renderThemeDecoration(theme.id, page.kind));
  parts.push('<div class="xhs-card-body">');
  if (page.kind === 'cover') {
    parts.push(renderCoverBody(page, settings, { ...meta, title: meta.title, summary: meta.summary }));
  } else if (page.variant === 'toc') {
    parts.push(renderTocBody(page));
  } else {
    for (const block of page.blocks) {
      if (block.type === 'page-break') continue;
      parts.push(renderBlock(block));
    }
  }
  parts.push('</div>');
  if (page.kind !== 'cover') parts.push(renderFooter(page, settings));
  parts.push('</section>');
  return parts.join('');
}

/**
 * Render the whole stack to HTML strings.
 * @param {object[]} pages
 * @param {object} settings
 * @param {object} [options]
 * @returns {string[]}
 */
export function renderXhsStack(pages, settings, options = {}) {
  return pages.map((page) => renderXhsPage(page, settings, options));
}

/**
 * Create a DOM-based measurer that mounts a temporary card into `stage`
 * and reports whether the given blocks fit inside the card body.
 * @param {HTMLElement} stage
 * @param {object} settings
 * @returns {{fits:(blocks:object[]) => Promise<boolean>, destroy:() => void}}
 */
export function createXhsDomMeasurer(stage, settings) {
  const card = document.createElement('div');
  card.className = 'xhs-card';
  card.setAttribute('data-theme', settings.themeId);
  card.setAttribute('data-density', settings.density);
  card.style.width = `${XHS_LOGICAL_WIDTH}px`;
  card.style.height = `${XHS_LOGICAL_HEIGHT}px`;
  const body = document.createElement('div');
  body.className = 'xhs-card-body';
  card.appendChild(body);
  stage.appendChild(card);

  async function fits(blocks) {
    const html = renderXhsPage({
      id: '__xhs-measure__',
      kind: 'content',
      variant: selectPageVariant(blocks),
      blocks,
      pageNumber: 1,
      totalPages: 1,
      sourceStart: null,
      sourceEnd: null,
      manualBreakBefore: false,
      manualBreakMarkerStart: null
    }, settings);
    body.innerHTML = html;
    // Read layout after forcing a frame so web fonts / images settle.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return body.scrollHeight <= body.clientHeight && body.scrollWidth <= body.clientWidth;
  }

  function destroy() {
    card.remove();
  }

  return { fits, destroy };
}
