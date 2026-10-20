import {
  createThreefoldSiltMarginScene,
  normalizeThreefoldSiltMarginState,
} from '../../../../src/core/browser/game/threefold/silt-margin.js';
import { createThreefoldSiltMarginWaterPuzzle } from '../../../../src/core/browser/game/threefold/silt-margin-water.js';
import { createThreefoldSluiceScene } from '../../../../src/core/browser/game/threefold/sluice-scene.js';
import {
  createThreefoldSimulationSaveStore,
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/save.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';

const CRISIS_THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

/**
 *
 */
/**
 * Create a fresh Silt Margin simulation for regression coverage.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Test simulation.
 */
function createSiltMarginRun() {
  return createThreefoldSimulation(
    CRISIS_THRESHOLDS,
    createThreefoldSiltMarginScene()
  );
}

describe('THREEFOLD Silt Margin crossing', () => {
  test('starts at the authored physical scale and renders a shared snapped frame', () => {
    const state = createSiltMarginRun();
    const position = { ...state.player.position };
    const frame = renderThreefoldFrame(state);

    expect(state.scene.id).toBe('silt-margin');
    expect(state.player.scale).toBe(-4);
    expect(frame.threefold.heightMeters * 100).toBeCloseTo(2.26, 2);
    expect(frame.presentation.status).toContain('MARA 2.26 CM');
    expect(frame.quest).toBe('The Silt Margin');
    expect(frame.threefold).toMatchObject({
      guardian: 'present',
      signal: 'blocked',
      rootArchBroken: false,
      siltMarginWater: {
        upstreamSurfaceElevationMeters: 0.04,
        downstreamSurfaceElevationMeters: 0,
        valveOpen: false,
        crossingAvailable: false,
      },
      growthPreviewGeometryIds: ['silt-margin-root-arch'],
      growthPreviewCreatureIds: ['silt-margin-guardian'],
    });
    expect(
      frame.shapes.every(shape => shape.x % 8 === 0 && shape.y % 8 === 0)
    ).toBe(true);
    expect(
      frame.shapes
        .filter(shape => shape.type === 'rect')
        .every(shape => shape.width % 8 === 0 && shape.height % 8 === 0)
    ).toBe(true);
    expect(state.player.position).toEqual(position);

    const moved = stepThreefoldSimulation(state, {
      type: 'move',
      direction: 'right',
    });
    expect(moved.player.position.x).toBeGreaterThan(position.x);
    expect(moved.player.position.x).toBeCloseTo(0.13050864197530865, 12);
    expect(moved.player.position.x).not.toBe(0.131);
    renderThreefoldFrame(moved);
    expect(moved.player.position.x).not.toBe(position.x);
  });

  test('guides the guardian aside and sends the signal after reaching its root', () => {
    let state = createSiltMarginRun();
    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.siltMargin).toMatchObject({
      guardian: 'guided-aside',
      signal: 'blocked',
    });
    expect(
      renderThreefoldFrame(state).threefold.growthPreviewCreatureIds
    ).toEqual([]);

    state = stepThreefoldSimulation(state, { type: 'interact' });
    expect(state.siltMargin.waterPuzzle.port.open).toBe(true);
    expect(
      state.siltMargin.waterPuzzle.chambers[0].volumeCubicMeters
    ).toBeLessThan(0.00004);
    state = stepThreefoldSimulation(state, {
      type: 'wait',
      elapsedGameMinutes: 1,
    });
    expect(
      renderThreefoldFrame(state).threefold.siltMarginWater.crossingAvailable
    ).toBe(true);

    for (let step = 0; step < 46; step += 1)
      state = stepThreefoldSimulation(state, {
        type: 'move',
        direction: 'right',
      });
    state = stepThreefoldSimulation(state, { type: 'interact' });

    expect(state.siltMargin).toMatchObject({
      guardian: 'guided-aside',
      signal: 'sent',
    });
    expect(renderThreefoldFrame(state).threefold.signal).toBe('sent');
    expect(state.encounter.growthDeaths).toBeUndefined();
    expect(state.elapsedGameSeconds).toBe(795);
  });

  test('blocks the rivulet before diversion and growth breaks the root arch as a second solution', () => {
    let state = createSiltMarginRun();
    for (let step = 0; step < 20; step += 1)
      state = stepThreefoldSimulation(state, {
        type: 'move',
        direction: 'right',
      });
    expect(state.player.position.x).toBeLessThan(0.16);

    let sideRoute = createSiltMarginRun();
    for (let step = 0; step < 30; step += 1)
      sideRoute = stepThreefoldSimulation(sideRoute, {
        type: 'move',
        direction: 'down',
      });
    expect(sideRoute.player.position.y).toBeGreaterThan(0.12);
    for (let step = 0; step < 20; step += 1)
      sideRoute = stepThreefoldSimulation(sideRoute, {
        type: 'move',
        direction: 'right',
      });
    expect(sideRoute.player.position.x).toBeLessThan(0.16);

    state = createSiltMarginRun();
    state = stepThreefoldSimulation(state, { type: 'grow' });

    expect(state.player.scale).toBe(-3);
    expect(state.player.destroyedGeometryIds).toContain(
      'silt-margin-root-arch'
    );
    expect(state.siltMargin).toMatchObject({
      guardian: 'killed',
      signal: 'disrupted',
    });
    expect(state.encounter.growthDeaths).toEqual([
      { creatureId: 'silt-margin-guardian', cause: 'growth' },
    ]);
    expect(
      renderThreefoldFrame(state).threefold.growthPreviewCreatureIds
    ).toEqual([]);
    expect(renderThreefoldFrame(state).threefold.rootArchBroken).toBe(true);
    expect(
      stepThreefoldSimulation(state, { type: 'move', direction: 'right' })
        .player.position.x
    ).toBeGreaterThan(state.player.position.x);
    expect(
      restoreThreefoldSimulation(serializeThreefoldSimulation(state))
    ).toEqual(state);
  });

  test('does not repeat guardian consequences or send a disrupted signal', () => {
    let state = createSiltMarginRun();
    state = stepThreefoldSimulation(state, { type: 'grow' });
    const growthDeaths = state.encounter.growthDeaths;
    state = stepThreefoldSimulation(state, { type: 'grow' });

    expect(state.siltMargin).toMatchObject({
      guardian: 'killed',
      signal: 'disrupted',
    });
    expect(state.encounter.growthDeaths).toEqual(growthDeaths);

    for (let step = 0; step < 46; step += 1)
      state = stepThreefoldSimulation(state, {
        type: 'move',
        direction: 'right',
      });
    const interaction = stepThreefoldSimulation(state, { type: 'interact' });
    expect(interaction.siltMargin.signal).toBe('disrupted');
  });

  test('rejects a saved sent signal while the crossing remains flooded', () => {
    expect(() =>
      normalizeThreefoldSiltMarginState({
        guardian: 'guided-aside',
        signal: 'sent',
        waterPuzzle: createThreefoldSiltMarginWaterPuzzle({
          crossingOpen: false,
        }),
      })
    ).toThrow('The Choir signal cannot be sent across a flooded crossing.');
  });

  test('migrates schema-v1 branches and rejects non-conserved dew saves', () => {
    expect(
      normalizeThreefoldSiltMarginState({
        guardian: 'guided-aside',
        signal: 'blocked',
      })
    ).toMatchObject({ guardian: 'guided-aside', signal: 'blocked' });
    expect(
      normalizeThreefoldSiltMarginState({
        guardian: 'guided-aside',
        signal: 'sent',
      })
    ).toMatchObject({ guardian: 'guided-aside', signal: 'sent' });
    expect(() => normalizeThreefoldSiltMarginState(null)).toThrow(
      'Silt Margin state is invalid.'
    );

    const envelope = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    expect(envelope.schemaVersion).toBe(2);
    envelope.schemaVersion = 1;
    delete envelope.state.siltMargin.waterPuzzle;
    const migrated = restoreThreefoldSimulation(JSON.stringify(envelope));
    expect(migrated.siltMargin.waterPuzzle.chambers[0].volumeCubicMeters).toBe(
      0.00004
    );

    const completedLegacy = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    completedLegacy.schemaVersion = 1;
    completedLegacy.state.siltMargin.guardian = 'guided-aside';
    completedLegacy.state.siltMargin.signal = 'sent';
    delete completedLegacy.state.siltMargin.waterPuzzle;
    const restoredSignal = restoreThreefoldSimulation(
      JSON.stringify(completedLegacy)
    );
    expect(restoredSignal.siltMargin.signal).toBe('sent');
    expect(
      renderThreefoldFrame(restoredSignal).threefold.siltMarginWater
        .crossingAvailable
    ).toBe(true);

    const unsupportedVersion = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    unsupportedVersion.schemaVersion = 3;
    expect(
      restoreThreefoldSimulation(JSON.stringify(unsupportedVersion))
    ).toBeNull();

    const invalidWater = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    invalidWater.state.siltMargin.waterPuzzle.chambers[0].volumeCubicMeters = 0.000039;
    expect(restoreThreefoldSimulation(JSON.stringify(invalidWater))).toBeNull();
  });

  test('advances only supported commands and explicit waits on the region clock', () => {
    const initial = createSiltMarginRun();
    expect(stepThreefoldSimulation(initial, { type: 'unsupported' })).toBe(
      initial
    );
    expect(stepThreefoldSimulation(initial, { type: 'wait' })).toBe(initial);

    const attemptedShrink = stepThreefoldSimulation(initial, {
      type: 'shrink',
    });
    expect(attemptedShrink.player.scale).toBe(-4);
    expect(attemptedShrink.elapsedGameSeconds).toBe(15);
    const waited = stepThreefoldSimulation(attemptedShrink, {
      type: 'wait',
      elapsedGameMinutes: 0.5,
    });
    expect(waited.elapsedGameSeconds).toBe(45);
    expect(waited.crisis.elapsedMinutes).toBe(0);
  });

  test('rejects impossible saved branch combinations', () => {
    const envelope = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    envelope.state.siltMargin = { guardian: 'killed', signal: 'sent' };
    expect(restoreThreefoldSimulation(JSON.stringify(envelope))).toBeNull();

    const missingEncounter = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    delete missingEncounter.state.encounter;
    expect(
      restoreThreefoldSimulation(JSON.stringify(missingEncounter))
    ).toBeNull();

    const invalidElapsed = JSON.parse(
      serializeThreefoldSimulation(createSiltMarginRun())
    );
    invalidElapsed.state.elapsedGameSeconds = -1;
    expect(
      restoreThreefoldSimulation(JSON.stringify(invalidElapsed))
    ).toBeNull();
  });

  test('isolates Silt Margin saves from the gate and Archive saves', () => {
    const values = new Map();
    const storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    };
    const gateStore = createThreefoldSimulationSaveStore(
      storage,
      'broken-gate'
    );
    const archiveStore = createThreefoldSimulationSaveStore(
      storage,
      'small-world-sluice'
    );
    const siltStore = createThreefoldSimulationSaveStore(
      storage,
      'silt-margin'
    );

    gateStore.save(createThreefoldSimulation(CRISIS_THRESHOLDS));
    archiveStore.save(
      createThreefoldSimulation(CRISIS_THRESHOLDS, createThreefoldSluiceScene())
    );
    siltStore.save(createSiltMarginRun());

    expect(values.size).toBe(3);
    expect(gateStore.load().scene.id).toBe('broken-gate');
    expect(archiveStore.load().scene.id).toBe('small-world-sluice');
    expect(siltStore.load().scene.id).toBe('silt-margin');
  });
});
