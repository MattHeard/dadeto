import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';
import {
  createThreefoldSimulation,
  stepThreefoldSimulation,
} from '../../../../src/core/browser/game/threefold/simulation.js';
import { createBrokenGateScene } from '../../../../src/core/browser/game/threefold/gatehouse.js';
import { createScaleState } from '../../../../src/core/browser/game/threefold/spatial.js';
import { createThreefoldHearthgapsScene } from '../../../../src/core/browser/game/threefold/hearthgaps.js';
import { createThreefoldWeftwaysScene } from '../../../../src/core/browser/game/threefold/weftways.js';
import { createThreefoldGrainlandsScene } from '../../../../src/core/browser/game/threefold/grainlands.js';
import { createThreefoldBelltopsScene } from '../../../../src/core/browser/game/threefold/belltops.js';
import { createThreefoldSimulationSaveStore } from '../../../../src/core/browser/game/threefold/save.js';

describe('THREEFOLD handheld runtime', () => {
  test('shows a saved Broken Gate ferry loss in the Belltops harbor', () => {
    const storage = createStorageAdapter();
    const brokenGate = createThreefoldSimulation(
      { urgentAtMinutes: 4, surgeAtMinutes: 9, aftermathAtMinutes: 15 },
      createBrokenGateScene()
    );
    const ferryLost = stepThreefoldSimulation(brokenGate, {
      type: 'wait',
      elapsedGameMinutes: 9,
    });
    expect(ferryLost.episode).toMatchObject({
      ferry: 'lost',
      passengers: 'lost',
    });
    createThreefoldSimulationSaveStore(storage).save(ferryLost);

    const harbor = createThreefoldRuntime({
      scene: createThreefoldBelltopsScene(),
      storage,
    });

    expect(harbor.frame().threefold.harborMemorial).toEqual({
      title: 'Harrowfen ferry memorial',
      text: 'The Belltops harbor bell marks the Harrowfen ferry, lost in the Broken Gate surge. Both passenger groups were lost with the ferry. No passenger names are listed.',
    });
    expect(harbor.frame().threefold.orlaHarborResponse).toEqual({
      title: "Orla's harbor response",
      text: "Orla's trust in Mara's harbor judgment is shaken after both passenger groups were lost with the ferry. She asks for a full account; the record does not establish which warnings reached the ferry.",
    });
    expect(harbor.getState().episode.ferry).toBe('afloat');
  });

  test('does not carry an unsaved or surviving ferry into the harbor', () => {
    const storage = createStorageAdapter();
    const harborWithoutSource = createThreefoldRuntime({
      scene: createThreefoldBelltopsScene(),
      storage,
    });
    expect(
      harborWithoutSource.frame().threefold.harborMemorial
    ).toBeUndefined();
    expect(
      harborWithoutSource.frame().threefold.orlaHarborResponse
    ).toBeUndefined();

    createThreefoldSimulationSaveStore(storage).save(
      createThreefoldSimulation(
        { urgentAtMinutes: 4, surgeAtMinutes: 9, aftermathAtMinutes: 15 },
        createBrokenGateScene()
      )
    );
    const harborWithFerryAfloat = createThreefoldRuntime({
      scene: createThreefoldBelltopsScene(),
      storage,
    });
    expect(
      harborWithFerryAfloat.frame().threefold.harborMemorial
    ).toBeUndefined();
    expect(
      harborWithFerryAfloat.frame().threefold.orlaHarborResponse
    ).toBeUndefined();

    const otherRegion = createThreefoldRuntime({
      scene: createThreefoldGrainlandsScene(),
      storage,
    });
    expect(otherRegion.frame().threefold.harborMemorial).toBeUndefined();
    expect(otherRegion.frame().threefold.orlaHarborResponse).toBeUndefined();
  });

  test('does not memorialize an invalid Broken Gate save', () => {
    const storage = createStorageAdapter();
    storage.setItem('dadeto.threefold.simulation-save.v1', '{malformed');

    const harbor = createThreefoldRuntime({
      scene: createThreefoldBelltopsScene(),
      storage,
    });

    expect(harbor.frame().threefold.harborMemorial).toBeUndefined();
    expect(harbor.frame().threefold.orlaHarborResponse).toBeUndefined();
  });

  test('keeps Hearthgaps snapshot time on its isolated region clock', () => {
    const runtime = createThreefoldRuntime({
      scene: createThreefoldHearthgapsScene(),
      storage: new Map(),
    });

    expect(runtime.getSnapshot().world).toMatchObject({
      map: { name: 'HEARTHGAPS' },
      time: 0,
    });
    runtime.dispatch({ type: 'wait', elapsedGameMinutes: 2 });
    expect(runtime.getSnapshot().world.time).toBe(2 / 60);
    expect(runtime.getState().crisis.elapsedMinutes).toBe(0);
  });

  test('keeps Weftways snapshot time on its isolated region clock', () => {
    const runtime = createThreefoldRuntime({
      scene: createThreefoldWeftwaysScene(),
      storage: new Map(),
    });

    expect(runtime.getSnapshot().world).toMatchObject({
      map: { name: 'WEFTWAYS' },
      time: 0,
    });
    runtime.dispatch({ type: 'wait', elapsedGameMinutes: 2 });
    expect(runtime.getSnapshot().world.time).toBe(2 / 60);
    expect(runtime.getState().crisis.elapsedMinutes).toBe(0);
  });

  test('keeps Grainlands snapshot time on its isolated region clock', () => {
    const runtime = createThreefoldRuntime({
      scene: createThreefoldGrainlandsScene(),
      storage: new Map(),
    });

    expect(runtime.getSnapshot().world).toMatchObject({
      map: { name: 'GRAINLANDS' },
      time: 0,
    });
    runtime.dispatch({ type: 'wait', elapsedGameMinutes: 2 });
    expect(runtime.getSnapshot().world.time).toBe(2 / 60);
    expect(runtime.getState().crisis.elapsedMinutes).toBe(0);
  });

  test('maps A to fight and X to bypass when the rat is in reach', () => {
    const runtime = createThreefoldRuntime(new Map());
    runtime.start();
    runtime.dispatch('shrink');
    runtime.dispatch('shrink');
    for (let step = 0; step < 7; step += 1) runtime.dispatch('right');
    expect(runtime.frame().toast).toContain(
      'RAT IN REACH · A FIGHT · X BYPASS'
    );
    expect(runtime.frame().quickAction).toBe('fight');

    runtime.step(125, ['a']);
    expect(runtime.getState().encounter.ratFate).toBe('repelled');

    runtime.resetSave();
    runtime.dispatch('shrink');
    runtime.dispatch('shrink');
    for (let step = 0; step < 7; step += 1) runtime.dispatch('right');
    runtime.step(125, ['x']);
    expect(runtime.getState().encounter.ratFate).toBe('bypassed');
  });

  test('maps A to lethal growth when Mara fits inside the rat', () => {
    const scene = createBrokenGateScene();
    scene.spawn = createScaleState(
      { x: 3.28, y: 4 },
      {
        scale: -2,
        anchor: 8,
        minimumUnlockedScale: -2,
        maximumUnlockedScale: 1,
      }
    );
    const initial = createThreefoldSimulation(
      {
        urgentAtMinutes: 4,
        surgeAtMinutes: 9,
        aftermathAtMinutes: 15,
      },
      scene
    );
    const state = stepThreefoldSimulation(initial, {
      type: 'wait',
      elapsedGameMinutes: 0.25,
    });
    let didSave = false;
    const save = {
      load: () => state,
      save: () => {
        didSave = true;
      },
    };
    const runtime = createThreefoldRuntime({ save });
    runtime.start();

    expect(runtime.frame().toast).toContain('RAT INSIDE · A GROW · X BYPASS');
    expect(runtime.frame().quickAction).toBe('grow');
    runtime.step(125, ['a']);

    expect(runtime.getState().player.scale).toBe(-1);
    expect(runtime.getState().encounter).toEqual({
      ratFate: 'killed',
      ratAction: 'growth',
      growthDeaths: [{ creatureId: 'gatehouse-rat', cause: 'growth' }],
    });
    expect(didSave).toBe(true);
  });

  test('accepts fight and bypass as named simulation commands', () => {
    const fought = createThreefoldRuntime(new Map());
    fought.dispatch('shrink');
    fought.dispatch('shrink');
    for (let step = 0; step < 7; step += 1) fought.dispatch('right');
    fought.dispatch('fight');
    expect(fought.getState().encounter.ratFate).toBe('repelled');

    const bypassed = createThreefoldRuntime(new Map());
    bypassed.dispatch('shrink');
    bypassed.dispatch('shrink');
    for (let step = 0; step < 7; step += 1) bypassed.dispatch('right');
    bypassed.dispatch('bypass');
    expect(bypassed.getState().encounter.ratFate).toBe('bypassed');
  });

  test('maps handheld actions to deterministic simulation steps and saves the run', () => {
    const env = new Map();
    const runtime = createThreefoldRuntime(env);
    const openingFrame = runtime.start();

    expect(openingFrame.threefold).toMatchObject({
      scale: 0,
      anchor: 8,
      crisisStage: 'rising',
    });
    expect(openingFrame.dialogue.actorId).toBe('dock-worker');
    runtime.step(125, ['up']);
    expect(runtime.frame().dialogue).toBeNull();
    expect(runtime.getState().player.position).toEqual({ x: 3, y: 3.7968 });
    runtime.step(125, ['a']);
    expect(runtime.getState().player.scale).toBe(1);
    expect(runtime.getState().player.destroyedGeometryIds).toContain(
      'gatehouse-west-wall'
    );
    runtime.step(125, ['a']);
    expect(runtime.getState().crisis.elapsedMinutes).toBe(0.5);
    runtime.step(125, []);
    runtime.step(125, ['b']);
    expect(runtime.getState().player.scale).toBe(0);
    runtime.step(125, []);
    runtime.step(125, ['x']);
    expect(runtime.getState().crisis).toMatchObject({
      elapsedMinutes: 15,
      stage: 'aftermath',
    });
    runtime.step(125, ['y']);

    const reloaded = createThreefoldRuntime(env);
    expect(reloaded.getState()).toEqual(runtime.getState());
    expect(runtime.getSnapshot().world.map.name).toBe('THE BROKEN GATE');
    expect(runtime.getSnapshot().tick).toBe(8);
  });

  test('pausing is inert and named dispatch commands share the simulation contract', () => {
    const runtime = createThreefoldRuntime({});
    runtime.start();
    runtime.pause();
    runtime.step(500, ['right']);
    expect(runtime.getState().crisis.elapsedMinutes).toBe(0);

    runtime.dispatch({ type: 'move', direction: 'right' });
    runtime.dispatch({ type: 'wait', elapsedGameMinutes: 2 });
    expect(runtime.getState().crisis.elapsedMinutes).toBe(2.25);
    runtime.dispatch('grow');
    runtime.dispatch('interact');
    runtime.dispatch('unsupported');
    expect(runtime.getState().player.scale).toBe(1);
    expect(runtime.getState().episode.passengers).toBe('aboard');
    runtime.resume();
    runtime.step(-50, ['left']);
    expect(runtime.getState().crisis.elapsedMinutes).toBe(2.75);
  });

  test('applies handheld interaction once per press instead of repeating while held', () => {
    const opening = createThreefoldSimulation({
      urgentAtMinutes: 4,
      surgeAtMinutes: 9,
      aftermathAtMinutes: 15,
    });
    const atMooring = {
      ...opening,
      player: createScaleState(opening.scene.interactables[0].position),
    };
    const runtime = createThreefoldRuntime({ save: { load: () => atMooring } });
    runtime.start();

    runtime.step(125, ['interact']);
    expect(runtime.getState().episode.passengers).toBe('partial');
    expect(runtime.getState().crisis.elapsedMinutes).toBe(0.25);

    runtime.step(125, ['interact']);
    expect(runtime.getState().episode.passengers).toBe('partial');
    expect(runtime.getState().crisis.elapsedMinutes).toBe(0.25);

    runtime.step(125, []);
    runtime.step(125, ['interact']);
    expect(runtime.getState().episode.passengers).toBe('evacuated');
    expect(runtime.getState().crisis.elapsedMinutes).toBe(0.5);

    runtime.step(125, ['interact']);
    expect(runtime.getState().episode.passengers).toBe('evacuated');
    expect(runtime.getState().crisis.elapsedMinutes).toBe(0.5);
  });

  test('supports default lifecycle arguments and normalizes named tool commands', () => {
    const runtime = createThreefoldRuntime();
    runtime.start();
    runtime.step();
    runtime.dispatch('right');
    runtime.dispatch(4);
    runtime.dispatch('shrink');

    expect(runtime.getState().player.scale).toBe(-1);
    expect(runtime.getState().crisis.elapsedMinutes).toBe(0.5);

    const emptyStore = createThreefoldRuntime({ save: { load: () => null } });
    emptyStore.loadSlot();
    expect(emptyStore.getState().crisis.stage).toBe('rising');
  });

  test('exports, imports, resets, and rejects invalid portable runs', () => {
    const runtime = createThreefoldRuntime(new Map());
    runtime.start();
    runtime.step(125, ['x']);
    const serialized = runtime.exportSave();
    const restored = createThreefoldRuntime({});
    restored.importSave(serialized);
    expect(restored.getState()).toEqual(runtime.getState());
    expect(() => restored.importSave('{')).toThrow(
      'Invalid THREEFOLD save data.'
    );
    restored.resetSave();
    expect(restored.getState().crisis.elapsedMinutes).toBe(0);
    expect(restored.isRunning()).toBe(false);
    expect(restored.getSlot()).toBe(0);
    expect(restored.listSaves()).toEqual([]);
    expect(restored.getJournal()).toEqual([]);
    expect(restored.save().crisis.elapsedMinutes).toBe(0);
    restored.loadSlot();
    expect(restored.frame().threefold.crisisStage).toBe('rising');
  });
});

/**
 * Adapt a local map to the Web Storage interface used by the save store.
 * @returns {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => void, removeItem: (key: string) => boolean}} Map-backed Web Storage.
 */
function createStorageAdapter() {
  const values = new Map();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}
