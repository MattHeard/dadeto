import { describe, expect, test, jest } from '@jest/globals';
import { createGraphPlotElement } from '../../../../src/core/browser/presenters/graphPlot.js';

describe('createGraphPlotElement series rendering', () => {
  test('draws each series as its own line', () => {
    const context = {
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      set fillStyle(value) {
        this._fillStyle = value;
      },
      set strokeStyle(value) {
        this._strokeStyle = value;
      },
      set lineWidth(value) {
        this._lineWidth = value;
      },
    };
    const canvas = {
      width: 0,
      height: 0,
      style: {},
      getContext: jest.fn(() => context),
    };
    const root = { children: [] };
    const dom = {
      createElement: jest.fn(tag => (tag === 'canvas' ? canvas : root)),
      appendChild: jest.fn((parent, child) => {
        parent.children.push(child);
        return child;
      }),
      setClassName: jest.fn((node, className) => {
        node.className = className;
      }),
    };

    createGraphPlotElement(
      JSON.stringify({
        xMin: 2000,
        xMax: 2050,
        yMin: 0,
        yMax: 100,
        series: [
          {
            lineColor: '#b45309',
            points: [
              { x: 2000, y: 18 },
              { x: 2030, y: 0 },
            ],
          },
          {
            points: [
              { x: 2000, y: 32 },
              { x: 2035, y: 0 },
            ],
          },
        ],
      }),
      dom
    );

    expect(context.lineTo).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
    expect(context._strokeStyle).toBe('#2563eb');
    expect(root.children[0]).toBe(canvas);
  });

  test('skips empty series entries without throwing', () => {
    const context = {
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      set fillStyle(value) {
        this._fillStyle = value;
      },
      set strokeStyle(value) {
        this._strokeStyle = value;
      },
      set lineWidth(value) {
        this._lineWidth = value;
      },
    };
    const canvas = {
      width: 0,
      height: 0,
      style: {},
      getContext: jest.fn(() => context),
    };
    const root = { children: [] };
    const dom = {
      createElement: jest.fn(tag => (tag === 'canvas' ? canvas : root)),
      appendChild: jest.fn((parent, child) => {
        parent.children.push(child);
        return child;
      }),
      setClassName: jest.fn((node, className) => {
        node.className = className;
      }),
    };

    createGraphPlotElement(
      JSON.stringify({
        xMin: 2000,
        xMax: 2050,
        yMin: 0,
        yMax: 100,
        series: [{ lineColor: '#b45309', points: [] }],
      }),
      dom
    );

    expect(context.stroke).toHaveBeenCalled();
    expect(root.children[0]).toBe(canvas);
  });
});
