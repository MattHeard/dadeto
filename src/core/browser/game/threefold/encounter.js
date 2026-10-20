import { heightAtScale } from './spatial.js';

/** @typedef {'present'|'repelled'|'bypassed'|'killed'} RatFate */
/** @typedef {null|'fight'|'bypass'|'growth'} RatAction */
/** @typedef {{creatureId: string, cause: 'growth'}} ThreefoldGrowthDeath */
/** @typedef {{ratFate: RatFate, ratAction: RatAction, growthDeaths?: ThreefoldGrowthDeath[]}} ThreefoldEncounter */

/** @type {Set<string>} */
const RAT_FATES = new Set(['present', 'repelled', 'bypassed', 'killed']);
/** @type {Set<string>} */
const RAT_ACTIONS = new Set(['fight', 'bypass', 'growth']);

/**
 * Create the authored Broken Gate wildlife encounter state.
 * @returns {ThreefoldEncounter} Initial rat state.
 */
export function createThreefoldEncounter() {
  return { ratFate: 'present', ratAction: null };
}

/**
 * Check whether the rat can be engaged at Mara's current physical scale.
 * The encounter becomes actionable at the rat's scale or one rung larger.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} simulation Current run.
 * @returns {boolean} Whether fight and bypass controls are in reach.
 */
export function isGatehouseRatInReach(simulation) {
  const context = getPresentGatehouseRatContext(simulation);
  if (!context || context.player.scale > -1) return false;
  const { rat, player } = context;

  const dx = player.position.x - rat.position.x;
  const dy = player.position.y - rat.position.y;
  const reachMeters =
    rat.interactionRadiusMeters +
    (simulation.scene.baseBodyWidthMeters * 3 ** player.scale) / 2;
  return dx * dx + dy * dy <= reachMeters * reachMeters;
}

/**
 * Check whether Mara currently fits wholly inside the authored rat bounds.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} simulation Current run.
 * @returns {boolean} Whether the next growth can be an intentional inside action.
 */
export function isInsideGatehouseRat(simulation) {
  const context = getPresentGatehouseRatContext(simulation);
  if (!context) return false;
  return isPlayerInsideCreature(simulation, context.rat);
}

/**
 * Check whether Mara fits wholly inside one authored creature's bounds.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} simulation Current run.
 * @param {{bounds: {min: {x: number, y: number, z: number}, max: {x: number, y: number, z: number}}}} creature Authored creature volume.
 * @returns {boolean} Whether the current player body fits inside the creature.
 */
export function isPlayerInsideCreature(simulation, creature) {
  const { player } = simulation;
  const halfWidth =
    (simulation.scene.baseBodyWidthMeters * 3 ** player.scale) / 2;
  const tolerance = 1e-9;
  return (
    player.position.x - halfWidth >= creature.bounds.min.x - tolerance &&
    player.position.x + halfWidth <= creature.bounds.max.x + tolerance &&
    player.position.y - halfWidth >= creature.bounds.min.y - tolerance &&
    player.position.y + halfWidth <= creature.bounds.max.y + tolerance &&
    heightAtScale(player.scale) <=
      creature.bounds.max.z - creature.bounds.min.z + tolerance
  );
}

/**
 * Apply the player's authored choice for the one Broken Gate rat encounter.
 * @param {ThreefoldEncounter} encounter Current encounter state.
 * @param {'fight'|'bypass'|'growth'} choice Chosen encounter action.
 * @param {number} scale Mara's scale when choosing.
 * @returns {ThreefoldEncounter} Updated encounter.
 */
export function resolveGatehouseRat(encounter, choice, scale) {
  if (encounter.ratFate !== 'present') return encounter;
  if (choice === 'bypass')
    return { ...encounter, ratFate: 'bypassed', ratAction: 'bypass' };
  if (choice === 'growth')
    return { ...encounter, ratFate: 'killed', ratAction: 'growth' };
  if (choice === 'fight')
    return {
      ...encounter,
      ratFate: scale === -2 ? 'repelled' : 'killed',
      ratAction: 'fight',
    };
  return encounter;
}

/**
 * Record stable, cause-tagged growth deaths without duplicating prior outcomes.
 * @param {ThreefoldEncounter} encounter Current encounter state.
 * @param {string[]} creatureIds Creatures affected by this growth action.
 * @returns {ThreefoldEncounter} Canonical encounter with every growth death recorded.
 */
export function recordThreefoldGrowthDeaths(encounter, creatureIds) {
  const deathsById = new Map(
    (encounter.growthDeaths ?? []).map(death => [death.creatureId, death])
  );
  creatureIds.forEach(creatureId =>
    deathsById.set(creatureId, { creatureId, cause: 'growth' })
  );
  return normalizeThreefoldEncounter({
    ...encounter,
    growthDeaths: Array.from(deathsById.values()),
  });
}

