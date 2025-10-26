import { FieldValue as AdminFieldValue } from 'firebase-admin/firestore';
import { findAvailablePageNumber as defaultFindAvailablePageNumber } from '../process-new-page/process-new-page-core.js';

function assertDb(db) {
  if (!db || typeof db.doc !== 'function' || typeof db.batch !== 'function') {
    throw new TypeError('db must expose doc and batch helpers');
  }
}

function assertFieldValue(fieldValue) {
  if (!fieldValue || typeof fieldValue.serverTimestamp !== 'function') {
    throw new TypeError('fieldValue.serverTimestamp must be a function');
  }

  if (typeof fieldValue.increment !== 'function') {
    throw new TypeError('fieldValue.increment must be a function');
  }
}

function assertRandom(random) {
  if (typeof random !== 'function') {
    throw new TypeError('random must be a function');
  }
}

function assertRandomUuid(randomUUID) {
  if (typeof randomUUID !== 'function') {
    throw new TypeError('randomUUID must be a function');
  }
}

function getSubmissionData(snapshot) {
  if (!snapshot || typeof snapshot.data !== 'function') {
    return null;
  }

  return snapshot.data();
}

function resolveServerTimestamp(fieldValue) {
  if (fieldValue === AdminFieldValue) {
    return () => AdminFieldValue.serverTimestamp();
  }

  return () => fieldValue.serverTimestamp();
}

function normalizeOptions(options) {
  return Array.isArray(options) ? options : [];
}

function resolveAuthorRef(db, authorId) {
  if (!authorId || typeof authorId !== 'string') {
    return null;
  }

  return db.doc(`authors/${authorId}`);
}

/**
 * Create the handler that processes new story submissions.
 * @param {object} options Collaborators required by the handler.
 * @param {import('firebase-admin/firestore').Firestore} options.db Firestore instance.
 * @param {{
 *   serverTimestamp: () => import('firebase-admin/firestore').FieldValue,
 *   increment: (value: number) => import('firebase-admin/firestore').FieldValue,
 * }} options.fieldValue FieldValue helper with timestamp and increment helpers.
 * @param {() => string} options.randomUUID UUID generator.
 * @param {() => number} [options.random=Math.random] Random number generator.
 * @param {(db: import('firebase-admin/firestore').Firestore, random?: () => number) => Promise<number>} [options.findAvailablePa
geNumberFn=defaultFindAvailablePageNumber]
 * Resolver that returns an unused page number.
 * @returns {(snap: *, context: { params?: Record<string, string> }) => Promise<null>} Firestore trigger handler.
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
