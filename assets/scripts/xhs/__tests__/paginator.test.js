import { describe, expect, it } from 'vitest';
import { paginateXhsDocument } from '../paginator.js';

const settings = {
  themeId: 'minimal-white', density: 'standard', tocEnabled: false,
  footer: { authorEnabled: true },
  cover: { titleOverride: '', summaryOverride: '', author: '', imageRef: null, focalPoint: { x: 50, y: 50 } }
};
let nextOffset = 0;
function block(type, units = 1, data = {}) {
  const sourceStart = nextOffset;
  nextOffset += 10;
  return {
    id: `${type}-${sourceStart}`, type, sourceStart, sourceEnd: nextOffset,
    html: type === 'page-break' ? '' : `<p>${type}</p>`, text: type, data: { ...data, units }
  };
}
function docFromIds(ids) {
  nextOffset = 0;
  return {
    meta: { title: 'T', summary: 'S' }, headings: [], images: [],
    blocks: ids.map((id) => ({ ...block('paragraph', 1), id }))
  };
}
const fitsThreeUnits = (blocks) => blocks.reduce((sum, block) => sum + (block.data.units || 1), 0) <= 3;
const measureThreeUnits = async (blocks) => {
  const usedHeight = blocks.reduce((sum, item) => sum + (item.data.units || 1), 0);
  return {
    fits: usedHeight <= 3,
    usedHeight,
    availableHeight: 3,
    fillRatio: usedHeight / 3
  };
};

