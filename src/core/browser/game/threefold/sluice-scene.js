import {
  copyThreefoldGeometry,
  createThreefoldPlayerSpawn,
} from './scene-utils.js';

export const THREEFOLD_SLUICE_SCENE_ID = 'small-world-sluice';
export const THREEFOLD_TIDAL_ARCHIVE_TRACE_ID = 'sluice-archive-coil-trace';

const SCENE_BOUNDS = { min: { x: 0, y: 0 }, max: { x: 6, y: 4.5 } };
const VALVE_POSITION = { x: 2.6, y: 3.1 };
const ARCHIVE_TRACE_POSITION = { x: 5.55, y: 2.1 };
const VESSEL_DECORATIONS = [
  {
    id: 'sluice-upper-vessel',
    min: { x: 0.8, y: 1.3 },
    max: { x: 2.1, y: 3.4 },
  },
  {
    id: 'sluice-lower-vessel',
    min: { x: 3.3, y: 1.3 },
    max: { x: 4.6, y: 3.4 },
  },
  {
    id: 'sluice-transfer-pipe',
    min: { x: 2.0, y: 2.85 },
    max: { x: 3.4, y: 3.05 },
  },
];
const CROSSING_BARRIER = {
  id: 'sluice-crossing-barrier',
  bounds: {
    min: { x: 5.15, y: 0, z: 0 },
    max: { x: 5.3, y: 4.5, z: 1 },
  },
};

/**
 * Create the separate small-world scene that contains the hydraulic puzzle.
 * @returns {{id: 'small-world-sluice', bounds: {min: {x: number, y: number}, max: {x: number, y: number}}, spawn: ReturnType<typeof import('./spatial.js').createScaleState>, baseBodyWidthMeters: number, areas: Array<{id: string, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}}>, geometry: Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>, decorations: Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>, interactables: Array<{id: string, position: {x: number, y: number}, interactionScale?: number, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>, creatures: []}} Authored sluice chamber and reachable crossing.
 */
export function createThreefoldSluiceScene() {
  return {
    id: THREEFOLD_SLUICE_SCENE_ID,
    bounds: copyPlanarBounds(),
    spawn: createThreefoldPlayerSpawn({ x: 2.5, y: 3.1 }, -2),
    baseBodyWidthMeters: 0.4,
    areas: [
      {
        id: 'sluice-chamber',
        bounds: copyPlanarBounds(),
      },
    ],
    geometry: [copyThreefoldGeometry(CROSSING_BARRIER)],
    decorations: VESSEL_DECORATIONS.map(({ id, min, max }) => ({
      id,
      bounds: {
        min: { ...min, z: 0 },
        max: { ...max, z: 0.3 },
      },
    })),
    interactables: [
      {
        id: 'sluice-service-valve',
        interactionScale: -2,
        position: { ...VALVE_POSITION },
        bounds: {
          min: { x: 2.48, y: 2.97, z: 0 },
          max: { x: 2.72, y: 3.21, z: 0.25 },
        },
      },
      {
        id: THREEFOLD_TIDAL_ARCHIVE_TRACE_ID,
        position: { ...ARCHIVE_TRACE_POSITION },
        bounds: {
          min: { x: 5.49, y: 2.04, z: 0 },
          max: { x: 5.61, y: 2.16, z: 0.12 },
        },
      },
    ],
    creatures: [],
  };
}

/**
 * Copy the authored rectangular world bounds.
 * @returns {{min: {x: number, y: number}, max: {x: number, y: number}}} Independent scene bounds.
 */
function copyPlanarBounds() {
  return { min: { ...SCENE_BOUNDS.min }, max: { ...SCENE_BOUNDS.max } };
}
