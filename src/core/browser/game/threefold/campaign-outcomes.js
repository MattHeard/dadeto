import { normalizeThreefoldElapsedGameSeconds } from './campaign-clock.js';

const CAMPAIGN_OUTCOMES_GAME_ID = 'threefold-campaign-outcomes';
const CAMPAIGN_OUTCOMES_SCHEMA_VERSION = 1;
const THREEFOLD_IRI_FATE_OUTCOMES = Object.freeze(['alive', 'escaped', 'dead']);

/**
 * Create the campaign record without merging it into any region save.
 * @param {{outcome: 'alive'|'escaped'|'dead', milestoneId: string, elapsedGameSeconds: number}|null} [iriFate] Last authored Iri outcome milestone.
 * @returns {{iriFate: {outcome: 'alive'|'escaped'|'dead', milestoneId: string, elapsedGameSeconds: number}|null}} Normalized campaign outcomes.
 */
export function createThreefoldCampaignOutcomes(iriFate = null) {
  return { iriFate: normalizeThreefoldIriFate(iriFate) };
}

/**
 * Record an authored Iri outcome at deterministic campaign time.
 * Dead is terminal, escaped cannot revert to alive, and campaign milestones
 * cannot be recorded earlier than the current outcome.
 * @param {{iriFate: {outcome: 'alive'|'escaped'|'dead', milestoneId: string, elapsedGameSeconds: number}|null}} state Current campaign outcomes.
 * @param {{outcome: 'alive'|'escaped'|'dead', milestoneId: string, elapsedGameSeconds: number}} milestone Authored outcome and its campaign-time position.
 * @returns {{iriFate: {outcome: 'alive'|'escaped'|'dead', milestoneId: string, elapsedGameSeconds: number}|null}} Updated campaign outcomes, or the current record for an invalid transition.
 */
export function recordThreefoldIriFate(state, milestone) {
  const current = createThreefoldCampaignOutcomes(state?.iriFate);
  const next = normalizeThreefoldIriFate(milestone);
  if (!next || !isValidIriFateTransition(current.iriFate, next)) return current;
  return { iriFate: next };
}

/**
 * Encode campaign outcomes in a versioned, campaign-specific envelope.
 * @param {{iriFate: {outcome: 'alive'|'escaped'|'dead', milestoneId: string, elapsedGameSeconds: number}|null}} outcomes Campaign outcome state.
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
 * Restore campaign outcomes while rejecting unrelated or malformed saves.
 * @param {unknown} serialized Stored campaign outcome envelope.
 * @returns {{iriFate: {outcome: 'alive'|'escaped'|'dead', milestoneId: string, elapsedGameSeconds: number}|null}|null} Valid campaign outcomes or null.
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
    envelope.schemaVersion !== CAMPAIGN_OUTCOMES_SCHEMA_VERSION
  )
    return null;
  if (!envelope.state || typeof envelope.state !== 'object') return null;
  try {
    return createThreefoldCampaignOutcomes(envelope.state?.iriFate);
  } catch {
    return null;
  }
}

/**
 * Validate one campaign fate record.
 * @param {unknown} candidate Stored or authored fate record.
 * @returns {{outcome: 'alive'|'escaped'|'dead', milestoneId: string, elapsedGameSeconds: number}|null} Valid record or null.
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
    outcome: /** @type {'alive'|'escaped'|'dead'} */ (outcome),
    milestoneId,
    elapsedGameSeconds: normalizeThreefoldElapsedGameSeconds(
      elapsedGameSeconds,
      'Campaign Iri fate'
    ),
  };
}

/**
 * Keep fate transitions monotonic and terminal once Iri has died.
 * @param {{outcome: 'alive'|'escaped'|'dead', milestoneId: string, elapsedGameSeconds: number}|null} current Existing fate.
 * @param {{outcome: 'alive'|'escaped'|'dead', milestoneId: string, elapsedGameSeconds: number}} next Candidate fate.
 * @returns {boolean} Whether the new authored milestone may replace the current one.
 */
function isValidIriFateTransition(current, next) {
  if (!current) return true;
  if (next.elapsedGameSeconds < current.elapsedGameSeconds) return false;
  if (current.outcome === 'dead') return next.outcome === 'dead';
  if (current.outcome === 'escaped') return next.outcome !== 'alive';
  return true;
}
