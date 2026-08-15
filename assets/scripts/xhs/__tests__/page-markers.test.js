import { describe, expect, it } from 'vitest';
import { insertPageMarker, removePageMarker, scanPageMarkers } from '../page-markers.js';

describe('xhs page markers', () => {
  it('inserts a line-safe marker at the cursor', () => {
    expect(insertPageMarker('第一段\n\n第二段', 3).markdown)
      .toBe('第一段\n\n<!-- xhs-page -->\n\n第二段');
  });

  it('does not duplicate an adjacent marker', () => {
    const md = '第一段\n\n<!-- xhs-page -->\n\n第二段';
    expect(insertPageMarker(md, md.indexOf('第二段')).markdown).toBe(md);
  });

  it('removes only the addressed marker and surrounding blank line', () => {
    const md = 'A\n\n<!-- xhs-page -->\n\nB\n\n<!-- xhs-page -->\n\nC';
    const second = scanPageMarkers(md)[1];
    expect(removePageMarker(md, second.start).markdown)
      .toBe('A\n\n<!-- xhs-page -->\n\nB\n\nC');
  });

  it('does not delete body characters for CRLF input', () => {
    const md = 'A\r\n\r\n<!-- xhs-page -->\r\n\r\nB';
    const markers = scanPageMarkers(md);
    expect(markers).toHaveLength(1);
    const result = removePageMarker(md, markers[0].start).markdown;
    expect(result).toContain('A');
    expect(result).toContain('B');
    expect(result).not.toContain('xhs-page');
  });
});
