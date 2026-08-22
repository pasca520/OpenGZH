import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { applyCardEdit, registerCardDirective, scanCardRanges } from '../card-styles.js';
import { preprocessMarkdown } from '../markdown-engine.js';

const root = fileURLToPath(new URL('../../../..', import.meta.url));
const read = (path) => readFileSync(`${root}/${path}`, 'utf8');

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex, `missing start marker: ${start}`).toBeGreaterThanOrEqual(0);
  expect(endIndex, `missing end marker: ${end}`).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

function registeredRule(tokenize = vi.fn()) {
  const before = vi.fn();
  const md = {
    block: {
      ruler: { before },
      tokenize
    }
  };

  registerCardDirective(md);

  expect(before).toHaveBeenCalledWith(
    'fence',
    'ogzh_card',
    expect.any(Function),
    { alt: ['paragraph', 'reference', 'blockquote', 'list'] }
  );
  return { rule: before.mock.calls[0][2], tokenize };
}

function createState(src, tokenize) {
  const bMarks = [];
  const eMarks = [];
  let lineStart = 0;
  for (let index = 0; index < src.length; index += 1) {
    if (src[index] !== '\n') continue;
    bMarks.push(lineStart);
    eMarks.push(index > lineStart && src[index - 1] === '\r' ? index - 1 : index);
    lineStart = index + 1;
  }
  bMarks.push(lineStart);
  eMarks.push(src.length);

  const state = {
    src,
    bMarks,
    eMarks,
    tShift: bMarks.map(() => 0),
    md: { block: { tokenize } },
    parentType: 'root',
    lineMax: bMarks.length,
    line: 0,
    tokens: [],
    push(type, tag, nesting) {
      const token = {
        type,
        tag,
        nesting,
        attrs: null,
        attrSet(name, value) {
          this.attrs ||= [];
          this.attrs.push([name, value]);
        }
      };
      this.tokens.push(token);
      return token;
    }
  };
  return state;
}

function countWholeDocumentLineScans(source, run, shortCircuit = false) {
  const originalExec = RegExp.prototype.exec;
  let count = 0;
  const spy = vi.spyOn(RegExp.prototype, 'exec').mockImplementation(function exec(input) {
    if (this.source === '([^\\r\\n]*)(\\r\\n|\\n|$)' && input === source) {
      count += 1;
      if (shortCircuit) return null;
    }
    return originalExec.call(this, input);
  });

  try {
    run();
  } finally {
    spy.mockRestore();
  }
  return count;
}

