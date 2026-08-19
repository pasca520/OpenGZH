/**
 * Measured, greedy semantic pagination for XHS cards.
 * Deterministic and source-order preserving.
 * @module xhs/paginator
 */

import { escapeHtml, selectPageVariant } from './renderer.js';

const SENTENCE_FALLBACK_RE = /.*?[。！？!?；;](?:[”’」』】])?|.+$/g;
const XHS_REBALANCE_ENABLED = true;
const MAX_REBALANCE_CANDIDATES = 24;
const TEXTUAL_VARIANTS = new Set(['text', 'chapter', 'quote', 'list']);

const TROUBLESHOOT_HINTS = {
  image: '图片过高或过多，无法放入单张卡片：请将大图拆成多张，或换用更矮的图片。',
  paragraph: '文字段落过长，无法放入单张卡片：请精简段落，或插入分页标记 <!-- xhs-page --> 强制分页。',
  list: '列表过长，无法放入单张卡片：请精简列表，或插入分页标记 <!-- xhs-page --> 强制分页。',
  table: '表格过长，无法放入单张卡片：请精简行数，或插入分页标记 <!-- xhs-page --> 强制分页。',
  code: '代码过长，无法放入单张卡片：请精简代码，或插入分页标记 <!-- xhs-page --> 强制分页。',
  formula: '公式过长，无法放入单张卡片：请精简公式内容。',
  quote: '引用过长，无法放入单张卡片：请精简引用，或插入分页标记 <!-- xhs-page --> 强制分页。'
};

export function createUnbreakableError(block) {
  const type = block?.type || 'unknown';
  const hint = TROUBLESHOOT_HINTS[type] || '请精简该内容，或插入分页标记 <!-- xhs-page --> 强制分页。';
  const error = new Error(`内容块无法拆分为可容纳的卡片：${type}。${hint}`);
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
      if (sentences.some((sentence) => sentence.trim())) return sentences.filter((sentence) => sentence.trim());
    } catch (_error) {
      // fall through to the regex fallback
    }
  }
  const matches = String(source).match(SENTENCE_FALLBACK_RE) || [];
  return matches.filter((sentence) => sentence.trim());
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
 * media (images or raw video) are treated as unbreakable.
 * @param {object} block
 * @param {(blocks:object[]) => Promise<boolean>} fits
 * @returns {Promise<object[]>}
 */
