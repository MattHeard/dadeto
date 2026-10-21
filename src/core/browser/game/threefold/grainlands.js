import * as sceneUtils from './scene-utils.js';

export const THREEFOLD_GRAINLANDS_SCENE_ID = 'grainlands';
export const THREEFOLD_GRAINLANDS_SPIDER_ID = 'grainlands-spider';
export const THREEFOLD_GRAINLANDS_BRIDGE_ID = 'grainlands-threadbound-bridge';
export const THREEFOLD_GRAINLANDS_IRU_ID = 'grainlands-iru';
export const THREEFOLD_GRAINLANDS_NURSERY_ID = 'grainlands-nursery-clades';
export const THREEFOLD_GRAINLANDS_HATCH_ID = 'grainlands-shelter-hatch';

const SCENE_BOUNDS = { min: { x: 0, y: 0 }, max: { x: 0.8, y: 0.4 } };
const BRIDGE_BOUNDS = {
  min: { x: 0.21, y: 0.16, z: 0 },
  max: { x: 0.29, y: 0.24, z: 0.04 },
};
const NURSERY_BOUNDS = {
  min: { x: 0.52, y: 0.12, z: 0 },
  max: { x: 0.72, y: 0.3, z: 0.12 },
};
const IRU = {
  id: THREEFOLD_GRAINLANDS_IRU_ID,
  position: { x: 0.17, y: 0.2 },
  bounds: {
    min: { x: 0.155, y: 0.185, z: 0 },
    max: { x: 0.185, y: 0.215, z: 0.05 },
  },
};
const SPIDER = {
  id: THREEFOLD_GRAINLANDS_SPIDER_ID,
  position: { x: 0.322, y: 0.2 },
  growthRule: /** @type {'overlap'} */ ('overlap'),
  bounds: {
    min: { x: 0.21, y: 0.14, z: 0 },
    max: { x: 0.39, y: 0.26, z: 0.12 },
  },
};
const GROWTH_GEOMETRY = [
  { id: THREEFOLD_GRAINLANDS_BRIDGE_ID, bounds: BRIDGE_BOUNDS },
  { id: THREEFOLD_GRAINLANDS_NURSERY_ID, bounds: NURSERY_BOUNDS },
];

/**
 * Create the authored 6.77 cm Grainlands nursery crossing.
 * @returns {{id: 'grainlands', displayName: string, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}, spawn: ReturnType<typeof import('./spatial.js').createScaleState>, baseBodyWidthMeters: number, areas: never[], geometry: Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>, decorations: [], interactables: Array<{id: string, position: {x: number, y: number}, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>, creatures: Array<{id: string, position: {x: number, y: number}, growthRule: 'overlap', bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>}} Independent Grainlands scene.
 */
export function createThreefoldGrainlandsScene() {
  return {
    id: THREEFOLD_GRAINLANDS_SCENE_ID,
    displayName: 'Grainlands',
    bounds: sceneUtils.copyThreefoldBounds(SCENE_BOUNDS),
    spawn: sceneUtils.createThreefoldPlayerSpawn({ x: 0.2, y: 0.2 }, -3, -3),
    baseBodyWidthMeters: 0.4,
    areas: [],
    geometry: sceneUtils.copyThreefoldGeometryList(GROWTH_GEOMETRY),
    decorations: [],
    interactables: [
      copyIru(),
      {
        id: THREEFOLD_GRAINLANDS_HATCH_ID,
        position: { x: 0.55, y: 0.34 },
        bounds: {
          min: { x: 0.53, y: 0.32, z: 0 },
          max: { x: 0.57, y: 0.36, z: 0.03 },
        },
      },
    ],
    creatures: [sceneUtils.copyThreefoldCreature(SPIDER)],
  };
}

/**
 * Create the unresolved Grainlands spider and bridge outcome.
 * @returns {{spiderFate: 'present'|'baited-away'|'overpowered', bridgeOutcome: 'intact'|'broken'}} Initial encounter state.
 */
export function createThreefoldGrainlandsState() {
  return { spiderFate: 'present', bridgeOutcome: 'intact' };
}

/**
 * Canonicalize the spider outcome and its physical crossing state.
 * @param {unknown} candidate Saved route state.
 * @returns {{spiderFate: 'present'|'baited-away'|'overpowered', bridgeOutcome: 'intact'|'broken'}} Valid Grainlands outcome.
 */
export function normalizeThreefoldGrainlandsState(candidate) {
  if (!candidate || typeof candidate !== 'object')
    throw new RangeError('Grainlands state is invalid.');
  const state = /** @type {Record<string, unknown>} */ (candidate);
  const spiderFate = state.spiderFate;
  const bridgeOutcome = state.bridgeOutcome;
  if (
    spiderFate !== 'present' &&
    spiderFate !== 'baited-away' &&
    spiderFate !== 'overpowered'
  )
    throw new RangeError('Grainlands spider fate is invalid.');
  if (bridgeOutcome !== 'intact' && bridgeOutcome !== 'broken')
    throw new RangeError('Grainlands bridge outcome is invalid.');
  if (spiderFate === 'overpowered' && bridgeOutcome !== 'broken')
    throw new RangeError('Overpowering the spider must break the bridge.');
  return { spiderFate, bridgeOutcome };
}

/**
 * Copy Iru's independently mutable actor state.
 * @returns {typeof IRU} Independent Nursery Clades spokesperson.
 */
function copyIru() {
  return sceneUtils.copyThreefoldCreature(IRU);
}
