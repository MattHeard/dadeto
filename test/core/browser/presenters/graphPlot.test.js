import { describe, expect, test, jest } from '@jest/globals';
import {
  createGraphPlotElement,
  createGraphPlotPresenterHandle,
} from '../../../../src/core/browser/presenters/graphPlot.js';

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
    expect(canvas.style.width).toBe('100%');
    expect(canvas.style.maxWidth).toBe('100%');
    expect(canvas.style.height).toBe('auto');
    expect(canvas.style.display).toBe('block');
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 240, 180);
    expect(context.lineTo).toHaveBeenCalled();
    expect(root.children[0]).toBe(canvas);
    expect(element).toBe(root);
  });

  test('returns the presenter handle and skips drawing without context', () => {
    const canvas = {
      width: 0,
      height: 0,
      style: {},
      getContext: jest.fn(() => null),
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

    const handle = createGraphPlotPresenterHandle();
    const element = handle.createGraphPlotElement(
      JSON.stringify({
        expression: 'NaN',
        width: 0,
        height: 0,
        xMin: -1,
        xMax: 1,
        yMin: -1,
        yMax: 1,
      }),
      dom
    );

    expect(element).toBe(root);
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
    expect(canvas.style.width).toBe('100%');
    expect(canvas.getContext).toHaveBeenCalledWith('2d');
  });

  test('handles empty curves and varying grid steps', () => {
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
    const handle = createGraphPlotPresenterHandle();

    handle.createGraphPlotElement(
      JSON.stringify({
        expression: 'NaN',
        width: 0,
        height: 0,
        xMin: 0,
        xMax: 0,
        yMin: 0,
        yMax: 0,
      }),
      dom
    );
    handle.createGraphPlotElement(
      JSON.stringify({
        expression: 'x',
        width: 80,
        height: 60,
        xMin: -8,
        xMax: 8,
        yMin: -8,
        yMax: 8,
      }),
      dom
    );
    handle.createGraphPlotElement(
      JSON.stringify({
        expression: 'x',
        width: 80,
        height: 60,
        xMin: -24,
        xMax: 24,
        yMin: -24,
        yMax: 24,
      }),
      dom
    );
    handle.createGraphPlotElement(
      JSON.stringify({
        expression: 'x',
        width: 80,
        height: 60,
        xMin: -48,
        xMax: 48,
        yMin: -48,
        yMax: 48,
      }),
      dom
    );

    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(context.fillRect).toHaveBeenCalled();
  });

  test('skips the curve renderer when the payload has no points', () => {
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
        expression: 'NaN',
        width: 0,
        height: 0,
        xMin: 0,
        xMax: 0,
        yMin: 0,
        yMax: 0,
      }),
      dom
    );

    expect(context.stroke).toHaveBeenCalled();
  });
});
