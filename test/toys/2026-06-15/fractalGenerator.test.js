import { describe, expect, test } from '@jest/globals';
import {
  fractalGenerator,
  fractalGeneratorTestOnly,
} from '../../../src/core/browser/toys/2026-06-15/fractalGenerator.js';

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

  test('covers pure parsing, numeric, clamp, and recursion guards', () => {
    expect(fractalGeneratorTestOnly.parseConfig('')).toEqual({});
    expect(fractalGeneratorTestOnly.parseConfig('null')).toEqual({});
    expect(fractalGeneratorTestOnly.parseJsonOrNull('{')).toBeNull();
    expect(fractalGeneratorTestOnly.parseJsonOrNull('{"x":1}')).toEqual({
      x: 1,
    });
    expect(fractalGeneratorTestOnly.numberOr(3, 0)).toBe(3);
    expect(fractalGeneratorTestOnly.numberOr('3', 0)).toBe(0);
    expect(fractalGeneratorTestOnly.numberOr(Infinity, 7)).toBe(7);
    expect(fractalGeneratorTestOnly.clamp(-1, 0, 10)).toBe(0);
    expect(fractalGeneratorTestOnly.clamp(5, 0, 10)).toBe(5);
    expect(fractalGeneratorTestOnly.clamp(11, 0, 10)).toBe(10);
    const shapes = [];
    fractalGeneratorTestOnly.addBranch(shapes, {
      x: 0,
      y: 0,
      length: 1,
      angle: 0,
      depth: 2,
      hue: 10,
    });
    expect(shapes).toEqual([]);
    fractalGeneratorTestOnly.addBranch(shapes, {
      x: 0,
      y: 0,
      length: 10,
      angle: 0,
      depth: 1,
      hue: 10,
    });
    expect(shapes).toHaveLength(1);
    expect(shapes[0]).toMatchObject({ x1: 0, y1: 0, x2: 10, y2: 0 });
    const recursiveShapes = [];
    fractalGeneratorTestOnly.addBranch(recursiveShapes, {
      x: 10,
      y: 20,
      length: 20,
      angle: 0,
      depth: 2,
      hue: 10,
    });
    expect(recursiveShapes).toHaveLength(3);
    expect(recursiveShapes[0]).toMatchObject({
      x1: 10,
      y1: 20,
      x2: 30,
      y2: 20,
    });
    expect(recursiveShapes[1]).toMatchObject({
      x1: 30,
      y1: 20,
      x2: 42,
      y2: 13,
    });
    expect(recursiveShapes[2]).toMatchObject({
      x1: 30,
      y1: 20,
      x2: 42,
      y2: 27,
    });
    const thresholdShapes = [];
    fractalGeneratorTestOnly.addBranch(thresholdShapes, {
      x: 0,
      y: 0,
      length: 2,
      angle: 0,
      depth: 1,
      hue: 0,
    });
    expect(thresholdShapes).toHaveLength(1);
    expect(parseResult('{}').shapes[1]).toMatchObject({ x2: 180, y2: 155 });
  });
});
