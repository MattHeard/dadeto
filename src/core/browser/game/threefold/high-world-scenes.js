import { createScaleState } from './spatial.js';
import { copyThreefoldBounds } from './scene-utils.js';

const SCENE_BOUNDS = { min: { x: -24, y: -18 }, max: { x: 24, y: 18 } };

export const THREEFOLD_BELLTOPS_IRI_ID = 'belltops-iri';

/** @typedef {{min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}} ThreefoldHighWorldVolumeBounds */
/** @typedef {{id: string, displayName: string, bounds: ThreefoldHighWorldVolumeBounds}} ThreefoldHighWorldStructure */
/** @typedef {{id: string, displayName: string, growthRule: 'overlap', position: {x: number, y: number}, bounds: ThreefoldHighWorldVolumeBounds}} ThreefoldHighWorldResident */
/** @typedef {{id: 'lantern-ward'|'belltops'|'crownback-reach'|'wakeform-shoals', displayName: string, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}, spawn: ReturnType<typeof createScaleState>, baseBodyWidthMeters: number, areas: Array<{id: string, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}}>, geometry: ThreefoldHighWorldStructure[], decorations: [], interactables: Array<{id: string, position: {x: number, y: number}, bounds: ThreefoldHighWorldVolumeBounds}>, creatures: ThreefoldHighWorldResident[]}} ThreefoldHighWorldScene */
/** @typedef {{displayName: string, scale: number, minimumUnlockedScale: number, maximumUnlockedScale: number, bounds?: {min: {x: number, y: number}, max: {x: number, y: number}}, spawnPosition?: {x: number, y: number}, geometry: ThreefoldHighWorldStructure[], creatures: ThreefoldHighWorldResident[]}} ThreefoldHighWorldSceneDefinition */

