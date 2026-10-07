import { CONTENT } from './content.js';
import { targetInFront, scheduleActors } from './actors.js';
import {
  openDialogue,
  advanceDialogue,
  chooseDialogue,
  moveDialogueChoice,
} from './dialogue.js';
import { movePlayer, createWorld, advanceClock } from './world.js';
import { recordEvent, selectEnding, questJournal } from './quests.js';
import { farmAction, fishAction, craftItem } from './activities.js';
import { startBattle, battleAction } from './combat.js';
import { controllerMenu } from './controls.js';
import {
  advanceSimulationFrame,
  createSimulationClockState,
} from '../simulationCore.js';

/**
 * Create the complete starting state for a new save.
 * @param {any} content Authored chapter data passed from the runtime boundary.
 * @returns {Record<string, any>} Initial simulation state.
 */
export function createSimulation(content = CONTENT) {
  const world = createWorld(content);
  world.npcs = scheduleActors(content.npcs, world);
  return {
    world,
    inventory: { moonSeed: 1, hearthTea: 1 },
    farm: { crop: null, plantedDay: null, wateredDay: null },
    journal: [],
    dialogue: null,
    battle: null,
    ending: null,
    ...createSimulationClockState(),
    quickAction: 'fish',
    menu: null,
    controllerCommand: null,
    toast: 'First: listen at the well. A: use. X: menu. Y: assign B.',
  };
}
/**
 * Advance one deterministic simulation frame from normalized actions.
 * @param {any} state Normalized simulation state.
 * @param {string[]} actions Input actions for this frame.
 * @param {any} content Authored chapter data passed from the runtime boundary.
 * @param {number} deltaMs Elapsed time in milliseconds.
 * @returns {Record<string, any>} Updated simulation state.
 */
