const AUDIT_EVENT_TYPES = new Set([
  'session-started',
  'session-finished',
  'run-failed',
  'run-interrupted',
]);
const GENESIS_HASH = '0'.repeat(64);

/**
 * Create an append-only JSONL audit ledger with a verifiable SHA-256 chain.
 * @param {{ledgerPath: string, pathModule: {dirname: (path: string) => string}, mkdirImpl: Function, readFileImpl: Function, appendFileImpl: Function, sha256Impl: (value: string) => string}} options Injected file and digest effects.
 * @returns {{append: (eventType: string, payload: Record<string, any>) => Promise<Record<string, any>>, readAll: () => Promise<Array<Record<string, any>>>}} Ledger operations.
 */
export function createAlgZooAuditLedgerCore(options) {
  if (
    typeof options?.ledgerPath !== 'string' ||
    options.ledgerPath.trim() === '' ||
    typeof options?.sha256Impl !== 'function' ||
    typeof options?.readFileImpl !== 'function' ||
    typeof options?.appendFileImpl !== 'function' ||
    typeof options?.mkdirImpl !== 'function' ||
    typeof options?.pathModule?.dirname !== 'function'
  ) {
    throw new TypeError(
      'A ledger path and injected file/digest effects are required.'
    );
  }
  /** @type {Promise<unknown>} */
  let appendQueue = Promise.resolve();
  const readAll = async () => {
    const content = await readLedgerContent(options);
    if (content === '') return [];
    const lines = content.split('\n');
    if (lines.at(-1) === '') lines.pop();
    if (lines.some(line => line.trim() === '')) {
      throw new Error('Audit ledger contains an empty record.');
    }
    const records = lines.map(parseLedgerLine);
    verifyAuditChain(records, options.sha256Impl);
    return records;
  };
  const append = (
    /** @type {string} */ eventType,
    /** @type {Record<string, any>} */ payload
  ) => {
    const task = appendQueue.then(async () => {
      validateAuditPayload(eventType, payload);
      const records = await readAll();
      const previousHash = records.at(-1)?.hash ?? GENESIS_HASH;
      const record = {
        sequence: records.length + 1,
        eventType,
        payload: canonicalizeValue(payload),
        previousHash,
      };
      const completeRecord = {
        ...record,
        hash: options.sha256Impl(canonicalJson(record)),
      };
      await options.mkdirImpl(options.pathModule.dirname(options.ledgerPath), {
        recursive: true,
        mode: 0o700,
      });
      await options.appendFileImpl(
        options.ledgerPath,
        `${canonicalJson(completeRecord)}\n`,
        { encoding: 'utf8', mode: 0o600 }
      );
      return completeRecord;
    });
    appendQueue = task.catch(() => {});
    return task;
  };
  return Object.freeze({ append, readAll });
}

/**
 * @param {Record<string, any>} options Injected ledger dependencies.
 * @returns {Promise<string>} Current JSONL content or an empty string.
 */
async function readLedgerContent(options) {
  try {
    return await options.readFileImpl(options.ledgerPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
}

/**
 * @param {string} line JSONL record.
 * @returns {Record<string, any>} Parsed record.
 */
function parseLedgerLine(line) {
  try {
    const record = JSON.parse(line);
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error('record is not an object');
    }
    return record;
  } catch {
    throw new Error('Audit ledger contains malformed JSON.');
  }
}

/**
 * @param {Array<Record<string, any>>} records Ledger records.
 * @param {(value: string) => string} sha256Impl Injected SHA-256 implementation.
 * @returns {void} Throws when any record is inconsistent.
 */
function verifyAuditChain(records, sha256Impl) {
  let previousHash = GENESIS_HASH;
  records.forEach((record, index) => {
    validateAuditPayload(record.eventType, record.payload);
    const { hash, ...unsignedRecord } = record;
    if (
      record.sequence !== index + 1 ||
      record.previousHash !== previousHash ||
      typeof hash !== 'string' ||
      hash !== sha256Impl(canonicalJson(unsignedRecord))
    ) {
      throw new Error(
        `Audit ledger hash chain is invalid at record ${index + 1}.`
      );
    }
    previousHash = hash;
  });
}

/**
 * @param {string} eventType Lifecycle event name.
 * @param {unknown} payload Data persisted for this event.
 * @returns {void} Throws when the payload is invalid.
 */
function validateAuditPayload(eventType, payload) {
  if (!AUDIT_EVENT_TYPES.has(eventType)) {
    throw new TypeError('Audit event type is not supported.');
  }
  if (
    payload === null ||
    typeof payload !== 'object' ||
    Array.isArray(payload) ||
    containsHeldOutKey(payload)
  ) {
    throw new TypeError(
      'Audit payload must be a record without held-out fields.'
    );
  }
  canonicalizeValue(payload);
}

/**
 * @param {unknown} value Candidate audit payload.
 * @returns {boolean} Whether it contains held-out fields.
 */
function containsHeldOutKey(value) {
  if (Array.isArray(value)) return value.some(containsHeldOutKey);
  if (value === null || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, child]) =>
      /held.?out|ground.?truth|evaluator.?input/i.test(key) ||
      containsHeldOutKey(child)
  );
}

/**
 * @param {unknown} value JSON-compatible value.
 * @returns {unknown} Canonical clone.
 */
function canonicalizeValue(value) {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(canonicalizeValue);
  if (typeof value === 'object') {
    const record = /** @type {Record<string, unknown>} */ (value);
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, canonicalizeValue(record[key])])
    );
  }
  throw new TypeError('Audit payload contains a non-JSON value.');
}

/**
 * @param {unknown} value Canonicalizable JSON value.
 * @returns {string} Stable JSON.
 */
function canonicalJson(value) {
  return JSON.stringify(canonicalizeValue(value));
}
