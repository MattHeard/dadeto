import { generateBlogKey } from '../../../src/core/browser/toys/2026-02-21/generateBlogKey.js';
import { describe, test, expect } from '@jest/globals';

describe('generateBlogKey', () => {
  test('returns first 4 letters uppercased with suffix 1 when no conflicts', () => {
    const input = JSON.stringify({
      title: 'German Sentence Splitter',
      existingKeys: [],
    });
    expect(generateBlogKey(input, new Map())).toBe(JSON.stringify('GERM1'));
  });

  test('increments suffix when prefix conflicts exist', () => {
    const input = JSON.stringify({
      title: 'German Sentence Splitter',
      existingKeys: ['GERM1'],
    });
    expect(generateBlogKey(input, new Map())).toBe(JSON.stringify('GERM2'));
  });

  test('skips multiple conflicts to find next available suffix', () => {
    const input = JSON.stringify({
      title: 'German Sentence Splitter',
      existingKeys: ['GERM1', 'GERM2', 'GERM3'],
    });
    expect(generateBlogKey(input, new Map())).toBe(JSON.stringify('GERM4'));
  });

  test('skips non-letter characters in title', () => {
    const input = JSON.stringify({ title: '+1 Annotator', existingKeys: [] });
    expect(generateBlogKey(input, new Map())).toBe(JSON.stringify('ANNO1'));
  });

  test('collects letters across word boundaries', () => {
    const input = JSON.stringify({
      title: 'Add Dendrite Page',
      existingKeys: [],
    });
    expect(generateBlogKey(input, new Map())).toBe(JSON.stringify('ADDD1'));
  });

  test('is case-insensitive when extracting prefix', () => {
    const input = JSON.stringify({
      title: 'text append list',
      existingKeys: [],
    });
    expect(generateBlogKey(input, new Map())).toBe(JSON.stringify('TEXT1'));
  });

  test('returns empty string when title has fewer than 4 letters', () => {
    const input = JSON.stringify({ title: 'Hi!', existingKeys: [] });
    expect(generateBlogKey(input, new Map())).toBe(JSON.stringify(''));
  });

  test('returns empty string when title is missing', () => {
    const input = JSON.stringify({ existingKeys: [] });
    expect(generateBlogKey(input, new Map())).toBe(JSON.stringify(''));
  });

  test('returns empty string on invalid JSON', () => {
    expect(generateBlogKey('not json', new Map())).toBe(JSON.stringify(''));
  });

  test('treats missing existingKeys as empty list', () => {
    const input = JSON.stringify({ title: 'UUID Generator' });
    expect(generateBlogKey(input, new Map())).toBe(JSON.stringify('UUID1'));
  });
});
