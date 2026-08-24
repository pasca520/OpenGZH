import { describe, expect, it } from 'vitest';
import { createHistoryStack } from '../history-stack.js';

function createStack(options) {
  const undoStack = { value: [] };
  const redoStack = { value: [] };
  return {
    undoStack,
    redoStack,
    history: createHistoryStack({ undoStack, redoStack, ...options })
  };
}

describe('createHistoryStack', () => {
  it('moves snapshots between undo and redo stacks', () => {
    const { undoStack, redoStack, history } = createStack();

    history.push({ value: 'before' });
    expect(history.undo({ value: 'after' })).toEqual({ value: 'before' });
    expect(undoStack.value).toEqual([]);
    expect(redoStack.value).toEqual([{ value: 'after' }]);
    expect(history.redo({ value: 'before' })).toEqual({ value: 'after' });
    expect(undoStack.value).toEqual([{ value: 'before' }]);
    expect(redoStack.value).toEqual([]);
  });

  it('clones snapshots and bounds the undo history', () => {
    const { undoStack, history } = createStack({ limit: 2, clone: (value) => ({ ...value }) });
    const snapshot = { value: 'one' };

    history.push(snapshot);
    snapshot.value = 'mutated';
    history.push({ value: 'two' });
    history.push({ value: 'three' });

    expect(undoStack.value).toEqual([{ value: 'two' }, { value: 'three' }]);
  });

  it('clears redo history after a new branch and supports reset', () => {
    const { undoStack, redoStack, history } = createStack();

    history.push('initial');
    history.undo('changed');
    history.push('new branch');
    expect(redoStack.value).toEqual([]);

    history.clear();
    expect(undoStack.value).toEqual([]);
    expect(redoStack.value).toEqual([]);
  });
});
