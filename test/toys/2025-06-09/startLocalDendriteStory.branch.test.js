import { startLocalDendriteStory } from '../../../src/core/browser/toys/2025-06-09/startLocalDendriteStory.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('startLocalDendriteStory missing temporary', () => {
  test('creates temporary structure when absent', () => {
    const env = new Map([
      ['getUuid', () => 'id-1'],
      ['getData', () => ({})],
      ['setLocalTemporaryData', jest.fn()],
    ]);
    const inputObj = { title: 't', content: 'c' };
    const output = JSON.parse(
      startLocalDendriteStory(JSON.stringify(inputObj), env)
    );
    const expected = { id: 'id-1', title: 't', content: 'c', options: [] };
    expect(output).toEqual(expected);
    expect(env.get('setLocalTemporaryData')).toHaveBeenCalledWith({
      temporary: { STAR1: [expected] },
    });
  });

  test('overwrites non-object temporary value', () => {
    const env = new Map([
      ['getUuid', () => 'id-2'],
      ['getData', () => ({ temporary: 42 })],
      ['setLocalTemporaryData', jest.fn()],
    ]);
    const output = JSON.parse(
      startLocalDendriteStory('{"title":"x","content":"y"}', env)
    );
    const expected = { id: 'id-2', title: 'x', content: 'y', options: [] };
    expect(output).toEqual(expected);
    expect(env.get('setLocalTemporaryData')).toHaveBeenCalledWith({
      temporary: { STAR1: [expected] },
    });
  });
});
