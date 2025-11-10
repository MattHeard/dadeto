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
/**
 * Validate that the provided FieldValue helper exposes the expected methods.
 * @param {{
 *   serverTimestamp: () => unknown,
 *   increment: (value: number) => unknown,
 * }} fieldValue FieldValue helper used to write metadata.
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
 * @param {() => number} [random] Random number generator (defaults to Math.random).
 * @param {number} [depth] Recursion depth used to widen the search range (defaults to 0).
 * @returns {Promise<number>} A unique page number.
 */
export async function findAvailablePageNumber(db, random, depth = 0) {
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
  const variantRef = optionRef.parent.parent;
  const pageRef = variantRef.parent.parent;
  const storyRef = pageRef.parent.parent;

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

  return db.doc(`authors/${authorId}`);
}

/**
 * Resolve the variants collection for the provided page reference.
 * @param {import('firebase-admin/firestore').DocumentReference<import('firebase-admin/firestore').DocumentData>} pageRef
 *   Page reference that owns the variants collection.
 * @returns {import('firebase-admin/firestore').CollectionReference<import('firebase-admin/firestore').DocumentData>} Collection of variants.
 */
function getVariantCollection(pageRef) {
  return pageRef.collection('variants');
}

/**
 * Resolve a server timestamp factory from the provided FieldValue helper.
 * @param {{ serverTimestamp: () => unknown }} fieldValue FieldValue helper supplied to the handler.
 * @returns {() => unknown} Function that returns a Firestore server timestamp sentinel value.
 */
function resolveServerTimestamp(fieldValue) {
  return () => fieldValue.serverTimestamp();
}

/**
 * Resolve page and story references when a submission targets an existing option.
 * Returns null when the submission should be marked as processed without further work.
 * @param {object} params Parameters required to resolve the context from an option submission.
 * @param {import('firebase-admin/firestore').Firestore} params.db Firestore instance used for lookups.
 * @param {string} params.incomingOptionFullName Full document path for the option that triggered the submission.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} params.snapshot Submission snapshot from the trigger.
 * @param {import('firebase-admin/firestore').WriteBatch} params.batch Write batch used to queue updates.
 * @param {(db: import('firebase-admin/firestore').Firestore, random?: () => number, depth?: number) => Promise<number>} params.findAvailablePageNumberFn
 *   Helper that finds the next available page number.
 * @param {() => string} params.randomUUID UUID generator used to create new document identifiers.
 * @param {() => number} params.random Random number generator for variant metadata.
 * @param {() => unknown} params.getServerTimestamp Function that returns a Firestore server timestamp sentinel.
 * @returns {Promise<
 *   null | {
 *     pageDocRef: import('firebase-admin/firestore').DocumentReference,
 *     storyRef: import('firebase-admin/firestore').DocumentReference | null,
 *     variantRef: import('firebase-admin/firestore').DocumentReference | null,
 *     pageNumber: number | null,
 *   }
 * >} Resolved context or null when the submission is already processed.
 */
async function resolveIncomingOptionContext({
  db,
  incomingOptionFullName,
  snapshot,
  batch,
  findAvailablePageNumberFn,
  randomUUID,
  random,
  getServerTimestamp,
}) {
  const optionRef = db.doc(incomingOptionFullName);
  const optionSnap = await optionRef.get();

  if (!optionSnap?.exists) {
    await ensureUpdate(snapshot?.ref, { processed: true });
    return null;
  }

  const {
    variantRef,
    pageRef: inferredPageRef,
    storyRef: initialStoryRef,
  } = resolveStoryRefFromOption(optionRef);

  const storyRef = initialStoryRef;
  const optionData = optionSnap.data();
  const targetPage = resolvePageFromTarget(optionData.targetPage);

  const existingContext = await resolveExistingPageContext(targetPage);
  const pageContext =
    existingContext ??
    (await createPageContext({
      storyRef,
      db,
      random,
      findAvailablePageNumberFn,
      randomUUID,
      batch,
      optionRef,
      incomingOptionFullName,
      getServerTimestamp,
    }));

  return {
    ...pageContext,
    storyRef,
    variantRef,
  };
}

/**
 * Resolve an existing page reference from a target page selection.
 * @param {import('firebase-admin/firestore').DocumentReference | null | undefined} targetPage The referenced page.
 * @returns {Promise<null | { pageDocRef: import('firebase-admin/firestore').DocumentReference, pageNumber: number | null }>}
 * Resolved context or null when no existing page is found.
 */
