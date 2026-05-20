import { normalizeObjectPrefix, objectKeyForPath } from '../../../docker/gcs-proxy/path.js';

describe('gcs proxy path mapping', () => {
  test('normalizes prefixes and maps directory URLs to index.html', () => {
    expect(normalizeObjectPrefix()).toBe('');
    expect(normalizeObjectPrefix('/t-123/')).toBe('t-123/');

    expect(objectKeyForPath('/', 't-123/')).toBe('t-123/index.html');
    expect(objectKeyForPath('/writer/', 't-123/')).toBe('t-123/writer/index.html');
    expect(objectKeyForPath('/new-page.html', 't-123/')).toBe('t-123/new-page.html');
  });
});
