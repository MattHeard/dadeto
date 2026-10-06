// Stryker disable all -- this module is the fixed fake Firestore simulator
// boundary covered by its focused simulator contract suite.
import { isPlainPrototypeObject } from '../../commonCore.js';
const DELETE_FIELD = Symbol('delete-field');

/** @typedef {{ path: string, nextData?: unknown, mode: 'set'|'update'|'delete' }} FakeWriteOperation */
/** @typedef {{ kind: 'collection'; collectionSegments: string[] } | { kind: 'collectionGroup'; collectionId: string }} FakeQuerySource */
/** @typedef {{ type: 'where'; field: string; op: string; value: unknown } | { type: 'orderBy'; field: string; direction: 'asc'|'desc' } | { type: 'limit'; value: number }} FakeQueryClause */

class IncrementValue {
  /** @param {number} amount Increment amount. */
  constructor(amount) {
    this.amount = amount;
  }
}

class ServerTimestampValue {
  /** @param {Date} value Timestamp value. */
  constructor(value) {
    this.value = value;
  }
}

/**
 * Create a fake Firestore field-value helper.
 * @param {() => Date} now - Clock callback used for server timestamps.
 * @returns {{
 *   serverTimestamp: () => ServerTimestampValue,
 *   increment: (amount: number) => IncrementValue,
 *   delete: () => symbol
 * }} Field value helper.
 */
export function createFakeFieldValue(now = () => new Date()) {
  return {
    serverTimestamp() {
      return new ServerTimestampValue(now());
    },
    increment(/** @type {number} */ amount) {
      return new IncrementValue(amount);
    },
    delete() {
      return DELETE_FIELD;
    },
  };
}

/**
 * Create an in-memory Firestore-like database.
 * @param {{ onCommit?: (records: Array<{path: string, before?: unknown, after?: unknown}>) => Promise<void>|void }} [options] - Configuration.
 *   Commit callback.
 * @returns {FakeFirestoreShim} Fake Firestore instance.
 */
export function createFakeFirestore({ onCommit } = {}) {
  /** @type {Map<string, unknown>} */
  const state = new Map();

  class FakeFirestore {
    collection(/** @type {string} */ name) {
      return new FakeCollectionReference(this, [name]);
    }

    collectionGroup(/** @type {string} */ name) {
      return new FakeQuery(this, {
        kind: 'collectionGroup',
        collectionId: name,
      });
    }

    doc(/** @type {string} */ path) {
      return new FakeDocumentReference(this, path);
    }

    batch() {
      return new FakeWriteBatch(this);
    }

    runTransaction(
      /** @type {(transaction: FakeTransaction) => Promise<unknown>} */ updateFunction
    ) {
      return runFakeTransaction(this, updateFunction);
    }

    async __commitOperations(/** @type {FakeWriteOperation[]} */ operations) {
      return applyOperations(operations);
    }

    async __getDocument(/** @type {string} */ path) {
      return cloneDocument(state.get(path));
    }

    async __writeDocument(
      /** @type {string} */ path,
      /** @type {unknown} */ nextData,
      /** @type {'set'|'update'|'delete'} */ mode = 'set'
    ) {
      return this.__commitOperations([{ path, nextData, mode }]);
    }

    __getCollectionDocuments(/** @type {string[]} */ collectionSegments) {
      return collectDocuments(state, path =>
        isCollectionDocumentPath(path, collectionSegments)
      );
    }

    __getCollectionGroupDocuments(/** @type {string} */ collectionId) {
      return collectDocuments(state, path =>
        isCollectionGroupDocumentPath(path, collectionId)
      );
    }

    __resolveDocumentSnapshot(/** @type {string} */ path) {
      const data = state.get(path);
      return buildDocumentSnapshot(this, path, buildSnapshotData(data));
    }

    __getPathData(/** @type {string} */ path) {
      return state.get(path);
    }

    __setPathData(/** @type {string} */ path, /** @type {unknown} */ data) {
      state.set(path, data);
    }

    __deletePathData(/** @type {string} */ path) {
      state.delete(path);
    }
  }

  /**
   * Apply a batch of write operations to the in-memory state.
   * @param {Array<{path: string, nextData?: unknown, mode: 'set'|'update'|'delete'}>} operations
   *   Operations to apply.
   * @returns {Promise<undefined>} Nothing.
   */
  async function applyOperations(
    /** @type {FakeWriteOperation[]} */ operations
  ) {
    const touched = new Map();
    for (const operation of operations) {
      const before = cloneDocument(state.get(operation.path));
      const after = resolveOperation(state.get(operation.path), operation);
      if (after === undefined) {
        state.delete(operation.path);
      } else {
        state.set(operation.path, after);
      }

      touched.set(operation.path, {
        before,
        after: buildSnapshotData(after),
      });
    }

    if (typeof onCommit === 'function') {
      await onCommit(buildEventsFromTouched(touched, operations));
    }

    return undefined;
  }

  /**
   * Execute a fake Firestore transaction against the current state.
   * @param {FakeFirestore} db Fake Firestore instance.
   * @param {(transaction: FakeTransaction) => Promise<unknown>} updateFunction
   *   Transaction callback.
   * @returns {Promise<unknown>} Transaction callback result.
   */
  async function runFakeTransaction(
    /** @type {FakeFirestoreShim} */ db,
    /** @type {(transaction: FakeTransaction) => Promise<unknown>} */ updateFunction
  ) {
    const transaction = new FakeTransaction(db);
    const result = await updateFunction(transaction);
    await db.__commitOperations(transaction.operations);
    return result;
  }

  return new FakeFirestore();
}