async function resolveExistingPageContext(targetPage) {
  if (!targetPage) {
    return null;
  }

  const existingPageSnap = await safeGetPage(targetPage);
  if (!existingPageSnap?.exists) {
    return null;
  }

  return {
    pageDocRef: targetPage,
    pageNumber: existingPageSnap.data().number,
  };
}

/**
 * Safely retrieve the snapshot for an existing page reference.
 * @param {import('firebase-admin/firestore').DocumentReference} targetPage Page reference to query.
 * @returns {Promise<import('firebase-admin/firestore').DocumentSnapshot | null>} The snapshot or null when unavailable.
 */
async function safeGetPage(targetPage) {
  try {
    return await targetPage.get();
  } catch {
    return null;
  }
}

/**
 * Create a new page context when no existing page was found for the option submission.
 * @param {object} params Parameters describing the creation request.
 * @param {import('firebase-admin/firestore').DocumentReference | null} params.storyRef Story reference inferred from the option.
 * @param {import('firebase-admin/firestore').Firestore} params.db Firestore instance.
 * @param {() => number} params.random Random number generator for variant ordering.
 * @param {(db: import('firebase-admin/firestore').Firestore, random?: () => number, depth?: number) => Promise<number>} params.findAvailablePageNumberFn
 *   Helper that finds the next page number.
 * @param {() => string} params.randomUUID UUID generator for new page documents.
 * @param {import('firebase-admin/firestore').WriteBatch} params.batch Write batch collecting Firestore operations.
 * @param {import('firebase-admin/firestore').DocumentReference} params.optionRef Option reference used for updates.
 * @param {string} params.incomingOptionFullName Full document path for the option.
 * @param {() => unknown} params.getServerTimestamp Function returning a Firestore server timestamp sentinel.
 * @returns {Promise<{
 *   pageDocRef: import('firebase-admin/firestore').DocumentReference,
 *   pageNumber: number,
 * }>} Newly created page context.
 */
async function createPageContext({
  storyRef,
  db,
  random,
  findAvailablePageNumberFn,
  randomUUID,
  batch,
  optionRef,
  incomingOptionFullName,
  getServerTimestamp,
}) {
  const nextPageNumber = await findAvailablePageNumberFn(db, random);

  const newPageId = randomUUID();
  const pageDocRef = storyRef.collection('pages').doc(newPageId);

  batch.set(pageDocRef, {
    number: nextPageNumber,
    incomingOption: incomingOptionFullName,
    createdAt: getServerTimestamp(),
  });

  batch.update(optionRef, { targetPage: pageDocRef });

  return { pageDocRef, pageNumber: nextPageNumber };
}

/**
 * Determine the final story reference from the resolved context.
 * @param {import('firebase-admin/firestore').DocumentReference | null} storyRef Story reference determined from the option.
 * @param {import('firebase-admin/firestore').DocumentReference | null | undefined} inferredPageRef Page reference inferred fro
m the option.
 * @returns {import('firebase-admin/firestore').DocumentReference | null} Final story reference.
 */
/**
 * Resolve page and story references when the submission provides a direct page number.
 * Returns null when the submission should simply be marked processed.
 * @param {object} params Parameters supplied when a submission specifies a direct page number.
 * @param {import('firebase-admin/firestore').Firestore} params.db Firestore instance used to query existing pages.
 * @param {number} params.directPageNumber Page number requested by the submission.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} params.snapshot Submission snapshot from the trigger.
 * @returns {Promise<null | { pageDocRef: import('firebase-admin/firestore').DocumentReference, storyRef: import('firebase-admin/firestore').DocumentReference | null, variantRef: null, pageNumber: number }}> Resolved context or null when the submission has already been handled.
 */
async function resolveDirectPageContext({ db, directPageNumber, snapshot }) {
  const pageSnap = await db
    .collectionGroup('pages')
    .where('number', '==', directPageNumber)
    .limit(1)
    .get();

  if (pageSnap.empty) {
    await ensureUpdate(snapshot?.ref, { processed: true });
    return null;
  }

  const pageDocRef = pageSnap.docs[0].ref;
  const storyRef = pageDocRef.parent.parent;

  return {
    pageDocRef,
    storyRef,
    variantRef: null,
    pageNumber: directPageNumber,
  };
}

