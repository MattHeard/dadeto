import * as sceneUtils from './scene-utils.js';

export const THREEFOLD_WEFTWAYS_SCENE_ID = 'weftways';
export const THREEFOLD_WEFTWAYS_ROOT_CROSSING_ID =
  'weftways-deep-root-crossing';
export const THREEFOLD_WEFTWAYS_LOW_QUAY_ID = 'weftways-low-quay-homes';
export const THREEFOLD_WEFTWAYS_PELL_BYPASS_ID = 'weftways-pell-bypass';
export const THREEFOLD_WEFTWAYS_QUAY_SPILL_ID = 'weftways-quay-spill';
export const THREEFOLD_WEFTWAYS_PELL_ID = 'weftways-pell';

const SCENE_BOUNDS = { min: { x: 0, y: 0 }, max: { x: 2.4, y: 0.8 } };
const ROOT_CROSSING_BOUNDS = {
  min: { x: 0.32, y: 0.58, z: 0 },
  max: { x: 0.96, y: 0.78, z: 0.42 },
};
const LOW_QUAY_BOUNDS = {
  min: { x: 1.48, y: 0.08, z: 0 },
  max: { x: 2.16, y: 0.25, z: 0.62 },
};
const THREADBOUND_PELL = {
  id: THREEFOLD_WEFTWAYS_PELL_ID,
  position: { x: 1.12, y: 0.56 },
  bounds: {
    min: { x: 1.08, y: 0.52, z: 0 },
    max: { x: 1.16, y: 0.6, z: 0.18 },
  },
};
const PACK_BEETLES = [
  createPackBeetle('weftways-pack-beetle-1', { x: 0.45, y: 0.16 }),
  createPackBeetle('weftways-pack-beetle-2', { x: 1.1, y: 0.16 }),
];
const CROSSING_GEOMETRY = [
  { id: THREEFOLD_WEFTWAYS_ROOT_CROSSING_ID, bounds: ROOT_CROSSING_BOUNDS },
  { id: THREEFOLD_WEFTWAYS_LOW_QUAY_ID, bounds: LOW_QUAY_BOUNDS },
];

/**
 * Create the authored scale −2 Threadbound caravan crossing.
 * @returns {{id: 'weftways', displayName: string, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}, spawn: ReturnType<typeof import('./spatial.js').createScaleState>, baseBodyWidthMeters: number, areas: never[], geometry: Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>, decorations: [], interactables: Array<{id: string, position: {x: number, y: number}, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>, creatures: Array<{id: string, position: {x: number, y: number}, growthRule: 'overlap', bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>}} Independent Threadbound crossing.
 */
export function createThreefoldWeftwaysScene() {
  return {
    id: THREEFOLD_WEFTWAYS_SCENE_ID,
    displayName: 'Weftways',
    bounds: sceneUtils.copyThreefoldBounds(SCENE_BOUNDS),
    spawn: sceneUtils.createThreefoldPlayerSpawn({ x: 1.2, y: 0.4 }, -2),
    baseBodyWidthMeters: 0.4,
    areas: [],
    geometry: sceneUtils.copyThreefoldGeometryList(CROSSING_GEOMETRY),
    decorations: [],
    interactables: [
      copyThreadboundPell(),
      createFlowControl(THREEFOLD_WEFTWAYS_PELL_BYPASS_ID, 0.2),
      createFlowControl(THREEFOLD_WEFTWAYS_QUAY_SPILL_ID, 2.2),
    ],
    creatures: PACK_BEETLES.map(sceneUtils.copyThreefoldCreature),
  };
}

/**
 * Create the unresolved flow choice for the Threadbound crossing.
 * @returns {{flowChoice: 'undecided'|'pell-bypass'|'quay-spill', floodedGeometryIds: string[]}} Initial route state.
 */
export function createThreefoldWeftwaysState() {
  return { flowChoice: 'undecided', floodedGeometryIds: [] };
}

/**
 * Rebuild only the flood footprint implied by a saved choice.
 * @param {unknown} candidate Saved flow choice.
 * @returns {{flowChoice: 'undecided'|'pell-bypass'|'quay-spill', floodedGeometryIds: string[]}} Canonical route state.
 */
export function normalizeThreefoldWeftwaysState(candidate) {
  if (!candidate || typeof candidate !== 'object')
    throw new RangeError('Weftways state is invalid.');
  const state = /** @type {Record<string, unknown>} */ (candidate);
  const choice = state.flowChoice;
  if (
    choice !== 'undecided' &&
    choice !== 'pell-bypass' &&
    choice !== 'quay-spill'
  )
    throw new RangeError('Weftways flow choice is invalid.');
  const floodedGeometryIds =
    choice === 'pell-bypass'
      ? [THREEFOLD_WEFTWAYS_LOW_QUAY_ID]
      : choice === 'quay-spill'
        ? [THREEFOLD_WEFTWAYS_ROOT_CROSSING_ID]
        : [];
  if (
    state.floodedGeometryIds !== undefined &&
    JSON.stringify(state.floodedGeometryIds) !==
      JSON.stringify(floodedGeometryIds)
  )
    throw new RangeError('Weftways flood footprint is inconsistent.');
  return { flowChoice: choice, floodedGeometryIds };
}

/**
 * Put one flow control at a reachable physical position.
 * @param {string} id Authored control identifier.
 * @param {number} x Horizontal location in metres.
 * @returns {{id: string, position: {x: number, y: number}, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}} Reachable control.
 */
function createFlowControl(id, x) {
  return {
    id,
    position: { x, y: 0.4 },
    bounds: {
      min: { x: x - 0.05, y: 0.35, z: 0 },
      max: { x: x + 0.05, y: 0.45, z: 0.12 },
    },
  };
}

/**
 * Author one beetle at Threadbound pack-animal scale.
 * @param {string} id Unique creature identity.
 * @param {{x: number, y: number}} position Physical centre in metres.
 * @returns {{id: string, position: {x: number, y: number}, growthRule: 'overlap', bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}} Oversized pack beetle.
 */
function createPackBeetle(id, position) {
  return {
    id,
    position: { ...position },
    growthRule: 'overlap',
    bounds: {
      min: { x: position.x - 0.3, y: position.y - 0.15, z: 0 },
      max: { x: position.x + 0.3, y: position.y + 0.15, z: 0.25 },
    },
  };
}

/**
 * Copy Pell's actor data into one independently mutable scene.
 * @returns {typeof THREADBOUND_PELL} Independent navigator actor.
 */
function copyThreadboundPell() {
  return {
    ...THREADBOUND_PELL,
    position: { ...THREADBOUND_PELL.position },
    bounds: {
      min: { ...THREADBOUND_PELL.bounds.min },
      max: { ...THREADBOUND_PELL.bounds.max },
    },
  };
}
