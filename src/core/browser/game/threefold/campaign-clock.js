const CAMPAIGN_CLOCK_GAME_ID = 'threefold-campaign-clock';
const CAMPAIGN_CLOCK_SCHEMA_VERSION = 1;

export const THREEFOLD_ACTION_GAME_SECONDS = 15;

/**
 * Validate a deterministic in-game duration.
 * @param {unknown} candidate Candidate elapsed seconds.
 * @param {string} [owner] Domain that owns the duration.
 * @returns {number} Non-negative finite in-game duration.
 */
export function normalizeThreefoldElapsedGameSeconds(
  candidate,
  owner = 'Campaign'
) {
  if (
    typeof candidate !== 'number' ||
    !Number.isFinite(candidate) ||
    candidate < 0
  )
    throw new RangeError(`${owner} elapsed game time is invalid.`);
  return candidate;
}

/**
 * Return the deterministic duration of one supported campaign action.
 * @param {{type: string, elapsedGameMinutes?: number}|null|undefined} action Player action.
 * @param {string} sceneId Active authored scene.
 * @returns {number|null} Elapsed game seconds, or null for an unsupported action.
 */
export function getThreefoldActionDurationSeconds(action, sceneId) {
  if (!action || typeof action !== 'object') return null;
  if (action.type === 'wait') {
    const minutes = action.elapsedGameMinutes;
    return typeof minutes === 'number' &&
      Number.isFinite(minutes) &&
      minutes > 0
      ? minutes * 60
      : null;
  }
  if (['move', 'grow', 'shrink', 'interact'].includes(action.type))
    return THREEFOLD_ACTION_GAME_SECONDS;
  if (sceneId === 'broken-gate' && ['fight', 'bypass'].includes(action.type))
    return THREEFOLD_ACTION_GAME_SECONDS;
  return null;
}

/**
 * Create validated campaign elapsed time independent of any region save.
 * @param {number} [elapsedGameSeconds] Total in-game seconds since this clock began.
 * @returns {{elapsedGameSeconds: number}} Campaign clock.
 */
export function createThreefoldCampaignClock(elapsedGameSeconds = 0) {
  return {
    elapsedGameSeconds:
      normalizeThreefoldElapsedGameSeconds(elapsedGameSeconds),
  };
}

/**
 * Advance a campaign clock by one validated world-action duration.
 * @param {{elapsedGameSeconds: number}} clock Current campaign clock.
 * @param {number} elapsedGameSeconds Duration of the action in game seconds.
 * @returns {{elapsedGameSeconds: number}} Updated clock or the original on invalid duration.
 */
export function advanceThreefoldCampaignClock(clock, elapsedGameSeconds) {
  const current = createThreefoldCampaignClock(clock?.elapsedGameSeconds);
  if (
    typeof elapsedGameSeconds !== 'number' ||
    !Number.isFinite(elapsedGameSeconds) ||
    elapsedGameSeconds <= 0
  )
    return clock;
  return createThreefoldCampaignClock(
    current.elapsedGameSeconds + elapsedGameSeconds
  );
}

/**
 * Serialize a campaign clock separately from all region simulation saves.
 * @param {{elapsedGameSeconds: number}} clock Campaign clock.
 * @returns {string} Versioned campaign-clock envelope.
 */
export function serializeThreefoldCampaignClock(clock) {
  return JSON.stringify({
    game: CAMPAIGN_CLOCK_GAME_ID,
    schemaVersion: CAMPAIGN_CLOCK_SCHEMA_VERSION,
    state: createThreefoldCampaignClock(clock?.elapsedGameSeconds),
  });
}

/**
 * Restore a campaign clock without accepting another save type or version.
 * @param {unknown} serialized Stored campaign-clock envelope.
 * @returns {{elapsedGameSeconds: number}|null} Valid clock or null.
 */
export function restoreThreefoldCampaignClock(serialized) {
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
    envelope.game !== CAMPAIGN_CLOCK_GAME_ID ||
    envelope.schemaVersion !== CAMPAIGN_CLOCK_SCHEMA_VERSION
  )
    return null;
  try {
    return createThreefoldCampaignClock(envelope.state?.elapsedGameSeconds);
  } catch {
    return null;
  }
}
