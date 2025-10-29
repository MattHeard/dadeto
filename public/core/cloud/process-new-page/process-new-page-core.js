import { FieldValue as AdminFieldValue } from 'firebase-admin/firestore';

/**
 * Increment a variant name in base-26 alphabetic order.
 * @param {string} name Current variant name.
 * @returns {string} Next variant name.
 */
export function incrementVariantName(name) {
  if (typeof name !== 'string' || name.length === 0) {
    return 'a';
  }

  const letters = name.split('');
  let index = letters.length - 1;

  while (index >= 0) {
    const code = letters[index].charCodeAt(0);

    if (code >= 97 && code < 122) {
      letters[index] = String.fromCharCode(code + 1);
      return letters.join('');
    }

    letters[index] = 'a';
    index -= 1;
  }

  return 'a'.repeat(name.length + 1);
}

/**
 * Ensure the provided random generator behaves like Math.random.
 * @param {() => number} random Function used to generate pseudo-random numbers.
 */
function assertRandom(random) {
  if (typeof random !== 'function') {
    throw new TypeError('random must be a function');
  }
}

/**
 * Retrieve a new write batch from the provided Firestore-like database.
 * @param {{ batch: () => import('firebase-admin/firestore').WriteBatch }} database Database reference
 * that exposes a {@link import('firebase-admin/firestore').WriteBatch} factory.
 * @returns {import('firebase-admin/firestore').WriteBatch} Newly created write batch.
 */
function getBatch(database) {
  if (!database || typeof database.batch !== 'function') {
    throw new TypeError('db must provide a batch method');
  }

  return database.batch();
}

/**
 * Validate that the provided FieldValue helper exposes the expected methods.
 * @param {{
 *   serverTimestamp: () => unknown,
 *   increment: (value: number) => unknown,
 * } | typeof AdminFieldValue} fieldValue FieldValue helper used to write metadata.
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
 * Ensure a UUID generator function is provided.
 * @param {() => string} randomUUID Function that returns a UUID string.
 */
function assertRandomUuid(randomUUID) {
  if (typeof randomUUID !== 'function') {
    throw new TypeError('randomUUID must be a function');
  }
}

/**
 * Read the submission payload from a Firestore snapshot.
 * @param {import('firebase-admin/firestore').DocumentSnapshot<import('firebase-admin/firestore').DocumentData> | null | undefined} snapshot
 *   Document snapshot containing the submission data.
 * @returns {import('firebase-admin/firestore').DocumentData | null} Parsed submission data or null when unavailable.
 */
function getSubmissionData(snapshot) {
  if (!snapshot || typeof snapshot.data !== 'function') {
    return null;
  }

  return snapshot.data();
}

/**
 * Normalize the submitted options list into an array.
 * @param {unknown} options Options payload received from the submission.
 * @returns {string[]} Normalized list of option strings.
 */
function normalizeOptions(options) {
  if (Array.isArray(options)) {
    return options;
  }

  return [];
}

/**
 * Validate that a Firestore reference exposes collection helpers.
 * @template T
 * @param {import('firebase-admin/firestore').DocumentReference<T> | null | undefined} reference
 *   Firestore reference to validate.
 * @param {string} message Error message to surface when validation fails.
 * @returns {import('firebase-admin/firestore').DocumentReference<T>} The validated Firestore reference.
 */
function ensureDocumentReference(reference, message) {
  if (!reference || typeof reference.collection !== 'function') {
    throw new TypeError(message);
  }

  return reference;
}

/**
 * Attempt to update a Firestore reference when supported.
 * @param {{ update: (data: Record<string, unknown>) => Promise<unknown> } | null | undefined} target
 *   Firestore reference that may expose an update method.
 * @param {Record<string, unknown>} payload Data to persist on the reference.
 * @returns {Promise<unknown>} Result of the update call or a resolved promise when unavailable.
 */
function ensureUpdate(target, payload) {
  if (target && typeof target.update === 'function') {
    return target.update(payload);
  }

  return Promise.resolve();
}

/**
 * Choose a random page number that is not already taken.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore instance.
 * @param {() => number} [random=Math.random] Random number generator.
 * @param {number} [depth=0] Recursion depth used to widen the search range.
 * @returns {Promise<number>} A unique page number.
 */
export async function findAvailablePageNumber(db, random = Math.random, depth = 0) {
  assertRandom(random);

  const max = 2 ** depth;
  const candidate = Math.floor(random() * max) + 1;

  const existing = await db
    .collectionGroup('pages')
    .where('number', '==', candidate)
    .limit(1)
    .get();

  if (existing.empty) {
    return candidate;
  }

  return findAvailablePageNumber(db, random, depth + 1);
}

