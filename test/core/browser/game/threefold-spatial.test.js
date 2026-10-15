import {
  BASE_HEIGHT_METERS,
  changeScale,
  heightAtScale,
  MAX_SCALE,
  MIN_SCALE,
  viewAtScale,
} from '../../../../src/core/browser/game/threefold/spatial.js';

describe('THREEFOLD scale-space', () => {
  test('calibrates the nine scales as powers of three', () => {
    expect(heightAtScale(0)).toBe(1.8288);
    expect(heightAtScale(-4)).toBeCloseTo(0.0226, 4);
    expect(heightAtScale(4)).toBeCloseTo(148.13, 2);
    for (let scale = MIN_SCALE; scale < MAX_SCALE; scale += 1)
      expect(heightAtScale(scale + 1)).toBeCloseTo(
        heightAtScale(scale) * 3,
        12
      );
  });

  test('shows a 3 by 3 finer region without changing canonical position', () => {
    const state = { scale: 0, position: { x: 11.25, y: 8.5 } };
    const smaller = changeScale(state, -1);
    expect(smaller.position).toEqual(state.position);
    expect(smaller.position).not.toBe(state.position);
    const view = viewAtScale(smaller.position, smaller.scale);
    expect(view.region).toEqual({ x: 18, y: 12, width: 3, height: 3 });
    expect(view.cellSizeMeters).toBeCloseTo(BASE_HEIGHT_METERS / 3, 12);
    expect(view.local.x).toBeCloseTo(11.25 - view.cell.x * view.cellSizeMeters);
  });

  test('scale roundtrips preserve coordinates and reject scale overflow', () => {
    const initial = { scale: 0, position: { x: -3.1, y: 12.75 } };
    const restored = changeScale(changeScale(initial, -1), 1);
    expect(restored).toEqual(initial);
    const atMaximum = { ...initial, scale: MAX_SCALE };
    const atMinimum = { ...initial, scale: MIN_SCALE };
    expect(changeScale(atMaximum, 1)).toBe(atMaximum);
    expect(changeScale(atMinimum, -1)).toBe(atMinimum);
  });

  test('rejects invalid scales, positions, and multi-level changes', () => {
    expect(() => heightAtScale(0.5)).toThrow(RangeError);
    expect(() => heightAtScale(MIN_SCALE - 1)).toThrow(RangeError);
    expect(() => heightAtScale(MAX_SCALE + 1)).toThrow(RangeError);
    expect(() => viewAtScale({ x: Infinity, y: 0 }, 0)).toThrow(TypeError);
    expect(() => viewAtScale({ x: 0, y: Number.NaN }, 0)).toThrow(TypeError);
    expect(() => viewAtScale(null, 0)).toThrow(TypeError);
    expect(() =>
      changeScale({ scale: 0, position: { x: 0, y: 0 } }, 2)
    ).toThrow(RangeError);
  });
});
