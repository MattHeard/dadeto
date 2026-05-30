import {
  functions,
  getFirestoreInstance,
} from './update-variant-visibility-gcf.js';
import { createUpdateVariantVisibilityHandle } from './update-variant-visibility-core.js';

const handle = createUpdateVariantVisibilityHandle(
  functions,
  getFirestoreInstance
);

export { handle };