export const fakeFirestoreTestUtils = {
  getFieldValue,
  matchesPrefix,
  buildEventsFromTouched,
  cloneDocument,
  resolveOperation,
  normalizeWrittenValue,
};

/**
 * Collect cloned documents matching a path predicate.
 * @param {Map<string, unknown>} state In-memory document state.
 * @param {(path: string) => boolean} matchesPath Collection path predicate.
 * @returns {Array<{path: string, data: unknown}>} Matching document records.
 */
function collectDocuments(state, matchesPath) {
  const docs = [];
  for (const [path, data] of state.entries()) {
    if (matchesPath(path)) {
      docs.push({ path, data: cloneDocument(data) });
    }
  }
  return docs;
}

/**
 * Check whether a path identifies a collection document.
 * @param {string} path Document path.
 * @param {string[]} collectionSegments Collection path segments.
 * @returns {boolean} Whether the path matches.
 */
function isCollectionDocumentPath(path, collectionSegments) {
  const segments = splitPath(path);
  return (
    segments.length === collectionSegments.length + 1 &&
    matchesPrefix(segments, collectionSegments)
  );
}

/**
 * Check whether a path identifies a collection-group document.
 * @param {string} path Document path.
 * @param {string} collectionId Collection id.
 * @returns {boolean} Whether the path matches.
 */
function isCollectionGroupDocumentPath(path, collectionId) {
  const segments = splitPath(path);
  return (
    segments.length % 2 === 0 && containsCollectionId(segments, collectionId)
  );
}

/**
 * Build a query snapshot from matching documents.
 * @param {FakeFirestoreShim} db Fake Firestore database.
 * @param {Array<{ path: string, data: unknown }>} docs Matching documents.
 * @returns {FakeQuerySnapshot} Query snapshot containing the documents.
 */
function buildQuerySnapshot(db, docs) {
  return new FakeQuerySnapshot(
    docs.map(({ path, data }) => buildDocumentSnapshot(db, path, data))
  );
}

class FakeWriteBatch {
  constructor(/** @type {FakeFirestoreShim} */ db) {
    this.db = db;
    /** @type {FakeWriteOperation[]} */
    this.operations = [];
  }

  set(/** @type {{ path: string }} */ ref, /** @type {unknown} */ data) {
    queueWriteOperation(this.operations, ref, data, 'set');
    return this;
  }

  update(/** @type {{ path: string }} */ ref, /** @type {unknown} */ data) {
    queueWriteOperation(this.operations, ref, data, 'update');
    return this;
  }

