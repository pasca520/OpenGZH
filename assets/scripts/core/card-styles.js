const BODY_PLACEHOLDER = '在这里输入卡片内容';
const CARD_OPENER_PATTERN = /^:::ogzh-card\s+([a-z0-9-]+)\s*$/;
const CARD_CLOSER_PATTERN = /^:::\s*$/;
const FORBIDDEN_TOKEN_REASONS = Object.freeze({
  heading_open: '选区包含标题，请选择普通段落或列表项。',
  image: '选区包含图片，请单独保留图片。',
  table_open: '选区包含表格，请选择普通段落或列表项。',
  fence: '选区包含代码块，请单独保留代码块。',
  code_block: '选区包含代码块，请单独保留代码块。',
  blockquote_open: '选区包含引用块，请选择普通段落或列表项。',
  html_block: '选区包含原始 HTML，请先转换为普通 Markdown。',
  html_inline: '选区包含原始 HTML，请先转换为普通 Markdown。',
  math_block: '选区包含公式块，请单独保留公式块。',
  hr: '选区包含分割线，请选择分割线两侧的内容。'
});

export const CARD_STYLES = Object.freeze([
  { id: 'accent-bar', name: '左线强调卡', slots: 'body', preview: '重点内容' },
  { id: 'minimal-outline', name: '极简框线卡', slots: 'body', preview: '清晰陈述' },
  { id: 'soft-fill', name: '柔和底色卡', slots: 'body', preview: '温和提示' },
  { id: 'quote-frame', name: '引号金句卡', slots: 'body', preview: '一句值得记住的话' },
  { id: 'top-rule', name: '顶线观点卡', slots: 'body', preview: '核心观点' },
  { id: 'double-frame', name: '双层框线卡', slots: 'body', preview: '重点信息' },
  { id: 'solid-contrast', name: '实色反差卡', slots: 'body', preview: '强提醒' },
  {
    id: 'capsule-title',
    name: '胶囊标题卡',
    slots: 'title-body',
    defaultTitle: '核心观点',
    preview: '标题与正文'
  },
  {
    id: 'label-title',
    name: '标签标题卡',
    slots: 'title-body',
    defaultTitle: '核心观点',
    preview: '标签与正文'
  },
  {
    id: 'numbered-conclusion',
    name: '编号结论卡',
    slots: 'title-body',
    defaultTitle: '01 阶段结论',
    preview: '01 阶段结论'
  }
].map((item) => Object.freeze(item)));

const CARD_STYLE_BY_ID = new Map(CARD_STYLES.map((item) => [item.id, item]));

export function getCardStyle(styleId) {
  return CARD_STYLE_BY_ID.get(styleId) || null;
}

function buildCardDirectiveIndex(source) {
  const lines = [];
  const linePattern = /([^\r\n]*)(\r\n|\n|$)/g;
  while (linePattern.lastIndex <= source.length) {
    const match = linePattern.exec(source);
    if (!match || match[0] === '') break;
    lines.push({
      text: match[1],
      start: match.index,
      textEnd: match.index + match[1].length,
      end: match.index + match[0].length
    });
  }

  const records = [];
  const stack = [];
  for (let line = 0; line < lines.length; line += 1) {
    const openerMatch = CARD_OPENER_PATTERN.exec(lines[line].text);
    if (openerMatch) {
      const cluster = stack.length > 0 ? stack[0].cluster : { invalid: false };
      if (stack.length > 0) cluster.invalid = true;
      const record = {
        styleId: openerMatch[1],
        startLine: line,
        opener: lines[line],
        closingLine: null,
        closer: null,
        cluster
      };
      records.push(record);
      stack.push(record);
      continue;
    }

    if (!CARD_CLOSER_PATTERN.test(lines[line].text) || stack.length === 0) continue;
    const record = stack.pop();
    record.closingLine = line;
    record.closer = lines[line];
  }

  for (const record of stack) record.cluster.invalid = true;

  const index = new Map();
  for (const record of records) {
    if (record.cluster.invalid || !record.closer) continue;
    let contentEnd = record.closer.start;
    if (contentEnd > record.opener.end) {
      contentEnd -= source.slice(contentEnd - 2, contentEnd) === '\r\n' ? 2 : 1;
    }
    index.set(record.startLine, {
      styleId: record.styleId,
      known: Boolean(getCardStyle(record.styleId)),
      content: source.slice(record.opener.end, contentEnd),
      startLine: record.startLine,
      closingLine: record.closingLine,
      start: record.opener.start,
      end: record.closer.textEnd,
      openerStart: record.opener.start,
      openerEnd: record.opener.textEnd,
      contentStart: record.opener.end,
      contentEnd,
      closerStart: record.closer.start,
      closerEnd: record.closer.textEnd
    });
  }
  return index;
}

