# XHS Reading-First Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在逐字保留 Markdown 原文的前提下，把小红书图片模式改为 22/20/18px 三档字号，并通过剩余空间语义拆分和相邻页均衡减少碎页。

**Architecture:** 保留现有 `semantic-parser → paginator → renderer → validator/exporter` 边界。`renderer` 扩展为同时返回是否容纳与实际内容使用率；`paginator` 先在当前页剩余空间内按句子/列表项/表格行/代码行切分，再对相邻自动分页做最多 24 个候选的局部均衡。页数解释使用一个新的纯函数模块，不增加持久化字段或运行时依赖。

**Tech Stack:** Vue 3 CDN、原生 ES Modules、markdown-it、DOM 实测、Vitest、agent-browser 本地浏览器验收。

---

## 0. 执行边界

- 当前工作树已有用户修改，包括本计划要触及的 `main.js`、`paginator.js`、`renderer.js`、`xhs.css` 和测试。执行时只在当前内容上做定向补丁，不还原、覆盖或格式化相邻改动。
- 不新建工作树：目标文件的未提交改动就是当前真实基线，分离工作树会丢失这些上下文。
- 每个代码任务只暂存该任务列出的文件。如果文件在任务开始前已有未提交改动，不做原子 commit，避免把用户改动混入提交；只记录验证结果。
- 设计来源：`docs/superpowers/specs/2026-08-19-xhs-reading-first-pagination-design.md`。

## 1. 文件结构

| 路径 | 动作 | 职责 |
| --- | --- | --- |
| `assets/scripts/xhs/constants.js` | 修改 | 22/20/18px 密度真源与 12 张系列建议阈值 |
| `assets/scripts/xhs/renderer.js` | 修改 | DOM 容纳/使用率测量，短文本页标记渲染 |
| `assets/scripts/xhs/paginator.js` | 修改 | 剩余空间语义拆分、有限相邻页均衡、完整性 |
| `assets/scripts/xhs/page-summary.js` | 新建 | 页数分类、总数文案和系列建议判断 |
| `assets/styles/xhs.css` | 修改 | 字号、行高、间距、横向正文区与短文本版式 |
| `assets/scripts/main.js` | 修改 | 把 DOM `measure` 传入分页器，暴露页数摘要和非阻断警告 |
| `index.html` | 修改 | 在图片工具栏展示页数构成 |
| `assets/scripts/xhs/__tests__/constants.test.js` | 修改 | 密度与阈值单测 |
| `assets/scripts/xhs/__tests__/renderer.test.js` | 修改 | 测量结果与 `layoutHint` 单测 |
| `assets/scripts/xhs/__tests__/paginator.test.js` | 修改 | 剩余空间拆分、均衡、孤立标题和完整性单测 |
| `assets/scripts/xhs/__tests__/page-summary.test.js` | 新建 | 分类互斥、计数闭合与 12 张提示单测 |

### Task 1: 更新全局密度契约

**Files:**
- Modify: `assets/scripts/xhs/__tests__/constants.test.js:1-34`
- Modify: `assets/scripts/xhs/constants.js:15-35`
- Modify: `assets/styles/xhs.css:64-108`
- Modify: `assets/styles/xhs.css:462-501`

- [ ] **Step 1: 写密度和系列建议阈值失败测试**

在 `constants.test.js` 中扩展导入并新增：

```js
import {
  createDefaultXhsSettings,
  normalizeXhsSettings,
  XHS_DENSITY_PRESETS,
  XHS_SERIES_SUGGESTION_LIMIT
} from '../constants.js';

it('uses reading-first density presets and a separate series suggestion limit', () => {
  expect(XHS_DENSITY_PRESETS).toEqual({
    relaxed: { bodySize: 22, lineHeight: 1.65, blockGap: 18 },
    standard: { bodySize: 20, lineHeight: 1.55, blockGap: 14 },
    compact: { bodySize: 18, lineHeight: 1.48, blockGap: 10 }
  });
  expect(XHS_SERIES_SUGGESTION_LIMIT).toBe(12);
});
```

