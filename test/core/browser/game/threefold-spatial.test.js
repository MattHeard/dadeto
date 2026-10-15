import {
  BASE_HEIGHT_METERS,
  changeScale,
  createScaleState,
  heightAtScale,
  INITIAL_MAX_ANCHOR,
  MAX_SCALE,
  MIN_SCALE,
  recoverAnchor,
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
    const state = createScaleState({ x: 11.25, y: 8.5 });
    const smaller = changeScale(state, -1);
    expect(smaller.position).toEqual(state.position);
    expect(smaller.position).not.toBe(state.position);
    expect(smaller.anchor).toBe(INITIAL_MAX_ANCHOR - 1);
    const view = viewAtScale(smaller.position, smaller.scale);
    expect(view.region).toEqual({ x: 18, y: 12, width: 3, height: 3 });
    expect(view.cellSizeMeters).toBeCloseTo(BASE_HEIGHT_METERS / 3, 12);
    expect(view.local.x).toBeCloseTo(11.25 - view.cell.x * view.cellSizeMeters);
  });

  test('scale roundtrips preserve coordinates and reject scale overflow', () => {
    const initial = createScaleState({ x: -3.1, y: 12.75 });
    const restored = changeScale(changeScale(initial, -1), 1);
    expect(restored).toEqual({ ...initial, anchor: INITIAL_MAX_ANCHOR - 2 });
    const atMaximum = createScaleState(initial.position, { scale: MAX_SCALE });
    const atMinimum = createScaleState(initial.position, { scale: MIN_SCALE });
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
    const initial = createScaleState({ x: 0, y: 0 });
    expect(changeScale(initial, 2)).toBe(initial);
    expect(() => createScaleState({ x: 0, y: 0 }, { anchor: 9 })).toThrow(
      RangeError
    );
    expect(() => createScaleState({ x: 0, y: 0 }, { scale: 5 })).toThrow(
      RangeError
    );
  });

  test('charges one Anchor per rung and leaves unaffordable or locked changes untouched', () => {
    let state = createScaleState({ x: 0, y: 0 }, { scale: MIN_SCALE });
    for (let scale = MIN_SCALE; scale < MAX_SCALE; scale += 1)
      state = changeScale(state, 1);
    expect(state.scale).toBe(MAX_SCALE);
    expect(state.anchor).toBe(0);
    const unaffordable = createScaleState({ x: 0, y: 0 }, { anchor: 0 });
    expect(changeScale(unaffordable, 1)).toBe(unaffordable);
    const locked = createScaleState(
      { x: 0, y: 0 },
      { maximumUnlockedScale: 0 }
    );
    expect(changeScale(locked, 1)).toBe(locked);
    const lowerLocked = createScaleState(
      { x: 0, y: 0 },
      { minimumUnlockedScale: 0 }
    );
    expect(changeScale(lowerLocked, -1)).toBe(lowerLocked);
  });

  test('recovers Anchor deterministically from game minutes and caps at capacity', () => {
    const state = createScaleState({ x: 0, y: 0 }, { anchor: 5 });
    const partial = recoverAnchor(state, 20, 30, { inCombat: false });
    expect(partial.anchor).toBe(5);
    expect(partial.recoveryProgressMinutes).toBe(20);
    const recovered = recoverAnchor(partial, 10, 30, { inCombat: false });
    expect(recovered.anchor).toBe(6);
    expect(recovered.recoveryProgressMinutes).toBe(0);
    const carried = recoverAnchor(state, 40, 30, { inCombat: false });
    expect(carried.anchor).toBe(6);
    expect(carried.recoveryProgressMinutes).toBe(10);
    expect(recoverAnchor(recovered, 1000, 30, { inCombat: false }).anchor).toBe(
      INITIAL_MAX_ANCHOR
    );
    const full = createScaleState({ x: 0, y: 0 });
    expect(recoverAnchor(full, 30, 30, { inCombat: false })).toBe(full);
    expect(recoverAnchor(state, 0, 30, { inCombat: false })).toBe(state);
    expect(recoverAnchor(state, 30, 30, { inCombat: true })).toBe(state);
    expect(() => recoverAnchor(state, -1, 30, { inCombat: false })).toThrow(
      RangeError
    );
    expect(() => recoverAnchor(state, 1, 0, { inCombat: false })).toThrow(
      RangeError
    );
    expect(() =>
      recoverAnchor(state, Number.NaN, 30, { inCombat: false })
    ).toThrow(RangeError);
    expect(() => recoverAnchor(state, 1, 30, {})).toThrow(TypeError);
  });

  test('rejects malformed progression and Anchor states', () => {
    expect(() =>
      createScaleState({ x: 0, y: 0 }, { minimumUnlockedScale: 1 })
    ).toThrow(RangeError);
    expect(() =>
      createScaleState(
        { x: 0, y: 0 },
        { minimumUnlockedScale: 1, maximumUnlockedScale: 0 }
      )
    ).toThrow(RangeError);
    expect(() =>
      createScaleState({ x: 0, y: 0 }, { scale: 1, maximumUnlockedScale: 0 })
    ).toThrow(RangeError);
    expect(() =>
      createScaleState({ x: 0, y: 0 }, { maximumAnchor: 9 })
    ).toThrow(RangeError);
    expect(() => createScaleState({ x: 0, y: 0 }, { anchor: -1 })).toThrow(
      RangeError
    );
    expect(() =>
      changeScale({ ...createScaleState({ x: 0, y: 0 }), anchor: 9 }, 1)
    ).toThrow(RangeError);
    expect(() =>
      changeScale(
        { ...createScaleState({ x: 0, y: 0 }), recoveryProgressMinutes: -1 },
        1
      )
    ).toThrow(RangeError);
  });
});
