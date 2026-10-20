import { heightAtScale } from './spatial.js';

/** @typedef {'present'|'repelled'|'bypassed'|'killed'} RatFate */
/** @typedef {null|'fight'|'bypass'|'growth'} RatAction */
/** @typedef {{ratFate: RatFate, ratAction: RatAction}} ThreefoldEncounter */

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
  const { rat, player } = context;
  const halfWidth =
    (simulation.scene.baseBodyWidthMeters * 3 ** player.scale) / 2;
  const tolerance = 1e-9;
  return (
    player.position.x - halfWidth >= rat.bounds.min.x - tolerance &&
    player.position.x + halfWidth <= rat.bounds.max.x + tolerance &&
    player.position.y - halfWidth >= rat.bounds.min.y - tolerance &&
    player.position.y + halfWidth <= rat.bounds.max.y + tolerance &&
    heightAtScale(player.scale) <=
      rat.bounds.max.z - rat.bounds.min.z + tolerance
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
  if (choice === 'bypass') return { ratFate: 'bypassed', ratAction: 'bypass' };
  if (choice === 'growth') return { ratFate: 'killed', ratAction: 'growth' };
  if (choice === 'fight')
    return {
      ratFate: scale === -2 ? 'repelled' : 'killed',
      ratAction: 'fight',
    };
  return encounter;
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
  const state = /** @type {{ratFate?: unknown, ratAction?: unknown}} */ (
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
  return { ratFate: state.ratFate, ratAction: state.ratAction };
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
 * Find the rat and player only while the encounter remains unresolved.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} simulation Current run.
 * @returns {{rat: ReturnType<import('./gatehouse.js').createBrokenGateScene>['creatures'][number], player: ReturnType<import('./simulation.js').createThreefoldSimulation>['player']}|null} Current encounter context.
 */
function getPresentGatehouseRatContext(simulation) {
  if (simulation?.encounter?.ratFate !== 'present' || !simulation?.player)
    return null;
  const rat = simulation.scene.creatures.find(
    creature => creature.id === 'gatehouse-rat'
  );
  return rat ? { rat, player: simulation.player } : null;
}
