import { describe, expect, test, jest } from '@jest/globals';
import { graphPlot } from '../../../src/core/browser/toys/2026-06-13/graphPlot.js';

describe('graphPlot', () => {
  test('returns a graph payload with points', () => {
    const env = new Map([['getRandomNumber', jest.fn(() => 0.25)]]);
    const result = JSON.parse(
      graphPlot(
        JSON.stringify({
          expression: 'x * x',
          width: 220,
          height: 140,
          xMin: -3,
          xMax: 3,
          yMin: -1,
          yMax: 10,
          background: '#fff',
          axesColor: '#111',
          gridColor: '#ddd',
          lineColor: '#f00',
        }),
        env
      )
    );

    expect(result.type).toBe('graph-plot');
    expect(result.width).toBe(220);
    expect(result.height).toBe(140);
    expect(result.points.length).toBeGreaterThan(0);
  });

  test('falls back to defaults for invalid input', () => {
    const env = new Map([['getRandomNumber', jest.fn(() => 0.5)]]);
    const result = JSON.parse(graphPlot('not json', env));
    expect(result.type).toBe('graph-plot');
    expect(result.width).toBeGreaterThan(0);
    expect(result.points.length).toBeGreaterThan(0);
  });

  test('uses the default random number helper when none is provided', () => {
    const env = new Map();
    const result = JSON.parse(
      graphPlot(
        JSON.stringify({
          expression: 'x',
          width: 220,
          height: 140,
          xMin: -3,
          xMax: 3,
          yMin: -1,
          yMax: 10,
          background: '#fff',
          axesColor: '#111',
          gridColor: '#ddd',
          lineColor: '#f00',
        }),
        env
      )
    );

    expect(result.type).toBe('graph-plot');
    expect(result.points.length).toBeGreaterThan(0);
  });
});
