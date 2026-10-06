import {
  createSimulation,
  stepGame,
} from '../../../../src/core/browser/game/mosslight-valley/simulation.js';
import {
  controllerMenu,
  menuEntries,
  menuLines,
} from '../../../../src/core/browser/game/mosslight-valley/controls.js';
import {
  createInputState,
  updateInput,
  gamepadActions,
} from '../../../../src/core/browser/game/mosslight-valley/input.js';
import {
  toFramePayload,
  drawGameFrame,
} from '../../../../src/core/browser/game/mosslight-valley/renderer.js';
import { createMosslightRuntime } from '../../../../src/core/browser/game/mosslight-valley/runtime.js';
import {
  startBattle,
  battleAction,
} from '../../../../src/core/browser/game/mosslight-valley/combat.js';
import { CONTENT } from '../../../../src/core/browser/game/mosslight-valley/content.js';
import {
  createSaveAdapter,
  parseSave,
} from '../../../../src/core/browser/game/mosslight-valley/save.js';
import { actorAt } from '../../../../src/core/browser/game/mosslight-valley/actors.js';

const tap = (state, action) => stepGame(stepGame(state, []), [action]);

test('actor lookup tolerates a missing NPC list', () => {
  expect(actorAt({ npcs: undefined, mapId: 'village' }, 1, 1)).toBeNull();
});

test('battle action leaves state unchanged when the enemy is absent', () => {
  const state = { battle: { creatureId: 'missing' } };
  expect(battleAction(state, 'strike', CONTENT)).toBe(state);
});

test('save parser rejects a version two envelope with a null state', () => {
  expect(
    parseSave(
      JSON.stringify({
        game: 'mosslight-valley',
        version: 2,
        slot: 0,
        savedAt: new Date(0).toISOString(),
        state: null,
      })
    )
  ).toBeNull();
});

test('pause freezes idle ticks and autosaves but controller presses still close it', () => {
  const writes = [];
  const runtime = createMosslightRuntime({
    save: { save: state => writes.push(state) },
  });
  runtime.start();
  runtime.setState({
    ...createSimulation(),
    menu: { page: 'paused', selected: 0 },
  });
  runtime.step(500, []);
  expect(runtime.getSnapshot().tick).toBe(0);
  expect(writes).toHaveLength(0);
  runtime.step(125, ['x']);
  expect(runtime.getSnapshot().menu).toBeNull();
  runtime.setState({
    ...createSimulation(),
    menu: { page: 'paused', selected: 0 },
    lastActions: ['a'],
  });
  runtime.step(125, []);
  expect(runtime.getSnapshot().lastActions).toEqual([]);
  const tick = runtime.getSnapshot().tick;
  runtime.step(500, []);
  expect(runtime.getSnapshot().tick).toBe(tick);
  runtime.step(125, ['a']);
  expect(runtime.getSnapshot().menu.page).toBe('main');
});

test('selected slots and B assignments persist across independent embedded runtimes', () => {
  let data = {};
  const env = new Map([
    [
      'setLocalPermanentData',
      update => {
        data = { ...data, ...update };
        return data;
      },
    ],
  ]);
  const save = createSaveAdapter(env);
  for (const slot of [undefined, -1, 3, '1']) {
    data = { 'mosslight-valley-saves-v2': { slots: {}, activeSlot: slot } };
    expect(save.getActiveSlot()).toBe(0);
  }
  for (const slot of [0, 1, 2]) {
    save.save({ ...createSimulation(), quickAction: 'wait' }, slot);
    expect(createMosslightRuntime({ env }).getSlot()).toBe(slot);
    expect(createMosslightRuntime({ env }).getSnapshot().quickAction).toBe(
      'wait'
    );
  }
});

test('world and battle actions are reachable from the controller action menu', () => {
  const base = createSimulation();
  for (let selected = 0; selected < 6; selected++) {
    const next = tap({ ...base, menu: { page: 'actions', selected } }, 'a');
    expect(next.menu).toBeNull();
  }
  expect(tap({ ...base, quickAction: undefined }, 'b').toast).toContain(
    'water'
  );
  expect(tap({ ...base, quickAction: 'tea', inventory: {} }, 'b').toast).toBe(
    'No tea left.'
  );
  const dialogue = { ...base, dialogue: { choices: [], lines: [], index: 0 } };
  expect(tap(dialogue, 'b').dialogue).toBeNull();
  expect(tap({ ...dialogue, battle: {} }, 'b').mode).toBe('battle');
  const battle = startBattle(base, CONTENT.creatures[0]);
  expect(
    battleAction({ ...battle, inventory: {} }, 'herb', CONTENT).battle.turn
  ).toBe(0);
  const healed = battleAction(
    { ...battle, battle: { ...battle.battle, playerHp: 2 } },
    'herb',
    CONTENT
  );
  expect(healed.inventory.hearthTea).toBe(0);
  expect(healed.battle.playerHp).toBeGreaterThan(2);
  const ctx = { fillRect() {}, strokeRect() {}, fillText() {} };
  drawGameFrame(
    ctx,
    toFramePayload({
      ...base,
      menu: { page: 'main', selected: 0 },
      quickAction: undefined,
    })
  );
});

