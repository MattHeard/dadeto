import { CONTENT } from '../../../../src/core/browser/game/mosslight-valley/content.js';
import {
  createInputState,
  updateInput,
  actionsFromInput,
  consumePressed,
  gamepadActions,
} from '../../../../src/core/browser/game/mosslight-valley/input.js';
import {
  createSimulation,
  stepGame,
  finishChapter,
} from '../../../../src/core/browser/game/mosslight-valley/simulation.js';
import {
  parseSave,
  serializeSave,
  createSaveAdapter,
} from '../../../../src/core/browser/game/mosslight-valley/save.js';
import { toFramePayload } from '../../../../src/core/browser/game/mosslight-valley/renderer.js';
import { mosslightValley } from '../../../../src/core/browser/game/mosslight-valley/mosslightValley.js';
import { createMosslightRuntime } from '../../../../src/core/browser/game/mosslight-valley/runtime.js';
import {
  movePlayer,
  createWorld,
  cameraFor,
  advanceClock,
  isBlocked,
  findExit,
} from '../../../../src/core/browser/game/mosslight-valley/world.js';
import {
  scheduleActors,
  animateActor,
  actorAt,
  targetInFront,
} from '../../../../src/core/browser/game/mosslight-valley/actors.js';
import {
  questJournal,
  questAvailable,
  selectEnding,
  recordEvent,
} from '../../../../src/core/browser/game/mosslight-valley/quests.js';
import {
  farmAction,
  fishAction,
  craftItem,
  dawnActivities,
} from '../../../../src/core/browser/game/mosslight-valley/activities.js';
import {
  startBattle,
  battleAction,
} from '../../../../src/core/browser/game/mosslight-valley/combat.js';
import {
  advanceDialogue,
  chooseDialogue,
  currentLine,
  moveDialogueChoice,
  openDialogue,
} from '../../../../src/core/browser/game/mosslight-valley/dialogue.js';
import { createAudioAdapter } from '../../../../src/core/browser/game/mosslight-valley/audio.js';

/** Verify the core movement and frame contract. */
test('moves, interacts, and renders a handheld frame', () => {
  let state = createSimulation(CONTENT);
  state = stepGame(state, ['right', 'right'], CONTENT);
  expect(state.world.player.x).toBe(7);
  state = stepGame(state, ['up'], CONTENT);
  expect(toFramePayload(state).type).toBe('mosslight-valley');
  expect(toFramePayload(state).shapes.length).toBeGreaterThan(1);
});

/** Verify keyboard normalization. */
test('input normalizes keyboard actions', () => {
  const state = updateInput(createInputState(), {
    type: 'keydown',
    key: 'ArrowRight',
  });
  expect([...state.held]).toEqual(['right']);
});

/** Verify save validation and round trips. */
test('save data round trips and rejects malformed input', () => {
  const state = createSimulation(CONTENT);
  const raw = serializeSave(state);
  expect(parseSave(raw).state.world.player.name).toBe('Aster');
  expect(parseSave('{bad')).toBeNull();
});

/** Verify the embedded adapter output. */
test('public toy adapter returns a valid frame payload', () => {
  expect(JSON.parse(mosslightValley('', new Map())).type).toBe(
    'mosslight-valley'
  );
  const payload = JSON.parse(
    mosslightValley(JSON.stringify({ actions: ['right'] }), new Map())
  );
  expect(payload.width).toBe(160);
  expect(payload.height).toBe(144);
  expect(payload.world.mapId).toBe('village');
  expect(
    JSON.parse(
      mosslightValley(
        JSON.stringify({ type: 'keydown', key: 'ArrowRight' }),
        new Map()
      )
    ).world.player.x
  ).toBe(7);
});

