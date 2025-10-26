import {
  functions,
  getFirestoreInstance,
} from './prod-update-variant-visibility-gcf.js';
import { createProdUpdateVariantVisibilityHandler } from './prod-update-variant-visibility-core.js';

const db = getFirestoreInstance();

const handleProdUpdateVariantVisibility =
  createProdUpdateVariantVisibilityHandler({ db });

export const prodUpdateVariantVisibility = functions
  .region('europe-west1')
  .firestore.document('moderationRatings/{ratingId}')
  .onCreate(handleProdUpdateVariantVisibility);

export { handleProdUpdateVariantVisibility };
