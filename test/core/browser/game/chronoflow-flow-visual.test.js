import { describe, expect, it } from '@jest/globals';
import { getFlowVisual } from '../../../../src/core/browser/game/chronoflow/flowVisual.js';

describe('Chronoflow flow visual mapping', () => {
  it('keeps still and sub-threshold water quiet', () => {
    expect(getFlowVisual(0, 0)).toEqual({
      direction: 'still',
      glyph: '',
      strength: 0,
    });
    expect(getFlowVisual(0.01, 0.01).direction).toBe('still');
  });

  it.each([
    [1, 0, 'right', '→'],
    [-1, 0, 'left', '←'],
    [0, 1, 'down', '↓'],
    [0, -1, 'up', '↑'],
    [0.1, 0.8, 'down', '↓'],
    [0.8, 0.1, 'right', '→'],
    [1, 1, 'down', '↓'],
  ])('maps velocity %s,%s to %s', (vx, vy, direction, glyph) => {
    expect(getFlowVisual(vx, vy)).toMatchObject({ direction, glyph });
  });

  it('caps render strength and rejects invalid velocity values', () => {
    expect(getFlowVisual(3, 4).strength).toBe(1);
    expect(() => getFlowVisual(Number.NaN, 0)).toThrow(TypeError);
    expect(() => getFlowVisual(0, Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});
