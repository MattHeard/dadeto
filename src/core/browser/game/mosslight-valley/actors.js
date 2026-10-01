// @ts-nocheck -- actor contracts are supplied by episode content.
/**
 * Find an active NPC at a map coordinate.
 * @param {unknown} world - The world argument.
 * @param {unknown} x - The x argument.
 * @param {unknown} y - The y argument.
 * @returns {unknown} The computed result.
 */
export function actorAt(world, x, y) {
  return (
    world.npcs.find(
      actor => actor.map === world.mapId && actor.x === x && actor.y === y
    ) ?? null
  );
}
/**
 * Find the character or object the player faces.
 * @param {unknown} state - The state argument.
 * @returns {unknown} The computed result.
 */
export function targetInFront(state) {
  const { x, y, facing } = state.world.player;
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
    facing
  ] || [0, 0];
  return {
    actor: actorAt(state.world, x + d[0], y + d[1]),
    object:
      state.world.map.objects?.find(
        item => item.x === x + d[0] && item.y === y + d[1]
      ) || null,
  };
}
/**
 * Select scheduled NPC location from time of day and story flags.
 * @param {unknown} npcs - The npcs argument.
 * @param {unknown} world - The world argument.
 * @returns {unknown} The computed result.
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
 * @param {unknown} actor - The actor argument.
 * @param {unknown} tick - The tick argument.
 * @returns {unknown} The computed result.
 */
export function animateActor(actor, tick) {
  return { ...actor, frame: Math.floor(tick / 8) % 2 };
}