export async function splitParagraphBySentences(block, fits) {
  if (/data-media-ref=|<img\b|<video\b/i.test(block.html || '')) throw createUnbreakableError(block);
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
 * Split a multi-image block by image so each chunk can sit on its own card.
 * Source order is preserved; chunks never reorder images.
 * @param {object} block
 * @param {(blocks:object[]) => Promise<boolean>} fits
 * @returns {Promise<object[]>}
 */
export async function splitImageBlock(block, fits) {
  const images = Array.isArray(block.data.images) ? block.data.images : [];
  if (images.length < 2) throw createUnbreakableError(block);

  const remaining = [...images];
  const chunks = [];
  let index = 1;
  while (remaining.length) {
    const count = await largestFittingPrefix(remaining, fits, (prefix) => ({
      ...block,
      id: `${block.id}#${index}`,
      html: '',
      data: { ...block.data, images: remaining.slice(0, prefix) }
    }));
    if (count === 0) throw createUnbreakableError(block);
    chunks.push({
      ...block,
      id: `${block.id}#${index}`,
      html: '',
      data: { ...block.data, images: remaining.splice(0, count) }
    });
    index += 1;
  }
  return annotateParts(chunks);
}

/**
 * Default split dispatcher. Images are split per image so they can always
 * reach a card of their own; formulas and everything else without a
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
    case 'image': return splitImageBlock(block, fits);
    default: throw createUnbreakableError(block);
  }
}

function splitCandidates(block) {
  switch (block.type) {
    case 'paragraph':
      if (/data-media-ref=|<img\b|<video\b/i.test(block.html || '')) return [];
      return splitIntoSentences(block.text);
    case 'list': return Array.isArray(block.data.items) ? block.data.items : [];
    case 'table': return Array.isArray(block.data.rows) ? block.data.rows : [];
    case 'code': return Array.isArray(block.data.lines) ? block.data.lines : [];
    case 'image': return Array.isArray(block.data.images) ? block.data.images : [];
    default: return [];
  }
}

function makeSemanticChunk(block, candidates, index, consumed) {
  const base = {
    ...block,
    id: `${block.id}#${index}`,
    html: '',
    data: { ...block.data }
  };
  switch (block.type) {
    case 'paragraph':
      return makeParagraphChunk(block, candidates.join(''), index);
    case 'list':
      return { ...base, data: { ...base.data, items: candidates } };
    case 'table':
      return { ...base, data: { ...base.data, rows: candidates } };
    case 'code':
      return {
        ...base,
        text: candidates.join('\n'),
        data: {
          ...base.data,
          lines: candidates,
          startLineNumber: (Number(block.data.startLineNumber) || 1) + consumed
        }
      };
    case 'image':
      return { ...base, data: { ...base.data, images: candidates } };
    default:
      return block;
  }
}

async function largestRemainderPrefix(candidates, currentBlocks, block, fits) {
  const makeChunk = (count) => makeSemanticChunk(block, candidates.slice(0, count), 1, 0);
  if (!(await fits([...currentBlocks, makeChunk(1)]))) return 0;
  let low = 1;
  let high = candidates.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (await fits([...currentBlocks, makeChunk(mid)])) low = mid;
    else high = mid - 1;
  }
  return low;
}

async function splitBlockForRemainder(block, currentBlocks, fits) {
  const candidates = splitCandidates(block);
  if (candidates.length < 2) return null;

  const count = await largestRemainderPrefix(candidates, currentBlocks, block, fits);
  if (count <= 0 || count >= candidates.length) return null;

  const head = makeSemanticChunk(block, candidates.slice(0, count), 1, 0);
  const remainder = makeSemanticChunk(block, candidates.slice(count), 2, count);
  const tail = await fits([remainder]) ? [remainder] : await splitXhsBlock(remainder, fits);
  return annotateParts([head, ...tail]);
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
    fillRatio: null,
    layoutHint: 'flow',
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

function hasHeadingOrphan(blocks) {
  return blocks.length === 0 || blocks.at(-1)?.type === 'heading';
}

function pagePairScore(left, right) {
  const underfill = (ratio) => Math.max(0, 0.65 - ratio) * 4;
  const overTarget = (ratio) => Math.max(0, ratio - 0.9);
  return underfill(left.fillRatio) + underfill(right.fillRatio)
    + overTarget(left.fillRatio) + overTarget(right.fillRatio)
    + Math.abs(left.fillRatio - right.fillRatio) * 0.5;
}

async function rebalancePair(left, right, measure) {
  if (right.manualBreakBefore) return [left, right];
  const blocks = [...left.blocks, ...right.blocks];
  const combined = await measure(blocks);
  if (combined.fits && !hasHeadingOrphan(blocks)) {
    return [{ ...left, blocks }, null];
  }

  const candidates = [];
  for (let split = 1; split < blocks.length && candidates.length < MAX_REBALANCE_CANDIDATES; split += 1) {
    const leftBlocks = blocks.slice(0, split);
    const rightBlocks = blocks.slice(split);
    if (hasHeadingOrphan(leftBlocks) || hasHeadingOrphan(rightBlocks)) continue;
    const [leftMeasure, rightMeasure] = await Promise.all([measure(leftBlocks), measure(rightBlocks)]);
    if (!leftMeasure.fits || !rightMeasure.fits) continue;
    candidates.push({
      split,
      leftBlocks,
      rightBlocks,
      leftMeasure,
      rightMeasure,
      score: pagePairScore(leftMeasure, rightMeasure)
    });
  }

  candidates.sort((a, b) => a.score - b.score || a.split - b.split);
  const best = candidates[0];
  return best
    ? [{ ...left, blocks: best.leftBlocks }, { ...right, blocks: best.rightBlocks }]
    : [left, right];
}

async function rebalanceContentPages(pages, measure) {
  const output = [...pages];
  let index = 0;
  while (index < output.length - 1) {
    const left = output[index];
    const right = output[index + 1];
    if (left.kind !== 'content' || right.kind !== 'content') {
      index += 1;
      continue;
    }
    const [nextLeft, nextRight] = await rebalancePair(left, right, measure);
    output[index] = finalizePage(nextLeft);
    if (nextRight) {
      output[index + 1] = finalizePage(nextRight);
      index += 1;
    } else {
      output.splice(index + 1, 1);
    }
  }
  return output;
}

async function annotatePageMeasurements(pages, measure) {
  for (const page of pages) {
    if (page.kind !== 'content') {
      page.fillRatio = null;
      page.layoutHint = 'flow';
      continue;
    }
    const result = await measure(page.blocks);
    page.fillRatio = Number.isFinite(result.fillRatio) ? result.fillRatio : null;
    page.layoutHint = page.fillRatio != null
      && page.fillRatio < 0.55
      && TEXTUAL_VARIANTS.has(page.variant)
      ? 'short'
      : 'flow';
  }
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
  const measure = typeof runtime.measure === 'function' ? runtime.measure : null;
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
    fillRatio: null,
    layoutHint: 'flow',
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
      fillRatio: null,
      layoutHint: 'flow',
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

  const placeTailChunks = async (chunks) => {
    flush();
    for (const chunk of chunks) {
      if (await tryAdd(chunk)) continue;
      flush();
      if (!(await fits([chunk]))) throw createUnbreakableError(chunk);
      pushBlock(chunk);
    }
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
      const nextIndex = index + 1;
      const next = nextIndex < sourceBlocks.length && sourceBlocks[nextIndex].type !== 'page-break'
        ? sourceBlocks[nextIndex]
        : null;

      if (next) {
        const group = [block, next];
        if (await tryAddGroup(group)) {
          index = nextIndex + 1;
          continue;
        }
        if (currentPage.blocks.length && await fits([...currentPage.blocks, block])) {
          const chunks = await splitBlockForRemainder(next, [...currentPage.blocks, block], fits);
          if (chunks) {
            pushBlock(block);
            pushBlock(chunks[0]);
            await placeTailChunks(chunks.slice(1));
            index = nextIndex + 1;
            continue;
          }
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

    if (currentPage.blocks.length) {
      const chunks = await splitBlockForRemainder(block, currentPage.blocks, fits);
      if (chunks) {
        pushBlock(chunks[0]);
        await placeTailChunks(chunks.slice(1));
        index += 1;
        continue;
      }
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

  if (measure && XHS_REBALANCE_ENABLED) {
    const balanced = await rebalanceContentPages(pages, measure);
    pages.splice(0, pages.length, ...balanced);
  }
  if (measure) await annotatePageMeasurements(pages, measure);

  pages.forEach((page, pageIndex) => {
    page.pageNumber = pageIndex + 1;
    page.totalPages = pages.length;
  });

  return pages;
}
