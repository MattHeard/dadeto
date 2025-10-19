import { describe, test, expect } from '@jest/globals';
import { generatePalette } from '../../../src/core/toys/2025-04-16/colorPalette.js';

describe('generatePalette (2025-04-16)', () => {
  test('returns default 5 colors when input is invalid', () => {
    const mockEnv = new Map([['getRandomNumber', () => 0]]);
    const result = JSON.parse(generatePalette('foo', mockEnv));
    expect(result.palette).toHaveLength(5);
    result.palette.forEach(color => {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  test('generates correct colors for input count', () => {
    let count = 0;
    const mockEnv = new Map([
      [
        'getRandomNumber',
        () => {
          const value = (count % 256) / 255;
          count++;
          return value;
        },
      ],
    ]);
    const result = JSON.parse(generatePalette('3', mockEnv));
    expect(result.palette).toEqual(['#000000', '#010101', '#020202']);
  });
});
