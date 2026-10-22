import {
  BASE_HEIGHT_METERS,
  changeScale,
  createScaleState,
  growThroughGeometry,
  heightAtScale,
  INITIAL_MAX_ANCHOR,
  MAX_SCALE,
  MIN_SCALE,
  moveAtScale,
  previewGrowthDamageIds,
  projectGeometryForScale,
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

  test('moves one ninth of a logical cell per input at every scale', () => {
    const directions = [
      ['up', 0, -1],
      ['down', 0, 1],
      ['left', -1, 0],
      ['right', 1, 0],
    ];
    const scene = {
      baseBodyWidthMeters: 0.1,
      bounds: {
        min: { x: -1000, y: -1000 },
        max: { x: 1000, y: 1000 },
      },
    };

    for (let scale = MIN_SCALE; scale <= MAX_SCALE; scale += 1) {
      const cellSize = heightAtScale(scale);
      for (const [direction, dx, dy] of directions) {
        const initial = createScaleState({ x: -400.25, y: -400.25 }, { scale });
        const moved = Array.from({ length: 9 }).reduce(
          state => moveAtScale(state, direction, [], scene),
          initial
        );

        expect(moved.position.x).toBeCloseTo(
          initial.position.x + dx * cellSize,
          10
        );
        expect(moved.position.y).toBeCloseTo(
          initial.position.y + dy * cellSize,
          10
        );
      }
    }
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

  test('records intersected geometry as irreversible sorted rubble after growth', () => {
    const initial = createScaleState({ x: 2, y: 3 });
    const grown = changeScale(initial, 1, ['wall-b', 'wall-a', 'wall-b']);
    expect(grown.scale).toBe(1);
    expect(grown.anchor).toBe(INITIAL_MAX_ANCHOR - 1);
    expect(grown.destroyedGeometryIds).toEqual(['wall-a', 'wall-b']);
    const repeated = changeScale(grown, 1, ['wall-a', 'wall-c']);
    expect(repeated.destroyedGeometryIds).toEqual([
      'wall-a',
      'wall-b',
      'wall-c',
    ]);
    expect(JSON.parse(JSON.stringify(repeated))).toEqual(repeated);
    expect(
      createScaleState(repeated.position, {
        scale: repeated.scale,
        anchor: repeated.anchor,
        destroyedGeometryIds: repeated.destroyedGeometryIds,
      }).destroyedGeometryIds
    ).toEqual(repeated.destroyedGeometryIds);
  });

  test('does not add rubble for rejected growth or scale reduction', () => {
    const empty = createScaleState({ x: 0, y: 0 });
    expect(changeScale(empty, 2, ['wall'])).toBe(empty);
    const locked = createScaleState(
      { x: 0, y: 0 },
      { maximumUnlockedScale: 0 }
    );
    expect(changeScale(locked, 1, ['wall'])).toBe(locked);
    const emptyAnchor = createScaleState({ x: 0, y: 0 }, { anchor: 0 });
    expect(changeScale(emptyAnchor, 1, ['wall'])).toBe(emptyAnchor);
    const shrink = createScaleState({ x: 0, y: 0 }, { scale: 1 });
    expect(changeScale(shrink, -1, ['wall']).destroyedGeometryIds).toEqual([]);
  });

  test('grows through newly intersected canonical geometry and records rubble', () => {
    const state = createScaleState({ x: 0, y: 0 });
    const originalState = JSON.parse(JSON.stringify(state));
    const geometry = [
      {
        id: 'wall',
        bounds: {
          min: { x: 0.3, y: -0.3, z: 0 },
          max: { x: 0.8, y: 0.3, z: 3 },
        },
      },
      {
        id: 'touching',
        bounds: {
          min: { x: 0.6, y: -0.3, z: 0 },
          max: { x: 1, y: 0.3, z: 3 },
        },
      },
      {
        id: 'above',
        bounds: {
          min: { x: 0.3, y: -0.3, z: 6 },
          max: { x: 0.8, y: 0.3, z: 7 },
        },
      },
    ];
    const preview = previewGrowthDamageIds(state, geometry, 0.4);
    expect(preview).toEqual(['wall']);
    expect(state).toEqual(originalState);

    const grown = growThroughGeometry(state, geometry, 0.4);
    expect(grown.scale).toBe(1);
    expect(grown.anchor).toBe(INITIAL_MAX_ANCHOR - 1);
    expect(grown.position).toEqual(state.position);
    expect(grown.destroyedGeometryIds).toEqual(preview);
    expect(growThroughGeometry(state, [...geometry].reverse(), 0.4)).toEqual(
      grown
    );
  });

  test('retains damage when independently unloaded chunks reload after serialization', () => {
    const wall = {
      id: 'wall',
      bounds: {
        min: { x: 0.3, y: -0.3, z: 0 },
        max: { x: 0.8, y: 0.3, z: 3 },
      },
    };
    const stone = {
      id: 'stone',
      bounds: {
        min: { x: 2, y: 2, z: 0 },
        max: { x: 3, y: 3, z: 1 },
      },
    };
    const beam = {
      id: 'beam',
      bounds: {
        min: { x: -3, y: 2, z: 0 },
        max: { x: -2, y: 3, z: 1 },
      },
    };
    const remoteBeam = {
      id: 'remote-beam',
      bounds: {
        min: { x: -5, y: 4, z: 0 },
        max: { x: -4, y: 5, z: 1 },
      },
    };
    const firstChunk = [wall, stone];
    const secondChunk = [remoteBeam, beam];
    const originalGeometry = JSON.stringify([firstChunk, secondChunk]);
    const initial = createScaleState({ x: 0, y: 0 });
    const grown = growThroughGeometry(initial, firstChunk, 0.4);
    const reloadedFirstChunk = JSON.parse(JSON.stringify(firstChunk));
    const reloadedSecondChunk = JSON.parse(JSON.stringify(secondChunk));
    const restoredRecord = JSON.parse(JSON.stringify(grown));
    const restored = createScaleState(restoredRecord.position, {
      scale: restoredRecord.scale,
      anchor: restoredRecord.anchor,
      maximumAnchor: restoredRecord.maximumAnchor,
      minimumUnlockedScale: restoredRecord.minimumUnlockedScale,
      maximumUnlockedScale: restoredRecord.maximumUnlockedScale,
      destroyedGeometryIds: restoredRecord.destroyedGeometryIds,
    });
    const restoredStateBeforeProjection = JSON.stringify(restored);
    const adjacentChunk = projectGeometryForScale(
      restored,
      reloadedSecondChunk
    );
    const reorderedAdjacentChunk = projectGeometryForScale(
      restored,
      [...reloadedSecondChunk].reverse()
    );
    const restoredChunk = projectGeometryForScale(restored, reloadedFirstChunk);
    const finerScaleState = changeScale(restored, -1);
    const finerView = projectGeometryForScale(
      finerScaleState,
      reloadedFirstChunk
    );

    expect(adjacentChunk.geometry).toEqual([beam, remoteBeam]);
    expect(reorderedAdjacentChunk.geometry).toEqual(adjacentChunk.geometry);
    expect(restoredChunk.view.scale).toBe(1);
    expect(restoredChunk.geometry).toEqual([stone]);
    expect(finerView.view.scale).toBe(0);
    expect(finerView.geometry).toEqual(restoredChunk.geometry);
    expect(restoredChunk.geometry[0]).not.toBe(stone);
    expect(restoredChunk.geometry[0].bounds).not.toBe(stone.bounds);
    expect(JSON.stringify([firstChunk, secondChunk])).toBe(originalGeometry);
    expect(JSON.stringify([reloadedFirstChunk, reloadedSecondChunk])).toBe(
      originalGeometry
    );
    expect(JSON.stringify(restored)).toBe(restoredStateBeforeProjection);
    expect(projectGeometryForScale(restored, []).geometry).toEqual([]);
  });

  test('does not damage geometry when growth is unavailable or already collapsed', () => {
    const wall = {
      id: 'wall',
      bounds: {
        min: { x: 0.3, y: -0.3, z: 0 },
        max: { x: 0.8, y: 0.3, z: 3 },
      },
    };
    const locked = createScaleState(
      { x: 0, y: 0 },
      { maximumUnlockedScale: 0 }
    );
    expect(previewGrowthDamageIds(locked, [wall], 0.4)).toEqual([]);
    expect(growThroughGeometry(locked, [wall], 0.4)).toBe(locked);
    const emptyAnchor = createScaleState({ x: 0, y: 0 }, { anchor: 0 });
    expect(previewGrowthDamageIds(emptyAnchor, [wall], 0.4)).toEqual([]);
    expect(growThroughGeometry(emptyAnchor, [wall], 0.4)).toBe(emptyAnchor);
    const alreadyCollapsed = createScaleState(
      { x: 0, y: 0 },
      { destroyedGeometryIds: ['wall'] }
    );
    expect(previewGrowthDamageIds(alreadyCollapsed, [wall], 0.4)).toEqual([]);
    expect(
      growThroughGeometry(alreadyCollapsed, [wall], 0.4).destroyedGeometryIds
    ).toEqual(['wall']);
  });

  test('rejects invalid geometry bounds and body width', () => {
    const state = createScaleState({ x: 0, y: 0 });
    expect(() => growThroughGeometry(state, [], 0)).toThrow(RangeError);
    expect(() => growThroughGeometry(state, null, 0.4)).toThrow(TypeError);
    expect(() => growThroughGeometry(state, [null], 0.4)).toThrow(TypeError);
    expect(() =>
      growThroughGeometry(
        state,
        [
          {
            id: '',
            bounds: {
              min: { x: 0, y: 0, z: 0 },
              max: { x: 1, y: 1, z: 1 },
            },
          },
        ],
        0.4
      )
    ).toThrow(TypeError);
    expect(() => growThroughGeometry(state, [{ id: 'wall' }], 0.4)).toThrow(
      TypeError
    );
    expect(() =>
      growThroughGeometry(
        state,
        [{ id: 'wall', bounds: { min: { x: 1 }, max: { x: 2 } } }],
        0.4
      )
    ).toThrow(RangeError);
    expect(() =>
      growThroughGeometry(
        state,
        [{ id: 'wall', bounds: { min: {}, max: {} } }],
        0.4
      )
    ).toThrow(RangeError);
    const duplicateWall = {
      id: 'wall',
      bounds: {
        min: { x: 1, y: 1, z: 0 },
        max: { x: 2, y: 2, z: 1 },
      },
    };
    expect(() =>
      growThroughGeometry(state, [duplicateWall, duplicateWall], 0.4)
    ).toThrow(RangeError);
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
      createScaleState({ x: 0, y: 0 }, { destroyedGeometryIds: [''] })
    ).toThrow(TypeError);
    expect(() =>
      createScaleState({ x: 0, y: 0 }, { destroyedGeometryIds: 'wall' })
    ).toThrow(TypeError);
    expect(() =>
      changeScale({ ...createScaleState({ x: 0, y: 0 }), anchor: 9 }, 1)
    ).toThrow(RangeError);
    expect(() =>
      changeScale(
        { ...createScaleState({ x: 0, y: 0 }), recoveryProgressMinutes: -1 },
        1
      )
    ).toThrow(RangeError);
    expect(() =>
      changeScale(
        {
          ...createScaleState({ x: 0, y: 0 }),
          destroyedGeometryIds: ['b', 'a'],
        },
        1
      )
    ).toThrow(RangeError);
  });
});
