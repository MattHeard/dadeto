import { createThreefoldHighWorldScene } from './high-world-scenes.js';

export const THREEFOLD_LANTERN_WARD_SCENE_ID = 'lantern-ward';

/** @typedef {ReturnType<typeof createThreefoldHighWorldScene> & {id: 'lantern-ward'}} ThreefoldLanternWardScene */

/**
 * Create the authored +3 Lantern Ward with two buildings and named residents.
 * @returns {ThreefoldLanternWardScene} Independent Lantern Ward scene.
 */
export function createThreefoldLanternWardScene() {
  return /** @type {ThreefoldLanternWardScene} */ (
    createThreefoldHighWorldScene(THREEFOLD_LANTERN_WARD_SCENE_ID)
  );
}