test('maps connect through exits, keep blocked tiles solid, and bound the camera', () => {
  let world = createWorld(CONTENT);
  world = { ...world, player: { ...world.player, x: 2, y: 2 } };
  const blocked = movePlayer(world, 'right', CONTENT);
  expect(blocked.player.x).toBe(world.player.x);
  world = createWorld(CONTENT);
  world.npcs = scheduleActors(CONTENT.npcs, world);
  world.player = { ...world.player, x: 7, y: 6 };
  expect(movePlayer(world, 'up', CONTENT).player.y).toBe(6);
  world = { ...world, player: { ...world.player, x: 0, y: 6 } };
  world = movePlayer(world, 'left', CONTENT);
  expect(world.mapId).toBe('shore');
  expect(cameraFor(world, 12, 9).x).toBeGreaterThanOrEqual(0);
  expect(cameraFor(world, 12, 9).x).toBeLessThanOrEqual(world.map.width - 12);
  expect(cameraFor(world)).toEqual({ x: 3, y: 1 });
  expect(
    cameraFor({ ...world, player: { ...world.player, x: 15, y: 11 } }, 12, 9)
  ).toEqual({ x: 4, y: 3 });
});

test('routines follow the story clock and actor animation is deterministic', () => {
  const world = { ...createWorld(CONTENT), time: 13 };
  const actors = scheduleActors(CONTENT.npcs, world);
  expect(actors.find(actor => actor.id === 'mira').map).toBe('shore');
  expect(animateActor(actors[0], 16).frame).toBe(0);
  expect(advanceClock(world, 60).time).toBe(14);
});

test('dialogue choices, quest gates, and endings persist on the world state', () => {
  let state = createSimulation(CONTENT);
  state = {
    ...state,
    world: {
      ...state.world,
      player: { ...state.world.player, x: 7, y: 6, facing: 'up' },
    },
  };
  state = stepGame(state, ['interact'], CONTENT);
  state = stepGame(state, ['confirm'], CONTENT);
  state = stepGame(state, [], CONTENT);
  state = stepGame(state, ['confirm'], CONTENT);
  expect(state.world.flags.miraTrust).toBe(1);
  expect(state.world.relationships.mira).toBe(1);
  expect(questJournal(state, CONTENT)[0].status).toBe('active');
  expect(questAvailable(CONTENT.quests.gardenSong, { wellHeard: true })).toBe(
    true
  );
  expect(selectEnding(state, 'gentle', CONTENT).ending.id).toBe('gentle');
});

test('farm, fishing and crafting use deterministic inventory and conditions', () => {
  let state = createSimulation(CONTENT);
  state = farmAction(state, CONTENT);
  expect(state.farm.crop).toBe('moonTurnip');
  state = { ...state, world: { ...state.world, day: 2 } };
  state = farmAction(state, CONTENT);
  state = { ...state, world: { ...state.world, day: 3 } };
  state = farmAction(state, CONTENT);
  expect(state.inventory.moonTurnip).toBe(1);
  state = {
    ...state,
    world: {
      ...state.world,
      mapId: 'shore',
      map: CONTENT.maps.shore,
      time: 18,
      weather: 'mist',
    },
  };
  state = fishAction(state, CONTENT);
  expect(state.inventory.lanternFish).toBe(1);
  state = { ...state, inventory: { ...state.inventory, dreamFragment: 2 } };
  state = craftItem(state, {
    ingredients: [['dreamFragment', 2]],
    output: 'reedFlute',
  });
  expect(state.inventory.reedFlute).toBe(1);
});

test('battle rewards and runtime pause/resume are deterministic', () => {
  let state = startBattle(createSimulation(CONTENT), CONTENT.creatures[0]);
  state = battleAction(state, 'sing', CONTENT);
  state = battleAction(state, 'sing', CONTENT);
  expect(state.world.flags.battleWon).toBe(true);
  expect(state.inventory.dreamFragment).toBe(1);
  const runtime = createMosslightRuntime(new Map());
  const before = runtime.getSnapshot().world.player.x;
  runtime.step(500, ['right']);
  expect(runtime.getSnapshot().world.player.x).toBe(before);
  runtime.start();
  runtime.step(500, ['right']);
  expect(runtime.getSnapshot().world.player.x).toBeGreaterThan(before);
  runtime.pause();
  const pausedAt = runtime.getSnapshot().world.player.x;
  runtime.step(500, ['right']);
  expect(runtime.getSnapshot().world.player.x).toBe(pausedAt);
});

