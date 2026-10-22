import {
  createThreefoldGrainlandsScene,
  createThreefoldGrainlandsState,
  normalizeThreefoldGrainlandsState,
  THREEFOLD_GRAINLANDS_BRIDGE_ID,
  THREEFOLD_GRAINLANDS_IRU_ID,
  THREEFOLD_GRAINLANDS_NURSERY_ID,
  THREEFOLD_GRAINLANDS_SPIDER_ID,
} from '../../../../src/core/browser/game/threefold/grainlands.js';
import {
  createThreefoldSimulationSaveStore,
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/save.js';
import { renderThreefoldFrame } from '../../../../src/core/browser/game/threefold/renderer.js';
import {
  createThreefoldSimulation,
  previewThreefoldGrowthEffects,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';
import { isThreefoldInteractableInReach } from '../../../../src/core/browser/game/threefold/scene-utils.js';
import { heightAtScale } from '../../../../src/core/browser/game/threefold/spatial.js';

const CRISIS_THRESHOLDS = {
  urgentAtMinutes: 4,
  surgeAtMinutes: 9,
  aftermathAtMinutes: 15,
};

/** @returns {ReturnType<typeof createThreefoldSimulation>} Fresh Grainlands route. */
function createGrainlandsRun() {
  return createThreefoldSimulation(
    CRISIS_THRESHOLDS,
    createThreefoldGrainlandsScene()
  );
}

describe('THREEFOLD Grainlands nursery crossing', () => {
  test('authors the 6.77 cm nursery, Iru, and a substantially larger spider', () => {
    const scene = createThreefoldGrainlandsScene();
    const state = createGrainlandsRun();
    const frame = renderThreefoldFrame(state);
    const spider = scene.creatures[0];
    const spiderLength = spider.bounds.max.x - spider.bounds.min.x;

    expect(state.scene.id).toBe('grainlands');
    expect(state.player.scale).toBe(-3);
    expect(state.player.minimumUnlockedScale).toBe(-3);
    expect(heightAtScale(state.player.scale)).toBeCloseTo(0.0677, 3);
    expect(scene.interactables.map(({ id }) => id)).toContain(
      THREEFOLD_GRAINLANDS_IRU_ID
    );
    expect(scene.geometry.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        THREEFOLD_GRAINLANDS_BRIDGE_ID,
        THREEFOLD_GRAINLANDS_NURSERY_ID,
      ])
    );
    expect(spider.id).toBe(THREEFOLD_GRAINLANDS_SPIDER_ID);
    expect(spiderLength).toBeCloseTo(0.18, 5);
    expect(spiderLength / heightAtScale(-3)).toBeGreaterThan(2.6);
    expect(frame.quest).toBe('The Nursery Crossing');
    expect(frame.threefold).toMatchObject({
      spiderFate: 'present',
      bridgeOutcome: 'intact',
      nurseryId: THREEFOLD_GRAINLANDS_NURSERY_ID,
      elapsedGameSeconds: 0,
    });
    expect(frame.threefold.growthPreviewGeometryIds).toContain(
      THREEFOLD_GRAINLANDS_BRIDGE_ID
    );
    expect(frame.threefold.growthPreviewCreatureIds).toContain(
      THREEFOLD_GRAINLANDS_SPIDER_ID
    );
    expect(frame.shapes.every(({ x, y }) => x % 8 === 0 && y % 8 === 0)).toBe(
      true
    );
    expect(
      frame.shapes
        .filter(({ type }) => type === 'rect')
        .every(({ width, height }) => width % 8 === 0 && height % 8 === 0)
    ).toBe(true);
    expect(createThreefoldGrainlandsState()).toEqual({
      spiderFate: 'present',
      bridgeOutcome: 'intact',
    });
    expect(scene.spawn).not.toBe(createThreefoldGrainlandsScene().spawn);
  });

  test('Iru baits the spider away through a reachable interaction and preserves the bridge', () => {
    const initial = createGrainlandsRun();
    expect(
      isThreefoldInteractableInReach(initial, THREEFOLD_GRAINLANDS_IRU_ID)
    ).toBe(true);

    const state = stepThreefoldSimulation(initial, { type: 'interact' });
    const frame = renderThreefoldFrame(state);

    expect(state.grainlands).toEqual({
      spiderFate: 'baited-away',
      bridgeOutcome: 'intact',
    });
    expect(state.elapsedGameSeconds).toBe(15);
    expect(state.crisis).toEqual(initial.crisis);
    expect(state.episode).toEqual(initial.episode);
    expect(previewThreefoldGrowthEffects(state).creatureIds).not.toContain(
      THREEFOLD_GRAINLANDS_SPIDER_ID
    );
    expect(frame.toast).toBe('Iru welcomes Mara; spider leaves, bridge holds.');
    expect(frame.threefold.spiderFate).toBe('baited-away');
    expect(frame.shapes).not.toContainEqual(
      expect.objectContaining({ x: 64, y: 56 })
    );

    const repeated = stepThreefoldSimulation(state, { type: 'interact' });
    expect(repeated.grainlands).toEqual(state.grainlands);
    expect(repeated.elapsedGameSeconds).toBe(30);
  });

  test('growth overpowers the spider and breaks its bridge with physical overlap', () => {
    const initial = createGrainlandsRun();
    const state = stepThreefoldSimulation(initial, { type: 'grow' });
    const frame = renderThreefoldFrame(state);

    expect(state.player.scale).toBe(-2);
    expect(state.grainlands).toEqual({
      spiderFate: 'overpowered',
      bridgeOutcome: 'broken',
    });
    expect(state.player.destroyedGeometryIds).toContain(
      THREEFOLD_GRAINLANDS_BRIDGE_ID
    );
    expect(state.encounter.growthDeaths).toContainEqual({
      creatureId: THREEFOLD_GRAINLANDS_SPIDER_ID,
      cause: 'growth',
    });
    expect(state.elapsedGameSeconds).toBe(15);
    expect(state.crisis).toEqual(initial.crisis);
    expect(state.episode).toEqual(initial.episode);
    expect(frame.toast).toBe('Iru fears Mara; growth breaks nursery bridge.');
    expect(frame.threefold).toMatchObject({
      spiderFate: 'overpowered',
      bridgeOutcome: 'broken',
    });
    expect(previewThreefoldGrowthEffects(state).creatureIds).not.toContain(
      THREEFOLD_GRAINLANDS_SPIDER_ID
    );
  });

  test('out-of-reach interactions are inert and route time stays separate', () => {
    const state = createGrainlandsRun();
    state.player = {
      ...state.player,
      position: { x: 0.05, y: 0.2 },
    };
    expect(
      isThreefoldInteractableInReach(state, THREEFOLD_GRAINLANDS_IRU_ID)
    ).toBe(false);

    const next = stepThreefoldSimulation(state, { type: 'interact' });
    expect(next.grainlands).toEqual(state.grainlands);
    expect(next.elapsedGameSeconds).toBe(state.elapsedGameSeconds + 15);
    expect(next.crisis).toEqual(state.crisis);
    expect(next.episode).toEqual(state.episode);
    const clearFrame = renderThreefoldFrame(next);
    expect(clearFrame.threefold.growthPreviewGeometryIds).not.toContain(
      THREEFOLD_GRAINLANDS_BRIDGE_ID
    );
    expect(
      clearFrame.shapes.every(({ x, y }) => x % 8 === 0 && y % 8 === 0)
    ).toBe(true);
  });

  test('exports each outcome under an isolated schema-v1 save key', () => {
    const baited = stepThreefoldSimulation(createGrainlandsRun(), {
      type: 'interact',
    });
    const broken = stepThreefoldSimulation(createGrainlandsRun(), {
      type: 'grow',
    });
    const serialized = serializeThreefoldSimulation(broken);
    const envelope = JSON.parse(serialized);

    expect(envelope.schemaVersion).toBe(1);
    expect(envelope.sceneId).toBe('grainlands');
    const restoredBroken = restoreThreefoldSimulation(serialized);
    const restoredBaited = restoreThreefoldSimulation(
      serializeThreefoldSimulation(baited)
    );
    expect(restoredBroken).toEqual(broken);
    expect(renderThreefoldFrame(restoredBroken).toast).toBe(
      'Iru fears Mara; growth breaks nursery bridge.'
    );
    expect(restoredBaited).toEqual(baited);
    expect(renderThreefoldFrame(restoredBaited).toast).toBe(
      'Iru welcomes Mara; spider leaves, bridge holds.'
    );

    const records = new Map();
    const storage = {
      getItem: key => records.get(key) ?? null,
      setItem: (key, value) => records.set(key, value),
      removeItem: key => records.delete(key),
    };
    const grainlandsStore = createThreefoldSimulationSaveStore(
      storage,
      'grainlands'
    );
    const defaultStore = createThreefoldSimulationSaveStore(storage);
    expect(grainlandsStore.save(broken)).toBe(true);
    expect(
      defaultStore.save(createThreefoldSimulation(CRISIS_THRESHOLDS))
    ).toBe(true);
    expect([...records.keys()]).toEqual(['dadeto.threefold.campaign.v1']);
    expect(grainlandsStore.load()).toEqual(broken);

    const unsupported = JSON.parse(serialized);
    unsupported.schemaVersion = 2;
    expect(restoreThreefoldSimulation(JSON.stringify(unsupported))).toBeNull();
    const inconsistent = JSON.parse(serialized);
    inconsistent.state.grainlands.bridgeOutcome = 'intact';
    expect(restoreThreefoldSimulation(JSON.stringify(inconsistent))).toBeNull();
  });

  test('normalizes only consistent spider and bridge outcomes', () => {
    expect(() => normalizeThreefoldGrainlandsState(null)).toThrow(
      'Grainlands state is invalid.'
    );
    expect(() =>
      normalizeThreefoldGrainlandsState({
        spiderFate: 'escaped',
        bridgeOutcome: 'intact',
      })
    ).toThrow('Grainlands spider fate is invalid.');
    expect(() =>
      normalizeThreefoldGrainlandsState({
        spiderFate: 'present',
        bridgeOutcome: 'washed-away',
      })
    ).toThrow('Grainlands bridge outcome is invalid.');
    expect(() =>
      normalizeThreefoldGrainlandsState({
        spiderFate: 'overpowered',
        bridgeOutcome: 'intact',
      })
    ).toThrow('Overpowering the spider must break the bridge.');
    expect(
      normalizeThreefoldGrainlandsState({
        spiderFate: 'baited-away',
        bridgeOutcome: 'broken',
      })
    ).toEqual({ spiderFate: 'baited-away', bridgeOutcome: 'broken' });
  });
});
