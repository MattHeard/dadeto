import { findAvailablePageNumber as defaultFindAvailablePageNumber } from '../process-new-page/process-new-page-core.js';
import { normalizeHeaderValue, getSnapshotData } from '../cloud-core.js';

let findAvailablePageNumberResolver = defaultFindAvailablePageNumber;

/**
 * Override the page-number resolver, primarily used in tests.
 * @param {(db: Firestore, random?: () => number) => Promise<number>} resolver Resolver to invoke.
 */
export function setFindAvailablePageNumberResolver(resolver) {
  findAvailablePageNumberResolver = resolver;
}

/**
 * Reset the resolver back to the production implementation.
 */
export function resetFindAvailablePageNumberResolver() {
  findAvailablePageNumberResolver = defaultFindAvailablePageNumber;
}

/**
 * @typedef {import('firebase-admin/firestore').Firestore} Firestore
 * @typedef {import('firebase-admin/firestore').FieldValue} FieldValue
 * @typedef {import('firebase-admin/firestore').DocumentReference} DocumentReference
 * @typedef {import('firebase-admin/firestore').WriteBatch} WriteBatch
 * @typedef {import('firebase-admin/firestore').DocumentSnapshot | import('firebase-admin/firestore').QueryDocumentSnapshot} FirestoreDocumentSnapshot
 * @typedef {{ params?: Record<string, string> }} TriggerContext
 */

/**
 * Check if data is a valid object for submission.
 * @param {unknown} data - Data to validate.
 * @returns {boolean} True if valid object.
 */
function isValidSubmissionData(data) {
  return Boolean(data) && typeof data === 'object';
}

/**
 * Extract submission data from an incoming Firestore snapshot.
 * @param {FirestoreDocumentSnapshot | null | undefined} snapshot Snapshot captured by the trigger.
 * @returns {Record<string, unknown> | null} Submission payload when available.
 */
function getSubmissionData(snapshot) {
  const data = getSnapshotData(snapshot);
  if (!isValidSubmissionData(data)) {
    return null;
  }
  return /** @type {Record<string, unknown>} */ (data);
}

/**
 * Normalize the incoming snapshot data to always return an object.
 * @param {FirestoreDocumentSnapshot | null | undefined} snapshot Trigger snapshot to normalize.
 * @returns {Record<string, unknown>} Submission data when present; otherwise an empty object.
 */
function resolveSubmission(snapshot) {
  const submission = getSubmissionData(snapshot);
  return submission ?? {};
}

/**
 * Detect whether the snapshot exposes a data method.
 * @param {FirestoreDocumentSnapshot | null | undefined} snapshot Snapshot to inspect.
 * @returns {snapshot is { data: () => Record<string, unknown> }} True when snapshot exposes data.
 */
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
  if (!isNonEmptyString(value)) {
    return null;
  }

  return value;
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
  const candidate = resolvePreferredStoryIdentifier(snapshot, context);
  if (candidate) {
    return candidate;
  }

  return randomUUID();
}

/**
 * Resolve the preferred story identifier from context, then snapshot.
 * @param {FirestoreDocumentSnapshot | null | undefined} snapshot Snapshot captured by the trigger.
 * @param {{ params?: Record<string, string> } | undefined} context Trigger execution context.
 * @returns {string | null} Identifier when available.
 */
function resolvePreferredStoryIdentifier(snapshot, context) {
  return selectPreferredIdentifier(
    normalizeIdentifier(resolveContextSubId(context)),
    () => normalizeIdentifier(resolveSnapshotId(snapshot))
  );
}

/**
 * Extract the story identifier from the trigger context.
 * @param {{ params?: Record<string, string> } | undefined} context Trigger execution context.
 * @returns {string | undefined} Submission identifier when available.
 */
function resolveContextSubId(context) {
  if (!context) {
    return undefined;
  }

  return resolveParamsSubId(context.params);
}

export { resolveContextSubId };

/**
 * Read the sub identifier from the trigger params when available.
 * @param {{ [key: string]: string } | undefined} params Trigger parameters.
 * @returns {string | undefined} Identifier when present.
 */
function resolveParamsSubId(params) {
  if (!params) {
    return undefined;
  }

  return params.subId;
}

/**
 * Read the document identifier from the incoming snapshot.
 * @param {FirestoreDocumentSnapshot | null | undefined} snapshot Trigger snapshot.
 * @returns {string | undefined} Snapshot identifier when available.
 */
function resolveSnapshotId(snapshot) {
  return snapshot?.id;
}

/**
 * Return the preferred identifier from the primary value or the fallback.
 * @param {string | null} primary Primary identifier candidate.
 * @param {() => string | null} fallback Fallback resolver invoked when primary is absent.
 * @returns {string | null} Chosen identifier.
 */
function selectPreferredIdentifier(primary, fallback) {
  if (primary) {
    return primary;
  }

  return fallback();
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
    authorId: normalizeHeaderValue(submission.authorId),
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
  markSnapshotAsProcessed(batch, snapshot);
}

/**
 * Enqueue the processed marker on the snapshot document when available.
 * @param {WriteBatch} batch Firestore batch instance.
 * @param {FirestoreDocumentSnapshot | null | undefined} snapshot Trigger snapshot.
 * @returns {void}
 */
function markSnapshotAsProcessed(batch, snapshot) {
  const snapshotRef = getSnapshotReference(snapshot);
  if (!snapshotRef) {
    return;
  }

  batch.update(snapshotRef, { processed: true });
}

/**
 * Check if snapshot has a valid ref property.
 * @param {FirestoreDocumentSnapshot | null | undefined} snapshot - Snapshot to check.
 * @returns {boolean} True if snapshot has ref.
 */
