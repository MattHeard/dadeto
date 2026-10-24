import { createThreefoldCampaignStorage } from '../../../../src/core/browser/game/threefold/campaign-storage.js';
import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';
import { createThreefoldBelltopsScene } from '../../../../src/core/browser/game/threefold/belltops.js';
import { createThreefoldGrainlandsScene } from '../../../../src/core/browser/game/threefold/grainlands.js';
import { createThreefoldSimulation } from '../../../../src/core/browser/game/threefold/simulation.js';
import {
  getThreefoldQuayInteraction,
  getThreefoldQuayContent,
} from '../../../../src/core/browser/game/threefold/quay-regulator.js';
import {
  createThreefoldPressureNetwork,
  restoreThreefoldPressureNetwork,
  serializeThreefoldPressureNetwork,
} from '../../../../src/core/browser/game/threefold/pressure-network.js';

/** @returns {Record<string, any>} Isolated injected campaign storage. */
function createStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}

/**
 * Start the actual Quay route at an authored in-bounds position.
 * @param {Record<string, any>} storage Shared campaign storage.
 * @param {{x: number, y: number}} [position] Initial physical position.
 * @returns {ReturnType<typeof createThreefoldRuntime>} Actual handheld runtime.
 */
function quayRuntime(storage, position = { x: 0, y: 0 }) {
  const scene = createThreefoldBelltopsScene();
  return createThreefoldRuntime({
    storage,
    scene: { ...scene, spawn: { ...scene.spawn, position } },
  });
}

