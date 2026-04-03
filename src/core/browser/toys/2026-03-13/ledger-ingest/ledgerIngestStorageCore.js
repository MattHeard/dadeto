import {
  isNonNullObject,
  isValidString,
  normalizeObjectOrFallback,
  whenArray,
  objectOrEmpty,
} from '../../../../commonCore.js';

export const DEFAULT_STORAGE_KEY = 'LEDG3';
const EMPTY_STORAGE_ENV = {
  get() {
    return undefined;
  },
};

/**
 * @typedef {object} LedgerStorageState
 * @property {string[]} transactionOrder Ordered merge keys for stored transactions.
 * @property {Record<string, LedgerIngestTransaction>} transactionsByMergeKey Stored transactions keyed by merge identity.
 */

/**
 * @typedef {import('../../presenters/ledgerIngest.js').LedgerIngestTransaction} LedgerIngestTransaction
 */

/**
 * Resolve the storage key used for ledger persistence.
 * @param {Record<string, unknown>} parsed Parsed wrapper input.
 * @returns {string} Storage bucket key.
 */
export function resolveStorageKey(parsed) {
  const candidate = parsed.storageKey;
  if (isValidString(candidate)) {
    return candidate;
  }

  return DEFAULT_STORAGE_KEY;
}

/**
 * Normalize the toy runtime environment.
 * @param {{ get?: (name: string) => unknown } | null | undefined} env Toy runtime environment.
 * @returns {{ get: (name: string) => unknown }} Environment with a get accessor.
 */
export function normalizeStorageEnv(env) {
  return env || EMPTY_STORAGE_ENV;
}

/**
 * Read a permanent storage accessor from the environment.
 * @param {{ get?: (name: string) => unknown } | null | undefined} env Toy runtime environment.
 * @param {string} name Accessor name.
 * @returns {unknown} Accessor value or undefined.
 */
export function getPermanentStorageAccessor(env, name) {
  return normalizeStorageEnv(env).get(name);
}

/**
 * Clone an object-like value into a plain record.
 * @param {unknown} value Candidate storage root.
 * @returns {Record<string, unknown>} Plain record copy or empty object.
 */
export function cloneRecord(value) {
  return normalizeObjectOrFallback(value, () => ({}), objectOrEmpty);
}

/**
 * Normalize a storage root candidate.
 * @param {unknown} value Candidate storage root.
 * @returns {Record<string, unknown>} Normalized storage root.
 */
export function normalizeStorageRoot(value) {
  return cloneRecord(value);
}

/**
 * Read the permanent storage root from the environment.
 * @param {{ get?: (name: string) => unknown } | null | undefined} env Toy runtime environment.
 * @returns {Record<string, unknown>} Current permanent storage root or an empty object.
 */
export function readPermanentStorageRoot(env) {
  const getter = getPermanentStorageAccessor(env, 'getLocalPermanentData');
  if (typeof getter !== 'function') {
    return {};
  }

  return normalizeStorageRoot(getter());
}

/**
 * Create an empty storage state.
 * @returns {LedgerStorageState} Empty storage state.
 */
export function createEmptyLedgerStorageState() {
  const transactionOrder = [];
  const transactionsByMergeKey = {};
  return {
    transactionOrder,
    transactionsByMergeKey,
  };
}

/**
 * Normalize a stored transaction order array.
 * @param {unknown} value Candidate order array.
 * @returns {string[]} Normalized merge-key order.
 */
export function normalizeTransactionOrder(value) {
  return whenArray(value, arrayValue => arrayValue.filter(isValidString)) ?? [];
}

/**
 * Normalize a stored transaction map.
 * @param {unknown} value Candidate transaction map.
 * @returns {Record<string, LedgerIngestTransaction>} Normalized transaction map.
 */
export function normalizeTransactionMap(value) {
  return /** @type {Record<string, LedgerIngestTransaction>} */ (
    cloneRecord(value)
  );
}

/**
 * Normalize a persisted storage state.
 * @param {unknown} stored Candidate persisted state.
 * @returns {LedgerStorageState} Normalized storage state.
 */
export function normalizeLedgerStorageState(stored) {
  if (!isNonNullObject(stored)) {
    return createEmptyLedgerStorageState();
  }

  return {
    transactionOrder: normalizeTransactionOrder(stored.transactionOrder),
    transactionsByMergeKey: normalizeTransactionMap(
      stored.transactionsByMergeKey
    ),
  };
}

/**
 * Return the transactions stored in merge-key order.
 * @param {LedgerStorageState} storageState Persisted storage state.
 * @returns {LedgerIngestTransaction[]} Stored transactions in order.
 */
export function getStoredTransactions(storageState) {
  return storageState.transactionOrder.map(
    mergeKey => storageState.transactionsByMergeKey[mergeKey]
  );
}

/**
 * Build the read-only LEDG3 report payload.
 * @param {{
 *   storageKey: string,
 *   storageState: LedgerStorageState,
 * }} options View report inputs.
 * @returns {Record<string, unknown>} Presenter payload for the stored transactions view.
 */
export function buildLedgerIngestStorageViewReport(options) {
  const { storageKey, storageState } = options;
  const transactions = getStoredTransactions(storageState);
  const summary = {
    rawRecords: transactions.length,
    canonicalTransactions: transactions.length,
    duplicatesDetected: 0,
    errorsDetected: 0,
  };
  const policy = {
    storageKey,
    mode: 'read-only',
  };
  return {
    fixture: storageKey,
    inputMode: 'storage',
    canonicalTransactions: transactions,
    duplicateReports: [],
    errorReports: [],
    summary,
    policy,
  };
}

export const ledgerIngestStorageCoreTestOnly = {
  DEFAULT_STORAGE_KEY,
  cloneRecord,
  createEmptyLedgerStorageState,
  buildLedgerIngestStorageViewReport,
  getPermanentStorageAccessor,
  getStoredTransactions,
  normalizeLedgerStorageState,
  normalizeStorageEnv,
  normalizeStorageRoot,
  normalizeTransactionMap,
  normalizeTransactionOrder,
  readPermanentStorageRoot,
  resolveStorageKey,
};
