import { getFirestoreInstance } from '../firestore.js';
import * as functions from 'firebase-functions';

const db = getFirestoreInstance();

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

    const variantPath = variantId.replace(/^\//, '');
    const variantRef = db.doc(variantPath);
    const variantSnap = await variantRef.get();
    if (!variantSnap.exists) {
      return null;
    }

    const variantData = variantSnap.data();
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

    await variantRef.update({
      visibility: newVisibility,
      moderatorRatingCount: moderationRatingCount + 1,
      moderatorReputationSum: moderatorReputationSum + 1,
    });
    return null;
  });
