import { createThreefoldCampaignStorage } from '../../../../src/core/browser/game/threefold/campaign-storage.js';
import {
  advanceThreefoldPressureNetwork,
  createThreefoldPressureNetwork,
  describeThreefoldPressureNetwork,
  getThreefoldNurseryWaterDepthMeters,
  restoreThreefoldPressureNetwork,
  serializeThreefoldPressureNetwork,
} from '../../../../src/core/browser/game/threefold/pressure-network.js';
import {
  createThreefoldPressureNetworkSaveStore,
  createThreefoldSimulationSaveStore,
  serializeThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/save.js';
import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';
import { createThreefoldSimulation } from '../../../../src/core/browser/game/threefold/simulation.js';
import { createThreefoldBelltopsScene } from '../../../../src/core/browser/game/threefold/belltops.js';
import { createThreefoldGrainlandsScene } from '../../../../src/core/browser/game/threefold/grainlands.js';
import { createThreefoldHearthgapsScene } from '../../../../src/core/browser/game/threefold/hearthgaps.js';
import { createThreefoldSiltMarginScene } from '../../../../src/core/browser/game/threefold/silt-margin.js';
import { createThreefoldSiltMarginWaterPuzzle } from '../../../../src/core/browser/game/threefold/silt-margin-water.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';

const NO_INPUT = {
  regulatorFailed: false,
  nurseryDamaged: false,
  closeHatch: false,
  coordinatedBypass: false,
};
const FAILURE = { ...NO_INPUT, regulatorFailed: true };
const THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

/** @returns {Record<string, any>} Independent injected storage. */
function storageAdapter() {
  const values = new Map();
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}

/**
 * Prepare a valid Grainlands save near a physical control.
 * @param {{x: number, y: number}} position Authored in-bounds location.
 * @returns {ReturnType<typeof createThreefoldSimulation>} Saveable scene.
 */
function nurseryRun(position) {
  const run = createThreefoldSimulation(
    THRESHOLDS,
    createThreefoldGrainlandsScene()
  );
  run.player = { ...run.player, position };
  return run;
}

/**
 * Seed completed, valid route choices without modifying another route's save.
 * @param {Record<string, any>} storage Injected storage.
 * @param {boolean} signalSent Whether the Choir has coordinated the relief.
 * @returns {void}
 */
function seedBypass(storage, signalSent) {
  const hearthgaps = createThreefoldSimulation(
    THRESHOLDS,
    createThreefoldHearthgapsScene()
  );
  hearthgaps.hearthgaps = {
    runoffChoice: 'shared-bypass',
    floodedHomeIds: ['hearthgaps-brin-homes'],
  };
  createThreefoldSimulationSaveStore(storage, 'hearthgaps').save(hearthgaps);
  if (signalSent) {
    const silt = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldSiltMarginScene()
    );
    silt.siltMargin = {
      guardian: 'guided-aside',
      signal: 'sent',
      quietingEvidenceHeard: false,
      waterPuzzle: createThreefoldSiltMarginWaterPuzzle({ crossingOpen: true }),
    };
    createThreefoldSimulationSaveStore(storage, 'silt-margin').save(silt);
  }
}

