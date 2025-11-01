import { describe, test, expect } from '@jest/globals';
import { cyberpunkAdventure } from '../../../src/core/browser/toys/2025-03-30/cyberpunkAdventure.js';

describe('cyberpunkAdventure input trimming', () => {
  test('trims whitespace around commands', () => {
    let tempData = {};
    const env = new Map([
      ['getRandomNumber', () => 0.5],
      ['getCurrentTime', () => '00:00'],
      ['getData', () => ({ temporary: { CYBE1: tempData } })],
      [
        'setLocalTemporaryData',
        data => {
          tempData = { ...tempData, ...data.temporary?.CYBE1 };
        },
      ],
    ]);

    cyberpunkAdventure('Blaze', env);
    const result = cyberpunkAdventure('   start  ', env);
    expect(result).toMatch(/Neon Market/);
  });
});