- [ ] **Step 2: 运行测试并确认旧值/缺少导出导致失败**

Run: `npx vitest run assets/scripts/xhs/__tests__/constants.test.js`

Expected: FAIL，失败点包含 `XHS_SERIES_SUGGESTION_LIMIT` 未导出或标准档仍为 `24/1.65/20`。

- [ ] **Step 3: 更新常量真源**

在 `constants.js` 中保留现有上传警告阈值，新增独立编辑阈值并替换密度：

```js
export const XHS_UPLOAD_WARNING_LIMIT = 18;
export const XHS_SERIES_SUGGESTION_LIMIT = 12;

export const XHS_DENSITY_PRESETS = {
  relaxed: { bodySize: 22, lineHeight: 1.65, blockGap: 18 },
  standard: { bodySize: 20, lineHeight: 1.55, blockGap: 14 },
  compact: { bodySize: 18, lineHeight: 1.48, blockGap: 10 }
};
```

- [ ] **Step 4: 使 CSS 使用同一套数值并收窄横向边距**

替换 `xhs.css` 的卡片变量与正文区：

```css
.xhs-card {
  --xhs-body-size: 20px;
  --xhs-line-height: 1.55;
  --xhs-block-gap: 14px;
}

.xhs-card-body {
  position: absolute;
  inset: 48px 36px 64px;
  overflow: hidden;
}

.xhs-card[data-density="relaxed"] { --xhs-body-size: 22px; --xhs-line-height: 1.65; --xhs-block-gap: 18px; }
.xhs-card[data-density="standard"] { --xhs-body-size: 20px; --xhs-line-height: 1.55; --xhs-block-gap: 14px; }
.xhs-card[data-density="compact"] { --xhs-body-size: 18px; --xhs-line-height: 1.48; --xhs-block-gap: 10px; }
```

页脚左右边界同步改为 `36px`，防止正文与页脚视觉边界不一致。H2/H3/H4 保留现有相对比例，但将编辑部、温暖纸张的 H2 额外倍率最大值收敛到 `1.45`。

- [ ] **Step 5: 运行常量测试**

Run: `npx vitest run assets/scripts/xhs/__tests__/constants.test.js`

Expected: PASS。

### Task 2: 让 DOM 测量同时返回容纳与使用率

**Files:**
- Modify: `assets/scripts/xhs/__tests__/renderer.test.js:99-170`
- Modify: `assets/scripts/xhs/renderer.js:175-214`
- Modify: `assets/scripts/xhs/renderer.js:280-309`
- Modify: `assets/styles/xhs.css:90-108`

- [ ] **Step 1: 写 `measure()` 与短页标记失败测试**

在渲染测试中新增：

```js
it('renders the derived layout hint without changing page content', () => {
  const html = renderXhsPage({
    id: 'short', kind: 'content', variant: 'text', layoutHint: 'short',
    blocks: [{ id: 'p', type: 'paragraph', html: '<p>短页</p>' }],
    pageNumber: 2, totalPages: 2, sourceStart: 0, sourceEnd: 2,
    manualBreakBefore: false, manualBreakMarkerStart: null
  }, settings);
  expect(html).toContain('data-layout-hint="short"');
  expect(html).toContain('短页');
});
```

在现有 FakeElement 测试中，获取 `body` 并断言实际使用率：

```js
const measurer = createXhsDomMeasurer(stage, settings);
const body = stage.children[0].children[0];
body.children = [{ offsetTop: 0, offsetHeight: 304 }];
const result = await measurer.measure([]);
expect(result).toEqual({
  fits: true,
  usedHeight: 304,
  availableHeight: 608,
  fillRatio: 0.5
});
expect(await measurer.fits([])).toBe(true);
```

- [ ] **Step 2: 运行渲染测试并确认 `measure` 不存在**

Run: `npx vitest run assets/scripts/xhs/__tests__/renderer.test.js`