  delete(/** @type {{ path: string }} */ ref) {
    queueWriteOperation(this.operations, ref, undefined, 'delete');
    return this;
  }

  async commit() {
    await this.db.__commitOperations(this.operations);
  }
}

class FakeTransaction extends FakeWriteBatch {
  async get(/** @type {{ get: () => Promise<unknown> }} */ ref) {
    return ref.get();
  }
}

/**
 * Queue a normalized write operation for a batch or transaction.
 * @param {Array<{path: string, nextData?: unknown, mode: 'set'|'update'|'delete'}>} operations Operation queue.
 * @param {{path: string}} ref Document reference.
 * @param {unknown} data Incoming document data.
 * @param {'set'|'update'|'delete'} mode Write mode.
 * @returns {void}
 */
function queueWriteOperation(operations, ref, data, mode) {
  let nextData;
  if (data !== undefined) nextData = cloneDocument(data);
  operations.push({
    path: ref.path,
    nextData,
    mode,
  });
}

class FakeCollectionReference {
  constructor(
    /** @type {FakeFirestoreShim} */ db,
    /** @type {string[]} */ collectionSegments
  ) {
    this.db = db;
    this.collectionSegments = collectionSegments;
    this.path = collectionSegments.join('/');
    if (collectionSegments.length > 1) {
      this.parent = new FakeDocumentReference(
        db,
        collectionSegments.slice(0, -1)
      );
    } else {
      this.parent = null;
    }
  }

  doc(/** @type {string} */ id) {
    return new FakeDocumentReference(this.db, [...this.collectionSegments, id]);
  }

  async get() {
    return buildQuerySnapshot(
      this.db,
      this.db.__getCollectionDocuments(this.collectionSegments)
    );
  }

  count() {
    return createCollectionQuery(this.db, this.collectionSegments).count();
  }

  where(
    /** @type {string} */ fieldPath,
    /** @type {string} */ operator,
    /** @type {unknown} */ expectedValue
  ) {
    return createCollectionQuery(this.db, this.collectionSegments).where(
      fieldPath,
      operator,
      expectedValue
    );
  }

  orderBy(/** @type {string} */ field, /** @type {'asc'|'desc'} */ direction) {
    return createCollectionQuery(this.db, this.collectionSegments).orderBy(
      field,
      direction
    );
  }

  limit(/** @type {number} */ value) {
    return createCollectionQuery(this.db, this.collectionSegments).limit(value);
  }
}

class FakeDocumentReference {
  constructor(
    /** @type {FakeFirestoreShim} */ db,
    /** @type {string[] | string} */ segments
  ) {
    this.db = db;
    if (Array.isArray(segments)) {
      this.segments = segments;
    } else {
      this.segments = splitPath(segments);
    }
    this.path = this.segments.join('/');
    this.id = this.segments[this.segments.length - 1];
    this.parent = new FakeCollectionReference(db, this.segments.slice(0, -1));
  }

  collection(/** @type {string} */ name) {
    return new FakeCollectionReference(this.db, [...this.segments, name]);
  }

  async get() {
    return this.db.__resolveDocumentSnapshot(this.path);
  }

  async set(
    /** @type {unknown} */ data,
    /** @type {{ merge?: boolean }} */ options = {}
  ) {
    if (options.merge) {
      const existing = await this.db.__getDocument(this.path);
      const next = {
        ...(isPlainPrototypeObject(existing) ? existing : {}),
        ...(isPlainPrototypeObject(data) ? data : {}),
      };
      await this.db.__writeDocument(this.path, next, 'set');
      return;
    }
    await this.db.__writeDocument(this.path, cloneDocument(data), 'set');
  }

  async update(/** @type {unknown} */ data) {
    await this.db.__writeDocument(this.path, cloneDocument(data), 'update');
  }

  async delete() {
    await this.db.__writeDocument(this.path, undefined, 'delete');
  }
}

