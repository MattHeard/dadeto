import { transformDendriteStory } from '../../../src/core/browser/toys/2025-07-04/transformDendriteStory.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('transformDendriteStory', () => {
  test('transforms and stores story data', () => {
    const uuids = ['story', 'page', 'a', 'b'];
    let idx = 0;
    const env = new Map([
      [
        'getData',
        () => ({
          temporary: { DEND2: { stories: [], pages: [], options: [] } },
        }),
      ],
      ['setLocalTemporaryData', jest.fn()],
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
      pages: [{ id: 'page', storyId: 'story', content: 'Body' }],
      options: [
        { id: 'a', pageId: 'page', content: 'A' },
        { id: 'b', pageId: 'page', content: 'B' },
      ],
    });
    expect(env.get('setLocalTemporaryData')).toHaveBeenCalledWith(
      expect.objectContaining({
        temporary: expect.objectContaining({
          TRAN1: {
            stories: [{ id: 'story', title: 'Title' }],
            pages: [{ id: 'page', storyId: 'story', content: 'Body' }],
            options: [
              { id: 'a', pageId: 'page', content: 'A' },
              { id: 'b', pageId: 'page', content: 'B' },
            ],
          },
        }),
      })
    );
  });

  test('creates missing DEND2 structure', () => {
    const uuids = ['s', 'p'];
    let i = 0;
    const env = new Map([
      ['getData', () => ({})],
      ['setLocalTemporaryData', jest.fn()],
      ['getUuid', () => uuids[i++]],
    ]);
    const input = JSON.stringify({ title: 't', content: 'c' });
    const result = JSON.parse(transformDendriteStory(input, env));
    expect(result.stories[0]).toEqual({ id: 's', title: 't' });
    expect(env.get('setLocalTemporaryData')).toHaveBeenCalledWith({
      temporary: {
        TRAN1: {
          stories: [{ id: 's', title: 't' }],
          pages: [{ id: 'p', storyId: 's', content: 'c' }],
          options: [],
        },
      },
    });
  });

  test('returns empty arrays on parse error', () => {
    const env = new Map([
      ['getData', () => ({})],
      ['setLocalTemporaryData', jest.fn()],
    ]);
    const result = transformDendriteStory('not json', env);
    expect(JSON.parse(result)).toEqual({ stories: [], pages: [], options: [] });
    expect(env.get('setLocalTemporaryData')).not.toHaveBeenCalled();
  });
  test('repairs invalid DEND2 structure', () => {
    const uuids = ['s', 'p'];
    const env = new Map([
      [
        'getData',
        () => ({
          temporary: { DEND2: { stories: {}, pages: null, options: 1 } },
        }),
      ],
      ['setLocalTemporaryData', jest.fn()],
      ['getUuid', () => uuids.shift()],
    ]);
    const input = JSON.stringify({ title: 'title', content: 'body' });
    transformDendriteStory(input, env);
    expect(env.get('setLocalTemporaryData')).toHaveBeenCalledWith({
      temporary: {
        TRAN1: {
          stories: [{ id: 's', title: 'title' }],
          pages: [{ id: 'p', storyId: 's', content: 'body' }],
          options: [],
        },
      },
    });
  });

  test('returns empty arrays for invalid fields', () => {
    const env = new Map([
      ['getData', () => ({})],
      ['setLocalTemporaryData', jest.fn()],
      ['getUuid', () => 'id'],
    ]);
    const bad = JSON.stringify({ title: 1 });
    const result = transformDendriteStory(bad, env);
    expect(JSON.parse(result)).toEqual({ stories: [], pages: [], options: [] });
    expect(env.get('setLocalTemporaryData')).not.toHaveBeenCalled();
  });

  test('returns empty arrays for null input', () => {
    const env = new Map([
      ['getData', () => ({})],
      ['setLocalTemporaryData', jest.fn()],
    ]);
    const result = transformDendriteStory('null', env);
    expect(JSON.parse(result)).toEqual({ stories: [], pages: [], options: [] });
    expect(env.get('setLocalTemporaryData')).not.toHaveBeenCalled();
  });

  test('returns empty arrays for invalid content', () => {
    const env = new Map([
      ['getData', () => ({})],
      ['setLocalTemporaryData', jest.fn()],
      ['getUuid', () => 'id'],
    ]);
    const bad = JSON.stringify({ title: 'ok', content: 1 });
    const result = transformDendriteStory(bad, env);
    expect(JSON.parse(result)).toEqual({ stories: [], pages: [], options: [] });
    expect(env.get('setLocalTemporaryData')).not.toHaveBeenCalled();
  });
});
