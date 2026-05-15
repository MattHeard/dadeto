import { jest } from '@jest/globals';

const ensureFirebaseApp = jest.fn();
const createFirebaseAppManager = jest.fn(() => ({
  ensureFirebaseApp,
}));
const set = jest.fn().mockResolvedValue();
const doc = jest.fn(() => ({ set }));
const collection = jest.fn(() => ({ doc }));
const getFirestoreInstance = jest.fn(() => ({ collection }));
const verifyIdToken = jest.fn().mockResolvedValue({ uid: 'user-1' });
const getAuth = jest.fn(() => ({
  verifyIdToken,
}));
const expressUse = jest.fn();
const expressPost = jest.fn();
const expressApp = {
  use: expressUse,
  post: expressPost,
};
const express = Object.assign(
  jest.fn(() => expressApp),
  {
    json: jest.fn(() => 'json-middleware'),
    urlencoded: jest.fn(() => 'urlencoded-middleware'),
  }
);
const cors = jest.fn(() => 'cors-middleware');
const crypto = { randomUUID: jest.fn(() => 'story-1') };
const FieldValue = { serverTimestamp: jest.fn(() => 'now') };
const onRequest = jest.fn(app => ({ app }));
const functions = {
  region: jest.fn(() => ({
    https: {
      onRequest,
    },
  })),
};
const getEnvironmentVariables = jest.fn(() => ({
  SITE_URL: 'https://example.com',
}));
const getAllowedOrigins = jest.fn(() => ['https://example.com']);

const { runSubmitNewStory } = await import(
  '../../../../src/core/cloud/submit-new-story/run.js'
);

describe('runSubmitNewStory', () => {
  it('wires the endpoint and returns exports', () => {
    const result = runSubmitNewStory({
      initializeApp: jest.fn(),
      createFirebaseAppManager,
      getFirestoreInstance,
      getAuth,
      express,
      cors,
      crypto,
      FieldValue,
      functions,
      getEnvironmentVariables,
      getAllowedOrigins,
    });

    expect(ensureFirebaseApp).toHaveBeenCalled();
    expect(getEnvironmentVariables).toHaveBeenCalled();
    expect(getAllowedOrigins).toHaveBeenCalledWith({
      SITE_URL: 'https://example.com',
    });
    expect(expressUse).toHaveBeenCalledWith('cors-middleware');
    expect(expressUse).toHaveBeenCalledWith(expect.any(Function));
    expect(expressUse).toHaveBeenCalledWith('json-middleware');
    expect(expressUse).toHaveBeenCalledWith('urlencoded-middleware');
    expect(expressPost).toHaveBeenCalledWith('/', expect.any(Function));
    expect(functions.region).toHaveBeenCalledWith('europe-west1');
    expect(onRequest).toHaveBeenCalledWith(expressApp);
    expect(result).toEqual({
      submitNewStory: { app: expressApp },
      handleSubmitNewStory: expect.any(Function),
      app: expressApp,
    });
  });
});
