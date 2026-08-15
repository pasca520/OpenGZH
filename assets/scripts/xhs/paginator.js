/**
 * Measured, greedy semantic pagination for XHS cards.
 * Deterministic and source-order preserving.
 * @module xhs/paginator
 */

import { escapeHtml, selectPageVariant } from './renderer.js';

const SENTENCE_FALLBACK_RE = /.*?[。！？!?；;](?:[”’」』】])?|.+$/g;

export function createUnbreakableError(block) {
  const error = new Error(`内容块无法拆分为可容纳的卡片：${block?.type || 'unknown'}`);
  error.code = 'unbreakable-block';
  error.blockId = block?.id || null;
  return error;
}

function splitIntoSentences(text) {
  const source = String(text || '');
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    try {
      const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'sentence' });
      const sentences = Array.from(segmenter.segment(source), (part) => part.segment);
      if (sentences.some((sentence) => sentence.trim())) return sentences.map((sentence) => sentence.trim()).filter(Boolean);
    } catch (_error) {
      // fall through to the regex fallback
    }
  }
  const matches = String(source).match(SENTENCE_FALLBACK_RE) || [];
  return matches.filter((sentence) => sentence.trim()).map((sentence) => sentence.trim());
}

function makeParagraphChunk(block, text, index) {
  return {
    ...block,
    id: `${block.id}#${index}`,
    html: `<p>${escapeHtml(text)}</p>`,
    text,
    data: { ...block.data }
  };
}

function annotateParts(chunks) {
  const total = chunks.length;
  return chunks.map((chunk, index) => ({
    ...chunk,
    data: { ...chunk.data, partIndex: index + 1, partTotal: total }
  }));
}

/**
 * Binary-search the largest prefix of `candidates` that fits alone on a card.
 * @param {object[]} candidates
 * @param {(blocks:object[]) => Promise<boolean>} fits
 * @param {(count:number) => object} makeChunk
 * @returns {Promise<number>} 0 when even the first candidate alone does not fit
 */
async function largestFittingPrefix(candidates, fits, makeChunk) {
  if (candidates.length === 0) return 0;
  if (!(await fits([makeChunk(1)]))) return 0;
  let low = 1;
  let high = candidates.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (await fits([makeChunk(mid)])) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  return low;
}

/**
 * Split a long paragraph at sentence boundaries. Paragraphs containing
 * media are treated as unbreakable.
 * @param {object} block
 * @param {(blocks:object[]) => Promise<boolean>} fits
 * @returns {Promise<object[]>}
 */
export async function splitParagraphBySentences(block, fits) {
  if (/data-media-ref=|<img\b/i.test(block.html || '')) throw createUnbreakableError(block);
  const sentences = splitIntoSentences(block.text);
  if (sentences.length < 2) throw createUnbreakableError(block);

  const remaining = [...sentences];
  const chunks = [];
  let index = 1;
  while (remaining.length) {
    const count = await largestFittingPrefix(remaining, fits, (prefix) =>
      makeParagraphChunk(block, remaining.slice(0, prefix).join(''), index));
    if (count === 0) throw createUnbreakableError(block);
    chunks.push(makeParagraphChunk(block, remaining.splice(0, count).join(''), index));
    index += 1;
  }
  return annotateParts(chunks);
}

/**
 * Split a list only at item boundaries.
 * @param {object} block
 * @param {(blocks:object[]) => Promise<boolean>} fits
 * @returns {Promise<object[]>}
 */
export async function splitListByItems(block, fits) {
  const items = Array.isArray(block.data.items) ? block.data.items : [];
  if (items.length < 2) throw createUnbreakableError(block);

  const remaining = [...items];
  const chunks = [];
  let index = 1;
  while (remaining.length) {
    const count = await largestFittingPrefix(remaining, fits, (prefix) => ({
      ...block,
      id: `${block.id}#${index}`,
      html: '',
      data: { ...block.data, items: remaining.slice(0, prefix) }
    }));
    if (count === 0) throw createUnbreakableError(block);
    chunks.push({
      ...block,
      id: `${block.id}#${index}`,
      html: '',
      data: { ...block.data, items: remaining.splice(0, count) }
    });
    index += 1;
  }
  return annotateParts(chunks);
}

