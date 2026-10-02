import { jest } from '@jest/globals';
import { createMosslightRuntime } from '../../../../src/core/browser/game/mosslight-valley/runtime.js';
import { registerMosslightTools } from '../../../../src/core/browser/game/mosslight-valley/webmcp.js';

/**
 * Set up registered game tools against the real deterministic runtime.
 * @param {boolean} removable Whether unregisterTool is supported.
 * @returns {object} Runtime and tool observations.
 */
function setup(removable = true) {
  const runtime = createMosslightRuntime();
  runtime.start();
  const tools = new Map();
  const modelContext = {
    registerTool: jest.fn(tool => tools.set(tool.name, tool)),
  };
  if (removable) {
    modelContext.unregisterTool = jest.fn();
  }
  const redraw = jest.fn();
  const dispose = registerMosslightTools({ modelContext, runtime, redraw });
  return { runtime, tools, modelContext, redraw, dispose };
}

/**
 * Decode a synchronous tool response.
 * @param {object} response Tool response.
 * @returns {object} Structured result.
 */
function decode(response) {
  return JSON.parse(response.content[0].text);
}

test('registration is optional on unsupported browsers', () => {
  const runtime = createMosslightRuntime();
  const redraw = jest.fn();
  registerMosslightTools({ runtime, redraw })();
  registerMosslightTools({ runtime, redraw, modelContext: {} })();
  expect(redraw).not.toHaveBeenCalled();
});

test('observe exposes readable map, actor, dialogue, journal and action state without mutation', () => {
  const { runtime, tools } = setup();
  const before = runtime.exportSave();
  const observation = decode(tools.get('mosslight_observe').execute());
  expect(observation.state.world.map.blocked).toEqual(
    runtime.getSnapshot().world.map.blocked
  );
  expect(observation.state.world.player).toEqual(
    runtime.getSnapshot().world.player
  );
  expect(observation.state.world.npcs.length).toBeGreaterThan(0);
  expect(observation.journal).toEqual(runtime.getJournal());
  expect(observation.actions).toContain('confirm');
  expect(runtime.exportSave()).toBe(before);
  expect([...tools.keys()]).toEqual([
    'mosslight_observe',
    'mosslight_act',
    'mosslight_export_save',
    'mosslight_import_save',
  ]);
});

test('batched repeated presses use live simulation, pause the clock and redraw', () => {
  const { runtime, tools, redraw } = setup();
  const expected = createMosslightRuntime();
  expected.start();
  for (const action of [
    'right',
    'right',
    'up',
    'interact',
    'confirm',
    'confirm',
  ]) {
    expected.dispatch({ actions: [] });
    expected.dispatch({ actions: [action] });
  }
  const actual = decode(
    tools.get('mosslight_act').execute({
      actions: ['right', 'right', 'up', 'interact', 'confirm', 'confirm'],
    })
  );
  expect(actual.state).toEqual(expected.getSnapshot());
  expect(redraw).toHaveBeenCalledTimes(1);
  const before = runtime.exportSave();
  runtime.step(500, ['left']);
  expect(runtime.exportSave()).toBe(before);
});

test.each([
  undefined,
  null,
  [],
  'right',
  {},
  { actions: [] },
  { actions: 'right' },
  { actions: ['right', 'teleport'] },
  { actions: [null] },
  { actions: Array(33).fill('right') },
])('malformed batches never mutate or pause the game: %j', request => {
  const { runtime, tools, redraw } = setup();
  const before = runtime.exportSave();
  expect(() => tools.get('mosslight_act').execute(request)).toThrow(TypeError);
  expect(runtime.exportSave()).toBe(before);
  expect(redraw).not.toHaveBeenCalled();
  runtime.step(125, ['right']);
  expect(runtime.getSnapshot().tick).toBe(1);
});

test('maximum batch length is accepted and export/import round trips visible state', () => {
  const { runtime, tools, redraw } = setup();
  const saved = decode(tools.get('mosslight_export_save').execute()).save;
  tools.get('mosslight_act').execute({ actions: Array(32).fill('wait') });
  expect(runtime.getSnapshot().tick).toBe(64);
  expect(runtime.exportSave()).not.toBe(saved);
  const restored = decode(
    tools.get('mosslight_import_save').execute({ save: saved })
  );
  expect(restored.state.tick).toBe(0);
  expect(runtime.exportSave()).toBe(saved);
  expect(redraw).toHaveBeenCalledTimes(2);
  expect(tools.get('mosslight_import_save').annotations.destructiveHint).toBe(
    true
  );
});

test.each([undefined, null, {}, { save: 7 }, { save: 'not-json' }])(
  'invalid imports leave progress unchanged: %j',
  request => {
    const { runtime, tools, redraw } = setup();
    const before = runtime.exportSave();
    expect(() => tools.get('mosslight_import_save').execute(request)).toThrow();
    expect(runtime.exportSave()).toBe(before);
    expect(redraw).not.toHaveBeenCalled();
  }
);

test.each([false, true])(
  'dispose invalidates every callback and unregisters when supported=%s',
  removable => {
    const { tools, dispose, modelContext } = setup(removable);
    dispose();
    dispose();
    for (const tool of tools.values()) {
      expect(() => tool.execute({ actions: ['right'], save: '{}' })).toThrow(
        'disposed'
      );
    }
    if (removable) {
      expect(modelContext.unregisterTool).toHaveBeenCalledTimes(4);
    }
  }
);
