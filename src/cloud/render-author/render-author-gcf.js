import functions from '../render-variant/firebase-functions.js';
import { createEffectInvocationBoundary } from '../allow-effects.js';
export { functions };
export { FieldValue } from 'firebase-admin/firestore';
export { Storage } from '@google-cloud/storage';
export { getFirestoreInstance } from '../render-variant/firestore.js';

export {
  saveAuthorHtml,
  updateAuthorDocument,
} from './effect-adapters.js';

/**
 * Bind a fresh permission to one author-render trigger invocation.
 * @param {(allowEffects: import('../../../types/allow-effects').AllowEffects, ...args: any[]) => Promise<unknown>} handler Effectful trigger handler.
 * @returns {Promise<unknown>} Effectful trigger result.
 */
export const bindEffectBoundary = handler =>
  createEffectInvocationBoundary(handler)();
