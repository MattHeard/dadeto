import { describe, expect, jest, test } from '@jest/globals';
import {
  createFirebaseAppContext,
  createFirebaseAppManager,
} from '../../../src/core/cloud/firebase-app-manager.js';

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

describe('createFirebaseAppContext', () => {
  test('passes the runtime environment into Firestore resolution', () => {
    const initializeApp = jest.fn();
    const createFirebaseAppManager = jest.fn(() => ({
      ensureFirebaseApp: jest.fn(),
    }));
    const getEnvironmentVariables = jest.fn(() => ({
      DENDRITE_ENVIRONMENT: 't-123',
      DATABASE_ID: 't-123',
    }));
    const db = {};
    const getFirestoreInstance = jest.fn(() => db);
    const getAuth = jest.fn(() => ({}));
    const express = jest.fn(() => ({}));

    const result = createFirebaseAppContext({
      initializeApp,
      createFirebaseAppManager,
      getFirestoreInstance,
      getAuth,
      express,
      getEnvironmentVariables,
    });

    expect(getEnvironmentVariables).toHaveBeenCalled();
    expect(getFirestoreInstance).toHaveBeenCalledWith({
      environment: {
        DENDRITE_ENVIRONMENT: 't-123',
        DATABASE_ID: 't-123',
      },
    });
    expect(result).toEqual({
      db,
      auth: {},
      app: {},
    });
  });
});