export function stepGame(
  state,
  actions = [],
  content = CONTENT,
  deltaMs = 125
) {
  let next = advanceSimulationFrame(state, deltaMs);
  const rawActions = actions;
  const rawPressed = actions.filter(
    action => !state.lastActions.includes(action)
  );
  const control = controllerMenu(next, rawPressed);
  next = control.state;
  if (control.handled) return { ...next, lastActions: [...rawActions] };
  const translate = (/** @type {string} */ action) =>
    action === 'a'
      ? 'confirm'
      : action === 'b'
        ? next.dialogue || next.mode === 'journal'
          ? 'cancel'
          : next.battle &&
              !['guard', 'sing', 'remember', 'tea'].includes(next.quickAction)
            ? 'sing'
            : next.quickAction || 'fish'
        : action;
  actions = control.action ? [control.action] : actions.map(translate);
  const pressed = control.action ? [control.action] : rawPressed.map(translate);
  const direction = ['up', 'down', 'left', 'right'].find(action =>
    actions.includes(action)
  );
  if (pressed.includes('journal') || pressed.includes('menu')) {
    next = openGuide(next, content);
  } else if (next.mode === 'journal' && pressed.includes('cancel')) {
    next = { ...next, mode: next.battle ? 'battle' : 'world', dialogue: null };
  } else if (
    next.mode === 'battle' &&
    [
      'confirm',
      'interact',
      'special',
      'guard',
      'cancel',
      'strike',
      'sing',
      'remember',
      'tea',
    ].some(action => pressed.includes(action))
  )
    next = battleAction(
      next,
      actions.includes('tea')
        ? 'herb'
        : actions.includes('remember')
          ? 'remember'
          : actions.includes('guard')
            ? 'guard'
            : actions.includes('special') ||
                actions.includes('cancel') ||
                actions.includes('sing')
              ? 'sing'
              : 'strike',
      content
    );
  else if (next.dialogue) {
    if (pressed.includes('cancel'))
      next = {
        ...next,
        dialogue: null,
        mode: next.battle ? 'battle' : 'world',
      };
    else if (next.dialogue.choices.length) {
      if (pressed.includes('down') || pressed.includes('right'))
        next = moveDialogueChoice(next, 1);
      if (pressed.includes('up') || pressed.includes('left'))
        next = moveDialogueChoice(next, -1);
      if (pressed.includes('confirm') || pressed.includes('interact'))
        next = chooseDialogue(next, next.dialogue.selected || 0);
    } else if (pressed.includes('confirm') || pressed.includes('interact'))
      next = advanceDialogue(next);
  } else if (next.mode === 'journal') {
    if (pressed.includes('confirm') || pressed.includes('interact'))
      next = { ...next, mode: next.battle ? 'battle' : 'world' };
  } else {
    if (direction && next.moveCooldown === 0) {
      next = {
        ...next,
        world: movePlayer(next.world, direction, content),
        moveCooldown: 135,
      };
      next = { ...next, world: advanceClock(next.world, 2), farm: next.farm };
      next.world.npcs = scheduleActors(content.npcs, next.world);
    }
    if (pressed.includes('interact') || pressed.includes('confirm'))
      next = interact(next, content);
    if (pressed.includes('farm') && targetInFront(next).object?.kind === 'farm')
      next = farmAction(next, content);
    if (pressed.includes('fish')) next = fishAction(next, content);
    if (pressed.includes('craft'))
      next = craftItem(next, {
        ingredients: [['dreamFragment', 2]],
        output: 'reedFlute',
      });
    if (pressed.includes('tea'))
      next = {
        ...next,
        toast: next.inventory.hearthTea
          ? 'Warm tea steadies your dreams.'
          : 'No tea left.',
        inventory: {
          ...next.inventory,
          hearthTea: Math.max(0, (next.inventory.hearthTea || 0) - 1),
        },
      };
    if (pressed.includes('rest')) {
      next = {
        ...next,
        world: advanceClock({ ...next.world, time: 23.9 }, 7 * 60),
        farm: { ...next.farm, wateredDay: null },
        toast: 'Morning arrives, carrying a different dream.',
      };
      next.world.npcs = scheduleActors(content.npcs, next.world);
    }
    if (pressed.includes('wait')) {
      next = {
        ...next,
        world: advanceClock(next.world, 60),
        toast: 'You wait while the valley changes its mind.',
      };
      next.world.npcs = scheduleActors(content.npcs, next.world);
    }
  }
  if (next.world.flags.wellHeard && !next.world.flags.wellOpen)
    next = recordEvent(next, 'wellOpen');
  if (
    next.inventory.moonTurnip &&
    next.inventory.lanternFish &&
    !next.world.flags.gardenShared
  )
    next = announceFlag(
      next,
      'gardenShared',
      'Vale ties the fish’s lantern to the turnip leaves.'
    );
  if (
    next.world.mapId === 'hollow' &&
    next.world.player.x === 8 &&
    next.world.player.y === 3 &&
    next.world.flags.gardenShared &&
    next.world.flags.memoryCount >= 2 &&
    !next.world.flags.heartOpen
  )
    next = announceFlag(
      next,
      'heartOpen',
      'The heart door recognizes the village in your voice.'
    );
  next.lastActions = [...rawActions];
  if (
    state.dialogue?.actorId === 'guide' &&
    next.mode === 'journal' &&
    !next.dialogue
  )
    next.mode = next.battle ? 'battle' : 'world';
  return next;
}

/**
 * Present story, controls and live objectives in both game presenters.
 * @param {any} state Normalized simulation state.
 * @param {any} content Authored chapter data passed from the runtime boundary.
 * @returns {Record<string, any>} A paged, player-dismissed guide.
 */
