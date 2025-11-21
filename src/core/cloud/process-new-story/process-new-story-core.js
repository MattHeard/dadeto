import { findAvailablePageNumber as defaultFindAvailablePageNumber } from '../process-new-page/process-new-page-core.js';

/**
 * @typedef {import('firebase-admin/firestore').Firestore} Firestore
 * @typedef {import('firebase-admin/firestore').FieldValue} FieldValue
 * @typedef {import('firebase-admin/firestore').DocumentReference} DocumentReference
 * @typedef {import('firebase-admin/firestore').WriteBatch} WriteBatch
 * @typedef {import('firebase-admin/firestore').DocumentSnapshot | import('firebase-admin/firestore').QueryDocumentSnapshot} FirestoreDocumentSnapshot
 */

/**
 * Ensure the provided database exposes the Firestore helpers used by the handler.
 * @param {{ doc: (path: string) => DocumentReference, batch: () => WriteBatch }} db Firestore instance to assert.
 * @returns {void}
 */
function assertDb(db) {
  ensureFirestoreHelperMethod(db, 'doc');
  ensureFirestoreHelperMethod(db, 'batch');
}

/**
 * Ensure the Firestore helper exposes the named method.
 * @param {{ [key: string]: unknown }} db Candidate Firestore instance.
 * @param {string} method Method name to validate.
 */
function ensureFirestoreHelperMethod(db, method) {
  if (typeof db?.[method] !== 'function') {
    throw new TypeError('db must expose doc and batch helpers');
  }
}

/**
 * Ensure the provided FieldValue helper offers the required APIs.
 * @param {{ serverTimestamp: () => FieldValue, increment: (value: number) => FieldValue }} fieldValue FieldValue helper to assert.
 * @returns {void}
 */
function assertFieldValue(fieldValue) {
  ensureFieldValueMethod(
    fieldValue,
    'serverTimestamp',
    'fieldValue.serverTimestamp must be a function'
  );
  ensureFieldValueMethod(
    fieldValue,
    'increment',
    'fieldValue.increment must be a function'
  );
}

/**
 * Ensure the helper exposes the required method.
 * @param {{ [key: string]: unknown }} fieldValue FieldValue helper candidate.
 * @param {string} method Method name to validate.
 * @param {string} errorMessage Error message when the helper is missing the method.
 */
function ensureFieldValueMethod(fieldValue, method, errorMessage) {
  if (typeof fieldValue?.[method] !== 'function') {
    throw new TypeError(errorMessage);
  }
}

/**
 * Ensure the provided random helper is callable.
 * @param {() => number} random Random number generator to assert.
 * @returns {void}
 */
function assertRandom(random) {
  if (typeof random !== 'function') {
    throw new TypeError('random must be a function');
  }
}

/**
 * Ensure the provided UUID helper is callable.
 * @param {() => string} randomUUID UUID generator to assert.
 * @returns {void}
 */
function assertRandomUuid(randomUUID) {
  if (typeof randomUUID !== 'function') {
    throw new TypeError('randomUUID must be a function');
  }
}

/**
 * Extract submission data from an incoming Firestore snapshot.
 * @param {FirestoreDocumentSnapshot | null | undefined} snapshot Snapshot captured by the trigger.
 * @returns {Record<string, unknown> | null} Submission payload when available.
 */
function getSubmissionData(snapshot) {
  return typeof snapshot?.data === 'function' ? snapshot.data() : null;
}

/**
 * Resolve a function that returns the Firestore server timestamp helper.
 * @param {{ serverTimestamp: () => FieldValue }} fieldValue FieldValue helper provided to the handler.
 * @returns {() => FieldValue} Function returning a server timestamp FieldValue.
 */
function resolveServerTimestamp(fieldValue) {
  return () => fieldValue.serverTimestamp();
}

/**
 * Normalize submission options into an array of strings.
 * @param {unknown} options Incoming options payload.
 * @returns {string[]} Normalized options array.
 */
function normalizeOptions(options) {
  if (Array.isArray(options)) {
    return options;
  }

  return [];
}

/**
 * Resolve the author document reference when an author identifier is available.
 * @param {Firestore} db Firestore instance used to build references.
 * @param {string | null | undefined} authorId Author identifier supplied by the submission.
 * @returns {DocumentReference | null} Reference to the author document or null when unavailable.
 */
