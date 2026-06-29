import { jest } from '@jest/globals';
import { runReportForModeration } from '../../../../src/core/cloud/report-for-moderation/run.js';

describe('runReportForModeration', () => {
  test('wires the cloud function and returns the exported handlers', async () => {
    const ensureFirebaseApp = jest.fn();
    const createFirebaseAppManager = jest.fn(() => ({ ensureFirebaseApp }));
    const initializeApp = jest.fn();

    const moderationReportsCollection = {
      add: jest.fn(),
      where: jest.fn(() => moderationReportsCollection),
      limit: jest.fn(() => moderationReportsCollection),
      get: jest.fn().mockResolvedValue({ empty: false }),
    };
    const db = {
      collection: jest.fn(name => {
        if (name !== 'moderationReports') {
          throw new Error(`Unexpected collection: ${name}`);
        }

        return moderationReportsCollection;
      }),
    };

    const expressApp = {
      use: jest.fn(),
      all: jest.fn(),
    };
    const express = jest.fn(() => expressApp);
    express.json = jest.fn(() => 'json-middleware');
    const cors = jest.fn(() => 'cors-middleware');
    const getEnvironmentVariables = jest.fn(() => ({
      APP_ORIGIN: 'https://example.test',
      DENDRITE_ENVIRONMENT: 'prod',
    }));
    const getFirestoreInstance = jest.fn(() => db);
    const serverTimestamp = jest.fn(() => 'timestamp');

    const onRequest = jest.fn(app => ({ app }));
    const region = jest.fn(() => ({ https: { onRequest } }));
    const functions = { region };

    const result = runReportForModeration({
      functions,
      express,
      cors,
      FieldValue: { serverTimestamp },
      createFirebaseAppManager,
      getFirestoreInstance,
      getEnvironmentVariables,
      initializeApp,
    });

    expect(createFirebaseAppManager).toHaveBeenCalledWith(initializeApp);
    expect(ensureFirebaseApp).toHaveBeenCalled();
    expect(getFirestoreInstance).toHaveBeenCalled();
    expect(getEnvironmentVariables).toHaveBeenCalled();
    expect(cors).toHaveBeenCalledWith({
      origin: expect.any(Function),
      methods: ['POST'],
    });
    expect(expressApp.use).toHaveBeenCalledWith('cors-middleware');
    expect(expressApp.use).toHaveBeenCalledWith('json-middleware');
    expect(expressApp.all).toHaveBeenCalledWith('/', expect.any(Function));
    expect(region).toHaveBeenCalledWith('europe-west1');
    expect(onRequest).toHaveBeenCalledWith(expressApp);
    const respond = result.handleReportForModeration;
    const req = {
      method: 'POST',
      body: { variant: 'slug', reporterIdentity: 'anon-1' },
    };
    const res = {
      status: jest.fn(() => res),
      send: jest.fn(),
      json: jest.fn(),
      sendStatus: jest.fn(),
    };

    await respond(req, res);

    expect(moderationReportsCollection.where).toHaveBeenCalledWith(
      'reporterIdentity',
      '==',
      'anon-1'
    );
    expect(moderationReportsCollection.where).toHaveBeenCalledWith(
      'variant',
      '==',
      'slug'
    );
    expect(moderationReportsCollection.limit).toHaveBeenCalledWith(1);
    expect(moderationReportsCollection.get).toHaveBeenCalled();
    expect(result).toEqual({
      handle: { app: expressApp },
      handleReportForModeration: expect.any(Function),
    });
  });
});