function snapshotHasRef(snapshot) {
  return Boolean(snapshot) && 'ref' in /** @type {object} */ (snapshot);
}

/**
 * Resolve the Firestore document reference for a snapshot when available.
 * @param {FirestoreDocumentSnapshot | null | undefined} snapshot Trigger snapshot.
 * @returns {DocumentReference | null} Document reference when present.
 */
function getSnapshotReference(snapshot) {
  if (!snapshotHasRef(snapshot)) {
    return null;
  }
  return /** @type {DocumentReference} */ ((/** @type {any} */ (snapshot)).ref);
}

/**
 * Confirm that a Firestore snapshot exists.
 * @param {FirestoreDocumentSnapshot | null | undefined} snapshot Candidate snapshot.
 * @returns {boolean} True when the snapshot and ref exist.
 */
function isSnapshotAvailable(snapshot) {
  return Boolean(snapshot && snapshot.exists);
}

/**
 * Extract author ID when it's a string.
 * @param {unknown} authorId - Author ID to validate.
 * @returns {string | null} Author ID or null.
 */
function getStringAuthorId(authorId) {
  if (typeof authorId === 'string') {
    return authorId;
  }
  return null;
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
  const resolvedAuthorId = getStringAuthorId(submission.authorId);
  const authorRef = resolveAuthorRef(db, resolvedAuthorId);
  if (!authorRef) {
    return;
  }

  await addAuthorRecordIfMissing(authorRef, batch, randomUUID);
}

/**
 * Create an author document when the reference is missing.
 * @param {DocumentReference} authorRef Author document reference.
 * @param {WriteBatch} batch Write batch used to queue the creation.
 * @param {() => string} randomUUID UUID generator for new documents.
 * @returns {Promise<void>} Resolves once the author record has been scheduled for insertion.
 */
async function addAuthorRecordIfMissing(authorRef, batch, randomUUID) {
  const authorSnap = await authorRef.get();
  if (!isSnapshotAvailable(authorSnap)) {
    batch.set(authorRef, { uuid: randomUUID() });
  }
}

/**
 * Map handler arguments to processStorySubmission parameters.
 * @typedef {object} ProcessStoryParams
 * @property {Record<string, unknown>} submission Submission payload.
 * @property {FirestoreDocumentSnapshot | null | undefined} snapshot Trigger snapshot.
 * @property {TriggerContext | undefined} context Trigger context.
 * @property {Firestore} db Firestore instance.
 * @property {() => string} randomUUID UUID generator.
 * @property {() => number} random Random number generator.
 * @property {() => FieldValue} getServerTimestamp Server timestamp helper.
 */

/**
 * Map handler arguments to processStorySubmission parameters.
 * @param {FirestoreDocumentSnapshot | null | undefined} snapshot Trigger snapshot.
 * @param {TriggerContext | undefined} context Trigger context.
 * @param {object} options Configuration.
 * @param {Firestore} options.db Firestore instance.
 * @param {() => string} options.randomUUID UUID generator.
 * @param {() => number} options.random Random number generator.
 * @param {() => FieldValue} options.getServerTimestamp Server timestamp helper.
 * @returns {ProcessStoryParams} Mapped parameters for processStorySubmission.
 */
function mapProcessStoryParams(snapshot, context, options) {
  return {
    submission: resolveSubmission(snapshot),
    snapshot: snapshot ?? null,
    context,
    db: options.db,
    randomUUID: options.randomUUID,
    random: options.random,
    getServerTimestamp: options.getServerTimestamp,
  };
}

/**
 * Create the handler that processes new story submissions.
 * @param {object} options Collaborators required by the handler.
 * @param {Firestore} options.db Firestore instance.
 * @param {{ serverTimestamp: () => FieldValue, increment: (value: number) => FieldValue }} options.fieldValue FieldValue helper with timestamp and increment helpers.
 * @param {() => string} options.randomUUID UUID generator.
 * @param {() => number} [options.random] Random number generator (defaults to Math.random).
 * @returns {(snap: FirestoreDocumentSnapshot | null | undefined, context: TriggerContext | undefined) => Promise<null>} Firestore trigger handler.
 */
export function createProcessNewStoryHandler({
  db,
  fieldValue,
  randomUUID,
  random = Math.random,
}) {
  const getServerTimestamp = resolveServerTimestamp(fieldValue);

  // Create wrapper function with correct signature to satisfy type requirements
  /** @type {(snap: FirestoreDocumentSnapshot | null | undefined, context: TriggerContext | undefined) => Promise<null>} */
  const handler = async (snapshot, context = {}) => {
    const params = mapProcessStoryParams(snapshot, context, {
      db,
      randomUUID,
      random,
      getServerTimestamp,
    });
    return processStorySubmission(params);
  };

  return handler;
}

/**
 * Orchestrate the steps required to persist a new story submission.
 * @param {object} params Parameters required to process the submission.
 * @param {Record<string, unknown>} params.submission Submission payload.
 * @param {FirestoreDocumentSnapshot | null | undefined} params.snapshot Trigger snapshot.
 * @param {{ params?: Record<string, string> } | undefined} params.context Trigger context.
 * @param {Firestore} params.db Firestore instance.
 * @param {() => string} params.randomUUID UUID generator.
 * @param {() => number} params.random Random number generator.
 * @param {() => FieldValue} params.getServerTimestamp Server timestamp helper.
 * @returns {Promise<null>} Null once work completes.
 */
async function processStorySubmission({
  submission,
  snapshot,
  context,
  db,
  randomUUID,
  random,
  getServerTimestamp,
}) {
  if (submission.processed) {
    return null;
  }

  const identifiers = resolveStoryIdentifiers(snapshot, context, randomUUID);
  const pageNumber = await findAvailablePageNumberResolver(db, random);
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
}
