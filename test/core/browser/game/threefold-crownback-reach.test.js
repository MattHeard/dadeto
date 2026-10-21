import {
  createThreefoldCrownbackReachScene,
  isThreefoldCrownbackTharnInReach,
  normalizeThreefoldCrownbackReachState,
  THREEFOLD_CROWNBACK_REACH_THARN_ID,
} from '../../../../src/core/browser/game/threefold/crownback-reach.js';
import { createThreefoldBelltopsScene } from '../../../../src/core/browser/game/threefold/belltops.js';
import { heightAtScale } from '../../../../src/core/browser/game/threefold/spatial.js';
import {
  createThreefoldSimulation,
  previewThreefoldGrowthEffects,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';
import {
  createThreefoldSimulationSaveStore,
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/save.js';

const THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

describe('THREEFOLD Crownback Reach', () => {
  test('authors Tharn and the calf at +3 and previews the +4 landscape on the Mosslight grid', () => {
    const scene = createThreefoldCrownbackReachScene();
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const unchanged = structuredClone(initial);
    const growth = previewThreefoldGrowthEffects(initial);
    const frame = renderThreefoldFrame(initial);
    const labels = frame.shapes
      .filter(shape => shape.type === 'text')
      .map(shape => shape.text);
    const tharn = scene.creatures.find(
      creature => creature.id === THREEFOLD_CROWNBACK_REACH_THARN_ID
    );
    const calf = scene.creatures.find(
      creature => creature.id === 'crownback-calf'
    );

    expect(initial.player).toMatchObject({
      scale: 3,
      minimumUnlockedScale: 3,
      maximumUnlockedScale: 4,
    });
    expect(heightAtScale(initial.player.scale)).toBeCloseTo(49.38);
    expect(tharn.bounds.max.z - tharn.bounds.min.z).toBeCloseTo(44);
    expect(calf.bounds.max.z - calf.bounds.min.z).toBeCloseTo(18);
    expect(growth).toEqual({
      geometryIds: ['crownback-floodwall', 'crownback-living-root-arch'],
      occupantIds: [],
      creatureIds: ['crownback-calf', 'crownback-elder-tharn'],
    });
    expect(initial).toEqual(unchanged);
    expect(frame.world.map.name).toBe('CROWNBACK REACH');
    expect(frame.quest).toBe('Crownback Reach');
    expect(frame.toast).toContain('FIND ELDER THARN');
    expect(frame.threefold.crownbackReach).toEqual({ tharnMet: false });
    expect(labels).toContain('A BREAKS FLOODWALL + ROOT ARCH');
    expect(labels).toContain('A KILLS CALF + ELDER THARN');
    expect(
      frame.shapes.every(shape => shape.x % 8 === 0 && shape.y % 8 === 0)
    ).toBe(true);
    expect(
      frame.shapes
        .filter(shape => shape.type === 'rect')
        .every(shape => shape.width % 8 === 0 && shape.height % 8 === 0)
    ).toBe(true);
  });

  test('meets Tharn only in reach and records the meeting once', () => {
    const scene = createThreefoldCrownbackReachScene();
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const outOfReach = {
      ...initial,
      player: { ...initial.player, position: { x: 48, y: 0 } },
    };
    const approached = stepThreefoldSimulation(initial, {
      type: 'move',
      direction: 'right',
    });

    expect(isThreefoldCrownbackTharnInReach(initial)).toBe(false);
    expect(isThreefoldCrownbackTharnInReach(approached)).toBe(true);
    expect(renderThreefoldFrame(approached).toast).toContain(
      'ELDER THARN IN REACH'
    );
    expect(isThreefoldCrownbackTharnInReach(outOfReach)).toBe(false);
    expect(
      isThreefoldCrownbackTharnInReach({
        ...initial,
        scene: { ...scene, id: 'belltops' },
      })
    ).toBe(false);
    expect(
      isThreefoldCrownbackTharnInReach({
        ...approached,
        scene: { ...scene, creatures: [] },
      })
    ).toBe(false);
    expect(stepThreefoldSimulation(outOfReach, { type: 'interact' })).toBe(
      outOfReach
    );

    const met = stepThreefoldSimulation(approached, { type: 'interact' });

    expect(met.crownbackReach).toEqual({ tharnMet: true });
    expect(met.elapsedGameSeconds).toBe(30);
    expect(met.crisis).toBe(approached.crisis);
    expect(met.episode).toBe(approached.episode);
    expect(renderThreefoldFrame(met).toast).toContain('A GROW');
    expect(stepThreefoldSimulation(met, { type: 'interact' })).toBe(met);
  });

  test('keeps A/B scale controls and persists meeting, growth, and route isolation', () => {
    const storageValues = new Map();
    const storage = {
      getItem: key => storageValues.get(key) ?? null,
      setItem: (key, value) => storageValues.set(key, value),
      removeItem: key => storageValues.delete(key),
    };
    const scene = createThreefoldCrownbackReachScene();
    const runtime = createThreefoldRuntime({ scene });

    runtime.dispatch('right');
    runtime.dispatch('interact');
    expect(runtime.getState().crownbackReach).toEqual({ tharnMet: true });
    runtime.dispatch('grow');
    const grown = runtime.getState();
    expect(grown.player.scale).toBe(4);
    expect(grown.player.destroyedGeometryIds).toEqual([
      'crownback-floodwall',
      'crownback-living-root-arch',
    ]);
    expect(grown.encounter.growthDeaths).toEqual([
      { creatureId: 'crownback-calf', cause: 'growth' },
      { creatureId: 'crownback-elder-tharn', cause: 'growth' },
    ]);
    runtime.dispatch('shrink');
    expect(runtime.getState().player.scale).toBe(3);
    expect(runtime.getState().crownbackReach).toEqual({ tharnMet: true });

    const crownbackStore = createThreefoldSimulationSaveStore(
      storage,
      'crownback-reach'
    );
    const belltopsStore = createThreefoldSimulationSaveStore(
      storage,
      'belltops'
    );
    const brokenGateStore = createThreefoldSimulationSaveStore(storage);
    expect(crownbackStore.save(grown)).toBe(true);
    expect(
      belltopsStore.save(
        createThreefoldSimulation(THRESHOLDS, createThreefoldBelltopsScene())
      )
    ).toBe(true);
    expect(brokenGateStore.save(createThreefoldSimulation(THRESHOLDS))).toBe(
      true
    );
    expect([...storageValues.keys()].sort()).toEqual([
      'dadeto.threefold.campaign.v1',
    ]);
    expect(crownbackStore.load()).toEqual(grown);
    expect(
      restoreThreefoldSimulation(serializeThreefoldSimulation(grown))
    ).toEqual(grown);

    const invalidSave = JSON.parse(serializeThreefoldSimulation(grown));
    invalidSave.state.crownbackReach.tharnMet = 'yes';
    expect(restoreThreefoldSimulation(JSON.stringify(invalidSave))).toBeNull();
    expect(() => normalizeThreefoldCrownbackReachState(null)).toThrow(
      'Crownback encounter state is invalid.'
    );
    expect(() => normalizeThreefoldCrownbackReachState([])).toThrow(
      'Crownback encounter state is invalid.'
    );
    expect(normalizeThreefoldCrownbackReachState(undefined)).toEqual({
      tharnMet: false,
    });
  });
});
