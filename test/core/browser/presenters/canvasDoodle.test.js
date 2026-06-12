import { describe, expect, test, jest } from '@jest/globals';
import { createCanvasDoodleElement } from '../../../../src/core/browser/presenters/canvasDoodle.js';

describe('createCanvasDoodleElement', () => {
  test('renders a canvas and draws the payload', () => {
    const context = {
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
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

    const element = createCanvasDoodleElement(
      JSON.stringify({
        width: 200,
        height: 120,
        background: '#eeeeee',
        accent: '#222222',
        shapes: [
          {
            type: 'rect',
            x: 10,
            y: 10,
            width: 50,
            height: 30,
            fill: '#ff0000',
          },
          { type: 'circle', x: 100, y: 60, radius: 12, fill: '#00ff00' },
          {
            type: 'line',
            x1: 20,
            y1: 90,
            x2: 180,
            y2: 90,
            stroke: '#0000ff',
            lineWidth: 4,
          },
        ],
      }),
      dom
    );

    expect(dom.createElement).toHaveBeenCalledWith('div');
    expect(dom.createElement).toHaveBeenCalledWith('canvas');
    expect(canvas.width).toBe(200);
    expect(canvas.height).toBe(120);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 200, 120);
    expect(context.arc).toHaveBeenCalled();
    expect(context.lineTo).toHaveBeenCalledWith(180, 90);
    expect(root.children[0]).toBe(canvas);
    expect(element).toBe(root);
  });
});
