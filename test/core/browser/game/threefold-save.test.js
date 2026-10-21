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
import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
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
    expect(
      JSON.parse(serializeThreefoldSimulation(simulation)).schemaVersion
    ).toBe(6);
  });

  test('migrates a schema-v1 run with an intact rat and rejects incomplete v2', () => {
    const legacy = JSON.parse(
      serializeThreefoldSimulation(createThreefoldSimulation(CRISIS_THRESHOLDS))
    );
    legacy.schemaVersion = 1;
    delete legacy.state.encounter;

    expect(
      restoreThreefoldSimulation(JSON.stringify(legacy)).encounter
    ).toEqual({ ratFate: 'present', ratAction: null });

    const incomplete = { ...legacy, schemaVersion: 2 };
    expect(restoreThreefoldSimulation(JSON.stringify(incomplete))).toBeNull();
  });

  test.each([
    ['present', null],
    ['repelled', 'fight'],
    ['bypassed', 'bypass'],
    ['killed', 'fight'],
    ['killed', 'growth'],
  ])('roundtrips rat fate %s from %s', (ratFate, ratAction) => {
    const simulation = createThreefoldSimulation(CRISIS_THRESHOLDS);
    simulation.encounter = { ratFate, ratAction };

    expect(
      restoreThreefoldSimulation(serializeThreefoldSimulation(simulation))
    ).toEqual(simulation);
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

  test('roundtrips partial and complete passenger rescues and later ferry loss', () => {
    const initial = createThreefoldSimulation(CRISIS_THRESHOLDS);
    const atMooring = {
      ...initial,
      player: createScaleState(initial.scene.interactables[0].position),
    };
    const partial = stepThreefoldSimulation(atMooring, { type: 'interact' });
    const restoredPartial = restoreThreefoldSimulation(
      serializeThreefoldSimulation(partial)
    );
    const rescued = stepThreefoldSimulation(restoredPartial, {
      type: 'interact',
    });
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
    expect(restoredPartial.episode.passengers).toBe('partial');
    expect(restoredRescue.episode).toMatchObject({
      passengers: 'evacuated',
      ferry: 'afloat',
      latchfolk: 'unwarned',
    });
    expect(restoredSurge).toEqual(surge);
    expect(restoredSurge.episode).toMatchObject({
      passengers: 'evacuated',
      ferry: 'lost',
      latchfolk: 'lost',
    });
  });

  test('roundtrips a partial rescue through surge without restoring the lost group', () => {
    const initial = createThreefoldSimulation(CRISIS_THRESHOLDS);
    const atMooring = {
      ...initial,
      player: createScaleState(initial.scene.interactables[0].position),
    };
    const partial = stepThreefoldSimulation(atMooring, { type: 'interact' });
    const restoredPartial = restoreThreefoldSimulation(
      serializeThreefoldSimulation(partial)
    );
    const surge = stepThreefoldSimulation(restoredPartial, {
      type: 'wait',
      elapsedGameMinutes: 9,
    });
    const restoredSurge = restoreThreefoldSimulation(
      serializeThreefoldSimulation(surge)
    );

    expect(restoredPartial.episode.passengers).toBe('partial');
    expect(restoredSurge.episode).toMatchObject({
      passengers: 'partial',
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
    expect(restoredSurge.episode).toMatchObject({
      passengers: 'lost',
      ferry: 'lost',
      latchfolk: 'safe',
    });
  });

  test('roundtrips withdrawal after the unattended storm settles', () => {
    const initial = createThreefoldSimulation(CRISIS_THRESHOLDS);
    const road = initial.scene.interactables.find(
      item => item.id === 'upland-road-exit'
    );
    const atRoad = {
      ...initial,
      player: createScaleState(road.position),
    };
    const withdrawn = stepThreefoldSimulation(atRoad, {
      type: 'interact',
    });

    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(withdrawn)
    );

    expect(withdrawn.crisis.stage).toBe('aftermath');
    expect(withdrawn.episode.withdrawn).toBe(true);
    expect(restored).toEqual(withdrawn);

    const legacyWithdrawal = JSON.parse(
      serializeThreefoldSimulation(withdrawn)
    );
    delete legacyWithdrawal.state.episode.closedBy;
    expect(
      restoreThreefoldSimulation(JSON.stringify(legacyWithdrawal)).episode
    ).toMatchObject({ withdrawn: true, closedBy: 'departed' });
  });

  test('roundtrips station rubble and report closure', () => {
    const scene = createBrokenGateScene();
    const console = scene.interactables.find(
      item => item.id === 'signal-station-console'
    );
    let simulation = createThreefoldSimulation(CRISIS_THRESHOLDS, scene);
    simulation = {
      ...simulation,
      player: createScaleState(console.position),
    };
    simulation = stepThreefoldSimulation(simulation, { type: 'grow' });
    expect(simulation.player.destroyedGeometryIds).toContain('signal-station');
    simulation = stepThreefoldSimulation(simulation, {
      type: 'wait',
      elapsedGameMinutes: CRISIS_THRESHOLDS.aftermathAtMinutes,
    });
    const rubbleSave = serializeThreefoldSimulation(simulation);
    expect(restoreThreefoldSimulation(rubbleSave)).toEqual(simulation);

    const intactScene = createBrokenGateScene();
    const stationConsole = intactScene.interactables.find(
      item => item.id === 'signal-station-console'
    );
    const intact = {
      ...createThreefoldSimulation(CRISIS_THRESHOLDS, intactScene),
      player: createScaleState(stationConsole.position),
    };
    const aftermath = stepThreefoldSimulation(intact, {
      type: 'wait',
      elapsedGameMinutes: CRISIS_THRESHOLDS.aftermathAtMinutes,
    });
    const reported = stepThreefoldSimulation(aftermath, { type: 'interact' });
    expect(reported.episode.closedBy).toBe('reported');
    expect(
      restoreThreefoldSimulation(serializeThreefoldSimulation(reported))
    ).toEqual(reported);

    const lostScene = createBrokenGateScene();
    const road = lostScene.interactables.find(
      item => item.id === 'upland-road-exit'
    );
    let departed = createThreefoldSimulation(CRISIS_THRESHOLDS, lostScene);
    departed = {
      ...departed,
      player: createScaleState(road.position, {
        destroyedGeometryIds: ['signal-station'],
      }),
    };
    departed = stepThreefoldSimulation(departed, {
      type: 'wait',
      elapsedGameMinutes: CRISIS_THRESHOLDS.aftermathAtMinutes,
    });
    departed = stepThreefoldSimulation(departed, { type: 'interact' });
    expect(departed.episode.closedBy).toBe('departed');
    expect(
      restoreThreefoldSimulation(serializeThreefoldSimulation(departed))
    ).toEqual(departed);
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
    ).toMatchObject({
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
    ).toMatchObject({
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
    state => ({
      ...state,
      episode: { ...state.episode, withdrawn: true },
    }),
    state => ({
      ...state,
      episode: { ...state.episode, closedBy: 'reported' },
    }),
    state => ({
      ...state,
      episode: {
        ...state.episode,
        passengers: 'lost',
        ferry: 'lost',
        latchfolk: 'lost',
        gateRepaired: true,
      },
    }),
    state => ({
      ...state,
      player: { ...state.player, destroyedGeometryIds: ['relief-gate'] },
      crisis: { ...state.crisis, elapsedMinutes: 9, stage: 'surge' },
      episode: {
        ...state.episode,
        passengers: 'lost',
        ferry: 'lost',
        latchfolk: 'lost',
        gateRepaired: true,
      },
    }),
    state => ({
      ...state,
      player: { ...state.player, destroyedGeometryIds: ['signal-station'] },
      crisis: { ...state.crisis, elapsedMinutes: 15, stage: 'aftermath' },
      episode: {
        ...state.episode,
        passengers: 'lost',
        ferry: 'lost',
        latchfolk: 'lost',
        closedBy: 'reported',
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
    expect(values.size).toBe(1);
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

describe('THREEFOLD save migration', () => {
  test('defaults a schema-v3 save without growth deaths to no additional deaths', () => {
    const legacyV3 = JSON.parse(
      serializeThreefoldSimulation(createThreefoldSimulation(CRISIS_THRESHOLDS))
    );
    legacyV3.schemaVersion = 3;
    delete legacyV3.state.encounter.growthDeaths;

    expect(legacyV3.schemaVersion).toBe(3);
    expect(
      restoreThreefoldSimulation(JSON.stringify(legacyV3)).encounter
    ).toEqual({ ratFate: 'present', ratAction: null });
  });

  test('migrates schema-v1 rat state and rejects malformed schema-v3 state', () => {
    const legacy = JSON.parse(
      serializeThreefoldSimulation(createThreefoldSimulation(CRISIS_THRESHOLDS))
    );
    legacy.schemaVersion = 1;
    delete legacy.state.encounter;

    expect(
      restoreThreefoldSimulation(JSON.stringify(legacy)).encounter
    ).toEqual({ ratFate: 'present', ratAction: null });

    const missingEncounter = { ...legacy, schemaVersion: 3 };
    expect(
      restoreThreefoldSimulation(JSON.stringify(missingEncounter))
    ).toBeNull();

    const invalidEncounter = {
      ...missingEncounter,
      state: {
        ...missingEncounter.state,
        encounter: { ratFate: 'unknown', ratAction: null },
      },
    };
    expect(
      restoreThreefoldSimulation(JSON.stringify(invalidEncounter))
    ).toBeNull();

    const missingAction = {
      ...missingEncounter,
      state: {
        ...missingEncounter.state,
        encounter: { ratFate: 'present' },
      },
    };
    expect(
      restoreThreefoldSimulation(JSON.stringify(missingAction))
    ).toBeNull();

    const inconsistentAction = {
      ...missingEncounter,
      state: {
        ...missingEncounter.state,
        encounter: { ratFate: 'bypassed', ratAction: 'fight' },
      },
    };
    expect(
      restoreThreefoldSimulation(JSON.stringify(inconsistentAction))
    ).toBeNull();
  });

  test.each([
    ['present', null],
    ['repelled', 'fight'],
    ['bypassed', 'bypass'],
    ['killed', 'fight'],
  ])(
    'migrates schema-v2 rat fate %s with its original cause',
    (ratFate, ratAction) => {
      const legacy = JSON.parse(
        serializeThreefoldSimulation(
          createThreefoldSimulation(CRISIS_THRESHOLDS)
        )
      );
      legacy.schemaVersion = 2;
      legacy.state.encounter = { ratFate };

      expect(
        restoreThreefoldSimulation(JSON.stringify(legacy)).encounter
      ).toEqual({ ratFate, ratAction });
    }
  );
});