test('keyboard edges, released keys and gamepad controls normalize consistently', () => {
  const down = updateInput(createInputState(), { type: 'keydown', key: 'z' });
  expect(actionsFromInput(down)).toEqual(['confirm']);
  expect(consumePressed(down).pressed.size).toBe(0);
  expect(updateInput(down, { type: 'keyup', key: 'z' }).held.size).toBe(0);
  expect(updateInput(down, { type: 'keydown', key: 'unknown' })).toBe(down);
  expect(gamepadActions([])).toEqual([]);
  expect(gamepadActions()).toEqual([]);
  expect(gamepadActions([{}])).toEqual([]);
  expect(
    gamepadActions([
      {
        axes: [-1, 1],
        buttons: [
          { pressed: true },
          { pressed: true },
          { pressed: true },
          {},
          {},
          {},
          {},
          {},
          {},
          { pressed: true },
        ],
      },
    ])
  ).toEqual([
    'down',
    'left',
    'confirm',
    'interact',
    'guard',
    'special',
    'journal',
  ]);
  expect(gamepadActions([null, { buttons: [], axes: [] }])).toEqual([]);
  expect(
    gamepadActions([
      {
        buttons: [
          ,
          ,
          ,
          ,
          ,
          ,
          ,
          ,
          ,
          ,
          ,
          ,
          { pressed: true },
          { pressed: true },
          { pressed: true },
          { pressed: true },
        ],
        axes: [],
      },
    ])
  ).toEqual(['up', 'down', 'left', 'right']);
  expect(gamepadActions([{ axes: [1, 0] }])).toEqual(['right']);
});

test('dialogue can move between choices, commit a bond, and close at the end', () => {
  const initial = createSimulation(CONTENT);
  const opened = openDialogue(initial, 'mira', [
    {
      text: 'Remember?',
      choices: [{ label: 'Listen', set: { firstListen: true }, bond: 2 }],
    },
  ]);
  expect(currentLine(opened).text).toBe('Remember?');
  expect(moveDialogueChoice(opened, 1).dialogue.selected).toBe(1);
  expect(chooseDialogue(opened, 4)).toBe(opened);
  const chosen = chooseDialogue(opened, 0);
  expect(chosen.world.flags.firstListen).toBe(true);
  expect(chosen.world.relationships.mira).toBe(2);
  expect(advanceDialogue(chosen)).toBe(chosen);
  const multiLine = openDialogue(initial, 'mira', [
    { text: 'One' },
    { text: 'Two' },
  ]);
  expect(advanceDialogue(multiLine).dialogue.index).toBe(1);
  expect(
    advanceDialogue(openDialogue(initial, 'mira', [{ text: 'Bye' }])).dialogue
  ).toBeNull();
  expect(currentLine(initial)).toBeNull();
  expect(moveDialogueChoice(initial, -1)).toBe(initial);
  expect(moveDialogueChoice(opened, 0).dialogue.selected).toBe(0);
  expect(advanceDialogue(initial)).toBe(initial);
  expect(
    openDialogue(initial, 'mira', { lines: [{ text: 'Object form' }] }).dialogue
      .lines
  ).toEqual({ lines: [{ text: 'Object form' }] });
  const noBond = openDialogue(initial, 'mira', [
    { text: 'Choose', choices: [{ label: 'No bond' }] },
  ]);
  expect(chooseDialogue(noBond, 0).world.relationships.mira).toEqual(
    initial.world.relationships.mira
  );
});

