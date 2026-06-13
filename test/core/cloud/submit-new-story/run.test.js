import { jest } from '@jest/globals';
import { runSubmitNewStory } from '../../../../src/core/cloud/submit-new-story/run.js';

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
const randomUUID = jest.fn(() => 'story-1');
const crypto = { randomUUID };
const serverTimestamp = jest.fn(() => 'now');
const FieldValue = { serverTimestamp };
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

const debugEnvironmentVariables = {
  SITE_URL: 'https://example.com',
  DENDRITE_ENVIRONMENT: 't-123',
  PLAYWRIGHT_ORIGIN: 'https://playwright.example',
  DENDRITE_DEBUG_SUBMIT_NEW_STORY: '1',
};

const debugAllowedOrigins = ['https://playwright.example'];

describe('runSubmitNewStory', () => {
  let consoleInfoSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

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
    expect(getFirestoreInstance).toHaveBeenCalledWith({
      environment: {
        SITE_URL: 'https://example.com',
      },
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

  it('wires the responder path for POST submissions', async () => {
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

    const response = {
      status: jest.fn(() => ({
        json: jest.fn(),
        send: jest.fn(),
        sendStatus: jest.fn(),
      })),
    };

    await result.handleSubmitNewStory(
      {
        method: 'POST',
        body: {
          title: '  My Story  ',
          content: 'Hello\nWorld',
          author: '  Author  ',
        },
        headers: { Authorization: 'Bearer token' },
      },
      response
    );

    expect(randomUUID).toHaveBeenCalled();
    expect(serverTimestamp).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'My Story',
      })
    );
  });

  it('treats empty header values as missing', async () => {
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

    const response = {
      status: jest.fn(() => ({
        json: jest.fn(),
        send: jest.fn(),
        sendStatus: jest.fn(),
      })),
    };

    await result.handleSubmitNewStory(
      {
        method: 'POST',
        body: {
          title: '  Another Story  ',
          content: 'Hello',
          author: 'Author',
        },
        headers: { Authorization: '' },
      },
      response
    );

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Another Story',
      })
    );
  });

  it('emits debug logs for successful POST submissions when enabled', async () => {
    const debugSet = jest.fn().mockResolvedValue();
    const debugDoc = jest.fn(() => ({ set: debugSet }));
    const debugCollection = jest.fn(() => ({ doc: debugDoc }));
    const debugGetFirestoreInstance = jest.fn(() => ({
      collection: debugCollection,
    }));
    const result = runSubmitNewStory({
      initializeApp: jest.fn(),
      createFirebaseAppManager,
      getFirestoreInstance: debugGetFirestoreInstance,
      getAuth,
      express,
      cors,
      crypto,
      FieldValue,
      functions,
      getEnvironmentVariables: jest.fn(() => debugEnvironmentVariables),
      getAllowedOrigins: jest.fn(() => debugAllowedOrigins),
    });

    const response = {
      status: jest.fn(() => ({
        json: jest.fn(),
        send: jest.fn(),
        sendStatus: jest.fn(),
      })),
    };

    await result.handleSubmitNewStory(
      {
        method: 'POST',
        body: {
          title: '  Debug Story  ',
          content: 'Debug body',
          author: '  Debug Author  ',
          option0: ' One ',
        },
        get: header => {
          if (header === 'origin') {
            return 'https://playwright.example';
          }
          if (header === 'referer') {
            return 'https://playwright.example/new-story.html';
          }
          if (header === 'content-type') {
            return 'application/x-www-form-urlencoded';
          }
          if (header === 'Authorization') {
            return 'Bearer debug-token';
          }
          return null;
        },
      },
      response
    );

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('submit-new-story.debug.config')
    );
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('submit-new-story.debug.request')
    );
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('submit-new-story.debug.response')
    );
    expect(debugGetFirestoreInstance).toHaveBeenCalled();
    expect(debugDoc).toHaveBeenCalledWith('story-1');
    expect(debugSet).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Debug Story',
        content: 'Debug body',
        author: 'Debug Author',
        options: ['One'],
      })
    );
  });

  it('logs debug request fallbacks when the request is missing', async () => {
    const fallbackGetFirestoreInstance = jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          set: jest.fn().mockResolvedValue(),
        })),
      })),
    }));
    const result = runSubmitNewStory({
      initializeApp: jest.fn(),
      createFirebaseAppManager,
      getFirestoreInstance: fallbackGetFirestoreInstance,
      getAuth,
      express,
      cors,
      crypto,
      FieldValue,
      functions,
      getEnvironmentVariables: jest.fn(() => debugEnvironmentVariables),
      getAllowedOrigins: jest.fn(() => debugAllowedOrigins),
    });

    const response = {
      status: jest.fn(() => ({
        json: jest.fn(),
        send: jest.fn(),
        sendStatus: jest.fn(),
      })),
    };

    await result.handleSubmitNewStory(null, response);

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('submit-new-story.debug.request')
    );
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('"bodyKeys":[]')
    );
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('submit-new-story.debug.response')
    );
    expect(fallbackGetFirestoreInstance).toHaveBeenCalled();
  });

  it('logs getter and unmatched header fallbacks when debugging is enabled', async () => {
    const fallbackSet = jest.fn().mockResolvedValue();
    const fallbackDoc = jest.fn(() => ({ set: fallbackSet }));
    const fallbackCollection = jest.fn(() => ({ doc: fallbackDoc }));
    const fallbackGetFirestoreInstance = jest.fn(() => ({
      collection: fallbackCollection,
    }));
    const result = runSubmitNewStory({
      initializeApp: jest.fn(),
      createFirebaseAppManager,
      getFirestoreInstance: fallbackGetFirestoreInstance,
      getAuth,
      express,
      cors,
      crypto,
      FieldValue,
      functions,
      getEnvironmentVariables: jest.fn(() => debugEnvironmentVariables),
      getAllowedOrigins: jest.fn(() => debugAllowedOrigins),
    });

    const response = {
      status: jest.fn(() => ({
        json: jest.fn(),
        send: jest.fn(),
        sendStatus: jest.fn(),
      })),
    };

    await result.handleSubmitNewStory(
      {
        method: 'POST',
        body: {
          title: '  Getter Story  ',
          content: 'Getter body',
          author: '  Getter Author  ',
        },
        get: header => (header === 'x-unrelated-header' ? 'value' : ''),
        headers: {
          origin: 'https://headers.example',
          referer: [123],
          'content-type': 'application/x-www-form-urlencoded',
          Authorization: 'Bearer getter-token',
        },
      },
      response
    );

    await result.handleSubmitNewStory(
      {
        method: 'POST',
        body: {
          title: '  Missing Story  ',
          content: 'Missing body',
          author: '  Missing Author  ',
        },
        get: null,
        headers: {
          x_custom_header: 'ignored',
        },
      },
      response
    );

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://headers.example')
    );
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('"referer":null')
    );
    expect(fallbackGetFirestoreInstance).toHaveBeenCalled();
    expect(fallbackSet).toHaveBeenCalledTimes(2);
  });

  it('logs debug errors when the responder rejects with a non-Error value', async () => {
    const rejectingSet = jest
      .fn()
      .mockRejectedValueOnce('submit failed')
      .mockRejectedValueOnce(new Error('submit boom'));
    const rejectingDoc = jest.fn(() => ({ set: rejectingSet }));
    const rejectingCollection = jest.fn(() => ({ doc: rejectingDoc }));
    const rejectingGetFirestoreInstance = jest.fn(() => ({
      collection: rejectingCollection,
    }));
    const result = runSubmitNewStory({
      initializeApp: jest.fn(),
      createFirebaseAppManager,
      getFirestoreInstance: rejectingGetFirestoreInstance,
      getAuth,
      express,
      cors,
      crypto,
      FieldValue,
      functions,
      getEnvironmentVariables: jest.fn(() => debugEnvironmentVariables),
      getAllowedOrigins: jest.fn(() => debugAllowedOrigins),
    });

    const request = {
      method: 'POST',
      body: {
        title: '  Broken Story  ',
        content: 'Debug body',
        author: '  Debug Author  ',
      },
      headers: {
        Authorization: ['Bearer debug-token'],
        origin: ['https://playwright.example'],
        referer: ['https://playwright.example/new-story.html'],
        'content-type': ['application/x-www-form-urlencoded'],
      },
    };
    const response = {
      status: jest.fn(() => ({
        json: jest.fn(),
        send: jest.fn(),
        sendStatus: jest.fn(),
      })),
    };

    await expect(result.handleSubmitNewStory(request, response)).rejects.toBe(
      'submit failed'
    );
    await expect(
      result.handleSubmitNewStory(request, response)
    ).rejects.toThrow('submit boom');

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('submit-new-story.debug.request')
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('submit-new-story.debug.error')
    );
    expect(consoleErrorSpy.mock.calls[0][0]).toContain('submit failed');
    expect(consoleErrorSpy.mock.calls[1][0]).toContain('submit boom');
  });
});
