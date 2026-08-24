/**
 * 主编辑器撤销 / 重做历史管理器。
 *
 * 为什么存在:浏览器原生 undo 只覆盖原生编辑路径(打字、删除、原生粘贴)。
 * OpenGZH 的智能粘贴(HTML→Markdown)、工具栏格式化、图片插入、分页符、
 * 卡片样式等均为「程序化重写整个 value」——原生撤销栈不会记录它们,而且
 * 只要发生一次程序化写值,浏览器会连同该元素已有的原生撤销历史一起丢弃,
 * 表现为 Cmd/Ctrl+Z 完全失效。
 *
 * 本模块自管理一个事务栈:
 *  - 原生输入通过 beforeinput(捕获「之前」快照)+ input 记录;
 *    连续单字符键入 / 连续退格在合并窗口内只算一次事务;
 *  - IME 组合期间不逐键分事务,整次组合作为一次撤销单位;
 *  - programmatic() 供所有程序化写入路径调用,每次写入一次事务;
 *  - undo()/redo() 同时恢复内容与选区,供 ⌘/Ctrl+Z、⌘/Ctrl+Shift+Z、
 *    ⌘/Ctrl+Y 及工具栏按钮使用。
 *
 * 历史在切换文档(打开/新建/删除文档)时由 reset() 清空,
 * 避免撤销跨文档串扰。
 */

export function createEditHistory({
  getValue,
  getSelection,
  apply,
  onChange,
  mergeWindowMs = 1000,
  limit = 100,
} = {}) {
  const undoStack = [];        // 事务的「之前」快照 { value, start, end, direction }
  const redoStack = [];        // 撤销时压入的「之后」快照
  let openTxn = null;          // 正在合并中的连续输入事务 { kind, before, caret, lastAt }
  let pendingBefore = null;    // beforeinput 捕获的「之前」快照
  let lastValue = null;        // 兜底:beforeinput 缺失时使用上次已知内容

  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const snapshot = () => {
    const value = getValue();
    const sel = getSelection();
    return { value, start: sel.start ?? 0, end: sel.end ?? 0, direction: sel.direction || 'none' };
  };

  const emit = () => {
    if (onChange) onChange({ canUndo: canUndo(), canRedo: canRedo() });
  };

  const canUndo = () => undoStack.length > 0 || openTxn !== null;
  const canRedo = () => redoStack.length > 0;

  const trim = () => {
    if (undoStack.length > limit) undoStack.shift();
  };

  const push = (before) => {
    undoStack.push(before);
    trim();
    redoStack.length = 0;
  };

  const commitOpen = () => {
    if (!openTxn) return;
    push(openTxn.before);
    openTxn = null;
  };

  const open = (kind, before, caret = before.start) => {
    openTxn = { kind, before, caret, lastAt: now() };
    // 新事务开始,重做分支失效(与 push 语义一致)
    redoStack.length = 0;
    emit();
  };

  const isCompositionInput = (inputType) =>
    typeof inputType === 'string' && inputType.toLowerCase().includes('composition');

  return {
    /**
     * beforeinput:DOM 变更前捕获「之前」快照(任何原生编辑路径都会先触发)。
     */
    beforeInput() {
      pendingBefore = snapshot();
    },

    /**
     * input:DOM 已变更后调用,携带原生 InputEvent(或简化字段)。
     * 依据输入类型决定合并策略并落账。
     */
    input(event) {
      const cur = snapshot();
      const before = pendingBefore || {
        value: lastValue ?? cur.value,
        start: cur.start,
        end: cur.end,
        direction: cur.direction,
      };
      pendingBefore = null;
      lastValue = cur.value;

      const inputType = event?.inputType || '';
      const data = event?.data ?? null;
      const composing = event?.isComposing === true;

      if (composing) {
        // IME 组合期间:合并进组合事务,不逐键分事务
        if (!openTxn || openTxn.kind !== 'composition') {
          commitOpen();
          open('composition', before);
        }
        openTxn.lastAt = now();
        return;
      }

      if (isCompositionInput(inputType)) {
        // 组合收尾:整次组合是一个撤销单位;本次事件的增量已含在组合事务内
        commitOpen();
        return;
      }

      // 连续单字符键入合并
      if (inputType === 'insertText' && data && data.length === 1) {
        if (
          openTxn?.kind === 'insert' &&
          before.start === openTxn.caret &&
          now() - openTxn.lastAt <= mergeWindowMs
        ) {
          openTxn.caret = before.start + 1;
          openTxn.lastAt = now();
          return;
        }
        commitOpen();
        open('insert', before, before.start + data.length);
        return;
      }

      // 连续退格 / 前删合并(光标处);删除选区是独立事务
      const isDelete =
        inputType === 'deleteContentBackward' || inputType === 'deleteContentForward';
      if (isDelete && data === null && before.start === before.end) {
        if (
          openTxn?.kind === 'delete' &&
          before.start === openTxn.caret &&
          now() - openTxn.lastAt <= mergeWindowMs
        ) {
          openTxn.caret =
            inputType === 'deleteContentBackward' ? before.start - 1 : before.start;
          openTxn.lastAt = now();
          return;
        }
        commitOpen();
        open(
          'delete',
          before,
          inputType === 'deleteContentBackward' ? before.start - 1 : before.start
        );
        return;
      }

      // 其余(原生粘贴、选区删除、拖放等):各自一次事务
      commitOpen();
      push(before);
    },

    /**
     * 程序化写入前调用:把当前内容记录为一次可撤销事务。
     * (写入方随后自行赋新值;恢复由 undo() 完成。)
     * @param {string} [nextValue] 写入后的值,用于 beforeinput 缺失时的兜底。
     */
    programmatic(nextValue) {
      commitOpen();
      pendingBefore = null;
      const before = snapshot();
      push(before);
      lastValue = nextValue !== undefined ? nextValue : before.value;
    },

    /** 撤销一次事务;返回是否真正执行。 */
    undo() {
      commitOpen();
      const entry = undoStack.pop();
      if (!entry) {
        emit();
        return false;
      }
      redoStack.push(snapshot());
      lastValue = entry.value;
      pendingBefore = null;
      apply(entry.value, entry);
      emit();
      return true;
    },

    /** 重做一次事务;返回是否真正执行。 */
    redo() {
      const entry = redoStack.pop();
      if (!entry) {
        emit();
        return false;
      }
      undoStack.push(snapshot());
      trim();
      lastValue = entry.value;
      pendingBefore = null;
      apply(entry.value, entry);
      emit();
      return true;
    },

    /**
     * 切换文档 / 初始化时清空历史(新文档不应受旧文档撤销影响)。
     * @param {string} [value] 新文档内容的快照基准;缺省时读取当前值。
     */
    reset(value) {
      undoStack.length = 0;
      redoStack.length = 0;
      openTxn = null;
      pendingBefore = null;
      lastValue = value !== undefined ? value : getValue();
      emit();
    },

    canUndo,
    canRedo,
  };
}
