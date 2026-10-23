import {
  createThreefoldWakeformShoalsScene,
  isThreefoldWakeformInReach,
  normalizeThreefoldWakeformShoalsState,
  THREEFOLD_SHOALS_TIDEWALL_ID,
  THREEFOLD_WAKEFORM_ID,
} from '../../../../src/core/browser/game/threefold/wakeform-shoals.js';
import { createThreefoldBelltopsScene } from '../../../../src/core/browser/game/threefold/belltops.js';
import { createThreefoldCrownbackReachScene } from '../../../../src/core/browser/game/threefold/crownback-reach.js';
import { heightAtScale } from '../../../../src/core/browser/game/threefold/spatial.js';
import {
  createThreefoldSimulation,
  previewThreefoldGrowthEffects,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
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

describe('THREEFOLD Wakeform Shoals', () => {
  test('authors the +3 to +4 offshore growth route on the Mosslight grid', () => {
    const scene = createThreefoldWakeformShoalsScene();
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const original = structuredClone(initial);
    const growth = previewThreefoldGrowthEffects(initial);
    const frame = renderThreefoldFrame(initial);
    const labels = frame.shapes
      .filter(shape => shape.type === 'text')
      .map(shape => shape.text);
    const wakeform = scene.creatures.find(
      creature => creature.id === THREEFOLD_WAKEFORM_ID
    );

    expect(initial.player).toMatchObject({
      scale: 3,
      minimumUnlockedScale: 3,
      maximumUnlockedScale: 4,
      position: { x: -30, y: 0 },
    });
    expect(heightAtScale(initial.player.scale)).toBeCloseTo(49.38);
    expect(heightAtScale(4)).toBeCloseTo(148.13);
    expect(wakeform.bounds.max.z - wakeform.bounds.min.z).toBeCloseTo(132);
    expect(growth).toEqual({
      geometryIds: [THREEFOLD_SHOALS_TIDEWALL_ID],
      occupantIds: [],
      creatureIds: [],
    });
    expect(initial).toEqual(original);
    expect(frame.quest).toBe('The Shoals');
    expect(frame.threefold.wakeformShoals).toEqual({
      wakeformDiverted: false,
      outerDefenseBreached: false,
    });
    expect(frame.toast).toBe('FIND WAKEFORM · A TO DIVERT');
    expect(labels).toContain('A BREAKS OUTER TIDE WALL');
    expect(
      frame.shapes.every(shape => shape.x % 8 === 0 && shape.y % 8 === 0)
    ).toBe(true);
    expect(
      frame.shapes
        .filter(shape => shape.type === 'rect')
        .every(shape => shape.width % 8 === 0 && shape.height % 8 === 0)
    ).toBe(true);
  });

  test('defaults imported state and only offers reach for the live shoals Wakeform', () => {
    const scene = createThreefoldWakeformShoalsScene();
    const state = createThreefoldSimulation(THRESHOLDS, scene);

    expect(normalizeThreefoldWakeformShoalsState(undefined)).toEqual({
      wakeformDiverted: false,
      outerDefenseBreached: false,
    });
    expect(
      isThreefoldWakeformInReach({
        ...state,
        scene: { ...scene, id: 'another-scene' },
      })
    ).toBe(false);
    expect(
      isThreefoldWakeformInReach({
        ...state,
        scene: { ...scene, creatures: [] },
      })
    ).toBe(false);
  });

  test('guides the Wakeform once in reach and persists the alternate current', () => {
    let state = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldWakeformShoalsScene()
    );
    const outOfReach = stepThreefoldSimulation(state, { type: 'interact' });
    expect(outOfReach).toBe(state);
    expect(isThreefoldWakeformInReach(state)).toBe(false);

    for (let step = 0; step < 4; step += 1)
      state = stepThreefoldSimulation(state, {
        type: 'move',
        direction: 'right',
      });
    expect(isThreefoldWakeformInReach(state)).toBe(true);
    expect(renderThreefoldFrame(state).toast).toBe(
      'WAKEFORM IN REACH · A DIVERT'
    );

    const diverted = stepThreefoldSimulation(state, { type: 'interact' });

    expect(diverted.wakeformShoals).toEqual({
      wakeformDiverted: true,
      outerDefenseBreached: false,
    });
    expect(diverted.scene.creatures).toEqual([]);
    expect(diverted.elapsedGameSeconds).toBe(state.elapsedGameSeconds + 15);
    expect(renderThreefoldFrame(diverted).toast).toBe(
      'WAKEFORM GUIDED NORTH · CURRENT DIVERTED'
    );
    expect(stepThreefoldSimulation(diverted, { type: 'interact' })).toBe(
      diverted
    );

    const storageValues = new Map();
    const storage = {
      getItem: key => storageValues.get(key) ?? null,
      setItem: (key, value) => storageValues.set(key, value),
      removeItem: key => storageValues.delete(key),
    };
    const shoalsStore = createThreefoldSimulationSaveStore(
      storage,
      'wakeform-shoals'
    );
    const crownbackStore = createThreefoldSimulationSaveStore(
      storage,
      'crownback-reach'
    );
    const belltopsStore = createThreefoldSimulationSaveStore(
      storage,
      'belltops'
    );
    const brokenGateStore = createThreefoldSimulationSaveStore(storage);
    expect(shoalsStore.save(diverted)).toBe(true);
    expect(
      crownbackStore.save(
        createThreefoldSimulation(
          THRESHOLDS,
          createThreefoldCrownbackReachScene()
        )
      )
    ).toBe(true);
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
    expect(shoalsStore.load()).toEqual(diverted);
    expect(
      restoreThreefoldSimulation(serializeThreefoldSimulation(diverted))
    ).toEqual(diverted);
    expect(() => normalizeThreefoldWakeformShoalsState(null)).toThrow(
      'Shoals intervention state is invalid.'
    );
    expect(() =>
      normalizeThreefoldWakeformShoalsState({
        wakeformDiverted: 'yes',
        outerDefenseBreached: false,
      })
    ).toThrow('Shoals intervention state is invalid.');
  });

  test('growth breaks the defense and records the Wakeform only when inside its new footprint', () => {
    const initial = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldWakeformShoalsScene()
    );
    const growth = previewThreefoldGrowthEffects(initial);
    const breached = stepThreefoldSimulation(initial, { type: 'grow' });

    expect(growth.geometryIds).toEqual([THREEFOLD_SHOALS_TIDEWALL_ID]);
    expect(initial.player.scale).toBe(3);
    expect(breached.player.scale).toBe(4);
    expect(breached.player.destroyedGeometryIds).toEqual([
      THREEFOLD_SHOALS_TIDEWALL_ID,
    ]);
    expect(breached.wakeformShoals.outerDefenseBreached).toBe(true);
    expect(breached.encounter.growthDeaths ?? []).toEqual([]);
    expect(renderThreefoldFrame(breached).toast).toBe(
      'OUTER WALL BROKEN · FLOW DIVERTED SEAWARD'
    );

    let approached = initial;
    for (let step = 0; step < 6; step += 1)
      approached = stepThreefoldSimulation(approached, {
        type: 'move',
        direction: 'right',
      });
    const inReachGrowth = previewThreefoldGrowthEffects(approached);
    expect(inReachGrowth.geometryIds).toContain(THREEFOLD_SHOALS_TIDEWALL_ID);
    expect(inReachGrowth.creatureIds).toEqual([THREEFOLD_WAKEFORM_ID]);
    expect(
      renderThreefoldFrame(approached).shapes.map(shape => shape.text)
    ).toContain('A KILLS WAKEFORM');

    const defeated = stepThreefoldSimulation(approached, { type: 'grow' });
    expect(defeated.encounter.growthDeaths).toEqual([
      { creatureId: THREEFOLD_WAKEFORM_ID, cause: 'growth' },
    ]);
    expect(defeated.wakeformShoals.outerDefenseBreached).toBe(true);
    expect(renderThreefoldFrame(defeated).toast).toBe(
      'OUTER WALL BROKEN · WAKEFORM LOST · FLOW DIVERTED'
    );
    expect(
      restoreThreefoldSimulation(serializeThreefoldSimulation(defeated))
    ).toEqual(defeated);
  });
});
