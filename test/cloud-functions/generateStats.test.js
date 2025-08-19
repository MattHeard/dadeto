import {
  buildHtml,
  getPageCount,
  getUnmoderatedPageCount,
} from '../../infra/cloud-functions/generate-stats/index.js';

describe('generate stats helpers', () => {
  test('buildHtml outputs counts', () => {
    const html = buildHtml(1, 2, 3);
    expect(html).toContain('<p>Number of stories: 1</p>');
    expect(html).toContain('<p>Number of pages: 2</p>');
    expect(html).toContain('<p>Number of unmoderated pages: 3</p>');
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
});
