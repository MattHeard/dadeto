const DELETE_FIELD = Symbol('delete-field');

class IncrementValue {
  constructor(amount) {
    this.amount = amount;
  }
}

class ServerTimestampValue {
  constructor(value) {
    this.value = value;
  }
}

export function createFakeFieldValue(now = () => new Date()) {
  return {
    serverTimestamp() {
      return new ServerTimestampValue(now());
    },
    increment(amount) {
      return new IncrementValue(amount);
    },
    delete() {
      return DELETE_FIELD;
    },
  };
}

export function createFakeFirestore({ onCommit } = {}) {
  const state = new Map();

  class FakeFirestore {
    collection(name) {
      return new FakeCollectionReference(this, [name]);
    }

    collectionGroup(name) {
      return new FakeQuery(this, {
        kind: 'collectionGroup',
        collectionId: name,
      });
    }

    doc(path) {
      return new FakeDocumentReference(this, splitPath(path));
    }

    batch() {
      return new FakeWriteBatch(this);
    }

    async __commitOperations(operations) {
      return applyOperations(operations);
    }

    async __getDocument(path) {
      return cloneDocument(state.get(path));
    }

    async __writeDocument(path, nextData, mode = 'set') {
      return this.__commitOperations([{ path, nextData, mode }]);
    }

    __getCollectionDocuments(collectionSegments) {
      const docs = [];
      for (const [path, data] of state.entries()) {
        const segments = splitPath(path);
        if (segments.length !== collectionSegments.length + 1) {
          continue;
        }

        if (!matchesPrefix(segments, collectionSegments)) {
          continue;
        }

        docs.push({ path, data: cloneDocument(data) });
      }
      return docs;
    }

    __getCollectionGroupDocuments(collectionId) {
      const docs = [];
      for (const [path, data] of state.entries()) {
        const segments = splitPath(path);
        if (segments.length % 2 !== 0) {
          continue;
        }

        if (!containsCollectionId(segments, collectionId)) {
          continue;
        }

        docs.push({ path, data: cloneDocument(data) });
      }
      return docs;
    }

    __resolveDocumentSnapshot(path) {
      const data = state.get(path);
      return buildDocumentSnapshot(this, path, data ? cloneDocument(data) : undefined);
    }

    __getPathData(path) {
      return state.get(path);
    }

    __setPathData(path, data) {
      state.set(path, data);
    }

    __deletePathData(path) {
      state.delete(path);
    }
  }

  async function applyOperations(operations) {
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
        after: after === undefined ? undefined : cloneDocument(after),
      });
    }

    if (typeof onCommit === 'function') {
      await onCommit(buildEventsFromTouched(touched, operations));
    }

    return undefined;
  }

  return new FakeFirestore();
}

class FakeWriteBatch {
  constructor(db) {
    this.db = db;
    this.operations = [];
  }

  set(ref, data) {
    this.operations.push({
      path: ref.path,
      nextData: cloneDocument(data),
      mode: 'set',
    });
    return this;
  }

  update(ref, data) {
    this.operations.push({
      path: ref.path,
      nextData: cloneDocument(data),
      mode: 'update',
    });
    return this;
  }

  delete(ref) {
    this.operations.push({
      path: ref.path,
      nextData: undefined,
      mode: 'delete',
    });
    return this;
  }

  async commit() {
    await this.db.__commitOperations(this.operations);
  }
}

class FakeCollectionReference {
  constructor(db, collectionSegments) {
    this.db = db;
    this.collectionSegments = collectionSegments;
    this.path = collectionSegments.join('/');
    this.parent =
      collectionSegments.length > 1
        ? new FakeDocumentReference(db, collectionSegments.slice(0, -1))
        : null;
  }

  doc(id) {
    return new FakeDocumentReference(this.db, [...this.collectionSegments, id]);
  }

  async get() {
    const docs = this.db.__getCollectionDocuments(this.collectionSegments);
    return new FakeQuerySnapshot(
      docs.map(({ path, data }) => buildDocumentSnapshot(this.db, path, data))
    );
  }

  count() {
    return new FakeQuery(this.db, {
      kind: 'collection',
      collectionSegments: this.collectionSegments,
    }).count();
  }

  where(field, op, value) {
    return new FakeQuery(this.db, {
      kind: 'collection',
      collectionSegments: this.collectionSegments,
    }).where(field, op, value);
  }

  orderBy(field, direction) {
    return new FakeQuery(this.db, {
      kind: 'collection',
      collectionSegments: this.collectionSegments,
    }).orderBy(field, direction);
  }
}

class FakeDocumentReference {
  constructor(db, segments) {
    this.db = db;
    this.segments = Array.isArray(segments) ? segments : splitPath(segments);
    this.path = this.segments.join('/');
    this.id = this.segments[this.segments.length - 1];
    this.parent = new FakeCollectionReference(
      db,
      this.segments.slice(0, -1)
    );
  }

  collection(name) {
    return new FakeCollectionReference(this.db, [...this.segments, name]);
  }

  async get() {
    return this.db.__resolveDocumentSnapshot(this.path);
  }

  async set(data) {
    await this.db.__writeDocument(this.path, cloneDocument(data), 'set');
  }

  async update(data) {
    await this.db.__writeDocument(this.path, cloneDocument(data), 'update');
  }

  async delete() {
    await this.db.__writeDocument(this.path, undefined, 'delete');
  }
}

class FakeQuery {
  constructor(db, source, clauses = []) {
    this.db = db;
    this.source = source;
    this.clauses = clauses;
  }

  where(field, op, value) {
    return new FakeQuery(this.db, this.source, [
      ...this.clauses,
      { type: 'where', field, op, value },
    ]);
  }