describe('THREEFOLD shared physical pressure network', () => {
  test('holds five litres behind the living regulator until an explicit failure', () => {
    const initial = createThreefoldPressureNetwork();
    const held = advanceThreefoldPressureNetwork(initial, NO_INPUT, 900);
    expect(held).toEqual(initial);
    expect(held.volumesCubicMeters).not.toBe(initial.volumesCubicMeters);
    expect(describeThreefoldPressureNetwork(held)).toContain(
      '0 mm water; not flooded; hatch open'
    );
    expect(describeThreefoldPressureNetwork(held)).toContain(
      'relief needs Hearthgaps bypass and Choir signal'
    );
    const latched = advanceThreefoldPressureNetwork(initial, FAILURE, 0);
    expect(latched.regulatorFailed).toBe(true);
    expect(latched.volumesCubicMeters).toEqual(initial.volumesCubicMeters);
  });

  test('conserves shared water through flooding, relief, and irreversible drainage damage', () => {
    const flooded = advanceThreefoldPressureNetwork(
      createThreefoldPressureNetwork(),
      FAILURE,
      900
    );
    expect(getThreefoldNurseryWaterDepthMeters(flooded)).toBeGreaterThanOrEqual(
      0.02
    );
    expect(flooded.nurseryFlooded).toBe(true);
    const drained = advanceThreefoldPressureNetwork(
      flooded,
      { ...NO_INPUT, coordinatedBypass: true },
      900
    );
    expect(drained.regulatorFailed).toBe(true);
    expect(drained.bypassOpen).toBe(true);
    expect(getThreefoldNurseryWaterDepthMeters(drained)).toBeLessThan(
      getThreefoldNurseryWaterDepthMeters(flooded)
    );
    expect(describeThreefoldPressureNetwork(drained)).toContain(
      'flood damage remains'
    );
    expect(describeThreefoldPressureNetwork(drained)).toContain(
      'relief bypass operating'
    );
    for (const state of [flooded, drained]) {
      expect(state.volumesCubicMeters.every(volume => volume >= 0)).toBe(true);
      expect(
        state.volumesCubicMeters.reduce((sum, volume) => sum + volume, 0)
      ).toBeCloseTo(0.005, 12);
    }
    expect(
      advanceThreefoldPressureNetwork(drained, NO_INPUT, 1e9).nurseryFlooded
    ).toBe(true);
  });

  test('closing the hatch protects the shelter until its physical structure is broken', () => {
    const closed = advanceThreefoldPressureNetwork(
      createThreefoldPressureNetwork(),
      { ...FAILURE, closeHatch: true },
      900
    );
    expect(closed.hatchClosed).toBe(true);
    expect(closed.volumesCubicMeters[1]).toBe(0);
    expect(describeThreefoldPressureNetwork(closed)).toContain('hatch closed');
    const broken = advanceThreefoldPressureNetwork(
      closed,
      { ...NO_INPUT, nurseryDamaged: true },
      900
    );
    expect(broken.nurseryFlooded).toBe(true);
    expect(describeThreefoldPressureNetwork(broken)).toContain('hatch broken');
    expect(
      advanceThreefoldPressureNetwork(broken, NO_INPUT, 1).nurseryDamaged
    ).toBe(true);
    for (const duration of [-1, NaN, Infinity])
      expect(() =>
        advanceThreefoldPressureNetwork(closed, NO_INPUT, duration)
      ).toThrow();
  });

  test('round-trips conserved volumes and reconstructs flooding from physical depth', () => {
    const state = createThreefoldPressureNetwork();
    expect(
      restoreThreefoldPressureNetwork(serializeThreefoldPressureNetwork(state))
    ).toEqual(state);
    const wet = { ...state, volumesCubicMeters: [0.0025, 0.0025, 0] };
    expect(
      restoreThreefoldPressureNetwork(serializeThreefoldPressureNetwork(wet))
        .nurseryFlooded
    ).toBe(true);
    const store = createThreefoldPressureNetworkSaveStore(storageAdapter());
    expect(store.load()).toBeNull();
    expect(store.save(wet)).toBe(true);
    expect(store.load().volumesCubicMeters).toEqual(wet.volumesCubicMeters);
    expect(store.clear()).toBe(true);
    expect(store.load()).toBeNull();
  });

  test('rejects malformed, unrelated, nonconserved, and incomplete campaign saves', () => {
    const envelope = JSON.parse(
      serializeThreefoldPressureNetwork(createThreefoldPressureNetwork())
    );
    for (const input of [
      null,
      123,
      '{bad',
      'null',
      '123',
      '{}',
      JSON.stringify({ ...envelope, game: 'threefold' }),
      JSON.stringify({ ...envelope, schemaVersion: 3 }),
    ])
      expect(restoreThreefoldPressureNetwork(input)).toBeNull();
    const invalidStates = [
      null,
      1,
      {},
      { ...envelope.state, volumesCubicMeters: null },
      { ...envelope.state, volumesCubicMeters: [0.005] },
      { ...envelope.state, volumesCubicMeters: ['0.005', 0, 0] },
      { ...envelope.state, volumesCubicMeters: [null, 0, 0] },
      { ...envelope.state, volumesCubicMeters: [-0.001, 0.006, 0] },
      { ...envelope.state, volumesCubicMeters: [0.006, 0, 0] },
      { ...envelope.state, hatchClosed: 'yes' },
    ];
    for (const state of invalidStates)
      expect(
        restoreThreefoldPressureNetwork(JSON.stringify({ ...envelope, state }))
      ).toBeNull();
    expect(() =>
      serializeThreefoldPressureNetwork({
        ...envelope.state,
        volumesCubicMeters: [Infinity, 0, 0],
      })
    ).toThrow();
  });
});