function openGuide(state, content) {
  return openDialogue({ ...state, mode: 'journal' }, 'guide', [
    {
      text: 'You are Aster. A letter in your own handwriting brought you here. You never wrote it.',
    },
    {
      text: 'Mosslight is a sleeping creature. Its dreams borrow our memories. A bell below the well knows your name.',
    },
    {
      text: 'First: walk to the well basket northeast of you. Face it and press A. Ask Mira what she remembers.',
    },
    {
      text: 'Explore at your own pace. Gather borrowed memories and decide how the valley wakes.',
    },
    {
      text: 'Each area scrolls as you walk. Follow arrow trails to its edge to cross into the named next area.',
    },
    {
      text: 'D-pad: move. A: talk, use objects, continue. Face an object before pressing A.',
    },
    {
      text: 'X: menu or close. Y: assign B. Up/down: choose an action; A: confirm. B: back in menus.',
    },
    {
      text: 'Use A at soil to plant or water. Wait a day for growth. Fish at the shore at dusk.',
    },
    {
      text: 'In battle: A attacks. X opens Actions for singing, guarding, remembering or tea. Y assigns your B shortcut.',
    },
    ...questJournal(state, content).map(quest => ({
      text: `${quest.status}: ${quest.title}`,
    })),
  ]);
}
/**
 *
 * @param {any} state Normalized simulation state.
 * @param {any} content Authored chapter data passed from the runtime boundary.
 * @returns {Record<string, any>} State after interaction.
 */
function interact(state, content) {
  const { actor, object } = targetInFront(state);
  if (actor) {
    const node = content.dialogue[actor.id]?.[
      state.world.flags.wellOpen ? 'wellOpen' : 'default'
    ] || [{ text: 'The silence here has a familiar shape.' }];
    return openDialogue(state, actor.id, node);
  }
  if (!object) return { ...state, toast: 'Only the grass answers.' };
  if (object.kind === 'well') {
    const next = recordEvent(state, 'wellHeard');
    return {
      ...next,
      world: { ...next.world, flags: { ...next.world.flags, wellOpen: true } },
      toast: 'Something vast turns over beneath the village.',
    };
  }
  if (object.kind === 'noticeboard') return openGuide(state, content);
  if (object.kind === 'farm') return farmAction(state, content);
  if (object.kind === 'fishing') return fishAction(state, content);
  if (object.kind === 'rest')
    return { ...state, toast: 'The bed looks like it has heard things.' };
  if (object.kind === 'memory')
    return state.world.flags[`memory_${object.id}`]
      ? { ...state, toast: 'You remember this place already.' }
      : recordEvent(
          {
            ...state,
            world: {
              ...state.world,
              flags: { ...state.world.flags, [`memory_${object.id}`]: true },
            },
            inventory: {
              ...state.inventory,
              dreamFragment: (state.inventory.dreamFragment || 0) + 1,
            },
          },
          'dreamFragment'
        );
  if (object.kind === 'heartdoor' && state.world.flags.heartOpen)
    return startBattle(state, content.creatures[1]);
  if (object.kind === 'heartdoor')
    return {
      ...state,
      toast: 'The door is listening for the fragments you found.',
    };
  if (object.kind === 'encounter')
    return startBattle(
      state,
      content.creatures.find(
        (/** @type {{id: string}} */ creature) =>
          creature.id === object.creature
      )
    );
  if (object.kind === 'crafting')
    return craftItem(state, {
      ingredients: [['dreamFragment', 2]],
      output: 'reedFlute',
    });
  return state;
}

/**
 * Set a durable world flag and surface its story feedback.
 * @param {any} state Normalized simulation state.
 * @param {string} flag Story flag to set.
 * @param {string} toast Player-facing feedback.
 * @returns {Record<string, any>} Updated simulation state.
 */
function announceFlag(state, flag, toast) {
  return {
    ...state,
    world: { ...state.world, flags: { ...state.world.flags, [flag]: true } },
    toast,
  };
}
/**
 * Resolve authored ending choice.
 * @param {any} state Normalized simulation state.
 * @param {string} choice Ending choice identifier.
 * @param {any} content Authored chapter data passed from the runtime boundary.
 * @returns {Record<string, any>} State with the ending applied.
 */
export function finishChapter(state, choice, content = CONTENT) {
  return selectEnding(state, choice, content);
}
