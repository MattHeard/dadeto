// @ts-nocheck -- world data is content-authored and covered by runtime tests.
/**
 * Find the first eligible world entry, with null representing absence.
 * @template T
 * @param {T[]} entries Ordered entries.
 * @param {(entry: T, index: number, entries: T[]) => unknown} eligible Entry eligibility policy.
 * @returns {T | null} Original matching entry or null.
 */
export function findWorldEntry(entries, eligible) {
  return entries.find(eligible) ?? null;
}
/**
 * Whether a tile is outside the map or explicitly blocked.
 * @param {unknown} map - The map argument.
 * @param {unknown} x - The x argument.
 * @param {unknown} y - The y argument.
 * @returns {unknown} The computed result.
 */
export function isBlocked(map, x, y) {
  return (
    x < 0 ||
    y < 0 ||
    x >= map.width ||
    y >= map.height ||
    map.blocked.includes(`${x},${y}`)
  );
}
/**
 * Resolve map exits, including their story gates.
 * @param {unknown} map - The map argument.
 * @param {unknown} x - The x argument.
 * @param {unknown} y - The y argument.
 * @param {unknown} flags - The flags argument.
 * @returns {unknown} The computed result.
 */
export function findExit(map, x, y, flags) {
  return findWorldEntry(
    map.exits,
    exit =>
      exit.x === x && exit.y === y && (!exit.requires || flags[exit.requires])
  );
}
/**
 * Move in one grid direction and transition maps when crossing an exit.
 * @param {unknown} world - The world argument.
 * @param {unknown} direction - The direction argument.
 * @param {unknown} content - The content argument.
 * @returns {unknown} The computed result.
 */
export function movePlayer(world, direction, content) {
  const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[
    direction
  ];
  if (!delta) return world;
  const player = { ...world.player, facing: direction };
  const x = player.x + delta[0];
  const y = player.y + delta[1];
  const outside =
    x < 0 || y < 0 || x >= world.map.width || y >= world.map.height;
  const exit =
    findExit(world.map, x, y, world.flags) ||
    (outside ? findExit(world.map, player.x, player.y, world.flags) : null);
  if (exit)
    return {
      ...world,
      map: content.maps[exit.map],
      mapId: exit.map,
      location: exit.map,
      player: { ...player, x: exit.to[0], y: exit.to[1] },
      transition: 8,
    };
  if (isBlocked(world.map, x, y)) return { ...world, player };
  if (
    world.npcs?.some(
      actor => actor.map === world.mapId && actor.x === x && actor.y === y
    )
  )
    return { ...world, player };
  return { ...world, player: { ...player, x, y }, transition: 0 };
}
/**
 * Create initial world and story clock.
 * @param {unknown} content - The content argument.
 * @returns {unknown} The computed result.
 */
export function createWorld(content) {
  return {
    mapId: content.start.map,
    map: content.maps[content.start.map],
    location: content.start.map,
    player: { ...content.start },
    time: 8,
    day: 1,
    season: 'spring',
    weather: 'mist',
    flags: {},
    relationships: Object.fromEntries(content.npcs.map(npc => [npc.id, 0])),
    transition: 0,
  };
}
/**
 * Advance time, day, weather and season using a stable episode calendar.
 * @param {unknown} world - The world argument.
 * @param {unknown} minutes - The minutes argument.
 * @returns {unknown} The computed result.
 */
export function advanceClock(world, minutes = 10) {
  const total = world.time + minutes / 60;
  const day = world.day + Math.floor(total / 24);
  const season = ['spring', 'summer', 'autumn', 'winter'][
    Math.floor((day - 1) / 8) % 4
  ];
  const weatherCycle = ['mist', 'sun', 'breeze', 'rain', 'dream'];
  return {
    ...world,
    time: total % 24,
    day,
    season,
    weather: weatherCycle[(day + Math.floor(total)) % weatherCycle.length],
  };
}
/**
 * Tile-space camera that keeps a fixed handheld viewport centered on the player.
 * @param {unknown} world - The world argument.
 * @param {unknown} viewWidth - The viewWidth argument.
 * @param {unknown} viewHeight - The viewHeight argument.
 * @returns {unknown} The computed result.
 */
export function cameraFor(world, viewWidth = 13, viewHeight = 10) {
  return {
    x: Math.max(
      0,
      Math.min(
        world.map.width - viewWidth,
        world.player.x - Math.floor(viewWidth / 2)
      )
    ),
    y: Math.max(
      0,
      Math.min(
        world.map.height - viewHeight,
        world.player.y - Math.floor(viewHeight / 2)
      )
    ),
  };
}
