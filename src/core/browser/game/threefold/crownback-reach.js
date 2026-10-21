import { createThreefoldHighWorldScene } from './high-world-scenes.js';
import { heightAtScale } from './spatial.js';

export const THREEFOLD_CROWNBACK_REACH_SCENE_ID = 'crownback-reach';
export const THREEFOLD_CROWNBACK_REACH_THARN_ID = 'crownback-elder-tharn';

/** @typedef {ReturnType<typeof createThreefoldHighWorldScene> & {id: 'crownback-reach'}} ThreefoldCrownbackReachScene */
/** @typedef {{tharnMet: boolean}} ThreefoldCrownbackReachState */

/**
 * Create the +3 Crownback migration route.
 * @returns {ThreefoldCrownbackReachScene} Independent Crownback Reach scene.
 */
export function createThreefoldCrownbackReachScene() {
  return /** @type {ThreefoldCrownbackReachScene} */ (
    createThreefoldHighWorldScene(THREEFOLD_CROWNBACK_REACH_SCENE_ID)
  );
}

/**
 * Create the route's persistent first meeting state.
 * @returns {ThreefoldCrownbackReachState} Fresh encounter state.
 */
export function createThreefoldCrownbackReachState() {
  return { tharnMet: false };
}

/**
 * Validate route encounter state from an imported save.
 * @param {unknown} candidate Candidate encounter state.
 * @returns {ThreefoldCrownbackReachState} Independent validated encounter state.
 */
export function normalizeThreefoldCrownbackReachState(candidate) {
  if (candidate === undefined) return createThreefoldCrownbackReachState();
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    throw new RangeError('Crownback encounter state is invalid.');
  const state = /** @type {{tharnMet?: unknown}} */ (candidate);
  if (typeof state.tharnMet !== 'boolean')
    throw new RangeError('Crownback encounter state is invalid.');
  return { tharnMet: state.tharnMet };
}

/**
 * Check whether Mara can reach elder Tharn at her current scale.
 * @param {{scene: {id: string, creatures: Array<{id: string, position: {x: number, y: number}}>}, player: {scale: number, position: {x: number, y: number}}}} state Current route state.
 * @returns {boolean} Whether Tharn is within physical interaction reach.
 */
export function isThreefoldCrownbackTharnInReach(state) {
  if (state.scene.id !== THREEFOLD_CROWNBACK_REACH_SCENE_ID) return false;
  const tharn = state.scene.creatures.find(
    creature => creature.id === THREEFOLD_CROWNBACK_REACH_THARN_ID
  );
  if (!tharn) return false;
  const reachMeters = heightAtScale(state.player.scale) * 0.2;
  return (
    Math.hypot(
      state.player.position.x - tharn.position.x,
      state.player.position.y - tharn.position.y
    ) <= reachMeters
  );
}
