import functions from './firebase-functions.js';
import { fetchFn as nativeFetchFn } from './common-gcf.js';
import { createEffectInvocationBoundary } from '../allow-effects.js';

export { functions };
export { FieldValue } from 'firebase-admin/firestore';
export { Storage } from '@google-cloud/storage';
export { createFirebaseAppManager } from './common-gcf.js';
export { getFirestoreInstance } from './firestore.js';
export { crypto, getEnvironmentVariables } from './common-gcf.js';

/** @type {(permission: import('../../../types/allow-effects').AllowEffects, url: string, init?: object) => Promise<Response>} */
export const fetchFn = (_permission, url, init) => nativeFetchFn(url, init);

/**
 * Bind a fresh permission to one render-variant command.
 * @param {(permission: import('../../../types/allow-effects').AllowEffects) => Promise<unknown>} handler Effectful command.
 * @returns {Promise<unknown>} Command result.
 */
export const bindEffectBoundary = handler =>
  createEffectInvocationBoundary(handler)();

/**
 * Fetch adapter dedicated to cache invalidation POSTs.
 * @type {(permission: import('../../../types/allow-effects').AllowEffects, url: string, init?: object) => Promise<Response>}
 */
export const effectFetchFn = (permission, url, init) => fetchFn(permission, url, init);
