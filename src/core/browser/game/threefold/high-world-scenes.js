import { createScaleState } from './spatial.js';

const SCENE_BOUNDS = { min: { x: -24, y: -18 }, max: { x: 24, y: 18 } };

/** @typedef {{min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}} ThreefoldHighWorldVolumeBounds */
/** @typedef {{id: string, displayName: string, bounds: ThreefoldHighWorldVolumeBounds}} ThreefoldHighWorldStructure */
/** @typedef {{id: string, displayName: string, growthRule: 'overlap', position: {x: number, y: number}, bounds: ThreefoldHighWorldVolumeBounds}} ThreefoldHighWorldResident */
/** @typedef {{id: 'lantern-ward'|'belltops', displayName: string, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}, spawn: ReturnType<typeof createScaleState>, baseBodyWidthMeters: number, areas: Array<{id: string, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}}>, geometry: ThreefoldHighWorldStructure[], decorations: [], interactables: [], creatures: ThreefoldHighWorldResident[]}} ThreefoldHighWorldScene */
/** @typedef {{displayName: string, scale: number, minimumUnlockedScale: number, maximumUnlockedScale: number, geometry: ThreefoldHighWorldStructure[], creatures: ThreefoldHighWorldResident[]}} ThreefoldHighWorldSceneDefinition */

/** @type {Record<'lantern-ward'|'belltops', ThreefoldHighWorldSceneDefinition>} */
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
};

/**
 * Create an isolated high-world city region from its authored scene data.
 * @param {'lantern-ward'|'belltops'} sceneId Authored region identifier.
 * @returns {ThreefoldHighWorldScene} Fresh city geometry and population state.
 */
export function createThreefoldHighWorldScene(sceneId) {
  const definition = SCENE_DEFINITIONS[sceneId];
  return {
    id: sceneId,
    displayName: definition.displayName,
    bounds: copyBounds(SCENE_BOUNDS),
    spawn: createScaleState(
      { x: 0, y: 0 },
      {
        scale: definition.scale,
        anchor: 8,
        maximumAnchor: 8,
        minimumUnlockedScale: definition.minimumUnlockedScale,
        maximumUnlockedScale: definition.maximumUnlockedScale,
      }
    ),
    baseBodyWidthMeters: 0.4,
    areas: [{ id: sceneId, bounds: copyBounds(SCENE_BOUNDS) }],
    geometry: definition.geometry.map(copyStructure),
    decorations: [],
    interactables: [],
    creatures: definition.creatures.map(copyResident),
  };
}

/**
 * Check whether a saved scene identifier belongs to an authored high-world region.
 * @param {string} sceneId Candidate scene identifier.
 * @returns {sceneId is 'lantern-ward'|'belltops'} Whether the scene can be reconstructed here.
 */
export function isThreefoldHighWorldSceneId(sceneId) {
  return Object.hasOwn(SCENE_DEFINITIONS, sceneId);
}

/**
 * Copy planar or volumetric bounds so callers cannot mutate authored constants.
 * @template {{[axis: string]: number}} TAxis
 * @param {{min: TAxis, max: TAxis}} bounds Authored limits.
 * @returns {{min: TAxis, max: TAxis}} Independent limits.
 */
function copyBounds(bounds) {
  return { min: { ...bounds.min }, max: { ...bounds.max } };
}

/**
 * Copy a structure with independent physical bounds.
 * @param {ThreefoldHighWorldStructure} structure Authored geometry.
 * @returns {ThreefoldHighWorldStructure} Independent structure value.
 */
function copyStructure(structure) {
  return { ...structure, bounds: copyBounds(structure.bounds) };
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
    bounds: copyBounds(resident.bounds),
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
 * Define a rectangular physical volume from its lower and upper coordinates.
 * @param {{x: number, y: number, z: number}} min Lower bounds in metres.
 * @param {{x: number, y: number, z: number}} max Upper bounds in metres.
 * @returns {ThreefoldHighWorldVolumeBounds} Authored physical volume.
 */
function createVolumeBounds(min, max) {
  return { min, max };
}