/**
 * Resolve the related Firestore references for an option document.
 * @param {import('firebase-admin/firestore').DocumentReference<import('firebase-admin/firestore').DocumentData> | null | undefined} optionRef
 *   Document reference for the incoming option.
 * @returns {{
 *   variantRef: import('firebase-admin/firestore').DocumentReference<import('firebase-admin/firestore').DocumentData> | null,
 *   pageRef: import('firebase-admin/firestore').DocumentReference<import('firebase-admin/firestore').DocumentData> | null,
 *   storyRef: import('firebase-admin/firestore').DocumentReference<import('firebase-admin/firestore').DocumentData> | null,
 * }} Collection of related Firestore references.
 */
function resolveStoryRefFromOption(optionRef) {
  if (!optionRef) {
    return null;
  }

  const variantRef = optionRef.parent?.parent ?? null;
  const pageRef = variantRef?.parent?.parent ?? null;
  const storyRef = pageRef?.parent?.parent ?? null;

  return { variantRef, pageRef, storyRef };
}

/**
 * Confirm that an option target points to a page document reference.
 * @param {import('firebase-admin/firestore').DocumentReference<import('firebase-admin/firestore').DocumentData> | null | undefined} targetPage
 *   Reference stored on the option document.
 * @returns {import('firebase-admin/firestore').DocumentReference<import('firebase-admin/firestore').DocumentData> | null}
 *   A page reference when valid, otherwise null.
 */
function resolvePageFromTarget(targetPage) {
  if (targetPage && typeof targetPage.get === 'function') {
    return targetPage;
  }

  return null;
}

/**
 * Build a reference to the story statistics document.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore instance used for lookups.
 * @param {import('firebase-admin/firestore').DocumentReference<import('firebase-admin/firestore').DocumentData>} storyRef
 *   Story reference whose identifier is used to build the stats path.
 * @returns {import('firebase-admin/firestore').DocumentReference<import('firebase-admin/firestore').DocumentData>} Stats document reference.
 */
function resolveStoryStatsRef(db, storyRef) {
  if (!storyRef || typeof storyRef.id !== 'string') {
    throw new TypeError('storyRef must have an id');
  }

  if (typeof db?.doc !== 'function') {
    throw new TypeError('db.doc must be a function');
  }

  return db.doc(`storyStats/${storyRef.id}`);
}

/**
 * Build a reference to an author document when an identifier is provided.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore instance used for lookups.
 * @param {string | null | undefined} authorId Identifier for the author.
 * @returns {import('firebase-admin/firestore').DocumentReference<import('firebase-admin/firestore').DocumentData> | null}
 *   Firestore document reference for the author or null when unavailable.
 */
function resolveAuthorRef(db, authorId) {
  if (!authorId || typeof authorId !== 'string') {
    return null;
  }

  if (typeof db?.doc !== 'function') {
    throw new TypeError('db.doc must be a function');
  }

  return db.doc(`authors/${authorId}`);
}

/**
 * Resolve the variants collection for the provided page reference.
 * @param {import('firebase-admin/firestore').DocumentReference<import('firebase-admin/firestore').DocumentData>} pageRef
 *   Page reference that owns the variants collection.
 * @returns {import('firebase-admin/firestore').CollectionReference<import('firebase-admin/firestore').DocumentData>} Collection of variants.
 */
function getVariantCollection(pageRef) {
  if (!pageRef || typeof pageRef.collection !== 'function') {
    throw new TypeError('pageRef.collection must be a function');
  }

  return pageRef.collection('variants');
}

/**
 * Resolve a server timestamp factory from the provided FieldValue helper.
 * @param {{ serverTimestamp: () => unknown } | typeof AdminFieldValue} fieldValue FieldValue helper supplied to the handler.
 * @returns {() => unknown} Function that returns a Firestore server timestamp sentinel value.
 */
function resolveServerTimestamp(fieldValue) {
  if (fieldValue === AdminFieldValue) {
    return () => AdminFieldValue.serverTimestamp();
  }

  return () => fieldValue.serverTimestamp();
}

/**
 * Build the Cloud Function handler for processing new page submissions.
 * @param {object} options Collaborators required by the handler.
 * @param {import('firebase-admin/firestore').Firestore} options.db Firestore instance.
 * @param {{
 *   serverTimestamp: () => import('firebase-admin/firestore').FieldValue,
 *   increment: (value: number) => import('firebase-admin/firestore').FieldValue,
 * }} options.fieldValue FieldValue helper with server timestamp and increment.
 * @param {() => string} options.randomUUID UUID generator.
 * @param {() => number} [options.random=Math.random] Random number generator.
 * @param {(db: import('firebase-admin/firestore').Firestore, random?: () => number, depth?: number) => Promise<number>} [options.findAvailablePageNumberFn=findAvailablePageNumber]
 *   Finder that returns an unused page number.
 * @param {(name: string) => string} [options.incrementVariantNameFn=incrementVariantName] Helper that increments variant names.
 * @returns {(snap: import('firebase-admin/firestore').DocumentSnapshot<import('firebase-admin/firestore').DocumentData>, context?: { params?: Record<string, string> }) => Promise<null>}
 *   Firestore trigger handler.
 */