export function parseCardFence(source, startLine) {
  if (!Number.isInteger(startLine) || startLine < 0) return null;
  const card = buildCardDirectiveIndex(source).get(startLine);
  if (!card) return null;
  return {
    styleId: card.styleId,
    known: card.known,
    content: card.content,
    startLine: card.startLine,
    closingLine: card.closingLine
  };
}

export function registerCardDirective(md) {
  const directiveIndexes = new WeakMap();

  function cardDirectiveRule(state, startLine, endLine, silent) {
    const lineStart = state.bMarks?.[startLine];
    const lineEnd = state.eMarks?.[startLine];
    const shift = state.tShift?.[startLine];
    if (
      !Number.isInteger(lineStart) ||
      !Number.isInteger(lineEnd) ||
      shift !== 0
    ) {
      return false;
    }
    const line = state.src.slice(lineStart, lineEnd);
    if (!line.startsWith(':::ogzh-card') || !CARD_OPENER_PATTERN.test(line)) {
      return false;
    }

    let index = directiveIndexes.get(state);
    if (!index) {
      index = buildCardDirectiveIndex(state.src);
      directiveIndexes.set(state, index);
    }
    const card = index.get(startLine);
    if (!card || card.closingLine >= endLine) return false;
    if (silent) return true;

    const opening = state.push('ogzh_card_open', 'section', 1);
    opening.block = true;
    opening.map = [startLine, card.closingLine + 1];
    if (card.known) opening.attrSet('data-ogzh-card', card.styleId);

    const oldParentType = state.parentType;
    const oldLineMax = state.lineMax;
    try {
      state.parentType = 'ogzh_card';
      state.lineMax = card.closingLine;
      state.md.block.tokenize(state, startLine + 1, card.closingLine);
    } finally {
      state.parentType = oldParentType;
      state.lineMax = oldLineMax;
    }

    const closing = state.push('ogzh_card_close', 'section', -1);
    closing.block = true;
    state.line = card.closingLine + 1;
    return true;
  }

  md.block.ruler.before('fence', 'ogzh_card', cardDirectiveRule, {
    alt: ['paragraph', 'reference', 'blockquote', 'list']
  });
}

function buildCardSnippetForStyle(card, selectedBody, lineEnding) {
  const body = selectedBody || BODY_PLACEHOLDER;
  const opener = `:::ogzh-card ${card.id}${lineEnding}`;
  const titleLine = card.slots === 'title-body'
    ? `#### ${card.defaultTitle}${lineEnding}${lineEnding}`
    : '';
  const markdown = `${opener}${titleLine}${body}${lineEnding}:::`;
  const focusedText = card.slots === 'title-body' ? card.defaultTitle : body;
  const focusStart = opener.length + (card.slots === 'title-body' ? '#### '.length : 0);
  return {
    markdown,
    focusStart,
    focusEnd: focusStart + focusedText.length
  };
}

export function buildCardSnippet(styleId, selectedBody = '') {
  const card = getCardStyle(styleId);
  if (!card) {
    throw new Error(`Unknown card style: ${styleId}`);
  }
  return buildCardSnippetForStyle(card, selectedBody, '\n');
}