/** @type {Record<'lantern-ward'|'belltops'|'crownback-reach'|'wakeform-shoals', ThreefoldHighWorldSceneDefinition>} */
const SCENE_DEFINITIONS = {
  'lantern-ward': {
    displayName: 'The Lantern Ward',
    scale: 3,
    minimumUnlockedScale: 2,
    maximumUnlockedScale: 4,
    geometry: [
      createHighWorldStructure(
        'lantern-ward-canal-homes',
        'HOMES',
        createVolumeBounds(
          { x: 5.8, y: -3.2, z: 0 },
          { x: 11.8, y: 3.2, z: 18 }
        )
      ),
      createHighWorldStructure(
        'lantern-ward-glassworks',
        'GLASSWORKS',
        createVolumeBounds(
          { x: -11.8, y: -3.2, z: 0 },
          { x: -5.8, y: 3.2, z: 22 }
        )
      ),
    ],
    creatures: [
      createHighWorldResident(
        'lantern-ward-mira',
        'MIRA',
        { x: 13, y: 1 },
        createVolumeBounds(
          { x: 12.7, y: 0.7, z: 0 },
          { x: 13.3, y: 1.3, z: 1.7 }
        )
      ),
      createHighWorldResident(
        'lantern-ward-tov',
        'TOV',
        { x: -13, y: -1 },
        createVolumeBounds(
          { x: -13.3, y: -1.3, z: 0 },
          { x: -12.7, y: -0.7, z: 1.7 }
        )
      ),
    ],
  },
  belltops: {
    displayName: 'The Belltops',
    scale: 2,
    minimumUnlockedScale: 1,
    maximumUnlockedScale: 3,
    creatures: [
      createHighWorldResident(
        THREEFOLD_BELLTOPS_IRI_ID,
        'IRI',
        { x: 3.4, y: 1 },
        createVolumeBounds({ x: 3.2, y: 0.8, z: 0 }, { x: 3.6, y: 1.2, z: 1.8 })
      ),
      createHighWorldResident(
        'belltops-sentry-orla',
        'ORLA',
        { x: 5, y: 0 },
        createVolumeBounds(
          { x: 4.8, y: -0.2, z: 0 },
          { x: 5.2, y: 0.2, z: 1.8 }
        )
      ),
      createHighWorldResident(
        'belltops-stormbird',
        'STORMBIRD',
        { x: -5, y: 0 },
        createVolumeBounds(
          { x: -5.3, y: -0.3, z: 0 },
          { x: -4.7, y: 0.3, z: 3.2 }
        )
      ),
    ],
    geometry: [
      createHighWorldStructure(
        'belltops-pressure-regulator',
        'PRESSURE REGULATOR',
        createVolumeBounds({ x: 2.8, y: -0.2, z: 0 }, { x: 4, y: 2.2, z: 3 })
      ),
      createHighWorldStructure(
        'belltops-watchtower',
        'WATCHTOWER',
        createVolumeBounds({ x: 4.2, y: -2.4, z: 0 }, { x: 8.5, y: 2.4, z: 20 })
      ),
      createHighWorldStructure(
        'belltops-harbor-crane',
        'HARBOR CRANE',
        createVolumeBounds(
          { x: -8.5, y: -2.4, z: 0 },
          { x: -4.2, y: 2.4, z: 24 }
        )
      ),
    ],
  },
  'crownback-reach': {
    displayName: 'Crownback Reach',
    scale: 3,
    minimumUnlockedScale: 3,
    maximumUnlockedScale: 4,
    bounds: { min: { x: -64, y: -48 }, max: { x: 64, y: 48 } },
    geometry: [
      createCrownbackStructure(
        'crownback-living-root-arch',
        'ROOT ARCH',
        createCrownbackVolume({ x: 10, y: 6, z: 0 }, { x: 18, y: 10, z: 52 })
      ),
      createCrownbackStructure(
        'crownback-floodwall',
        'FLOODWALL',
        createCrownbackVolume(
          { x: -18, y: -10, z: 0 },
          { x: -10, y: -6, z: 48 }
        )
      ),
    ],
    creatures: [
      createCrownbackResident(
        'crownback-elder-tharn',
        'ELDER THARN',
        { x: 11, y: 0 },
        createCrownbackVolume({ x: 9, y: -2, z: 0 }, { x: 13, y: 2, z: 44 })
      ),
      createCrownbackResident(
        'crownback-calf',
        'CALF',
        { x: -8, y: 0 },
        createCrownbackVolume({ x: -10, y: -2, z: 0 }, { x: -6, y: 2, z: 18 })
      ),
    ],
  },
  'wakeform-shoals': {
    displayName: 'The Shoals',
    scale: 3,
    minimumUnlockedScale: 3,
    maximumUnlockedScale: 4,
    spawnPosition: { x: -30, y: 0 },
    bounds: { min: { x: -96, y: -64 }, max: { x: 96, y: 64 } },
    geometry: [createShoalsTidewall()],
    creatures: [createShoalsWakeform()],
  },
};

/**
 * Create an isolated high-world region from its authored physical definition.
 * @param {'lantern-ward'|'belltops'|'crownback-reach'|'wakeform-shoals'} sceneId Authored region identifier.
 * @returns {ThreefoldHighWorldScene} Fresh scene geometry and population state.
 */
export function createThreefoldHighWorldScene(sceneId) {
  const definition = SCENE_DEFINITIONS[sceneId];
  const bounds = definition.bounds || SCENE_BOUNDS;
  return {
    id: sceneId,
    displayName: definition.displayName,
    bounds: copyThreefoldBounds(bounds),
    spawn: createScaleState(definition.spawnPosition || { x: 0, y: 0 }, {
      scale: definition.scale,
      anchor: 8,
      maximumAnchor: 8,
      minimumUnlockedScale: definition.minimumUnlockedScale,
      maximumUnlockedScale: definition.maximumUnlockedScale,
    }),
    baseBodyWidthMeters: 0.4,
    areas: [{ id: sceneId, bounds: copyThreefoldBounds(bounds) }],
    geometry: definition.geometry.map(copyStructure),
    decorations: [],
    interactables: /** @type {ThreefoldHighWorldScene['interactables']} */ ([]),
    creatures: definition.creatures.map(copyResident),
  };
}

/**
 * Check whether a saved scene identifier belongs to an authored high-world region.
 * @param {string} sceneId Candidate scene identifier.
 * @returns {sceneId is 'lantern-ward'|'belltops'|'crownback-reach'|'wakeform-shoals'} Whether the scene can be reconstructed here.
 */
export function isThreefoldHighWorldSceneId(sceneId) {
  return Object.hasOwn(SCENE_DEFINITIONS, sceneId);
}

