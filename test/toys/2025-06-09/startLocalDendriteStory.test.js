import { startLocalDendriteStory } from '../../../src/core/browser/toys/2025-06-09/startLocalDendriteStory.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('startLocalDendriteStory', () => {
  test('builds poll post from json string and stores it', () => {
    const uuids = ['id-post', 'id-a', 'id-b', 'id-c', 'id-d'];
    let idx = 0;
    const mockGetData = jest.fn(() => ({ temporary: {} }));
    const mockSetData = jest.fn();
    const env = new Map([
      ['getUuid', () => uuids[idx++]],
      ['getData', mockGetData],
      ['setLocalTemporaryData', mockSetData],
    ]);
    const inputObj = {
      title: 'Question',
      content: 'Choose wisely',
      firstOption: 'A',
      secondOption: 'B',
      thirdOption: 'C',
      fourthOption: 'D',
    };
    const input = JSON.stringify(inputObj);
    const output = JSON.parse(startLocalDendriteStory(input, env));
    expect(output).toEqual({
      id: 'id-post',
      title: 'Question',
      content: 'Choose wisely',
      options: [
        { id: 'id-a', content: 'A' },
        { id: 'id-b', content: 'B' },
        { id: 'id-c', content: 'C' },
        { id: 'id-d', content: 'D' },
      ],
    });
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining({ temporary: { STAR1: [output] } })
    );
  });

  test('skips empty options', () => {
    const uuids = ['id-main', 'id-a', 'id-b'];
    let idx = 0;
    const env = new Map([
      ['getUuid', () => uuids[idx++]],
      ['getData', () => ({ temporary: { DEND1: [] } })],
      ['setLocalTemporaryData', jest.fn()],
    ]);
    const inputObj = {
      title: 'Prompt',
      content: 'Pick',
      firstOption: 'X',
      secondOption: '',
      thirdOption: undefined,
      fourthOption: 'Y',
    };
    const output = JSON.parse(
      startLocalDendriteStory(JSON.stringify(inputObj), env)
    );
    expect(output.options).toEqual([
      { id: 'id-a', content: 'X' },
      { id: 'id-b', content: 'Y' },
    ]);
  });

  test('handles missing first and fourth options', () => {
    const uuids = ['id-main', 'id-a', 'id-b'];
    let idx = 0;
    const env = new Map([
      ['getUuid', () => uuids[idx++]],
      ['getData', () => ({ temporary: { DEND1: [] } })],
      ['setLocalTemporaryData', jest.fn()],
    ]);
    const inputObj = {
      title: 'Prompt2',
      content: 'Choose',
      secondOption: 'B',
      thirdOption: 'C',
    };
    const output = JSON.parse(
      startLocalDendriteStory(JSON.stringify(inputObj), env)
    );
    expect(output.options).toEqual([
      { id: 'id-a', content: 'B' },
      { id: 'id-b', content: 'C' },
    ]);
  });

  test('appends to existing temporary array', () => {
    const existing = { id: 'old', title: 'Old', content: 'Old', options: [] };
    const uuids = ['id-new', 'id-a', 'id-b'];
    let idx = 0;
    const env = new Map([
      ['getUuid', () => uuids[idx++]],
      ['getData', () => ({ temporary: { DEND1: [existing] } })],
      ['setLocalTemporaryData', jest.fn()],
    ]);

    const inputObj = {
      title: 'Title',
      content: 'Body',
      firstOption: 'A',
      secondOption: 'B',
    };
    const output = JSON.parse(
      startLocalDendriteStory(JSON.stringify(inputObj), env)
    );

    expect(env.get('setLocalTemporaryData')).toHaveBeenCalledWith(
      expect.objectContaining({
        temporary: expect.objectContaining({ STAR1: [existing, output] }),
      })
    );
  });

  test('appends to existing STAR1 array when STAR1 already present', () => {
    const existing = { id: 'old', title: 'Old', content: 'Old', options: [] };
    const uuids = ['id-new', 'id-a'];
    let idx = 0;
    const mockSetData = jest.fn();
    const env = new Map([
      ['getUuid', () => uuids[idx++]],
      ['getData', () => ({ temporary: { STAR1: [existing] } })],
      ['setLocalTemporaryData', mockSetData],
    ]);
    const inputObj = { title: 'New', content: 'Body', firstOption: 'A' };
    const output = JSON.parse(
      startLocalDendriteStory(JSON.stringify(inputObj), env)
    );
    expect(mockSetData).toHaveBeenCalledWith(
      expect.objectContaining({
        temporary: expect.objectContaining({ STAR1: [existing, output] }),
      })
    );
  });

  test('returns empty object string on parse error', () => {
    const mockSetData = jest.fn();
    const env = new Map([
      ['getData', () => ({})],
      ['setLocalTemporaryData', mockSetData],
    ]);
    const result = startLocalDendriteStory('not-json', env);
    expect(result).toBe(JSON.stringify({}));
    expect(mockSetData).not.toHaveBeenCalled();
  });
});