Expected: FAIL，错误包含 `measurer.measure is not a function` 或缺少 `data-layout-hint`。

- [ ] **Step 3: 实现实际内容高度测量**

在 `createXhsDomMeasurer()` 中用直接子元素底边而不是 `scrollHeight` 估算低利用率；因为固定高容器在内容较少时 `scrollHeight` 仍至少等于 `clientHeight`：

```js
async function measure(blocks) {
  await fontsReady;
  body.innerHTML = renderXhsBlocks(blocks);
  if (options.hydrateMedia) await options.hydrateMedia(body);
  await waitForImages(body);

  const tolerance = 2;
  const fits = body.scrollHeight <= body.clientHeight + tolerance
    && body.scrollWidth <= body.clientWidth + tolerance;
  const usedHeight = Array.from(body.children).reduce(
    (max, child) => Math.max(max, child.offsetTop + child.offsetHeight),
    0
  );
  const availableHeight = body.clientHeight;
  return {
    fits,
    usedHeight,
    availableHeight,
    fillRatio: availableHeight > 0 ? usedHeight / availableHeight : 0
  };
}

async function fits(blocks) {
  return (await measure(blocks)).fits;
}

return { measure, fits, destroy };
```

- [ ] **Step 4: 渲染页布局标记与短文本样式**

在 `renderXhsPage()` 根节点增加：

```js
const layoutHint = page.layoutHint === 'short' ? 'short' : 'flow';
// root section attributes
` data-layout-hint="${layoutHint}"`
```

在 `xhs.css` 增加：

```css
.xhs-card[data-layout-hint="short"][data-kind="content"] .xhs-card-body {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
```

- [ ] **Step 5: 运行渲染测试**

Run: `npx vitest run assets/scripts/xhs/__tests__/renderer.test.js`

Expected: PASS。

### Task 3: 先用当前页的剩余空间

**Files:**
- Modify: `assets/scripts/xhs/__tests__/paginator.test.js:1-230`
- Modify: `assets/scripts/xhs/paginator.js:35-260`
- Modify: `assets/scripts/xhs/paginator.js:343-440`

- [ ] **Step 1: 写“完整段落能放入下一页也允许拆分”失败测试**

```js
it('uses sentence boundaries to fill the current page before moving a fitting paragraph', async () => {
  nextOffset = 0;
  const lead = block('paragraph', 2);
  const paragraph = block('paragraph', 2);
  paragraph.text = '第一句。第二句。';
  paragraph.html = `<p>${paragraph.text}</p>`;

  const fits = async (candidate) => {
    const units = candidate.reduce((sum, item) => {
      if (item.id === lead.id) return sum + 2;
      return sum + (item.text.match(/[。！？；]/g)?.length || 1);
    }, 0);
    return units <= 3;
  };

  const pages = await paginateXhsDocument(
    { meta: { title: 'T', summary: 'S' }, blocks: [lead, paragraph], headings: [] },
    settings,
    { fits }
  );
  const content = pages.filter((page) => page.kind === 'content');
  expect(content[0].blocks.map((item) => item.text).join('')).toContain('第一句。');
  expect(content[1].blocks.map((item) => item.text).join('')).toBe('第二句。');
  expect(content.flatMap((page) => page.blocks).filter((item) => item.id.startsWith(paragraph.id)).map((item) => item.text).join(''))
    .toBe(paragraph.text);
});
```

- [ ] **Step 2: 运行定向测试并确认整段被移到第二页**

Run: `npx vitest run assets/scripts/xhs/__tests__/paginator.test.js -t "uses sentence boundaries"`

Expected: FAIL，第一页不包含“第一句”。

- [ ] **Step 3: 实现剩余空间二段切分**

在 `paginator.js` 增加一个内部函数，对段落、列表、表格、代码和多图块复用现有构造逻辑：