export function scanCardRanges(source) {
  return Array.from(buildCardDirectiveIndex(source).values(), (card) => ({
    styleId: card.styleId,
    start: card.start,
    end: card.end,
    openerStart: card.openerStart,
    openerEnd: card.openerEnd,
    contentStart: card.contentStart,
    contentEnd: card.contentEnd,
    closerStart: card.closerStart,
    closerEnd: card.closerEnd
  }));
}

export function findCardAtSelection(source, selectionStart, selectionEnd) {
  if (selectionStart > selectionEnd) return null;

  return scanCardRanges(source).find((range) => {
    if (selectionStart === selectionEnd) {
      return selectionStart >= range.start && selectionStart < range.end;
    }
    return selectionStart >= range.start && selectionEnd <= range.end;
  }) || null;
}

function unchangedEdit(source, selectionStart, selectionEnd, reason) {
  return {
    ok: false,
    markdown: source,
    selectionStart,
    selectionEnd,
    kind: 'unchanged',
    reason
  };
}

function mapReplacedOffset(offset, replacedStart, replacedEnd, replacementLength) {
  if (offset <= replacedStart) return offset;
  if (offset >= replacedEnd) return offset + replacementLength - (replacedEnd - replacedStart);
  return replacedStart + Math.min(offset - replacedStart, replacementLength);
}

export function replaceCardStyleEdit(source, selectionStart, selectionEnd, nextStyleId) {
  const nextStyle = getCardStyle(nextStyleId);
  if (!nextStyle) {
    return unchangedEdit(source, selectionStart, selectionEnd, 'unknown-style');
  }

  const range = findCardAtSelection(source, selectionStart, selectionEnd);
  if (!range) {
    return unchangedEdit(source, selectionStart, selectionEnd, 'card-not-found');
  }

  const opener = source.slice(range.openerStart, range.openerEnd);
  const idStart = range.openerStart + opener.indexOf(range.styleId, ':::ogzh-card'.length);
  const idEnd = idStart + range.styleId.length;
  let markdown = source.slice(0, idStart) + nextStyleId + source.slice(idEnd);
  const mappedSelectionStart = mapReplacedOffset(
    selectionStart,
    idStart,
    idEnd,
    nextStyleId.length
  );
  const mappedSelectionEnd = mapReplacedOffset(
    selectionEnd,
    idStart,
    idEnd,
    nextStyleId.length
  );
  const currentStyle = getCardStyle(range.styleId);

  if (currentStyle?.slots === 'body' && nextStyle.slots === 'title-body') {
    const idLengthDelta = nextStyleId.length - range.styleId.length;
    const insertAt = range.contentStart + idLengthDelta;
    const lineEnding = source.slice(range.openerEnd, range.contentStart);
    const titlePrefix = '#### ';
    const titleBlock = `${titlePrefix}${nextStyle.defaultTitle}${lineEnding}${lineEnding}`;
    markdown = markdown.slice(0, insertAt) + titleBlock + markdown.slice(insertAt);
    return {
      ok: true,
      markdown,
      selectionStart: insertAt + titlePrefix.length,
      selectionEnd: insertAt + titlePrefix.length + nextStyle.defaultTitle.length,
      kind: 'replace'
    };
  }

  return {
    ok: true,
    markdown,
    selectionStart: mappedSelectionStart,
    selectionEnd: mappedSelectionEnd,
    kind: 'replace'
  };
}

export function removeCardEdit(source, selectionStart, selectionEnd) {
  const range = findCardAtSelection(source, selectionStart, selectionEnd);
  if (!range) {
    return unchangedEdit(source, selectionStart, selectionEnd, 'card-not-found');
  }

  const content = source.slice(range.contentStart, range.contentEnd);
  const unwrappedStart = range.start;
  return {
    ok: true,
    markdown: source.slice(0, range.start) + content + source.slice(range.end),
    selectionStart: unwrappedStart,
    selectionEnd: unwrappedStart + content.length,
    kind: 'remove'
  };
}

