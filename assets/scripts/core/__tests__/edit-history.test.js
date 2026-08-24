import { describe, expect, it, vi } from 'vitest';
import { createEditHistory } from '../edit-history.js';

function createHarness(initial = '') {
  let value = initial;
  let selection = { start: value.length, end: value.length, direction: 'none' };
  const applied = [];

  const history = createEditHistory({
    getValue: () => value,
    getSelection: () => selection,
    apply: (nextValue, nextSelection) => {
      value = nextValue;
      selection = {
        start: nextSelection.start,
        end: nextSelection.end,
        direction: nextSelection.direction
      };
      applied.push(nextValue);
    },
    mergeWindowMs: 1000
  });

  return {
    history,
    applied,
    get value() { return value; },
    set value(next) { value = next; },
    get selection() { return selection; },
    set selection(next) { selection = next; }
  };
}

function input(harness, nextValue, nextSelection, event, { beforeInput = true } = {}) {
  if (beforeInput) harness.history.beforeInput();
  harness.value = nextValue;
  harness.selection = nextSelection;
  harness.history.input(event);
}

describe('createEditHistory', () => {
  it('merges continuous single-character inserts within the merge window', () => {
    const harness = createHarness('');
    let time = 0;
    const now = vi.spyOn(performance, 'now').mockImplementation(() => time);

    input(harness, 'a', { start: 1, end: 1, direction: 'none' }, {
      inputType: 'insertText', data: 'a'
    });
    time = 500;
    input(harness, 'ab', { start: 2, end: 2, direction: 'none' }, {
      inputType: 'insertText', data: 'b'
    });

    expect(harness.history.canUndo()).toBe(true);
    harness.history.undo();
    expect(harness.value).toBe('');

    now.mockRestore();
  });

  it('merges continuous backward deletes and separates transactions after the window', () => {
    const harness = createHarness('abcd');
    let time = 0;
    const now = vi.spyOn(performance, 'now').mockImplementation(() => time);

    input(harness, 'abc', { start: 3, end: 3, direction: 'none' }, {
      inputType: 'deleteContentBackward', data: null
    });
    time = 500;
    input(harness, 'ab', { start: 2, end: 2, direction: 'none' }, {
      inputType: 'deleteContentBackward', data: null
    });
    time = 1501;
    input(harness, 'a', { start: 1, end: 1, direction: 'none' }, {
      inputType: 'deleteContentBackward', data: null
    });

    harness.history.undo();
    expect(harness.value).toBe('ab');
    harness.history.undo();
    expect(harness.value).toBe('abcd');

    now.mockRestore();
  });

  it('records an IME composition as one transaction', () => {
    const harness = createHarness('');

    input(harness, 'n', { start: 1, end: 1, direction: 'none' }, {
      inputType: 'insertCompositionText', data: 'n', isComposing: true
    });
    input(harness, 'ni', { start: 2, end: 2, direction: 'none' }, {
      inputType: 'insertCompositionText', data: 'i', isComposing: true
    });
    input(harness, '你', { start: 1, end: 1, direction: 'none' }, {
      inputType: 'insertCompositionText', data: '你', isComposing: false
    });

    harness.history.undo();
    expect(harness.value).toBe('');
    expect(harness.applied).toEqual(['']);
  });

  it('keeps the latest value for input events without beforeinput after programmatic writes', () => {
    const harness = createHarness('before');
    harness.history.reset('before');

    harness.history.programmatic('after');
    harness.value = 'after';
    harness.selection = { start: 5, end: 5, direction: 'none' };
    input(harness, 'after!', { start: 6, end: 6, direction: 'none' }, {
      inputType: 'insertText', data: '!'
    }, { beforeInput: false });

    harness.history.undo();
    expect(harness.value).toBe('after');
  });

  it('reset clears both stacks and establishes a new document baseline', () => {
    const harness = createHarness('one');
    input(harness, 'two', { start: 3, end: 3, direction: 'none' }, {
      inputType: 'insertText', data: 'x'
    });
    harness.history.reset('new document');
    harness.value = 'new document';

    expect(harness.history.canUndo()).toBe(false);
    expect(harness.history.canRedo()).toBe(false);
    expect(harness.history.undo()).toBe(false);
  });
});
