import { describe, expect, test, jest } from '@jest/globals';
import { createGraphPlotElement } from '../../../../src/core/browser/presenters/graphPlot.js';

describe('createGraphPlotElement', () => {
  test('renders a canvas with axes and a curve', () => {
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

    const element = createGraphPlotElement(
      JSON.stringify({
        expression: 'x * x',
        width: 240,
        height: 180,
        xMin: -4,
        xMax: 4,
        yMin: -1,
        yMax: 16,
        background: '#ffffff',
        axesColor: '#111111',
        gridColor: '#dddddd',
        lineColor: '#ff0000',
      }),
      dom
    );

    expect(dom.createElement).toHaveBeenCalledWith('div');
    expect(dom.createElement).toHaveBeenCalledWith('canvas');
    expect(canvas.width).toBe(240);
    expect(canvas.height).toBe(180);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 240, 180);
    expect(context.lineTo).toHaveBeenCalled();
    expect(root.children[0]).toBe(canvas);
    expect(element).toBe(root);
  });
});
