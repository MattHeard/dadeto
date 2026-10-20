import {
  createThreefoldSluiceScene,
  THREEFOLD_SLUICE_SCENE_ID,
} from '../../../../src/core/browser/game/threefold/sluice-scene.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
import {
  createThreefoldSimulationSaveStore,
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/save.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';
import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';
import { createScaleState } from '../../../../src/core/browser/game/threefold/spatial.js';

const CRISIS_THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

describe('THREEFOLD playable small-world sluice', () => {
  test('authors a separate bounded chamber with an isolated crossing barrier', () => {
    const first = createThreefoldSluiceScene();
    const second = createThreefoldSluiceScene();

    expect(first).toMatchObject({
      id: THREEFOLD_SLUICE_SCENE_ID,
      bounds: { min: { x: 0, y: 0 }, max: { x: 6, y: 4.5 } },
      spawn: { scale: -2 },
      interactables: [{ id: 'sluice-service-valve' }],
      creatures: [],
    });
    expect(first.geometry[0].id).toBe('sluice-crossing-barrier');
    expect(first.geometry[0]).not.toBe(second.geometry[0]);
    expect(first.decorations).not.toBe(second.decorations);
  });

  test('opens the valve only in reach at scale -2 and advances water by explicit actions', () => {
    const initial = createSluiceSimulation();
    const outOfRange = {
      ...initial,
      player: createScaleState(
        { x: 0.5, y: 0.5 },
        { scale: -2, minimumUnlockedScale: -2, maximumUnlockedScale: 1 }
      ),
    };
    const outOfRangeResult = stepThreefoldSimulation(outOfRange, {
      type: 'interact',
    });
    expect(outOfRangeResult.sluicePuzzle.port.open).toBe(false);
    expect(outOfRangeResult.elapsedGameSeconds).toBe(15);

    const raised = stepThreefoldSimulation(initial, { type: 'grow' });
    const wrongScale = stepThreefoldSimulation(raised, { type: 'interact' });
    expect(wrongScale.sluicePuzzle.port.open).toBe(false);
    expect(
      stepThreefoldSimulation(raised, { type: 'shrink' }).player.scale
    ).toBe(-2);

    const missingValveScene = createThreefoldSluiceScene();
    missingValveScene.interactables = [];
    const missingValve = stepThreefoldSimulation(
      createThreefoldSimulation(CRISIS_THRESHOLDS, missingValveScene),
      { type: 'interact' }
    );
    expect(missingValve.sluicePuzzle.port.open).toBe(false);

    let opened = stepThreefoldSimulation(initial, { type: 'interact' });
    expect(opened.sluicePuzzle.port.open).toBe(true);
    expect(opened.sluicePuzzle.chambers[1].volumeCubicMeters).toBeGreaterThan(
      initial.sluicePuzzle.chambers[1].volumeCubicMeters
    );
    opened = stepThreefoldSimulation(opened, {
      type: 'wait',
      elapsedGameMinutes: 15,
    });
    expect(opened.elapsedGameSeconds).toBe(915);
    expect(opened.sluicePuzzle.chambers[0].volumeCubicMeters).toBeLessThan(
      initial.sluicePuzzle.chambers[0].volumeCubicMeters
    );
    expect(opened.sluicePuzzle.chambers[1].volumeCubicMeters).toBeGreaterThan(
      initial.sluicePuzzle.chambers[1].volumeCubicMeters
    );
    expect(opened.crisis.elapsedMinutes).toBe(0);
    expect(stepThreefoldSimulation(opened, { type: 'pause' })).toBe(opened);
    expect(
      stepThreefoldSimulation(opened, { type: 'wait', elapsedGameMinutes: 0 })
    ).toBe(opened);
    expect(stepThreefoldSimulation(opened, { type: 'unsupported' })).toBe(
      opened
    );
  });

  test('opens the crossing only when the physical basin is raised and Mara grows', () => {
    let state = createSluiceSimulation();
    state = stepThreefoldSimulation(state, { type: 'interact' });
    state = stepThreefoldSimulation(state, {
      type: 'wait',
      elapsedGameMinutes: 15,
    });
    expect(state.sluicePuzzle.chambers[1].volumeCubicMeters).toBeGreaterThan(
      0.1
    );
    const small = {
      ...state,
      player: createScaleState(
        { x: 5.12, y: 2 },
        { scale: -2, minimumUnlockedScale: -2, maximumUnlockedScale: 1 }
      ),
    };
    expect(renderThreefoldFrame(small).threefold.crossingAvailable).toBe(false);
    expect(
      stepThreefoldSimulation(small, { type: 'move', direction: 'right' })
        .player.position.x
    ).toBe(small.player.position.x);

    const grown = stepThreefoldSimulation(small, { type: 'grow' });
    expect(grown.player.scale).toBe(-1);
    expect(renderThreefoldFrame(grown).threefold.crossingAvailable).toBe(true);
    const crossed = stepThreefoldSimulation(grown, {
      type: 'move',
      direction: 'right',
    });
    expect(crossed.player.position.x).toBeGreaterThan(grown.player.position.x);
  });

  test('renders water heights on the shared fixed-resolution Mosslight frame', () => {
    let state = createSluiceSimulation();
    const dryFrame = renderThreefoldFrame(state);
    state = stepThreefoldSimulation(state, { type: 'interact' });
    state = stepThreefoldSimulation(state, {
      type: 'wait',
      elapsedGameMinutes: 15,
    });
    const raisedFrame = renderThreefoldFrame(state);
    const dryWater = dryFrame.shapes.filter(shape => shape.fill === '#25a9b8');
    const raisedWater = raisedFrame.shapes.filter(
      shape => shape.fill === '#25a9b8'
    );

    expect(dryFrame).toMatchObject({
      type: 'threefold',
      width: 160,
      height: 144,
      pixelated: true,
      quest: 'The Tidal Archive',
      threefold: { portOpen: false, crossingAvailable: false },
    });
    expect(raisedFrame.threefold).toMatchObject({
      portOpen: true,
      lowerBasinRaised: true,
      crossingAvailable: false,
    });
    expect(dryWater).toHaveLength(2);
    expect(raisedWater[0].y).toBeGreaterThan(dryWater[0].y);
    expect(raisedWater[1].y).toBeLessThan(dryWater[1].y);
    expect(raisedFrame.toast).toContain('CROSSING SEALED');
  });

  test('roundtrips the sluice through schema v4 with a separate browser save key', () => {
    let simulation = createSluiceSimulation();
    simulation = stepThreefoldSimulation(simulation, { type: 'interact' });
    simulation = stepThreefoldSimulation(simulation, {
      type: 'wait',
      elapsedGameMinutes: 2,
    });
    const serialized = serializeThreefoldSimulation(simulation);
    const envelope = JSON.parse(serialized);
    const restored = restoreThreefoldSimulation(serialized);
    const storage = new Map();
    const sluiceStore = createThreefoldSimulationSaveStore(
      mapStorage(storage),
      THREEFOLD_SLUICE_SCENE_ID
    );
    const brokenGateStore = createThreefoldSimulationSaveStore(
      mapStorage(storage)
    );
    const runtime = createThreefoldRuntime({
      scene: createThreefoldSluiceScene(),
      storage: mapStorage(storage),
    });

    expect(envelope).toMatchObject({
      schemaVersion: 4,
      sceneId: THREEFOLD_SLUICE_SCENE_ID,
      state: {
        elapsedGameSeconds: 135,
        sluicePuzzle: { port: { open: true } },
      },
    });
    expect(restored).toEqual(simulation);
    expect(runtime.getSnapshot().world.map.name).toBe('THE TIDAL ARCHIVE');
    expect(runtime.getSnapshot().world.time).toBe(0);
    sluiceStore.save(simulation);
    brokenGateStore.save(createThreefoldSimulation(CRISIS_THRESHOLDS));
    expect([...storage.keys()].sort()).toEqual([
      'dadeto.threefold.simulation-save.v1',
      'dadeto.threefold.simulation-save.v1.small-world-sluice',
    ]);

    envelope.state.sluicePuzzle.chambers[1].volumeCubicMeters += 1;
    expect(restoreThreefoldSimulation(JSON.stringify(envelope))).toBeNull();
    envelope.state.sluicePuzzle.chambers[1].volumeCubicMeters -= 1;
    envelope.state.elapsedGameSeconds = -1;
    expect(restoreThreefoldSimulation(JSON.stringify(envelope))).toBeNull();
    expect(() =>
      runtime.importSave(
        serializeThreefoldSimulation(
          createThreefoldSimulation(CRISIS_THRESHOLDS)
        )
      )
    ).toThrow('Invalid THREEFOLD save data.');
  });
});

/**
 * Create a simulation starting in the separate sluice region.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Fresh sluice run.
 */
function createSluiceSimulation() {
  return createThreefoldSimulation(
    CRISIS_THRESHOLDS,
    createThreefoldSluiceScene()
  );
}

/**
 * Adapt an in-memory map to the browser storage contract.
 * @param {Map<string, string>} values Saved values.
 * @returns {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem: (key: string) => boolean}} Map storage.
 */
function mapStorage(values) {
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}
