// @ts-nocheck -- runtime game state is intentionally data-driven.
/** Determine whether a grid coordinate is unavailable. */
/** @param {object} map Map data. @param {number} x X coordinate. @param {number} y Y coordinate. @returns {boolean} Whether blocked. */
/* eslint-disable jsdoc/require-jsdoc, jsdoc/require-param, jsdoc/require-returns -- compact game-state contracts are documented at module boundaries. */
export function isBlocked(map, x, y) {
  return (
    x < 0 ||
    y < 0 ||
    x >= map.width ||
    y >= map.height ||
    map.blocked.includes(`${x},${y}`)
  );
}
/** Move the player one grid cell when legal. */
/** @param {object} world World state. @param {string} direction Movement direction. @returns {object} Updated world. */
export function movePlayer(world, direction) {
  const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
    direction
  ];
  if (!delta) return world;
  const [dx, dy] = delta;
  const player = { ...world.player, facing: direction };
  if (!isBlocked(world.map, player.x + dx, player.y + dy)) {
    player.x += dx;
    player.y += dy;
  }
  return { ...world, player };
}
/** Create the world portion of the episode state. */
/** @param {object} content Episode content. @returns {object} World state. */
export function createWorld(content) {
  return {
    map: content.map,
    player: { ...content.player },
    npcs: content.npcs.map(npc => ({ ...npc })),
    time: 8,
    season: 'spring',
    location: 'village',
  };
}
/** Advance the world clock. */
/** @param {object} world World state. @param {number} minutes Elapsed minutes. @returns {object} Updated world. */
export function advanceTime(world, minutes = 10) {
  const time = (world.time + minutes / 60) % 24;
  return { ...world, time };
}