function resolveAuthorRef(db, authorId) {
  const normalizedId = normalizeIdentifier(authorId);
  if (!normalizedId) {
    return null;
  }

  return db.doc(`authors/${normalizedId}`);
}

/**
 * Normalize a potential identifier to a non-empty string.
 * @param {unknown} value Candidate value that may contain an identifier.
 * @returns {string | null} Identifier when valid.
 */
function normalizeIdentifier(value) {
  return isNonEmptyString(value) ? value : null;
}

/**
 * Determine whether a value is a non-empty string.
 * @param {unknown} value Candidate value.
 * @returns {value is string} True when the value is a non-empty string.
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value !== '';
}

/**
 * Resolve the story identifier prioritized by context, then the snapshot, and finally a random UUID.
 * @param {FirestoreDocumentSnapshot | null | undefined} snapshot Snapshot captured by the trigger.
 * @param {{ params?: Record<string, string> } | undefined} context Trigger execution context.
 * @param {() => string} randomUUID UUID generator provided to the handler.
 * @returns {string} Story identifier.
 */
function resolveStoryId(snapshot, context, randomUUID) {
  return (
    pickFirstIdentifier([
      normalizeIdentifier(context?.params?.subId),
      normalizeIdentifier(snapshot?.id),
    ]) ?? randomUUID()
  );
}

/**
 * Pick the first truthy identifier from the provided list.
 * @param {(string | null)[]} identifiers Candidate identifiers.
 * @returns {string | null} First truthy identifier or null.
 */
function pickFirstIdentifier(identifiers) {
  return identifiers.find(Boolean) ?? null;
}

/**
 * Resolve identifiers required to persist a new story submission.
 * @param {FirestoreDocumentSnapshot | null | undefined} snapshot Snapshot captured by the trigger.
 * @param {{ params?: Record<string, string> } | undefined} context Trigger execution context.
 * @param {() => string} randomUUID UUID generator provided to the handler.
 * @returns {{ storyId: string, pageId: string, variantId: string }} Identifiers for the story graph.
 */
function resolveStoryIdentifiers(snapshot, context, randomUUID) {
  const storyId = resolveStoryId(snapshot, context, randomUUID);

  return {
    storyId,
    pageId: randomUUID(),
    variantId: randomUUID(),
  };
}

/**
 * Build the document references required to store a new story submission.
 * @param {Firestore} db Firestore instance.
 * @param {{ storyId: string, pageId: string, variantId: string }} identifiers Identifiers describing the story graph.
 * @returns {{ storyRef: DocumentReference, pageRef: DocumentReference, variantRef: DocumentReference }} Firestore references.
 */
function createStoryReferences(db, { storyId, pageId, variantId }) {
  const storyRef = db.doc(`stories/${storyId}`);
  const pageRef = storyRef.collection('pages').doc(pageId);
  const variantRef = pageRef.collection('variants').doc(variantId);

  return { storyRef, pageRef, variantRef };
}

/**
 * Queue writes for variant options associated with the submission.
 * @param {object} options Collaborators required to queue option writes.
 * @param {WriteBatch} options.batch Firestore batch instance.
 * @param {Record<string, unknown>} options.submission Submission payload to inspect.
 * @param {import('firebase-admin/firestore').DocumentReference} options.variantRef Variant document reference.
 * @param {() => string} options.randomUUID UUID generator.
 * @param {() => FieldValue} options.getServerTimestamp Function returning server timestamps.
 * @returns {void}
 */
function queueVariantOptions({
  batch,
  submission,
  variantRef,
  randomUUID,
  getServerTimestamp,
}) {
  normalizeOptions(submission.options).forEach((text, position) => {
    const optionRef = variantRef.collection('options').doc(randomUUID());

    batch.set(optionRef, {
      content: text,
      createdAt: getServerTimestamp(),
      position,
    });
  });
}

/**
 * Queue writes that persist the submission and its options.
 * @param {object} options Collaborators and values required to queue writes.
 * @param {WriteBatch} options.batch Firestore batch instance.
 * @param {Firestore} options.db Firestore instance.
 * @param {{ storyRef: DocumentReference, pageRef: DocumentReference, variantRef: DocumentReference }} options.refs Firestore references.
 * @param {Record<string, unknown>} options.submission Submission payload to persist.
 * @param {number} options.pageNumber Page number assigned to the story.
 * @param {() => number} options.random Random number generator.
 * @param {() => string} options.randomUUID UUID generator.
 * @param {() => FieldValue} options.getServerTimestamp Function returning server timestamps.
 * @param {string} options.storyId Story identifier used for stats documents.
 * @param {FirestoreDocumentSnapshot | null | undefined} options.snapshot Original snapshot reference.
 * @returns {void}
 */