describe('THREEFOLD finite replacement governor and nonlethal rescue', () => {
  test('offers visible handoff choices and sacrifices crane lifting for a governed rescue', () => {
    const storage = createStorage();
    const runtime = quayRuntime(storage);
    const preRescueSave = runtime.exportSave();
    expect(runtime.frame().toast).toContain('CHECK IRI');
    runtime.dispatch('interact');
    expect(runtime.frame().threefold.quayRegulator.text).toContain(
      'Without a fitted governor'
    );
    expect(runtime.frame().threefold.quayRegulator.action.kind).toBe('rescue');

    runtime.dispatch('left');
    expect(runtime.frame().threefold.quayRegulator.action.kind).toBe(
      'recover-governor'
    );
    expect(runtime.frame().toast).toContain('CRANE WILL STOP');
    expect(runtime.frame().threefold.quayRegulator.text).toContain(
      'permanently disables harbor lifting'
    );
    runtime.dispatch('interact');
    expect(runtime.getSnapshot().campaign.network.governorState).toBe(
      'carried'
    );
    expect(runtime.frame().threefold.quayRegulator.craneAvailable).toBe(false);
    expect(
      runtime.frame().shapes.some(shape => shape.text === 'CRANE IDLE')
    ).toBe(true);
    expect(runtime.getState().player.destroyedGeometryIds).not.toContain(
      'belltops-harbor-crane'
    );

    runtime.dispatch('right');
    expect(runtime.frame().toast).toContain('FIT GOVERNOR');
    runtime.dispatch('interact');
    expect(runtime.getSnapshot().campaign.network.governorState).toBe(
      'installed'
    );
    expect(runtime.frame().toast).toContain('GOVERNOR HOLDS');
    runtime.dispatch('interact');
    expect(runtime.getSnapshot().campaign.iriFate).toMatchObject({
      outcome: 'rescued',
      milestoneId: 'quay-rescue-with-governor',
    });
    expect(runtime.getSnapshot().campaign.network).toMatchObject({
      operatorReleased: true,
      regulatorFailed: false,
      governorState: 'installed',
    });
    expect(
      runtime
        .getState()
        .scene.creatures.some(creature => creature.id === 'belltops-iri')
    ).toBe(false);
    expect(runtime.frame().threefold.growthPreviewCreatureIds).not.toContain(
      'belltops-iri'
    );
    runtime.dispatch({ type: 'wait', elapsedGameMinutes: 15 });
    expect(runtime.getSnapshot().campaign.network.volumesCubicMeters[1]).toBe(
      0
    );

    runtime.importSave(preRescueSave);
    expect(
      runtime
        .getState()
        .scene.creatures.some(creature => creature.id === 'belltops-iri')
    ).toBe(false);
    expect(runtime.getSnapshot().campaign.network.governorState).toBe(
      'installed'
    );
    runtime.dispatch('grow');
    expect(runtime.getSnapshot().campaign.iriFate.outcome).toBe('rescued');
    expect(
      (runtime.getState().encounter.growthDeaths || []).some(
        death => death.creatureId === 'belltops-iri'
      )
    ).toBe(false);
    expect(runtime.getSnapshot().campaign.network.governorState).toBe('lost');
    runtime.resetSave();
    expect(
      runtime
        .getState()
        .scene.creatures.some(creature => creature.id === 'belltops-iri')
    ).toBe(false);
    expect(runtime.frame().threefold.quayRegulator.text).toContain(
      'governor is lost'
    );
    expect(
      quayRuntime(storage).getSnapshot().campaign.network.governorState
    ).toBe('lost');
  });

  test('unreplaced release opens the feeder, while later machinery stops inflow without erasing damage', () => {
    const runtime = quayRuntime(createStorage());
    runtime.dispatch('interact');
    runtime.dispatch('interact');
    expect(runtime.getSnapshot().campaign.iriFate.milestoneId).toBe(
      'quay-rescue-without-governor'
    );
    expect(runtime.getSnapshot().campaign.network.regulatorFailed).toBe(false);
    expect(
      runtime.getSnapshot().campaign.network.volumesCubicMeters[1]
    ).toBeGreaterThan(0);
    runtime.dispatch({ type: 'wait', elapsedGameMinutes: 15 });
    expect(runtime.getSnapshot().campaign.network.nurseryFlooded).toBe(true);
    runtime.dispatch('left');
    runtime.dispatch('interact');
    runtime.dispatch('right');
    runtime.dispatch('interact');
    expect(runtime.getSnapshot().campaign.network.governorState).toBe(
      'installed'
    );
    const volume = runtime.getSnapshot().campaign.network.volumesCubicMeters[1];
    runtime.dispatch({ type: 'wait', elapsedGameMinutes: 15 });
    expect(runtime.getSnapshot().campaign.network.volumesCubicMeters[1]).toBe(
      volume
    );
    expect(runtime.getSnapshot().campaign.network.nurseryFlooded).toBe(true);
    expect(runtime.getSnapshot().campaign.iriFate.outcome).toBe('rescued');
  });

  test('earlier nursery protection still mitigates an unregulated release', () => {
    const storage = createStorage();
    const scene = createThreefoldGrainlandsScene();
    const nursery = createThreefoldRuntime({
      storage,
      scene: {
        ...scene,
        spawn: { ...scene.spawn, position: { x: 0.55, y: 0.34 } },
      },
    });
    nursery.dispatch('interact');
    const quay = quayRuntime(storage);
    quay.dispatch('interact');
    quay.dispatch('interact');
    quay.dispatch({ type: 'wait', elapsedGameMinutes: 15 });
    expect(quay.getSnapshot().campaign.network).toMatchObject({
      hatchClosed: true,
      operatorReleased: true,
      nurseryFlooded: false,
    });
    expect(quay.getSnapshot().campaign.network.volumesCubicMeters[1]).toBe(0);
  });

  test('requires a new controller press for release and does not chain a held press into another operation', () => {
    const runtime = quayRuntime(createStorage());
    runtime.start();
    runtime.step(125, ['a']);
    runtime.step(125, ['a']);
    expect(runtime.getSnapshot().campaign.iriFate.outcome).toBe('trapped');
    runtime.step(125, []);
    runtime.step(125, ['a']);
    runtime.step(125, ['a']);
    expect(runtime.getSnapshot().campaign.iriFate.outcome).toBe('rescued');
    expect(runtime.getSnapshot().campaign.network.governorState).toBe('crane');
  });

  test('a retained operator-release record cannot recreate Iri if the separate fate entry is missing', () => {
    const storage = createStorage();
    const runtime = quayRuntime(storage);
    runtime.dispatch('interact');
    runtime.dispatch('interact');
    createThreefoldCampaignStorage(storage).removeItem(
      'dadeto.threefold.campaign-outcomes.v1'
    );
    const restored = quayRuntime(storage);
    expect(restored.getSnapshot().campaign.iriFate).toBeNull();
    expect(
      restored
        .getState()
        .scene.creatures.some(creature => creature.id === 'belltops-iri')
    ).toBe(false);
    restored.resetSave();
    restored.dispatch('grow');
    expect(
      (restored.getState().encounter.growthDeaths || []).some(
        death => death.creatureId === 'belltops-iri'
      )
    ).toBe(false);
  });

  test('a carried governor survives regional reload and cannot be recovered twice', () => {
    const storage = createStorage();
    let runtime = quayRuntime(storage);
    runtime.dispatch('left');
    runtime.start();
    runtime.step(125, ['a']);
    expect(runtime.getSnapshot().campaign.network.governorState).toBe(
      'carried'
    );
    runtime.resetSave();
    runtime = quayRuntime(storage);
    expect(runtime.getSnapshot().campaign.network.governorState).toBe(
      'carried'
    );
    expect(runtime.frame().threefold.quayRegulator.craneAvailable).toBe(false);
    runtime.dispatch('interact');
    expect(runtime.getSnapshot().campaign.iriFate.outcome).toBe('trapped');
    expect(runtime.frame().threefold.quayRegulator.action.kind).toBe(
      'install-governor'
    );
    runtime.dispatch('interact');
    expect(runtime.getSnapshot().campaign.network.governorState).toBe(
      'installed'
    );
  });

  test('destroying the crane loses its unrecovered governor without inventing regulator damage', () => {
    const storage = createStorage();
    const runtime = quayRuntime(storage, { x: -10.5, y: 0 });
    runtime.dispatch('grow');
    expect(runtime.getSnapshot().campaign.network).toMatchObject({
      craneDestroyed: true,
      regulatorFailed: false,
      governorState: 'lost',
    });
    expect(runtime.getSnapshot().campaign.iriFate).toBeNull();
    runtime.resetSave();
    expect(runtime.getState().player.destroyedGeometryIds).toContain(
      'belltops-harbor-crane'
    );
    expect(runtime.frame().threefold.quayRegulator.text).toContain(
      'crane is destroyed'
    );
    expect(
      runtime.frame().shapes.some(shape => shape.text === 'CRANE LOST')
    ).toBe(true);
    const restored = quayRuntime(storage);
    expect(restored.getState().player.destroyedGeometryIds).toContain(
      'belltops-harbor-crane'
    );
    for (let step = 0; step < 3; step += 1) restored.dispatch('right');
    expect(restored.frame().threefold.quayRegulator.action.kind).toBe(
      'inspect'
    );
    restored.dispatch('interact');
    restored.dispatch('interact');
    expect(restored.getSnapshot().campaign.iriFate.outcome).toBe('rescued');
    expect(restored.getSnapshot().campaign.network.governorState).toBe('lost');
  });

  test.each(['rescued', 'escaped', 'evacuated', 'dead'])(
    'does not put a %s Iri back in a reset or imported region',
    outcome => {
      const runtime = quayRuntime(createStorage());
      const initial = runtime.exportSave();
      runtime.recordIriFate(outcome, 'authored-prior-outcome');
      runtime.resetSave();
      runtime.loadSlot();
      runtime.importSave(initial);
      expect(
        runtime
          .getState()
          .scene.creatures.some(creature => creature.id === 'belltops-iri')
      ).toBe(false);
      runtime.dispatch('grow');
      expect(
        (runtime.getState().encounter.growthDeaths || []).some(
          death => death.creatureId === 'belltops-iri'
        )
      ).toBe(false);
      expect(runtime.getSnapshot().campaign.iriFate.outcome).toBe(outcome);
    }
  );

  test('an abandoned Iri can still be rescued, while out-of-reach actions do nothing', () => {
    const runtime = quayRuntime(createStorage());
    runtime.recordIriFate('abandoned', 'authored-abandonment');
    runtime.dispatch('interact');
    expect(runtime.getSnapshot().campaign.iriFate.outcome).toBe('rescued');
    const distant = quayRuntime(createStorage(), { x: 20, y: 16 });
    expect(distant.frame().threefold.quayRegulator.action).toBeNull();
    distant.dispatch('interact');
    expect(distant.getSnapshot().campaign.network.governorState).toBe('crane');
    expect(distant.getSnapshot().campaign.iriFate).toBeNull();
    expect(distant.frame().toast).toContain('APPROACH');
  });

  test('ignores unrelated controls and never discovers a locally dead Iri', () => {
    const state = createThreefoldSimulation(
      { urgentAtMinutes: 4, surgeAtMinutes: 9, aftermathAtMinutes: 15 },
      createThreefoldBelltopsScene()
    );
    const network = createThreefoldPressureNetwork();
    state.encounter.growthDeaths = [
      { creatureId: 'belltops-iri', cause: 'growth' },
    ];
    expect(getThreefoldQuayInteraction(state, network, null).kind).toBe(
      'recover-governor'
    );
    state.scene.interactables = [
      {
        id: 'unrelated-control',
        position: { x: 0, y: 0 },
        bounds: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      },
    ];
    expect(getThreefoldQuayInteraction(state, network, null)).toBeNull();
    expect(getThreefoldQuayContent(state, network, null).text).toContain(
      'Approach the panel'
    );
  });

  test('keeps handoff HUD shapes aligned to each sprite grid', () => {
    const runtime = quayRuntime(createStorage());
    for (const action of [
      'interact',
      'left',
      'interact',
      'right',
      'interact',
      'interact',
    ]) {
      const frame = runtime.dispatch(action);
      expect(frame.shapes.every(({ x, y, spriteGridSize }) => {
          const grid = spriteGridSize || 8;
          return x % grid === 0 && y % grid === 0;
        })).toBe(
        true
      );
      expect(
        frame.shapes
          .filter(shape => shape.type === 'rect')
          .every(({ width, height, spriteGridSize }) => {
            const grid = spriteGridSize || 8;
            return width % grid === 0 && height % grid === 0;
          })
      ).toBe(true);
      expect(
        frame.threefold.campaignPressure.some(
          site => site.id === 'quay-machinery' && site.label.length > 0
        )
      ).toBe(true);
    }
  });
});