test('quest events count memories once per event and endings reject unknown choices', () => {
  const initial = createSimulation(CONTENT);
  const recorded = recordEvent(initial, 'dreamFragment', true);
  expect(recorded.world.flags.memoryCount).toBe(1);
  expect(recordEvent(recorded, 'dreamFragment').world.flags.memoryCount).toBe(
    2
  );
  expect(recorded.journal).toContain('dreamFragment');
  expect(recordEvent({ ...recorded, journal: null }, 'other').journal).toEqual([
    'other',
  ]);
  expect(recordEvent(recorded, 'garden_shared').toast).toBe('garden shared');
  expect(selectEnding(initial, 'not-an-ending', CONTENT)).toBe(initial);
  const ended = finishChapter(
    selectEnding(initial, 'gentle', CONTENT),
    'gentle',
    CONTENT
  );
  expect(ended.ending.id).toBe('gentle');
});

test('farming, fishing and crafting explain unmet conditions without mutating state', () => {
  let state = createSimulation(CONTENT);
  expect(farmAction(state, CONTENT).toast).toMatch(/seed/);
  expect(
    farmAction({ ...state, inventory: { moonSeed: 0 } }, CONTENT).toast
  ).toMatch(/seed/);
  state = { ...state, inventory: { ...state.inventory, moonSeed: 1 } };
  state = farmAction(state, CONTENT);
  state = farmAction(state, CONTENT);
  expect(farmAction(state, CONTENT).toast).toMatch(/dreaming/);
  expect(fishAction(state, CONTENT).toast).toMatch(/water/);
  state = {
    ...state,
    world: { ...state.world, mapId: 'shore', map: CONTENT.maps.shore },
  };
  expect(fishAction(state, CONTENT).toast).toMatch(/reflection/);
  expect(dawnActivities(state).world.time).toBe(7);
  expect(
    craftItem(state, {
      ingredients: [['dreamFragment', 3]],
      output: 'reedFlute',
    }).toast
  ).toMatch(/missing/);
});

test('save adapter lists slots, migrates v1, and safely ignores unavailable storage', () => {
  const state = createSimulation(CONTENT);
  const data = {};
  const env = new Map([
    ['setLocalPermanentData', update => Object.assign(data, update) && data],
  ]);
  const saves = createSaveAdapter(env);
  expect(saves.list()).toEqual([]);
  saves.save(state, 2);
  expect(saves.list()).toEqual([2]);
  expect(saves.load(2).world.mapId).toBe('village');
  expect(saves.import(saves.export(state, 2)).slot).toBe(2);
  expect(parseSave(saves.export(state)).slot).toBe(0);
  const v1 = JSON.stringify({
    version: 1,
    state: { ...state, world: { ...state.world, location: 'shore' } },
  });
  expect(parseSave(v1).state.world.mapId).toBe('shore');
  expect(
    parseSave(JSON.stringify({ version: 1, state })).state.world.mapId
  ).toBe('village');
  const noLocation = { ...state, world: { ...state.world, location: '' } };
  expect(
    parseSave(JSON.stringify({ version: 1, state: noLocation })).state.world
      .mapId
  ).toBe('village');
  expect(parseSave(JSON.stringify({ version: 2, state: {} }))).toBeNull();
  const unavailable = createSaveAdapter(new Map());
  unavailable.save(state);
  expect(unavailable.list()).toEqual([]);
  expect(unavailable.load()).toBeNull();
  const malformedSlots = new Map([
    [
      'setLocalPermanentData',
      () => ({ 'mosslight-valley-saves-v2': { slots: null } }),
    ],
  ]);
  expect(createSaveAdapter(malformedSlots).list()).toEqual([]);
});

test('audio adapter honors enablement and stop cues', () => {
  const cues = [];
  const audio = createAudioAdapter(
    new Map([['playAudioCue', cue => cues.push(cue)]])
  );
  audio.play('story-cue');
  audio.setEnabled(false);
  audio.play('battle-hit');
  audio.stop();
  expect(audio.isEnabled()).toBe(false);
  expect(cues).toEqual(['story-cue', 'stop']);
  expect(createAudioAdapter().isEnabled()).toBe(true);
});

