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
  const state = {
    src,
    md: { block: { tokenize } },
    parentType: 'root',
    lineMax: src.split(/\r?\n/).length,
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