/**
 * Copy a structure with independent physical bounds.
 * @param {ThreefoldHighWorldStructure} structure Authored geometry.
 * @returns {ThreefoldHighWorldStructure} Independent structure value.
 */
function copyStructure(structure) {
  return { ...structure, bounds: copyThreefoldBounds(structure.bounds) };
}

/**
 * Copy a resident with independent position and volume values.
 * @param {ThreefoldHighWorldResident} resident Authored resident.
 * @returns {ThreefoldHighWorldResident} Independent resident value.
 */
function copyResident(resident) {
  return {
    ...resident,
    position: { ...resident.position },
    bounds: copyThreefoldBounds(resident.bounds),
  };
}

/**
 * Build one authored structure with its physical bounds.
 * @param {string} id Stable structure identity.
 * @param {string} displayName Visible map label.
 * @param {ThreefoldHighWorldVolumeBounds} bounds Physical footprint.
 * @returns {ThreefoldHighWorldStructure} Authored structure.
 */
function createHighWorldStructure(id, displayName, bounds) {
  return { id, displayName, bounds };
}

/**
 * Build one authored resident with its growth footprint.
 * @param {string} id Stable resident identity.
 * @param {string} displayName Visible character label.
 * @param {{x: number, y: number}} position Position in metres.
 * @param {ThreefoldHighWorldVolumeBounds} bounds Growth footprint.
 * @returns {ThreefoldHighWorldResident} Authored resident.
 */
function createHighWorldResident(id, displayName, position, bounds) {
  return { id, displayName, growthRule: 'overlap', position, bounds };
}

/**
 * Build the outer wall whose breach redirects the shoals current.
 * @returns {ThreefoldHighWorldStructure} Shoals defense geometry.
 */
function createShoalsTidewall() {
  return createHighWorldStructure(
    'shoals-outer-tidewall',
    'OUTER TIDE WALL',
    createVolumeBounds({ x: -22, y: 8, z: 0 }, { x: -12, y: 16, z: 96 })
  );
}

/**
 * Build the 132-metre leviathan contesting the seaward diversion.
 * @returns {ThreefoldHighWorldResident} Authored Wakeform.
 */
function createShoalsWakeform() {
  return createHighWorldResident(
    'shoals-wakeform',
    'WAKEFORM',
    { x: 0, y: 0 },
    createVolumeBounds({ x: -12, y: -9, z: 0 }, { x: 12, y: 9, z: 132 })
  );
}

/**
 * Create validated Crownback volume bounds without duplicating scene setup.
 * @param {{x: number, y: number, z: number}} min Lower physical bounds.
 * @param {{x: number, y: number, z: number}} max Upper physical bounds.
 * @returns {ThreefoldHighWorldVolumeBounds} Authored volume.
 */
function createCrownbackVolume(min, max) {
  return createVolumeBounds(min, max);
}

/**
 * Build one Crownback structure from physical coordinates.
 * @param {string} id Stable structure identity.
 * @param {string} displayName Visible map label.
 * @param {ThreefoldHighWorldVolumeBounds} bounds Authored physical bounds.
 * @returns {ThreefoldHighWorldStructure} Authored structure.
 */
function createCrownbackStructure(id, displayName, bounds) {
  return createHighWorldStructure(id, displayName, bounds);
}

/**
 * Build one Crownback resident from physical coordinates.
 * @param {string} id Stable resident identity.
 * @param {string} displayName Visible character label.
 * @param {{x: number, y: number}} position Position in metres.
 * @param {ThreefoldHighWorldVolumeBounds} bounds Authored physical bounds.
 * @returns {ThreefoldHighWorldResident} Authored resident.
 */
function createCrownbackResident(id, displayName, position, bounds) {
  return createHighWorldResident(id, displayName, position, bounds);
}

/**
 * Define a rectangular physical volume from its lower and upper coordinates.
 * @param {{x: number, y: number, z: number}} min Lower bounds in metres.
 * @param {{x: number, y: number, z: number}} max Upper bounds in metres.
 * @returns {ThreefoldHighWorldVolumeBounds} Authored physical volume.
 */
function createVolumeBounds(min, max) {
  return { min, max };
}
