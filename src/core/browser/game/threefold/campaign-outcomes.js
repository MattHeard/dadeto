import { normalizeThreefoldElapsedGameSeconds } from './campaign-clock.js';

const CAMPAIGN_OUTCOMES_GAME_ID = 'threefold-campaign-outcomes';
const CAMPAIGN_OUTCOMES_SCHEMA_VERSION = 2;
const LEGACY_IRI_FATE_OUTCOMES = Object.freeze(['alive', 'escaped', 'dead']);
const THREEFOLD_IRI_FATE_OUTCOMES = Object.freeze([
  'trapped',
  'rescued',
  'escaped',
  'dead',
  'evacuated',
  'abandoned',
]);

/** @typedef {'trapped'|'rescued'|'escaped'|'dead'|'evacuated'|'abandoned'} ThreefoldIriOutcome */
/** @typedef {{outcome: ThreefoldIriOutcome, milestoneId: string, elapsedGameSeconds: number}} ThreefoldIriFate */

/**
 * Create the campaign record without merging it into any region save.
 * @param {ThreefoldIriFate|null} [iriFate] Last authored Iri outcome milestone.
 * @returns {{iriFate: ThreefoldIriFate|null}} Normalized campaign outcomes.
 */
export function createThreefoldCampaignOutcomes(iriFate = null) {
  return { iriFate: normalizeThreefoldIriFate(iriFate) };
}

/**
 * Record an authored Iri outcome at deterministic campaign time.
 * Death is terminal; outcomes that place Iri away from the regulator cannot
 * later put Iri back there. Campaign milestones cannot be backdated.
 * @param {{iriFate: ThreefoldIriFate|null}} state Current campaign outcomes.
 * @param {ThreefoldIriFate} milestone Authored outcome and its campaign-time position.
 * @returns {{iriFate: ThreefoldIriFate|null}} Updated campaign outcomes, or the current record for an invalid transition.
 */
export function recordThreefoldIriFate(state, milestone) {
  const current = createThreefoldCampaignOutcomes(state?.iriFate);
  const next = normalizeThreefoldIriFate(milestone);
  if (!next || !isValidIriFateTransition(current.iriFate, next)) return current;
  return { iriFate: next };
}

/**
 * Encode campaign outcomes in a versioned, campaign-specific envelope.
 * @param {{iriFate: ThreefoldIriFate|null}} outcomes Campaign outcome state.
 * @returns {string} Versioned serialized outcomes.
 */
export function serializeThreefoldCampaignOutcomes(outcomes) {
  return JSON.stringify({
    game: CAMPAIGN_OUTCOMES_GAME_ID,
    schemaVersion: CAMPAIGN_OUTCOMES_SCHEMA_VERSION,
    state: createThreefoldCampaignOutcomes(outcomes?.iriFate),
  });
}

/**
 * Restore campaign outcomes, migrating the old alive state to trapped.
 * @param {unknown} serialized Stored campaign outcome envelope.
 * @returns {{iriFate: ThreefoldIriFate|null}|null} Valid campaign outcomes or null.
 */
export function restoreThreefoldCampaignOutcomes(serialized) {
  if (typeof serialized !== 'string') return null;
  let envelope;
  try {
    envelope = JSON.parse(serialized);
  } catch {
    return null;
  }
  if (
    !envelope ||
    typeof envelope !== 'object' ||
    envelope.game !== CAMPAIGN_OUTCOMES_GAME_ID ||
    ![1, CAMPAIGN_OUTCOMES_SCHEMA_VERSION].includes(envelope.schemaVersion)
  )
    return null;
  if (!envelope.state || typeof envelope.state !== 'object') return null;
  try {
    const iriFate = envelope.state.iriFate;
    if (envelope.schemaVersion === 1) {
      if (
        iriFate !== null &&
        (!iriFate ||
          typeof iriFate !== 'object' ||
          !LEGACY_IRI_FATE_OUTCOMES.includes(iriFate.outcome))
      )
        return null;
      return createThreefoldCampaignOutcomes(
        iriFate?.outcome === 'alive'
          ? { ...iriFate, outcome: 'trapped' }
          : iriFate
      );
    }
    return createThreefoldCampaignOutcomes(iriFate);
  } catch {
    return null;
  }
}

/**
 * Validate one campaign fate record.
 * @param {unknown} candidate Stored or authored fate record.
 * @returns {ThreefoldIriFate|null} Valid record or null.
 */
function normalizeThreefoldIriFate(candidate) {
  if (candidate === null) return null;
  if (!candidate || typeof candidate !== 'object')
    throw new TypeError('Campaign Iri fate is invalid.');
  const { outcome, milestoneId, elapsedGameSeconds } =
    /** @type {Record<string, unknown>} */ (candidate);
  if (
    typeof outcome !== 'string' ||
    !THREEFOLD_IRI_FATE_OUTCOMES.includes(outcome) ||
    typeof milestoneId !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(milestoneId)
  )
    throw new TypeError('Campaign Iri fate is invalid.');
  return {
    outcome: /** @type {ThreefoldIriOutcome} */ (outcome),
    milestoneId,
    elapsedGameSeconds: normalizeThreefoldElapsedGameSeconds(
      elapsedGameSeconds,
      'Campaign Iri fate'
    ),
  };
}

/**
 * Keep milestones monotonic; once Iri has escaped, been evacuated, or rescued,
 * later records may only confirm that state or record a death.
 * @param {ThreefoldIriFate|null} current Existing fate.
 * @param {ThreefoldIriFate} next Candidate fate.
 * @returns {boolean} Whether the new authored milestone may replace the current one.
 */
function isValidIriFateTransition(current, next) {
  if (!current) return true;
  if (next.elapsedGameSeconds < current.elapsedGameSeconds) return false;
  if (current.outcome === 'dead') return next.outcome === 'dead';
  if (['escaped', 'evacuated', 'rescued'].includes(current.outcome))
    return next.outcome === 'dead' || next.outcome === current.outcome;
  return true;
}
