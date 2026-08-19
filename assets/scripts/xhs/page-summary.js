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