describe('THREEFOLD pressure network across real region runtimes', () => {
  test('Quay growth releases water, pause does not advance it, and reload/reset retain failure', () => {
    const storage = storageAdapter();
    const quay = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    expect(
      quay
        .getSnapshot()
        .campaign.pressure.some(site => site.id === 'grainlands-shelter')
    ).toBe(false);
    quay.dispatch('grow');
    const water = quay.getSnapshot().campaign.network;
    expect(water.regulatorFailed).toBe(true);
    expect(water.volumesCubicMeters[1]).toBeGreaterThan(0);
    quay.step(500, ['wait']);
    expect(quay.getSnapshot().campaign.network).toEqual(water);
    quay.resetSave();
    expect(quay.getState().player.destroyedGeometryIds).toContain(
      'belltops-pressure-regulator'
    );
    quay.loadSlot();
    expect(quay.getSnapshot().campaign.network).toEqual(water);
    const reloaded = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    expect(reloaded.getSnapshot().campaign.network).toEqual(water);
    reloaded.dispatch({ type: 'wait', elapsedGameMinutes: 15 });
    expect(reloaded.getSnapshot().campaign.network.nurseryFlooded).toBe(true);
    const snapshot = reloaded.getSnapshot();
    snapshot.campaign.network.volumesCubicMeters[0] = 999;
    expect(
      reloaded.getSnapshot().campaign.network.volumesCubicMeters[0]
    ).not.toBe(999);
  });

  test('a reachable Grainlands hatch stops inflow and input matches tool commands', () => {
    const storage = storageAdapter();
    const quay = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    quay.dispatch('grow');
    const nursery = createThreefoldRuntime({
      storage,
      scene: createThreefoldGrainlandsScene(),
    });
    nursery.dispatch('interact');
    expect(nursery.getSnapshot().campaign.network.hatchClosed).toBe(false);
    nursery.importSave(
      serializeThreefoldSimulation(nurseryRun({ x: 0.55, y: 0.34 }))
    );
    const before = nursery.getSnapshot().campaign.network.volumesCubicMeters[1];
    nursery.start();
    nursery.step(125, ['interact']);
    expect(nursery.getSnapshot().campaign.network.hatchClosed).toBe(true);
    expect(nursery.frame().threefold.shelterHatchClosed).toBe(true);
    nursery.dispatch({ type: 'wait', elapsedGameMinutes: 15 });
    expect(nursery.getSnapshot().campaign.network.volumesCubicMeters[1]).toBe(
      before
    );
    expect(nursery.getSnapshot().campaign.network.nurseryFlooded).toBe(false);
    expect(
      nursery
        .getSnapshot()
        .campaign.pressure.find(site => site.id === 'grainlands-shelter').label
    ).toContain('hatch closed');
    nursery.resetSave();
    expect(nursery.getSnapshot().campaign.network.hatchClosed).toBe(true);
  });

  test('growth breaks a closed nursery hatch and regional reset cannot undo that damage', () => {
    const storage = storageAdapter();
    const quay = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    quay.dispatch('grow');
    createThreefoldSimulationSaveStore(storage, 'grainlands').save(
      nurseryRun({ x: 0.55, y: 0.31 })
    );
    const nursery = createThreefoldRuntime({
      storage,
      scene: createThreefoldGrainlandsScene(),
    });
    nursery.dispatch('interact');
    expect(nursery.getSnapshot().campaign.network.hatchClosed).toBe(true);
    nursery.dispatch('grow');
    expect(nursery.getState().player.destroyedGeometryIds).toContain(
      'grainlands-nursery-clades'
    );
    expect(nursery.getSnapshot().campaign.network.nurseryDamaged).toBe(true);
    expect(nursery.frame().threefold.shelterHatchClosed).toBe(false);
    nursery.dispatch({ type: 'wait', elapsedGameMinutes: 15 });
    expect(nursery.frame().threefold.nurseryFlooded).toBe(true);
    nursery.resetSave();
    expect(nursery.getState().player.destroyedGeometryIds).toContain(
      'grainlands-nursery-clades'
    );
  });

  test.each([false, true])(
    'a bypass needs a surviving Choir signal (%s) to coordinate relief',
    signalSent => {
      const storage = storageAdapter();
      seedBypass(storage, signalSent);
      const savedRoutes = Object.entries(
        createThreefoldCampaignStorage(storage).readCampaign().records
      ).filter(
        ([key, value]) => key.includes('simulation-save') && value !== null
      );
      const quay = createThreefoldRuntime({
        storage,
        scene: createThreefoldBelltopsScene(),
      });
      quay.dispatch('grow');
      quay.dispatch({ type: 'wait', elapsedGameMinutes: 15 });
      const network = quay.getSnapshot().campaign.network;
      expect(network.bypassOpen).toBe(signalSent);
      expect(network.nurseryFlooded).toBe(!signalSent);
      for (const [key, value] of savedRoutes)
        expect(createThreefoldCampaignStorage(storage).getItem(key)).toBe(
          value
        );
      const nursery = createThreefoldRuntime({
        storage,
        scene: createThreefoldGrainlandsScene(),
      });
      expect(nursery.getSnapshot().campaign.network).toEqual(network);
    }
  );

  test('the shared Mosslight frame shows water on the eight-pixel grid without changing physics', () => {
    const state = nurseryRun({ x: 0.55, y: 0.34 });
    const wet = advanceThreefoldPressureNetwork(
      createThreefoldPressureNetwork(),
      FAILURE,
      900
    );
    for (const network of [
      wet,
      { ...wet, hatchClosed: true },
      { ...wet, nurseryDamaged: true },
    ]) {
      const before = serializeThreefoldPressureNetwork(network);
      const frame = renderThreefoldFrame(state, network);
      expect(frame.threefold.nurseryWaterDepthMeters).toBe(
        getThreefoldNurseryWaterDepthMeters(network)
      );
      expect(frame.shapes.some(shape => shape.fill === '#1b8a83')).toBe(true);
      expect(frame.shapes.every(({ x, y }) => x % 8 === 0 && y % 8 === 0)).toBe(
        true
      );
      expect(
        frame.shapes
          .filter(shape => shape.type === 'rect')
          .every(({ width, height }) => width % 8 === 0 && height % 8 === 0)
      ).toBe(true);
      expect(serializeThreefoldPressureNetwork(network)).toBe(before);
    }
  });
});
