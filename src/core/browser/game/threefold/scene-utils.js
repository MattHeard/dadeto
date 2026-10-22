import { createScaleState, heightAtScale } from './spatial.js';

/**
 * Create the shared scale bounds used by THREEFOLD's authored region spawns.
 * @param {{x: number, y: number}} position Initial physical position.
 * @param {number} scale Initial discrete scale.
 * @param {number} [minimumUnlockedScale] Lowest available scale; defaults to −2.
 * @returns {ReturnType<typeof createScaleState>} Independent player spawn.
 */
export function createThreefoldPlayerSpawn(
  position,
  scale,
  minimumUnlockedScale = -2
) {
  return createScaleState(position, {
    scale,
    anchor: 8,
    maximumAnchor: 8,
    minimumUnlockedScale,
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
 * @param {{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}, overlapGroupId?: string}} geometry Authored scene geometry.
 * @returns {{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}, overlapGroupId?: string}} Independent geometry value.
 */
export function copyThreefoldGeometry(geometry) {
  return {
    id: geometry.id,
    ...(geometry.overlapGroupId === undefined
      ? {}
      : { overlapGroupId: geometry.overlapGroupId }),
    bounds: copyThreefoldBounds(geometry.bounds),
  };
}

/**
 * Copy planar or volumetric bounds without sharing mutable coordinates.
 * @template {{[axis: string]: number}} Axis
 * @param {{min: Axis, max: Axis}} bounds Authored limits.
 * @returns {{min: Axis, max: Axis}} Independent bounds.
 */
export function copyThreefoldBounds(bounds) {
  return { min: { ...bounds.min }, max: { ...bounds.max } };
}

/**
 * Copy a creature while retaining its authored extension fields.
 * @template {{position: {x: number, y: number}, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}} Creature
 * @param {Creature} creature Authored creature data.
 * @returns {Creature} Independent creature value.
 */
export function copyThreefoldCreature(creature) {
  return {
    ...creature,
    position: { ...creature.position },
    bounds: copyThreefoldBounds(creature.bounds),
  };
}

/**
 * Copy a list of authored structures into an independent scene.
 * @param {Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>} geometries Authored structures.
 * @returns {Array<{id: string, bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}>} Independent geometry values.
 */
export function copyThreefoldGeometryList(geometries) {
  return geometries.map(copyThreefoldGeometry);
}
