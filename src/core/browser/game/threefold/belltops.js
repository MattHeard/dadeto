import { createThreefoldHighWorldScene } from './high-world-scenes.js';
import { isThreefoldInteractableInReach } from './scene-utils.js';

export const THREEFOLD_BELLTOPS_SCENE_ID = 'belltops';
export const THREEFOLD_BELLTOPS_CRANE_DRIVE_ID = 'belltops-crane-governor';
export const THREEFOLD_BELLTOPS_PRESSURE_REGULATOR_ID =
  'belltops-pressure-regulator-control';
export { THREEFOLD_BELLTOPS_IRI_ID } from './high-world-scenes.js';

/** @typedef {ReturnType<typeof createThreefoldHighWorldScene> & {id: 'belltops'}} ThreefoldBelltopsScene */

/**
 * Create the authored +2 harbor machinery and high-roof route.
 * @returns {ThreefoldBelltopsScene} Independent Belltops scene.
 */
export function createThreefoldBelltopsScene() {
  const scene = createThreefoldHighWorldScene(THREEFOLD_BELLTOPS_SCENE_ID);
  return /** @type {ThreefoldBelltopsScene} */ ({
    ...scene,
    interactables: [
      createPressureRegulatorControl(),
      {
        id: THREEFOLD_BELLTOPS_CRANE_DRIVE_ID,
        position: { x: -6.2, y: -1 },
        bounds: {
          min: { x: -6.5, y: -1.3, z: 0 },
          max: { x: -5.9, y: -0.7, z: 2 },
        },
      },
    ],
  });
}

/**
 * Check whether Mara can reach Iri at the Quay pressure regulator.
 * @param {any} state Current region state.
 * @returns {boolean} Whether the regulator control is in physical reach.
 */
export function isThreefoldBelltopsRegulatorInReach(state) {
  return (
    state.scene.id === THREEFOLD_BELLTOPS_SCENE_ID &&
    isThreefoldInteractableInReach(
      state,
      THREEFOLD_BELLTOPS_PRESSURE_REGULATOR_ID
    )
  );
}

/**
 * Create the panel where Iri is maintaining the Quay pressure regulator.
 * @returns {{id: string, position: {x: number, y: number}, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}} Reachable control point.
 */
function createPressureRegulatorControl() {
  return {
    id: THREEFOLD_BELLTOPS_PRESSURE_REGULATOR_ID,
    position: { x: 3.4, y: 1 },
    bounds: {
      min: { x: 3.2, y: 0.7, z: 0 },
      max: { x: 3.6, y: 1.3, z: 1.8 },
    },
  };
}
