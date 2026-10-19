/** @typedef {'present'|'repelled'|'bypassed'|'killed'} RatFate */

/** @type {Set<string>} */
const RAT_FATES = new Set(['present', 'repelled', 'bypassed', 'killed']);

/**
 * Create the authored Broken Gate wildlife encounter state.
 * @returns {{ratFate: 'present'|'repelled'|'bypassed'|'killed'}} Initial rat fate.
 */
export function createThreefoldEncounter() {
  return { ratFate: 'present' };
}

/**
 * Check whether the rat can be engaged at Mara's current physical scale.
 * The encounter becomes actionable at the rat's scale or one rung larger.
 * @param {ReturnType<import('./simulation.js').createThreefoldSimulation>} simulation Current run.
 * @returns {boolean} Whether fight and bypass controls are in reach.
 */
export function isGatehouseRatInReach(simulation) {
  const rat = simulation?.scene?.creatures?.find(
    creature => creature.id === 'gatehouse-rat'
  );
  const player = simulation?.player;
  if (
    !rat ||
    simulation.encounter?.ratFate !== 'present' ||
    !player ||
    player.scale > -1
  )
    return false;

  const dx = player.position.x - rat.position.x;
  const dy = player.position.y - rat.position.y;
  const reachMeters =
    rat.interactionRadiusMeters +
    (simulation.scene.baseBodyWidthMeters * 3 ** player.scale) / 2;
  return dx * dx + dy * dy <= reachMeters * reachMeters;
}

/**
 * Apply the player's authored choice for the one Broken Gate rat encounter.
 * @param {{ratFate: 'present'|'repelled'|'bypassed'|'killed'}} encounter Current encounter state.
 * @param {'fight'|'bypass'} choice Chosen encounter action.
 * @param {number} scale Mara's scale when choosing.
 * @returns {{ratFate: 'present'|'repelled'|'bypassed'|'killed'}} Updated encounter.
 */
export function resolveGatehouseRat(encounter, choice, scale) {
  if (encounter.ratFate !== 'present') return encounter;
  if (choice === 'bypass') return { ratFate: 'bypassed' };
  if (choice === 'fight')
    return { ratFate: scale === -2 ? 'repelled' : 'killed' };
  return encounter;
}

/**
 * Rebuild encounter state while rejecting unknown fates.
 * @param {unknown} candidate Candidate save value; undefined is the legacy default.
 * @returns {{ratFate: 'present'|'repelled'|'bypassed'|'killed'}} Canonical encounter state.
 */
export function normalizeThreefoldEncounter(candidate) {
  if (candidate === undefined) return createThreefoldEncounter();
  if (!candidate || typeof candidate !== 'object')
    throw new RangeError('THREEFOLD encounter state is inconsistent.');
  const state = /** @type {{ratFate?: unknown}} */ (candidate);
  if (!isRatFate(state.ratFate))
    throw new RangeError('THREEFOLD encounter state is inconsistent.');
  return { ratFate: state.ratFate };
}

/**
 * Check whether a value is one of this encounter's authored terminal states.
 * @param {unknown} candidate Candidate fate.
 * @returns {candidate is RatFate} Whether the fate is supported.
 */
function isRatFate(candidate) {
  return typeof candidate === 'string' && RAT_FATES.has(candidate);
}
