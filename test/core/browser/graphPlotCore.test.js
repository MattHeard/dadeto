import { describe, expect, test } from '@jest/globals';
import {
  buildGraphPlotPayload,
  createGraphPlotFallbackPayload,
  normalizeGraphPlotPayload,
  parseGraphPlot,
} from '../../../src/core/browser/graphPlotCore.js';

describe('graphPlotCore', () => {
  test('parses graph input JSON', () => {
    expect(parseGraphPlot('{"expression":"x * x"}')).toEqual({
      expression: 'x * x',
    });
  });

  test('falls back to a sine graph payload', () => {
    const payload = createGraphPlotFallbackPayload();
    expect(payload.expression).toBe('Math.sin(x)');
    expect(payload.width).toBeGreaterThan(0);
    expect(payload.height).toBeGreaterThan(0);
  });

  test('builds curve points from the expression', () => {
    const normalized = normalizeGraphPlotPayload(
      {
        expression: 'x * x',
        width: 100,
        height: 80,
        xMin: -2,
        xMax: 2,
        yMin: -1,
        yMax: 5,
        background: '#fff',
        axesColor: '#000',
        gridColor: '#ccc',
        lineColor: '#f00',
      },
      () => 0.5
    );
    const payload = buildGraphPlotPayload(normalized);
    expect(payload.type).toBe('graph-plot');
    expect(payload.points.length).toBeGreaterThan(0);
    expect(payload.points[0]).toMatchObject({ x: -2, y: 4 });
  });

  test('normalizes invalid expressions into NaN-producing evaluators', () => {
    const normalized = normalizeGraphPlotPayload(
      {
        expression: '(',
        width: 100,
        height: 80,
        xMin: -1,
        xMax: 1,
        yMin: -1,
        yMax: 1,
        background: '#fff',
        axesColor: '#000',
        gridColor: '#ccc',
        lineColor: '#f00',
      },
      () => 0.5
    );
    const payload = buildGraphPlotPayload(normalized);

    expect(payload.points).toEqual([]);
  });

  test('falls back to NaN points when the expression parser throws immediately', () => {
    const normalized = normalizeGraphPlotPayload(
      {
        expression: ')',
        width: 24,
        height: 24,
        xMin: -1,
        xMax: 1,
        yMin: -1,
        yMax: 1,
        background: '#fff',
        axesColor: '#000',
        gridColor: '#ccc',
        lineColor: '#f00',
      },
      () => 0.5
    );

    expect(buildGraphPlotPayload(normalized).points).toEqual([]);
  });

  test('treats another invalid expression as producing no points', () => {
    const normalized = normalizeGraphPlotPayload(
      {
        expression: 'Math.max(',
        width: 24,
        height: 24,
        xMin: -1,
        xMax: 1,
        yMin: -1,
        yMax: 1,
        background: '#fff',
        axesColor: '#000',
        gridColor: '#ccc',
        lineColor: '#f00',
      },
      () => 0.5
    );

    expect(buildGraphPlotPayload(normalized).points).toEqual([]);
  });
});
