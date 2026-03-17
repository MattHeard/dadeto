import { startLocalDendriteStory } from '../../../src/core/browser/toys/2025-06-09/startLocalDendriteStory.js';
import { test, expect, jest } from '@jest/globals';

test('startLocalDendriteStory replaces non-array DEND1', () => {
  const env = new Map([
    ['getUuid', () => 'id-1'],
    ['getData', () => ({ temporary: { DEND1: 42 } })],
    ['setLocalTemporaryData', jest.fn()],
  ]);
  const result = JSON.parse(
    startLocalDendriteStory('{"title":"t","content":"c"}', env)
  );

  expect(result.id).toBe('id-1');
  expect(result.title).toBe('t');
  expect(result.content).toBe('c');
  expect(result.options).toEqual([]);
  expect(env.get('setLocalTemporaryData')).toHaveBeenCalledWith({
    temporary: {
      STAR1: [
        {
          id: 'id-1',
          title: 't',
          content: 'c',
          options: [],
        },
      ],
    },
  });
});
