import { findWorldEntry } from './world.js';
/** @typedef {{ id: string, map: string, x: number, y: number, schedule?: Record<string, [string, number, number]>, scheduleAfter?: Record<string, Record<string, [string, number, number]>> }} Actor */
/** @typedef {{ width: number, height: number, objects?: {id?: string, kind?: string, creature?: string, x: number, y: number}[] }} ActorMap */
/** @typedef {{x: number, y: number, facing: string}} ActorPlayer */
/** @typedef {{ mapId: string, map: ActorMap, player: ActorPlayer, time: number, flags: Record<string, boolean>, npcs?: Actor[] }} ActorWorld */
/**
 * Find an active NPC at a map coordinate.
 * @param {ActorWorld} world World state.
 * @param {number} x Map coordinate.
 * @param {number} y Map coordinate.
 * @returns {Actor | null} Actor at the coordinate, if any.
 */
export function actorAt(world, x, y) {
  return findWorldEntry(
    world.npcs || [],
    actor => actor.map === world.mapId && actor.x === x && actor.y === y
  );
}
/**
 * Find the character or object the player faces.
 * @param {Record<string, any>} state Game state containing world data.
 * @returns {{actor: Actor | null, object: {id?: string, kind?: string, creature?: string, x: number, y: number} | null}} Facing candidates.
 */
export function targetInFront(state) {
  const world = /** @type {ActorWorld} */ (state.world);
  const { x, y, facing } = world.player;
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
    facing
  ] || [0, 0];
  return {
    actor: actorAt(world, x + d[0], y + d[1]),
    object:
      world.map.objects?.find(
        item => item.x === x + d[0] && item.y === y + d[1]
      ) || null,
  };
}
/**
 * Select scheduled NPC location from time of day and story flags.
 * @param {Actor[]} npcs Episode characters.
 * @param {ActorWorld} world Current world state.
 * @returns {Actor[]} Characters with scheduled locations applied.
 */
export function scheduleActors(npcs, world) {
  const period =
    world.time < 11 ? 'morning' : world.time < 17 ? 'afternoon' : 'evening';
  return npcs.map(actor => {
    const changedSchedule = Object.entries(actor.scheduleAfter || {}).find(
      ([flag]) => world.flags[flag]
    )?.[1];
    const place = changedSchedule?.[period] || actor.schedule?.[period];
    return place
      ? { ...actor, map: place[0], x: place[1], y: place[2] }
      : actor;
  });
}
/**
 * Produce a deterministic sprite animation frame.
 * @param {Actor} actor Character to animate.
 * @param {number} tick Animation tick.
 * @returns {Actor & {frame: number}} Character with its animation frame.
 */
export function animateActor(actor, tick) {
  return { ...actor, frame: Math.floor(tick / 8) % 2 };
}
