import { getDend2Titles } from '../../../src/core/browser/toys/2025-07-05/getDend2Titles.js';
import { describe, test, expect, jest } from '@jest/globals';

describe('getDend2Titles', () => {
  test('returns titles from TRAN1 stories', () => {
    const env = new Map([
      [
        'getData',
        () => ({
          temporary: {
            TRAN1: {
              stories: [
                { id: '1', title: 'First' },
                { id: '2', title: 'Second' },
              ],
            },
          },
        }),
      ],
    ]);
    const result = JSON.parse(getDend2Titles('ignored', env));
    expect(result).toEqual(['First', 'Second']);
  });

  test('returns titles from DEND2 stories (legacy fallback)', () => {
    const env = new Map([
      [
        'getData',
        () => ({
          temporary: {
            DEND2: {
              stories: [
                { id: '1', title: 'First' },
                { id: '2', title: 'Second' },
              ],
            },
          },
        }),
      ],
    ]);
    const result = JSON.parse(getDend2Titles('ignored', env));
    expect(result).toEqual(['First', 'Second']);
  });

  test('returns empty array when structure is missing', () => {
    const env = new Map([['getData', () => ({ temporary: {} })]]);
    expect(JSON.parse(getDend2Titles('x', env))).toEqual([]);
  });

  test('returns empty array when temporary exists but TRAN1 and DEND2 are missing', () => {
    const env = new Map([['getData', () => ({ temporary: { OTHER: {} } })]]);
    expect(JSON.parse(getDend2Titles('x', env))).toEqual([]);
  });

  test('returns empty array on error', () => {
    const env = new Map([
      [
        'getData',
        jest.fn(() => {
          throw new Error('fail');
        }),
      ],
    ]);
    expect(JSON.parse(getDend2Titles('x', env))).toEqual([]);
  });

  test('returns empty array when getData is missing', () => {
    const env = new Map();
    expect(JSON.parse(getDend2Titles('x', env))).toEqual([]);
  });
});
