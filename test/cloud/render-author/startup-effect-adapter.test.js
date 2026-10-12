import { jest } from '@jest/globals';
import { initializeFirebaseApp } from '../../../src/cloud/render-author/startup-effect-adapter.js';

test('initializes Firebase through a permission-first startup adapter', () => {
  const ensureFirebaseApp = jest.fn();
  const allowEffects = Object.freeze({ startup: true });

  initializeFirebaseApp(allowEffects, ensureFirebaseApp);

  expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);
});
