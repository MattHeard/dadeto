/**
 * @typedef {object} SubmissionData
 * @property {string} [content] Page content.
 * @property {string} [author] Author identifier.
 * @property {string} [authorId] Author user ID.
 * @property {(string|string[])} [options] Variant options.
 * @property {string} [incomingOptionFullName] Selected option name.
 * @property {unknown} [targetPage] Target page reference.
 * @property {number} [pageNumber] Direct page number for direct submission.
 * @property {boolean} [processed] Whether the submission has been processed.
 */

/**
 * @typedef {object} PageContext
 * @property {import('firebase-admin/firestore').DocumentReference} pageDocRef Reference to page document.
 * @property {import('firebase-admin/firestore').DocumentReference} storyRef Reference to story document.
 * @property {import('firebase-admin/firestore').DocumentReference | null} variantRef Reference to variant document.
 * @property {number} pageNumber The page number assigned.
 */

/**
 * @typedef {object} OptionData
 * @property {string} [targetPage] Target page identifier.
 * @property {string} [content] Option text content.
 * @property {unknown} [_docId] Document identifier.
 */

/**
 * Increment a variant name in base-26 alphabetic order.
 * @param {string} name Current variant name.
 * @returns {string} Next variant name.
 */
export function incrementVariantName(name) {
  if (!isNonEmptyString(name)) {
    return 'a';
  }

  const letters = name.split('');
  return incrementLetters(letters, letters.length - 1);
}

/**
 * Increment letters recursively.
 * @param {string[]} letters Letters.
 * @param {number} index Index.
 * @returns {string} Next name.
 */
function incrementLetters(letters, index) {
  if (index < 0) {
    return buildCarryResult(letters);
  }

  return handleLetterIncrement(letters, index);
}

/**
 * Increment the letter at the current index or carry to the next.
 * @param {string[]} letters Letters from the current variant name.
 * @param {number} index Current index being processed.
 * @returns {string} Updated variant name fragment.
 */
function handleLetterIncrement(letters, index) {
  if (isBetweenAandY(letters[index])) {
    return incrementAtIndex(letters, index);
  }

  letters[index] = 'a';
  return incrementLetters(letters, index - 1);
}

/**
 * Determine if a value is a non-empty string.
 * @param {unknown} value Candidate value.
 * @returns {value is string} True when the value is a non-empty string.
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check if letter is between a and y.
 * @param {string} letter Letter.
 * @returns {boolean} True if between.
 */
function isBetweenAandY(letter) {
  const code = letter.charCodeAt(0);
  return code >= 97 && code < 122;
}

/**
 * Increment letter and return name.
 * @param {string[]} letters Letters.
 * @param {number} index Index.
 * @returns {string} Name.
 */
function incrementAtIndex(letters, index) {
  const code = letters[index].charCodeAt(0);
  letters[index] = String.fromCharCode(code + 1);
  return letters.join('');
}

/**
 * Build carry result.
 * @param {string[]} letters Letters.
 * @returns {string} Result.
 */
function buildCarryResult(letters) {
  return 'a'.repeat(letters.length + 1);
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
 * Ensure a UUID generator function is provided.
 * @param {() => string} randomUUID Function that returns a UUID string.
 */
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
  if (!isDocumentReference(reference)) {
    throw new TypeError(message);
  }

  return reference;
}

/**
 * Ensure the reference exposes the collection helper.
 * @param {unknown} reference Candidate reference.
 * @returns {reference is import('firebase-admin/firestore').DocumentReference} True when the reference is valid.
 */
function isDocumentReference(reference) {
  return Boolean(
    reference &&
      typeof (/** @type {any} */ (reference).collection) === 'function'
  );
}

/**
 * Attempt to update a Firestore reference when supported.
 * @param {{ update: (data: Record<string, unknown>) => Promise<unknown> } | null | undefined} target
 *   Firestore reference that may expose an update method.
 * @param {Record<string, unknown>} payload Data to persist on the reference.
 * @returns {Promise<unknown>} Result of the update call or a resolved promise when unavailable.
 */
