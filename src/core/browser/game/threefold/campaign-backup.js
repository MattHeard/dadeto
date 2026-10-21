import { parseJsonOrNull } from '../../validation.js';
import { THREEFOLD_CAMPAIGN_SCENE_IDS } from './campaign.js';
import {
  normalizeThreefoldCampaignRecords,
  getThreefoldRegionRecordKey,
  THREEFOLD_SHARED_SAVE_KEYS,
} from './campaign-storage.js';
import {
  restoreThreefoldSimulation,
  serializeThreefoldSimulation,
} from './save.js';
import * as clockCodec from './campaign-clock.js';
import * as outcomesCodec from './campaign-outcomes.js';
import * as pressureCodec from './pressure-network.js';
import { hasThreefoldQuayIriDeath } from './quay-regulator.js';

/**
 * Validate and canonicalize every record before a complete campaign replacement.
 * @param {unknown} candidate Complete map including explicitly unvisited regions.
 * @returns {Record<string, string|null>} Independently validated canonical records.
 */
export function normalizeThreefoldCampaignBackup(candidate) {
  const records = normalizeThreefoldCampaignRecords(candidate);
  for (const sceneId of THREEFOLD_CAMPAIGN_SCENE_IDS) {
    const key = getThreefoldRegionRecordKey(sceneId);
    if (records[key] === null) continue;
    const state = restoreThreefoldSimulation(records[key]);
    if (!state || state.scene.id !== sceneId)
      throw new Error('Campaign region is invalid.');
    records[key] = serializeThreefoldSimulation(state);
  }
  const clock = clockCodec.restoreThreefoldCampaignClock(
    records[THREEFOLD_SHARED_SAVE_KEYS.clock]
  );
  const outcomes = outcomesCodec.restoreThreefoldCampaignOutcomes(
    records[THREEFOLD_SHARED_SAVE_KEYS.outcomes]
  );
  const pressure = pressureCodec.restoreThreefoldPressureNetwork(
    records[THREEFOLD_SHARED_SAVE_KEYS.pressure]
  );
  if (!clock || !outcomes || !pressure)
    throw new Error('Campaign shared progress is incomplete.');
  const quay = restoreThreefoldSimulation(
    records[getThreefoldRegionRecordKey('belltops')]
  );
  if (
    quay &&
    hasThreefoldQuayIriDeath(quay) &&
    outcomes.iriFate &&
    outcomes.iriFate.outcome !== 'dead'
  )
    throw new Error('Campaign character outcomes conflict.');
  records[THREEFOLD_SHARED_SAVE_KEYS.clock] =
    clockCodec.serializeThreefoldCampaignClock(clock);
  records[THREEFOLD_SHARED_SAVE_KEYS.outcomes] =
    outcomesCodec.serializeThreefoldCampaignOutcomes(outcomes);
  records[THREEFOLD_SHARED_SAVE_KEYS.pressure] =
    pressureCodec.serializeThreefoldPressureNetwork(pressure);
  return records;
}

/**
 * Encode a portable complete campaign without browser-specific revisions.
 * @param {Record<string, string|null>} records Complete campaign records.
 * @returns {string} Validated backup file contents.
 */
export function serializeThreefoldCampaignBackup(records) {
  return JSON.stringify({
    game: 'threefold-campaign-backup',
    schemaVersion: 1,
    records: normalizeThreefoldCampaignBackup(records),
  });
}

/**
 * Decode the whole file before the runtime or storage can change.
 * @param {unknown} serialized Candidate backup file contents.
 * @returns {Record<string, string|null>} Complete validated campaign records.
 */
export function restoreThreefoldCampaignBackup(serialized) {
  const parsed =
    typeof serialized === 'string' ? parseJsonOrNull(serialized) : null;
  const envelope = /** @type {Record<string, unknown>|null} */ (parsed);
  if (
    !envelope ||
    envelope.game !== 'threefold-campaign-backup' ||
    envelope.schemaVersion !== 1
  )
    throw new Error('Invalid THREEFOLD campaign backup.');
  return normalizeThreefoldCampaignBackup(envelope.records);
}

/**
 * Include the active region and unsaved local progress in a portable backup.
 * @param {Record<string, string|null>} records Persisted or retained records.
 * @param {Parameters<typeof serializeThreefoldSimulation>[0]} state Active region.
 * @param {{clock: Parameters<typeof clockCodec.serializeThreefoldCampaignClock>[0], iriFate: Parameters<typeof outcomesCodec.serializeThreefoldCampaignOutcomes>[0]['iriFate'], network: Parameters<typeof pressureCodec.serializeThreefoldPressureNetwork>[0]}} campaign Current shared runtime state.
 * @returns {string} Complete validated campaign backup.
 */
export function serializeThreefoldRuntimeCampaign(records, state, campaign) {
  return serializeThreefoldCampaignBackup({
    ...records,
    [getThreefoldRegionRecordKey(state.scene.id)]:
      serializeThreefoldSimulation(state),
    [THREEFOLD_SHARED_SAVE_KEYS.clock]:
      clockCodec.serializeThreefoldCampaignClock(campaign.clock),
    [THREEFOLD_SHARED_SAVE_KEYS.outcomes]:
      outcomesCodec.serializeThreefoldCampaignOutcomes({
        iriFate: campaign.iriFate,
      }),
    [THREEFOLD_SHARED_SAVE_KEYS.pressure]:
      pressureCodec.serializeThreefoldPressureNetwork(campaign.network),
  });
}