export function createProcessNewPageHandler({
  db,
  fieldValue,
  randomUUID,
  random = Math.random,
  findAvailablePageNumberFn = findAvailablePageNumber,
  incrementVariantNameFn = incrementVariantName,
}) {
  assertRandom(random);
  assertRandomUuid(randomUUID);
  assertFieldValue(fieldValue);

  if (!db || typeof db.doc !== 'function') {
    throw new TypeError('db must provide doc and batch helpers');
  }

  if (typeof findAvailablePageNumberFn !== 'function') {
    throw new TypeError('findAvailablePageNumber must be a function');
  }

  if (typeof incrementVariantNameFn !== 'function') {
    throw new TypeError('incrementVariantName must be a function');
  }

  const getServerTimestamp = resolveServerTimestamp(fieldValue);

  return async function handleProcessNewPage(snapshot, context = {}) {
    const submission = getSubmissionData(snapshot) ?? {};

    if (submission.processed) {
      return null;
    }

    const incomingOptionFullName = submission.incomingOptionFullName;
    const directPageNumber = submission.pageNumber;

    if (!incomingOptionFullName && !Number.isInteger(directPageNumber)) {
      await ensureUpdate(snapshot?.ref, { processed: true });
      return null;
    }

    let pageDocRef = null;
    let storyRef = null;
    let variantRef = null;
    let pageNumber = null;

    const batch = getBatch(db);

    if (incomingOptionFullName) {
      const optionRef = db.doc(incomingOptionFullName);
      const optionSnap = await optionRef.get();

      if (!optionSnap?.exists) {
        await ensureUpdate(snapshot?.ref, { processed: true });
        return null;
      }

      const references = resolveStoryRefFromOption(optionRef);
      variantRef = references.variantRef;
      const inferredPageRef = references.pageRef;
      storyRef = references.storyRef;

      const optionData = optionSnap.data() ?? {};
      const targetPage = resolvePageFromTarget(optionData.targetPage);

      if (targetPage) {
        try {
          const existingPageSnap = await targetPage.get();
          if (existingPageSnap?.exists) {
            pageNumber = existingPageSnap.data()?.number ?? null;
            pageDocRef = targetPage;
          }
        } catch {
          pageDocRef = null;
        }
      }

      if (!pageDocRef) {
        pageNumber = await findAvailablePageNumberFn(db, random);

        if (!storyRef || typeof storyRef.collection !== 'function') {
          throw new TypeError('storyRef.collection must be a function');
        }

        const newPageId = randomUUID();
        pageDocRef = storyRef.collection('pages').doc(newPageId);

        batch.set(pageDocRef, {
          number: pageNumber,
          incomingOption: incomingOptionFullName,
          createdAt: getServerTimestamp(),
        });

        batch.update(optionRef, { targetPage: pageDocRef });
      }

      if (!storyRef) {
        storyRef = inferredPageRef?.parent?.parent ?? null;
      }
    } else {
      pageNumber = directPageNumber;

      const pageSnap = await db
        .collectionGroup('pages')
        .where('number', '==', pageNumber)
        .limit(1)
        .get();

      if (pageSnap.empty) {
        await ensureUpdate(snapshot?.ref, { processed: true });
        return null;
      }

      pageDocRef = pageSnap.docs[0].ref;
      storyRef = pageDocRef.parent?.parent ?? null;
    }

    pageDocRef = ensureDocumentReference(pageDocRef, 'pageDocRef.collection must be a function');
    storyRef = ensureDocumentReference(storyRef, 'storyRef.collection must be a function');

    const variantsSnap = await pageDocRef
      .collection('variants')
      .orderBy('name', 'desc')
      .limit(1)
      .get();

    const nextName = variantsSnap.empty
      ? 'a'
      : incrementVariantNameFn(variantsSnap.docs[0]?.data()?.name ?? '');

    const newVariantRef = getVariantCollection(pageDocRef).doc(snapshot?.id ?? randomUUID());

    batch.set(newVariantRef, {
      name: nextName,
      content: submission.content,
      authorId: submission.authorId || null,
      authorName: submission.author,
      incomingOption: incomingOptionFullName || null,
      moderatorReputationSum: 0,
      rand: random(),
      createdAt: getServerTimestamp(),
    });

    normalizeOptions(submission.options).forEach((text, position) => {
      const optionRef = newVariantRef.collection('options').doc(randomUUID());

      batch.set(optionRef, {
        content: text,
        createdAt: getServerTimestamp(),
        position,
      });
    });

    const storyStatsRef = resolveStoryStatsRef(db, storyRef);

    batch.set(
      storyStatsRef,
      { variantCount: fieldValue.increment(1) },
      { merge: true }
    );

    if (variantRef) {
      batch.update(variantRef, { dirty: null });
    }

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
