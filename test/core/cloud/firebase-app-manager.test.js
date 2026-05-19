import { describe, expect, jest, test } from '@jest/globals';
import { createFirebaseAppManager } from '../../../src/core/cloud/firebase-app-manager.js';

describe('createFirebaseAppManager', () => {
  test('initializes once and tolerates duplicate app errors', () => {
    const duplicate = new Error('already exists');
    const initializeApp = jest.fn(() => {
      throw duplicate;
    });
    const { ensureFirebaseApp, resetFirebaseInitializationState } =
      createFirebaseAppManager(initializeApp);

    expect(() => ensureFirebaseApp()).not.toThrow();
    expect(() => ensureFirebaseApp()).not.toThrow();
    expect(initializeApp).toHaveBeenCalledTimes(1);

    resetFirebaseInitializationState();
    expect(() => ensureFirebaseApp()).not.toThrow();
    expect(initializeApp).toHaveBeenCalledTimes(2);
  });

  test('rethrows unexpected initialization errors', () => {
    const initializeApp = jest.fn(() => {
      throw new Error('boom');
    });
    const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);

    expect(() => ensureFirebaseApp()).toThrow('boom');
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });
});
