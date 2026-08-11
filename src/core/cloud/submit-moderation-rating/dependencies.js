/** @typedef {{ path: string, update: (data: object) => Promise<void> | void, get: () => Promise<{ exists: boolean, data: () => unknown }> }} ModerationReference */
/** @typedef {{ doc: (path: string) => ModerationReference, collection: (name: string) => { doc: (id: string) => { set: (data: object) => Promise<void> } } }} ModerationDatabase */
/** @typedef {{ delete: () => unknown, serverTimestamp: () => unknown }} ModerationFieldValue */
/**
 * @param {{ db: ModerationDatabase, data: Record<string, unknown> }} input Input values.
 * @returns {any} Variant reference.
 */
const getVariantReference = input => {
  const { db, data } = input;
  if (typeof data.variant === 'string') {
    return /** @type {any} */ (db.doc(data.variant));
  }

  return data.variant;
};

/**
 * @param {{ data: () => unknown }} moderatorSnap Moderator snapshot.
 * @returns {Record<string, unknown>} Snapshot data or empty object.
 */
const getModeratorData = moderatorSnap =>
  /** @type {Record<string, unknown>} */ (moderatorSnap.data() ?? {});

/**
 * @param {{ FieldValue: ModerationFieldValue, moderatorRef: ModerationReference, variantRef: ModerationReference }} input Assignment inputs.
 * @returns {{ variantId: string, clearAssignment: () => Promise<void> | void }} Assignment helper.
 */
const buildAssignment = input => {
  const { FieldValue, moderatorRef, variantRef } = input;

  return {
    variantId: `/${variantRef.path}`,
    clearAssignment: () =>
      moderatorRef.update({ variant: FieldValue.delete() }),
  };
};

/**
 * @param {{ get: () => Promise<{ exists: boolean }> }} moderatorRef Moderator ref.
 * @returns {Promise<any>} Snapshot or null.
 */
const getExistingModeratorSnapshot = async moderatorRef => {
  const moderatorSnap = /** @type {any} */ (await moderatorRef.get());
  if (!moderatorSnap.exists) return null;
  return moderatorSnap;
};

/**
 * @param {{ db: ModerationDatabase, FieldValue: ModerationFieldValue, moderatorRef: ModerationReference, moderatorSnap: { data: () => unknown } }} input Assignment inputs.
 * @returns {any} Assignment or null.
 */
const getVariantAssignment = input => {
  const { db, FieldValue, moderatorRef, moderatorSnap } = input;

  const variantRef = getVariantReference({
    db,
    data: getModeratorData(moderatorSnap),
  });
  if (!variantRef) return null;
  return buildAssignment({ FieldValue, moderatorRef, variantRef });
};

/**
 * @param {{ db: ModerationDatabase, FieldValue: ModerationFieldValue }} input Dependencies.
 * @returns {(uid: string) => Promise<{ variantId: string, clearAssignment: () => Promise<void> | void } | null>} Fetcher.
 */
const createFetchModeratorAssignment = input => {
  const { db, FieldValue } = input;
  return async uid => {
    const moderatorRef = db.collection('moderators').doc(uid);
    const moderatorSnap = await getExistingModeratorSnapshot(
      /** @type {any} */ (moderatorRef)
    );
    if (!moderatorSnap) return null;
    return getVariantAssignment(
      /** @type {any} */ ({
        db,
        FieldValue,
        moderatorRef,
        moderatorSnap,
      })
    );
  };
};

/**
 * @param {ModerationDatabase} db Firestore-like DB.
 * @returns {(input: { id: string, moderatorId: string, variantId: string, isApproved: boolean, ratedAt: unknown }) => Promise<void>} Recorder.
 */
const createRecordModerationRating = db => {
  return async ({ id, moderatorId, variantId, isApproved, ratedAt }) => {
    await db
      .collection('moderationRatings')
      .doc(id)
      .set({ moderatorId, variantId, isApproved, ratedAt });
  };
};

/**
 * @param {{ db: ModerationDatabase, auth: { verifyIdToken: (token: string) => Promise<{ uid?: string | null } | null | undefined> }, FieldValue: ModerationFieldValue, crypto: { randomUUID: () => string } }} input Dependency bag.
 * @returns {{
 *   verifyIdToken: (token: string) => Promise<{ uid?: string | null } | null | undefined>,
 *   fetchModeratorAssignment: (uid: string) => Promise<{ variantId: string, clearAssignment: () => Promise<void> | void } | null>,
 *   recordModerationRating: (rating: { id: string, moderatorId: string, variantId: string, isApproved: boolean, ratedAt: unknown }) => Promise<void>,
 *   randomUUID: () => string,
 *   getServerTimestamp: () => unknown,
 * }} Dependencies for moderation rating.
 */
const createModerationRatingDependencies = input => {
  const { db, auth, FieldValue, crypto } = input;

  return {
    verifyIdToken: token => auth.verifyIdToken(token),
    fetchModeratorAssignment: createFetchModeratorAssignment({
      db,
      FieldValue,
    }),
    recordModerationRating: createRecordModerationRating(db),
    randomUUID: () => crypto.randomUUID(),
    getServerTimestamp: () => FieldValue.serverTimestamp(),
  };
};

export { createModerationRatingDependencies };
