import { transformDendriteStory } from '../../../src/toys/2025-07-04/transformDendriteStory.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('transformDendriteStory', () => {
  test('transforms and stores story data', () => {
    const uuids = ['story', 'a', 'b'];
    let idx = 0;
    const env = new Map([
      [
        'getData',
        () => ({
          temporary: { DEND2: { stories: [], pages: [], options: [] } },
        }),
      ],
      ['setData', jest.fn()],
      ['getUuid', () => uuids[idx++]],
    ]);
    const input = JSON.stringify({
      title: 'Title',
      content: 'Body',
      firstOption: 'A',
      secondOption: 'B',
    });
    const result = JSON.parse(transformDendriteStory(input, env));
    expect(result).toEqual({
      stories: [{ id: 'story', title: 'Title' }],
      pages: [{ id: 'story', storyId: 'story', content: 'Body' }],
      options: [
        { id: 'a', pageId: 'story', content: 'A' },
        { id: 'b', pageId: 'story', content: 'B' },
      ],
    });
    expect(env.get('setData')).toHaveBeenCalledWith({
      temporary: {
        DEND2: {
          stories: [{ id: 'story', title: 'Title' }],
          pages: [{ id: 'story', storyId: 'story', content: 'Body' }],
          options: [
            { id: 'a', pageId: 'story', content: 'A' },
            { id: 'b', pageId: 'story', content: 'B' },
          ],
        },
      },
    });
  });

  test('creates missing DEND2 structure', () => {
    const env = new Map([
      ['getData', () => ({})],
      ['setData', jest.fn()],
      ['getUuid', () => 'id'],
    ]);
    const input = JSON.stringify({ title: 't', content: 'c' });
    const result = JSON.parse(transformDendriteStory(input, env));
    expect(result.stories[0]).toEqual({ id: 'id', title: 't' });
    expect(env.get('setData')).toHaveBeenCalledWith({
      temporary: {
        DEND2: {
          stories: [{ id: 'id', title: 't' }],
          pages: [{ id: 'id', storyId: 'id', content: 'c' }],
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
    expect(JSON.parse(result)).toEqual({ stories: [], pages: [], options: [] });
    expect(env.get('setData')).not.toHaveBeenCalled();
  });
  test('repairs invalid DEND2 structure', () => {
    const uuids = ['id'];
    const env = new Map([
      [
        'getData',
        () => ({
          temporary: { DEND2: { stories: {}, pages: null, options: 1 } },
        }),
      ],
      ['setData', jest.fn()],
      ['getUuid', () => uuids.shift()],
    ]);
    const input = JSON.stringify({ title: 'title', content: 'body' });
    transformDendriteStory(input, env);
    expect(env.get('setData')).toHaveBeenCalledWith({
      temporary: {
        DEND2: {
          stories: [{ id: 'id', title: 'title' }],
          pages: [{ id: 'id', storyId: 'id', content: 'body' }],
          options: [],
        },
      },
    });
  });

  test('returns empty arrays for invalid fields', () => {
    const env = new Map([
      ['getData', () => ({})],
      ['setData', jest.fn()],
      ['getUuid', () => 'id'],
    ]);
    const bad = JSON.stringify({ title: 1 });
    const result = transformDendriteStory(bad, env);
    expect(JSON.parse(result)).toEqual({ stories: [], pages: [], options: [] });
    expect(env.get('setData')).not.toHaveBeenCalled();
  });
});
