import {
  createThreefoldBelltopsScene,
  normalizeThreefoldBelltopsFoldglassRival,
} from '../../../../src/core/browser/game/threefold/belltops.js';
import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';

/** @returns {Record<string, any>} Isolated campaign storage. */
function createStorage() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}

/**
 * @param {Record<string, any>} storage Shared campaign storage.
 * @returns {Record<string, any>} Belltops test runtime.
 */
function rivalRuntime(storage) {
  const scene = createThreefoldBelltopsScene();
  const rival = scene.creatures.find(
    creature => creature.id === 'belltops-foldglass-rival'
  );
  if (!rival) throw new Error('Belltops must author the Foldglass rival.');
  scene.spawn = {
    ...scene.spawn,
    position: { ...rival.position },
  };
  return createThreefoldRuntime({ storage, scene });
}

describe('THREEFOLD Foldglass rival', () => {
  test('normalizes legacy and malformed saved scales without inventing engagement', () => {
    expect(normalizeThreefoldBelltopsFoldglassRival(null)).toEqual({
      scale: 3,
      engaged: false,
    });
    expect(
      normalizeThreefoldBelltopsFoldglassRival({ scale: 4, engaged: true })
    ).toEqual({ scale: 4, engaged: true });
    expect(
      normalizeThreefoldBelltopsFoldglassRival({ scale: 5, engaged: 'yes' })
    ).toEqual({ scale: 3, engaged: false });
  });

  test('requires a reachable approach and exposes an accessible engagement prompt', () => {
    const inaccessibleScene = createThreefoldBelltopsScene();
    inaccessibleScene.spawn = {
      ...inaccessibleScene.spawn,
      position: { x: 20, y: 16 },
    };
    const runtime = createThreefoldRuntime({
      storage: createStorage(),
      scene: inaccessibleScene,
    });
    const initialElapsed = runtime.getState().elapsedGameSeconds;
    const initialRival = runtime
      .getState()
      .scene.creatures.find(
        creature => creature.id === 'belltops-foldglass-rival'
      );

    runtime.frame();
    runtime.dispatch('interact');
    expect(runtime.getState().foldglassRival.engaged).toBe(false);
    expect(runtime.getState().elapsedGameSeconds).toBe(initialElapsed + 15);
    expect(
      runtime
        .getState()
        .scene.creatures.find(
          creature => creature.id === 'belltops-foldglass-rival'
        )
    ).toEqual(initialRival);
    expect(runtime.frame().toast).not.toContain('A ENGAGE');

    const approached = createThreefoldRuntime({
      storage: createStorage(),
      scene: createThreefoldBelltopsScene(),
    });
    approached.dispatch('up');
    approached.dispatch('up');
    expect(approached.frame().toast).toContain('A ENGAGE');
    approached.dispatch('interact');
    expect(approached.getState().foldglassRival.engaged).toBe(true);
    expect(approached.getState().elapsedGameSeconds).toBeGreaterThan(0);
  });

  test('reachable scale changes move both bodies and preserve the rival across a regional save', () => {
    const storage = createStorage();
    const runtime = rivalRuntime(storage);

    expect(runtime.getState().foldglassRival).toMatchObject({
      scale: 3,
      engaged: false,
    });
    runtime.dispatch('interact');
    expect(runtime.getState().foldglassRival.engaged).toBe(true);

    runtime.dispatch('shrink');
    expect(runtime.getState().player.scale).toBe(1);
    expect(runtime.getState().foldglassRival).toMatchObject({
      scale: 2,
      engaged: true,
    });
    expect(runtime.getState().player.anchor).toBe(7);
    const rival = runtime
      .getState()
      .scene.creatures.find(
        creature => creature.id === 'belltops-foldglass-rival'
      );
    expect(rival.bounds.max.z).toBeLessThan(50);

    const restored = rivalRuntime(storage);
    expect(restored.getState().foldglassRival).toEqual(
      runtime.getState().foldglassRival
    );
    expect(restored.getState().scene.creatures).toEqual(
      runtime.getState().scene.creatures
    );
  });

  test('inside growth can kill the named rival and the terminal outcome survives campaign restore', () => {
    const storage = createStorage();
    const runtime = createThreefoldRuntime({
      storage,
      scene: createThreefoldBelltopsScene(),
    });
    const stalePage = rivalRuntime(storage);
    runtime.dispatch('up');
    runtime.dispatch('up');
    runtime.dispatch('interact');
    runtime.dispatch('shrink');
    expect(runtime.getState().player.scale).toBe(1);
    expect(runtime.getState().foldglassRival).toMatchObject({
      scale: 2,
      engaged: true,
    });
    for (let index = 0; index < 9; index += 1) runtime.dispatch('up');

    expect(runtime.frame().threefold.growthPreviewCreatureIds).toContain(
      'belltops-foldglass-rival'
    );
    runtime.dispatch('grow');
    expect(runtime.getState().player.scale).toBe(2);
    expect(runtime.getState().encounter.growthDeaths).toContainEqual({
      creatureId: 'belltops-foldglass-rival',
      cause: 'growth',
    });
    expect(runtime.frame().threefold.growthPreviewCreatureIds).not.toContain(
      'belltops-foldglass-rival'
    );
    expect(runtime.frame().toast).toContain('FOLDGLASS RIVAL LOST TO GROWTH');
    expect(stalePage.getState().encounter.growthDeaths).toContainEqual({
      creatureId: 'belltops-foldglass-rival',
      cause: 'growth',
    });

    const backup = runtime.exportCampaign();
    const restored = rivalRuntime(createStorage());
    restored.importCampaign(backup);
    expect(restored.getState().encounter.growthDeaths).toContainEqual({
      creatureId: 'belltops-foldglass-rival',
      cause: 'growth',
    });
    expect(restored.getState().scene.creatures).toEqual(
      runtime.getState().scene.creatures
    );
    restored.resetSave();
    expect(restored.getState().encounter.growthDeaths).toContainEqual({
      creatureId: 'belltops-foldglass-rival',
      cause: 'growth',
    });
    expect(restored.frame().toast).toContain('FOLDGLASS RIVAL LOST TO GROWTH');
  });

  test('leaving the confrontation ends it without harming the rival', () => {
    const runtime = rivalRuntime(createStorage());
    runtime.dispatch('interact');
    expect(runtime.getState().foldglassRival.engaged).toBe(true);

    for (let index = 0; index < 8; index += 1) runtime.dispatch('right');

    expect(runtime.getState().foldglassRival.engaged).toBe(false);
    expect(runtime.getState().encounter.growthDeaths || []).not.toContainEqual({
      creatureId: 'belltops-foldglass-rival',
      cause: 'growth',
    });
  });
});