describe('card directive block rule', () => {
  it('registers before fence and tokenizes a known card within exact boundaries', () => {
    const snapshots = [];
    const tokenize = vi.fn((state, fromLine, toLine) => {
      snapshots.push({
        fromLine,
        toLine,
        parentType: state.parentType,
        lineMax: state.lineMax
      });
      state.push('paragraph_open', 'p', 1);
    });
    const { rule } = registeredRule(tokenize);
    const state = createState(
      ':::ogzh-card accent-bar\n正文 **重点**\n:::\n后文',
      tokenize
    );
    const originalLineMax = state.lineMax;

    expect(rule(state, 0, state.lineMax, false)).toBe(true);

    expect(state.tokens[0]).toMatchObject({
      type: 'ogzh_card_open',
      tag: 'section',
      nesting: 1,
      block: true,
      map: [0, 3],
      attrs: [['data-ogzh-card', 'accent-bar']]
    });
    expect(snapshots).toEqual([
      { fromLine: 1, toLine: 2, parentType: 'ogzh_card', lineMax: 2 }
    ]);
    expect(state.tokens.at(-1)).toMatchObject({
      type: 'ogzh_card_close',
      tag: 'section',
      nesting: -1,
      block: true
    });
    expect(state.parentType).toBe('root');
    expect(state.lineMax).toBe(originalLineMax);
    expect(state.line).toBe(3);
  });

  it('renders an unknown id as a plain section without copying the id to attributes', () => {
    const tokenize = vi.fn();
    const { rule } = registeredRule(tokenize);
    const state = createState(':::ogzh-card future-card\n正文\n:::', tokenize);

    expect(rule(state, 0, state.lineMax, false)).toBe(true);

    expect(state.tokens[0]).toMatchObject({
      type: 'ogzh_card_open',
      tag: 'section',
      attrs: null,
      map: [0, 3]
    });
    expect(JSON.stringify(state.tokens[0])).not.toContain('future-card');
  });

  it('recognizes a valid directive silently without pushing or tokenizing', () => {
    const tokenize = vi.fn();
    const { rule } = registeredRule(tokenize);
    const state = createState(':::ogzh-card accent-bar\n正文\n:::', tokenize);

    expect(rule(state, 0, state.lineMax, true)).toBe(true);
    expect(state.tokens).toEqual([]);
    expect(tokenize).not.toHaveBeenCalled();
    expect(state.parentType).toBe('root');
    expect(state.line).toBe(0);
  });

  it.each([
    ['unclosed', ':::ogzh-card accent-bar\n正文'],
    [
      'nested',
      ':::ogzh-card accent-bar\n:::ogzh-card soft-fill\n正文\n:::\n:::'
    ],
    ['not an opener', ':::ogzh-card INVALID\n正文\n:::']
  ])('returns false without changing state for a %s directive', (_, source) => {
    const tokenize = vi.fn();
    const { rule } = registeredRule(tokenize);
    const state = createState(source, tokenize);

    expect(rule(state, 0, state.lineMax, false)).toBe(false);
    expect(state.tokens).toEqual([]);
    expect(tokenize).not.toHaveBeenCalled();
    expect(state.parentType).toBe('root');
    expect(state.line).toBe(0);
  });

  it('rejects every opener in one nested cluster on the same state', () => {
    const source =
      ':::ogzh-card accent-bar\n:::ogzh-card soft-fill\n正文\n:::\n:::';
    const tokenize = vi.fn();
    const { rule } = registeredRule(tokenize);
    const state = createState(source, tokenize);

    expect(rule(state, 0, state.lineMax, false)).toBe(false);
    expect(rule(state, 1, state.lineMax, false)).toBe(false);
    expect(state.tokens).toEqual([]);
    expect(tokenize).not.toHaveBeenCalled();
  });

  it('ignores raw opener examples inside a backtick fence that markdown-it already consumed', () => {
    const source = [
      '```md',
      ':::ogzh-card example-only',
      '```',
      ':::ogzh-card accent-bar',
      '真实卡片',
      ':::'
    ].join('\n');
    const tokenize = vi.fn();
    const { rule } = registeredRule(tokenize);
    const state = createState(source, tokenize);

    expect(rule(state, 3, state.lineMax, false)).toBe(true);
    expect(state.tokens[0]).toMatchObject({
      type: 'ogzh_card_open',
      attrs: [['data-ogzh-card', 'accent-bar']],
      map: [3, 6]
    });
    expect(tokenize).toHaveBeenCalledWith(state, 4, 5);
    expect(state.line).toBe(6);
  });

  it('fast-rejects 4000 ordinary lines without scanning the whole document', () => {
    const source = Array.from({ length: 4000 }, (_, index) => `普通行 ${index}`).join('\n');
    const tokenize = vi.fn();
    const { rule } = registeredRule(tokenize);
    const state = createState(source, tokenize);
    const startedAt = performance.now();

    const wholeDocumentScans = countWholeDocumentLineScans(
      source,
      () => {
        for (let line = 0; line < state.lineMax; line += 1) {
          expect(rule(state, line, state.lineMax, false)).toBe(false);
        }
      },
      true
    );

    expect(wholeDocumentScans).toBe(0);
    expect(performance.now() - startedAt).toBeLessThan(1000);
    expect(state.tokens).toEqual([]);
    expect(tokenize).not.toHaveBeenCalled();
  }, 15000);

  it('analyzes adjacent cards without whole-document rescans', () => {
    const source =
      ':::ogzh-card accent-bar\n卡片一\n:::\n:::ogzh-card soft-fill\n卡片二\n:::';
    const tokenize = vi.fn();
    const { rule } = registeredRule(tokenize);
    const state = createState(source, tokenize);

    const wholeDocumentScans = countWholeDocumentLineScans(source, () => {
      expect(rule(state, 0, state.lineMax, false)).toBe(true);
      expect(rule(state, 3, state.lineMax, false)).toBe(true);
    });

    expect(wholeDocumentScans).toBe(0);
    expect(tokenize).toHaveBeenNthCalledWith(1, state, 1, 2);
    expect(tokenize).toHaveBeenNthCalledWith(2, state, 4, 5);
    expect(state.tokens.filter((token) => token.type === 'ogzh_card_open')).toHaveLength(2);
    expect(state.line).toBe(6);
  });
});

