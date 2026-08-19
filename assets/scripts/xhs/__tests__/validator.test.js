import { expect, it } from 'vitest';
import {
  XHS_MIN_BODY_FONT,
  contrastRatio,
  parseCssColor,
  validateXhsCard,
  validateXhsSet
} from '../validator.js';

it('accepts the 18px logical body-size floor used by dense cards', () => {
  expect(XHS_MIN_BODY_FONT).toBe(18);
});

it('reports page-scoped overflow, font, media and contrast issues', async () => {
  const snapshot = {
    body: { scrollWidth: 541, clientWidth: 540, scrollHeight: 600, clientHeight: 600 },
    outOfBoundsBlockIds: [], minimumFont: { size: 12, kind: 'body', blockId: 'p-1' },
    contrastFailures: [{ ratio: 2.1, blockId: 'p-1' }], mediaFailures: [{ blockId: 'img-1' }],
    fontsReady: true
  };
  const issues = await validateXhsCard({}, 2, { inspectCard: async () => snapshot });
  expect(issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
    'overflow-x', 'font-too-small', 'contrast', 'media-not-ready'
  ]));
  expect(issues.every((issue) => issue.pageIndex === 2)).toBe(true);
});

it('blocks a set when any page fails but preserves valid page indexes', async () => {
  const cards = [{ invalid: false }, { invalid: true }];
  const result = await validateXhsSet(cards, {
    validateCard: async (card, pageIndex) => card.invalid
      ? [{ code: 'overflow-y', pageIndex, message: '第 2 页溢出', blockId: 'p-2' }]
      : []
  });
  expect(result.ok).toBe(false);
  expect(result.validPageIndexes).toEqual([0]);
});

it('reports font-not-ready and unbreakable formulas', async () => {
  const issues = await validateXhsCard({}, 4, {
    inspectCard: async () => ({
      body: { scrollWidth: 540, clientWidth: 540, scrollHeight: 700, clientHeight: 700 },
      outOfBoundsBlockIds: [], minimumFont: { size: 20, kind: 'body', blockId: 'p-1' },
      contrastFailures: [], mediaFailures: [],
      fontsReady: false,
      formulaFailures: [{ blockId: 'f-1' }]
    })
  });
  const codes = issues.map((issue) => issue.code);
  expect(codes).toContain('font-not-ready');
  expect(codes).toContain('unbreakable-block');
});

it('parses hex and rgb colors and computes wcag ratios', () => {
  expect(parseCssColor('#171717')).toEqual({ r: 23, g: 23, b: 23, a: 1 });
  expect(parseCssColor('rgb(255, 255, 255)')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  expect(parseCssColor('rgba(0, 0, 0, 0.5)')).toEqual({ r: 0, g: 0, b: 0, a: 0.5 });
  expect(parseCssColor('nonsense')).toBeNull();
  expect(contrastRatio('#000000', '#ffffff')).toBeGreaterThan(20);
  expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 1);
});

it('produces actionable chinese messages with page numbers', async () => {
  const issues = await validateXhsCard({}, 6, {
    inspectCard: async () => ({
      body: { scrollWidth: 541, clientWidth: 540, scrollHeight: 700, clientHeight: 700 },
      outOfBoundsBlockIds: ['b-1'], minimumFont: { size: 12, kind: 'body', blockId: 'p-1' },
      contrastFailures: [{ ratio: 2.1, blockId: 'p-1' }],
      mediaFailures: [{ blockId: 'img-1' }], fontsReady: true
    })
  });
  const overflow = issues.find((issue) => issue.code === 'unsafe-area');
  expect(overflow.message).toContain('第 7 页');
  expect(overflow.message).toContain('插入分页点');
  const remote = issues.find((issue) => issue.code === 'media-not-ready');
  expect(remote.message).toContain('第 7 页');
  expect(remote.message).toContain('重新导入');
});