```js
async function splitBlockForRemainder(block, currentBlocks, fits) {
  const candidates = splitCandidates(block);
  if (candidates.length < 2) return null;

  const count = await largestFittingPrefix(
    candidates,
    (chunks) => fits([...currentBlocks, ...chunks]),
    (prefix) => makeSemanticChunk(block, candidates.slice(0, prefix), 1, 0)
  );
  if (count <= 0 || count >= candidates.length) return null;

  const head = makeSemanticChunk(block, candidates.slice(0, count), 1, 0);
  const remainder = makeSemanticChunk(block, candidates.slice(count), 2, count);
  const tail = await fits([remainder]) ? [remainder] : await splitXhsBlock(remainder, fits);
  return annotateParts([head, ...tail]);
}
```

`splitCandidates()` 和 `makeSemanticChunk()` 使用下列精确映射：

```js
function splitCandidates(block) {
  switch (block.type) {
    case 'paragraph': return splitIntoSentences(block.text);
    case 'list': return block.data.items || [];
    case 'table': return block.data.rows || [];
    case 'code': return block.data.lines || [];
    case 'image': return block.data.images || [];
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
```

- [ ] **Step 4: 把剩余空间拆分接入主循环**

在 `tryAdd(block)` 失败且 `currentPage.blocks.length > 0` 时，在 `flush()` 之前尝试：

```js
const chunks = await splitBlockForRemainder(block, currentPage.blocks, fits);
if (chunks) {
  pushBlock(chunks[0]);
  flush();
  for (const chunk of chunks.slice(1)) {
    if (!(await tryAdd(chunk))) {
      flush();
      pushBlock(chunk);
    }
  }
  index += 1;
  continue;
}
```

标题组绑定分支保持优先；手动分页标记分支不调用该逻辑。

- [ ] **Step 5: 运行分页器测试**

Run: `npx vitest run assets/scripts/xhs/__tests__/paginator.test.js`

Expected: PASS，现有表格表头、代码行号、图片顺序和手动分页测试无回归。

### Task 4: 增加有上限的相邻页均衡

**Files:**
- Modify: `assets/scripts/xhs/__tests__/paginator.test.js:1-280`
- Modify: `assets/scripts/xhs/paginator.js:260-470`
- Modify: `assets/scripts/xhs/renderer.js:280-312`
- Modify: `assets/scripts/main.js:662-676`

- [ ] **Step 1: 写均衡、手动边界和孤立标题失败测试**

```js
const measureThreeUnits = async (blocks) => {
  const usedHeight = blocks.reduce((sum, item) => sum + (item.data.units || 1), 0);
  return {
    fits: usedHeight <= 3,
    usedHeight,
    availableHeight: 3,
    fillRatio: usedHeight / 3
  };
};

it('rebalances adjacent automatic pages without crossing manual breaks', async () => {
  nextOffset = 0;
  const blocks = [block('paragraph', 2), block('paragraph', 1), block('paragraph', 1)];
  const pages = await paginateXhsDocument(
    { meta: { title: 'T', summary: 'S' }, blocks, headings: [] },
    settings,
    { fits: fitsThreeUnits, measure: measureThreeUnits }
  );
  const content = pages.filter((page) => page.kind === 'content');
  expect(content.map((page) => page.blocks.reduce((sum, item) => sum + item.data.units, 0))).toEqual([2, 2]);
  expect(content.every((page) => page.blocks.at(-1)?.type !== 'heading')).toBe(true);
});
```

在现有手动分页测试中传入 `measureThreeUnits`，并保持标记前后页内容不变。

- [ ] **Step 2: 运行定向测试并确认仍为 3/1 分布**

Run: `npx vitest run assets/scripts/xhs/__tests__/paginator.test.js -t "rebalances adjacent"`

Expected: FAIL，当前贪心结果为 `[3, 1]` 且无填充率元数据。

- [ ] **Step 3: 实现候选评分和有限回溯**

在 `paginator.js` 增加：