/**
 * Split a table by rows, repeating headers on every chunk.
 * @param {object} block
 * @param {(blocks:object[]) => Promise<boolean>} fits
 * @returns {Promise<object[]>}
 */
export async function splitTableByRows(block, fits) {
  const rows = Array.isArray(block.data.rows) ? block.data.rows : [];
  if (rows.length < 2) throw createUnbreakableError(block);

  const remaining = [...rows];
  const chunks = [];
  let index = 1;
  while (remaining.length) {
    const count = await largestFittingPrefix(remaining, fits, (prefix) => ({
      ...block,
      id: `${block.id}#${index}`,
      html: '',
      data: { ...block.data, rows: remaining.slice(0, prefix) }
    }));
    if (count === 0) throw createUnbreakableError(block);
    chunks.push({
      ...block,
      id: `${block.id}#${index}`,
      html: '',
      data: { ...block.data, rows: remaining.splice(0, count) }
    });
    index += 1;
  }
  return annotateParts(chunks);
}

/**
 * Split code by lines, continuing the line numbering on every chunk.
 * @param {object} block
 * @param {(blocks:object[]) => Promise<boolean>} fits
 * @returns {Promise<object[]>}
 */
export async function splitCodeByLines(block, fits) {
  const lines = Array.isArray(block.data.lines) ? block.data.lines : [];
  if (lines.length < 2) throw createUnbreakableError(block);

  const remaining = [...lines];
  const chunks = [];
  let index = 1;
  let startLineNumber = Number(block.data.startLineNumber) || 1;
  while (remaining.length) {
    const count = await largestFittingPrefix(remaining, fits, (prefix) => ({
      ...block,
      id: `${block.id}#${index}`,
      html: '',
      data: { ...block.data, lines: remaining.slice(0, prefix), startLineNumber }
    }));
    if (count === 0) throw createUnbreakableError(block);
    const taken = remaining.splice(0, count);
    chunks.push({
      ...block,
      id: `${block.id}#${index}`,
      html: '',
      data: { ...block.data, lines: taken, startLineNumber }
    });
    startLineNumber += taken.length;
    index += 1;
  }
  return annotateParts(chunks);
}

/**
 * Default split dispatcher. Images, formulas and everything without a
 * semantic splitter are unbreakable.
 * @param {object} block
 * @param {(blocks:object[]) => Promise<boolean>} fits
 * @returns {Promise<object[]>}
 */
export async function splitXhsBlock(block, fits) {
  switch (block.type) {
    case 'paragraph': return splitParagraphBySentences(block, fits);
    case 'list': return splitListByItems(block, fits);
    case 'table': return splitTableByRows(block, fits);
    case 'code': return splitCodeByLines(block, fits);
    default: throw createUnbreakableError(block);
  }
}

function startContentPage(manualBreakBefore = false, manualBreakMarkerStart = null, idSeed = 1) {
  return {
    id: `xhs-page-${idSeed}`,
    kind: 'content',
    variant: 'text',
    blocks: [],
    sourceStart: null,
    sourceEnd: null,
    manualBreakBefore: manualBreakBefore,
    manualBreakMarkerStart: manualBreakMarkerStart,
    pageNumber: 0,
    totalPages: 0
  };
}

function finalizePage(page) {
  if (page.kind === 'content') {
    page.variant = selectPageVariant(page.blocks);
  }
  if (page.blocks.length) {
    page.sourceStart = Math.min(...page.blocks.map((block) => block.sourceStart ?? Infinity));
    page.sourceEnd = Math.max(...page.blocks.map((block) => block.sourceEnd ?? -Infinity));
  }
  if (!Number.isFinite(page.sourceStart)) page.sourceStart = null;
  if (!Number.isFinite(page.sourceEnd)) page.sourceEnd = null;
  return page;
}

/**
 * Greedy measured pagination: parse model → cover (+toc) → content pages.
 * @param {{meta:object, blocks:object[], headings:object[]}} documentModel
 * @param {object} settings XhsDocumentSettings
 * @param {{fits:(blocks:object[]) => Promise<boolean>, splitBlock?:Function}} [runtime]
 * @returns {Promise<object[]>} XhsPage[]
 */
