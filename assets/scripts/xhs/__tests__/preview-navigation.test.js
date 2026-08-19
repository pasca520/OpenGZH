import { describe, expect, it } from 'vitest';
import * as previewNavigation from '../preview-navigation.js';

const {
  normalizeXhsPreviewMode,
  resolveXhsPageSelection,
  stepXhsPageSelection
} = previewNavigation;

const pages = [{ id: 'cover' }, { id: 'page-1' }, { id: 'page-2' }];

describe('xhs preview navigation', () => {
  it('defaults unknown values to horizontal review', () => {
    expect(normalizeXhsPreviewMode()).toBe('horizontal');
    expect(normalizeXhsPreviewMode('unknown')).toBe('horizontal');
    expect(normalizeXhsPreviewMode('vertical')).toBe('vertical');
  });

  it('keeps the selected id when it still exists', () => {
    expect(resolveXhsPageSelection(pages, 'page-1', 0)).toEqual({ page: pages[1], index: 1 });
  });

  it('clamps the previous index when an id disappears', () => {
    expect(resolveXhsPageSelection(pages.slice(0, 2), 'removed', 8)).toEqual({ page: pages[1], index: 1 });
    expect(resolveXhsPageSelection([], 'removed', 8)).toEqual({ page: null, index: -1 });
  });

  it('steps without wrapping at either edge', () => {
    expect(stepXhsPageSelection(pages, 'cover', -1)).toEqual({ page: pages[0], index: 0 });
    expect(stepXhsPageSelection(pages, 'page-1', 1)).toEqual({ page: pages[2], index: 2 });
    expect(stepXhsPageSelection(pages, 'page-2', 1)).toEqual({ page: pages[2], index: 2 });
  });

  it('fits horizontal cards to both the available width and height', () => {
    expect(previewNavigation.calculateXhsPreviewScale({
      mode: 'horizontal',
      containerWidth: 650,
      containerHeight: 560,
      reservedWidth: 112,
      reservedHeight: 44
    })).toBeCloseTo(516 / 720, 5);

    expect(previewNavigation.calculateXhsPreviewScale({
      mode: 'vertical',
      containerWidth: 380,
      containerHeight: 300,
      reservedWidth: 32,
      reservedHeight: 44
    })).toBeCloseTo(348 / 540, 5);
  });
});
