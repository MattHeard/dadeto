import { createScaleState, heightAtScale } from './spatial.js';

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
 * Check whether a player can reach an authored interaction in the current scene.
 * @param {{player: {scale: number, position: {x: number, y: number}}, scene: {interactables: Array<{id: string, position: {x: number, y: number}}>} }} state Current scene state.
 * @param {string} id Target identifier.
 * @returns {boolean} Whether the target exists and is in physical reach.
 */
export function isThreefoldInteractableInReach(state, id) {
  const target = state.scene.interactables.find(item => item.id === id);
  if (!target) return false;
  const reachMeters = heightAtScale(state.player.scale) * 0.55;
  return (
    Math.hypot(
      state.player.position.x - target.position.x,
      state.player.position.y - target.position.y
    ) <= reachMeters
  );
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
