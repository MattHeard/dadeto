import { ensureFirebaseAppOnce } from './cloud-core.js';

/**
 * Create helpers that manage Firebase Admin app initialization state.
 * @param {() => void} initializer Firebase initialization function.
 * @returns {{
 *   ensureFirebaseApp: (initFn?: () => void) => void,
 *   resetFirebaseInitializationState: () => void,
 * }} Firebase initialization helpers.
 */
export function createFirebaseAppManager(initializer) {
  // Stryker disable next-line all -- initialization state shape is a fixed
  // internal manager contract.
  const state = { firebaseInitialized: false };

  /**
   * Initialize the Firebase app once, tolerating duplicate-app errors.
   * @param {(() => void) | undefined} [initFn] Initialization function invoked if the app is not yet ready.
   * @returns {void}
   */
  function ensureFirebaseApp(initFn) {
    ensureFirebaseAppState(state, initFn ?? initializer);
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
 * @template {() => unknown} TInitializer
 * @param {(initializer: TInitializer) => { ensureFirebaseApp: () => void }} createManager Manager factory.
 * @param {TInitializer} initializer Firebase Admin initializer.
 * @returns {void}
 */
export function ensureFirebaseAppInitialized(createManager, initializer) {
  createManager(initializer).ensureFirebaseApp();
}

/**
 * Create initialized Firebase-backed cloud app dependencies.
 * @param {{initializeApp: () => void, createFirebaseAppManager: (initializer: () => void) => { ensureFirebaseApp: (initFn?: () => void) => void }, getEnvironmentVariables: () => Record<string, string | undefined>, getFirestoreInstance: (options: { environment: Record<string, string | undefined> }) => unknown, getAuth: () => unknown, express: () => unknown}} deps Cloud wiring dependencies.
 * @param {{ includeApp?: boolean }} [options] Whether to construct an Express app.
 * @returns {{ db: unknown, auth: unknown, app?: unknown }} Initialized cloud app parts.
 */
export function createFirebaseAppContext(deps, options = {}) {
  const initializeApp = deps.initializeApp;
  const createFirebaseAppManager = deps.createFirebaseAppManager;
  const getEnvironmentVariables = deps.getEnvironmentVariables;
  const getFirestoreInstance = deps.getFirestoreInstance;
  const getAuth = deps.getAuth;
  const express = deps.express;
  const includeApp = options.includeApp ?? true;

  ensureFirebaseAppInitialized(createFirebaseAppManager, initializeApp);
  const environmentVariables = getEnvironmentVariables();

  /** @type {{ db: unknown, auth: unknown, app?: unknown }} */
  const context = {
    db: getFirestoreInstance({ environment: environmentVariables }),
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
 * @param {() => void} initFn Initialization function.
 * @returns {void} Nothing.
 */
function ensureFirebaseAppState(state, initFn) {
  if (firebaseAlreadyInitialized(state)) {
    return;
  }

  ensureFirebaseAppOnce(initFn);
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
