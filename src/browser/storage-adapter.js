import { adaptAllowEffectsBag } from '../adapters/allow-effects.js';

/**
 * @typedef {{getItem: (key: string) => string | null, setItem: (key: string, value: string) => void, removeItem: (key: string) => void}} BrowserStorageMethods
 */

/**
 * @typedef {{getItem: 'query', setItem: 'effect', removeItem: 'effect'}} BrowserStorageClassification
 */

/**
 * Adapt browser Storage so reads remain queries and mutations require permission.
 * @param {BrowserStorageMethods} storageObj Native Storage-compatible object.
 * @returns {import('../adapters/allow-effects').AdaptedAllowEffectsBag<BrowserStorageMethods, BrowserStorageClassification>} Restricted permission-aware storage.
 */
export const createEffectStorage = storageObj =>
  adaptAllowEffectsBag(storageObj, {
    getItem: 'query',
    setItem: 'effect',
    removeItem: 'effect',
  });
