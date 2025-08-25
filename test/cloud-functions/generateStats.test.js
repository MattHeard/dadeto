import {
  buildHtml,
  getPageCount,
  getUnmoderatedPageCount,
  getTopStories,
} from '../../infra/cloud-functions/generate-stats/index.js';

describe('generate stats helpers', () => {
  test('buildHtml outputs counts', () => {
    const html = buildHtml(1, 2, 3);
    expect(html).toContain('<p>Number of stories: 1</p>');
    expect(html).toContain('<p>Number of pages: 2</p>');
    expect(html).toContain('<p>Number of unmoderated pages: 3</p>');
  });

  test('buildHtml includes favicon link', () => {
    const html = buildHtml(0, 0, 0);
    expect(html).toContain('<link rel="icon" href="/favicon.ico" />');
  });

  test('buildHtml embeds top stories', () => {
    const html = buildHtml(0, 0, 0, [
      { title: 'Story A', variantCount: 2 },
      { title: 'Story B', variantCount: 1 },
    ]);
    expect(html).toContain('d3-sankey');
    expect(html).toContain('sankeyLinkHorizontal');
    expect(html).toContain('rotate(90) scale(-1,1)');
    expect(html).toContain('var(--link)');
    expect(html).toContain('Story A');
  });

  test('getPageCount returns page count', async () => {
    const mockDb = {
      collectionGroup: () => ({
        count: () => ({
          get: () => Promise.resolve({ data: () => ({ count: 5 }) }),
        }),
      }),
    };
    await expect(getPageCount(mockDb)).resolves.toBe(5);
  });

  test('getUnmoderatedPageCount sums zero and null counts', async () => {
    const mockDb = {
      collectionGroup: () => ({
        where: (_field, _op, value) => ({
          count: () => ({
            get: () =>
              Promise.resolve({
                data: () => ({ count: value === 0 ? 2 : 3 }),
              }),
          }),
        }),
      }),
    };
    await expect(getUnmoderatedPageCount(mockDb)).resolves.toBe(5);
  });

  test('getTopStories returns sorted stories', async () => {
    const statsDocs = [
      { id: 's1', data: () => ({ variantCount: 3 }) },
      { id: 's2', data: () => ({ variantCount: 2 }) },
    ];
    const mockDb = {
      collection: name => {
        if (name === 'storyStats') {
          return {
            orderBy: () => ({
              limit: () => ({
                get: () => Promise.resolve({ docs: statsDocs }),
              }),
            }),
          };
        }
        return {
          doc: id => ({
            get: () =>
              Promise.resolve({
                data: () => ({ title: `Title ${id}` }),
              }),
          }),
        };
      },
    };
    await expect(getTopStories(mockDb)).resolves.toEqual([
      { title: 'Title s1', variantCount: 3 },
      { title: 'Title s2', variantCount: 2 },
    ]);
  });
});
