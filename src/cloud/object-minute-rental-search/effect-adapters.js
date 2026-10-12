/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */
import { createEffectStartupBoundary } from '../allow-effects.js';

export function initializeSearchFirebaseApp(allowEffects, initializeApp) {
  void allowEffects;
  return initializeApp();
}

export function createSearchFirestoreClient(allowEffects, getFirestore, app, databaseId) {
  void allowEffects;
  return getFirestore(app, databaseId);
}

export function createSearchStorageClient(allowEffects, StorageConstructor) {
  void allowEffects;
  return new StorageConstructor();
}

/** @returns {object} Initialized SDK resources. */
export function createSearchStartupResources(initializeApp, getFirestore, StorageConstructor, databaseId) {
  return createEffectStartupBoundary(allowEffects => {
    const app = initializeSearchFirebaseApp(allowEffects, initializeApp);
    return { app, db: createSearchFirestoreClient(allowEffects, getFirestore, app, databaseId), storage: createSearchStorageClient(allowEffects, StorageConstructor) };
  });
}

/**
 * Bind an HTTP response to permission-first operations used by search core.
 * @param {object} response Express response.
 * @returns {object} Permission-first response operations.
 */
export function createSearchHttpResponseEffectAdapters(response) {
  return {
    setHeader(allowEffects, name, value) {
      void allowEffects;
      return response.setHeader?.(name, value);
    },
    setStatus(allowEffects, status) {
      void allowEffects;
      return response.status(status);
    },
    sendJson(allowEffects, body, status) {
      void allowEffects;
      const target = status === undefined ? response : response.status(status);
      return target.json(body);
    },
  };
}
