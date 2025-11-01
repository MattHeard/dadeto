import { addDendritePage } from '../../../src/core/browser/toys/2025-07-05/addDendritePage.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('addDendritePage', () => {
  test('adds page and options to DEND2 storage', () => {
    const uuids = ['page', 'a', 'b'];
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
      optionId: 'choice',
      content: 'Body',
      firstOption: 'A',
      secondOption: 'B',
    });
    const result = JSON.parse(addDendritePage(input, env));
    expect(result).toEqual({
      pages: [{ id: 'page', optionId: 'choice', content: 'Body' }],
      options: [
        { id: 'a', pageId: 'page', content: 'A' },
        { id: 'b', pageId: 'page', content: 'B' },
      ],
    });
    expect(env.get('setLocalTemporaryData')).toHaveBeenCalledWith({
      temporary: {
        DEND2: {
          stories: [],
          pages: [{ id: 'page', optionId: 'choice', content: 'Body' }],
          options: [
            { id: 'a', pageId: 'page', content: 'A' },
            { id: 'b', pageId: 'page', content: 'B' },
          ],
        },
      },
    });
  });

  test('creates missing DEND2 structure', () => {
    const uuids = ['p'];
    let i = 0;
    const env = new Map([
      ['getData', () => ({})],
      ['setLocalTemporaryData', jest.fn()],
      ['getUuid', () => uuids[i++]],
    ]);
    const input = JSON.stringify({ optionId: 'o', content: 'c' });
    const result = JSON.parse(addDendritePage(input, env));
    expect(result.pages[0]).toEqual({ id: 'p', optionId: 'o', content: 'c' });
    expect(env.get('setLocalTemporaryData')).toHaveBeenCalledWith({
      temporary: {
        DEND2: {
          stories: [],
          pages: [{ id: 'p', optionId: 'o', content: 'c' }],
          options: [],
        },
      },
    });
  });

  test('repairs invalid DEND2 structure', () => {
    const uuids = ['p'];
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
    const input = JSON.stringify({ optionId: 'o', content: 'c' });
    addDendritePage(input, env);
    expect(env.get('setLocalTemporaryData')).toHaveBeenCalledWith({
      temporary: {
        DEND2: {
          stories: [],
          pages: [{ id: 'p', optionId: 'o', content: 'c' }],
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
    const result = addDendritePage('not json', env);
    expect(JSON.parse(result)).toEqual({ pages: [], options: [] });
    expect(env.get('setLocalTemporaryData')).not.toHaveBeenCalled();
  });

  test('returns empty arrays for invalid fields', () => {
    const env = new Map([
      ['getData', () => ({})],
      ['setLocalTemporaryData', jest.fn()],
      ['getUuid', () => 'id'],
    ]);
    const bad = JSON.stringify({ optionId: 1 });
    const result = addDendritePage(bad, env);
    expect(JSON.parse(result)).toEqual({ pages: [], options: [] });
    expect(env.get('setLocalTemporaryData')).not.toHaveBeenCalled();
  });

  test('returns empty arrays for null input', () => {
    const env = new Map([
      ['getData', () => ({})],
      ['setLocalTemporaryData', jest.fn()],
    ]);
    const result = addDendritePage('null', env);
    expect(JSON.parse(result)).toEqual({ pages: [], options: [] });
    expect(env.get('setLocalTemporaryData')).not.toHaveBeenCalled();
  });

  test('returns empty arrays for invalid content', () => {
    const env = new Map([
      ['getData', () => ({})],
      ['setLocalTemporaryData', jest.fn()],
      ['getUuid', () => 'id'],
    ]);
    const bad = JSON.stringify({ optionId: 'o', content: 1 });
    const result = addDendritePage(bad, env);
    expect(JSON.parse(result)).toEqual({ pages: [], options: [] });
    expect(env.get('setLocalTemporaryData')).not.toHaveBeenCalled();
  });
});
