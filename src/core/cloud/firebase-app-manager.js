import { ensureFirebaseAppOnce } from './cloud-core.js';

/** @typedef {import('../../../types/allow-effects').AllowEffects} AllowEffects */

/**
 * Create helpers that manage Firebase Admin app initialization state.
 * @param {(allowEffects: AllowEffects) => unknown} initializer Firebase initialization function.
 * @returns {{
 *   ensureFirebaseApp: (allowEffects: AllowEffects, initFn?: (allowEffects: AllowEffects) => unknown) => void,
 *   resetFirebaseInitializationState: () => void,
 * }} Firebase initialization helpers.
 */
export function createFirebaseAppManager(initializer) {
  // Stryker disable next-line all -- initialization state shape is a fixed
  // internal manager contract.
  const state = { firebaseInitialized: false };

  /**
   * Initialize the Firebase app once, tolerating duplicate-app errors.
   * @param {AllowEffects} allowEffects Permission for Firebase initialization.
   * @param {((allowEffects: AllowEffects) => unknown) | undefined} [initFn] Initialization function invoked if the app is not yet ready.
   * @returns {void}
   */
  function ensureFirebaseApp(allowEffects, initFn) {
    ensureFirebaseAppState(state, allowEffects, initFn ?? initializer);
  }

  /**
   * Reset the Firebase initialization flag.
   * @returns {void}
   */
  function resetFirebaseInitializationState() {
    state.firebaseInitialized = false;
  }

  return { ensureFirebaseApp, resetFirebaseInitializationState };
}

/**
 * Initialize the Firebase Admin app through an injected manager.
 * @template {(allowEffects: AllowEffects) => unknown} TInitializer
 * @param {AllowEffects} allowEffects Permission for Firebase initialization.
 * @param {(initializer: TInitializer) => { ensureFirebaseApp: (allowEffects: AllowEffects) => void }} createManager Manager factory.
 * @param {TInitializer} initializer Firebase Admin initializer.
 * @returns {void}
 */
export function ensureFirebaseAppInitialized(
  allowEffects,
  createManager,
  initializer
) {
  createManager(initializer).ensureFirebaseApp(allowEffects);
}

/**
 * Create initialized Firebase-backed cloud app dependencies.
 * @param {AllowEffects} allowEffects Permission for startup initialization.
 * @param {{initializeApp: (allowEffects: AllowEffects) => unknown, createFirebaseAppManager: (initializer: (allowEffects: AllowEffects) => unknown) => { ensureFirebaseApp: (allowEffects: AllowEffects) => void }, getEnvironmentVariables: () => Record<string, string | undefined>, getFirestoreInstance: (allowEffects: AllowEffects, options: { environment: Record<string, string | undefined> }) => unknown, getAuth: () => unknown, express: () => unknown}} deps Cloud wiring dependencies.
 * @param {{ includeApp?: boolean }} [options] Whether to construct an Express app.
 * @returns {{ db: unknown, auth: unknown, app?: unknown }} Initialized cloud app parts.
 */
export function createFirebaseAppContext(allowEffects, deps, options = {}) {
  const initializeApp = deps.initializeApp;
  const createFirebaseAppManager = deps.createFirebaseAppManager;
  const getEnvironmentVariables = deps.getEnvironmentVariables;
  const getFirestoreInstance = deps.getFirestoreInstance;
  const getAuth = deps.getAuth;
  const express = deps.express;
  const includeApp = options.includeApp ?? true;

  ensureFirebaseAppInitialized(
    allowEffects,
    createFirebaseAppManager,
    initializeApp
  );
  const environmentVariables = getEnvironmentVariables();

  /** @type {{ db: unknown, auth: unknown, app?: unknown }} */
  const context = {
    db: getFirestoreInstance(allowEffects, {
      environment: environmentVariables,
    }),
    auth: getAuth(),
  };

  if (includeApp) {
    context.app = express();
  }

  return context;
}

/**
 * Determine whether Firebase has already been initialized.
 * @param {{ firebaseInitialized: boolean }} state Initialization state.
 * @returns {boolean} True when initialization should be skipped.
 */
function firebaseAlreadyInitialized(state) {
  return state.firebaseInitialized;
}

/**
 * Ensure the Firebase app is initialized for the current state.
 * @param {{ firebaseInitialized: boolean }} state Initialization state.
 * @param {AllowEffects} allowEffects Permission for Firebase initialization.
 * @param {(allowEffects: AllowEffects) => unknown} initFn Initialization function.
 * @returns {void} Nothing.
 */
function ensureFirebaseAppState(state, allowEffects, initFn) {
  if (firebaseAlreadyInitialized(state)) {
    return;
  }

  ensureFirebaseAppOnce(allowEffects, initFn);
  markFirebaseInitialized(state);
}

/**
 * Mark the Firebase initialization as complete.
 * @param {{ firebaseInitialized: boolean }} state Initialization state.
 * @returns {void} Nothing.
 */
function markFirebaseInitialized(state) {
  state.firebaseInitialized = true;
}
