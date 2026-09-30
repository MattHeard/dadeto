// @ts-nocheck -- runtime game state is intentionally data-driven.
/* eslint-disable jsdoc/require-param, jsdoc/require-returns -- compact game-state contracts are documented at module boundaries. */
import { adjacentActor } from './actors.js';
import { advanceDialogue, openDialogue } from './dialogue.js';
import { movePlayer } from './world.js';

/** Create the initial episode state. */
/** @param {object} content Episode content. @returns {object} Initial state. */
export function createSimulation(content) {
  return {
    world: {
      map: content.map,
      player: { ...content.player },
      npcs: content.npcs.map(npc => ({ ...npc })),
      time: 8,
      season: 'spring',
      location: 'village',
    },
    inventory: {},
    quest: { id: content.quest.id, progress: 0, complete: false },
    battle: null,
    dialogue: null,
    effects: [],
    tick: 0,
  };
}
/** Advance the episode by one deterministic simulation step. */
/** @param {object} state Game state. @param {string[]} actions Active actions. @param {object} content Episode content. @returns {object} Updated state. */
export function stepGame(state, actions, content) {
  let next = { ...state, tick: state.tick + 1, effects: [] };
  const direction = ['up', 'down', 'left', 'right'].find(action =>
    actions.includes(action)
  );
  if (!next.dialogue && direction && next.tick % 4 === 0)
    next = { ...next, world: movePlayer(next.world, direction) };
  if (actions.includes('confirm')) {
    if (next.dialogue) next = advanceDialogue(next);
    else {
      const actor = adjacentActor(next.world);
      if (actor)
        next = openDialogue(
          next,
          actor.id,
          content.dialogue[actor.id] || ['Hello.']
        );
    }
  }
  if (
    next.world.location === 'village' &&
    next.world.player.x === 2 &&
    next.world.player.y === 6 &&
    actions.includes('confirm')
  )
    next = addItem(next, 'turnip');
  if (
    next.world.location === 'village' &&
    next.world.player.x === 3 &&
    next.world.player.y === 6 &&
    actions.includes('confirm')
  )
    next = addItem(next, 'fish');
  if (next.inventory.turnip && next.inventory.fish && !next.quest.complete)
    next = {
      ...next,
      quest: { ...next.quest, progress: 2, complete: true },
      effects: ['quest-complete'],
    };
  if (
    next.world.player.x === 10 &&
    next.world.player.y === 1 &&
    actions.includes('confirm') &&
    !next.battle
  )
    next = {
      ...next,
      battle: {
        creature: content.creatures[0],
        playerHp: 12,
        enemyHp: content.creatures[0].hp,
        turn: 'player',
      },
    };
  if (next.battle && actions.includes('confirm')) next = battleTurn(next);
  return next;
}
/** Add one item to the inventory. @param {object} state Game state. @param {string} item Item identifier. @returns {object} Updated state. */
function addItem(state, item) {
  if (state.inventory[item]) return state;
  return {
    ...state,
    inventory: { ...state.inventory, [item]: 1 },
    effects: [`item:${item}`],
  };
}
/** Resolve one player battle action. @param {object} state Game state. @returns {object} Updated state. */
function battleTurn(state) {
  const enemyHp = Math.max(0, state.battle.enemyHp - 3);
  if (enemyHp === 0) return { ...state, battle: null, effects: ['battle-won'] };
  return {
    ...state,
    battle: {
      ...state.battle,
      enemyHp,
      playerHp: Math.max(
        1,
        state.battle.playerHp - state.battle.creature.power
      ),
      turn: 'player',
    },
  };
}