function sourceLineBounds(source) {
  const lines = [];
  let lineStart = 0;

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\r' && source[index + 1] === '\n') {
      lines.push({
        start: lineStart,
        textEnd: index,
        isBlank: source.slice(lineStart, index).trim() === ''
      });
      lineStart = index + 2;
      index += 1;
    } else if (source[index] === '\n') {
      lines.push({
        start: lineStart,
        textEnd: index,
        isBlank: source.slice(lineStart, index).trim() === ''
      });
      lineStart = index + 1;
    }
  }
  lines.push({
    start: lineStart,
    textEnd: source.length,
    isBlank: source.slice(lineStart).trim() === ''
  });
  return lines;
}

function tokenSourceRange(token, lines) {
  if (!Array.isArray(token?.map) || token.map.length < 2) return null;
  const [startLine, endLine] = token.map;
  if (
    !Number.isInteger(startLine) ||
    !Number.isInteger(endLine) ||
    startLine < 0 ||
    endLine <= startLine ||
    !lines[startLine] ||
    !lines[endLine - 1]
  ) {
    return null;
  }
  let lastContentLine = endLine - 1;
  while (lastContentLine >= startLine && lines[lastContentLine].isBlank) {
    lastContentLine -= 1;
  }
  if (lastContentLine < startLine) return null;

  return {
    start: lines[startLine].start,
    end: lines[lastContentLine].textEnd
  };
}

function rangesOverlap(start, end, range) {
  return start < range.end && end > range.start;
}

function selectionValidationReason(source, selectionStart, selectionEnd) {
  if (
    !Number.isInteger(selectionStart) ||
    !Number.isInteger(selectionEnd) ||
    selectionStart < 0 ||
    selectionStart > selectionEnd ||
    selectionEnd > source.length
  ) {
    return '选区偏移无效：起止位置必须是文档范围内的整数，且起点不能晚于终点。';
  }

  const splitsCrlf = (offset) =>
    offset > 0 && source[offset - 1] === '\r' && source[offset] === '\n';
  if (splitsCrlf(selectionStart) || splitsCrlf(selectionEnd)) {
    return '选区端点不能位于 CRLF 换行符中间。';
  }
  return null;
}

function forbiddenReasonInRange(tokens, lines, start, end) {
  for (const token of tokens) {
    const range = tokenSourceRange(token, lines);
    if (!range || !rangesOverlap(start, end, range)) continue;

    const directReason = FORBIDDEN_TOKEN_REASONS[token.type];
    if (directReason) return directReason;

    for (const child of token.children || []) {
      const childReason = FORBIDDEN_TOKEN_REASONS[child.type];
      if (childReason) return childReason;
    }
  }
  return null;
}

function isEligibleTargetToken(token) {
  return (
    (token.type === 'paragraph_open' && token.level === 0) ||
    (token.type === 'list_item_open' && token.level === 1)
  );
}

function isSupportedTopLevelContainer(token) {
  return token.type === 'bullet_list_open' || token.type === 'ordered_list_open';
}

function sourceLineEnding(source) {
  const firstLf = source.indexOf('\n');
  return firstLf > 0 && source[firstLf - 1] === '\r' ? '\r\n' : '\n';
}

function insertCardEdit(source, cursor, card) {
  const lineEnding = sourceLineEnding(source);
  const snippet = buildCardSnippetForStyle(card, '', lineEnding);
  const leftIsLineBoundary = cursor === 0 || source[cursor - 1] === '\n';
  const rightIsLineBoundary =
    cursor === source.length || source[cursor] === '\r' || source[cursor] === '\n';
  const prefix = leftIsLineBoundary ? '' : lineEnding;
  const suffix = rightIsLineBoundary ? '' : lineEnding;
  const snippetStart = cursor + prefix.length;

  return {
    ok: true,
    markdown:
      source.slice(0, cursor) + prefix + snippet.markdown + suffix + source.slice(cursor),
    selectionStart: snippetStart + snippet.focusStart,
    selectionEnd: snippetStart + snippet.focusEnd,
    kind: 'insert'
  };
}

