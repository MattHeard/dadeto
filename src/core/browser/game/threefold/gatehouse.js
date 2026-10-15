import { createScaleState } from './spatial.js';

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
    bounds: {
      min: { x: 4.1, y: 3.1, z: 0 },
      max: { x: 4.5, y: 4.9, z: 2 },
    },
  },
  {
    id: 'gate-counterweight',
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
];

/**
 * Create the contiguous canonical scene for THREEFOLD's first gatehouse.
 * Coordinates and geometry bounds use physical metres at every scale.
 * @returns {{id: string, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}, spawn: ReturnType<typeof createScaleState>, baseBodyWidthMeters: number, areas: Array<{id: string, bounds: {min: {x: number, y: number}, max: {x: number, y: number}}}>, geometry: Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>}} Authored Broken Gate scene data.
 */
export function createBrokenGateScene() {
  return {
    id: 'broken-gate',
    bounds: { min: { x: 0, y: 0 }, max: { x: 12, y: 9 } },
    spawn: createScaleState(
      { x: 3, y: 4 },
      {
        scale: 0,
        anchor: 8,
        maximumAnchor: 8,
        minimumUnlockedScale: -2,
        maximumUnlockedScale: 1,
      }
    ),
    baseBodyWidthMeters: 0.4,
    areas: GATEHOUSE_AREAS.map(copyArea),
    geometry: GATEHOUSE_GEOMETRY.map(copyGeometry),
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

/**
 * @param {typeof GATEHOUSE_GEOMETRY[number]} object Authored geometry object.
 * @returns {typeof GATEHOUSE_GEOMETRY[number]} Independent geometry value.
 */
function copyGeometry(object) {
  return {
    id: object.id,
    bounds: { min: { ...object.bounds.min }, max: { ...object.bounds.max } },
  };
}