test('runtime dispatches, saves, imports and switches isolated slots', () => {
  const data = {};
  const env = new Map([
    ['setLocalPermanentData', update => Object.assign(data, update) && data],
  ]);
  const runtime = createMosslightRuntime({ env, slot: 1 });
  runtime.dispatch('right');
  expect(runtime.getSlot()).toBe(1);
  expect(runtime.exportSave()).toContain('"slot":1');
  runtime.loadSlot(2);
  expect(runtime.getSlot()).toBe(2);
  runtime.importSave(runtime.exportSave());
  expect(runtime.listSaves()).toEqual([1]);
  expect(runtime.frame().type).toBe('mosslight-valley');
  runtime.setState({ ...runtime.getState(), mode: 'journal' });
  runtime.start();
  runtime.step(125, []);
  expect(runtime.getState().journal.length).toBeGreaterThan(0);
  runtime.setState({
    ...runtime.getState(),
    world: { ...runtime.getState().world, flags: { ending: 'gentle' } },
  });
  runtime.step(125, []);
  expect(runtime.getState().ending.id).toBe('gentle');
  runtime.dispatch({ actions: ['wait'] });
  runtime.dispatch({});
});

test('embedded adapter tolerates malformed input and accepts save payloads', () => {
  expect(JSON.parse(mosslightValley('{', new Map())).type).toBe(
    'mosslight-valley'
  );
  const runtime = createMosslightRuntime(new Map());
  const saved = runtime.exportSave();
  const payload = JSON.parse(
    mosslightValley(
      JSON.stringify({ save: saved, actions: ['wait'] }),
      new Map()
    )
  );
  expect(payload.type).toBe('mosslight-valley');
});

test('story objects, schedules, dungeon gates and optional discoveries share the simulation', () => {
  const interactAt = (mapId, object, flags = {}, inventory = {}) => {
    const state = createSimulation(CONTENT);
    const map = { ...CONTENT.maps[mapId], objects: [object] };
    return stepGame(
      {
        ...state,
        inventory: { ...state.inventory, ...inventory },
        world: {
          ...state.world,
          map,
          mapId,
          flags,
          npcs: [],
          player: { x: object.x, y: object.y + 1, facing: 'up', name: 'Aster' },
        },
      },
      ['interact'],
      CONTENT
    );
  };

  const well = interactAt('village', { id: 'well', x: 8, y: 5, kind: 'well' });
  expect(well.world.flags.wellHeard).toBe(true);
  expect(well.world.flags.wellOpen).toBe(true);
  expect(
    interactAt('village', { id: 'board', x: 6, y: 3, kind: 'noticeboard' }).mode
  ).toBe('journal');
  expect(
    interactAt('village', { id: 'bed', x: 7, y: 7, kind: 'rest' }).toast
  ).toMatch(/bed/);
  expect(
    interactAt('village', { id: 'garden', x: 5, y: 9, kind: 'farm' }).farm.crop
  ).toBe('moonTurnip');
  expect(
    interactAt('shore', { id: 'fishing', x: 6, y: 6, kind: 'fishing' }).toast
  ).toMatch(/reflection/);
  expect(
    interactAt('shore', { id: 'shell', x: 11, y: 8, kind: 'memory' }).inventory
      .dreamFragment
  ).toBe(1);
  expect(
    interactAt(
      'shore',
      { id: 'shell', x: 11, y: 8, kind: 'memory' },
      { ['memory_shell']: true }
    ).toast
  ).toMatch(/already/);
  expect(
    interactAt('hollow', { id: 'echo', x: 8, y: 5, kind: 'memory' }).world.flags
      .memoryCount
  ).toBe(1);
  expect(
    interactAt('hollow', { id: 'door', x: 8, y: 2, kind: 'heartdoor' }).toast
  ).toMatch(/listening/);
  expect(
    interactAt(
      'hollow',
      { id: 'door', x: 8, y: 2, kind: 'heartdoor' },
      { heartOpen: true }
    ).mode
  ).toBe('battle');
  expect(
    interactAt('hollow', {
      id: 'foe',
      x: 8,
      y: 5,
      kind: 'encounter',
      creature: CONTENT.creatures[0].id,
    }).mode
  ).toBe('battle');
  expect(
    interactAt(
      'hollow',
      { id: 'altar', x: 6, y: 5, kind: 'crafting' },
      {},
      { dreamFragment: 2 }
    ).inventory.reedFlute
  ).toBe(1);
  expect(
    interactAt('village', { id: 'unknown', x: 8, y: 5, kind: 'unknown' }).tick
  ).toBe(1);

  let stranger = createSimulation(CONTENT);
  stranger = {
    ...stranger,
    world: {
      ...stranger.world,
      npcs: [{ id: 'stranger', name: 'Stranger', map: 'village', x: 6, y: 5 }],
    },
  };
  expect(
    stepGame(stranger, ['interact'], CONTENT).dialogue.lines[0].text
  ).toMatch(/silence/);
  const noObject = {
    ...stranger,
    world: {
      ...stranger.world,
      npcs: [],
      map: { ...CONTENT.maps.village, objects: [] },
      player: { x: 1, y: 1, facing: 'up', name: 'Aster' },
    },
  };
  expect(stepGame(noObject, ['interact'], CONTENT).toast).toMatch(/grass/);
  const rememberedMira = {
    ...noObject,
    world: {
      ...noObject.world,
      flags: { wellOpen: true },
      npcs: [{ id: 'mira', name: 'Mira', map: 'village', x: 1, y: 0 }],
    },
  };
  expect(
    stepGame(rememberedMira, ['interact'], CONTENT).dialogue.lines[0].text
  ).toMatch(/went below/);
  const journal = { ...stranger, mode: 'journal' };
  expect(stepGame(journal, ['interact'], CONTENT).mode).toBe('world');

  const shared = {
    ...createSimulation(CONTENT),
    inventory: { moonTurnip: 1, lanternFish: 1 },
  };
  expect(stepGame(shared, [], CONTENT).world.flags.gardenShared).toBe(true);
  const heart = {
    ...shared,
    world: {
      ...shared.world,
      map: CONTENT.maps.hollow,
      mapId: 'hollow',
      player: { x: 8, y: 3, facing: 'up', name: 'Aster' },
      flags: { gardenShared: true, memoryCount: 2 },
    },
  };
  expect(stepGame(heart, [], CONTENT).world.flags.heartOpen).toBe(true);
});

