import { describe, expect, jest, test } from '@jest/globals';
import {
  buildGraphPlotPayload,
  buildGraphPlotFromJson,
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

  test('normalizes non-array series into the fallback empty list', () => {
    const normalized = normalizeGraphPlotPayload(
      {
        expression: 'x',
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
        series: { lineColor: '#00f' },
      },
      () => 0.5
    );

    expect(normalized.series).toEqual([]);
  });

  test('falls back for invalid number and string fields', () => {
    const normalized = normalizeGraphPlotPayload(
      {
        expression: '',
        width: Number.NaN,
        height: Number.POSITIVE_INFINITY,
        xMin: Number.NaN,
        xMax: Number.NaN,
        yMin: Number.NaN,
        yMax: Number.NaN,
        background: '',
        axesColor: '',
        gridColor: '',
        lineColor: '',
      },
      () => 0.5
    );

    expect(normalized).toMatchObject({
      expression: 'Math.sin(x)',
      background: '#faf8f4',
      axesColor: '#111827',
      gridColor: '#d1d5db',
      lineColor: '#2563eb',
    });
    expect(normalized.width).toBeGreaterThan(0);
    expect(normalized.height).toBeGreaterThan(0);
  });

  test('keeps a non-empty series list on the payload', () => {
    const normalized = normalizeGraphPlotPayload(
      {
        expression: 'x',
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
        series: [{ lineColor: '#0f0', points: [{ x: 1, y: 2 }] }],
      },
      () => 0.5
    );

    expect(buildGraphPlotPayload(normalized).series).toEqual([
      { lineColor: '#0f0', points: [{ x: 1, y: 2 }] },
    ]);
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

  test('builds from fallback payload when JSON parsing fails', () => {
    const getRandomNumber = jest.fn(() => 0.5);

    const payload = buildGraphPlotFromJson('{', getRandomNumber);

    expect(getRandomNumber).toHaveBeenCalledTimes(1);
    expect(payload.type).toBe('graph-plot');
    expect(payload.series).toBeUndefined();
    expect(payload.points.length).toBeGreaterThan(0);
  });
});
