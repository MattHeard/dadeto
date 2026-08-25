import { jest } from '@jest/globals';
import { runSubmitModerationRating } from '../../../../src/core/cloud/submit-moderation-rating/run.js';

describe('runSubmitModerationRating', () => {
  test('wires side effects and returns submitModerationRating export payload', () => {
    const ensureFirebaseApp = jest.fn();
    const createFirebaseAppManager = jest.fn(() => ({ ensureFirebaseApp }));
    const initializeApp = jest.fn();

    const get = jest.fn().mockResolvedValue({ exists: false });
    const moderatorDoc = { get };
    const db = {
      collection: jest.fn(name => {
        if (name === 'moderators') return { doc: jest.fn(() => moderatorDoc) };
        return { doc: jest.fn(() => ({ set: jest.fn() })) };
      }),
      doc: jest.fn(),
    };

    const expressApp = { use: jest.fn(), post: jest.fn() };
    const express = jest.fn(() => expressApp);
    express.json = jest.fn(() => 'json-mw');
    const cors = jest.fn(() => 'cors-mw');

    const getAuth = jest.fn(() => ({ verifyIdToken: jest.fn() }));
    const FieldValue = { serverTimestamp: jest.fn(), delete: jest.fn() };
    const crypto = { randomUUID: jest.fn(() => 'id') };
    const getEnvironmentVariables = jest.fn(() => ({
      DENDRITE_ENVIRONMENT: 'prod',
      CLOUD_RUNTIME_ENV: 'dev',
    }));

    const onRequest = jest.fn(app => ({ app }));
    const region = jest.fn(() => ({ https: { onRequest } }));
    const functions = { region };

    const result = runSubmitModerationRating({
      functions,
      express,
      cors,
      getAuth,
      FieldValue,
      createFirebaseAppManager,
      getFirestoreInstance: () => db,
      crypto,
      getEnvironmentVariables,
      initializeApp,
    });

    expect(createFirebaseAppManager).toHaveBeenCalledWith(initializeApp);
    expect(ensureFirebaseApp).toHaveBeenCalled();
    expect(region).toHaveBeenCalledWith('europe-west1');
    expect(onRequest).toHaveBeenCalledWith(expressApp);
    expect(expressApp.post).toHaveBeenCalledWith(
      '/',
      result.handleSubmitModerationRating
    );
    expect(getAuth).toHaveBeenCalled();
    expect(getEnvironmentVariables).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        submitModerationRating: { app: expressApp },
        handleSubmitModerationRating: expect.any(Function),
        app: expressApp,
      })
    );
  });
});