describe('THREEFOLD pressure schema-v2 machinery continuity', () => {
  test('migrates schema-v1 physical water without inventing machinery or an operator departure', () => {
    const initial = createThreefoldPressureNetwork();
    const state = {
      ...initial,
      volumesCubicMeters: [0.003, 0.002, 0],
      regulatorFailed: true,
    };
    delete state.operatorReleased;
    delete state.craneDestroyed;
    delete state.governorState;
    const restored = restoreThreefoldPressureNetwork(
      JSON.stringify({
        game: 'threefold-pressure-network',
        schemaVersion: 1,
        state,
      })
    );
    expect(restored).toMatchObject({
      volumesCubicMeters: [0.003, 0.002, 0],
      regulatorFailed: true,
      operatorReleased: false,
      craneDestroyed: false,
      governorState: 'crane',
    });
    expect(
      JSON.parse(serializeThreefoldPressureNetwork(restored)).schemaVersion
    ).toBe(2);
    expect(
      restoreThreefoldPressureNetwork(
        serializeThreefoldPressureNetwork(restored)
      )
    ).toEqual(restored);
  });

  test('rejects invalid or physically contradictory new machine records', () => {
    const initial = createThreefoldPressureNetwork();
    for (const state of [
      { ...initial, governorState: 'unlimited' },
      { ...initial, operatorReleased: 'yes' },
      { ...initial, governorState: 'crane', craneDestroyed: true },
      { ...initial, governorState: 'installed', regulatorFailed: true },
    ])
      expect(
        restoreThreefoldPressureNetwork(
          JSON.stringify({
            game: 'threefold-pressure-network',
            schemaVersion: 2,
            state,
          })
        )
      ).toBeNull();
  });
});
