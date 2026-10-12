/** @typedef {import('../../../../types/allow-effects').AllowEffects} AllowEffects */
/** @typedef {{ path: string, get: () => Promise<{ exists: boolean, data: () => unknown }> }} ModerationReference */
/** @typedef {{ doc: (path: string) => ModerationReference, collection: (name: string) => { doc: (id: string) => ModerationReference } }} ModerationDatabase */
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
 * @param {{ FieldValue: ModerationFieldValue, moderatorRef: ModerationReference, variantRef: ModerationReference, updateModeratorAssignment: (permission: AllowEffects, moderatorRef: object, update: object) => Promise<void> }} input Assignment inputs.
 * @returns {{ variantId: string, clearAssignment: (permission: AllowEffects) => Promise<void> }} Assignment helper.
 */
const buildAssignment = input => {
  const { FieldValue, moderatorRef, variantRef, updateModeratorAssignment } =
    input;

  return {
    variantId: `/${variantRef.path}`,
    clearAssignment: permission =>
      updateModeratorAssignment(permission, moderatorRef, {
        variant: FieldValue.delete(),
      }),
  };
};

/**
 * @param {{ get: () => Promise<{ exists: boolean }> }} moderatorRef Moderator ref.
 * @returns {Promise<any>} Snapshot or null.
 */
const getExistingModeratorSnapshot = async moderatorRef => {
  const moderatorSnap = await moderatorRef.get();
  if (!moderatorSnap.exists) return null;
  return moderatorSnap;
};

/**
 * @param {{ db: ModerationDatabase, FieldValue: ModerationFieldValue, moderatorRef: ModerationReference, moderatorSnap: { data: () => unknown }, updateModeratorAssignment: (permission: AllowEffects, moderatorRef: object, update: object) => Promise<void> }} input Assignment inputs.
 * @returns {any} Assignment or null.
 */
const getVariantAssignment = input => {
  const variantRef = getVariantReference({
    db: input.db,
    data: getModeratorData(input.moderatorSnap),
  });
  if (!variantRef) return null;
  return buildAssignment({
    FieldValue: input.FieldValue,
    moderatorRef: input.moderatorRef,
    variantRef,
    updateModeratorAssignment: input.updateModeratorAssignment,
  });
};

/**
 * @param {{ db: ModerationDatabase, FieldValue: ModerationFieldValue, updateModeratorAssignment: (permission: AllowEffects, moderatorRef: object, update: object) => Promise<void> }} input Dependencies.
 * @returns {(uid: string) => Promise<{ variantId: string, clearAssignment: (permission: AllowEffects) => Promise<void> } | null>} Fetcher.
 */
const createFetchModeratorAssignment = input => {
  const { db, FieldValue, updateModeratorAssignment } = input;
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
        updateModeratorAssignment,
      })
    );
  };
};

/**
 * @param {(permission: AllowEffects, db: object, rating: { id: string, moderatorId: string, variantId: string, isApproved: boolean, ratedAt: unknown }) => Promise<void>} recordRating Write adapter.
 * @param {ModerationDatabase} db Firestore-like DB.
 * @returns {(permission: AllowEffects, rating: { id: string, moderatorId: string, variantId: string, isApproved: boolean, ratedAt: unknown }) => Promise<void>} Recorder.
 */
const createRecordModerationRating = (recordRating, db) => {
  return async (permission, rating) => recordRating(permission, db, rating);
};

/**
 * @param {{ db: ModerationDatabase, auth: { verifyIdToken: (token: string) => Promise<{ uid?: string | null } | null | undefined> }, FieldValue: ModerationFieldValue, crypto: { randomUUID: () => string }, updateModeratorAssignment: (permission: AllowEffects, moderatorRef: object, update: object) => Promise<void>, recordRating: (permission: AllowEffects, db: object, rating: { id: string, moderatorId: string, variantId: string, isApproved: boolean, ratedAt: unknown }) => Promise<void> }} input Dependency bag.
 * @returns {{
 *   verifyIdToken: (token: string) => Promise<{ uid?: string | null } | null | undefined>,
 *   fetchModeratorAssignment: (uid: string) => Promise<{ variantId: string, clearAssignment: (permission: AllowEffects) => Promise<void> } | null>,
 *   recordModerationRating: (permission: AllowEffects, rating: { id: string, moderatorId: string, variantId: string, isApproved: boolean, ratedAt: unknown }) => Promise<void>,
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
      updateModeratorAssignment: input.updateModeratorAssignment,
    }),
    recordModerationRating: createRecordModerationRating(
      input.recordRating,
      db
    ),
    randomUUID: () => crypto.randomUUID(),
    getServerTimestamp: () => FieldValue.serverTimestamp(),
  };
};

export { createModerationRatingDependencies };