function wrapCardEdit(source, targetStart, targetEnd, card) {
  const selectedBody = source.slice(targetStart, targetEnd);
  const snippet = buildCardSnippetForStyle(
    card,
    selectedBody,
    sourceLineEnding(source)
  );

  return {
    ok: true,
    markdown:
      source.slice(0, targetStart) + snippet.markdown + source.slice(targetEnd),
    selectionStart: targetStart + snippet.focusStart,
    selectionEnd: targetStart + snippet.focusEnd,
    kind: 'wrap'
  };
}

export function inspectCardTarget(source, selectionStart, selectionEnd, tokens) {
  const invalidSelectionReason = selectionValidationReason(
    source,
    selectionStart,
    selectionEnd
  );
  if (invalidSelectionReason) {
    return { ok: false, reason: invalidSelectionReason };
  }
  if (selectionStart === selectionEnd) {
    return { ok: false, reason: '请选择普通段落或列表项。' };
  }

  const overlappingCard = scanCardRanges(source).find((range) =>
    rangesOverlap(selectionStart, selectionEnd, range)
  );
  if (overlappingCard) {
    return {
      ok: false,
      reason: '选区跨越卡片边界，请缩小选区或先移除卡片。'
    };
  }

  const parsedTokens = Array.isArray(tokens) ? tokens : [];
  const lines = sourceLineBounds(source);
  const selectedForbiddenReason = forbiddenReasonInRange(
    parsedTokens,
    lines,
    selectionStart,
    selectionEnd
  );
  if (selectedForbiddenReason) {
    return { ok: false, reason: selectedForbiddenReason };
  }

  const eligibleRanges = parsedTokens
    .filter(isEligibleTargetToken)
    .map((token) => tokenSourceRange(token, lines))
    .filter((range) => range && rangesOverlap(selectionStart, selectionEnd, range));

  if (eligibleRanges.length === 0) {
    return { ok: false, reason: '请选择完整的普通段落或列表项。' };
  }

  const start = Math.min(...eligibleRanges.map((range) => range.start));
  const end = Math.max(...eligibleRanges.map((range) => range.end));
  const expandedForbiddenReason = forbiddenReasonInRange(parsedTokens, lines, start, end);
  if (expandedForbiddenReason) {
    return { ok: false, reason: expandedForbiddenReason };
  }

  const hasUnsupportedRoot = parsedTokens.some((token) => {
    if (token.level !== 0 || !token.map) return false;
    const range = tokenSourceRange(token, lines);
    if (!range || !rangesOverlap(start, end, range)) return false;
    return !isEligibleTargetToken(token) && !isSupportedTopLevelContainer(token);
  });
  if (hasUnsupportedRoot) {
    return { ok: false, reason: '选区不是可支持的普通段落或列表项。' };
  }

  return { ok: true, start, end };
}

export function applyCardEdit(source, selectionStart, selectionEnd, styleId, tokens) {
  const invalidSelectionReason = selectionValidationReason(
    source,
    selectionStart,
    selectionEnd
  );
  if (invalidSelectionReason) {
    return unchangedEdit(source, selectionStart, selectionEnd, invalidSelectionReason);
  }

  const card = getCardStyle(styleId);
  if (!card) {
    return unchangedEdit(source, selectionStart, selectionEnd, 'unknown-style');
  }

  const existing = findCardAtSelection(source, selectionStart, selectionEnd);
  if (existing) {
    return replaceCardStyleEdit(source, selectionStart, selectionEnd, styleId);
  }

  if (selectionStart === selectionEnd) {
    return insertCardEdit(source, selectionStart, card);
  }

  const target = inspectCardTarget(source, selectionStart, selectionEnd, tokens);
  if (!target.ok) {
    return unchangedEdit(source, selectionStart, selectionEnd, target.reason);
  }
  return wrapCardEdit(source, target.start, target.end, card);
}
