import { sanitizeUrl } from '../../../src/core/browser/url.js';

describe('sanitizeUrl', () => {
  test('keeps the origin and pathname for a valid URL', () => {
    expect(
      sanitizeUrl('https://example.test/story.html?token=secret#fragment')
    ).toBe('https://example.test/story.html');
  });

  test('returns an empty string for an invalid URL', () => {
    expect(sanitizeUrl('not a URL')).toBe('');
  });

  test('parses valid URLs when URL.canParse is unavailable', () => {
    const originalCanParse = URL.canParse;
    Object.defineProperty(URL, 'canParse', {
      configurable: true,
      value: undefined,
    });
    try {
      expect(sanitizeUrl('https://example.test/fallback')).toBe(
        'https://example.test/fallback'
      );
    } finally {
      Object.defineProperty(URL, 'canParse', {
        configurable: true,
        value: originalCanParse,
      });
    }
  });
});