test('keyboard and gamepad expose only eight controller buttons', () => {
  for (const key of ['a', 'b', 'x', 'y', 'A', 'B', 'X', 'Y'])
    expect([
      ...updateInput(createInputState(), { type: 'keydown', key }).held,
    ]).toEqual([key.toLowerCase()]);
  for (const key of [
    'Enter',
    'Escape',
    ' ',
    'w',
    's',
    'd',
    'z',
    'j',
    't',
    'r',
    'f',
    'q',
    'c',
    'v',
    'e',
    'm',
  ])
    expect(
      updateInput(createInputState(), { type: 'keydown', key }).held.size
    ).toBe(0);
  const buttons = Array.from({ length: 16 }, (_, index) => ({
    pressed: index < 4 || index === 8 || index === 9,
  }));
  expect(gamepadActions([{ buttons }])).toEqual(['a', 'b', 'x', 'y']);
});

test('Y directions A assign B, which persists and advances time only once per press', () => {
  let state = tap(createSimulation(), 'y');
  state = tap(tap(state, 'down'), 'down');
  state = tap(state, 'a');
  expect(state.quickAction).toBe('wait');
  const time = state.world.time;
  state = tap(state, 'b');
  expect(state.world.time).toBe(time + 1);
  expect(stepGame(state, ['b']).world.time).toBe(time + 1);
});

test('journal and guide own input visibly and close with available buttons', () => {
  let state = tap(createSimulation(), 'x');
  state = tap(tap(state, 'down'), 'down');
  state = tap(state, 'a');
  expect(state.menu.page).toBe('journal');
  expect(
    toFramePayload(state).shapes.some(shape => shape.text === 'FIELD JOURNAL')
  ).toBe(true);
  const world = state.world;
  expect(tap(state, 'right').world).toEqual(world);
  state = tap(state, 'x');
  expect(state.menu).toBeNull();
  state = tap(state, 'x');
  for (let index = 0; index < 3; index++) state = tap(state, 'down');
  state = tap(state, 'a');
  expect(state.dialogue.actorId).toBe('guide');
  expect(tap(state, 'a').dialogue.index).toBe(1);
  expect(tap(state, 'b').dialogue).toBeNull();
  expect(tap(state, 'x').dialogue).toBeNull();
});

test('all menu rows are navigable and every page renders with only controller input', () => {
  const base = createSimulation();
  expect(controllerMenu(base, []).handled).toBe(false);
  expect(
    controllerMenu({ ...base, mode: 'journal', battle: {} }, ['x']).state.mode
  ).toBe('battle');
  expect(
    menuLines({ ...base, menu: { page: 'journal' }, journal: undefined }).join(
      ' '
    )
  ).toContain('Memories');
  for (const page of [
    'main',
    'assign',
    'actions',
    'journal',
    'inventory',
    'saves',
    'reset',
    'paused',
  ]) {
    const state = { ...base, menu: { page, selected: 0 } };
    const entries = menuEntries(state);
    expect(controllerMenu(state, ['up']).state.menu.selected).toBe(
      entries.length - 1
    );
    expect(controllerMenu(state, ['left']).state.menu.selected).toBe(
      entries.length - 1
    );
    expect(controllerMenu(state, ['right']).state.menu.selected).toBe(
      1 % entries.length
    );
    expect(controllerMenu(state, ['b']).handled).toBe(true);
    expect(controllerMenu(state, ['y']).state.menu.page).toBe('assign');
    expect(controllerMenu(state, []).handled).toBe(true);
    for (let selected = 0; selected < entries.length; selected++) {
      const selectedState = { ...state, menu: { page, selected } };
      expect(menuLines(selectedState).length).toBeLessThanOrEqual(10);
      expect(controllerMenu(selectedState, ['a']).state).toBeDefined();
    }
  }
  expect(
    menuLines({
      ...base,
      menu: { page: 'journal' },
      journal: [{ status: 'active', title: 'Bell' }],
    }).join(' ')
  ).toContain('Bell');
  expect(
    menuEntries({ ...base, menu: { page: 'assign' }, quickAction: 'fish' })[0]
      .label
  ).toContain('*');
  const battle = startBattle(base, CONTENT.creatures[0]);
  expect(
    menuEntries({ ...battle, menu: { page: 'actions' } }).map(
      row => row.command
    )
  ).toContain('action:remember');
  for (const quickAction of ['fish', 'sing', 'guard', 'remember', 'tea'])
    expect(tap({ ...battle, quickAction }, 'b').battle.turn).toBe(1);
});

test('save menu commands execute against the shared runtime and reset only the selected slot', () => {
  const saved = new Map();
  const commands = [];
  const save = {
    load: slot => saved.get(slot),
    save: (state, slot) => saved.set(slot, state),
  };
  const runtime = createMosslightRuntime({
    save,
    onControllerCommand: command => commands.push(command),
  });
  runtime.start();
  for (const command of [
    'save',
    'slot:1',
    'reset',
    'export',
    'import',
    'fullscreen',
  ]) {
    runtime.setState({ ...createSimulation(), controllerCommand: command });
    runtime.dispatch({ actions: [] });
    expect(runtime.getSnapshot().controllerCommand).toBeNull();
  }
  expect(commands).toEqual(['export', 'import', 'fullscreen']);
  expect(runtime.getSlot()).toBe(1);
  expect(saved.has(0)).toBe(true);
  expect(saved.has(1)).toBe(true);
  runtime.setState({
    ...createSimulation(),
    menu: { page: 'journal', selected: 0 },
  });
  runtime.step(125, []);
  runtime.dispatch({ actions: [] });
  expect(runtime.getSnapshot().journal.length).toBeGreaterThan(0);
});
