import { describe, expect, test, jest } from '@jest/globals';
import { canvasDoodle } from '../../../src/core/browser/toys/2026-06-12/canvasDoodle.js';

describe('canvasDoodle', () => {
  test('returns a canvas payload with shapes', () => {
    const env = new Map([['getRandomNumber', jest.fn(() => 0.25)]]);

    const result = JSON.parse(
      canvasDoodle(
        JSON.stringify({
          width: 240,
          height: 160,
          background: '#ffffff',
          accent: '#000000',
        }),
        env
      )
    );

    expect(result.width).toBe(240);
    expect(result.height).toBe(160);
    expect(Array.isArray(result.shapes)).toBe(true);
    expect(result.shapes.length).toBeGreaterThan(0);
    expect(env.get('getRandomNumber')).toHaveBeenCalledTimes(1);
  });

  test('falls back to defaults for invalid input', () => {
    const env = new Map([['getRandomNumber', jest.fn(() => 0.5)]]);

    const result = JSON.parse(canvasDoodle('not json', env));

    expect(result.width).toBe(320);
    expect(result.height).toBe(180);
    expect(result.shapes).toHaveLength(5);
  });
});