/**
 * Create the new variant document alongside option children.
 * @param {object} params Parameters describing the variant creation request.
 * @param {import('firebase-admin/firestore').DocumentReference} params.pageDocRef Page document where the variant will be stored.
 * @param {import('firebase-admin/firestore').DocumentReference} params.snapshotRef Submission document reference used for deterministic IDs.
 * @param {import('firebase-admin/firestore').WriteBatch} params.batch Write batch used to queue writes for commit.
 * @param {object} params.submission Submission payload containing variant content and options.
 * @param {() => string} params.randomUUID UUID generator for new Firestore documents.
 * @param {() => unknown} params.getServerTimestamp Function that returns a Firestore server timestamp sentinel.
 * @param {() => number} params.random Random number generator for variant ordering.
 * @param {(name: string) => string} params.incrementVariantNameFn Helper that calculates the next variant name.
 * @returns {Promise<import('firebase-admin/firestore').DocumentReference>} Reference to the newly created variant document.
 */
async function createVariantWithOptions({
  pageDocRef,
  snapshotRef,
  batch,
  submission,
  randomUUID,
  getServerTimestamp,
  random,
  incrementVariantNameFn,
}) {
  const variantsSnap = await pageDocRef
    .collection('variants')
    .orderBy('name', 'desc')
    .limit(1)
    .get();

  const latestName = variantsSnap.docs[0]?.data()?.name ?? '';
  const nextName = variantsSnap.empty
    ? 'a'
    : incrementVariantNameFn(latestName);

  const newVariantRef = getVariantCollection(pageDocRef).doc(
    snapshotRef?.id ?? randomUUID()
  );

  batch.set(newVariantRef, {
    name: nextName,
    content: submission.content,
    authorId: submission.authorId || null,
    authorName: submission.author,
    incomingOption: submission.incomingOptionFullName || null,
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

  return newVariantRef;
}

/**
 * Ensure the submitting author has a Firestore document.
 * @param {object} params Parameters controlling author record initialization.
 * @param {import('firebase-admin/firestore').Firestore} params.db Firestore instance used to resolve author documents.
 * @param {import('firebase-admin/firestore').WriteBatch} params.batch Write batch used to schedule author writes.
 * @param {object} params.submission Submission payload containing author identifiers.
 * @param {() => string} params.randomUUID UUID generator for new author documents.
 * @returns {Promise<void>} Promise that resolves when the author record has been ensured.
 */
async function ensureAuthorRecordExists({ db, batch, submission, randomUUID }) {
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
 * Build the Cloud Function handler for processing new page submissions.
 * @param {object} options Collaborators required by the handler.
 * @param {import('firebase-admin/firestore').Firestore} options.db Firestore instance used for document access.
 * @param {{
 *   serverTimestamp: () => import('firebase-admin/firestore').FieldValue,
 *   increment: (value: number) => import('firebase-admin/firestore').FieldValue,
 * }} options.fieldValue FieldValue helper with server timestamp and increment capabilities.
 * @param {() => string} options.randomUUID UUID generator used for new documents.
 * @param {() => number} [options.random] Random number generator (defaults to Math.random).
 * @param {(db: import('firebase-admin/firestore').Firestore, random?: () => number, depth?: number) => Promise<number>} [options.findAvailablePageNumberFn]
 *   Finder that returns an unused page number (defaults to findAvailablePageNumber).
 * @param {(name: string) => string} [options.incrementVariantNameFn]
 *   Helper that increments variant names (defaults to incrementVariantName).
 * @returns {(snap: import('firebase-admin/firestore').DocumentSnapshot<import('firebase-admin/firestore').DocumentData>, context?: { params?: Record<string, string> }) => Promise<null>} Firestore trigger handler that processes new page submissions.
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

  if (!db || typeof db.doc !== 'function' || typeof db.batch !== 'function') {
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

    const batch = db.batch();
    const pageContext = incomingOptionFullName
      ? await resolveIncomingOptionContext({
          db,
          incomingOptionFullName,
          snapshot,
          batch,
          findAvailablePageNumberFn,
          randomUUID,
          random,
          getServerTimestamp,
        })
      : await resolveDirectPageContext({
          db,
          directPageNumber,
          snapshot,
        });

    if (!pageContext) {
      return null;
    }

    ({ pageDocRef, storyRef, variantRef, pageNumber } = pageContext);

    pageDocRef = ensureDocumentReference(
      pageDocRef,
      'pageDocRef.collection must be a function'
    );
    storyRef = ensureDocumentReference(
      storyRef,
      'storyRef.collection must be a function'
    );

    const newVariantRef = await createVariantWithOptions({
      pageDocRef,
      snapshotRef: snapshot?.ref ?? null,
      batch,
      submission,
      randomUUID,
      getServerTimestamp,
      random,
      incrementVariantNameFn,
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
    await ensureAuthorRecordExists({ db, batch, submission, randomUUID });

    await batch.commit();
    return null;
  };
}
