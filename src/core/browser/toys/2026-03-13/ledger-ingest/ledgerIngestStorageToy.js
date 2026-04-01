import { isNonNullObject, isValidString } from '../../../../commonCore.js';
import { parseJsonOrFallback } from '../../browserToysCore.js';
import { ledgerIngestToy } from './ledgerIngestToy.js';

const DEFAULT_STORAGE_KEY = 'LEDG3';
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
 * @typedef {object} LedgerStorageAction
 * @property {'insert' | 'skip' | 'update'} action Merge result.
 * @property {string} mergeKey Stable key used for storage.
 * @property {string} transactionId Transaction id from the imported run.
 * @property {string} [previousTransactionId] Transaction id replaced during an update.
 */

/**
 * @typedef {import('../../presenters/ledgerIngest.js').LedgerIngestTransaction} LedgerIngestTransaction
 */

/**
 * Resolve the storage key used for ledger persistence.
 * @param {Record<string, unknown>} parsed Parsed wrapper input.
 * @returns {string} Storage bucket key.
 */
function resolveStorageKey(parsed) {
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
function normalizeStorageEnv(env) {
  return env || EMPTY_STORAGE_ENV;
}

/**
 * Read a permanent storage accessor from the environment.
 * @param {{ get?: (name: string) => unknown } | null | undefined} env Toy runtime environment.
 * @param {string} name Accessor name.
 * @returns {unknown} Accessor value or undefined.
 */
function getPermanentStorageAccessor(env, name) {
  return normalizeStorageEnv(env).get(name);
}

/**
 * Clone an object-like value into a plain record.
 * @param {unknown} value Candidate storage root.
 * @returns {Record<string, unknown>} Plain record copy or empty object.
 */
function cloneRecord(value) {
  if (!isNonNullObject(value)) {
    return {};
  }

  return Object.fromEntries(Object.entries(value));
}

/**
 * Normalize a storage root candidate.
 * @param {unknown} value Candidate storage root.
 * @returns {Record<string, unknown>} Normalized storage root.
 */
function normalizeStorageRoot(value) {
  return cloneRecord(value);
}

/**
 * Read the permanent storage root from the environment.
 * @param {{ get?: (name: string) => unknown } | null | undefined} env Toy runtime environment.
 * @returns {Record<string, unknown>} Current permanent storage root or an empty object.
 */
function readPermanentStorageRoot(env) {
  const getter = getPermanentStorageAccessor(env, 'getLocalPermanentData');
  if (typeof getter !== 'function') {
    return {};
  }

  return normalizeStorageRoot(getter());
}

/**
 * Persist the updated permanent storage root when possible.
 * @param {{ get?: (name: string) => unknown } | null | undefined} env Toy runtime environment.
 * @param {Record<string, unknown>} nextRoot Storage root to persist.
 * @returns {boolean} True when the storage helper was invoked.
 */
function persistPermanentStorageRoot(env, nextRoot) {
  const setter = getPermanentStorageAccessor(env, 'setLocalPermanentData');
  if (typeof setter !== 'function') {
    return false;
  }

  setter(nextRoot);
  return true;
}

/**
 * Create an empty storage state.
 * @returns {LedgerStorageState} Empty storage state.
 */
function createEmptyLedgerStorageState() {
  return {
    transactionOrder: [],
    transactionsByMergeKey: {},
  };
}

/**
 * Normalize a persisted storage state.
 * @param {unknown} stored Candidate persisted state.
 * @returns {LedgerStorageState} Normalized storage state.
 */
function normalizeLedgerStorageState(stored) {
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
 * Append a valid string item to the accumulated transaction order.
 * @param {string[]} order Accumulated merge-key order.
 * @param {unknown} item Candidate order item.
 * @returns {string[]} Updated merge-key order.
 */
function appendValidTransactionOrderItem(order, item) {
  if (isValidString(item)) {
    order.push(item);
  }

  return order;
}

/**
 * Normalize a stored transaction order array.
 * @param {unknown} value Candidate order array.
 * @returns {string[]} Normalized merge-key order.
 */
function normalizeTransactionOrder(value) {
  const order = [];
  if (Array.isArray(value)) {
    value.forEach(item => appendValidTransactionOrderItem(order, item));
  }

  return order;
}

/**
 * Normalize a stored transaction map.
 * @param {unknown} value Candidate transaction map.
 * @returns {Record<string, LedgerIngestTransaction>} Normalized transaction map.
 */
function normalizeTransactionMap(value) {
  return /** @type {Record<string, LedgerIngestTransaction>} */ (
    cloneRecord(value)
  );
}

/**
 * Resolve the merge key for a canonical transaction.
 * @param {LedgerIngestTransaction} transaction Canonical transaction.
 * @returns {string} Stable merge key.
 */
function getTransactionMergeKey(transaction) {
  return transaction.dedupeKey || transaction.transactionId;
}

/**
 * Compare two canonical transactions at the merge boundary.
 * @param {LedgerIngestTransaction} existing Stored transaction.
 * @param {LedgerIngestTransaction} incoming Incoming transaction.
 * @returns {boolean} True when the transaction already exists unchanged.
 */
function isUnchangedTransaction(existing, incoming) {
  return existing.transactionId === incoming.transactionId;
}

/**
 * Determine the merge operation for a canonical transaction.
 * @param {LedgerIngestTransaction | undefined} existing Stored transaction.
 * @param {LedgerIngestTransaction} incoming Incoming transaction.
 * @returns {'insert' | 'skip' | 'update'} Merge action label.
 */
function getMergeTransactionOperation(existing, incoming) {
  if (!existing) {
    return 'insert';
  }

  return getExistingMergeTransactionOperation(existing, incoming);
}

/**
 * Determine the merge operation for a canonical transaction when storage already contains a row.
 * @param {LedgerIngestTransaction} existing Stored transaction.
 * @param {LedgerIngestTransaction} incoming Incoming transaction.
 * @returns {'skip' | 'update'} Merge action label.
 */
function getExistingMergeTransactionOperation(existing, incoming) {
  if (isUnchangedTransaction(existing, incoming)) {
    return 'skip';
  }

  return 'update';
}

/**
 * Create a merge action record for a stored transaction.
 * @param {'insert' | 'skip' | 'update'} action Merge result label.
 * @param {LedgerIngestTransaction} transaction Incoming canonical transaction.
 * @param {LedgerIngestTransaction | undefined} existing Stored transaction when available.
 * @returns {LedgerStorageAction} Merge action payload.
 */
function createMergeAction(action, transaction, existing) {
  return CREATE_MERGE_ACTION_REPORTS[action](transaction, existing);
}

/**
 * Create the base merge action report.
 * @param {'insert' | 'skip' | 'update'} action Merge result label.
 * @param {LedgerIngestTransaction} transaction Incoming canonical transaction.
 * @returns {LedgerStorageAction} Base merge action payload.
 */
function createBaseMergeActionReport(action, transaction) {
  return {
    action,
    mergeKey: getTransactionMergeKey(transaction),
    transactionId: transaction.transactionId,
  };
}

/**
 * Create the update merge action report.
 * @param {LedgerIngestTransaction} transaction Incoming canonical transaction.
 * @param {LedgerIngestTransaction} existing Stored transaction.
 * @returns {LedgerStorageAction} Update merge action payload.
 */
function createUpdateMergeActionReport(transaction, existing) {
  return {
    ...createBaseMergeActionReport('update', transaction),
    previousTransactionId: existing.transactionId,
  };
}

const CREATE_MERGE_ACTION_REPORTS = {
  insert(transaction) {
    return createBaseMergeActionReport('insert', transaction);
  },
  skip(transaction) {
    return createBaseMergeActionReport('skip', transaction);
  },
  update: createUpdateMergeActionReport,
};

/**
 * Apply an insert merge action to the storage state.
 * @param {LedgerStorageState} nextState Next storage state being assembled.
 * @param {LedgerIngestTransaction} transaction Incoming canonical transaction.
 * @param {string} mergeKey Stable merge key.
 * @returns {void}
 */
function applyInsertMergeAction(nextState, transaction, mergeKey) {
  nextState.transactionsByMergeKey[mergeKey] = transaction;
  nextState.transactionOrder.push(mergeKey);
}

/**
 * Apply an update merge action to the storage state.
 * @param {LedgerStorageState} nextState Next storage state being assembled.
 * @param {LedgerIngestTransaction} transaction Incoming canonical transaction.
 * @param {string} mergeKey Stable merge key.
 * @returns {void}
 */
function applyUpdateMergeAction(nextState, transaction, mergeKey) {
  nextState.transactionsByMergeKey[mergeKey] = transaction;
}

const MERGE_ACTION_APPLIERS = {
  insert: applyInsertMergeAction,
  skip() {},
  update: applyUpdateMergeAction,
};

/**
 * Apply a merge action to the storage state and report list.
 * @param {{
 *   action: 'insert' | 'skip' | 'update',
 *   nextState: LedgerStorageState,
 *   transaction: LedgerIngestTransaction,
 *   existing: LedgerIngestTransaction | undefined,
 *   actions: LedgerStorageAction[],
 * }} options Merge action details.
 * @returns {void}
 */
function recordMergeAction(options) {
  const { action, nextState, transaction, existing, actions } = options;
  const mergeKey = getTransactionMergeKey(transaction);
  MERGE_ACTION_APPLIERS[action](nextState, transaction, mergeKey);

  actions.push(createMergeAction(action, transaction, existing));
}

/**
 * Merge one canonical transaction into the persisted storage state.
 * @param {LedgerStorageState} nextState Next storage state being assembled.
 * @param {LedgerIngestTransaction} transaction Incoming canonical transaction.
 * @param {LedgerStorageAction[]} actions Merge actions emitted by the run.
 * @returns {void}
 */
function mergeCanonicalTransaction(nextState, transaction, actions) {
  const mergeKey = getTransactionMergeKey(transaction);
  const existing = nextState.transactionsByMergeKey[mergeKey];
  const operation = getMergeTransactionOperation(existing, transaction);

  recordMergeAction({
    action: operation,
    nextState,
    transaction,
    existing,
    actions,
  });
}

/**
 * Merge canonical transactions into the persisted storage state.
 * @param {LedgerStorageState} storedState Current persisted state.
 * @param {LedgerIngestTransaction[]} canonicalTransactions Canonical rows from the import core.
 * @returns {{ nextState: LedgerStorageState, actions: LedgerStorageAction[] }} Updated state and merge actions.
 */
function mergeLedgerStorageState(storedState, canonicalTransactions) {
  const nextState = {
    transactionOrder: [...storedState.transactionOrder],
    transactionsByMergeKey: { ...storedState.transactionsByMergeKey },
  };
  /** @type {LedgerStorageAction[]} */
  const actions = [];

  canonicalTransactions.forEach(transaction => {
    mergeCanonicalTransaction(nextState, transaction, actions);
  });

  return { nextState, actions };
}

/**
 * Build the storage report that accompanies the import output.
 * @param {{
 *   storageKey: string,
 *   beforeState: LedgerStorageState,
 *   afterState: LedgerStorageState,
 *   actions: LedgerStorageAction[],
 * }} options Report assembly options.
 * @returns {Record<string, unknown>} Storage report payload.
 */
function buildStorageReport(options) {
  const { storageKey, beforeState, afterState, actions } = options;
  return {
    storageKey,
    beforeCount: beforeState.transactionOrder.length,
    afterCount: afterState.transactionOrder.length,
    actions,
    transactions: afterState.transactionOrder.map(
      mergeKey => afterState.transactionsByMergeKey[mergeKey]
    ),
  };
}

/**
 * Run the ledger-ingest import and persist the canonical transactions into permanent storage.
 * @param {string} input Serialized toy input.
 * @param {{ get?: (name: string) => unknown } | null | undefined} env Toy runtime environment.
 * @returns {string} JSON report including import results and storage merge metadata.
 */
export function ledgerIngestStorageToy(input, env) {
  const parsedInput = parseJsonOrFallback(input, {});
  const importResult = parseJsonOrFallback(ledgerIngestToy(input), {});
  const storageKey = resolveStorageKey(parsedInput);
  const currentRoot = readPermanentStorageRoot(env);
  const currentState = normalizeLedgerStorageState(currentRoot[storageKey]);
  const mergeResult = mergeLedgerStorageState(
    currentState,
    /** @type {LedgerIngestTransaction[]} */ (
      importResult.canonicalTransactions
    )
  );
  const nextRoot = {
    ...currentRoot,
    [storageKey]: mergeResult.nextState,
  };

  persistPermanentStorageRoot(env, nextRoot);

  return JSON.stringify({
    ...importResult,
    storage: buildStorageReport({
      storageKey,
      beforeState: currentState,
      afterState: mergeResult.nextState,
      actions: mergeResult.actions,
    }),
  });
}

export const ledgerIngestStorageToyTestOnly = {
  resolveStorageKey,
  readPermanentStorageRoot,
  persistPermanentStorageRoot,
  createEmptyLedgerStorageState,
  normalizeLedgerStorageState,
  normalizeTransactionOrder,
  normalizeTransactionMap,
  getTransactionMergeKey,
  isUnchangedTransaction,
  mergeLedgerStorageState,
  buildStorageReport,
};
