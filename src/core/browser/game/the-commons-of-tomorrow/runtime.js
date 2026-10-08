import { createMosslightRuntime } from '../mosslight-valley/runtime.js';
import { createSaveAdapter } from '../mosslight-valley/save.js';
import { COMMONS_CONTENT } from './content.js';
import { renderCommons } from './renderer.js';
import {
  commonsJournal,
  createCommonsState,
  stepCommons,
} from './simulation.js';

const SAVE_GAME = 'the-commons-of-tomorrow';
const SAVE_KEY = 'the-commons-of-tomorrow-saves-v1';

/**
 * Validate portable Commons state before replacing the active save.
 * @param {Record<string, any>} state Candidate imported state.
 * @param {Record<string, any>} content Trusted authored content.
 * @returns {boolean} Whether the state belongs to this chapter and its bounds.
 */
export function validCommonsState(state, content = COMMONS_CONTENT) {
  const world = state?.world;
  const puzzle = state?.puzzle;
  if (
    !world ||
    !content.maps[world.mapId] ||
    !world.map ||
    world.map.width !== content.maps[world.mapId].width ||
    world.map.height !== content.maps[world.mapId].height ||
    !world.player ||
    !Number.isFinite(world.player.x) ||
    !Number.isFinite(world.player.y) ||
    !['up', 'down', 'left', 'right'].includes(world.player.facing) ||
    world.player.x < 0 ||
    world.player.x >= content.maps[world.mapId].width ||
    world.player.y < 0 ||
    world.player.y >= content.maps[world.mapId].height ||
    !world.flags ||
    typeof world.flags !== 'object' ||
    Array.isArray(world.flags) ||
    !state.inventory ||
    typeof state.inventory !== 'object' ||
    Array.isArray(state.inventory) ||
    !Array.isArray(state.evidence) ||
    !Array.isArray(state.agreements) ||
    !Array.isArray(state.practices) ||
    !Array.isArray(state.journal) ||
    state.agreements.length > 1 ||
    state.practices.length > 1 ||
    !puzzle ||
    !puzzle.fluid ||
    puzzle.fluid.width !== 5 ||
    puzzle.fluid.height !== 4 ||
    !Array.isArray(puzzle.fluid.volume) ||
    puzzle.fluid.volume.length !== 20 ||
    !Array.isArray(puzzle.fluid.solids) ||
    puzzle.fluid.solids.length !== 20 ||
    !Number.isInteger(puzzle.editsUsed) ||
    puzzle.editsUsed < 0 ||
    puzzle.editsUsed > 3 ||
    !['marsh', 'commons'].includes(puzzle.route) ||
    typeof puzzle.gateOpen !== 'boolean' ||
    typeof puzzle.completed !== 'boolean' ||
    !['world', 'puzzle', 'journal'].includes(state.mode)
  )
    return false;
  return (
    state.evidence.every(item =>
      ['gauge-reading', 'reed-nesting-marks', 'water-routed'].includes(item)
    ) &&
    state.agreements.every((/** @type {Record<string, any>} */ agreement) =>
      content.quest.choices.some(
        (/** @type {Record<string, any>} */ choice) =>
          choice.id === agreement.choice &&
          Array.isArray(agreement.valuesProtected) &&
          typeof agreement.terms === 'string'
      )
    ) &&
    (state.charter === null ||
      (state.charter &&
        content.quest.choices.some(
          (/** @type {Record<string, any>} */ choice) =>
            choice.id === state.charter.id
        ) &&
        typeof state.charter.text === 'string')) &&
    state.practices.every((/** @type {string} */ id) =>
      content.practices.some(
        (/** @type {Record<string, any>} */ practice) => practice.id === id
      )
    ) &&
    puzzle.fluid.volume.every(
      (/** @type {number} */ value) =>
        Number.isFinite(value) && value >= 0 && value <= 1
    ) &&
    puzzle.fluid.solids.every(
      (/** @type {unknown} */ value) => typeof value === 'boolean'
    )
  );
}

/**
 * Rebind trusted maps and scheduled actors after save restoration.
 * @param {Record<string, any>} state Validated portable state.
 * @param {Record<string, any>} content Authored chapter content.
 * @returns {Record<string, any>} State with trusted references restored.
 */
export function restoreCommonsState(state, content = COMMONS_CONTENT) {
  const world = {
    ...state.world,
    map: content.maps[state.world.mapId],
    npcs: state.world.npcs,
  };
  return { ...state, world };
}

/**
 * Compose the Commons simulation behind Dadeto's shared handheld lifecycle.
 * @param {Record<string, any>|Map<string, any>} [options] Runtime dependencies.
 * @returns {Record<string, any>} Runtime lifecycle, dispatch, save and frame API.
 */
export function createCommonsRuntime(options = {}) {
  const opts = options instanceof Map ? { env: options } : options;
  const content = opts.content || COMMONS_CONTENT;
  const env = opts.env || new Map();
  const save =
    opts.save ||
    createSaveAdapter(env, {
      game: SAVE_GAME,
      key: SAVE_KEY,
      validate: (/** @type {Record<string, any>} */ state) =>
        validCommonsState(state, content),
      restore: (/** @type {Record<string, any>} */ state) =>
        restoreCommonsState(state, content),
    });
  return createMosslightRuntime({
    ...opts,
    env,
    content,
    save,
    invalidSaveMessage: 'Invalid The Commons of Tomorrow save data.',
    systems: {
      create: () => createCommonsState(content),
      step: (
        /** @type {Record<string, any>} */ state,
        /** @type {string[]} */ actions
      ) => stepCommons(state, actions, content),
      journal: commonsJournal,
    },
    renderer: renderCommons,
  });
}
