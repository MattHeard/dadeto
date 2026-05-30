import {
  functions,
  getFirestoreInstance,
} from './update-variant-visibility-gcf.js';
import { createUpdateVariantVisibilityHandler } from './update-variant-visibility-core.js';

const db = getFirestoreInstance();

const handleUpdateVariantVisibility = createUpdateVariantVisibilityHandler({
  db,
});

export const handle = functions
  .region('europe-west1')
  .firestore.document('moderationRatings/{ratingId}')
  .onCreate(handleUpdateVariantVisibility);

export { handleUpdateVariantVisibility };