/**
 * Choose a random page number that is not already taken.
 * @param {import('firebase-admin/firestore').Firestore} db Firestore instance.
 * @param {(() => number)=} random Random number generator (defaults to Math.random).
 * @param {number=} depth Recursion depth used to widen the search range (defaults to 0).
 * @returns {Promise<number>} A unique page number.
 */
export async function findAvailablePageNumber(
  db,
  random = Math.random,
  depth = 0
) {
  assertRandom(random);

  const max = 2 ** depth;
  const candidate = Math.floor(random() * max) + 1;

  const existing = await db
    .collectionGroup('pages')
    .where('number', '==', candidate)
    .limit(1)
    .get();

  return resolveAvailablePageResult({
    existing,
    candidate,
    db,
    random,
    depth,
  });
}

/**
 * Choose the next available page number or recurse when busy.
 * @param {object} params Inputs describing the current candidate.
 * @param {import('firebase-admin/firestore').QuerySnapshot} params.existing Snapshot of existing matches.
 * @param {number} params.candidate Candidate page number.
 * @param {import('firebase-admin/firestore').Firestore} params.db Firestore instance.
 * @param {() => number} params.random Random number generator.
 * @param {number} params.depth Current recursion depth.
 * @returns {Promise<number>} Page number that can be assigned.
 */
function resolveAvailablePageResult({
  existing,
  candidate,
  db,
  random,
  depth,
}) {
  if (existing.empty) {
    return Promise.resolve(candidate);
  }

  return findAvailablePageNumber(db, random, depth + 1);
}

/**
 * @typedef {object} StoryReferences
 * @property {import('firebase-admin/firestore').DocumentReference | null} variantRef Reference to variant document.
 * @property {import('firebase-admin/firestore').DocumentReference | null} pageRef Reference to page document.
 * @property {import('firebase-admin/firestore').DocumentReference | null} storyRef Reference to story document.
 */

/**
 * Resolve the related Firestore references for an option document.
 * @param {import('firebase-admin/firestore').DocumentReference | null | undefined} optionRef
 *   Document reference for the incoming option.
 * @returns {StoryReferences} Collection of related Firestore references.
 */
function resolveStoryRefFromOption(optionRef) {
  if (!optionRef) {
    return { variantRef: null, pageRef: null, storyRef: null };
  }

  const variantRef =
    /** @type {import('firebase-admin/firestore').DocumentReference | null} */ (
      /** @type {any} */ (optionRef).parent?.parent || null
    );
  const pageRef =
    /** @type {import('firebase-admin/firestore').DocumentReference | null} */ (
      /** @type {any} */ (variantRef)?.parent?.parent || null
    );
  const storyRef =
    /** @type {import('firebase-admin/firestore').DocumentReference | null} */ (
      /** @type {any} */ (pageRef)?.parent?.parent || null
    );

  return { variantRef, pageRef, storyRef };
}

/**
 * Confirm that an option target points to a page document reference.
 * @param {import('firebase-admin/firestore').DocumentReference | null | undefined} targetPage
 *   Reference stored on the option document.
 * @returns {import('firebase-admin/firestore').DocumentReference | null}
 *   A page reference when valid, otherwise null.
 */
function resolvePageFromTarget(targetPage) {
  if (isPageReference(targetPage)) {
    return /** @type {import('firebase-admin/firestore').DocumentReference} */ (
      targetPage
    );
  }

  return null;
}

/**
 * Confirm that the target page reference exposes the expected API.
 * @param {import('firebase-admin/firestore').DocumentReference | null | undefined} targetPage Candidate page reference.
 * @returns {targetPage is import('firebase-admin/firestore').DocumentReference} True when the reference is valid.
 */
function isPageReference(targetPage) {
  return Boolean(targetPage && typeof targetPage.get === 'function');
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
  if (!isAuthorIdentifier(authorId)) {
    return null;
  }

  return db.doc(`authors/${authorId}`);
}

/**
 * Determine whether the provided value can serve as an author identifier.
 * @param {unknown} value - Candidate identifier value.
 * @returns {boolean} True when the value is a non-empty string.
 */