export async function paginateXhsDocument(documentModel, settings, runtime = {}) {
  // ponytail: greedy measured pagination is deterministic and preserves source order;
  // upgrade to global balancing only if user research proves ragged final pages harm publishing.
  const fits = runtime.fits || (async () => true);
  const splitBlock = runtime.splitBlock || splitXhsBlock;

  const pages = [];
  pages.push({
    id: 'xhs-cover',
    kind: 'cover',
    variant: 'cover',
    blocks: [],
    sourceStart: null,
    sourceEnd: null,
    manualBreakBefore: false,
    manualBreakMarkerStart: null,
    pageNumber: 0,
    totalPages: 0
  });

  if (settings.tocEnabled) {
    const tocBlocks = (documentModel.headings || [])
      .filter((heading) => heading.level === 2)
      .map((heading) => ({
        id: `toc-${heading.sourceStart ?? '?'}`,
        type: 'heading',
        sourceStart: heading.sourceStart ?? null,
        sourceEnd: heading.sourceStart ?? null,
        html: '',
        text: heading.text || '',
        data: { level: 2 }
      }));
    pages.push({
      id: 'xhs-toc',
      kind: 'toc',
      variant: 'toc',
      blocks: tocBlocks,
      sourceStart: null,
      sourceEnd: null,
      manualBreakBefore: false,
      manualBreakMarkerStart: null,
      pageNumber: 0,
      totalPages: 0
    });
  }

  const sourceBlocks = documentModel.blocks || [];
  let currentPage = startContentPage(false, null, pages.length);
  let idSeed = pages.length;

  const flush = () => {
    if (currentPage.blocks.length) {
      pages.push(finalizePage(currentPage));
    }
    idSeed = pages.length;
    currentPage = startContentPage(false, null, idSeed);
  };

  const pushBlock = (block) => {
    currentPage.blocks.push(block);
    currentPage.blocks.sort((a, b) => (a.sourceStart ?? 0) - (b.sourceStart ?? 0));
  };

  const tryAdd = async (block) => {
    const candidate = [...currentPage.blocks, block];
    if (await fits(candidate)) {
      pushBlock(block);
      return true;
    }
    return false;
  };

  const tryAddGroup = async (group) => {
    const candidate = [...currentPage.blocks, ...group];
    if (await fits(candidate)) {
      pushBlock(group[0]);
      pushBlock(group[1]);
      return true;
    }
    return false;
  };

  let index = 0;
  while (index < sourceBlocks.length) {
    const block = sourceBlocks[index];

    if (block.type === 'page-break') {
      if (currentPage.blocks.length) {
        pages.push(finalizePage(currentPage));
        idSeed = pages.length;
        currentPage = startContentPage(true, block.sourceStart, idSeed);
      } else if (!currentPage.manualBreakBefore) {
        currentPage.manualBreakBefore = true;
        currentPage.manualBreakMarkerStart = block.sourceStart;
      }
      index += 1;
      continue;
    }

    if (block.type === 'heading') {
      let next = null;
      let nextIndex = index + 1;
      while (nextIndex < sourceBlocks.length && sourceBlocks[nextIndex].type === 'page-break') {
        nextIndex += 1;
      }
      if (nextIndex < sourceBlocks.length) next = sourceBlocks[nextIndex];

      if (next) {
        const group = [block, next];
        if (await tryAddGroup(group)) {
          index = nextIndex + 1;
          continue;
        }
        if (currentPage.blocks.length) flush();
        if (await fits(group)) {
          pushBlock(block);
          pushBlock(next);
          index = nextIndex + 1;
          continue;
        }
      }
    }

    if (await tryAdd(block)) {
      index += 1;
      continue;
    }

    flush();
    if (await fits([block])) {
      pushBlock(block);
      index += 1;
      continue;
    }

    const chunks = await splitBlock(block, fits);
    if (!Array.isArray(chunks) || chunks.length < 2) throw createUnbreakableError(block);
    pushBlock(chunks[0]);
    for (const chunk of chunks.slice(1)) {
      flush();
      pushBlock(chunk);
    }
    index += 1;
  }

  if (currentPage.blocks.length) {
    pages.push(finalizePage(currentPage));
  }

  pages.forEach((page, pageIndex) => {
    page.pageNumber = pageIndex + 1;
    page.totalPages = pages.length;
  });

  return pages;
}
