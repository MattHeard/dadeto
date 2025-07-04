import { transformDendriteStory } from '../../../src/toys/2025-07-04/transformDendriteStory.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('transformDendriteStory', () => {
  test('transforms and stores story data', () => {
    const env = new Map([
      [
        'getData',
        () => ({
          temporary: { DEND2: { stories: [], pages: [], options: [] } },
        }),
      ],
      ['setData', jest.fn()],
    ]);
    const input = JSON.stringify({
      id: 's1',
      title: 'Title',
      content: 'Body',
      options: [
        { id: 'o1', content: 'A' },
        { id: 'o2', content: 'B' },
      ],
    });
    const result = transformDendriteStory(input, env);
    expect(result).toEqual({
      stories: [{ id: 's1', title: 'Title' }],
      pages: [{ id: 's1', storyId: 's1', content: 'Body' }],
      options: [
        { id: 'o1', pageId: 's1', content: 'A' },
        { id: 'o2', pageId: 's1', content: 'B' },
      ],
    });
    expect(env.get('setData')).toHaveBeenCalledWith({
      temporary: {
        DEND2: {
          stories: [{ id: 's1', title: 'Title' }],
          pages: [{ id: 's1', storyId: 's1', content: 'Body' }],
          options: [
            { id: 'o1', pageId: 's1', content: 'A' },
            { id: 'o2', pageId: 's1', content: 'B' },
          ],
        },
      },
    });
  });

  test('creates missing DEND2 structure', () => {
    const env = new Map([
      ['getData', () => ({})],
      ['setData', jest.fn()],
    ]);
    const input = JSON.stringify({
      id: 'a',
      title: 't',
      content: 'c',
      options: [],
    });
    const result = transformDendriteStory(input, env);
    expect(result.stories[0]).toEqual({ id: 'a', title: 't' });
    expect(env.get('setData')).toHaveBeenCalledWith({
      temporary: {
        DEND2: {
          stories: [{ id: 'a', title: 't' }],
          pages: [{ id: 'a', storyId: 'a', content: 'c' }],
          options: [],
        },
      },
    });
  });

  test('returns empty arrays on parse error', () => {
    const env = new Map([
      ['getData', () => ({})],
      ['setData', jest.fn()],
    ]);
    const result = transformDendriteStory('not json', env);
    expect(result).toEqual({ stories: [], pages: [], options: [] });
    expect(env.get('setData')).not.toHaveBeenCalled();
  });
  test('repairs invalid DEND2 structure', () => {
    const env = new Map([
      [
        'getData',
        () => ({
          temporary: { DEND2: { stories: {}, pages: null, options: 1 } },
        }),
      ],
      ['setData', jest.fn()],
    ]);
    const input = JSON.stringify({
      id: 'b',
      title: 'title',
      content: 'body',
      options: [],
    });
    transformDendriteStory(input, env);
    expect(env.get('setData')).toHaveBeenCalledWith({
      temporary: {
        DEND2: {
          stories: [{ id: 'b', title: 'title' }],
          pages: [{ id: 'b', storyId: 'b', content: 'body' }],
          options: [],
        },
      },
    });
  });

  test('returns empty arrays for invalid fields', () => {
    const env = new Map([
      ['getData', () => ({})],
      ['setData', jest.fn()],
    ]);
    const bad = JSON.stringify({ id: 'c', title: 't' });
    const result = transformDendriteStory(bad, env);
    expect(result).toEqual({ stories: [], pages: [], options: [] });
    expect(env.get('setData')).not.toHaveBeenCalled();
  });
});