/**
 * Rebuild encounter state while rejecting unknown fates.
 * @param {unknown} candidate Candidate save value; undefined is the legacy default.
 * @returns {ThreefoldEncounter} Canonical encounter state.
 */
export function normalizeThreefoldEncounter(candidate) {
  if (candidate === undefined) return createThreefoldEncounter();
  if (!candidate || typeof candidate !== 'object')
    throw new RangeError('THREEFOLD encounter state is inconsistent.');
  const state =
    /** @type {{ratFate?: unknown, ratAction?: unknown, growthDeaths?: unknown}} */ (
      candidate
    );
  if (!isRatFate(state.ratFate) || !isRatAction(state.ratAction))
    throw new RangeError('THREEFOLD encounter state is inconsistent.');
  if (state.ratFate === 'killed') {
    if (state.ratAction !== 'fight' && state.ratAction !== 'growth')
      throw new RangeError('THREEFOLD encounter state is inconsistent.');
  } else {
    const expectedAction = {
      present: null,
      repelled: 'fight',
      bypassed: 'bypass',
    }[state.ratFate];
    if (state.ratAction !== expectedAction)
      throw new RangeError('THREEFOLD encounter state is inconsistent.');
  }
  const normalized = {
    ratFate: state.ratFate,
    ratAction: state.ratAction,
  };
  const growthDeaths = normalizeGrowthDeaths(state.growthDeaths);
  return growthDeaths.length === 0
    ? normalized
    : { ...normalized, growthDeaths };
}

/**
 * Migrate a schema-v2 encounter, whose fate could only result from fight/bypass.
 * @param {unknown} candidate Schema-v2 encounter value.
 * @returns {ThreefoldEncounter} Canonical current encounter.
 */
export function migrateLegacyThreefoldEncounter(candidate) {
  if (candidate === undefined) return createThreefoldEncounter();
  if (!candidate || typeof candidate !== 'object')
    throw new RangeError('THREEFOLD encounter state is inconsistent.');
  const legacy = /** @type {{ratFate?: unknown}} */ (candidate);
  if (!isRatFate(legacy.ratFate))
    throw new RangeError('THREEFOLD encounter state is inconsistent.');
  const ratAction = {
    present: null,
    repelled: 'fight',
    bypassed: 'bypass',
    killed: 'fight',
  }[legacy.ratFate];
  return normalizeThreefoldEncounter({ ratFate: legacy.ratFate, ratAction });
}

/**
 * Check whether a value is one of this encounter's authored terminal states.
 * @param {unknown} candidate Candidate fate.
 * @returns {candidate is RatFate} Whether the fate is supported.
 */
function isRatFate(candidate) {
  return typeof candidate === 'string' && RAT_FATES.has(candidate);
}

/**
 * Check whether an encounter action is supported by the current schema.
 * @param {unknown} candidate Candidate action.
 * @returns {candidate is RatAction} Whether the value is supported.
 */
function isRatAction(candidate) {
  return (
    candidate === null ||
    (typeof candidate === 'string' && RAT_ACTIONS.has(candidate))
  );
}

/**
 * Validate and sort persisted growth-caused creature outcomes.
 * @param {unknown} candidate Candidate saved outcomes.
 * @returns {ThreefoldGrowthDeath[]} Canonical growth outcomes.
 */
function normalizeGrowthDeaths(candidate) {
  if (candidate === undefined) return [];
  if (!Array.isArray(candidate))
    throw new RangeError('THREEFOLD creature outcome state is inconsistent.');
  const deathsById = new Map();
  candidate.forEach(item => {
    if (!item || typeof item !== 'object')
      throw new RangeError('THREEFOLD creature outcome state is inconsistent.');
    const death = /** @type {{creatureId?: unknown, cause?: unknown}} */ (item);
    if (
      typeof death.creatureId !== 'string' ||
      death.creatureId.trim().length === 0 ||
      death.cause !== 'growth'
    )
      throw new RangeError('THREEFOLD creature outcome state is inconsistent.');
    deathsById.set(death.creatureId, {
      creatureId: death.creatureId,
      cause: 'growth',
    });
  });
  return Array.from(deathsById.keys())
    .sort()
    .map(creatureId => ({ creatureId, cause: 'growth' }));
}

/**
 * Find the rat and player only while the encounter remains unresolved.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} simulation Current run.
 * @returns {{rat: ReturnType<import('./gatehouse.js').createBrokenGateScene>['creatures'][number], player: ReturnType<import('./simulation.js').createThreefoldSimulation>['player']}|null} Current encounter context.
 */
function getPresentGatehouseRatContext(simulation) {
  if (
    simulation?.scene?.id !== 'broken-gate' ||
    simulation?.encounter?.ratFate !== 'present' ||
    !simulation?.player
  )
    return null;
  const rat = simulation.scene.creatures.find(
    creature => creature.id === 'gatehouse-rat'
  );
  return rat ? { rat, player: simulation.player } : null;
}
