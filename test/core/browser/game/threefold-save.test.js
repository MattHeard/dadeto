import {
  createScaleState,
  recoverAnchor,
} from '../../../../src/core/browser/game/threefold/spatial.js';
import {
  restoreThreefoldScaleSave,
  serializeThreefoldScaleSave,
} from '../../../../src/core/browser/game/threefold/save.js';

describe('THREEFOLD scale-state save codec', () => {
  test('roundtrips progression, partial recovery, canonical coordinates, and rubble', () => {
    const state = createScaleState(
      { x: -12.25, y: 0.125 },
      {
        scale: -1,
        anchor: 4,
        maximumAnchor: 7,
        minimumUnlockedScale: -2,
        maximumUnlockedScale: 2,
        recoveryProgressMinutes: 27,
        destroyedGeometryIds: ['wall-b', 'wall-a', 'wall-b'],
      }
    );
    const serialized = serializeThreefoldScaleSave(state);
    const envelope = JSON.parse(serialized);

    expect(envelope.game).toBe('threefold');
    expect(envelope.schemaVersion).toBe(1);
    expect(restoreThreefoldScaleSave(serialized)).toEqual(state);
    expect(
      recoverAnchor(restoreThreefoldScaleSave(serialized), 3, 30, {
        inCombat: false,
      })
    ).toEqual({
      ...state,
      anchor: 5,
      recoveryProgressMinutes: 0,
    });
  });

  test('canonicalizes unordered rubble IDs when importing a valid envelope', () => {
    const state = createScaleState({ x: 1, y: 2 });
    const envelope = JSON.parse(serializeThreefoldScaleSave(state));
    envelope.state.destroyedGeometryIds = ['wall-z', 'wall-a'];

    expect(
      restoreThreefoldScaleSave(JSON.stringify(envelope)).destroyedGeometryIds
    ).toEqual(['wall-a', 'wall-z']);
  });

  test('rejects malformed exports, unsupported versions, and invalid state', () => {
    const valid = JSON.parse(
      serializeThreefoldScaleSave(createScaleState({ x: 0, y: 0 }))
    );
    expect(restoreThreefoldScaleSave(null)).toBeNull();
    expect(restoreThreefoldScaleSave(4)).toBeNull();
    expect(restoreThreefoldScaleSave('{')).toBeNull();
    expect(restoreThreefoldScaleSave(JSON.stringify(null))).toBeNull();
    expect(
      restoreThreefoldScaleSave(JSON.stringify({ ...valid, game: 'other' }))
    ).toBeNull();
    expect(
      restoreThreefoldScaleSave(JSON.stringify({ ...valid, schemaVersion: 2 }))
    ).toBeNull();
    expect(
      restoreThreefoldScaleSave(JSON.stringify({ ...valid, state: null }))
    ).toBeNull();
    expect(
      restoreThreefoldScaleSave(
        JSON.stringify({ ...valid, state: { ...valid.state, scale: 5 } })
      )
    ).toBeNull();
    expect(
      restoreThreefoldScaleSave(
        JSON.stringify({
          ...valid,
          state: { ...valid.state, destroyedGeometryIds: [''] },
        })
      )
    ).toBeNull();
  });
});