describe('card parser integration', () => {
  it('registers the directive on the browser markdown engine', () => {
    const source = read('assets/scripts/core/markdown-engine.js');
    expect(source).toContain("import { registerCardDirective, scanCardRanges } from './card-styles.js'");
    expect(source).toContain('registerCardDirective(md)');
  });

  it('preserves card fences when preprocessing a list card', () => {
    const markdown = [
      '前文',
      '',
      ':::ogzh-card minimal-outline',
      '- 第一项',
      '- 第二项',
      ':::',
      '',
      '后文'
    ].join('\n');

    expect(preprocessMarkdown(markdown)).toBe(markdown);
  });

  it('keeps body and title cards inserted at a collapsed list end parseable for LF and CRLF', () => {
    for (const lineEnding of ['\n', '\r\n']) {
      for (const styleId of ['accent-bar', 'capsule-title']) {
        const source = ['- 第一项', '- 第二项'].join(lineEnding);
        const edit = applyCardEdit(source, source.length, source.length, styleId, []);

        expect(edit.ok).toBe(true);
        expect(preprocessMarkdown(edit.markdown)).toBe(edit.markdown);
        expect(scanCardRanges(preprocessMarkdown(edit.markdown))).toMatchObject([
          { styleId }
        ]);
      }
    }
  });

  it('preserves empty unknown cards and adjacent card boundaries for LF and CRLF', () => {
    for (const lineEnding of ['\n', '\r\n']) {
      const markdown = [
        '- 列表末项',
        ':::ogzh-card future-card   ',
        ':::   ',
        ':::ogzh-card accent-bar',
        '正文',
        ':::'
      ].join(lineEnding);

      expect(preprocessMarkdown(markdown)).toBe(markdown);
      expect(scanCardRanges(preprocessMarkdown(markdown)).map(({ styleId }) => styleId)).toEqual([
        'future-card',
        'accent-bar'
      ]);
    }
  });

  it('still applies legacy list cleanup inside a valid card body', () => {
    const markdown = [
      ':::ogzh-card accent-bar',
      '- 字段',
      ': 值',
      ':::'
    ].join('\n');

    expect(preprocessMarkdown(markdown)).toBe([
      ':::ogzh-card accent-bar',
      '- 字段: 值',
      ':::'
    ].join('\n'));
  });

  it('keeps legacy list cleanup for unrelated or invalid directive-like text', () => {
    const ordinary = ['- 普通条目', ':::', '', '后文'].join('\n');
    const unclosed = [':::ogzh-card accent-bar', '- 普通条目', '后文'].join('\n');
    const nested = [
      ':::ogzh-card accent-bar',
      '- 普通条目',
      ':::ogzh-card soft-fill',
      '内层',
      ':::',
      ':::',
      '',
      '后文'
    ].join('\n');

    expect(preprocessMarkdown(ordinary)).toBe('- 普通条目: :: 后文');
    expect(preprocessMarkdown(unclosed)).toBe(unclosed);
    expect(preprocessMarkdown(nested)).toBe([
      ':::ogzh-card accent-bar',
      '- 普通条目: ::ogzh-card soft-fill',
      '内层',
      ':::',
      ':::',
      '',
      '后文'
    ].join('\n'));
  });

  it('does not repeatedly rescan a large literal closer-placeholder prefix', () => {
    const placeholderPrefix = 'OGZH_CARD_CLOSER_PLACEHOLDER_';
    const markdown = `${placeholderPrefix}${'_'.repeat(4096)}\n\n普通正文`;
    const includes = vi.spyOn(String.prototype, 'includes');

    try {
      expect(preprocessMarkdown(markdown)).toBe(markdown);
      const placeholderScans = includes.mock.calls.filter(
        ([search]) => typeof search === 'string' && search.startsWith(placeholderPrefix)
      );
      expect(placeholderScans.length).toBeLessThanOrEqual(1);
    } finally {
      includes.mockRestore();
    }
  });

  it('preserves CRLF card closers, trailing spaces, and literal placeholder text byte for byte', () => {
    const markdown = [
      '前文',
      '',
      ':::ogzh-card minimal-outline',
      '- 第一项',
      '- OGZH_CARD_CLOSER_PLACEHOLDER____ 是正文',
      ':::   ',
      '',
      '后文'
    ].join('\r\n');

    expect(preprocessMarkdown(markdown)).toBe(markdown);
  });

  it('applies card styles after gzh structure and before the end divider', () => {
    const source = read('assets/scripts/core/render-pipeline.js');
    const gzhIndex = source.indexOf('applyGzhStructure(doc, styleConfig.gzh)');
    const cardIndex = source.indexOf('applyCardStyles(doc, styleConfig)');
    const dividerIndex = source.indexOf('applyEndDivider(doc, displaySettings?.endStyle');

    expect(source).toContain("import { applyCardStyles } from './card-styles.js'");
    expect(gzhIndex).toBeGreaterThan(-1);
    expect(cardIndex).toBeGreaterThan(gzhIndex);
    expect(dividerIndex).toBeGreaterThan(cardIndex);
  });

  it('keeps card rendering shared and limits clipboard branching to GIF materialization', () => {
    const exporter = read('assets/scripts/export/clipboard-exporter.js');
    expect(exporter).toContain('materializeAnimatedCardDecorations');
    expect(exporter).toContain("querySelectorAll('[data-ogzh-card-animation]')");
    expect(exporter).not.toMatch(/case\s+['"](?:soft-halo|history-document|bookmark-reminder)/);
  });

  it('keeps production card DOM static-flow and table-free', () => {
    const source = read('assets/scripts/core/card-styles.js');

    expect(source).not.toMatch(/createElement\(\s*['"]table['"]\s*\)/i);
    expect(source).not.toMatch(/display\s*:\s*(?:flex|grid)|position\s*:|::(?:before|after)/i);
  });

  it('keeps markdown parsing dependency-free', () => {
    const packageJson = JSON.parse(read('package.json'));
    expect(packageJson.dependencies).toBeUndefined();
    expect(packageJson.devDependencies).toEqual({ vitest: '^3.1.1' });
  });
});

describe('card picker editor integration', () => {
  const source = read('assets/scripts/main.js');

  it('uses an automatic selection popover instead of the toolbar trigger', () => {
    const html = read('index.html');
    expect(html).not.toContain('class="editor-tool-btn card-picker-trigger"');
    expect(html).toContain('class="selection-card-popover"');
    expect(html).toContain('应用卡片样式');
    expect(html).toContain('已选 {{ selectedCardTextLength }} 字');
    expect(source).toContain('measureTextareaSelectionFocus');
    expect(source).toContain('placeSelectionPopover');
    expect(source).toContain('handleEditorSelectionChange');
  });

  it('derives all filter totals and visible cards from the registry', () => {
    expect(source).toContain("const cardStyleFilter = ref('all')");
    expect(source).toContain('filteredCardStyles');
    expect(source).toContain('cardStyleFilters');
    expect(source).not.toContain("label: '全部 18'");
  });

  it('imports the shared card catalog and edit helpers and exposes picker state', () => {
    const importMatch = source.match(
      /^import\s*\{([^}]*)\}\s*from\s*['"]\.\/core\/card-styles\.js['"]/m
    );
    expect(importMatch).not.toBeNull();

    const importedNames = new Set(
      importMatch[1].split(',').map((name) => name.trim()).filter(Boolean)
    );
    expect(importedNames).toEqual(new Set([
      'CARD_STYLES',
      'applyCardEdit',
      'findCardAtSelection',
      'inspectCardTarget',
      'removeCardEdit',
      'renderCardPreviewHtml'
    ]));
    expect(source).toMatch(/const\s+showCardPicker\s*=\s*ref\(false\)/);
    expect(source).toMatch(
      /const\s+cardTargetState\s*=\s*ref\(\{\s*ok:\s*true,\s*existing:\s*false,\s*reason:\s*['"]{2}\s*\}\)/
    );

    const setupReturn = source.slice(source.lastIndexOf('\n    return {'));
    for (const name of [
      'cardStyles: CARD_STYLES',
      'showCardPicker',
      'cardTargetState',
      'analyzeCardTarget',
      'openCardPicker',
      'closeCardPicker',
      'applySelectedCard',
      'removeSelectedCard',
      'getCardPreviewHtml'
    ]) {
      expect(setupReturn).toContain(name);
    }
  });

  it('analyzes only new non-empty selections with markdown tokens', () => {
    const analyze = sliceBetween(source, 'function analyzeCardTarget(', 'function openCardPicker(');
    expect(analyze).toContain('getEditorSelection()');
    expect(analyze).toContain('findCardAtSelection(');
    expect(analyze).toMatch(/selection\.start\s*===\s*selection\.end/);
    expect(analyze).toContain('md.parse(markdownInput.value, {})');
    expect(analyze).toContain('inspectCardTarget(');

    const markdownWatch = sliceBetween(
      source,
      'watch(markdownInput,',
      'watch(currentDocumentTitle,'
    );
    expect(markdownWatch).not.toContain('md.parse(');
  });

  it('revalidates apply and remove actions at the cached editor selection', () => {
    const apply = sliceBetween(source, 'async function applySelectedCard(', 'async function removeSelectedCard(');
    expect(apply).toContain('getEditorSelection()');
    expect(apply).toContain('findCardAtSelection(');
    expect(apply).toContain('md.parse(markdownInput.value, {})');
    expect(apply).toContain('applyCardEdit(');
    expect(apply).toContain('await restoreEditorSelection(');

    const remove = sliceBetween(source, 'async function removeSelectedCard(', 'function getCardPreviewHtml(');
    expect(remove).toContain('getEditorSelection()');
    expect(remove.indexOf('findCardAtSelection(')).toBeLessThan(remove.indexOf('removeCardEdit('));
    expect(remove).toContain('await restoreEditorSelection(');
  });

  it('maps internal card edit reasons to actionable Chinese messages', () => {
    const formatReason = sliceBetween(
      source,
      'function formatCardEditFailureReason(',
      'function reportCardEditFailure('
    );
    expect(formatReason).toContain(
      "'card-not-found': '当前选区不在卡片内，请重新选择卡片内容。'"
    );
    expect(formatReason).toContain(
      "'unknown-style': '卡片样式不存在，请重新选择。'"
    );
    expect(formatReason).toContain('Object.hasOwn(messages, reason)');
    expect(formatReason).toMatch(/return\s+reason/);
    expect(formatReason).toContain('卡片操作失败，请重新选择后重试。');
  });

  it('routes apply and remove failures through one mapped state and toast path', () => {
    const reportFailure = sliceBetween(
      source,
      'function reportCardEditFailure(',
      'async function applySelectedCard('
    );
    expect(reportFailure).toContain('formatCardEditFailureReason(');
    expect(reportFailure).toMatch(/reason:\s*message/);
    expect(reportFailure).toContain("toast.show(message, 'error')");

    const apply = sliceBetween(source, 'async function applySelectedCard(', 'async function removeSelectedCard(');
    const remove = sliceBetween(source, 'async function removeSelectedCard(', 'function getCardPreviewHtml(');
    expect(apply).toContain('reportCardEditFailure(result.reason,');
    expect(remove).toContain("reportCardEditFailure('card-not-found',");
    expect(remove).toContain('reportCardEditFailure(result.reason,');
    expect(apply).not.toContain('toast.show(result.reason');
    expect(remove).not.toContain('toast.show(result.reason');
  });

  it('restores successful offsets without moving the editor viewport to the document end', () => {
    const restore = sliceBetween(source, 'async function restoreEditorSelection(', 'function analyzeCardTarget(');
    expect(restore).toContain('await nextTick()');
    expect(restore).toContain('getTextarea()');
    expect(restore).toContain('const scrollTop = textarea.scrollTop');
    expect(restore).toContain('.setSelectionRange(');
    expect(restore).toContain('.focus({ preventScroll: true })');
    expect(restore).toContain('textarea.scrollTop = scrollTop');
    expect(restore.indexOf('.setSelectionRange(')).toBeLessThan(restore.indexOf('.focus('));
    expect(restore).toContain('syncEditorSelection(');
  });

  it('renders card previews with the active article theme', () => {
    const preview = sliceBetween(source, 'function getCardPreviewHtml(', '\nfunction ');
    expect(preview).toContain('renderCardPreviewHtml(');
    expect(preview).toContain('mergedThemeConfig()');
    expect(preview).not.toContain('STYLES[currentStyle.value]');
  });

  it('positions at the textarea focus end through one animation-frame scheduler', () => {
    const position = sliceBetween(source, 'function positionCardPopover(', 'function scheduleCardPopoverPosition(');
    const schedule = sliceBetween(source, 'function scheduleCardPopoverPosition(', 'async function openCardPicker(');

    expect(position).toContain('measureTextareaSelectionFocus(textarea)');
    expect(position).toContain('placeSelectionPopover(');
    expect(position).toContain("closest('.editor-panel')");
    expect(position).toContain('window.visualViewport');
    expect(schedule).toContain('window.requestAnimationFrame(');
    expect(schedule).not.toContain('setTimeout(');
  });

  it('observes editor and visual viewport changes and releases all popover resources', () => {
    const cleanup = sliceBetween(source, 'onBeforeUnmount(() => {', '\n\n    return {');
    expect(source).toContain("document.querySelector('.markdown-input-container')");
    expect(source).toContain('cardPopoverResizeObserver = new ResizeObserver(');
    expect(source).toContain("window.visualViewport?.addEventListener('resize', scheduleCardPopoverPosition)");
    expect(source).toContain("window.visualViewport?.addEventListener('scroll', scheduleCardPopoverPosition)");
    expect(cleanup).toContain("window.removeEventListener('resize', cardPopoverWindowResizeHandler)");
    expect(cleanup).toContain("window.visualViewport?.removeEventListener('resize', scheduleCardPopoverPosition)");
    expect(cleanup).toContain('window.cancelAnimationFrame(cardPopoverPositionFrame)');
    expect(cleanup).toContain('cardPopoverResizeObserver?.disconnect()');
  });

  it('keeps textarea selection active while automatically opening and closing', () => {
    const selection = sliceBetween(source, 'function handleEditorSelectionChange(', 'function handleDocumentKeydown(');
    const open = sliceBetween(source, 'async function openCardPicker(', 'function closeCardPicker(');
    expect(selection).toContain('syncEditorSelection(event)');
    expect(selection).toMatch(/start\s*===\s*editorSelection\.value\.end/);
    expect(selection).toContain('openCardPicker()');
    expect(open).toContain('await nextTick()');
    expect(open).toContain('scheduleCardPopoverPosition()');
    expect(open).not.toContain('.focus(');
  });

  it('keeps the textarea and popover inside one outside-click boundary', () => {
    const outsideClick = sliceBetween(
      source,
      "document.addEventListener('click'",
      '\n\n      imageStore ='
    );
    expect(source).toMatch(
      /const\s+CARD_PICKER_BOUNDARY_SELECTOR\s*=\s*['"]\.selection-card-popover, \.markdown-input['"]/
    );
    expect(outsideClick).toContain(
      'event.target.closest(CARD_PICKER_BOUNDARY_SELECTOR)'
    );
  });

  it('restores editor focus only for Escape and never overwrites the cached selection', () => {
    const outsideClick = sliceBetween(
      source,
      "document.addEventListener('click'",
      '\n\n      imageStore ='
    );
    const close = sliceBetween(source, 'function closeCardPicker(', 'function formatCardEditFailureReason(');
    const keydown = sliceBetween(
      source,
      'function handleDocumentKeydown(',
      'function formatCardEditFailureReason('
    );

    expect(outsideClick).toContain('closeCardPicker(false)');
    expect(outsideClick).toContain("addEventListener('keydown', handleDocumentKeydown)");
    expect(keydown).toMatch(/event\.key\s*===\s*['"]Escape['"]/);
    expect(keydown).toContain('showCardPicker.value');
    expect(keydown).toContain('event.preventDefault()');
    expect(keydown).toContain('closeCardPicker(true)');
    expect(close).toContain('getTextarea()?.focus({ preventScroll: true })');
    expect(close).toContain('nextTick(');
    expect(`${outsideClick}\n${close}\n${keydown}`).not.toContain('editorSelection.value =');
  });

  it('binds and removes the same named card picker keydown handler', () => {
    const handler = source.match(/function\s+(handleDocumentKeydown)\s*\([^)]*\)\s*\{[\s\S]*?\n\}/)?.[0] || '';

    expect(handler).toMatch(/event\.key\s*===\s*['"]Escape['"]/);
    expect(handler).toContain('showCardPicker.value');
    expect(handler).toContain('event.preventDefault()');
    expect(handler).toContain('closeCardPicker(true)');
    expect(source.match(/document\.addEventListener\(['"]keydown['"],\s*handleDocumentKeydown\)/g)).toHaveLength(1);
    expect(source.match(/document\.removeEventListener\(['"]keydown['"],\s*handleDocumentKeydown\)/g)).toHaveLength(1);
  });
});

describe('card picker UI', () => {
  it('renders one selection-anchored dialog with a compact one-line heading', () => {
    const html = read('index.html');
    expect(html.match(/class="selection-card-popover"/g)).toHaveLength(1);
    expect(html).toContain('v-if="showCardPicker"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-label="应用卡片样式"');
    expect(html).toContain('<strong>应用卡片样式</strong>');
    expect(html).toContain('<span>已选 {{ selectedCardTextLength }} 字</span>');
    expect(html).not.toContain('card-picker-trigger');
  });

  it('renders registry-driven filters, actions and invalid-target feedback', () => {
    const html = read('index.html');
    const itemButton = html.match(/<button\s+v-for="card in filteredCardStyles"[\s\S]*?>/)?.[0];
    const removeButton = html.match(/<button\s+v-if="cardTargetState\.existing"[\s\S]*?class="card-picker-remove"[\s\S]*?>/)?.[0];

    expect(html).toContain('v-if="!cardTargetState.ok" class="card-picker-reason" role="status"');
    expect(html).toContain('{{ cardTargetState.reason }}');
    expect(html).toContain('v-for="filter in cardStyleFilters"');
    expect(html).toContain('{{ filter.label }} {{ filter.count }}');
    expect(itemButton).toContain('v-for="card in filteredCardStyles"');
    expect(itemButton).toContain(':key="card.id"');
    expect(itemButton).toContain('type="button"');
    expect(itemButton).toContain(':aria-label="\'应用\' + card.name"');
    expect(itemButton).toContain('@click="applySelectedCard(card.id)"');
    expect(html).toMatch(/class="card-picker-preview"[^>]*aria-hidden="true"[^>]*v-html="getCardPreviewHtml\(card\.id\)"/);
    expect(html).toContain('{{ card.name }}');
    expect(removeButton).toContain('type="button"');
    expect(removeButton).toContain('@click="removeSelectedCard"');
  });

  it('has two desktop columns, one mobile column, visible focus, and bounded overflow', () => {
    const css = read('assets/styles/editor.css');

    expect(css).toMatch(/\.selection-card-popover\s*\{[^}]*position:\s*fixed[^}]*max-height:[^;}]+[^}]*overflow-y:\s*auto/s);
    expect(css).toMatch(/\.card-picker-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
    expect(css).toMatch(/\.card-picker-item:focus-visible/);
    expect(css).toMatch(/@media\s*\(max-width:\s*768px\)[\s\S]*\.selection-card-popover \.card-picker-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
  });

  it('keeps card previews compact while allowing quote or title content to grow', () => {
    const css = read('assets/styles/editor.css');
    const preview = sliceBetween(css, '.card-picker-preview {', '.card-picker-name {');

    expect(preview).toMatch(/display:\s*flow-root/);
    expect(preview).toMatch(/height:\s*auto/);
    expect(preview).toMatch(/min-height:\s*140px/);
    expect(preview).toMatch(/overflow:\s*visible/);
    expect(preview).not.toMatch(/min-height:\s*180px|height:\s*120px|overflow:\s*hidden/);
  });

  it('becomes a viewport-bound mobile half-sheet', () => {
    const css = read('assets/styles/editor.css');
    const mobile = sliceBetween(
      css,
      '@media (max-width: 768px) {',
      '@media (max-width: 640px) {'
    );
    const mobileCard = mobile.match(/\.selection-card-popover\s*\{([^}]*)\}/s)?.[1];

    for (const edge of ['top', 'right', 'bottom', 'left']) {
      expect(mobileCard).toMatch(new RegExp(`(?:^|\\s)${edge}:\\s*[^;]+;`));
    }
    expect(mobileCard).toMatch(/(?:^|\s)width:\s*auto/);
    expect(mobileCard).toMatch(/max-width:\s*none/);
    expect(mobileCard).toMatch(/max-height:\s*min\(54vh,\s*440px\)/);
    expect(mobileCard).toMatch(/overflow-y:\s*auto/);
    expect(mobileCard).toMatch(/border-radius:[^;]+0 0/);
  });
});
