import { describe, expect, jest, test } from '@jest/globals';
import {
  createFirebaseAppContext,
  createFirebaseAppManager,
} from '../../../src/core/cloud/firebase-app-manager.js';

describe('createFirebaseAppManager', () => {
  test('initializes once and tolerates duplicate app errors', () => {
    const allowEffects = Object.freeze({});
    const duplicate = new Error('already exists');
    const initializeApp = jest.fn(permission => {
      expect(permission).toBe(allowEffects);
      throw duplicate;
    });
    const { ensureFirebaseApp, resetFirebaseInitializationState } =
      createFirebaseAppManager(initializeApp);

    expect(() => ensureFirebaseApp(allowEffects)).not.toThrow();
    expect(() => ensureFirebaseApp(allowEffects)).not.toThrow();
    expect(initializeApp).toHaveBeenCalledTimes(1);

    resetFirebaseInitializationState();
    expect(() => ensureFirebaseApp(allowEffects)).not.toThrow();
    expect(initializeApp).toHaveBeenCalledTimes(2);
  });

  test('rethrows unexpected initialization errors', () => {
    const allowEffects = Object.freeze({});
    const initializeApp = jest.fn(() => {
      throw new Error('boom');
    });
    const { ensureFirebaseApp } = createFirebaseAppManager(initializeApp);

    expect(() => ensureFirebaseApp(allowEffects)).toThrow('boom');
    expect(initializeApp).toHaveBeenCalledTimes(1);
  });
});

describe('createFirebaseAppContext', () => {
  test('passes the runtime environment into Firestore resolution', () => {
    const allowEffects = Object.freeze({});
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

    const result = createFirebaseAppContext(allowEffects, {
      initializeApp,
      createFirebaseAppManager,
      getFirestoreInstance,
      getAuth,
      express,
      getEnvironmentVariables,
    });

    expect(getEnvironmentVariables).toHaveBeenCalled();
    expect(getFirestoreInstance).toHaveBeenCalledWith(allowEffects, {
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

  test('omits the Express app when includeApp is false', () => {
    const allowEffects = Object.freeze({});
    const express = jest.fn();
    const db = {};
    const result = createFirebaseAppContext(
      allowEffects,
      {
        initializeApp: jest.fn(),
        createFirebaseAppManager: jest.fn(() => ({
          ensureFirebaseApp: jest.fn(),
        })),
        getEnvironmentVariables: jest.fn(() => ({
          DENDRITE_ENVIRONMENT: 'prod',
        })),
        getFirestoreInstance: jest.fn(() => db),
        getAuth: jest.fn(() => ({ kind: 'auth' })),
        express,
      },
      { includeApp: false }
    );

    expect(result).toEqual({ db, auth: { kind: 'auth' } });
    expect(express).not.toHaveBeenCalled();
  });
});
