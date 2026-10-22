import {
  copyThreefoldCreature,
  copyThreefoldGeometry,
  createThreefoldPlayerSpawn,
} from './scene-utils.js';

const GATEHOUSE_AREAS = [
  {
    id: 'gatehouse',
    bounds: { min: { x: 2, y: 2 }, max: { x: 6, y: 7 } },
  },
  {
    id: 'ferry-landing',
    bounds: { min: { x: 6, y: 2 }, max: { x: 10, y: 5 } },
  },
  {
    id: 'drainage-settlement',
    bounds: { min: { x: 6, y: 5 }, max: { x: 12, y: 9 } },
  },
  {
    id: 'maintenance-passage',
    bounds: { min: { x: 2.5, y: 3.5 }, max: { x: 5.5, y: 4.5 } },
  },
];

const GATEHOUSE_GEOMETRY = [
  {
    id: 'gatehouse-west-wall',
    bounds: {
      min: { x: 3.45, y: 3.4, z: 0 },
      max: { x: 3.8, y: 4.6, z: 3 },
    },
  },
  {
    id: 'relief-gate',
    overlapGroupId: 'relief-gate-mechanism',
    bounds: {
      min: { x: 4.7, y: 3.1, z: 0 },
      max: { x: 5.1, y: 4.9, z: 2 },
    },
  },
  {
    id: 'gate-counterweight',
    overlapGroupId: 'relief-gate-mechanism',
    bounds: {
      min: { x: 5.2, y: 4.8, z: 1 },
      max: { x: 5.8, y: 5.5, z: 3 },
    },
  },
  {
    id: 'landing-piling',
    bounds: {
      min: { x: 7, y: 2.5, z: 0 },
      max: { x: 7.3, y: 2.8, z: 4 },
    },
  },
  {
    id: 'drainage-weir',
    bounds: {
      min: { x: 8, y: 5.5, z: 0 },
      max: { x: 9.5, y: 5.9, z: 1.5 },
    },
  },
  {
    id: 'signal-station',
    overlapGroupId: 'signal-station-assembly',
    bounds: {
      min: { x: 8.7, y: 2.8, z: 0 },
      max: { x: 9.1, y: 3.2, z: 6 },
    },
  },
];

const GATEHOUSE_RAT = {
  id: 'gatehouse-rat',
  position: { x: 3.28, y: 4 },
  bounds: {
    min: { x: 3.18, y: 3.9, z: 0 },
    max: { x: 3.38, y: 4.1, z: 0.2032 },
  },
  interactionRadiusMeters: 0.12,
};

const GATEHOUSE_INTERACTABLES = [
  {
    id: 'ferry-mooring-line',
    position: { x: 6.75, y: 3.5 },
    bounds: {
      min: { x: 6.62, y: 3.42, z: 0 },
      max: { x: 6.88, y: 3.58, z: 0.4 },
    },
  },
  {
    id: 'latchfolk-watchkeeper',
    position: { x: 7.25, y: 7.25 },
    bounds: {
      min: { x: 7.08, y: 7.02, z: 0 },
      max: { x: 7.42, y: 7.48, z: 0.55 },
    },
  },
  {
    id: 'upland-road-exit',
    position: { x: 0.5, y: 2 },
    bounds: {
      min: { x: 0.25, y: 1.75, z: 0 },
      max: { x: 0.75, y: 2.25, z: 0.2 },
    },
  },
  {
    id: 'relief-gate-locking-pawl',
    overlapGroupId: 'relief-gate-mechanism',
    position: { x: 4.6, y: 3 },
    bounds: {
      min: { x: 4.55, y: 2.95, z: 0 },
      max: { x: 4.65, y: 3.05, z: 0.15 },
    },
  },
  {
    id: 'signal-station-console',
    overlapGroupId: 'signal-station-assembly',
    position: { x: 8.35, y: 3 },
    bounds: {
      min: { x: 8.25, y: 2.9, z: 0 },
      max: { x: 8.45, y: 3.1, z: 0.6 },
    },
  },
];

/**
 * Create the contiguous canonical scene for THREEFOLD's first gatehouse.
 * Coordinates and geometry bounds use physical metres at every scale.
 * @returns {{id: 'broken-gate', bounds: {min: {x: number, y: number}, max: {x: number, y: number}}, spawn: ReturnType<typeof import('./spatial.js').createScaleState>, baseBodyWidthMeters: number, areas: Array<{id: string, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}}>, geometry: Array<{id: string, overlapGroupId?: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>, interactables: Array<{id: string, position: {x: number, y: number}, overlapGroupId?: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>, creatures: Array<typeof GATEHOUSE_RAT>}} Authored Broken Gate scene data.
 */
export function createBrokenGateScene() {
  return {
    id: 'broken-gate',
    bounds: { min: { x: 0, y: 0 }, max: { x: 12, y: 9 } },
    spawn: createThreefoldPlayerSpawn({ x: 3, y: 4 }, 0),
    baseBodyWidthMeters: 0.4,
    areas: GATEHOUSE_AREAS.map(copyArea),
    geometry: GATEHOUSE_GEOMETRY.map(copyThreefoldGeometry),
    interactables: GATEHOUSE_INTERACTABLES.map(copyInteractable),
    creatures: [copyThreefoldCreature(GATEHOUSE_RAT)],
  };
}

/**
 * @param {typeof GATEHOUSE_INTERACTABLES[number]} item Authored interaction point.
 * @returns {typeof GATEHOUSE_INTERACTABLES[number]} Independent interaction point.
 */
function copyInteractable(item) {
  return {
    id: item.id,
    ...(item.overlapGroupId === undefined
      ? {}
      : { overlapGroupId: item.overlapGroupId }),
    position: { ...item.position },
    bounds: { min: { ...item.bounds.min }, max: { ...item.bounds.max } },
  };
}

/**
 * @param {typeof GATEHOUSE_AREAS[number]} area Authored scene area.
 * @returns {typeof GATEHOUSE_AREAS[number]} Independent area value.
 */
function copyArea(area) {
  return {
    id: area.id,
    bounds: { min: { ...area.bounds.min }, max: { ...area.bounds.max } },
  };
}
