import { describe, expect, test } from '@jest/globals';
import { fractalGenerator } from '../../../src/core/browser/toys/2026-06-15/fractalGenerator.js';

/**
 * Parse a fractal generator result.
 * @param {string} input Toy JSON input.
 * @returns {Record<string, unknown>} Parsed canvas payload.
 */
function parseResult(input) {
  return JSON.parse(fractalGenerator(input));
}

describe('fractalGenerator', () => {
  test('returns a default canvas payload with recursive branch shapes', () => {
    const result = parseResult('{}');

    expect(result.width).toBe(360);
    expect(result.height).toBe(240);
    expect(result.shapes[0]).toEqual({
      type: 'rect',
      x: 0,
      y: 0,
      width: 360,
      height: 240,
      fill: '#071013',
    });
    expect(result.shapes).toHaveLength(32);
    expect(result.shapes[1]).toMatchObject({
      type: 'line',
      x1: 180,
      y1: 222,
      lineWidth: 5,
    });
  });

  test('falls back to defaults for invalid and non-object input', () => {
    expect(parseResult('')).toMatchObject({
      width: 360,
      height: 240,
    });
    expect(parseResult('not json')).toMatchObject({
      width: 360,
      height: 240,
    });
    expect(parseResult('null')).toMatchObject({
      width: 360,
      height: 240,
    });
  });

  test('falls back for non-finite numeric options', () => {
    expect(parseResult('{"width":1e999}')).toMatchObject({
      width: 360,
      height: 240,
    });
  });

  test('clamps dimensions, depth, and hue', () => {
    const result = parseResult(
      JSON.stringify({
        width: 1200,
        height: 80,
        depth: 20,
        hue: 720,
      })
    );

    expect(result.width).toBe(800);
    expect(result.height).toBe(120);
    expect(result.shapes).toHaveLength(256);
    expect(result.shapes[1].stroke).toBe('hsl(192, 78%, 76%)');
  });

  test('uses minimum values for low numeric options', () => {
    const result = parseResult(
      JSON.stringify({
        width: 1,
        height: 1,
        depth: -4,
        hue: -10,
      })
    );

    expect(result.width).toBe(160);
    expect(result.height).toBe(120);
    expect(result.shapes).toHaveLength(2);
    expect(result.shapes[1].lineWidth).toBe(1);
    expect(result.shapes[1].stroke).toBe('hsl(24, 78%, 41%)');
  });
});
