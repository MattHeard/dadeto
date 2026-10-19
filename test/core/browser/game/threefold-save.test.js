import {
  createScaleState,
  recoverAnchor,
} from '../../../../src/core/browser/game/threefold/spatial.js';
import {
  createThreefoldScaleSaveStore,
  createThreefoldSimulationSaveStore,
  restoreThreefoldSimulation,
  restoreThreefoldScaleSave,
  serializeThreefoldSimulation,
  serializeThreefoldScaleSave,
} from '../../../../src/core/browser/game/threefold/save.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';

const CRISIS_THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

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

  test('persists complete state through the injected storage boundary', () => {
    const record = new Map();
    const storage = {
      getItem: key => record.get(key) ?? null,
      setItem: (key, value) => record.set(key, value),
      removeItem: key => record.delete(key),
    };
    const store = createThreefoldScaleSaveStore(storage);
    const state = createScaleState(
      { x: 4.5, y: -9 },
      {
        scale: 2,
        anchor: 3,
        recoveryProgressMinutes: 12,
        destroyedGeometryIds: ['root'],
      }
    );

    expect(store.save(state)).toBe(true);
    expect(store.load()).toEqual(state);
    expect(record.size).toBe(1);
    expect(store.clear()).toBe(true);
    expect(store.load()).toBeNull();
    expect(record.size).toBe(0);
  });

  test('fails safely for missing, corrupt, and throwing storage', () => {
    const missing = createThreefoldScaleSaveStore(null);
    expect(missing.load()).toBeNull();
    expect(missing.save(createScaleState({ x: 0, y: 0 }))).toBe(false);
    expect(missing.clear()).toBe(false);

    const corrupt = createThreefoldScaleSaveStore({
      getItem: () => '{invalid',
      setItem: () => {},
    });
    expect(corrupt.load()).toBeNull();
    expect(corrupt.clear()).toBe(false);

    const throwing = createThreefoldScaleSaveStore({
      getItem: () => {
        throw new Error('storage read failed');
      },
      setItem: () => {
        throw new Error('storage write failed');
      },
      removeItem: () => {
        throw new Error('storage remove failed');
      },
    });
    expect(throwing.load()).toBeNull();
    expect(throwing.save(createScaleState({ x: 0, y: 0 }))).toBe(false);
    expect(throwing.clear()).toBe(false);
  });
});

