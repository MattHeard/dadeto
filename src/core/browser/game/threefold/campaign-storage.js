import { parseJsonOrNull } from '../../validation.js';
import { THREEFOLD_CAMPAIGN_SCENE_IDS } from './campaign.js';

const CAMPAIGN_KEY = 'dadeto.threefold.campaign.v1';
export const THREEFOLD_SHARED_SAVE_KEYS = Object.freeze({
  clock: 'dadeto.threefold.campaign-clock.v1',
  outcomes: 'dadeto.threefold.campaign-outcomes.v1',
  pressure: 'dadeto.threefold.pressure-network.v1',
});
export const THREEFOLD_CAMPAIGN_RECORD_KEYS = Object.freeze([
  ...THREEFOLD_CAMPAIGN_SCENE_IDS.map(getThreefoldRegionRecordKey),
  ...Object.values(THREEFOLD_SHARED_SAVE_KEYS),
]);

/** @typedef {{revision: number, records: Record<string, string|null>}} ThreefoldCampaignRecords */
/** @typedef {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => unknown, removeItem?: (key: string) => unknown}} CampaignRawStorage */
/** @typedef {CampaignRawStorage & {campaignStore: true, readCampaign: () => ThreefoldCampaignRecords, replaceCampaign: (records: Record<string, string|null>) => boolean, transaction: (action: () => any) => {value: any, persisted: boolean}, getStatus: () => {available: boolean, dirty: boolean}}} ThreefoldCampaignStorage */

/**
 * Return the stable regional namespace used by legacy saves and campaign records.
 * @param {string} sceneId Canonical authored region ID.
 * @returns {string} Namespaced regional record key.
 */
export function getThreefoldRegionRecordKey(sceneId) {
  const suffix = sceneId === 'broken-gate' ? '' : `.${sceneId}`;
  return `dadeto.threefold.simulation-save.v1${suffix}`;
}

/**
 * Validate the complete record map before any atomic document replacement.
 * Domain codecs validate the contents separately at the backup boundary.
 * @param {unknown} candidate Raw record map.
 * @returns {Record<string, string|null>} Copied complete whitelisted records.
 */
export function normalizeThreefoldCampaignRecords(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    throw new TypeError('Campaign records are invalid.');
  const record = /** @type {Record<string, unknown>} */ (candidate);
  if (Object.keys(record).length !== THREEFOLD_CAMPAIGN_RECORD_KEYS.length)
    throw new RangeError('Campaign records must be complete.');
  return Object.fromEntries(
    THREEFOLD_CAMPAIGN_RECORD_KEYS.map(key => {
      const value = record[key];
      if (value !== null && typeof value !== 'string')
        throw new TypeError('Campaign record is missing or invalid.');
      return [key, value];
    })
  );
}

/**
 * Decode a revisioned atomic campaign document without accepting partial maps.
 * @param {unknown} serialized Stored campaign document.
 * @returns {ThreefoldCampaignRecords} Valid record snapshot.
 */
function readCampaignDocument(serialized) {
  const parsed =
    typeof serialized === 'string' ? parseJsonOrNull(serialized) : null;
  const doc = /** @type {Record<string, unknown>|null} */ (parsed);
  if (
    !doc ||
    doc.game !== 'threefold-campaign-records' ||
    doc.schemaVersion !== 1 ||
    !Number.isSafeInteger(doc.revision) ||
    /** @type {number} */ (doc.revision) < 0
  )
    throw new TypeError('Stored campaign document is invalid.');
  return {
    revision: /** @type {number} */ (doc.revision),
    records: normalizeThreefoldCampaignRecords(doc.records),
  };
}

/**
 * Bind legacy record APIs to one revisioned campaign document and atomic actions.
 * Failed ordinary writes retain local progress; strict replacement never mutates
 * the cached campaign on failure. A dirty session cannot overwrite a newer page.
 * @param {CampaignRawStorage|ThreefoldCampaignStorage|null|undefined} storage Injected browser-style storage.
 * @returns {ThreefoldCampaignStorage} Compatible record API and transaction boundary.
 */
