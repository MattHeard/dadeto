import { jest } from '@jest/globals';
import { runReportForModeration } from '../../../../src/core/cloud/report-for-moderation/run.js';
import { registerHttpEndpoint } from '../../../../src/cloud/http-endpoint-effect-adapter.js';

describe('runReportForModeration', () => {
  test('wires the cloud function and returns the exported handlers', async () => {
    const startupPermission = Object.freeze({ startup: true });
    const requestPermission = Object.freeze({ request: true });

    const moderationReportsCollection = {
      add: jest.fn().mockResolvedValue({}),
      where: jest.fn(() => moderationReportsCollection),
      limit: jest.fn(() => moderationReportsCollection),
      get: jest
        .fn()
        .mockResolvedValueOnce({ empty: false })
        .mockResolvedValueOnce({ empty: true }),
    };
    const db = {
      collection: jest.fn(name => {
        if (name !== 'moderationReports') {
          throw new Error(`Unexpected collection: ${name}`);
        }

        return moderationReportsCollection;
      }),
    };

    const expressApp = { use: jest.fn(), all: jest.fn() };
    const express = jest.fn(() => expressApp);
    express.json = jest.fn(() => 'json-middleware');
    const cors = jest.fn(() => 'cors-middleware');
    const getEnvironmentVariables = jest.fn(() => ({
      APP_ORIGIN: 'https://example.test',
      DENDRITE_ENVIRONMENT: 'prod',
    }));
    const serverTimestamp = jest.fn(() => 'timestamp');

    const onRequest = jest.fn(app => ({ app }));
    const region = jest.fn(() => ({ https: { onRequest } }));
    const functions = { region };

    const registerEndpoint = jest.fn((permission, options) =>
      registerHttpEndpoint(permission, options)
    );
    const responseAdapter = jest.fn((_permission, response, status, body) => {
      response.status(status);
      if (typeof body === 'string') response.send(body);
      else response.json(body);
    });
    const result = runReportForModeration(startupPermission, {
      functions,
      express,
      cors,
      FieldValue: { serverTimestamp },
      db,
      registerHttpEndpoint: registerEndpoint,
      addModerationReport: async (_permission, collection, report) => {
        await collection.add(report);
      },
      sendResponse: responseAdapter,
      createHttpBoundary: handler => (req, res) =>
        handler(requestPermission, req, res),
      getEnvironmentVariables,
    });

    expect(registerEndpoint).toHaveBeenCalledWith(
      startupPermission,
      expect.objectContaining({
        middleware: ['cors-middleware', 'json-middleware'],
        route: expect.objectContaining({ method: 'all', path: '/' }),
        functions,
      })
    );
    expect(expressApp.use).toHaveBeenNthCalledWith(1, 'cors-middleware');
    expect(expressApp.use).toHaveBeenNthCalledWith(2, 'json-middleware');
    expect(expressApp.all).toHaveBeenCalledWith('/', expect.any(Function));
    expect(getEnvironmentVariables).toHaveBeenCalled();
    expect(cors).toHaveBeenCalledWith({
      origin: expect.any(Function),
      methods: ['POST'],
    });
    const corsOrigin = cors.mock.calls[0][0].origin;
    const allowedOriginCallback = jest.fn();
    corsOrigin('https://mattheard.net', allowedOriginCallback);
    expect(allowedOriginCallback).toHaveBeenCalledWith(null, true);
    const deniedOriginCallback = jest.fn();
    corsOrigin('https://denied.test', deniedOriginCallback);
    expect(deniedOriginCallback).toHaveBeenCalledWith(expect.any(Error));
    expect(region).toHaveBeenCalledWith('europe-west1');
    expect(onRequest).toHaveBeenCalledWith(expressApp);
    const respond = result.handleReportForModeration;
    const req = {
        method: 'POST',
        body: { variant: 'slug', reporterIdentity: 'anon-1' },
      },
      res = {
        status: jest.fn(() => res),
        send: jest.fn(),
        json: jest.fn(),
        sendStatus: jest.fn(),
      };

    await (async () => {
      await respond(requestPermission, req, res);
      await respond(requestPermission, req, res);
    })();

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

    expect(moderationReportsCollection.add).toHaveBeenCalledWith({
      variant: 'slug',
      reporterIdentity: 'anon-1',
      createdAt: 'timestamp',
    });
    expect(responseAdapter).toHaveBeenCalledWith(
      requestPermission,
      res,
      201,
      {}
    );
    expect(result).toEqual({
      handle: { app: expressApp },
      handleReportForModeration: expect.any(Function),
    });
  });
});
