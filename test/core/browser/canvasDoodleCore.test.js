import { describe, expect, test, jest } from '@jest/globals';
import {
  buildCanvasDoodleShapes,
  createCanvasDoodleFallbackPayload,
  drawCanvasDoodle,
  parseCanvasDoodle,
} from '../../../src/core/browser/canvasDoodleCore.js';

describe('canvasDoodleCore', () => {
  test('parses canvas doodle JSON payloads', () => {
    expect(parseCanvasDoodle('{"width":123,"height":45}')).toEqual({
      width: 123,
      height: 45,
    });
  });

  test('returns null for invalid canvas doodle payloads', () => {
    expect(parseCanvasDoodle('not json')).toBeNull();
    expect(parseCanvasDoodle('[]')).toEqual([]);
  });

  test('provides a fallback payload with default dimensions and shapes', () => {
    const payload = createCanvasDoodleFallbackPayload();

    expect(payload.width).toBeGreaterThan(0);
    expect(payload.height).toBeGreaterThan(0);
    expect(payload.shapes).toHaveLength(4);
  });

  test('builds default doodle shapes when options are missing', () => {
    const shapes = buildCanvasDoodleShapes({}, () => 0.25);

    expect(shapes).toHaveLength(5);
    expect(shapes[0]).toMatchObject({ type: 'rect', width: 320, height: 180 });
    expect(shapes[4]).toMatchObject({ type: 'line' });
  });

  test('draws only known shapes and ignores unknown ones', () => {
    const context = {
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      fillText: jest.fn(),
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
    const canvas = { width: 10, height: 10 };

    drawCanvasDoodle(context, canvas, {
      shapes: [
        { type: 'rect', x: 1, y: 2, width: 3, height: 4, fill: '' },
        { type: 'circle', x: 5, y: 6, radius: 7, fill: '' },
        { type: 'line', x1: 1, y1: 2, x2: 3, y2: 4, stroke: '' },
        { type: 'text', x: 8, y: 9, text: 'HUD', fill: '' },
        { type: 'triangle' },
      ],
    });

    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 10, 10);
    expect(context.arc).toHaveBeenCalledWith(5, 6, 7, 0, Math.PI * 2);
    expect(context.lineTo).toHaveBeenCalledWith(3, 4);
    expect(context.fillText).toHaveBeenCalledWith('HUD', 8, 9);

    drawCanvasDoodle(context, canvas, {});
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 10, 10);
  });
});
