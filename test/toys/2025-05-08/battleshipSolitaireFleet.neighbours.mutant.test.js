import { describe, test, expect } from '@jest/globals';
import { neighbours, battleshipSolitaireFleetTestOnly } from '../../../src/core/browser/toys/2025-05-08/battleshipSolitaireFleet.js';

const {
  isCoordNonNegative,
  isCoordWithinBoard,
  inBounds,
  dxReducerForNeighbour,
  getSx,
  getSy,
  getEndCoord,
  makeSegReducer,
  allSegsHaveNoOccupiedNeighbour,
  isForbiddenTouch,
} = battleshipSolitaireFleetTestOnly;

describe('neighbours mutants', () => {
  test('checks both coordinate axes independently', () => {
    expect(isCoordNonNegative({ x: 0, y: 0 })).toBe(true);
    expect(isCoordNonNegative({ x: -1, y: 0 })).toBe(false);
    expect(isCoordNonNegative({ x: 0, y: -1 })).toBe(false);
  });

  test('checks strict board upper bounds', () => {
    const cfg = { width: 3, height: 4 };
    expect(isCoordWithinBoard({ x: 2, y: 3 }, cfg)).toBe(true);
    expect(isCoordWithinBoard({ x: 3, y: 3 }, cfg)).toBe(false);
    expect(isCoordWithinBoard({ x: 2, y: 4 }, cfg)).toBe(false);
    expect(inBounds({ x: 2, y: 3 }, cfg)).toBe(true);
    expect(inBounds({ x: -1, y: 0 }, cfg)).toBe(false);
    expect(inBounds({ x: 0, y: -1 }, cfg)).toBe(false);
    expect(inBounds({ x: 3, y: 3 }, cfg)).toBe(false);
  });

  test('reduces each non-origin offset to exact coordinates', () => {
    const reduce = dxReducerForNeighbour({ x: 2, y: 3 }, -1);
    expect([0, 1, -1].reduce(reduce, [])).toEqual([
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 1, y: 2 },
    ]);
  });

  test('advances only the coordinate matching the direction', () => {
    expect(getSx('H', 2, 3)).toBe(5);
    expect(getSx('V', 2, 3)).toBe(2);
    expect(getSy('H', 4, 3)).toBe(4);
    expect(getSy('V', 4, 3)).toBe(7);
    expect(getEndCoord('H', { x: 2, y: 4 }, 3)).toEqual({ x: 4, y: 4 });
    expect(getEndCoord('V', { x: 2, y: 4 }, 3)).toEqual({ x: 2, y: 6 });
  });

  test('stops segment reduction after an invalid accumulator', () => {
    const reduce = makeSegReducer('H', { x: 0, y: 0 }, new Set(['1,0']));
    expect([undefined].reduce(reduce, { segs: [], valid: true })).toEqual({
      segs: [{ x: 0, y: 0 }],
      valid: true,
    });
    expect([undefined, undefined].reduce(reduce, { segs: [], valid: true })).toEqual({
      segs: [{ x: 0, y: 0 }],
      valid: false,
    });
    const invalid = [undefined, undefined].reduce(reduce, {
      segs: [{ x: 0, y: 0 }],
      valid: false,
    });
    expect(invalid).toEqual({ segs: [{ x: 0, y: 0 }], valid: false });
  });

  test('enforces no-touching only when enabled', () => {
    const context = {
      cfg: { width: 3, height: 3, noTouching: true },
      occupied: new Set(['1,1']),
      segs: [{ x: 1, y: 0 }],
    };
    expect(allSegsHaveNoOccupiedNeighbour(context.cfg, new Set(['2,2']), [{ x: 0, y: 0 }])).toBe(true);
    expect(allSegsHaveNoOccupiedNeighbour(context.cfg, new Set(['2,2']), [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(false);
    expect(isForbiddenTouch(context)).toBe(true);
    expect(isForbiddenTouch({ ...context, cfg: { ...context.cfg, noTouching: false } })).toBe(false);
  });

  test('does not include origin coordinate', () => {
    const result = neighbours({ x: 1, y: 2 });
    const hasOrigin = result.some(c => c.x === 1 && c.y === 2);
    expect(hasOrigin).toBe(false);
    expect(result).toHaveLength(8);
  });

  test('returns eight unique neighbours for various coords', () => {
    const coords = [
      { x: 0, y: 0 },
      { x: 2, y: 3 },
      { x: -1, y: -1 },
    ];
    for (const coord of coords) {
      const result = neighbours(coord);
      const unique = new Set(result.map(c => `${c.x},${c.y}`));
      expect(unique.size).toBe(8);
      expect(unique.has(`${coord.x},${coord.y}`)).toBe(false);
    }
  });
});
