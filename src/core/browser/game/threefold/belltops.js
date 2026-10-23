import { createThreefoldHighWorldScene } from './high-world-scenes.js';
import { isThreefoldInteractableInReach } from './scene-utils.js';
import { heightAtScale } from './spatial.js';

export const THREEFOLD_BELLTOPS_SCENE_ID = 'belltops';
export const THREEFOLD_BELLTOPS_CRANE_DRIVE_ID = 'belltops-crane-governor';
export const THREEFOLD_BELLTOPS_PRESSURE_REGULATOR_ID =
  'belltops-pressure-regulator-control';
export const THREEFOLD_BELLTOPS_FOLDGLASS_RIVAL_ID = 'belltops-foldglass-rival';
export const THREEFOLD_BELLTOPS_FOLDGLASS_RIVAL_INTERACTABLE_ID =
  'belltops-foldglass-rival-approach';
const FOLDGLASS_RIVAL_POSITION = { x: 0, y: -12 };
export { THREEFOLD_BELLTOPS_IRI_ID } from './high-world-scenes.js';

/** @typedef {ReturnType<typeof createThreefoldHighWorldScene> & {id: 'belltops'}} ThreefoldBelltopsScene */

/**
 * Create the authored +2 harbor machinery and high-roof route.
 * @param {{foldglassRivalScale?: number}} [options] Persistent physical rival scale.
 * @returns {ThreefoldBelltopsScene} Independent Belltops scene.
 */
export function createThreefoldBelltopsScene(options = {}) {
  const rivalScale = normalizeFoldglassRivalScale(options.foldglassRivalScale);
  const scene = createThreefoldHighWorldScene(THREEFOLD_BELLTOPS_SCENE_ID);
  return /** @type {ThreefoldBelltopsScene} */ ({
    ...scene,
    creatures: [...scene.creatures, createFoldglassRival(rivalScale)],
    interactables: [
      createPressureRegulatorControl(),
      createFoldglassRivalApproach(rivalScale),
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
 * Check whether Mara can physically approach the Foldglass rival.
 * @param {any} state Current Belltops state.
 * @returns {boolean} Whether the rival is in reach.
 */
export function isThreefoldBelltopsFoldglassRivalInReach(state) {
  return (
    state.scene.id === THREEFOLD_BELLTOPS_SCENE_ID &&
    isThreefoldInteractableInReach(
      state,
      THREEFOLD_BELLTOPS_FOLDGLASS_RIVAL_INTERACTABLE_ID
    )
  );
}

/**
 * Normalize the rival's persistent physical scale.
 * @param {unknown} value Candidate scale.
 * @returns {number} Rival scale from two through four.
 */
export function normalizeFoldglassRivalScale(value) {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 2 &&
    value <= 4
    ? value
    : 3;
}

/**
 * Normalize the Belltops rival encounter state from a saved value.
 * @param {unknown} value Candidate saved rival state.
 * @returns {{scale: number, engaged: boolean}} Safe persistent state.
 */
export function normalizeThreefoldBelltopsFoldglassRival(value) {
  const rival =
    value && typeof value === 'object'
      ? /** @type {Record<string, any>} */ (value)
      : {};
  return {
    scale: normalizeFoldglassRivalScale(rival.scale),
    engaged: rival.engaged === true,
  };
}

/**
 * Create the rival's body from its canonical scale and fixed identity.
 * @param {number} scale Current physical scale.
 * @returns {Record<string, any>} Authored rival creature.
 */
function createFoldglassRival(scale) {
  const width = 0.4 * 3 ** scale;
  const height = heightAtScale(scale);
  return {
    id: THREEFOLD_BELLTOPS_FOLDGLASS_RIVAL_ID,
    displayName: 'FOLDGLASS RIVAL',
    growthRule: 'overlap',
    position: { ...FOLDGLASS_RIVAL_POSITION },
    scale,
    bounds: createFoldglassBounds(width, height),
  };
}

/**
 * Create the rival's reachable interaction volume.
 * @param {number} scale Current rival scale.
 * @returns {Record<string, any>} Approach point.
 */
function createFoldglassRivalApproach(scale) {
  return {
    id: THREEFOLD_BELLTOPS_FOLDGLASS_RIVAL_INTERACTABLE_ID,
    position: { ...FOLDGLASS_RIVAL_POSITION },
    bounds: createFoldglassBounds(0.4 * 3 ** scale, heightAtScale(scale)),
  };
}

/**
 * Build the rival and approach volumes from one physical scale.
 * @param {number} width Body width in metres.
 * @param {number} height Body height in metres.
 * @returns {{min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}} Physical bounds.
 */
function createFoldglassBounds(width, height) {
  const halfWidth = width / 2;
  return {
    min: {
      x: FOLDGLASS_RIVAL_POSITION.x - halfWidth,
      y: FOLDGLASS_RIVAL_POSITION.y - halfWidth,
      z: 0,
    },
    max: {
      x: FOLDGLASS_RIVAL_POSITION.x + halfWidth,
      y: FOLDGLASS_RIVAL_POSITION.y + halfWidth,
      z: height,
    },
  };
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
