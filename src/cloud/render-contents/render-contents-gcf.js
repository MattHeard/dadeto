import functions from './firebase-functions.js';
import { fetchFn as nativeFetchFn } from './common-gcf.js';
import { createEffectInvocationBoundary } from '../allow-effects.js';

export { functions };
export { Storage } from '@google-cloud/storage';
export { getAuth } from 'firebase-admin/auth';
export { createFirebaseAppManager } from './common-gcf.js';
export { getFirestoreInstance } from './firestore.js';
export { ADMIN_UID } from './common-core.js';
export { crypto, getEnvironmentVariables } from './common-gcf.js';

/** @type {(permission: import('../../../types/allow-effects').AllowEffects, url: string, init?: object) => Promise<Response>} */
export const fetchFn = (_permission, url, init) => nativeFetchFn(url, init);

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
export const effectFetchFn = (permission, url, init) => fetchFn(permission, url, init);

/**
 * Create the Cloud Storage write adapter for a contents renderer.
 * @param {unknown} storage Cloud Storage client.
 * @param {string} bucketName Destination bucket.
 * @returns {(permission: import('../../../types/allow-effects').AllowEffects, path: string, content: string, options: object) => Promise<unknown>} Permission-aware storage writer.
 */
export function createSaveRenderedPage(storage, bucketName) {
  const storageClient = /** @type {{ bucket: (name: string) => { file: (path: string) => { save: (content: string, options: object) => Promise<unknown> } } }} */ (
    storage
  );
  return function saveRenderedPage(permission, path, content, options) {
    void permission;
    return storageClient.bucket(bucketName).file(path).save(content, options);
  };
}
