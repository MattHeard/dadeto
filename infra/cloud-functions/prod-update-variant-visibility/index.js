import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';

initializeApp();
const db = getFirestore();

/**
 * Update variant visibility when a new moderation rating is created.
 */
export const prodUpdateVariantVisibility = functions
  .region('europe-west1')
  .firestore.document('moderationRatings/{ratingId}')
  .onCreate(async snap => {
    const { variantId, isApproved } = snap.data();
    if (!variantId || typeof isApproved !== 'boolean') {
      return null;
    }

    const newRating = isApproved ? 1.0 : 0.0;

    const variantSnap = await db
      .collectionGroup('variants')
      .where(FieldPath.documentId(), '==', variantId)
      .limit(1)
      .get();
    if (variantSnap.empty) {
      return null;
    }

    const variantDoc = variantSnap.docs[0];
    const variantData = variantDoc.data();
    const visibility =
      typeof variantData.visibility === 'number' ? variantData.visibility : 0;
    const moderationRatingCount =
      typeof variantData.moderationRatingCount === 'number'
        ? variantData.moderationRatingCount
        : 0;
    const moderatorReputationSum =
      typeof variantData.moderatorReputationSum === 'number'
        ? variantData.moderatorReputationSum
        : 0;

    const numerator = visibility * moderatorReputationSum + newRating * 1;
    const denominator = moderationRatingCount + 1;
    const newVisibility = numerator / denominator;

    await variantDoc.ref.update({
      visibility: newVisibility,
      moderatorRatingCount: moderationRatingCount + 1,
      moderatorReputationSum: moderatorReputationSum + 1,
    });
    return null;
  });
