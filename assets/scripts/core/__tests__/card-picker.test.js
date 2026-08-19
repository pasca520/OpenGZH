import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { registerCardDirective } from '../card-styles.js';

const root = fileURLToPath(new URL('../../../..', import.meta.url));
const read = (path) => readFileSync(`${root}/${path}`, 'utf8');

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

  it('builds one document index for multiple adjacent openers on the same state', () => {
    const source =
      ':::ogzh-card accent-bar\n卡片一\n:::\n:::ogzh-card soft-fill\n卡片二\n:::';
    const tokenize = vi.fn();
    const { rule } = registeredRule(tokenize);
    const state = createState(source, tokenize);

    const wholeDocumentScans = countWholeDocumentLineScans(source, () => {
      expect(rule(state, 0, state.lineMax, false)).toBe(true);
      expect(rule(state, 3, state.lineMax, false)).toBe(true);
    });

    expect(wholeDocumentScans).toBeLessThanOrEqual(state.lineMax + 1);
    expect(tokenize).toHaveBeenNthCalledWith(1, state, 1, 2);
    expect(tokenize).toHaveBeenNthCalledWith(2, state, 4, 5);
    expect(state.tokens.filter((token) => token.type === 'ogzh_card_open')).toHaveLength(2);
    expect(state.line).toBe(6);
  });
});

describe('card parser integration', () => {
  it('registers the directive on the browser markdown engine', () => {
    const source = read('assets/scripts/core/markdown-engine.js');
    expect(source).toContain("import { registerCardDirective } from './card-styles.js'");
    expect(source).toContain('registerCardDirective(md)');
  });

  it('keeps markdown parsing dependency-free', () => {
    const packageJson = JSON.parse(read('package.json'));
    expect(packageJson.dependencies).toBeUndefined();
    expect(packageJson.devDependencies).toEqual({ vitest: '^3.1.1' });
  });
});
