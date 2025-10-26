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

function assertRandom(random) {
  if (typeof random !== 'function') {
    throw new TypeError('random must be a function');
  }
}

function getBatch(database) {
  if (!database || typeof database.batch !== 'function') {
    throw new TypeError('db must provide a batch method');
  }

  return database.batch();
}

function assertFieldValue(fieldValue) {
  if (!fieldValue || typeof fieldValue.serverTimestamp !== 'function') {
    throw new TypeError('fieldValue.serverTimestamp must be a function');
  }

  if (typeof fieldValue.increment !== 'function') {
    throw new TypeError('fieldValue.increment must be a function');
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

function normalizeOptions(options) {
  return Array.isArray(options) ? options : [];
}

function ensureDocumentReference(reference, message) {
  if (!reference || typeof reference.collection !== 'function') {
    throw new TypeError(message);
  }

  return reference;
}

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

function resolveStoryRefFromOption(optionRef) {
  if (!optionRef) {
    return null;
  }

  const variantRef = optionRef.parent?.parent ?? null;
  const pageRef = variantRef?.parent?.parent ?? null;
  const storyRef = pageRef?.parent?.parent ?? null;

  return { variantRef, pageRef, storyRef };
}

function resolvePageFromTarget(targetPage) {
  if (targetPage && typeof targetPage.get === 'function') {
    return targetPage;
  }

  return null;
}

function resolveStoryStatsRef(db, storyRef) {
  if (!storyRef || typeof storyRef.id !== 'string') {
    throw new TypeError('storyRef must have an id');
  }

  if (typeof db?.doc !== 'function') {
    throw new TypeError('db.doc must be a function');
  }

  return db.doc(`storyStats/${storyRef.id}`);
}

function resolveAuthorRef(db, authorId) {
  if (!authorId || typeof authorId !== 'string') {
    return null;
  }

  if (typeof db?.doc !== 'function') {
    throw new TypeError('db.doc must be a function');
  }

  return db.doc(`authors/${authorId}`);
}

function getVariantCollection(pageRef) {
  if (!pageRef || typeof pageRef.collection !== 'function') {
    throw new TypeError('pageRef.collection must be a function');
  }

  return pageRef.collection('variants');
}

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
 * @param {(db: import('firebase-admin/firestore').Firestore, random?: () => number) => Promise<number>} [options.findAvailablePa
geNumberFn=findAvailablePageNumber]
 * Finder that returns an unused page number.
 * @param {(name: string) => string} [options.incrementVariantNameFn=incrementVariantName] Helper that increments variant names.
 * @returns {(snap: *, context: { params?: Record<string, string> }) => Promise<null>} Firestore trigger handler.
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