/**
 * Create a collection query.
 * @param {FakeFirestoreShim} db Fake Firestore database.
 * @param {string[]} collectionSegments Collection path segments.
 * @returns {FakeQuery} Collection query.
 */
function createCollectionQuery(db, collectionSegments) {
  return new FakeQuery(db, { kind: 'collection', collectionSegments });
}

class FakeQuery {
  constructor(
    /** @type {FakeFirestoreShim} */ db,
    /** @type {FakeQuerySource} */ source,
    /** @type {FakeQueryClause[]} */ clauses = []
  ) {
    this.db = db;
    this.source = source;
    this.clauses = clauses;
  }

  where(
    /** @type {string} */ field,
    /** @type {string} */ op,
    /** @type {unknown} */ value
  ) {
    return new FakeQuery(this.db, this.source, [
      ...this.clauses,
      { type: 'where', field, op, value },
    ]);
  }

  orderBy(
    /** @type {string} */ field,
    /** @type {'asc'|'desc'} */ direction = 'asc'
  ) {
    return new FakeQuery(this.db, this.source, [
      ...this.clauses,
      { type: 'orderBy', field, direction },
    ]);
  }

  limit(/** @type {number} */ value) {
    return new FakeQuery(this.db, this.source, [
      ...this.clauses,
      { type: 'limit', value },
    ]);
  }

  count() {
    return {
      get: async () => {
        const snap = await this.get();
        return {
          data: () => ({ count: snap.size }),
        };
      },
    };
  }

  async get() {
    return buildQuerySnapshot(this.db, this.resolveDocuments());
  }

  resolveDocuments() {
    const docs = this.getSourceDocuments();
    const filtered = this.applyWhereClauses(docs);
    const ordered = this.applyOrderByClauses(filtered);
    return this.applyLimitClause(ordered);
  }

  getSourceDocuments() {
    if (this.source.kind === 'collection') {
      return this.db.__getCollectionDocuments(this.source.collectionSegments);
    }

    return this.db.__getCollectionGroupDocuments(this.source.collectionId);
  }

  applyWhereClauses(/** @type {Array<{path: string, data: unknown}>} */ docs) {
    return this.clauses.reduce((acc, clause) => {
      if (clause.type !== 'where') {
        return acc;
      }

      return acc.filter(doc =>
        matchesWhere(doc.data, clause.field, clause.op, clause.value)
      );
    }, docs);
  }

  applyOrderByClauses(
    /** @type {Array<{path: string, data: unknown}>} */ docs
  ) {
    const orderings = this.clauses.filter(clause => clause.type === 'orderBy');
    if (orderings.length === 0) {
      return docs;
    }

    const ordered = [...docs];
    ordered.sort((left, right) =>
      compareByOrderings(left.data, right.data, orderings)
    );
    return ordered;
  }

  applyLimitClause(/** @type {Array<{path: string, data: unknown}>} */ docs) {
    const limitClause = [...this.clauses]
      .reverse()
      .find(clause => clause.type === 'limit');
    if (!limitClause) {
      return docs;
    }

    return docs.slice(0, limitClause.value);
  }
}

class FakeQuerySnapshot {
  constructor(/** @type {FakeDocumentSnapshot[]} */ docs) {
    this.docs = docs;
    this.empty = docs.length === 0;
    this.size = docs.length;
  }

  forEach(/** @type {(doc: FakeDocumentSnapshot) => void} */ callback) {
    this.docs.forEach(callback);
  }
}

/**
 * Build a document snapshot for the fake Firestore.
 * @param {FakeFirestoreShim} db - Database instance.
 * @param {string} path - Document path.
 * @param {unknown} data - Document payload.
 * @returns {FakeDocumentSnapshot} Snapshot object.
 */
function buildDocumentSnapshot(db, path, data) {
  const ref = new FakeDocumentReference(db, splitPath(path));
  return new FakeDocumentSnapshot(ref, data);
}

class FakeDocumentSnapshot {
  constructor(
    /** @type {FakeDocumentReference} */ ref,
    /** @type {unknown} */ data
  ) {
    this.ref = ref;
    this.exists = data !== undefined;
    this.id = ref.id;
    this._data = data;
    this.data = this.data.bind(this);
  }

