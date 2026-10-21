import * as sceneUtils from './scene-utils.js';

export const THREEFOLD_HEARTHGAPS_SCENE_ID = 'hearthgaps';
export const THREEFOLD_HEARTHGAPS_BRIN_HOME_ID = 'hearthgaps-brin-homes';
export const THREEFOLD_HEARTHGAPS_DOWNSTREAM_HOME_ID =
  'hearthgaps-downstream-homes';
export const THREEFOLD_HEARTHGAPS_BRIN_GATE_ID = 'hearthgaps-brin-runoff-gate';
export const THREEFOLD_HEARTHGAPS_SHARED_BYPASS_ID = 'hearthgaps-shared-bypass';

const SCENE_BOUNDS = { min: { x: 0, y: 0 }, max: { x: 1.2, y: 0.4 } };
const HOME_BOUNDS = {
  brin: {
    min: { x: 0.04, y: 0.05, z: 0 },
    max: { x: 0.24, y: 0.25, z: 0.18 },
  },
  downstream: {
    min: { x: 0.96, y: 0.05, z: 0 },
    max: { x: 1.16, y: 0.25, z: 0.18 },
  },
};
const CULVERT_DECORATION = {
  id: 'hearthgaps-culvert',
  bounds: {
    min: { x: 0.2, y: 0.16, z: 0 },
    max: { x: 1, y: 0.24, z: 0.08 },
  },
};
const SETTLEMENT_HOMES = [
  { id: THREEFOLD_HEARTHGAPS_BRIN_HOME_ID, bounds: HOME_BOUNDS.brin },
  {
    id: THREEFOLD_HEARTHGAPS_DOWNSTREAM_HOME_ID,
    bounds: HOME_BOUNDS.downstream,
  },
];

/**
 * Create the authored scale −1 Hearthgaps culvert settlement.
 * @returns {{id: 'hearthgaps', displayName: string, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}, spawn: ReturnType<typeof import('./spatial.js').createScaleState>, baseBodyWidthMeters: number, areas: Array<{id: string, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}}>, geometry: Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>, decorations: Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>, interactables: Array<{id: string, position: {x: number, y: number}, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>, creatures: never[]}} Independent Latchfolk settlement.
 */
export function createThreefoldHearthgapsScene() {
  return {
    id: THREEFOLD_HEARTHGAPS_SCENE_ID,
    displayName: 'Hearthgaps',
    bounds: sceneUtils.copyThreefoldBounds(SCENE_BOUNDS),
    spawn: sceneUtils.createThreefoldPlayerSpawn({ x: 0.6, y: 0.2 }, -1),
    baseBodyWidthMeters: 0.4,
    areas: [],
    geometry: sceneUtils.copyThreefoldGeometryList(SETTLEMENT_HOMES),
    decorations: [sceneUtils.copyThreefoldGeometry(CULVERT_DECORATION)],
    interactables: [
      createRunoffControl(THREEFOLD_HEARTHGAPS_BRIN_GATE_ID, 0.16),
      createRunoffControl(THREEFOLD_HEARTHGAPS_SHARED_BYPASS_ID, 1.04),
    ],
    creatures: createHearthgapsCreatures(),
  };
}

/**
 * Create the unresolved runoff decision and its physical flood damage.
 * @returns {{runoffChoice: 'undecided'|'brin-diversion'|'shared-bypass', floodedHomeIds: string[]}} Initial choice state.
 */
export function createThreefoldHearthgapsState() {
  return { runoffChoice: 'undecided', floodedHomeIds: [] };
}

/**
 * Reconstruct only damage that follows from the authored runoff choice.
 * @param {unknown} candidate Saved branch state.
 * @returns {{runoffChoice: 'undecided'|'brin-diversion'|'shared-bypass', floodedHomeIds: string[]}} Canonical branch state.
 */
export function normalizeThreefoldHearthgapsState(candidate) {
  if (!candidate || typeof candidate !== 'object')
    throw new RangeError('Hearthgaps state is invalid.');
  const state = /** @type {Record<string, unknown>} */ (candidate);
  const choice = state.runoffChoice;
  if (
    choice !== 'undecided' &&
    choice !== 'brin-diversion' &&
    choice !== 'shared-bypass'
  )
    throw new RangeError('Hearthgaps runoff choice is invalid.');
  const floodedHomeIds =
    choice === 'brin-diversion'
      ? [THREEFOLD_HEARTHGAPS_DOWNSTREAM_HOME_ID]
      : choice === 'shared-bypass'
        ? [THREEFOLD_HEARTHGAPS_BRIN_HOME_ID]
        : [];
  if (
    state.floodedHomeIds !== undefined &&
    JSON.stringify(state.floodedHomeIds) !== JSON.stringify(floodedHomeIds)
  )
    throw new RangeError('Hearthgaps flood damage is inconsistent.');
  return {
    runoffChoice: choice,
    floodedHomeIds,
  };
}

/**
 * Place a runoff control at a point in the culvert.
 * @param {string} id Control identifier.
 * @param {number} x Canonical horizontal position in metres.
 * @returns {{id: string, position: {x: number, y: number}, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}} Reachable control and physical interaction bounds.
 */
function createRunoffControl(id, x) {
  return {
    id,
    position: { x, y: 0.2 },
    bounds: {
      min: { x: x - 0.04, y: 0.16, z: 0 },
      max: { x: x + 0.04, y: 0.24, z: 0.08 },
    },
  };
}

/** @returns {never[]} No separate creature actor is authored in this choice scene. */
function createHearthgapsCreatures() {
  return [];
}
