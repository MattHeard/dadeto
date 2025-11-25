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
