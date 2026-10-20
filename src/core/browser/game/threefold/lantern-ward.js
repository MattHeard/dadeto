import { createScaleState } from './spatial.js';

export const THREEFOLD_LANTERN_WARD_SCENE_ID = 'lantern-ward';

const SCENE_BOUNDS = { min: { x: -24, y: -18 }, max: { x: 24, y: 18 } };

/** @typedef {{id: string, displayName: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}} ThreefoldLanternWardStructure */
/** @typedef {{id: string, displayName: string, growthRule: 'overlap', position: {x: number, y: number}, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}} ThreefoldLanternWardResident */
/** @typedef {{id: 'lantern-ward', bounds: {min: {x: number, y: number}, max: {x: number, y: number}}, spawn: ReturnType<typeof createScaleState>, baseBodyWidthMeters: number, areas: Array<{id: string, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}}>, geometry: ThreefoldLanternWardStructure[], decorations: [], interactables: [], creatures: ThreefoldLanternWardResident[]}} ThreefoldLanternWardScene */

/**
 * Create a playable city-scale district with authored buildings and residents.
 * @returns {ThreefoldLanternWardScene} Independent Lantern Ward scene.
 */
export function createThreefoldLanternWardScene() {
  const bounds = copyBounds();
  return {
    id: THREEFOLD_LANTERN_WARD_SCENE_ID,
    bounds,
    spawn: createScaleState(
      { x: 0, y: 0 },
      {
        scale: 3,
        anchor: 8,
        maximumAnchor: 8,
        minimumUnlockedScale: 2,
        maximumUnlockedScale: 4,
      }
    ),
    baseBodyWidthMeters: 0.4,
    areas: [{ id: 'lantern-ward', bounds: copyBounds() }],
    geometry: [
      {
        id: 'lantern-ward-canal-homes',
        displayName: 'HOMES',
        bounds: {
          min: { x: 5.8, y: -3.2, z: 0 },
          max: { x: 11.8, y: 3.2, z: 18 },
        },
      },
      {
        id: 'lantern-ward-glassworks',
        displayName: 'GLASSWORKS',
        bounds: {
          min: { x: -11.8, y: -3.2, z: 0 },
          max: { x: -5.8, y: 3.2, z: 22 },
        },
      },
    ],
    decorations: [],
    interactables: [],
    creatures: [
      {
        id: 'lantern-ward-mira',
        displayName: 'MIRA',
        growthRule: 'overlap',
        position: { x: 13, y: 1 },
        bounds: {
          min: { x: 12.7, y: 0.7, z: 0 },
          max: { x: 13.3, y: 1.3, z: 1.7 },
        },
      },
      {
        id: 'lantern-ward-tov',
        displayName: 'TOV',
        growthRule: 'overlap',
        position: { x: -13, y: -1 },
        bounds: {
          min: { x: -13.3, y: -1.3, z: 0 },
          max: { x: -12.7, y: -0.7, z: 1.7 },
        },
      },
    ],
  };
}

/**
 * Copy canonical planar bounds for each scene value.
 * @returns {{min: {x: number, y: number}, max: {x: number, y: number}}} Independent district bounds.
 */
function copyBounds() {
  return { min: { ...SCENE_BOUNDS.min }, max: { ...SCENE_BOUNDS.max } };
}
