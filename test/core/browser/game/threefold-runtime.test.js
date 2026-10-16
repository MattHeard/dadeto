import { createThreefoldRuntime } from '../../../../src/core/browser/game/threefold/runtime.js';

describe('THREEFOLD handheld runtime', () => {
  test('maps handheld actions to deterministic simulation steps and saves the run', () => {
    const env = new Map();
    const runtime = createThreefoldRuntime(env);
    const openingFrame = runtime.start();

    expect(openingFrame.threefold).toMatchObject({
      scale: 0,
      anchor: 8,
      crisisStage: 'rising',
    });
    runtime.step(125, ['up']);
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
    runtime.dispatch('unsupported');
    expect(runtime.getState().player.scale).toBe(1);
    runtime.resume();
    runtime.step(-50, ['left']);
    expect(runtime.getState().crisis.elapsedMinutes).toBe(2.5);
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
