/**
 * @param {{ db: any, data: any }} input Input values.
 * @returns {{ path: string } | null | undefined} Variant reference.
 */
const getVariantReference = input => {
  const { db, data } = /** @type {{ db: any, data: any }} */ (input);
  if (typeof data.variant === 'string') {
    return db.doc(data.variant);
  }

  return data.variant;
};

/**
 * @param {{ data: () => any }} moderatorSnap Moderator snapshot.
 * @returns {Record<string, unknown>} Snapshot data or empty object.
 */
const getModeratorData = moderatorSnap =>
  /** @type {Record<string, unknown>} */ (moderatorSnap.data() ?? {});

/**
 * @param {{ FieldValue: any, moderatorRef: any, variantRef: any }} input Assignment inputs.
 * @returns {{ variantId: string, clearAssignment: () => Promise<void> | void }} Assignment helper.
 */
const buildAssignment = input => {
  const { FieldValue, moderatorRef, variantRef } =
    /** @type {{ FieldValue: any, moderatorRef: any, variantRef: any }} */ (
      input
    );

  return {
    variantId: `/${variantRef.path}`,
    clearAssignment: () =>
      moderatorRef.update({ variant: FieldValue.delete() }),
  };
};

/**
 * @param {{ get: () => Promise<any> }} moderatorRef Moderator ref.
 * @returns {Promise<{ exists: boolean } | null>} Snapshot or null.
 */
const getExistingModeratorSnapshot = async moderatorRef => {
  const moderatorSnap = await moderatorRef.get();
  if (!moderatorSnap.exists) return null;
  return moderatorSnap;
};

/**
 * @param {{ db: any, FieldValue: any, moderatorRef: any, moderatorSnap: any }} input Assignment inputs.
 * @returns {{ variantId: string, clearAssignment: () => Promise<void> | void } | null} Assignment or null.
 */
const getVariantAssignment = input => {
  const { db, FieldValue, moderatorRef, moderatorSnap } =
    /** @type {{ db: any, FieldValue: any, moderatorRef: any, moderatorSnap: any }} */ (
      input
    );

  const variantRef = getVariantReference({
    db,
    data: getModeratorData(moderatorSnap),
  });
  if (!variantRef) return null;
  return buildAssignment({ FieldValue, moderatorRef, variantRef });
};

/**
 * @param {{ db: any, FieldValue: any }} input Dependencies.
 * @returns {(uid: string) => Promise<{ variantId: string, clearAssignment: () => Promise<void> | void } | null>} Fetcher.
 */
const createFetchModeratorAssignment = input => {
  const { db, FieldValue } = /** @type {{ db: any, FieldValue: any }} */ (
    input
  );
  return async uid => {
    const moderatorRef = db.collection('moderators').doc(uid);
    const moderatorSnap = await getExistingModeratorSnapshot(moderatorRef);
    if (!moderatorSnap) return null;
    return getVariantAssignment({
      db,
      FieldValue,
      moderatorRef,
      moderatorSnap,
    });
  };
};

/**
 * @param {{ collection: (name: string) => any }} db Firestore-like DB.
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
 * @param {{ db: any, auth: any, FieldValue: any, crypto: any }} input Dependency bag.
 * @returns {{
 *   verifyIdToken: (token: string) => Promise<{ uid?: string | null } | null | undefined>,
 *   fetchModeratorAssignment: (uid: string) => Promise<{ variantId: string, clearAssignment: () => Promise<void> | void } | null>,
 *   recordModerationRating: (rating: { id: string, moderatorId: string, variantId: string, isApproved: boolean, ratedAt: unknown }) => Promise<void>,
 *   randomUUID: () => string,
 *   getServerTimestamp: () => unknown,
 * }} Dependencies for moderation rating.
 */
const createModerationRatingDependencies = input => {
  const { db, auth, FieldValue, crypto } =
    /** @type {{ db: any, auth: any, FieldValue: any, crypto: any }} */ (input);

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