test('simulation hotkeys advance farm, clock, journal, and branching dialogue', () => {
  let state = createSimulation();
  expect(stepGame(state).tick).toBe(1);
  state = stepGame(state, ['journal']);
  expect(state.mode).toBe('journal');
  state = stepGame({ ...state, mode: 'world' }, ['rest']);
  expect(state.world.day).toBe(2);
  expect(state.world.time).toBeCloseTo(6.9, 2);
  state = {
    ...createSimulation(),
    world: {
      ...createSimulation().world,
      mapId: 'village',
      player: { x: 5, y: 10, facing: 'up', name: 'Aster' },
    },
  };
  state = stepGame(state, ['farm']);
  expect(state.farm.crop).toBe('moonTurnip');

  state = createSimulation();
  state = {
    ...state,
    world: {
      ...state.world,
      player: { x: 7, y: 6, facing: 'up', name: 'Aster' },
      npcs: [{ id: 'mira', name: 'Mira', map: 'village', x: 7, y: 5 }],
    },
  };
  state = stepGame(state, ['interact']);
  expect(state.dialogue.actorId).toBe('mira');
  expect(stepGame(state, [], CONTENT).dialogue.index).toBe(0);
  state = stepGame(state, ['confirm']);
  expect(state.dialogue.choices.length).toBe(2);
  state = stepGame(state, ['right']);
  expect(state.dialogue.selected).toBe(1);
  state = stepGame(state, ['up']);
  expect(state.dialogue.selected).toBe(0);
  state = stepGame(state, ['down']);
  expect(state.dialogue.selected).toBe(1);
  state = stepGame(state, ['confirm']);
  expect(state.world.flags.miraSong).toBe(1);

  state = createSimulation();
  state.world.flags.wellHeard = true;
  expect(stepGame(state, []).world.flags.wellOpen).toBe(true);
  state = startBattle(createSimulation(), CONTENT.creatures[0]);
  expect(stepGame(state, [], CONTENT).mode).toBe('battle');
  expect(stepGame(state, ['guard'], CONTENT).battle.guarding).toBe(true);
  expect(stepGame(state, ['confirm'], CONTENT).battle.turn).toBe(1);
  expect(finishChapter(createSimulation(), 'gentle').ending.id).toBe('gentle');
});

