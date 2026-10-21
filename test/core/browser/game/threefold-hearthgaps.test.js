import {
  createThreefoldHearthgapsScene,
  createThreefoldHearthgapsState,
  normalizeThreefoldHearthgapsState,
  THREEFOLD_HEARTHGAPS_BRIN_GATE_ID,
  THREEFOLD_HEARTHGAPS_BRIN_HOME_ID,
  THREEFOLD_HEARTHGAPS_DOWNSTREAM_HOME_ID,
  THREEFOLD_HEARTHGAPS_SHARED_BYPASS_ID,
} from '../../../../src/core/browser/game/threefold/hearthgaps.js';
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
import { isThreefoldInteractableInReach } from '../../../../src/core/browser/game/threefold/scene-utils.js';

const CRISIS_THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

/** @returns {ReturnType<typeof createThreefoldSimulation>} New isolated route state. */
function createHearthgapsRun() {
  return createThreefoldSimulation(
    CRISIS_THRESHOLDS,
    createThreefoldHearthgapsScene()
  );
}

/**
 * Move until one runoff control enters the player's physical reach.
 * @param {ReturnType<typeof createThreefoldSimulation>} state Current run.
 * @param {string} targetId Authored control identifier.
 * @param {string} direction Direction toward the selected control.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Run at the control.
 */
function approach(state, targetId, direction) {
  for (
    let step = 0;
    step < 32 && !isThreefoldInteractableInReach(state, targetId);
    step += 1
  )
    state = stepThreefoldSimulation(state, { type: 'move', direction });
  return state;
}