```js
const XHS_REBALANCE_ENABLED = true;
const MAX_REBALANCE_CANDIDATES = 24;

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
  const candidates = [];

  if ((await measure(blocks)).fits && !hasHeadingOrphan(blocks)) {
    return [{ ...left, blocks }, null];
  }

  for (let split = 1; split < blocks.length && candidates.length < MAX_REBALANCE_CANDIDATES; split += 1) {
    const leftBlocks = blocks.slice(0, split);
    const rightBlocks = blocks.slice(split);
    if (hasHeadingOrphan(leftBlocks) || hasHeadingOrphan(rightBlocks)) continue;
    const [leftMeasure, rightMeasure] = await Promise.all([measure(leftBlocks), measure(rightBlocks)]);
    if (!leftMeasure.fits || !rightMeasure.fits) continue;
    candidates.push({
      leftBlocks,
      rightBlocks,
      leftMeasure,
      rightMeasure,
      score: pagePairScore(leftMeasure, rightMeasure)
    });
  }

  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0];
  return best
    ? [{ ...left, blocks: best.leftBlocks }, { ...right, blocks: best.rightBlocks }]
    : [left, right];
}
```

`rebalanceContentPages()` 从前往后扫描内容页，将 `null` 右页移除，合并页后会在同一索引继续检查新的右页：

```js
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
```

主函数只在 `runtime.measure && XHS_REBALANCE_ENABLED` 时调用 `rebalanceContentPages()`；紧急回滚只需将该局部常量设为 `false`。处理后统一更新 `sourceStart/sourceEnd/variant`与页码。

- [ ] **Step 4: 派生页面使用率与短页标记**

对最终每个正文页执行 `measure(page.blocks)`：

```js
const TEXTUAL_VARIANTS = new Set(['text', 'chapter', 'quote', 'list']);
page.fillRatio = result.fillRatio;
page.layoutHint = result.fillRatio < 0.55 && TEXTUAL_VARIANTS.has(page.variant)
  ? 'short'
  : 'flow';
```

封面和目录固定 `layoutHint: 'flow'`。未注入 `runtime.measure` 时跳过均衡并设置 `fillRatio: null`，保持纯逻辑调用向后兼容。

- [ ] **Step 5: 把同一个 DOM 测量器注入分页器**

修改 `main.js::buildXhsPages()`：

```js
const pages = await paginateXhsDocument(parsed, settings, {
  fits: (blocks) => measurer.fits(blocks),
  measure: (blocks) => measurer.measure(blocks)
});
```

- [ ] **Step 6: 运行分页和渲染测试**

Run: `npx vitest run assets/scripts/xhs/__tests__/paginator.test.js assets/scripts/xhs/__tests__/renderer.test.js`

Expected: PASS。

### Task 5: 让用户看懂页数构成

**Files:**
- Create: `assets/scripts/xhs/page-summary.js`
- Create: `assets/scripts/xhs/__tests__/page-summary.test.js`
- Modify: `assets/scripts/main.js:35-50`
- Modify: `assets/scripts/main.js:90-110`
- Modify: `assets/scripts/main.js:740-754`
- Modify: `assets/scripts/main.js:3230-3250`
- Modify: `index.html:599-607`
- Modify: `assets/styles/xhs.css:850-875`

- [ ] **Step 1: 写页面分类和阈值失败测试**

