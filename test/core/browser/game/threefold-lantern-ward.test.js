import {
  createThreefoldLanternWardScene,
  THREEFOLD_LANTERN_WARD_SCENE_ID,
} from '../../../../src/core/browser/game/threefold/lantern-ward.js';
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

describe('THREEFOLD Lantern Ward district', () => {
  test('previews the authored +3 to +4 city footprint without changing the state', () => {
    const scene = createThreefoldLanternWardScene();
    const initial = createThreefoldSimulation(THRESHOLDS, scene);
    const unchanged = structuredClone(initial);
    const growth = previewThreefoldGrowthEffects(initial);
    const frame = renderThreefoldFrame(initial);
    const labels = frame.shapes
      .filter(shape => shape.type === 'text')
      .map(shape => shape.text);

    expect(scene.id).toBe(THREEFOLD_LANTERN_WARD_SCENE_ID);
    expect(initial.player).toMatchObject({
      scale: 3,
      minimumUnlockedScale: 2,
      maximumUnlockedScale: 4,
    });
    expect(scene.geometry.map(({ id }) => id)).toEqual([
      'lantern-ward-canal-homes',
      'lantern-ward-glassworks',
    ]);
    expect(scene.creatures.map(({ displayName }) => displayName)).toEqual([
      'MIRA',
      'TOV',
    ]);
    expect(growth).toEqual({
      geometryIds: ['lantern-ward-canal-homes', 'lantern-ward-glassworks'],
      occupantIds: [],
      creatureIds: ['lantern-ward-mira', 'lantern-ward-tov'],
    });
    expect(initial).toEqual(unchanged);
    expect(frame.world.map.name).toBe('LANTERN WARD');
    expect(frame.quest).toBe('The Lantern Ward');
    expect(frame.toast).toContain('WARD AND ITS RESIDENTS ARE AT RISK');
    expect(frame.threefold.growthPreviewIds).toEqual(growth.geometryIds);
    expect(frame.threefold.growthPreviewCreatureIds).toEqual(
      growth.creatureIds
    );
    expect(labels).toContain('A BREAKS HOMES + GLASSWORKS');
    expect(labels).toContain('A KILLS MIRA + TOV');
    expect(
      frame.shapes
        .filter(shape => shape.geometryId)
        .map(shape => shape.geometryId)
    ).toEqual(
      expect.arrayContaining([
        'lantern-ward-canal-homes',
        'lantern-ward-glassworks',
        'lantern-ward-mira',
        'lantern-ward-tov',
      ])
    );
    expect(
      frame.shapes.every(shape => shape.x % 8 === 0 && shape.y % 8 === 0)
    ).toBe(true);
    expect(
      frame.shapes
        .filter(shape => shape.type === 'rect')
        .every(shape => shape.width % 8 === 0 && shape.height % 8 === 0)
    ).toBe(true);
  });

  test('growth commits the warned damage and resident fates without gate fallout', () => {
    const initial = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldLanternWardScene()
    );
    const grown = stepThreefoldSimulation(initial, { type: 'grow' });
    const frame = renderThreefoldFrame(grown);

    expect(grown.player.scale).toBe(4);
    expect(grown.player.destroyedGeometryIds).toEqual([
      'lantern-ward-canal-homes',
      'lantern-ward-glassworks',
    ]);
    expect(grown.encounter.growthDeaths).toEqual([
      { creatureId: 'lantern-ward-mira', cause: 'growth' },
      { creatureId: 'lantern-ward-tov', cause: 'growth' },
    ]);
    expect(frame.threefold.growthPreviewIds).toEqual([]);
    expect(frame.threefold.growthPreviewCreatureIds).toEqual([]);
    expect(frame.toast).toContain('HOMES + GLASSWORKS');
    expect(frame.toast).toContain('MIRA + TOV LOST');
    expect(frame.threefold.witnessLedger).toEqual([]);
    expect(frame.threefold.testimony).toBeNull();
    expect(grown.crisis).toEqual(initial.crisis);
    expect(grown.episode).toEqual(initial.episode);
    expect(grown.elapsedGameSeconds).toBe(15);

    const waited = stepThreefoldSimulation(grown, {
      type: 'wait',
      elapsedGameMinutes: 20,
    });
    expect(waited.crisis).toBe(grown.crisis);
    expect(waited.episode).toBe(grown.episode);
    expect(waited.elapsedGameSeconds).toBe(1215);
  });

  test('the runtime A input remains growth in the district', () => {
    const runtime = createThreefoldRuntime({
      scene: createThreefoldLanternWardScene(),
    });
    runtime.start();
    runtime.step(125, ['a']);

    expect(runtime.getState().player.scale).toBe(4);
    expect(runtime.getState().encounter.growthDeaths).toHaveLength(2);
  });

  test('movement and shrinking keep district time local and interaction inert', () => {
    const initial = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldLanternWardScene()
    );
    const moved = stepThreefoldSimulation(initial, {
      type: 'move',
      direction: 'up',
    });
    const shrunk = stepThreefoldSimulation(initial, { type: 'shrink' });
    const interacted = stepThreefoldSimulation(initial, { type: 'interact' });
    const unsupported = stepThreefoldSimulation(initial, { type: 'fight' });
    const clearFrame = renderThreefoldFrame(shrunk);

    expect(moved.player.position.y).toBeLessThan(0);
    expect(moved.crisis).toBe(initial.crisis);
    expect(moved.elapsedGameSeconds).toBe(15);
    expect(shrunk.player.scale).toBe(2);
    expect(shrunk.elapsedGameSeconds).toBe(15);
    expect(clearFrame.toast).toBe('LANTERN WARD · A GROW · B SHRINK');
    expect(interacted).toBe(initial);
    expect(unsupported).toBe(initial);
  });

  test('exports district fates under an isolated save key and restores them', () => {
    const values = new Map();
    const storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: key => values.delete(key),
    };
    const wardStore = createThreefoldSimulationSaveStore(
      storage,
      THREEFOLD_LANTERN_WARD_SCENE_ID
    );
    const gateStore = createThreefoldSimulationSaveStore(storage);
    const initialWard = createThreefoldSimulation(
      THRESHOLDS,
      createThreefoldLanternWardScene()
    );
    const grownWard = stepThreefoldSimulation(initialWard, { type: 'grow' });
    const gate = createThreefoldSimulation(THRESHOLDS);

    expect(wardStore.save(grownWard)).toBe(true);
    expect(gateStore.save(gate)).toBe(true);
    expect([...values.keys()].sort()).toEqual([
      'dadeto.threefold.simulation-save.v1',
      'dadeto.threefold.simulation-save.v1.lantern-ward',
    ]);
    expect(wardStore.load()).toEqual(grownWard);
    expect(gateStore.load()).toEqual(gate);
    expect(
      restoreThreefoldSimulation(serializeThreefoldSimulation(grownWard))
    ).toEqual(grownWard);

    const unsupported = JSON.parse(serializeThreefoldSimulation(grownWard));
    unsupported.schemaVersion -= 1;
    expect(restoreThreefoldSimulation(JSON.stringify(unsupported))).toBeNull();
  });
});