  data() {
    if (this._data === undefined) {
      return undefined;
    }

    return cloneDocument(this._data);
  }
}

/**
 * @typedef {object} FakeFirestoreShim
 * @property {(name: string) => FakeCollectionReference} collection Collection lookup.
 * @property {(name: string) => FakeQuery} collectionGroup Collection-group lookup.
 * @property {(path: string) => FakeDocumentReference} doc Document lookup.
 * @property {() => FakeWriteBatch} batch Batch writer factory.
 * @property {(operations: FakeWriteOperation[]) => Promise<undefined>} __commitOperations Operation writer.
 * @property {(path: string, nextData: unknown, mode?: 'set'|'update'|'delete') => Promise<undefined>} __writeDocument Write helper.
 * @property {(path: string) => Promise<unknown>} __getDocument Read helper.
 * @property {(path: string) => FakeDocumentSnapshot} __resolveDocumentSnapshot Snapshot helper.
 * @property {(collectionSegments: string[]) => Array<{path: string, data: unknown}>} __getCollectionDocuments Collection query helper.
 * @property {(collectionId: string) => Array<{path: string, data: unknown}>} __getCollectionGroupDocuments Collection-group helper.
 * @property {(path: string) => unknown} __getPathData Path-data getter.
 * @property {(path: string, data: unknown) => void} __setPathData Path-data setter.
 * @property {(path: string) => void} __deletePathData Path-data deleter.
 * @property {(updateFunction: (transaction: FakeTransaction) => Promise<unknown>) => Promise<unknown>} runTransaction Transaction helper.
 */

/**
 * Resolve a write operation against an existing document value.
 * @param {unknown} existing - Existing document payload.
 * @param {{mode: 'set'|'update'|'delete', path: string, nextData?: unknown}} operation
 *   Pending write operation.
 * @returns {unknown} Next document payload, or undefined for deletes.
 */
function resolveOperation(existing, operation) {
  if (operation.mode === 'delete') {
    return undefined;
  }

  if (operation.mode === 'set') {
    return normalizeWrittenValue(operation.nextData);
  }

  if (!isPlainObject(existing)) {
    throw new Error(`Cannot update missing document: ${operation.path}`);
  }

  const merged = /** @type {Record<string, unknown>} */ (
    cloneDocument(existing)
  );
  const patch = operation.nextData ?? {};
  if (!isPlainObject(patch)) {
    throw new Error(`Cannot apply non-object update: ${operation.path}`);
  }
  applyPatch(merged, patch);
  return merged;
}

/**
 * Apply a shallow patch object to a document target.
 * @param {Record<string, unknown>} target - Document object to mutate.
 * @param {Record<string, unknown>} patch - Patch payload.
 * @returns {void}
 */
function applyPatch(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    applyFieldPatch(target, key, value);
  }
}

/**
 * Apply a single field patch.
 * @param {Record<string, unknown>} target - Document object to mutate.
 * @param {string} key - Field path.
 * @param {unknown} value - Field value.
 * @returns {void}
 */
function applyFieldPatch(target, key, value) {
  const segments = key.split('.');
  const last = segments.pop();
  if (!last) {
    return;
  }

  let cursor = target;
  for (const segment of segments) {
    const currentChild = cursor[segment];
    const next = isPlainObject(currentChild) ? currentChild : {};
    if (next !== currentChild) cursor[segment] = next;
    cursor = next;
  }

  const current = cursor[last];
  const resolved = resolveFieldValue(current, value);
  if (resolved === DELETE_FIELD) {
    delete cursor[last];
    return;
  }

  cursor[last] = resolved;
}

/**
 * Resolve a field value during a write.
 * @param {unknown} current - Existing field value.
 * @param {unknown} value - Incoming field value.
 * @returns {unknown} Resolved field value.
 */
function resolveFieldValue(current, value) {
  return normalizeWrittenValue(value, current);
}

