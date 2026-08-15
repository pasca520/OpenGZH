/**
 * Export orchestration for XHS cards: single-page PNG and whole-set ZIP.
 * Validation always gates rasterization; a failing set never downloads.
 * @module xhs/exporter
 */

import { XHS_UPLOAD_WARNING_LIMIT } from './constants.js';
import { validateXhsCard, validateXhsSet } from './validator.js';
import { rasterizeXhsCard } from './rasterizer.js';
import { createStoredZip } from './zip-writer.js';

function sanitizeFilename(name) {
  return (name || 'article')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'article';
}

/**
 * Zero-padded upload-order filename; page 1 is the cover.
 * @param {number} pageNumber
 * @param {number} totalPages
 * @returns {string}
 */
export function buildXhsPngFilename(pageNumber, totalPages) {
  const width = Math.max(2, String(totalPages).length);
  const padded = String(pageNumber).padStart(width, '0');
  return pageNumber === 1 ? `${padded}-封面.png` : `${padded}.png`;
}

/**
 * @param {Blob} blob
 * @param {string} filename
 * @param {Document} [documentRef]
 */
export function downloadBlob(blob, filename, documentRef) {
  const doc = documentRef || (typeof document !== 'undefined' ? document : null);
  if (!doc) return;
  const url = URL.createObjectURL(blob);
  const anchor = doc.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export one page: validate first, rasterize and download only when valid.
 * @param {HTMLElement} card
 * @param {object} page XhsPage
 * @param {object} [options]
 * @returns {Promise<{ok:boolean, blob?:Blob, issues:object[]}>}
 */
export async function exportXhsPage(card, page, options = {}) {
  const pageIndex = page.pageNumber - 1;
  const validateCard = options.validateCard || validateXhsCard;
  const issues = await validateCard(card, pageIndex, options.validateRuntime || {});
  if (issues && issues.length) return { ok: false, issues };

  const rasterize = options.rasterize || rasterizeXhsCard;
  const blob = await rasterize(card, options.rasterizeOptions || {});
  const filename = buildXhsPngFilename(page.pageNumber, page.totalPages);
  if (options.download !== false) downloadBlob(blob, filename, options.documentRef);
  return { ok: true, blob, issues: [] };
}

/**
 * Export the whole set: validate everything first, then rasterize serially
 * and package a Store ZIP. A single invalid page blocks the ZIP entirely;
 * an intermediate rasterize failure never downloads a partial archive.
 * @param {HTMLElement[]} cards
 * @param {{articleTitle?:string}} settings
 * @param {object} [options]
 * @returns {Promise<{ok:boolean, blob?:Blob, issues:object[], warning:string, completedPageIndexes:number[]}>}
 */
export async function exportXhsSet(cards, settings, options = {}) {
  const warning = cards.length > XHS_UPLOAD_WARNING_LIMIT
    ? `当前共 ${cards.length} 张，可能超出当前客户端单篇上传能力，建议拆分为系列内容。`
    : '';

  const validateSet = options.validateSet || validateXhsSet;
  const validation = await validateSet(cards, {
    validateCard: options.validateCard || validateXhsCard,
    ...(options.validateRuntime || {})
  });
  if (!validation.ok) {
    return { ok: false, issues: validation.issues, warning, completedPageIndexes: [] };
  }

  const rasterize = options.rasterize || rasterizeXhsCard;
  const blobs = [];
  const issues = [];
  const completedPageIndexes = [];
  for (let index = 0; index < cards.length; index += 1) {
    try {
      blobs.push(await rasterize(cards[index], options.rasterizeOptions || {}));
      completedPageIndexes.push(index);
    } catch (error) {
      const raw = error.message || '导出失败';
      issues.push({
        code: error.code || 'capture-failed',
        pageIndex: index,
        blockId: error.blockId || null,
        message: raw.includes('第') ? raw : `第 ${index + 1} 页：${raw}`
      });
      break;
    }
  }

  if (issues.length) {
    return { ok: false, issues, warning, completedPageIndexes };
  }

  const files = [];
  for (let index = 0; index < blobs.length; index += 1) {
    const data = new Uint8Array(await blobs[index].arrayBuffer());
    files.push({ name: buildXhsPngFilename(index + 1, blobs.length), data });
  }
  const zipBlob = createStoredZip(files);
  const filename = `${sanitizeFilename(settings.articleTitle)}-小红书图片.zip`;
  if (options.download !== false) downloadBlob(zipBlob, filename, options.documentRef);
  return { ok: true, blob: zipBlob, issues: [], warning, completedPageIndexes };
}