```js
import { describe, expect, it } from 'vitest';
import { summarizeXhsPages } from '../page-summary.js';

describe('xhs page summary', () => {
  it('assigns every page to exactly one user-facing category', () => {
    const pages = [
      { kind: 'cover', variant: 'cover' },
      { kind: 'content', variant: 'text' },
      { kind: 'content', variant: 'chapter' },
      { kind: 'content', variant: 'image' },
      { kind: 'content', variant: 'code' },
      { kind: 'content', variant: 'table' },
      { kind: 'content', variant: 'formula' }
    ];
    const summary = summarizeXhsPages(pages);
    expect(summary).toMatchObject({ total: 7, cover: 1, body: 2, image: 1, rich: 3 });
    expect(summary.cover + summary.body + summary.image + summary.rich).toBe(summary.total);
    expect(summary.label).toBe('7 张：封面 1 + 正文 2 + 图片 1 + 代码/表格 3');
    expect(summary.needsSeriesSuggestion).toBe(false);
  });

  it('suggests a series only above twelve pages', () => {
    expect(summarizeXhsPages(Array.from({ length: 12 }, () => ({ kind: 'content', variant: 'text' }))).needsSeriesSuggestion).toBe(false);
    expect(summarizeXhsPages(Array.from({ length: 13 }, () => ({ kind: 'content', variant: 'text' }))).needsSeriesSuggestion).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试并确认模块不存在**

Run: `npx vitest run assets/scripts/xhs/__tests__/page-summary.test.js`

Expected: FAIL，错误包含 `Cannot find module '../page-summary.js'`。

- [ ] **Step 3: 实现纯函数页数摘要**

```js
import { XHS_SERIES_SUGGESTION_LIMIT } from './constants.js';

const RICH_VARIANTS = new Set(['code', 'table', 'formula']);

export function summarizeXhsPages(pages = []) {
  const summary = { total: pages.length, cover: 0, body: 0, image: 0, rich: 0 };
  for (const page of pages) {
    if (page.kind === 'cover') summary.cover += 1;
    else if (page.variant === 'image') summary.image += 1;
    else if (RICH_VARIANTS.has(page.variant)) summary.rich += 1;
    else summary.body += 1;
  }
  return {
    ...summary,
    label: `${summary.total} 张：封面 ${summary.cover} + 正文 ${summary.body} + 图片 ${summary.image} + 代码/表格 ${summary.rich}`,
    needsSeriesSuggestion: summary.total > XHS_SERIES_SUGGESTION_LIMIT
  };
}
```

- [ ] **Step 4: 接入 Vue 状态和警告文案**

在 `main.js` 导入 `summarizeXhsPages`，新增：

```js
const xhsPageSummary = computed(() => summarizeXhsPages(xhsPages.value));
```

替换页数警告赋值：

```js
const summary = summarizeXhsPages(result.pages);
xhsWarning.value = result.pages.length > XHS_UPLOAD_WARNING_LIMIT
  ? `当前共 ${result.pages.length} 张，可能超出当前客户端单篇上传能力，建议拆分为系列内容。仍可完整导出。`
  : summary.needsSeriesSuggestion
    ? `当前共 ${result.pages.length} 张，为了更好的滑动阅读体验，建议按章节拆成系列内容。仍可完整导出。`
    : '';
```

将 `xhsPageSummary` 加入 Vue 返回对象。

- [ ] **Step 5: 在工具栏展示分页结果**

在 `index.html` 的 `.xhs-toolbar` 内、“正在重新编排”之后增加：

```html
<span v-if="!xhsIsPaginating && xhsPages.length" class="xhs-page-count" aria-live="polite">
  {{ xhsPageSummary.label }}
