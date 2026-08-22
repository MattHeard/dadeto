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

    expect(payload).toEqual({
      width: 320,
      height: 180,
      shapes: [
        {
          type: 'rect',
          x: 20,
          y: 20,
          width: 280,
          height: 140,
          fill: '#fde68a',
        },
        { type: 'circle', x: 90, y: 90, radius: 34, fill: '#60a5fa' },
        { type: 'circle', x: 220, y: 90, radius: 34, fill: '#f472b6' },
        {
          type: 'line',
          x1: 80,
          y1: 130,
          x2: 240,
          y2: 130,
          stroke: '#111827',
          lineWidth: 6,
        },
      ],
    });
  });

  test('builds default doodle shapes when options are missing', () => {
    const shapes = buildCanvasDoodleShapes({}, () => 0.25);

    expect(shapes).toHaveLength(5);
    expect(shapes[0]).toMatchObject({ type: 'rect', width: 320, height: 180 });
    expect(shapes[4]).toMatchObject({ type: 'line' });
  });

  test('builds deterministic custom doodle geometry and colors', () => {
    expect(
      buildCanvasDoodleShapes(
        { width: 100, height: 80, background: '#abc', accent: '#def' },
        () => 0.5
      )
    ).toEqual([
      { type: 'rect', x: 0, y: 0, width: 100, height: 80, fill: '#abc' },
      {
        type: 'rect',
        x: 10,
        y: 10,
        width: 80,
        height: 14,
        fill: 'hsl(180, 70%, 65%)',
      },
      { type: 'circle', x: 32, y: 46, radius: 13, fill: 'hsl(300, 70%, 60%)' },
      { type: 'circle', x: 68, y: 46, radius: 13, fill: 'hsl(60, 70%, 60%)' },
      {
        type: 'line',
        x1: 10,
        y1: 70,
        x2: 90,
        y2: 70,
        stroke: '#def',
        lineWidth: 6,
      },
    ]);
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

    drawCanvasDoodle(context, canvas, {
      shapes: [
        { type: 'rect' },
        { type: 'circle' },
        { type: 'line' },
        { type: 'text' },
      ],
    });
    expect(context.fillRect).toHaveBeenLastCalledWith(0, 0, 10, 10);
    expect(context.arc).toHaveBeenLastCalledWith(0, 0, 8, 0, Math.PI * 2);
    expect(context.moveTo).toHaveBeenLastCalledWith(0, 0);
    expect(context.lineTo).toHaveBeenLastCalledWith(0, 0);
    expect(context.fillText).toHaveBeenLastCalledWith('', 0, 0);
    expect(context._fillStyle).toBe('#1f2937');
    expect(context._strokeStyle).toBe('#1f2937');
    expect(context._lineWidth).toBe(2);
    expect(context.font).toBe('12px monospace');
    expect(context.textAlign).toBe('left');
    expect(context.textBaseline).toBe('alphabetic');

    drawCanvasDoodle(context, canvas, { shapes: [{ type: 'rect' }] });
    expect(context._fillStyle).toBe('#cbd5e1');
    expect(context.fillRect).toHaveBeenLastCalledWith(0, 0, 10, 10);
    drawCanvasDoodle(context, canvas, { shapes: [{ type: 'circle' }] });
    expect(context._fillStyle).toBe('#cbd5e1');
    expect(context.arc).toHaveBeenLastCalledWith(0, 0, 8, 0, Math.PI * 2);
    drawCanvasDoodle(context, canvas, { shapes: [{ type: 'line' }] });
    expect(context._strokeStyle).toBe('#1f2937');
    expect(context._lineWidth).toBe(2);
    drawCanvasDoodle(context, canvas, { shapes: [{ type: 'text' }] });
    expect(context.font).toBe('12px monospace');
    expect(context.textAlign).toBe('left');
    expect(context.textBaseline).toBe('alphabetic');

    const callsBeforeUnknown = context.fillRect.mock.calls.length;
    const textCallsBeforeUnknown = context.fillText.mock.calls.length;
    drawCanvasDoodle(context, canvas, { shapes: [{ type: 'unknown' }] });
    expect(context.fillRect).toHaveBeenCalledTimes(callsBeforeUnknown + 1);
    expect(context.fillText).toHaveBeenCalledTimes(textCallsBeforeUnknown);

    drawCanvasDoodle(context, canvas, {});
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 10, 10);
    expect(context.arc).toHaveBeenCalledTimes(3);
  });
});
/* eslint max-statements: off */
