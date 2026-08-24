/**
 * Bounded undo/redo stack for arbitrary snapshots.
 * @module core/history-stack
 */

export function createHistoryStack({
  undoStack,
  redoStack,
  limit = 50,
  clone = (value) => value
} = {}) {
  if (!undoStack || !redoStack || typeof clone !== 'function') {
    throw new TypeError('history stack requires undoStack, redoStack and clone');
  }

  const pushUndo = (snapshot) => {
    undoStack.value.push(clone(snapshot));
    if (undoStack.value.length > limit) undoStack.value.shift();
    redoStack.value = [];
  };

  const undo = (currentSnapshot) => {
    if (undoStack.value.length === 0) return null;
    redoStack.value.push(clone(currentSnapshot));
    return undoStack.value.pop();
  };

  const redo = (currentSnapshot) => {
    if (redoStack.value.length === 0) return null;
    undoStack.value.push(clone(currentSnapshot));
    return redoStack.value.pop();
  };

  const clear = () => {
    undoStack.value = [];
    redoStack.value = [];
  };

  return { push: pushUndo, undo, redo, clear };
}
