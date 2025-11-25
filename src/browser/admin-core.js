export * from '../core/browser/admin/core.js';

/**
 * Configure Firebase when running in browser environments.
 * @param {(config: { apiKey: string, authDomain: string, projectId: string }) => void} initApp - Firebase initialization helper.
 */
export function setupFirebase(initApp) {
  initApp({
    apiKey: 'AIzaSyDRc1CakoDi6airj7t7DgY4KDSlxNwKIIQ',
    authDomain: 'irien-465710.firebaseapp.com',
    projectId: 'irien-465710',
  });
}

/**
 * Create a removeItem helper that reads storage lazily and validates its API.
 * @param {() => Storage | null | undefined} getStorage - Factory for the storage object.
 * @returns {(key: string) => void} Function that removes an item using the provided storage.
 */
export function createRemoveItem(getStorage) {
  return key => {
    const storage = getStorage();
    if (!storage) {
      throw new Error('sessionStorage is not available');
    }
    if (typeof storage.removeItem !== 'function') {
      throw new Error('sessionStorage.removeItem is not a function');
    }
    storage.removeItem(key);
  };
}

/**
 * Build a handler that wraps sessionStorage access on the given global scope.
 * @param {typeof globalThis} scope - Global scope that should provide `sessionStorage`.
 * @returns {{ removeItem: (key: string) => void }} Session-storage handler.
 */
export function createSessionStorageHandler(scope = globalThis) {
  return {
    removeItem: createRemoveItem(() => scope?.sessionStorage),
  };
}
