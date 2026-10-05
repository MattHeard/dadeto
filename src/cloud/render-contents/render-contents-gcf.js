import functions from './firebase-functions.js';
import { fetchFn } from './common-gcf.js';
import { createEffectInvocationBoundary } from '../allow-effects.js';

export { functions };
export { Storage } from '@google-cloud/storage';
export { getAuth } from 'firebase-admin/auth';
export { createFirebaseAppManager } from './common-gcf.js';
export { getFirestoreInstance } from './firestore.js';
export { ADMIN_UID } from './common-core.js';
export { fetchFn, crypto, getEnvironmentVariables } from './common-gcf.js';

/**
 * Bind a fresh permission to one render-contents command.
 * @param {(permission: import('../../../types/allow-effects').AllowEffects) => Promise<unknown>} handler Effectful command.
 * @returns {Promise<unknown>} Command result.
 */
export const bindEffectBoundary = handler =>
  createEffectInvocationBoundary(handler)();

/**
 * Fetch adapter dedicated to CDN invalidation POSTs.
 * @type {(permission: import('../../../types/allow-effects').AllowEffects, url: string, init?: object) => Promise<Response>}
 */
export const effectFetchFn = (_permission, url, init) => fetchFn(url, init);
