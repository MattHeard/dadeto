import { startLocalDendriteStory } from '../../../src/toys/2025-06-09/startLocalDendriteStory.js';
import { test, expect, jest } from '@jest/globals';

test('startLocalDendriteStory appends to existing temporary array', () => {
  const existing = { id: 'old', title: 'Old', content: 'Old', options: [] };
  const uuids = ['id-new', 'id-a', 'id-b'];
  let idx = 0;
  const env = new Map([
    ['getUuid', () => uuids[idx++]],
    ['getData', () => ({ temporary: { DEND1: [existing] } })],
    ['setData', jest.fn()],
  ]);

  const inputObj = {
    title: 'Title',
    content: 'Body',
    firstOption: 'A',
    secondOption: 'B',
  };
  const output = JSON.parse(startLocalDendriteStory(JSON.stringify(inputObj), env));

  expect(env.get('setData')).toHaveBeenCalledWith({
    temporary: { DEND1: [existing, output] },
  });
});