test('battle intents, guard, status and non-winning turns resolve predictably', () => {
  const enemy = { ...CONTENT.creatures[0], hp: 30 };
  let state = startBattle(createSimulation(CONTENT), enemy);
  state = battleAction(state, 'guard', CONTENT);
  expect(state.battle.playerHp).toBe(18);
  expect(state.battle.guarding).toBe(true);
  state = battleAction(state, 'herb', CONTENT);
  expect(state.battle.playerHp).toBeLessThan(18);
  state = battleAction(state, 'sing', CONTENT);
  expect(state.battle.status).toBe('soothed');
  expect(battleAction({ ...state, battle: null }, 'strike', CONTENT)).toEqual({
    ...state,
    battle: null,
  });
});

test('seasonal crops and time/weather fishing gates remain explicit', () => {
  let state = createSimulation(CONTENT);
  state = {
    ...state,
    farm: { crop: 'moonTurnip', plantedDay: 1, wateredDay: 1 },
    world: { ...state.world, day: 5, season: 'winter' },
  };
  expect(farmAction(state, CONTENT).farm.crop).toBe('moonTurnip');
  state = {
    ...state,
    world: { ...state.world, mapId: 'shore', time: 12, weather: 'sun' },
  };
  expect(fishAction(state, CONTENT).toast).toMatch(/reflection/);
});

test('world boundaries, conditional exits, schedules, and actor targeting cover edge cases', () => {
  const world = createWorld(CONTENT);
  expect(movePlayer(world, 'diagonal', CONTENT)).toBe(world);
  expect(isBlocked(CONTENT.maps.village, -1, 0)).toBe(true);
  expect(findExit(CONTENT.maps.village, 12, 10, {})).toBeNull();
  const gated = CONTENT.maps.village.exits.find(exit => exit.requires);
  expect(findExit(CONTENT.maps.village, gated.x, gated.y, {})).toBeNull();
  expect(
    findExit(CONTENT.maps.village, gated.x, gated.y, { [gated.requires]: true })
  ).toEqual(gated);
  expect(actorAt({ ...world, npcs: [] }, 6, 5)).toBeNull();
  expect(
    targetInFront({
      world: {
        ...world,
        npcs: [],
        player: { ...world.player, facing: 'other' },
      },
    }).actor
  ).toBeNull();
  expect(scheduleActors([{ id: 'wanderer' }], world)).toEqual([
    { id: 'wanderer' },
  ]);
  const flagged = scheduleActors(CONTENT.npcs, {
    ...world,
    time: 19,
    flags: { miraTrust: true },
  });
  expect(flagged.find(actor => actor.id === 'mira')).toMatchObject({
    x: 7,
    y: 6,
    map: 'village',
  });
  expect(animateActor({ id: 'a' }, 8).frame).toBe(1);
  expect(advanceClock({ ...world, time: 23.9, day: 8 }, 20).season).toBe(
    'summer'
  );
  expect(advanceClock(world).time).toBeCloseTo(8.167, 2);
});

