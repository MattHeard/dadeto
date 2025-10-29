import { FieldValue as AdminFieldValue } from 'firebase-admin/firestore';
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
  if (!db || typeof db.doc !== 'function' || typeof db.batch !== 'function') {
    throw new TypeError('db must expose doc and batch helpers');
  }
}

/**
 * Ensure the provided FieldValue helper offers the required APIs.
 * @param {{ serverTimestamp: () => FieldValue, increment: (value: number) => FieldValue }} fieldValue FieldValue helper to assert.
 * @returns {void}
 */
function assertFieldValue(fieldValue) {
  if (!fieldValue || typeof fieldValue.serverTimestamp !== 'function') {
    throw new TypeError('fieldValue.serverTimestamp must be a function');
  }

  if (typeof fieldValue.increment !== 'function') {
    throw new TypeError('fieldValue.increment must be a function');
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
  if (!snapshot || typeof snapshot.data !== 'function') {
    return null;
  }

  return snapshot.data();
}

/**
 * Resolve a function that returns the Firestore server timestamp helper.
 * @param {{ serverTimestamp: () => FieldValue }} fieldValue FieldValue helper provided to the handler.
 * @returns {() => FieldValue} Function returning a server timestamp FieldValue.
 */
function resolveServerTimestamp(fieldValue) {
  if (fieldValue === AdminFieldValue) {
    return () => AdminFieldValue.serverTimestamp();
  }

  return () => fieldValue.serverTimestamp();
}

/**
 * Normalize submission options into an array of strings.
 * @param {unknown} options Incoming options payload.
 * @returns {string[]} Normalized options array.
 */
function normalizeOptions(options) {
  return Array.isArray(options) ? options : [];
}

/**
 * Resolve the author document reference when an author identifier is available.
 * @param {Firestore} db Firestore instance used to build references.
 * @param {string | null | undefined} authorId Author identifier supplied by the submission.
 * @returns {DocumentReference | null} Reference to the author document or null when unavailable.
 */
function resolveAuthorRef(db, authorId) {
  if (!authorId || typeof authorId !== 'string') {
    return null;
  }

  return db.doc(`authors/${authorId}`);
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

    const storyId = context?.params?.subId ?? snapshot?.id ?? randomUUID();
    const pageId = randomUUID();
    const variantId = randomUUID();

    const pageNumber = await findAvailablePageNumberFn(db, random);

    const storyRef = db.doc(`stories/${storyId}`);
    const pageRef = storyRef.collection('pages').doc(pageId);
    const variantRef = pageRef.collection('variants').doc(variantId);

    const batch = db.batch();

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

    normalizeOptions(submission.options).forEach((text, position) => {
      const optionRef = variantRef.collection('options').doc(randomUUID());

      batch.set(optionRef, {
        content: text,
        createdAt: getServerTimestamp(),
        position,
      });
    });

    batch.set(db.doc(`storyStats/${storyId}`), { variantCount: 1 });
    batch.update(snapshot?.ref, { processed: true });

    const authorRef = resolveAuthorRef(db, submission.authorId);

    if (authorRef) {
      const authorSnap = await authorRef.get();
      if (!authorSnap?.exists) {
        batch.set(authorRef, { uuid: randomUUID() });
      }
    }

    await batch.commit();
    return null;
  };
}
