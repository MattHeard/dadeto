import { createThreefoldHighWorldScene } from './high-world-scenes.js';
import { heightAtScale } from './spatial.js';

export const THREEFOLD_WAKEFORM_SHOALS_SCENE_ID = 'wakeform-shoals';
export const THREEFOLD_WAKEFORM_ID = 'shoals-wakeform';
export const THREEFOLD_SHOALS_TIDEWALL_ID = 'shoals-outer-tidewall';

/** @typedef {ReturnType<typeof createThreefoldHighWorldScene> & {id: 'wakeform-shoals'}} ThreefoldWakeformShoalsScene */
/** @typedef {{wakeformDiverted: boolean, outerDefenseBreached: boolean}} ThreefoldWakeformShoalsState */

/**
 * Create the offshore route with the Wakeform present only until it is guided away.
 * @param {{wakeformDiverted?: boolean}} [options] Persisted encounter outcome.
 * @returns {ThreefoldWakeformShoalsScene} Independent shoals scene.
 */
export function createThreefoldWakeformShoalsScene(options = {}) {
  const scene = createThreefoldHighWorldScene(
    THREEFOLD_WAKEFORM_SHOALS_SCENE_ID
  );
  if (options.wakeformDiverted === true) scene.creatures = [];
  return /** @type {ThreefoldWakeformShoalsScene} */ (scene);
}

/**
 * Create the persistent offshore intervention outcome.
 * @returns {ThreefoldWakeformShoalsState} Fresh shoals state.
 */
export function createThreefoldWakeformShoalsState() {
  return { wakeformDiverted: false, outerDefenseBreached: false };
}

/**
 * Validate the shoals outcome stored in an imported save.
 * @param {unknown} candidate Candidate save state.
 * @returns {ThreefoldWakeformShoalsState} Canonical route state.
 */
export function normalizeThreefoldWakeformShoalsState(candidate) {
  if (candidate === undefined) return createThreefoldWakeformShoalsState();
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    throw new RangeError('Shoals intervention state is invalid.');
  const state =
    /** @type {{wakeformDiverted?: unknown, outerDefenseBreached?: unknown}} */ (
      candidate
    );
  if (
    typeof state.wakeformDiverted !== 'boolean' ||
    typeof state.outerDefenseBreached !== 'boolean'
  )
    throw new RangeError('Shoals intervention state is invalid.');
  return {
    wakeformDiverted: state.wakeformDiverted,
    outerDefenseBreached: state.outerDefenseBreached,
  };
}

/**
 * Check whether Mara can signal the Wakeform at her current physical scale.
 * @param {{scene: {id: string, creatures: Array<{id: string, position: {x: number, y: number}}>}, player: {scale: number, position: {x: number, y: number}}}} state Current simulation.
 * @returns {boolean} Whether the Wakeform is close enough to guide away.
 */
export function isThreefoldWakeformInReach(state) {
  if (state.scene.id !== THREEFOLD_WAKEFORM_SHOALS_SCENE_ID) return false;
  const wakeform = state.scene.creatures.find(
    creature => creature.id === THREEFOLD_WAKEFORM_ID
  );
  if (!wakeform) return false;
  const reachMeters = heightAtScale(state.player.scale) * 0.2;
  return (
    Math.hypot(
      state.player.position.x - wakeform.position.x,
      state.player.position.y - wakeform.position.y
    ) <= reachMeters
  );
}