test('quest journal reveals rumor, active and complete states and records duplicate events idempotently', () => {
  const state = createSimulation(CONTENT);
  const entries = questJournal(state, CONTENT);
  expect(entries.some(quest => quest.status === 'rumor')).toBe(true);
  expect(questAvailable(CONTENT.quests.gardenSong, {})).toBe(false);
  const active = {
    ...state,
    world: { ...state.world, flags: { wellHeard: true } },
  };
  expect(
    questJournal(active, CONTENT).some(quest => quest.status === 'active')
  ).toBe(true);
  const complete = {
    ...active,
    world: { ...active.world, flags: { wellOpen: true, wellHeard: true } },
  };
  expect(
    questJournal(complete, CONTENT).some(quest => quest.status === 'complete')
  ).toBe(true);
  expect(recordEvent(recordEvent(state, 'heard'), 'heard').journal).toEqual([
    'heard',
  ]);
  expect(recordEvent(state, 'ordinary').world.flags.ordinary).toBe(true);
});

test('runtime rejects malformed imports without replacing the current chapter', () => {
  const runtime = createMosslightRuntime(new Map());
  const before = runtime.getSnapshot();
  expect(() => runtime.importSave('{bad')).toThrow(
    'Invalid Mosslight Valley save'
  );
  expect(runtime.getSnapshot()).toBe(before);
});

test('runtime accepts partial optional adapters and uses their safe fallbacks', () => {
  const save = {
    import: parseSave,
    export: raw => raw,
  };
  const runtime = createMosslightRuntime({ save, audio: {} });
  expect(runtime.listSaves()).toEqual([]);
  runtime.save();
  runtime.loadSlot(1);
  runtime.pause();
  expect(
    runtime.importSave(serializeSave(createSimulation(CONTENT))).type
  ).toBe('mosslight-valley');
  expect(runtime.dispatch({}).type).toBe('mosslight-valley');
  runtime.setState({
    ...runtime.getState(),
    ending: null,
    world: { ...runtime.getState().world, flags: { ending: 'gentle' } },
  });
  expect(runtime.dispatch({}).type).toBe('mosslight-valley');
  expect(runtime.getState().ending.id).toBe('gentle');
  const noSlot = JSON.parse(serializeSave(createSimulation(CONTENT)));
  delete noSlot.slot;
  expect(runtime.importSave(JSON.stringify(noSlot)).type).toBe(
    'mosslight-valley'
  );

  const defaultRuntime = createMosslightRuntime();
  defaultRuntime.start();
  defaultRuntime.step();
  defaultRuntime.getJournal();
  defaultRuntime.save();
  defaultRuntime.pause();
});

test('runtime sends distinct quest, item, battle and ambient audio cues', () => {
  const cues = [];
  const runtime = createMosslightRuntime({
    audio: { play: cue => cues.push(cue), stop() {} },
  });
  runtime.start();
  const initial = createSimulation(CONTENT);
  runtime.setState({
    ...initial,
    world: {
      ...initial.world,
      npcs: [],
      player: { x: 8, y: 6, facing: 'up', name: 'Aster' },
    },
  });
  runtime.step(125, ['interact']);
  expect(cues).toContain('quest-cue');
  runtime.setState(
    startBattle(createSimulation(CONTENT), CONTENT.creatures[0])
  );
  runtime.step(125, ['special']);
  expect(cues).toContain('battle-hit');
  const shore = createSimulation(CONTENT);
  runtime.setState({
    ...shore,
    world: {
      ...shore.world,
      mapId: 'shore',
      map: CONTENT.maps.shore,
      time: 18,
      weather: 'mist',
    },
  });
  runtime.step(125, ['fish']);
  expect(cues).toContain('item-pickup');
  runtime.step(125, ['wait']);
  expect(cues).toContain('story-cue');
});

test('memory-weak creatures respond to recall and unknown battle moves strike', () => {
  const memoryCreature = {
    ...CONTENT.creatures[0],
    weakness: 'memory',
    hp: 30,
  };
  const memoryContent = {
    ...CONTENT,
    creatures: [memoryCreature, ...CONTENT.creatures.slice(1)],
  };
  let state = startBattle(createSimulation(CONTENT), memoryCreature);
  state = battleAction(state, 'remember', memoryContent);
  expect(state.battle.hp).toBe(22);
  state = battleAction(state, 'unknown-skill', memoryContent);
  expect(state.battle.hp).toBe(18);
});