</span>
```

`.xhs-page-count` 保持单行，在现有可横向滚动工具栏内不挤压下载按钮：

```css
.xhs-page-count {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 6: 运行页数摘要测试**

Run: `npx vitest run assets/scripts/xhs/__tests__/page-summary.test.js`

Expected: PASS。

### Task 6: 完整回归与真实浏览器验收

**Files:**
- Test: `assets/scripts/xhs/__tests__/*.test.js`
- Verify: `assets/scripts/xhs/constants.js`
- Verify: `assets/scripts/xhs/paginator.js`
- Verify: `assets/scripts/xhs/renderer.js`
- Verify: `assets/scripts/xhs/page-summary.js`
- Verify: `assets/scripts/main.js`
- Verify: `assets/styles/xhs.css`
- Verify: `index.html`

- [ ] **Step 1: 运行 XHS 定向测试**

Run: `npx vitest run assets/scripts/xhs/__tests__`

Expected: PASS，零失败。

- [ ] **Step 2: 运行全量测试**

Run: `npm test`

Expected: PASS，零失败。

- [ ] **Step 3: 启动本地页面并使用隔离浏览器会话**

Run: `python3 -m http.server 4173 --bind 127.0.0.1`

Run: `agent-browser --session xhs-reading-first open http://127.0.0.1:4173/index.html`

Expected: 页面标题为 `OpenGZH - 公众号 Markdown 编辑器`，控制台无模块加载错误。

- [ ] **Step 4: 验收 274 字纯文本样例**

把下列样例填入 `.markdown-input`，切换“图片”，等待 `.xhs-card-shell` 出现：

```markdown
# 为什么简单文章也值得认真排版

很多人以为，文章短就不需要结构。实际上，越短的内容越依赖清晰的观点和节奏。读者在几秒内决定是否继续阅读，标题、首段和重点句承担了大部分信息传递。

## 先给结论

短文章不等于随意写。先说明问题，再给出判断，最后补充一个可以立刻执行的动作，就足以形成完整表达。

## 怎么做

第一，删除重复背景，只保留读者做判断需要的信息。第二，把关键结论放在段首，不让读者猜。第三，用一个真实例子代替三段抽象解释。

完成后再读一遍：如果删掉一句不影响理解，就继续删；如果一页只剩一个标题或一句话，就应该和相邻内容合并。
```

读取：

```js
({
  cards: document.querySelectorAll('.xhs-card-shell .xhs-card').length,
  bodyFont: getComputedStyle(document.querySelector('.xhs-card[data-kind="content"]')).fontSize,
  overflow: Array.from(document.querySelectorAll('.xhs-card-body')).some(
    (body) => body.scrollHeight > body.clientHeight + 2 || body.scrollWidth > body.clientWidth + 2
  )
})
```

Expected: `{ cards: 2, bodyFont: '20px', overflow: false }`。

- [ ] **Step 5: 验收当前默认示例与页数摘要**

恢复默认文章，切换“图片”，等待分页完成后读取卡片数和 `.xhs-page-count`。

Expected:

- 标准档总卡片数 `<= 14`。
- 摘要分类之和等于总数。
- 没有仅含标题的自动分页正文页。
- 每个 `.xhs-card-body` 均无水平或垂直溢出。

- [ ] **Step 6: 验收五主题×三密度和导出回归**

依次选择五个主题和三个密度，对每个组合断言：

```bash
agent-browser --session xhs-reading-first find role button click --name '设置'
agent-browser --session xhs-reading-first select '#xhs-theme-select' 'minimal-white'
agent-browser --session xhs-reading-first find role button click --name '舒展'
agent-browser --session xhs-reading-first wait --fn "!document.body.innerText.includes('正在重新编排…')"
```

对 `minimal-white`、`editorial-magazine`、`warm-paper`、`dark-tech`、`bright-knowledge` 和“舒展/标准/紧凑”重复 `select` / `find role button click`，每次切换后重新读取 DOM。

- 正文字号分别为 `22px` / `20px` / `18px`。
- 所有卡片无溢出。
- 页码从封面计数，封面不显示页码。
- 单页导出仍为 1080×1440 PNG。
- ZIP 校验仍在字体、媒体、溢出或 CORS 问题时失败关闭，系列建议不阻断导出。

- [ ] **Step 7: 检查工作树边界**

Run: `git status --short`

Run: `git diff --check`

Expected: 无空白错误；除本计划列出的文件外没有因本实施新增的修改。任务开始前已存在的其他脏文件保持不动。

## 2. 完成定义

- 设计文档的每一项已确认契约都有对应实现或验收步骤。
- XHS 定向测试和全量 Vitest 通过。
- 274 字样例为 2 张，当前默认示例标准档不高于 14 张。
- 同一密度档内正文字号一致，不存在逐页自动缩字。
- 最终页模型按源顺序合并后没有文本丢失、重复或重排。
- 超过 12 张时有可理解、不阻断导出的系列建议，界面能解释页数组成。
- 五套主题、三档密度、手动分页、单页 PNG 和 ZIP 导出无回归。
