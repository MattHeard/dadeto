import { jest } from '@jest/globals';
import { CONTENT } from '../../../../src/core/browser/game/mosslight-valley/content.js';
import { createSimulation } from '../../../../src/core/browser/game/mosslight-valley/simulation.js';
import { createMosslightRuntime } from '../../../../src/core/browser/game/mosslight-valley/runtime.js';
import { mosslightValley } from '../../../../src/core/browser/game/mosslight-valley/mosslightValley.js';
import {
  resetSavePrompt,
  serializeSave,
} from '../../../../src/core/browser/game/mosslight-valley/save.js';

/**
 * Share realistic multi-slot permanent storage without a browser.
 * @returns {{data:Record<string,any>,env:Map<string,Function>}} Storage fixture.
 */
function storageFixture() {
  const data = { unrelatedToy: { answer: 42 } };
  const env = new Map([
    ['setLocalPermanentData', update => Object.assign(data, update)],
  ]);
  return { data, env };
}

test('reset erases the entire current adventure, persists immediately and preserves other slots', () => {
  const { data, env } = storageFixture();
  const runtime = createMosslightRuntime({ env, slot: 2 });
  runtime.dispatch('right');
  const preserved = runtime.exportSave();
  runtime.loadSlot(1);
  const state = runtime.getState();
  runtime.setState({
    ...state,
    inventory: { dreamFragment: 9 },
    farm: { crop: 'moonTurnip' },
    journal: ['dreamFragment'],
    dialogue: {
      actorId: 'mira',
      lines: [{ text: 'Old adventure' }],
      index: 0,
      choices: [],
    },
    battle: { name: 'Old enemy' },
    ending: { text: 'Old ending' },
    mode: 'battle',
    lastActions: ['right'],
    moveCooldown: 135,
    tick: 99,
    world: {
      ...state.world,
      time: 22,
      day: 20,
      season: 'winter',
      weather: 'dream',
      flags: { ending: 'gentle', memoryCount: 3 },
      relationships: { mira: 9 },
      player: { ...state.world.player, x: 12 },
    },
  });
  runtime.save();
  const frame = runtime.resetSave();
  expect(frame.mode).toBe('world');
  expect(runtime.getState()).toEqual(createSimulation());
  expect(runtime.getSlot()).toBe(1);
  expect(createMosslightRuntime({ env, slot: 1 }).getState()).toEqual(
    createSimulation()
  );
  expect(data['mosslight-valley-saves-v2'].slots[2]).toBe(preserved);
  expect(data.unrelatedToy).toEqual({ answer: 42 });
  expect(runtime.listSaves()).toEqual([1, 2]);
});

test('reset honors injected content, clears fractional timing and preserves pause lifecycle', () => {
  const stop = jest.fn();
  const content = {
    ...CONTENT,
    start: { ...CONTENT.start, name: 'New Aster', x: 4 },
  };
  const runtime = createMosslightRuntime({ content, audio: { stop } });
  runtime.start();
  runtime.step(75, []);
  runtime.resetSave();
  expect(stop).toHaveBeenCalledTimes(1);
  expect(runtime.isRunning()).toBe(true);
  expect(runtime.getState()).toEqual(createSimulation(content));
  runtime.step(50, []);
  expect(runtime.getState().tick).toBe(0);
  runtime.step(75, []);
  expect(runtime.getState().tick).toBe(1);
  runtime.pause();
  runtime.resetSave();
  expect(runtime.isRunning()).toBe(false);
  runtime.step(500, ['right']);
  expect(runtime.getState()).toEqual(createSimulation(content));
  expect(createMosslightRuntime({ audio: {}, save: {} }).resetSave().type).toBe(
    'mosslight-valley'
  );
});

test('embedded reset requires explicit confirmation and does not also run supplied actions', () => {
  const { data, env } = storageFixture();
  mosslightValley(JSON.stringify({ actions: ['right'] }), env);
  const before = JSON.stringify(data);
  for (const confirmed of [undefined, false, 'true']) {
    const frame = JSON.parse(
      mosslightValley(
        JSON.stringify({ reset: true, confirmed, actions: ['right'] }),
        env
      )
    );
    expect(frame.player.x).toBe(7);
    expect(JSON.stringify(data)).toBe(before);
  }
  const fresh = JSON.parse(
    mosslightValley(
      JSON.stringify({
        reset: true,
        confirmed: true,
        actions: ['right'],
        save: serializeSave(createSimulation()),
      }),
      env
    )
  );
  expect(fresh.player.x).toBe(6);
  expect(fresh.tick).toBe(0);
  expect(createMosslightRuntime({ env }).getState()).toEqual(
    createSimulation()
  );
  expect(data.unrelatedToy).toEqual({ answer: 42 });
});

test('reset prompt identifies the slot, warns about erasing progress and recommends export', () => {
  expect(resetSavePrompt()).toContain('slot 01');
  expect(resetSavePrompt(2)).toContain('slot 03');
  expect(resetSavePrompt()).toContain('Other slots are safe');
  expect(resetSavePrompt()).toContain('Export your save first');
});
