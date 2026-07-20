import {
  parseArchivedPage,
  parseWaybackUrl,
} from '../../../scripts/import-wayback-story.js';

describe('Wayback story import helpers', () => {
  test('validates and preserves the capture timestamp', () => {
    expect(
      parseWaybackUrl(
        'https://web.archive.org/web/20240102123456id_/https://example.com/story'
      )
    ).toEqual({
      sourceUrl:
        'https://web.archive.org/web/20240102123456id_/https://example.com/story',
      timestamp: '20240102123456',
      originalUrl: 'https://example.com/story',
    });
    expect(() => parseWaybackUrl('https://example.com/story')).toThrow(
      'Wayback URL'
    );
  });

  test('extracts story metadata, options, and alternatives', () => {
    const record = parseArchivedPage(
      `
      <html><head><title>First page</title></head><body>
      <main><h1>First page</h1><p>Choose your way.</p>
      <p>By Ada Lovelace</p><a href="https://example.com/child">Continue onward</a>
      <a href="https://example.com/alt">Alternative variant</a></main>
      </body></html>`,
      'source',
      'https://example.com/story',
      '20240102123456'
    );
    expect(record).toMatchObject({
      title: 'First page',
      captureTimestamp: '20240102123456',
      status: 'complete',
    });
    expect(record.options).toEqual([
      { label: 'Continue onward', targetUrl: 'https://example.com/child' },
    ]);
    expect(record.alternatives).toEqual([
      { label: 'Alternative variant', targetUrl: 'https://example.com/alt' },
    ]);
  });
});