/**
 * Normalize a written value into a clonable object tree.
 * @param {unknown} value - Value to normalize.
 * @param {unknown} [current] Current stored value.
 * @returns {unknown} Normalized value.
 */
function normalizeWrittenValue(value, current) {
  const specialValue = resolveSpecialWriteValue(value);
  if (specialValue !== undefined) {
    return specialValue;
  }

  if (Array.isArray(value)) {
    return normalizeWrittenArray(value);
  }

  if (value instanceof IncrementValue) {
    let previous = 0;
    if (typeof current === 'number') previous = current;
    return previous + value.amount;
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return normalizeWrittenObject(value);
}

/**
 * Resolve write sentinels that have the same meaning in every write path.
 * @param {unknown} value Candidate write value.
 * @returns {unknown} Resolved sentinel value, or undefined when ordinary handling applies.
 */
function resolveSpecialWriteValue(value) {
  if (value === DELETE_FIELD) {
    return DELETE_FIELD;
  }

  if (value instanceof ServerTimestampValue) {
    return value.value;
  }

  return undefined;
}

/**
 * Test a Firestore-style where clause.
 * @param {unknown} data - Document payload.
 * @param {string} field - Field path.
 * @param {string} op - Comparison operator.
 * @param {unknown} value - Comparison value.
 * @returns {boolean} Whether the document matches.
 */
function matchesWhere(data, field, op, value) {
  if (op !== '==') {
    throw new Error(`Unsupported where operator: ${op}`);
  }

  const candidate = getFieldValue(data, field);
  if (value === null) {
    return candidate === null || candidate === undefined;
  }

  return candidate === value;
}

/**
 * Compare two values using the requested orderings.
 * @param {unknown} left - Left document payload.
 * @param {unknown} right - Right document payload.
 * @param {Array<{field: string, direction: 'asc' | 'desc'}>} orderings - Sort orderings.
 * @returns {number} Sort comparison result.
 */
function compareByOrderings(left, right, orderings) {
  for (const ordering of orderings) {
    const leftValue = getFieldValue(left, ordering.field);
    const rightValue = getFieldValue(right, ordering.field);
    const comparison = compareValues(leftValue, rightValue);
    if (comparison !== 0) {
      if (ordering.direction === 'desc') {
        return -comparison;
      }

      return comparison;
    }
  }

  return 0;
}

/**
 * Compare two scalar values.
 * @param {unknown} left - Left value.
 * @param {unknown} right - Right value.
 * @returns {number} Comparison result.
 */
function compareValues(left, right) {
  const nullComparison = compareNullishValues(left, right);
  if (nullComparison !== null) {
    return nullComparison;
  }
  const comparableLeft = /** @type {string | number} */ (left);
  const comparableRight = /** @type {string | number} */ (right);
  if (comparableLeft < comparableRight) {
    return -1;
  }
  if (comparableLeft > comparableRight) {
    return 1;
  }
  return 0;
}

/**
 * Compare nullish scalar values before regular ordering.
 * @param {unknown} left - Left value.
 * @param {unknown} right - Right value.
 * @returns {number | null} Comparison result or null when both values are non-nullish.
 */
function compareNullishValues(left, right) {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null || left === undefined) {
    return 1;
  }

  if (right === null || right === undefined) {
    return -1;
  }

  return null;
}

/**
 * Build a snapshot-safe clone of a document value.
 * @param {unknown} value - Raw value.
 * @returns {unknown} Snapshot-safe clone.
 */
function buildSnapshotData(value) {
  if (value === undefined) {
    return undefined;
  }

  return cloneDocument(value);
}

/**
 * Normalize an array value.
 * @param {Array<unknown>} value - Array to normalize.
 * @returns {Array<unknown>} Normalized array.
 */
function normalizeWrittenArray(value) {
  return mapArrayValues(value, normalizeWrittenValue);
}

/**
 * Normalize an object value.
 * @param {Record<string, unknown>} value - Object to normalize.
 * @returns {Record<string, unknown>} Normalized object.
 */
