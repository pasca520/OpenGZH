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
