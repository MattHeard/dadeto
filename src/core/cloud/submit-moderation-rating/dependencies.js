// @ts-nocheck
const getVariantReference = ({ db, data }) => {
  if (typeof data.variant === 'string') {
    return db.doc(data.variant);
  }

  return data.variant;
};

const getModeratorData = moderatorSnap => moderatorSnap.data() ?? {};

const buildAssignment = ({ FieldValue, moderatorRef, variantRef }) => ({
  variantId: `/${variantRef.path}`,
  clearAssignment: () => moderatorRef.update({ variant: FieldValue.delete() }),
});

const getExistingModeratorSnapshot = async moderatorRef => {
  const moderatorSnap = await moderatorRef.get();
  if (!moderatorSnap.exists) return null;
  return moderatorSnap;
};

const getVariantAssignment = ({
  db,
  FieldValue,
  moderatorRef,
  moderatorSnap,
}) => {
  const variantRef = getVariantReference({
    db,
    data: getModeratorData(moderatorSnap),
  });
  if (!variantRef) return null;
  return buildAssignment({ FieldValue, moderatorRef, variantRef });
};

const createFetchModeratorAssignment = ({ db, FieldValue }) => {
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

const createRecordModerationRating =
  db =>
  async ({ id, moderatorId, variantId, isApproved, ratedAt }) =>
    db
      .collection('moderationRatings')
      .doc(id)
      .set({ moderatorId, variantId, isApproved, ratedAt });

const createModerationRatingDependencies = ({
  db,
  auth,
  FieldValue,
  crypto,
}) => ({
  verifyIdToken: token => auth.verifyIdToken(token),
  fetchModeratorAssignment: createFetchModeratorAssignment({ db, FieldValue }),
  recordModerationRating: createRecordModerationRating(db),
  randomUUID: () => crypto.randomUUID(),
  getServerTimestamp: () => FieldValue.serverTimestamp(),
});

export { createModerationRatingDependencies };
