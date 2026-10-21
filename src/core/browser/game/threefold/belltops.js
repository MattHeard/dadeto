import { createThreefoldHighWorldScene } from './high-world-scenes.js';

export const THREEFOLD_BELLTOPS_SCENE_ID = 'belltops';

/** @typedef {ReturnType<typeof createThreefoldHighWorldScene> & {id: 'belltops'}} ThreefoldBelltopsScene */

/**
 * Create the authored +2 harbor machinery and high-roof route.
 * @returns {ThreefoldBelltopsScene} Independent Belltops scene.
 */
export function createThreefoldBelltopsScene() {
  return /** @type {ThreefoldBelltopsScene} */ (
    createThreefoldHighWorldScene(THREEFOLD_BELLTOPS_SCENE_ID)
  );
}
