import {
  functions,
  getFirestoreInstance,
} from './update-variant-visibility-gcf.js';
import { createFirestoreHandle } from '../../core/cloud/firestore-handle.js';
import { createUpdateVariantVisibilityHandler } from './update-variant-visibility-core.js';

const handle = createFirestoreHandle({
  functions,
  getFirestoreInstance,
  documentPath: 'moderationRatings/{ratingId}',
  createHandler: createUpdateVariantVisibilityHandler,
});

export { handle };