function isAuthorIdentifier(value) {
  return typeof value === 'string' && value.length > 0;
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
 * @param {() => string} params.randomUUID UUID generator used to create new document identifiers.
 * @param {() => number} params.random Random number generator for variant metadata.
 * @param {() => unknown} params.getServerTimestamp Function that returns a Firestore server timestamp sentinel.
 * @returns {Promise<PageContext | null>} Resolved context or null when the submission is already processed.
 */
async function resolveIncomingOptionContext({
  db,
  incomingOptionFullName,
  snapshot,
  batch,
  randomUUID,
  random,
  getServerTimestamp,
}) {
  const optionRef = db.doc(incomingOptionFullName);
  const optionSnap = await optionRef.get();

  if (!isSnapshotPresent(optionSnap)) {
    await markSubmissionProcessed(snapshot);
    return null;
  }

  const { variantRef, storyRef: storyRefCandidate } =
    resolveStoryRefFromOption(optionRef);

  if (!storyRefCandidate) {
    return null;
  }

  const optionData = optionSnap.data();
  const targetPage = resolveTargetPageFromOption(optionData);

  const pageContext = await resolveIncomingOptionPageContext({
    targetPage,
    db,
    batch,
    random,
    randomUUID,
    optionRef,
    incomingOptionFullName,
    getServerTimestamp,
    storyRef:
      /** @type {import('firebase-admin/firestore').DocumentReference} */ (
        storyRefCandidate
      ),
  });

  return {
    ...pageContext,
    storyRef: storyRefCandidate,
    variantRef,
  };
}

/**
 * Normalize the target page for an option submission.
 * @param {{ targetPage?: unknown } | undefined} optionData Option document data.
 * @returns {import('firebase-admin/firestore').DocumentReference | null} Target page reference when present.
 */
function resolveTargetPageFromOption(optionData) {
  return resolvePageFromTarget(/** @type {any} */ (optionData?.targetPage));
}

/**
 * Attempt to reuse an existing page context or create a new one.
 * @param {object} params Parameters describing the request.
 * @param {import('firebase-admin/firestore').DocumentReference | null} params.targetPage Page reference to reuse when available.
 * @param {import('firebase-admin/firestore').Firestore} params.db Firestore instance for lookups.
 * @param {import('firebase-admin/firestore').WriteBatch} params.batch Write batch collecting updates.
 * @param {() => number} params.random Random number generator.
 * @param {() => string} params.randomUUID UUID generator for new documents.
 * @param {import('firebase-admin/firestore').DocumentReference} params.optionRef Option reference involved in the submission.
 * @param {string} params.incomingOptionFullName Full document path for the option.
 * @param {() => unknown} params.getServerTimestamp Server timestamp helper.
 * @param {import('firebase-admin/firestore').DocumentReference} params.storyRef Story reference targeting the submission.
 * @returns {Promise<{
 *   pageDocRef: import('firebase-admin/firestore').DocumentReference,
 *   pageNumber: number,
 * }>} Resolved context.
 */
async function resolveIncomingOptionPageContext({
  targetPage,
  db,
  batch,
  random,
  randomUUID,
  optionRef,
  incomingOptionFullName,
  getServerTimestamp,
  storyRef,
}) {
  const existingContext = await resolveExistingPageContext(targetPage);
  if (existingContext) {
    return existingContext;
  }

  return createPageContext({
    storyRef,
    db,
    random,
    randomUUID,
    batch,
    optionRef,
    incomingOptionFullName,
    getServerTimestamp,
  });
}

/**
 * Resolve an existing page reference from a target page selection.
 * @param {import('firebase-admin/firestore').DocumentReference | null | undefined} targetPage The referenced page.
 * @returns {Promise<null | { pageDocRef: import('firebase-admin/firestore').DocumentReference, pageNumber: number }>}
 * Resolved context or null when no existing page is found.
 */
async function resolveExistingPageContext(targetPage) {
  if (!targetPage) {
    return null;
  }

  return buildExistingPageContext(await safeGetPage(targetPage), targetPage);
}

/**
 * Build the context object from an existing page snapshot.
 * @param {import('firebase-admin/firestore').DocumentSnapshot | null} existingPageSnap Snapshot to inspect.
 * @param {import('firebase-admin/firestore').DocumentReference} targetPage Page reference.
 * @returns {{ pageDocRef: import('firebase-admin/firestore').DocumentReference, pageNumber: number } | null}
 * Context object when the snapshot represents an existing page.
 */
function buildExistingPageContext(existingPageSnap, targetPage) {
  if (!isSnapshotPresent(existingPageSnap)) {
    return null;
  }

  return {
    pageDocRef: targetPage,
    pageNumber:
      /** @type {any} */ (/** @type {any} */ (existingPageSnap).data?.())
        .number || null,
  };
}

/**
 * Confirm that a Firestore snapshot exists.
 * @param {import('firebase-admin/firestore').DocumentSnapshot | null | undefined} snapshot Snapshot candidate.
 * @returns {boolean} True when the snapshot is available.
 */
function isSnapshotPresent(snapshot) {
  return Boolean(snapshot && snapshot.exists);
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
 * @param {import('firebase-admin/firestore').DocumentReference} params.storyRef Story reference inferred from the option.
 * @param {import('firebase-admin/firestore').Firestore} params.db Firestore instance.
 * @param {() => number} params.random Random number generator for variant ordering.
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
  randomUUID,
  batch,
  optionRef,
  incomingOptionFullName,
  getServerTimestamp,
}) {
  const nextPageNumber = await findAvailablePageNumber(db, random);

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
 * @returns {Promise<PageContext | null>} Resolved context or null when the submission has already been handled.
 */
async function resolveDirectPageContext({ db, directPageNumber, snapshot }) {
  const pageSnap = await db
    .collectionGroup('pages')
    .where('number', '==', directPageNumber)
    .limit(1)
    .get();

  if (pageSnap.empty) {
    await /** @type {any} */ (snapshot).ref.update({
      processed: true,
    });
    return null;
  }

  const pageDocRef = /** @type {any} */ (pageSnap.docs[0]).ref;
  const storyRef = /** @type {any} */ (pageDocRef).parent?.parent || null;

  return {
    pageDocRef,
    storyRef:
      storyRef ||
      /** @type {import('firebase-admin/firestore').DocumentReference} */ ({}),
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
 * @param {SubmissionData} params.submission Submission payload containing variant content and options.
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
  const variantsSnap = await fetchExistingVariants(pageDocRef);

  const latestName = getLatestVariantName(variantsSnap);
  const nextName = calculateNextVariantName(
    variantsSnap,
    latestName,
    incrementVariantNameFn
  );

  const newVariantRef = resolveVariantRef({
    pageDocRef,
    snapshotRef,
    randomUUID,
  });

  batch.set(
    newVariantRef,
    /** @type {import('firebase-admin/firestore').DocumentData} */ (
      buildVariantPayload(nextName, submission, { random, getServerTimestamp })
    )
  );

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
 * Fetch the most recent variant documents under a page.
 * @param {import('firebase-admin/firestore').DocumentReference} pageDocRef Page document reference.
 * @returns {Promise<import('firebase-admin/firestore').QuerySnapshot>} Snapshot of the most recent variants.
 */
function fetchExistingVariants(pageDocRef) {
  return pageDocRef
    .collection('variants')
    .orderBy('name', 'desc')
    .limit(1)
    .get();
}

/**
 * Ensure the submitting author has a Firestore document.
 * @param {object} params Parameters controlling author record initialization.
 * @param {import('firebase-admin/firestore').Firestore} params.db Firestore instance used to resolve author documents.
 * @param {import('firebase-admin/firestore').WriteBatch} params.batch Write batch used to schedule author writes.
 * @param {SubmissionData} params.submission Submission payload containing author identifiers.
 * @param {() => string} params.randomUUID UUID generator for new author documents.
 * @returns {Promise<void>} Promise that resolves when the author record has been ensured.
 */
async function ensureAuthorRecordExists({ db, batch, submission, randomUUID }) {
  const authorRef = resolveAuthorRef(db, submission.authorId);
  if (!authorRef) {
    return;
  }

  await addAuthorRecordIfMissing(authorRef, batch, randomUUID);
}

/**
 * Create the author document when it does not already exist.
 * @param {import('firebase-admin/firestore').DocumentReference} authorRef Reference to the author document.
 * @param {import('firebase-admin/firestore').WriteBatch} batch Batch used to write the new author record.
 * @param {() => string} randomUUID Function that generates a UUID for new records.
 * @returns {Promise<void>} Resolves once the write has been queued.
 */
async function addAuthorRecordIfMissing(authorRef, batch, randomUUID) {
  const authorSnap = await authorRef.get();
  if (!isSnapshotPresent(authorSnap)) {
    batch.set(authorRef, { uuid: randomUUID() });
  }
}

/**
 * Extract the latest variant name from the provided snapshot.
 * @param {import('firebase-admin/firestore').QuerySnapshot} variantsSnap Snapshot of the existing variants.
 * @returns {string} Latest variant name or an empty string when none exist.
 */
function getLatestVariantName(variantsSnap) {
  const latestDoc = variantsSnap.docs[0];
  return extractVariantNameFromDoc(latestDoc);
}

/**
 * Read the variant name from a document snapshot.
 * @param {{ data: () => Record<string, unknown> } | null | undefined} doc Document snapshot to query.
 * @returns {string} Name of the variant or an empty string when not available.
 */
function extractVariantNameFromDoc(doc) {
  const data = getDocumentData(doc);
  if (!hasNamedProperty(data)) {
    return '';
  }

  return data.name;
}

/**
 * Retrieve the document data when available.
 * @param {{ data: () => Record<string, unknown> } | null | undefined} doc Firestore document snapshot.
 * @returns {Record<string, unknown> | null} Data object or null when missing.
 */
function getDocumentData(doc) {
  if (!doc) {
    return null;
  }

  return doc.data();
}

/**
 * Confirm that the data contains a valid name.
 * @param {Record<string, unknown> | null} value Data candidate.
 * @returns {value is { name: string }} True when a name exists.
 */
function hasNamedProperty(value) {
  return Boolean(value && typeof value.name === 'string');
}

/**
 * Decide what the next variant name should be based on existing names.
 * @param {import('firebase-admin/firestore').QuerySnapshot} variantsSnap Existing variant snapshot list.
 * @param {string} latestName Name of the newest variant.
 * @param {(name: string) => string} incrementVariantNameFn Name increment helper.
 * @returns {string} Next variant name to assign.
 */
function calculateNextVariantName(
  variantsSnap,
  latestName,
  incrementVariantNameFn
) {
  if (variantsSnap.empty) {
    return 'a';
  }

  return incrementVariantNameFn(latestName);
}

/**
 * Resolve the Firestore reference for the new variant document.
 * @param {object} params Inputs used to build the reference.
 * @param {import('firebase-admin/firestore').DocumentReference} params.pageDocRef Page document reference.
 * @param {import('firebase-admin/firestore').DocumentReference} [params.snapshotRef] Submission document reference.
 * @param {() => string} params.randomUUID UUID generator used when snapshot ID is missing.
 * @returns {import('firebase-admin/firestore').DocumentReference} Newly minted variant reference.
 */
function resolveVariantRef({ pageDocRef, snapshotRef, randomUUID }) {
  const variantId = resolveVariantDocumentId(snapshotRef, randomUUID);
  return getVariantCollection(pageDocRef).doc(variantId);
}

/**
 * Choose the identifier used for the variant document.
 * @param {{ id?: string } | null | undefined} snapshotRef Optional snapshot reference.
 * @param {() => string} randomUUID UUID generator fallback.
 * @returns {string} Document identifier.
 */
function resolveVariantDocumentId(snapshotRef, randomUUID) {
  const snapshotId = getSnapshotDocumentId(snapshotRef);
  return snapshotId || randomUUID();
}

/**
 * Extract the identifier from a snapshot when one exists.
 * @param {{ id?: string } | null | undefined} snapshotRef Optional snapshot reference.
 * @returns {string | undefined} Snapshot identifier when available.
 */
function getSnapshotDocumentId(snapshotRef) {
  if (!snapshotRef) {
    return undefined;
  }

  return snapshotRef.id;
}

/**
 * Build the variant document payload written to Firestore.
 * @param {string} nextName Name assigned to the new variant.
 * @param {SubmissionData} submission Submission payload containing variant content.
 * @param {{
 *   random: () => number,
 *   getServerTimestamp: () => unknown,
 * }} helpers Helpers that supply randomization and timestamps.
 * @returns {object} Data stored in the new variant document.
 */
function buildVariantPayload(nextName, submission, helpers) {
  const { random, getServerTimestamp } = helpers;
  return {
    name: nextName,
    content: submission.content,
    authorId: normalizeOptionalString(submission.authorId),
    authorName: submission.author,
    incomingOption: normalizeOptionalString(submission.incomingOptionFullName),
    moderatorReputationSum: 0,
    rand: random(),
    createdAt: getServerTimestamp(),
  };
}

/**
 * Normalize optional values to either the real value or null.
 * @param {unknown} value Candidate value.
 * @returns {unknown} Same value when defined, otherwise null.
 */
function normalizeOptionalString(value) {
  if (typeof value === 'string') {
    return value;
  }

  return null;
}

/**
 * Determine whether a submission lacks enough context to process it.
 * @param {object} params Parameters defining the submission context.
 * @param {string | undefined} params.incomingOptionFullName Path of the triggering option document.
 * @param {number | undefined} params.directPageNumber Page number provided by the submission.
 * @returns {boolean} True when the submission should be marked as processed immediately.
 */
function shouldSkipSubmission({ incomingOptionFullName, directPageNumber }) {
  return !incomingOptionFullName && !Number.isInteger(directPageNumber);
}

/**
 * Mark a submission document as processed.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} snapshot Submission snapshot to update.
 * @returns {Promise<void>} Promise that resolves after the update completes.
 */
async function markSubmissionProcessed(snapshot) {
  await /** @type {any} */ (snapshot).ref.update({ processed: true });
}

/**
 * Resolve the page context for the submission by delegating to the proper resolver.
 * @param {object} params Parameters defining the submission and helpers.
 * @param {import('firebase-admin/firestore').Firestore} params.db Firestore instance.
 * @param {string | undefined} params.incomingOptionFullName Option document path when routing via options.
 * @param {number | undefined} params.directPageNumber Page number provided directly.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} params.snapshot Submission snapshot.
 * @param {import('firebase-admin/firestore').WriteBatch} params.batch Write batch used for option updates.
 * @param {() => string} params.randomUUID UUID generator.
 * @param {() => number} params.random Random number generator for variant ordering.
 * @param {() => unknown} params.getServerTimestamp Server timestamp helper.
 * @returns {Promise<PageContext | null>} Resolved page context or null when the submission should be dropped.
 */
async function resolveSubmissionPageContext({
  db,
  incomingOptionFullName,
  directPageNumber,
  snapshot,
  batch,
  randomUUID,
  random,
  getServerTimestamp,
}) {
  if (incomingOptionFullName) {
    return resolveIncomingOptionContext({
      db,
      incomingOptionFullName,
      snapshot,
      batch,
      randomUUID,
      random,
      getServerTimestamp,
    });
  }

  if (!Number.isInteger(directPageNumber)) {
    return null;
  }

  return resolveDirectPageContext({
    db,
    directPageNumber: /** @type {number} */ (directPageNumber),
    snapshot,
  });
}

/**
 * Validate the references returned from page context resolution.
 * @param {object} params Page context references returned from the resolver.
 * @param {import('firebase-admin/firestore').DocumentReference | null | undefined} params.pageDocRef
 *   Page document reference to validate.
 * @param {import('firebase-admin/firestore').DocumentReference | null | undefined} params.storyRef
 *   Story document reference to validate.
 * @returns {{
 *   pageDocRef: import('firebase-admin/firestore').DocumentReference,
 *   storyRef: import('firebase-admin/firestore').DocumentReference,
 * }} Validated references.
 */
function ensurePageContextReferences({ pageDocRef, storyRef }) {
  return {
    pageDocRef: ensureDocumentReference(
      pageDocRef,
      'pageDocRef.collection must be a function'
    ),
    storyRef: ensureDocumentReference(
      storyRef,
      'storyRef.collection must be a function'
    ),
  };
}

/**
 * Finalize a processed submission by creating the variant and queuing follow-up updates.
 * @param {object} params Parameters describing the work to commit.
 * @param {import('firebase-admin/firestore').WriteBatch} params.batch Write batch collecting updates.
 * @param {import('firebase-admin/firestore').DocumentReference} params.pageDocRef Page document reference.
 * @param {import('firebase-admin/firestore').DocumentReference} params.storyRef Story document reference.
 * @param {import('firebase-admin/firestore').DocumentReference | null} params.variantRef Existing variant reference that may need cleanup.
 * @param {object} params.submission Submission payload to persist.
 * @param {() => string} params.randomUUID UUID generator for new documents.
 * @param {() => number} params.random Random source for variant rand.
 * @param {() => unknown} params.getServerTimestamp Firestore server timestamp helper.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} params.snapshot Submission snapshot.
 * @param {import('firebase-admin/firestore').Firestore} params.db Firestore instance used for stats and author documents.
 * @param {{
 *   serverTimestamp: () => unknown,
 *   increment: (value: number) => unknown,
 * }} params.fieldValue FieldValue helper used for merging stats.
 * @returns {Promise<void>} Promise that resolves after writes are committed.
 */
async function finalizeSubmission({
  batch,
  pageDocRef,
  storyRef,
  variantRef,
  submission,
  randomUUID,
  random,
  getServerTimestamp,
  snapshot,
  db,
  fieldValue,
}) {
  await createVariantWithOptions({
    pageDocRef,
    snapshotRef: /** @type {any} */ (snapshot).ref,
    batch,
    submission,
    randomUUID,
    getServerTimestamp,
    random,
    incrementVariantNameFn: incrementVariantName,
  });

  const storyStatsRef = resolveStoryStatsRef(db, storyRef);

  batch.update(storyStatsRef, {
    variantCount: fieldValue.increment(1),
  });

  queueVariantDirtyReset(batch, variantRef);

  batch.update(/** @type {any} */ (snapshot).ref, { processed: true });
  await ensureAuthorRecordExists({ db, batch, submission, randomUUID });

  await batch.commit();
}

/**
 * Queue the variant dirty reset when a reference exists.
 * @param {import('firebase-admin/firestore').WriteBatch} batch Batch used for updates.
 * @param {import('firebase-admin/firestore').DocumentReference | null} variantRef Variant reference.
 */
function queueVariantDirtyReset(batch, variantRef) {
  if (variantRef) {
    batch.update(variantRef, { dirty: null });
  }
}

/**
 * Process a submission that still needs work.
 * @param {object} params Inputs required to process the submission.
 * @param {SubmissionData} params.submission Submission payload.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} params.snapshot Submission snapshot.
 * @param {import('firebase-admin/firestore').Firestore} params.db Firestore instance.
 * @param {() => string} params.randomUUID UUID generator for new documents.
 * @param {() => number} params.random Random number generator for variant ordering.
 * @param {() => unknown} params.getServerTimestamp Server timestamp helper.
 * @param {{
 *   serverTimestamp: () => unknown,
 *   increment: (value: number) => unknown,
 * }} params.fieldValue FieldValue helper used for stats.
 * @returns {Promise<null>} Promise that resolves after processing completes.
 */
async function processUnprocessedSubmission({
  submission,
  snapshot,
  db,
  randomUUID,
  random,
  getServerTimestamp,
  fieldValue,
}) {
  const incomingOptionFullName = submission.incomingOptionFullName;
  const directPageNumber = submission.pageNumber;

  if (
    await shouldSkipAndMarkSubmission({
      incomingOptionFullName,
      directPageNumber,
      snapshot,
    })
  ) {
    return null;
  }

  const batch = db.batch();

  return processSubmissionWithContext({
    submission,
    snapshot,
    db,
    batch,
    randomUUID,
    random,
    getServerTimestamp,
    fieldValue,
    incomingOptionFullName,
    directPageNumber,
  });
}

/**
 * Skip and mark submissions that lack enough context.
 * @param {object} params Inputs to evaluate and mark the submission.
 * @param {string | undefined} params.incomingOptionFullName Incoming option document path.
 * @param {number | undefined} params.directPageNumber Direct page number from the submission.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} params.snapshot Submission snapshot to update.
 * @returns {Promise<boolean>} True when the submission was skipped and marked.
 */
async function shouldSkipAndMarkSubmission({
  incomingOptionFullName,
  directPageNumber,
  snapshot,
}) {
  if (shouldSkipSubmission({ incomingOptionFullName, directPageNumber })) {
    await markSubmissionProcessed(snapshot);
    return true;
  }

  return false;
}

/**
 * Continue processing once the submission has enough context.
 * @param {object} params Parameters required to resolve and finalize the submission.
 * @param {object} params.submission Submission payload.
 * @param {import('firebase-admin/firestore').DocumentSnapshot} params.snapshot Submission snapshot.
 * @param {import('firebase-admin/firestore').Firestore} params.db Firestore instance.
 * @param {import('firebase-admin/firestore').WriteBatch} params.batch Write batch used for updates.
 * @param {() => string} params.randomUUID UUID generator for new documents.
 * @param {() => number} params.random Random number generator for variant ordering.
 * @param {() => unknown} params.getServerTimestamp Server timestamp helper.
 * @param {{
 *   serverTimestamp: () => unknown,
 *   increment: (value: number) => unknown,
 * }} params.fieldValue FieldValue helpers used for stats updates.
 * @param {string | undefined} params.incomingOptionFullName Option document path.
 * @param {number | undefined} params.directPageNumber Direct page number.
 * @returns {Promise<null>} Null once processing completes.
 */
async function processSubmissionWithContext({
  submission,
  snapshot,
  db,
  batch,
  randomUUID,
  random,
  getServerTimestamp,
  fieldValue,
  incomingOptionFullName,
  directPageNumber,
}) {
  const pageContext = await resolveSubmissionPageContext({
    db,
    incomingOptionFullName,
    directPageNumber,
    snapshot,
    batch,
    randomUUID,
    random,
    getServerTimestamp,
  });

  if (!pageContext) {
    await markSubmissionProcessed(snapshot);
    return null;
  }

  const { pageDocRef, storyRef, variantRef } = pageContext;
  const { pageDocRef: ensuredPageDocRef, storyRef: ensuredStoryRef } =
    ensurePageContextReferences({ pageDocRef, storyRef });

  await finalizeSubmission({
    batch,
    pageDocRef:
      /** @type {import('firebase-admin/firestore').DocumentReference} */ (
        ensuredPageDocRef
      ),
    storyRef:
      /** @type {import('firebase-admin/firestore').DocumentReference} */ (
        ensuredStoryRef
      ),
    variantRef,
    submission,
    randomUUID,
    random,
    getServerTimestamp,
    snapshot,
    db,
    fieldValue,
  });

  return null;
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
 *   The helper reuses the module-scoped {@link findAvailablePageNumber} and {@link incrementVariantName}.
 * @returns {(snap: import('firebase-admin/firestore').DocumentSnapshot<import('firebase-admin/firestore').DocumentData>, context?: { params?: Record<string, string> }) => Promise<null>} Firestore trigger handler that processes new page submissions.
 */
export function createProcessNewPageHandler({
  db,
  fieldValue,
  randomUUID,
  random,
}) {
  const getServerTimestamp = resolveServerTimestamp(fieldValue);

  return async function handleProcessNewPage(snapshot) {
    const data = snapshot.data();
    const submission = /** @type {SubmissionData} */ (data || {});

    if (submission.processed) {
      return null;
    }

    return processUnprocessedSubmission({
      submission,
      snapshot,
      db,
      randomUUID,
      random: random || Math.random,
      getServerTimestamp,
      fieldValue,
    });
  };
}

export { resolveVariantDocumentId };
