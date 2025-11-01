import { describe, test, expect } from '@jest/globals';
import { httpRequest } from '../../../src/core/browser/toys/2025-04-05/httpRequest.js';

describe('httpRequest', () => {
  test('returns correct JSON for a basic URL', () => {
    const inputUrl = 'https://example.com';
    const result = httpRequest(inputUrl);
    const parsed = JSON.parse(result);
    expect(parsed).toHaveProperty('request');
    expect(parsed.request).toHaveProperty('url', inputUrl);
  });

  test('handles URLs with query parameters', () => {
    const inputUrl = 'https://example.com/search?q=chatgpt';
    const result = httpRequest(inputUrl);
    const parsed = JSON.parse(result);
    expect(parsed.request.url).toBe(inputUrl);
  });

  test('returns a stringified JSON object', () => {
    const inputUrl = 'https://api.service.com/data';
    const result = httpRequest(inputUrl);
    expect(typeof result).toBe('string');
    expect(() => JSON.parse(result)).not.toThrow();
  });

  test('contains only the expected structure', () => {
    const inputUrl = 'https://example.com';
    const result = httpRequest(inputUrl);
    const parsed = JSON.parse(result);
    expect(Object.keys(parsed)).toEqual(['request']);
    expect(Object.keys(parsed.request)).toEqual(['url']);
  });

  test('throws or handles invalid URLs gracefully', () => {
    const inputUrl = 'not a url';
    const result = httpRequest(inputUrl);
    const parsed = JSON.parse(result);
    expect(parsed.request.url).toBe(inputUrl);
  });
});
