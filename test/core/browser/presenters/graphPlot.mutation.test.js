import { describe, expect, test, jest } from '@jest/globals';
import {
  drawAxes,
  drawFunction,
  drawGrid,
  drawSeries,
  drawSeriesLine,
  drawSeriesPath,
  niceStep,
  toCanvasX,
  toCanvasY,
} from '../../../../src/core/browser/presenters/graphPlot.js';

function context() {
  return {
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    set strokeStyle(value) { this._strokeStyle = value; },
    set fillStyle(value) { this._fillStyle = value; },
    set lineWidth(value) { this._lineWidth = value; },
  };
}

const canvas = { width: 100, height: 80 };
const payload = {
  background: '#fff', axesColor: '#111', gridColor: '#ddd', lineColor: '#f00',
  xMin: -4, xMax: 4, yMin: -2, yMax: 2,
  points: [{ x: -4, y: -2 }, { x: 0, y: 0 }, { x: 4, y: 2 }],
};

describe('graphPlot mutation seams', () => {
  test('selects stable pleasant grid steps across all branches', () => {
    expect(niceStep(Number.NaN)).toBe(1);
    expect(niceStep(0)).toBe(1);
    expect(niceStep(8)).toBe(1);
    expect(niceStep(16)).toBe(2);
    expect(niceStep(40)).toBe(5);
    expect(niceStep(800)).toBe(100);
  });

  test('maps graph coordinates to canvas coordinates', () => {
    expect(toCanvasX(canvas, payload, -4)).toBe(0);
    expect(toCanvasX(canvas, payload, 0)).toBe(50);
    expect(toCanvasX(canvas, payload, 4)).toBe(100);
    expect(toCanvasY(canvas, payload, -2)).toBe(80);
    expect(toCanvasY(canvas, payload, 0)).toBe(40);
    expect(toCanvasY(canvas, payload, 2)).toBe(0);
  });

  test('draws empty, single-point, and multi-point paths', () => {
    const ctx = context();
    drawSeriesPath(ctx, canvas, payload, []);
    expect(ctx.moveTo).not.toHaveBeenCalled();
    drawSeriesPath(ctx, canvas, payload, [{ x: 0, y: 0 }]);
    expect(ctx.moveTo).toHaveBeenCalledWith(50, 40);
    drawSeriesPath(ctx, canvas, payload, payload.points);
    expect(ctx.lineTo).toHaveBeenCalledWith(100, 0);
    expect(ctx.stroke).toHaveBeenCalledTimes(3);
  });

  test('draws only non-empty function and optional series lines', () => {
    const ctx = context();
    drawFunction(ctx, canvas, { ...payload, points: [] });
    expect(ctx.stroke).not.toHaveBeenCalled();
    const functionContext = context();
    drawFunction(functionContext, canvas, payload);
    expect(functionContext.stroke).toHaveBeenCalledTimes(1);
    drawSeriesLine(ctx, canvas, payload, { points: [] });
    drawSeriesLine(ctx, canvas, payload, { points: [{ x: 0, y: 0 }] });
    drawSeriesLine(ctx, canvas, payload, { lineColor: '#0f0', points: payload.points });
    drawSeries(ctx, canvas, { ...payload, series: [
      { points: payload.points },
      { lineColor: '#00f', points: [{ x: 0, y: 0 }] },
      {},
    ] });
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx._strokeStyle).toBe('#00f');
  });

  test('draws grid, axes, and background in the complete plot', () => {
    const ctx = context();
    drawGrid(ctx, canvas, payload);
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.moveTo).toHaveBeenCalledWith(100, 0);
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 80);
    expect(ctx.moveTo).toHaveBeenCalledWith(0, 0);
    expect(ctx.moveTo.mock.calls.filter(([x]) => x !== 0).length).toBe(8);
    expect(ctx.moveTo.mock.calls.filter(([, y]) => y === 0).map(([x]) => x)).toEqual(
      [0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100, 0]
    );
    expect(ctx.moveTo.mock.calls.filter(([x]) => x === 0).length).toBe(10);
    const asymmetric = context();
    drawGrid(asymmetric, canvas, {
      ...payload, xMin: -17.3, xMax: 22.7, yMin: -7.3, yMax: 12.7,
    });
    expect(asymmetric.moveTo.mock.calls.filter(([, y]) => y === 0)).toHaveLength(8);
    expect(asymmetric.moveTo.mock.calls.filter(([x]) => x === 0)).toHaveLength(10);
    const asymmetricX = asymmetric.moveTo.mock.calls
      .filter(([, y]) => y === 0)
      .map(([x]) => x);
    expect(asymmetricX[0]).toBeCloseTo(5.75);
    expect(asymmetricX[1]).toBeCloseTo(18.25);
    expect(asymmetricX[2]).toBeCloseTo(30.75);
    const asymmetricY = asymmetric.moveTo.mock.calls
      .filter(([x]) => x === 0)
      .map(([, y]) => y);
    asymmetricY.forEach((value, index) => {
      expect(value).toBeCloseTo(74.8 - index * 8);
    });
    drawAxes(ctx, canvas, payload);
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(toCanvasX(canvas, payload, 0)).toBe(50);
    const axes = context();
    drawAxes(axes, canvas, payload);
    expect(axes.beginPath).toHaveBeenCalledTimes(1);
    expect(axes.stroke).toHaveBeenCalledTimes(1);
    expect(axes._strokeStyle).toBe(payload.axesColor);
    expect(axes._lineWidth).toBe(2);
  });
});