function queueSubmissionWrites({
  batch,
  db,
  refs,
  submission,
  pageNumber,
  random,
  randomUUID,
  getServerTimestamp,
  storyId,
  snapshot,
}) {
  const { storyRef, pageRef, variantRef } = refs;

  batch.set(storyRef, {
    title: submission.title,
    rootPage: pageRef,
    createdAt: getServerTimestamp(),
  });

  batch.set(pageRef, {
    number: pageNumber,
    incomingOption: null,
    createdAt: getServerTimestamp(),
  });

  batch.set(variantRef, {
    name: 'a',
    content: submission.content,
    authorId: submission.authorId || null,
    authorName: submission.author,
    moderatorReputationSum: 0,
    rand: random(),
    createdAt: getServerTimestamp(),
  });

  queueVariantOptions({
    batch,
    submission,
    variantRef,
    randomUUID,
    getServerTimestamp,
  });

  batch.set(db.doc(`storyStats/${storyId}`), { variantCount: 1 });
  batch.update(snapshot?.ref, { processed: true });
}

/**
 * Ensure the author's document exists when an author identifier is provided.
 * @param {object} options Collaborators required to verify the author document.
 * @param {WriteBatch} options.batch Firestore batch instance.
 * @param {Firestore} options.db Firestore instance.
 * @param {Record<string, unknown>} options.submission Submission payload to inspect.
 * @param {() => string} options.randomUUID UUID generator.
 * @returns {Promise<void>} Resolves once the author document is scheduled for creation when needed.
 */
async function ensureAuthorRecord({ batch, db, submission, randomUUID }) {
  const authorRef = resolveAuthorRef(db, submission.authorId);

  if (!authorRef) {
    return;
  }

  const authorSnap = await authorRef.get();

  if (!authorSnap?.exists) {
    batch.set(authorRef, { uuid: randomUUID() });
  }
}

/**
 * Create the handler that processes new story submissions.
 * @param {object} options Collaborators required by the handler.
 * @param {Firestore} options.db Firestore instance.
 * @param {{ serverTimestamp: () => FieldValue, increment: (value: number) => FieldValue }} options.fieldValue FieldValue helper with timestamp and increment helpers.
 * @param {() => string} options.randomUUID UUID generator.
 * @param {() => number} [options.random] Random number generator (defaults to Math.random).
 * @param {(db: Firestore, random?: () => number) => Promise<number>} [options.findAvailablePageNumberFn] Resolver that returns an unused page number. Defaults to defaultFindAvailablePageNumber.
 * @returns {(snap: FirestoreDocumentSnapshot | null | undefined, context: { params?: Record<string, string> }) => Promise<null>} Firestore trigger handler.
 */
export function createProcessNewStoryHandler({
  db,
  fieldValue,
  randomUUID,
  random = Math.random,
  findAvailablePageNumberFn = defaultFindAvailablePageNumber,
}) {
  assertDb(db);
  assertFieldValue(fieldValue);
  assertRandom(random);
  assertRandomUuid(randomUUID);

  if (typeof findAvailablePageNumberFn !== 'function') {
    throw new TypeError('findAvailablePageNumber must be a function');
  }

  const getServerTimestamp = resolveServerTimestamp(fieldValue);

  return async function handleProcessNewStory(snapshot, context = {}) {
    const submission = getSubmissionData(snapshot) ?? {};

    if (submission.processed) {
      return null;
    }

    const identifiers = resolveStoryIdentifiers(snapshot, context, randomUUID);
    const pageNumber = await findAvailablePageNumberFn(db, random);
    const refs = createStoryReferences(db, identifiers);
    const batch = db.batch();

    queueSubmissionWrites({
      batch,
      db,
      refs,
      submission,
      pageNumber,
      random,
      randomUUID,
      getServerTimestamp,
      storyId: identifiers.storyId,
      snapshot,
    });

    await ensureAuthorRecord({ batch, db, submission, randomUUID });

    await batch.commit();
    return null;
  };
}