export function createThreefoldCampaignStorage(storage) {
  if (storage && 'campaignStore' in storage && storage.campaignStore === true)
    return /** @type {ThreefoldCampaignStorage} */ (storage);
  /** @type {ThreefoldCampaignRecords} */
  let cached = {
    revision: 0,
    records: Object.fromEntries(
      THREEFOLD_CAMPAIGN_RECORD_KEYS.map(key => [key, null])
    ),
  };
  /** @type {ThreefoldCampaignRecords|null} */
  let staged = null;
  let persistedRevision = 0;
  let dirty = false;
  let available = true;

  /** @returns {ThreefoldCampaignRecords} Current persisted document or legacy records. */
  function readRaw() {
    if (!storage) throw new Error('Campaign storage is unavailable.');
    const serialized = storage.getItem(CAMPAIGN_KEY);
    if (serialized !== null && serialized !== undefined)
      return readCampaignDocument(serialized);
    const records = Object.fromEntries(
      THREEFOLD_CAMPAIGN_RECORD_KEYS.map(key => [
        key,
        storage.getItem(key) ?? null,
      ])
    );
    return { revision: 0, records: normalizeThreefoldCampaignRecords(records) };
  }

  /** @returns {ThreefoldCampaignRecords} Current transaction or safely retained local state. */
  function current() {
    if (staged) return staged;
    if (dirty) return cached;
    try {
      cached = readRaw();
      persistedRevision = cached.revision;
      available = true;
    } catch {
      available = false;
    }
    return cached;
  }

  /**
   * Commit one full document with an optimistic revision check.
   * @param {Record<string, string|null>} records Fully staged records.
   * @param {boolean} strict Whether failure must retain the old cached campaign.
   * @returns {boolean} Whether one storage mutation persisted the campaign.
   */
  function commit(records, strict) {
    const next = { revision: cached.revision + 1, records };
    try {
      if (!storage) throw new Error('Campaign storage is unavailable.');
      if (
        !Number.isSafeInteger(next.revision) ||
        readRaw().revision !== persistedRevision
      )
        throw new Error('Campaign changed in another page.');
      storage.setItem(
        CAMPAIGN_KEY,
        JSON.stringify({
          game: 'threefold-campaign-records',
          schemaVersion: 1,
          ...next,
        })
      );
      cached = next;
      persistedRevision = next.revision;
      dirty = false;
      available = true;
      return true;
    } catch {
      available = false;
      if (!strict) {
        cached = next;
        dirty = true;
      }
      return false;
    }
  }

  /**
   * Stage one known record, or commit it when no world action is active.
   * @param {string} key Namespaced record.
   * @param {string|null} value Canonical serialized domain value or removal.
   * @returns {void}
   */
  function setRecord(key, value) {
    if (!THREEFOLD_CAMPAIGN_RECORD_KEYS.includes(key))
      throw new RangeError('Unknown campaign record.');
    const base = current();
    if (base.records[key] === value && !dirty && available) return;
    const records = { ...base.records, [key]: value };
    if (staged) staged = { ...staged, records };
    else if (!commit(records, false))
      throw new Error('Campaign could not be saved.');
  }

  return {
    campaignStore: true,
    getItem: key => current().records[key] ?? null,
    setItem: (key, value) => setRecord(key, value),
    removeItem: key => setRecord(key, null),
    readCampaign: () => {
      const doc = current();
      return { revision: doc.revision, records: { ...doc.records } };
    },
    getStatus: () => ({ available, dirty }),
    replaceCampaign: records => {
      const normalized = normalizeThreefoldCampaignRecords(records);
      if (staged) throw new Error('Campaign action is already active.');
      current();
      return commit(normalized, true);
    },
    transaction: action => {
      if (staged) throw new Error('Campaign action is already active.');
      const before = current();
      staged = { revision: before.revision, records: { ...before.records } };
      try {
        const value = action();
        const records = staged.records;
        staged = null;
        const changed =
          dirty ||
          THREEFOLD_CAMPAIGN_RECORD_KEYS.some(
            key => before.records[key] !== records[key]
          );
        return {
          value,
          persisted: changed ? commit(records, false) : available && !dirty,
        };
      } finally {
        staged = null;
      }
    },
  };
}
