// @ts-nocheck -- runtime game state is intentionally data-driven.
/* eslint-disable jsdoc/require-param, jsdoc/require-returns -- compact game-state contracts are documented at module boundaries. */
/** Find an NPC at a grid coordinate. */
/** @param {object} world World state. @param {number} x X coordinate. @param {number} y Y coordinate. @returns {object|null} Matching actor. */
export function actorAt(world, x, y) {
  return world.npcs.find(actor => actor.x === x && actor.y === y) || null;
}
/** Find the actor directly in front of the player. */
/** @param {object} world World state. @returns {object|null} Adjacent actor. */
export function adjacentActor(world) {
  const { x, y, facing } = world.player;
  const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
    facing
  ] || [0, 0];
  return actorAt(world, x + delta[0], y + delta[1]);
}
/** Produce a deterministic two-frame animation state. */
/** @param {object} actor Actor state. @param {number} tick Simulation tick. @returns {object} Animated actor. */
export function animateActor(actor, tick) {
  return { ...actor, frame: Math.floor(tick / 8) % 2 };
}
