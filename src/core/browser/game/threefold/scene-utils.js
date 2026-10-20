import { createScaleState } from './spatial.js';

/**
 * Create the shared scale bounds used by THREEFOLD's authored region spawns.
 * @param {{x: number, y: number}} position Initial physical position.
 * @param {number} scale Initial discrete scale.
 * @returns {ReturnType<typeof createScaleState>} Independent player spawn.
 */
export function createThreefoldPlayerSpawn(position, scale) {
  return createScaleState(position, {
    scale,
    anchor: 8,
    maximumAnchor: 8,
    minimumUnlockedScale: -2,
    maximumUnlockedScale: 1,
  });
}

/**
 * Copy authored physical geometry without sharing mutable coordinate records.
 * @param {{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}} geometry Authored scene geometry.
 * @returns {{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}} Independent geometry value.
 */
export function copyThreefoldGeometry(geometry) {
  return {
    id: geometry.id,
    bounds: {
      min: { ...geometry.bounds.min },
      max: { ...geometry.bounds.max },
    },
  };
}
