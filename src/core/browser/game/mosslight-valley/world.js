/** @typedef {{x: number, y: number, requires?: string, map: string, to: [number, number]}} MapExit */
/** @typedef {{width: number, height: number, blocked: string[], exits: MapExit[], objects?: {x: number, y: number, id?: string, kind?: string}[]}} WorldMap */
/** @typedef {{x: number, y: number, facing: string}} WorldPlayer */
/** @typedef {{mapId: string, map: WorldMap, player: WorldPlayer, time: number, day: number, flags: Record<string, any>, npcs?: {id: string, map: string, x: number, y: number}[], [key: string]: any}} WorldState */
/** @typedef {Record<string, any> & {start: {map: string, x: number, y: number, facing: string}, maps: Record<string, WorldMap>, npcs: {id: string}[]}} WorldContent */
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
 * Whether a tile is outside, explicitly blocked, or occupied by a world object.
 * @param {WorldMap} map Map geometry and blocked tiles.
 * @param {number} x Horizontal tile coordinate.
 * @param {number} y Vertical tile coordinate.
 * @returns {boolean} Whether movement is blocked.
 */
export function isBlocked(map, x, y) {
  return (
    x < 0 ||
    y < 0 ||
    x >= map.width ||
    y >= map.height ||
    map.blocked.includes(`${x},${y}`) ||
    Boolean(map.objects?.some(object => object.x === x && object.y === y))
  );
}
/**
 * Resolve map exits, including their story gates.
 * @param {WorldMap} map Map exits.
 * @param {number} x Horizontal tile coordinate.
 * @param {number} y Vertical tile coordinate.
 * @param {Record<string, any>} flags Current story flags.
 * @returns {MapExit | null} Eligible exit at the coordinate.
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
 * @param {WorldState} world Current world state.
 * @param {string} direction Movement direction.
 * @param {Record<string, any>} content Authored world maps and NPCs.
 * @returns {WorldState} Updated world state.
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
 * @param {WorldContent} content Authored world data.
 * @returns {WorldState} Starting world state.
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
 * @param {WorldState} world Current world state.
 * @param {number} minutes Minutes to advance.
 * @returns {WorldState} World state with its clock advanced.
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
 * @param {WorldState} world Current world state.
 * @param {number} viewWidth Viewport width in tiles.
 * @param {number} viewHeight Viewport height in tiles.
 * @returns {{x: number, y: number}} Camera origin in tile coordinates.
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