  orderBy(field, direction = 'asc') {
    return new FakeQuery(this.db, this.source, [
      ...this.clauses,
      { type: 'orderBy', field, direction },
    ]);
  }

  limit(value) {
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
    const docs = this.resolveDocuments();
    return new FakeQuerySnapshot(
      docs.map(({ path, data }) => buildDocumentSnapshot(this.db, path, data))
    );
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

  applyWhereClauses(docs) {
    return this.clauses.reduce((acc, clause) => {
      if (clause.type !== 'where') {
        return acc;
      }

      return acc.filter(doc => matchesWhere(doc.data, clause.field, clause.op, clause.value));
    }, docs);
  }

  applyOrderByClauses(docs) {
    const orderings = this.clauses.filter(clause => clause.type === 'orderBy');
    if (orderings.length === 0) {
      return docs;
    }

    const ordered = [...docs];
    ordered.sort((left, right) => compareByOrderings(left.data, right.data, orderings));
    return ordered;
  }

  applyLimitClause(docs) {
    const limitClause = [...this.clauses].reverse().find(clause => clause.type === 'limit');
    if (!limitClause) {
      return docs;
    }

    return docs.slice(0, limitClause.value);
  }
}

class FakeQuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.empty = docs.length === 0;
    this.size = docs.length;
  }

  forEach(callback) {
    this.docs.forEach(callback);
  }
}

function buildDocumentSnapshot(db, path, data) {
  const ref = new FakeDocumentReference(db, splitPath(path));
  return new FakeDocumentSnapshot(ref, data);
}

class FakeDocumentSnapshot {
  constructor(ref, data) {
    this.ref = ref;
    this.exists = data !== undefined;
    this.id = ref.id;
    this._data = data;
  }

  data() {
    return this._data === undefined ? undefined : cloneDocument(this._data);
  }
}

function resolveOperation(existing, operation) {
  if (operation.mode === 'delete') {
    return undefined;
  }

  if (operation.mode === 'set') {
    return normalizeWrittenValue(operation.nextData);
  }

  if (!existing) {
    throw new Error(`Cannot update missing document: ${operation.path}`);
  }

  const merged = cloneDocument(existing);
  applyPatch(merged, operation.nextData ?? {});
  return merged;
}

function applyPatch(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    applyFieldPatch(target, key, value);
  }
}

function applyFieldPatch(target, key, value) {
  const segments = key.split('.');
  const last = segments.pop();
  if (!last) {
    return;
  }

  let cursor = target;
  for (const segment of segments) {
    if (!isPlainObject(cursor[segment])) {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  }

  const current = cursor[last];
  const resolved = resolveFieldValue(current, value);
  if (resolved === DELETE_FIELD) {
    delete cursor[last];
    return;
  }

  cursor[last] = resolved;
}

function resolveFieldValue(current, value) {
  if (value === DELETE_FIELD) {
    return DELETE_FIELD;
  }

  if (value instanceof IncrementValue) {
    const base = typeof current === 'number' ? current : 0;
    return base + value.amount;
  }

  if (value instanceof ServerTimestampValue) {
    return value.value;
  }

  return normalizeWrittenValue(value);
}

function normalizeWrittenValue(value) {
  if (value === DELETE_FIELD) {
    return DELETE_FIELD;
  }

  if (value instanceof IncrementValue) {
    return value.amount;
  }

  if (value instanceof ServerTimestampValue) {
    return value.value;
  }

  if (!isPlainObject(value) && !Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => normalizeWrittenValue(item));
  }

  const output = {};
  for (const [key, nested] of Object.entries(value)) {
    const resolved = normalizeWrittenValue(nested);
    if (resolved !== DELETE_FIELD) {
      output[key] = resolved;
    }
  }
  return output;
}

function matchesWhere(data, field, op, value) {
  if (op !== '==') {
    throw new Error(`Unsupported where operator: ${op}`);
  }

  const candidate = getFieldValue(data, field);
  if (value === null) {
    return candidate == null;
  }

  return candidate === value;
}

function compareByOrderings(left, right, orderings) {
  for (const ordering of orderings) {
    const leftValue = getFieldValue(left, ordering.field);
    const rightValue = getFieldValue(right, ordering.field);
    const comparison = compareValues(leftValue, rightValue);
    if (comparison !== 0) {
      return ordering.direction === 'desc' ? -comparison : comparison;
    }
  }

  return 0;
}

function compareValues(left, right) {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return 1;
  }
  if (right == null) {
    return -1;
  }
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function getFieldValue(data, field) {
  if (!isPlainObject(data)) {
    return undefined;
  }

  return field.split('.').reduce((cursor, segment) => {
    if (!isPlainObject(cursor)) {
      return undefined;
    }

    return cursor[segment];
  }, data);
}

function matchesPrefix(segments, prefix) {
  if (segments.length !== prefix.length + 1) {
    return false;
  }

  return prefix.every((segment, index) => segments[index] === segment);
}

function containsCollectionId(segments, collectionId) {
  for (let index = 0; index < segments.length - 1; index += 2) {
    if (segments[index] === collectionId) {
      return true;
    }
  }

  return false;
}

function splitPath(path) {
  return normalizePath(path).split('/');
}

function normalizePath(path) {
  return String(path)
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .replace(/\/+/g, '/');
}

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
    return value.map(item => cloneDocument(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const output = {};
  for (const [key, nested] of Object.entries(value)) {
    output[key] = cloneDocument(nested);
  }
  return output;
}

function isPlainObject(value) {
  return Boolean(value) && Object.getPrototypeOf(value) === Object.prototype;
}

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
