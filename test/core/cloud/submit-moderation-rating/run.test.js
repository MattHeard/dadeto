import { jest } from '@jest/globals';
import { runSubmitModerationRating } from '../../../../src/core/cloud/submit-moderation-rating/run.js';
import { registerHttpEndpoint } from '../../../../src/cloud/http-endpoint-effect-adapter.js';

describe('runSubmitModerationRating', () => {
  test('wires startup effects and keeps request effects behind an explicit boundary', () => {
    const permission = { startup: true };
    const use = jest.fn();
    const post = jest.fn();
    const expressApp = { use, post };
    const onRequest = jest.fn(() => 'https-function');
    const functions = { region: jest.fn(() => ({ https: { onRequest } })) };
    const registerEndpoint = jest.fn((permission, options) =>
      registerHttpEndpoint(permission, options)
    );
    const sendResponse = jest.fn();
    const updateModeratorAssignment = jest.fn();
    const recordRating = jest.fn();
    const bindHttpBoundary = jest.fn(handler => handler);
    const express = Object.assign(
      jest.fn(() => expressApp),
      {
        json: jest.fn(() => 'json-middleware'),
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const db = { collection: jest.fn(), doc: jest.fn() };
    const auth = { verifyIdToken: jest.fn() };

    const result = runSubmitModerationRating(permission, {
      functions,
      express,
      cors,
      getAuth: jest.fn(() => auth),
      FieldValue: { delete: jest.fn(), serverTimestamp: jest.fn() },
      db,
      crypto: { randomUUID: jest.fn() },
      getEnvironmentVariables: jest.fn(() => ({
        DENDRITE_ENVIRONMENT: 'prod',
        CLOUD_RUNTIME_ENV: 'dev',
      })),
      updateModeratorAssignment,
      recordRating,
      registerHttpEndpoint: registerEndpoint,
      sendResponse,
      bindHttpBoundary,
    });

    expect(express).toHaveBeenCalled();
    expect(registerEndpoint).toHaveBeenCalledWith(
      permission,
      expect.objectContaining({
        middleware: ['cors-middleware', 'json-middleware'],
        route: expect.objectContaining({ method: 'post', path: '/' }),
        functions,
      })
    );
    expect(use).toHaveBeenNthCalledWith(1, 'cors-middleware');
    expect(use).toHaveBeenNthCalledWith(2, 'json-middleware');
    expect(bindHttpBoundary).toHaveBeenCalledWith(expect.any(Function));
    expect(post).toHaveBeenCalledWith('/', expect.any(Function));
    expect(functions.region).toHaveBeenCalledWith('europe-west1');
    expect(onRequest).toHaveBeenCalledWith(expressApp);
    expect(result).toEqual({
      submitModerationRating: 'https-function',
      handleSubmitModerationRating: expect.any(Function),
      app: expressApp,
    });
  });
});
