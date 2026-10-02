// @ts-nocheck -- story state is serialized and validated at save boundaries.
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

/**
 * Create the complete starting state for a new save.
 * @param {unknown} content - The content argument.
 * @returns {unknown} The computed result.
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
    mode: 'world',
    tick: 0,
    moveCooldown: 0,
    lastActions: [],
    toast: 'Aster arrives. START/J: story and help.',
  };
}
/**
 * Advance one deterministic simulation frame from normalized actions.
 * @param {unknown} state - The state argument.
 * @param {unknown} actions - The actions argument.
 * @param {unknown} content - The content argument.
 * @param {unknown} deltaMs - The deltaMs argument.
 * @returns {unknown} The computed result.
 */
export function stepGame(
  state,
  actions = [],
  content = CONTENT,
  deltaMs = 125
) {
  let next = {
    ...state,
    tick: state.tick + 1,
    moveCooldown: Math.max(0, state.moveCooldown - deltaMs),
  };
  const pressed = actions.filter(action => !state.lastActions.includes(action));
  const direction = ['up', 'down', 'left', 'right'].find(action =>
    actions.includes(action)
  );
  if (pressed.includes('journal') || pressed.includes('menu')) {
    next = openGuide(next, content);
  } else if (next.mode === 'journal' && pressed.includes('cancel')) {
    next = { ...next, mode: next.battle ? 'battle' : 'world', dialogue: null };
  } else if (
    next.mode === 'battle' &&
    ['confirm', 'interact', 'special', 'guard', 'cancel'].some(action =>
      pressed.includes(action)
    )
  )
    next = battleAction(
      next,
      actions.includes('guard')
        ? 'guard'
        : actions.includes('special') || actions.includes('cancel')
          ? 'sing'
          : 'strike',
      content
    );
  else if (next.dialogue) {
    if (next.dialogue.choices.length) {
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
  next.lastActions = [...actions];
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
 * @param {object} state Current simulation.
 * @param {object} content Authored chapter.
 * @returns {object} A paged, player-dismissed guide.
 */
function openGuide(state, content) {
  return openDialogue({ ...state, mode: 'journal' }, 'guide', [
    {
      text: 'You are Aster. This valley is a sleeping creature. Its dreams borrow our memories.',
    },
    {
      text: 'Begin at the village well. Talk to neighbors. Your choices decide how the valley wakes.',
    },
    {
      text: 'D-pad: move. A/Z: talk, use objects, continue. Face an object before pressing A.',
    },
    {
      text: 'START/J: this guide. B/X: close guide. SELECT/T: wait one hour. Choices: up/down, then A.',
    },
    {
      text: 'Use A at soil to plant or water. Wait a day for growth. Fish at the shore at dusk.',
    },
    {
      text: 'In battle: A attacks, B sings. C guards; V uses a skill. Tea heals you.',
    },
    ...questJournal(state, content).map(quest => ({
      text: `${quest.status}: ${quest.title}`,
    })),
  ]);
}
/**
 *
 * @param {unknown} state - The state argument.
 * @param {unknown} content - The content argument.
 * @returns {unknown} The computed result.
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
      content.creatures.find(creature => creature.id === object.creature)
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
 * @param {object} state - Current simulation state.
 * @param {string} flag - Story flag to set.
 * @param {string} toast - Player-facing feedback.
 * @returns {object} Updated simulation state.
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
 * @param {unknown} state - The state argument.
 * @param {unknown} choice - The choice argument.
 * @param {unknown} content - The content argument.
 * @returns {unknown} The computed result.
 */
export function finishChapter(state, choice, content = CONTENT) {
  return selectEnding(state, choice, content);
}