describe('THREEFOLD complete-run save codec', () => {
  test('roundtrips scale progress, collapsed geometry, and crisis stage', () => {
    let simulation = createThreefoldSimulation(CRISIS_THRESHOLDS);
    simulation = stepThreefoldSimulation(simulation, { type: 'grow' });
    simulation = stepThreefoldSimulation(simulation, {
      type: 'wait',
      elapsedGameMinutes: 9,
    });
    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(simulation)
    );

    expect(restored).toEqual(simulation);
    expect(restored.player.destroyedGeometryIds).toContain(
      'gatehouse-west-wall'
    );
    expect(restored.crisis.stage).toBe('surge');
    expect(restored.crisis.elapsedMinutes).toBe(9.25);
  });

  test('canonicalizes unordered destroyed geometry IDs on restore', () => {
    const simulation = createThreefoldSimulation(CRISIS_THRESHOLDS);
    const envelope = JSON.parse(serializeThreefoldSimulation(simulation));
    envelope.state.player.destroyedGeometryIds = ['wall-z', 'wall-a'];

    expect(
      restoreThreefoldSimulation(JSON.stringify(envelope)).player
        .destroyedGeometryIds
    ).toEqual(['wall-a', 'wall-z']);
  });

  test('roundtrips evacuated passengers and their later ferry loss', () => {
    const initial = createThreefoldSimulation(CRISIS_THRESHOLDS);
    const atMooring = {
      ...initial,
      player: createScaleState(initial.scene.interactables[0].position),
    };
    const rescued = stepThreefoldSimulation(atMooring, { type: 'interact' });
    const restoredRescue = restoreThreefoldSimulation(
      serializeThreefoldSimulation(rescued)
    );
    const surge = stepThreefoldSimulation(rescued, {
      type: 'wait',
      elapsedGameMinutes: 9,
    });
    const restoredSurge = restoreThreefoldSimulation(
      serializeThreefoldSimulation(surge)
    );

    expect(restoredRescue).toEqual(rescued);
    expect(restoredRescue.episode).toEqual({
      passengers: 'evacuated',
      ferry: 'afloat',
      latchfolk: 'unwarned',
    });
    expect(restoredSurge).toEqual(surge);
    expect(restoredSurge.episode).toEqual({
      passengers: 'evacuated',
      ferry: 'lost',
      latchfolk: 'lost',
    });
  });

  test('roundtrips the Latchfolk warning and their safe surge outcome', () => {
    const initial = createThreefoldSimulation(CRISIS_THRESHOLDS);
    const watchkeeper = initial.scene.interactables.find(
      item => item.id === 'latchfolk-watchkeeper'
    );
    const atWatchkeeper = {
      ...initial,
      player: createScaleState(watchkeeper.position),
    };
    const warned = stepThreefoldSimulation(atWatchkeeper, {
      type: 'interact',
    });
    const restoredWarning = restoreThreefoldSimulation(
      serializeThreefoldSimulation(warned)
    );
    const surge = stepThreefoldSimulation(warned, {
      type: 'wait',
      elapsedGameMinutes: 9,
    });
    const restoredSurge = restoreThreefoldSimulation(
      serializeThreefoldSimulation(surge)
    );

    expect(restoredWarning).toEqual(warned);
    expect(restoredWarning.episode.latchfolk).toBe('warned');
    expect(restoredSurge).toEqual(surge);
    expect(restoredSurge.episode).toEqual({
      passengers: 'lost',
      ferry: 'lost',
      latchfolk: 'safe',
    });
  });

  test('migrates existing saves without episode state from their crisis stage', () => {
    const initial = createThreefoldSimulation(CRISIS_THRESHOLDS);
    const oldSave = JSON.parse(serializeThreefoldSimulation(initial));
    delete oldSave.state.episode;
    expect(restoreThreefoldSimulation(JSON.stringify(oldSave))).toEqual(
      initial
    );

    const lateSave = JSON.parse(serializeThreefoldSimulation(initial));
    lateSave.state.crisis = {
      ...lateSave.state.crisis,
      elapsedMinutes: 9,
      stage: 'surge',
    };
    delete lateSave.state.episode;
    expect(
      restoreThreefoldSimulation(JSON.stringify(lateSave)).episode
    ).toEqual({
      passengers: 'lost',
      ferry: 'lost',
      latchfolk: 'lost',
    });

    const priorEpisodeSave = JSON.parse(serializeThreefoldSimulation(initial));
    priorEpisodeSave.state.episode = {
      passengers: 'aboard',
      ferry: 'afloat',
    };
    expect(
      restoreThreefoldSimulation(JSON.stringify(priorEpisodeSave)).episode
    ).toEqual(initial.episode);

    const latePriorEpisodeSave = JSON.parse(
      serializeThreefoldSimulation(initial)
    );
    latePriorEpisodeSave.state.crisis = {
      ...latePriorEpisodeSave.state.crisis,
      elapsedMinutes: 9,
      stage: 'surge',
    };
    latePriorEpisodeSave.state.episode = {
      passengers: 'aboard',
      ferry: 'afloat',
    };
    expect(
      restoreThreefoldSimulation(JSON.stringify(latePriorEpisodeSave)).episode
    ).toEqual({
      passengers: 'lost',
      ferry: 'lost',
      latchfolk: 'lost',
    });
  });

  test.each([
    null,
    undefined,
    8,
    '{',
    'null',
    { game: 'other', schemaVersion: 1 },
    { game: 'threefold', schemaVersion: 2 },
    { game: 'threefold', schemaVersion: 1, sceneId: 'other' },
    { game: 'threefold', schemaVersion: 1, sceneId: 'broken-gate' },
  ])('rejects malformed or unsupported run saves %p', input => {
    const serialized =
      typeof input === 'string' || input === null || input === undefined
        ? input
        : JSON.stringify(input);
    expect(restoreThreefoldSimulation(serialized)).toBeNull();
  });

  test.each([
    state => ({ ...state, player: null }),
    state => ({
      ...state,
      player: { ...state.player, scale: 7 },
    }),
    state => ({
      ...state,
      crisis: { ...state.crisis, stage: 'surge' },
    }),
    state => ({
      ...state,
      crisis: { ...state.crisis, elapsedMinutes: 16 },
    }),
    state => ({
      ...state,
      crisis: {
        ...state.crisis,
        thresholds: {
          urgentAtMinutes: 9,
          surgeAtMinutes: 4,
          aftermathAtMinutes: 15,
        },
      },
    }),
    state => ({
      ...state,
      episode: { passengers: 'unknown', ferry: 'afloat' },
    }),
    state => ({
      ...state,
      episode: {
        passengers: 'aboard',
        ferry: 'afloat',
        latchfolk: 'unknown',
      },
    }),
  ])('rejects invalid player or inconsistent crisis state', mutate => {
    const valid = JSON.parse(
      serializeThreefoldSimulation(createThreefoldSimulation(CRISIS_THRESHOLDS))
    );
    valid.state = mutate(valid.state);
    expect(restoreThreefoldSimulation(JSON.stringify(valid))).toBeNull();
  });

  test('stores and restores a complete run through the injected boundary', () => {
    const values = new Map();
    const storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    };
    const store = createThreefoldSimulationSaveStore(storage);
    const simulation = createThreefoldSimulation(CRISIS_THRESHOLDS);

    expect(store.save(simulation)).toBe(true);
    expect(store.load()).toEqual(simulation);
    expect(values.size).toBe(1);
    expect(store.clear()).toBe(true);
    expect(store.load()).toBeNull();
    expect(values.size).toBe(0);
  });

  test('fails safely when complete-run storage is missing, corrupt, or throws', () => {
    const missing = createThreefoldSimulationSaveStore(null);
    expect(missing.load()).toBeNull();
    expect(missing.save(createThreefoldSimulation(CRISIS_THRESHOLDS))).toBe(
      false
    );
    expect(missing.clear()).toBe(false);

    const corrupt = createThreefoldSimulationSaveStore({
      getItem: () => '{invalid',
      setItem: () => {},
    });
    expect(corrupt.load()).toBeNull();
    expect(corrupt.clear()).toBe(false);

    const throwing = createThreefoldSimulationSaveStore({
      getItem: () => {
        throw new Error('storage read failed');
      },
      setItem: () => {
        throw new Error('storage write failed');
      },
      removeItem: () => {
        throw new Error('storage remove failed');
      },
    });
    expect(throwing.load()).toBeNull();
    expect(throwing.save(createThreefoldSimulation(CRISIS_THRESHOLDS))).toBe(
      false
    );
    expect(throwing.clear()).toBe(false);
  });
});