function normalizeWrittenObject(value) {
  /** @type {Record<string, unknown>} */
  const output = {};
  for (const [key, nested] of Object.entries(value)) {
    const resolved = normalizeWrittenValue(nested);
    if (resolved !== DELETE_FIELD) {
      output[key] = resolved;
    }
  }
  return output;
}

/**
 * Look up a nested field value from a document payload.
 * @param {unknown} data - Document payload.
 * @param {string} field - Field path.
 * @returns {unknown} Field value or undefined.
 */
function getFieldValue(data, field) {
  if (!isPlainObject(data)) {
    return undefined;
  }

  let cursor = /** @type {unknown} */ (data);
  for (const segment of field.split('.')) {
    if (!isPlainObject(cursor)) {
      return undefined;
    }
    cursor = cursor[segment];
  }
  return cursor;
}

/**
 * Determine whether a path has the given collection prefix.
 * @param {string[]} segments - Full path segments.
 * @param {string[]} prefix - Collection prefix segments.
 * @returns {boolean} Whether the prefix matches.
 */
function matchesPrefix(segments, prefix) {
  if (segments.length !== prefix.length + 1) {
    return false;
  }

  return prefix.every((segment, index) => segments[index] === segment);
}

/**
 * Check whether a path contains a collection id at an even segment.
 * @param {string[]} segments - Path segments.
 * @param {string} collectionId - Collection id.
 * @returns {boolean} Whether the id appears.
 */
function containsCollectionId(segments, collectionId) {
  for (let index = 0; index < segments.length - 1; index += 2) {
    if (segments[index] === collectionId) {
      return true;
    }
  }

  return false;
}

/**
 * Split a Firestore path into segments.
 * @param {string} path - Firestore path.
 * @returns {string[]} Path segments.
 */
function splitPath(path) {
  return normalizePath(path).split('/');
}

/**
 * Normalize a Firestore path string.
 * @param {string} path - Firestore path.
 * @returns {string} Normalized path.
 */
function normalizePath(path) {
  return String(path)
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/+/g, '/');
}

/**
 * Deep-clone a document payload.
 * @param {unknown} value - Value to clone.
 * @returns {unknown} Cloned value.
 */
function cloneDocument(value) {
  if (value === undefined || value === null) {
    return value;
  }

  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  if (value instanceof FakeDocumentReference) {
    return value;
  }

  if (Array.isArray(value)) {
    return mapArrayValues(value, cloneDocument);
  }

  return isPlainObject(value) ? mapObjectValues(value, cloneDocument) : value;
}

/**
 * Map each value in an object.
 * @param {Record<string, unknown>} value Object to map.
 * @param {(value: unknown) => unknown} mapper Value mapper.
 * @returns {Record<string, unknown>} Mapped object.
 */
function mapObjectValues(value, mapper) {
  /** @type {Record<string, unknown>} */
  const output = {};
  for (const [key, nested] of Object.entries(value)) {
    output[key] = mapper(nested);
  }
  return output;
}

/**
 * Map each item in an array with a value transformer.
 * @param {unknown[]} value Array to transform.
 * @param {(value: unknown) => unknown} mapper Value transformer.
 * @returns {unknown[]} Transformed array.
 */
function mapArrayValues(value, mapper) {
  return value.map(mapper);
}

/**
 * Test whether a value is a plain object.
 * @param {unknown} value - Value to inspect.
 * @returns {value is Record<string, unknown>} True when value is a plain object.
 */
function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    isPlainPrototypeObject(value)
  );
}

/**
 * Build change events from touched write records.
 * @param {Map<string, {before: unknown, after: unknown}>} touched - Touched writes.
 * @param {Array<{path: string}>} operations - Applied operations.
 * @returns {Array<{path: string, before: unknown, after: unknown}>} Dispatch events.
 */
function buildEventsFromTouched(touched, operations) {
  const events = [];
  for (const operation of operations) {
    const record = touched.get(operation.path);
    if (!record) {
      continue;
    }

    const { before, after } = record;
    if (before === undefined && after === undefined) {
      continue;
    }

    events.push({
      path: operation.path,
      before,
      after,
    });
  }

  return events;
}
// Stryker restore all
