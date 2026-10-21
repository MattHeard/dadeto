import { normalizeThreefoldElapsedGameSeconds } from './campaign-clock.js';

const CAMPAIGN_OUTCOMES_GAME_ID = 'threefold-campaign-outcomes';
const CAMPAIGN_OUTCOMES_SCHEMA_VERSION = 3;
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
/** @typedef {{iriFate: ThreefoldIriFate|null, iriKnowledge?: ThreefoldIriFate|null}} ThreefoldCampaignOutcomes */

/**
 * Create the campaign record without merging it into any region save.
 * @param {ThreefoldIriFate|null} [iriFate] Last authored Iri outcome milestone.
 * @param {ThreefoldIriFate|null|undefined} [iriKnowledge] Last observed event when the current outcome remains undiscovered.
 * @returns {ThreefoldCampaignOutcomes} Normalized physical outcome and player knowledge.
 */
export function createThreefoldCampaignOutcomes(
  iriFate = null,
  iriKnowledge = undefined
) {
  const fate = normalizeThreefoldIriFate(iriFate);
  if (iriKnowledge === undefined) return { iriFate: fate };
  const knowledge = normalizeThreefoldIriFate(iriKnowledge);
  if (knowledge && (!fate || !isValidIriFateTransition(knowledge, fate)))
    throw new Error('Campaign knowledge conflicts with the current fate.');
  return { iriFate: fate, iriKnowledge: knowledge };
}

/**
 * Record an authored Iri outcome at deterministic campaign time.
 * Death is terminal; outcomes that place Iri away from the regulator cannot
 * later put Iri back there. Campaign milestones cannot be backdated.
 * @param {ThreefoldCampaignOutcomes} state Current campaign outcomes.
 * @param {ThreefoldIriFate} milestone Authored outcome and its campaign-time position.
 * @returns {ThreefoldCampaignOutcomes} Updated campaign outcomes, or the current record for an invalid transition.
 */
export function recordThreefoldIriFate(state, milestone) {
  const current = createThreefoldCampaignOutcomes(
    state?.iriFate,
    state?.iriKnowledge
  );
  const next = normalizeThreefoldIriFate(milestone);
  if (!next || !isValidIriFateTransition(current.iriFate, next)) return current;
  return { iriFate: next };
}

/**
 * Encode campaign outcomes in a versioned, campaign-specific envelope.
 * @param {ThreefoldCampaignOutcomes} outcomes Campaign outcome state.
 * @returns {string} Versioned serialized outcomes.
 */
export function serializeThreefoldCampaignOutcomes(outcomes) {
  return JSON.stringify({
    game: CAMPAIGN_OUTCOMES_GAME_ID,
    schemaVersion: CAMPAIGN_OUTCOMES_SCHEMA_VERSION,
    state: createThreefoldCampaignOutcomes(
      outcomes?.iriFate,
      outcomes?.iriKnowledge
    ),
  });
}

/**
 * Restore campaign outcomes, migrating the old alive state to trapped.
 * @param {unknown} serialized Stored campaign outcome envelope.
 * @returns {ThreefoldCampaignOutcomes|null} Valid campaign outcomes or null.
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
    ![1, 2, CAMPAIGN_OUTCOMES_SCHEMA_VERSION].includes(envelope.schemaVersion)
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
    return createThreefoldCampaignOutcomes(
      iriFate,
      envelope.schemaVersion === 3 ? envelope.state.iriKnowledge : undefined
    );
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

/**
 * Read the latest observed event without revealing an offscreen change.
 * @param {ThreefoldCampaignOutcomes} state Physical and known campaign events.
 * @returns {ThreefoldIriFate|null} Last observed Iri fate.
 */
export function getKnownThreefoldIriFate(state) {
  return state.iriKnowledge === undefined ? state.iriFate : state.iriKnowledge;
}

/**
 * Discover the current event without altering its original cause or time.
 * @param {ThreefoldCampaignOutcomes} state Canonical campaign outcomes.
 * @returns {ThreefoldCampaignOutcomes} Current outcome made visible.
 */
export function observeThreefoldIriFate(state) {
  return createThreefoldCampaignOutcomes(state.iriFate);
}