describe('THREEFOLD Hearthgaps runoff choice', () => {
  test('starts at scale −1 with both controls outside reach on the shared grid', () => {
    const scene = createThreefoldHearthgapsScene();
    const state = createHearthgapsRun();
    const frame = renderThreefoldFrame(state);

    expect(state.scene.id).toBe('hearthgaps');
    expect(state.player.scale).toBe(-1);
    expect(frame.threefold.heightMeters * 100).toBeCloseTo(60.96, 2);
    expect(frame.quest).toBe('Hearthgaps');
    expect(frame.threefold).toMatchObject({
      runoffChoice: 'undecided',
      floodedHomeIds: [],
      elapsedGameSeconds: 0,
    });
    expect(
      isThreefoldInteractableInReach(state, THREEFOLD_HEARTHGAPS_BRIN_GATE_ID)
    ).toBe(false);
    expect(
      isThreefoldInteractableInReach(
        state,
        THREEFOLD_HEARTHGAPS_SHARED_BYPASS_ID
      )
    ).toBe(false);
    expect(
      frame.shapes.every(shape => shape.x % 8 === 0 && shape.y % 8 === 0)
    ).toBe(true);
    expect(
      frame.shapes
        .filter(shape => shape.type === 'rect')
        .every(shape => shape.width % 8 === 0 && shape.height % 8 === 0)
    ).toBe(true);
    expect(scene.spawn).not.toBe(createThreefoldHearthgapsScene().spawn);
    expect(createThreefoldHearthgapsState()).toEqual({
      runoffChoice: 'undecided',
      floodedHomeIds: [],
    });
  });

  test('out-of-reach input leaves the choice open and advances only game time', () => {
    const state = createHearthgapsRun();
    const next = stepThreefoldSimulation(state, { type: 'interact' });

    expect(next.hearthgaps).toEqual(state.hearthgaps);
    expect(next.elapsedGameSeconds).toBe(15);
    expect(next.crisis).toEqual(state.crisis);
    expect(next.episode).toEqual(state.episode);
  });

  test.each([
    {
      choice: 'brin-diversion',
      target: THREEFOLD_HEARTHGAPS_BRIN_GATE_ID,
      direction: 'left',
      floodedHomeIds: [THREEFOLD_HEARTHGAPS_DOWNSTREAM_HOME_ID],
      status: "Brin's homes stay dry; downstream homes flood.",
    },
    {
      choice: 'shared-bypass',
      target: THREEFOLD_HEARTHGAPS_SHARED_BYPASS_ID,
      direction: 'right',
      floodedHomeIds: [THREEFOLD_HEARTHGAPS_BRIN_HOME_ID],
      status: "Brin's homes flood; downstream homes stay dry.",
    },
  ])('commits the $choice outcome only at its reachable control', testCase => {
    let state = approach(
      createHearthgapsRun(),
      testCase.target,
      testCase.direction
    );
    expect(isThreefoldInteractableInReach(state, testCase.target)).toBe(true);
    const otherTarget =
      testCase.target === THREEFOLD_HEARTHGAPS_BRIN_GATE_ID
        ? THREEFOLD_HEARTHGAPS_SHARED_BYPASS_ID
        : THREEFOLD_HEARTHGAPS_BRIN_GATE_ID;
    expect(isThreefoldInteractableInReach(state, otherTarget)).toBe(false);

    const before = state.elapsedGameSeconds;
    state = stepThreefoldSimulation(state, { type: 'interact' });
    const frame = renderThreefoldFrame(state);

    expect(state.hearthgaps).toEqual({
      runoffChoice: testCase.choice,
      floodedHomeIds: testCase.floodedHomeIds,
    });
    expect(state.elapsedGameSeconds).toBe(before + 15);
    expect(state.crisis).toEqual(createHearthgapsRun().crisis);
    expect(state.episode).toEqual(createHearthgapsRun().episode);
    expect(frame.toast).toBe(testCase.status);
    expect(frame.threefold.floodedHomeIds).toEqual(testCase.floodedHomeIds);
    expect(renderThreefoldFrame(state).threefold.runoffChoice).toBe(
      testCase.choice
    );

    const repeated = stepThreefoldSimulation(state, { type: 'interact' });
    expect(repeated.hearthgaps).toEqual(state.hearthgaps);
    expect(normalizeThreefoldHearthgapsState(repeated.hearthgaps)).toEqual(
      state.hearthgaps
    );
  });

  test('roundtrips flood and growth damage under a route-isolated save key', () => {
    let state = approach(
      createHearthgapsRun(),
      THREEFOLD_HEARTHGAPS_SHARED_BYPASS_ID,
      'right'
    );
    state = stepThreefoldSimulation(state, { type: 'interact' });
    state.player = {
      ...state.player,
      destroyedGeometryIds: [THREEFOLD_HEARTHGAPS_DOWNSTREAM_HOME_ID],
      maximumUnlockedScale: -1,
    };
    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(state)
    );
    expect(restored).toEqual(state);
    expect(renderThreefoldFrame(restored).threefold.floodedHomeIds).toEqual([
      THREEFOLD_HEARTHGAPS_BRIN_HOME_ID,
    ]);

    const records = new Map();
    const storage = {
      getItem: key => records.get(key) ?? null,
      setItem: (key, value) => records.set(key, value),
      removeItem: key => records.delete(key),
    };
    const routeStore = createThreefoldSimulationSaveStore(
      storage,
      'hearthgaps'
    );
    const defaultStore = createThreefoldSimulationSaveStore(storage);
    expect(routeStore.save(state)).toBe(true);
    expect(
      defaultStore.save(createThreefoldSimulation(CRISIS_THRESHOLDS))
    ).toBe(true);
    expect([...records.keys()]).toEqual(['dadeto.threefold.campaign.v1']);
    expect(routeStore.load()).toEqual(state);
    expect(defaultStore.load().scene.id).toBe('broken-gate');
    expect(routeStore.clear()).toBe(true);
    expect(defaultStore.load().scene.id).toBe('broken-gate');
  });

  test('growth damages an overlapping home and the rendered ruin survives import', () => {
    const state = createHearthgapsRun();
    state.player = { ...state.player, position: { x: 0.31, y: 0.2 } };
    expect(
      renderThreefoldFrame(state).threefold.growthPreviewGeometryIds
    ).toContain(THREEFOLD_HEARTHGAPS_BRIN_HOME_ID);
    const grown = stepThreefoldSimulation(state, { type: 'grow' });

    expect(grown.player.scale).toBe(0);
    expect(grown.player.destroyedGeometryIds).toContain(
      THREEFOLD_HEARTHGAPS_BRIN_HOME_ID
    );
    const restored = restoreThreefoldSimulation(
      serializeThreefoldSimulation(grown)
    );
    expect(restored.player.destroyedGeometryIds).toContain(
      THREEFOLD_HEARTHGAPS_BRIN_HOME_ID
    );
    expect(
      renderThreefoldFrame(restored).threefold.growthPreviewGeometryIds
    ).toEqual([]);
  });

  test('rejects unsupported and internally inconsistent runoff save data', () => {
    const envelope = JSON.parse(
      serializeThreefoldSimulation(createHearthgapsRun())
    );
    expect(() => normalizeThreefoldHearthgapsState(null)).toThrow(
      'Hearthgaps state is invalid.'
    );
    expect(envelope.schemaVersion).toBe(1);
    expect(
      restoreThreefoldSimulation(
        JSON.stringify({ ...envelope, schemaVersion: 2 })
      )
    ).toBeNull();
    expect(() =>
      normalizeThreefoldHearthgapsState({ runoffChoice: 'unknown' })
    ).toThrow('Hearthgaps runoff choice is invalid.');
    expect(() =>
      normalizeThreefoldHearthgapsState({
        runoffChoice: 'brin-diversion',
        floodedHomeIds: [THREEFOLD_HEARTHGAPS_BRIN_HOME_ID],
      })
    ).toThrow('Hearthgaps flood damage is inconsistent.');
  });
});