describe('xhs paginator', () => {
  it('honors manual breaks and keeps heading with following content', async () => {
    nextOffset = 0;
    const blocks = [
      block('paragraph', 1),
      block('page-break', 0),
      block('heading', 1, { level: 2 }),
      block('paragraph', 2)
    ];
    const pages = await paginateXhsDocument({ meta: { title: 'T', summary: 'S' }, blocks, headings: [] }, settings, { fits: fitsThreeUnits });
    expect(pages[0].kind).toBe('cover');
    expect(pages[1].blocks.map((item) => item.type)).toEqual(['paragraph']);
    expect(pages[2].blocks.map((item) => item.type)).toEqual(['heading', 'paragraph']);
    expect(pages[2].manualBreakBefore).toBe(true);
  });

  it('never drops or reorders source content', async () => {
    const sourceIds = ['a', 'b', 'c', 'd'];
    const pages = await paginateXhsDocument(docFromIds(sourceIds), settings, { fits: fitsThreeUnits });
    expect(pages.flatMap((page) => page.blocks).map((block) => block.id)).toEqual(sourceIds);
  });

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
    expect(content.flatMap((page) => page.blocks).map((item) => item.id)).toEqual(blocks.map((item) => item.id));
  });

  it('handles empty markdown and a document with only an h1', async () => {
    const empty = await paginateXhsDocument({ meta: { title: '', summary: '' }, blocks: [], headings: [] }, settings, { fits: fitsThreeUnits });
    expect(empty.map((page) => page.kind)).toEqual(['cover']);
    const h1Only = await paginateXhsDocument({ meta: { title: 'T' }, blocks: [], headings: [] }, settings, { fits: fitsThreeUnits });
    expect(h1Only.map((page) => page.kind)).toEqual(['cover']);
  });

  it('collapses consecutive markers into one boundary and ignores trailing markers', async () => {
    nextOffset = 0;
    const blocks = [
      block('page-break', 0),
      block('page-break', 0),
      block('paragraph', 1),
      block('page-break', 0)
    ];
    const pages = await paginateXhsDocument({ meta: { title: 'T', summary: 'S' }, blocks, headings: [] }, settings, { fits: fitsThreeUnits });
    expect(pages.map((page) => page.kind)).toEqual(['cover', 'content']);
    expect(pages[1].manualBreakBefore).toBe(true);
    expect(pages[1].manualBreakMarkerStart).toBe(blocks[0].sourceStart);
  });

  it('splits long paragraphs at sentence boundaries and numbers the parts', async () => {
    const text = '第一句。第二句！第三句？第四句；第五句。';
    const longBlock = block('paragraph', 99, {});
    longBlock.text = text;
    longBlock.html = `<p>${text}</p>`;
    const pages = await paginateXhsDocument({ meta: { title: 'T', summary: 'S' }, blocks: [longBlock], headings: [] }, settings, {
      fits: async (candidate) => {
        const total = candidate.reduce((sum, item) => sum + String(item.text || item.html).length, 0);
        return total <= 12;
      }
    });
    const chunks = pages.filter((page) => page.kind === 'content').flatMap((page) => page.blocks);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.text).join('')).toBe(text);
    expect(chunks.every((chunk) => chunk.data.partTotal === chunks.length)).toBe(true);
    expect(chunks.map((chunk) => chunk.data.partIndex)).toEqual(chunks.map((_, index) => index + 1));
  });

  it('preserves whitespace between sentences when splitting a paragraph', async () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const longBlock = block('paragraph', 99, {});
    longBlock.text = text;
    longBlock.html = `<p>${text}</p>`;
    const pages = await paginateXhsDocument(
      { meta: { title: 'T', summary: 'S' }, blocks: [longBlock], headings: [] },
      settings,
      { fits: async (candidate) => candidate.every((item) => String(item.text || '').length <= 20) }
    );
    const chunks = pages.filter((page) => page.kind === 'content').flatMap((page) => page.blocks);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.text).join('')).toBe(text);
  });

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
    expect(content.flatMap((page) => page.blocks)
      .filter((item) => item.id.startsWith(paragraph.id))
      .map((item) => item.text).join('')).toBe(paragraph.text);
  });

  it('keeps a heading with a sentence while using the current page remainder', async () => {
    nextOffset = 0;
    const lead = block('paragraph', 1);
    const heading = block('heading', 1, { level: 2 });
    const paragraph = block('paragraph', 2);
    paragraph.text = '第一句。第二句。';
    paragraph.html = `<p>${paragraph.text}</p>`;
    const fits = async (candidate) => candidate.reduce((sum, item) => {
      if (item.id === lead.id || item.id === heading.id) return sum + 1;
      return sum + (item.text.match(/[。！？；]/g)?.length || 1);
    }, 0) <= 3;

    const pages = await paginateXhsDocument(
      { meta: { title: 'T', summary: 'S' }, blocks: [lead, heading, paragraph], headings: [] },
      settings,
      { fits }
    );
    const content = pages.filter((page) => page.kind === 'content');
    expect(content[0].blocks.map((item) => item.type)).toEqual(['paragraph', 'heading', 'paragraph']);
    expect(content[0].blocks.at(-1).text).toBe('第一句。');
    expect(content[1].blocks[0].text).toBe('第二句。');
  });

  it('splits tables by rows and repeats headers on every chunk', async () => {
    const tableBlock = block('table', 99, { headers: ['a', 'b'], rows: Array.from({ length: 5 }, (_, i) => [`r${i}a`, `r${i}b`]) });
    const pages = await paginateXhsDocument({ meta: { title: 'T', summary: 'S' }, blocks: [tableBlock], headings: [] }, settings, {
      fits: async (candidate) => {
        const table = candidate.find((item) => item.type === 'table');
        return !table || (table.data.rows || []).length <= 2;
      }
    });
    const chunks = pages.filter((page) => page.kind === 'content').flatMap((page) => page.blocks);
    expect(chunks.length).toBe(3);
    expect(chunks.reduce((sum, chunk) => sum + chunk.data.rows.length, 0)).toBe(5);
    expect(chunks.every((chunk) => JSON.stringify(chunk.data.headers) === JSON.stringify(['a', 'b']))).toBe(true);
  });

  it('keeps code line numbers continuous across chunks', async () => {
    const codeBlock = block('code', 99, { language: 'py', lines: Array.from({ length: 6 }, (_, i) => `line ${i}`), startLineNumber: 1 });
    const pages = await paginateXhsDocument({ meta: { title: 'T', summary: 'S' }, blocks: [codeBlock], headings: [] }, settings, {
      fits: async (candidate) => {
        const code = candidate.find((item) => item.type === 'code');
        return !code || (code.data.lines || []).length <= 2;
      }
    });
    const chunks = pages.filter((page) => page.kind === 'content').flatMap((page) => page.blocks);
    expect(chunks.reduce((sum, chunk) => sum + chunk.data.lines.length, 0)).toBe(6);
    const starts = chunks.map((chunk) => chunk.data.startLineNumber);
    expect(starts).toEqual([1, 3, 5]);
    expect(chunks.every((chunk) => chunk.data.language === 'py')).toBe(true);
  });

  it('puts an oversized image on its own page and errors on truly unbreakable blocks', async () => {
    const imageBlock = block('image', 2, { images: [{ src: 'img://x', alt: '' }] });
    const pages = await paginateXhsDocument({ meta: { title: 'T', summary: 'S' }, blocks: [imageBlock], headings: [] }, settings, { fits: fitsThreeUnits });
    expect(pages[1].variant).toBe('image');
    await expect(paginateXhsDocument({ meta: { title: 'T', summary: 'S' }, blocks: [block('formula', 99, { display: true })], headings: [] }, settings, { fits: fitsThreeUnits }))
      .rejects.toMatchObject({ code: 'unbreakable-block' });
  });

  it('splits a multi-image block into one image per card when only a single image fits', async () => {
    const imageBlock = block('image', 9, { images: Array.from({ length: 3 }, (_, i) => ({ src: `img://i${i}`, alt: '' })) });
    const pages = await paginateXhsDocument({ meta: { title: 'T', summary: 'S' }, blocks: [imageBlock], headings: [] }, settings, {
      fits: async (candidate) => {
        const image = candidate.find((item) => item.type === 'image');
        return !image || (image.data.images || []).length <= 1;
      }
    });
    const chunks = pages.filter((page) => page.kind === 'content').flatMap((page) => page.blocks);
    expect(chunks.map((chunk) => chunk.data.images.map((image) => image.src))).toEqual([['img://i0'], ['img://i1'], ['img://i2']]);
    expect(chunks.every((chunk) => chunk.data.partTotal === chunks.length)).toBe(true);
    expect(chunks.map((chunk) => chunk.data.partIndex)).toEqual([1, 2, 3]);
  });

  it('adds a toc page only when enabled without touching source order', async () => {
    nextOffset = 0;
    const blocks = [block('heading', 1, { level: 2 }), block('paragraph', 1), block('heading', 1, { level: 2 }), block('paragraph', 1)];
    const headings = blocks.filter((item) => item.type === 'heading').map((item) => ({ text: item.text, level: 2, sourceStart: item.sourceStart }));
    const without = await paginateXhsDocument({ meta: { title: 'T', summary: 'S' }, blocks, headings }, settings, { fits: fitsThreeUnits });
    expect(without.map((page) => page.kind)).toEqual(['cover', 'content', 'content']);
    const withToc = await paginateXhsDocument({ meta: { title: 'T', summary: 'S' }, blocks, headings }, { ...settings, tocEnabled: true }, { fits: fitsThreeUnits });
    expect(withToc.map((page) => page.kind)).toEqual(['cover', 'toc', 'content', 'content']);
    expect(withToc[1].blocks.map((item) => item.text)).toEqual(['heading', 'heading']);
    const bodyIds = withToc.filter((page) => page.kind === 'content').flatMap((page) => page.blocks).map((item) => item.id);
    expect(bodyIds).toEqual(without.filter((page) => page.kind === 'content').flatMap((page) => page.blocks).map((item) => item.id));
  });

  it('assigns page numbers matching array indexes from the cover', async () => {
    const pages = await paginateXhsDocument(docFromIds(['a', 'b', 'c', 'd', 'e']), settings, { fits: fitsThreeUnits });
    pages.forEach((page, index) => {
      expect(page.pageNumber).toBe(index + 1);
      expect(page.totalPages).toBe(pages.length);
    });
    expect(pages[1].pageNumber).toBe(2);
  });
});
