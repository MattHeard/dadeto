import { jest } from '@jest/globals';
import { createErrorBeaconRun } from '../../../../src/core/cloud/errors/run.js';

const accessTokenKey = 'access_token';

describe('createErrorBeaconRun', () => {
  it('wires the express app and POST handler', async () => {
    const post = jest.fn();
    const use = jest.fn();
    const express = Object.assign(
      jest.fn(() => ({ use, post })),
      {
        json: jest.fn(() => 'json-middleware'),
        text: jest.fn(() => 'text-middleware'),
        text: jest.fn(() => 'text-middleware'),
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [accessTokenKey]: 'token' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

    const { handle } = createErrorBeaconRun({
      express,
      cors,
      getEnvironmentVariables: () => ({
        GCLOUD_PROJECT: 'proj',
        DENDRITE_ENVIRONMENT: 't-123',
        PLAYWRIGHT_ORIGIN: 'https://playwright.example',
        BUILD_VERSION: 'build-123',
      }),
      fetchFn,
    });

    expect(express).toHaveBeenCalledTimes(1);
    expect(express.json).toHaveBeenCalledWith({
      type: ['application/json', 'application/*+json'],
    });
    expect(cors).toHaveBeenCalledWith({
      methods: ['POST'],
      origin: expect.any(Function),
    });
    expect(use).toHaveBeenCalledTimes(3);
    expect(post).toHaveBeenCalledTimes(2);
    expect(handle).toEqual({ use, post });
  });

  it('responds 204 after a successful error report', async () => {
    const post = jest.fn();
    const use = jest.fn();
    const express = Object.assign(
      jest.fn(() => ({ use, post })),
      {
        json: jest.fn(() => 'json-middleware'),
        text: jest.fn(() => 'text-middleware'),
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [accessTokenKey]: 'token' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    createErrorBeaconRun({
      express,
      cors,
      getEnvironmentVariables: () => ({
        GCLOUD_PROJECT: 'proj',
        DENDRITE_ENVIRONMENT: 't-123',
        PLAYWRIGHT_ORIGIN: 'https://playwright.example',
        BUILD_VERSION: 'build-123',
      }),
      fetchFn,
    });

    const handler = post.mock.calls[0][1];
    const response = createResponse();

    await handler({ method: 'POST', body: { message: 'boom' } }, response.api);

    expect(JSON.parse(fetchFn.mock.calls[1][1].body)).toEqual({
      serviceContext: { service: 't-123-client-js', version: 'build-123' },
      message: 'boom',
      context: expect.any(Object),
      eventTime: expect.any(String),
    });
    expect(response.statusCode).toBe(204);
  });

  it('returns 500 when Error Reporting rejects the payload', async () => {
    const post = jest.fn();
    const use = jest.fn();
    const express = Object.assign(
      jest.fn(() => ({ use, post })),
      {
        json: jest.fn(() => 'json-middleware'),
        text: jest.fn(() => 'text-middleware'),
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [accessTokenKey]: 'token' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      });

    createErrorBeaconRun({
      express,
      cors,
      getEnvironmentVariables: () => ({
        GCLOUD_PROJECT: 'proj',
        DENDRITE_ENVIRONMENT: 't-123',
        PLAYWRIGHT_ORIGIN: 'https://playwright.example',
      }),
      fetchFn,
    });

    const handler = post.mock.calls[0][1];
    const response = createResponse();

    await handler({ method: 'POST', body: { message: 'boom' } }, response.api);

    expect(response.statusCode).toBe(500);
  });

  it('logs caught error stacks before returning 500', async () => {
    const post = jest.fn();
    const use = jest.fn();
    const console = { error: jest.fn() };
    const express = Object.assign(
      jest.fn(() => ({ use, post })),
      {
        json: jest.fn(() => 'json-middleware'),
        text: jest.fn(() => 'text-middleware'),
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [accessTokenKey]: 'token' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
      });

    createErrorBeaconRun({
      express,
      cors,
      console,
      getEnvironmentVariables: () => ({
        GCLOUD_PROJECT: 'proj',
        DENDRITE_ENVIRONMENT: 't-123',
        PLAYWRIGHT_ORIGIN: 'https://playwright.example',
      }),
      fetchFn,
    });

    const handler = post.mock.calls[0][1];
    const response = createResponse();

    await handler({ method: 'POST', body: { message: 'boom' } }, response.api);

    expect(console.error).toHaveBeenCalledWith(
      'Error Reporting API forwarding failed',
      expect.any(Error)
    );
    expect(response.statusCode).toBe(500);
  });

  it('returns 500 when metadata token lookup fails', async () => {
    const post = jest.fn();
    const use = jest.fn();
    const express = Object.assign(
      jest.fn(() => ({ use, post })),
      {
        json: jest.fn(() => 'json-middleware'),
        text: jest.fn(() => 'text-middleware'),
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    createErrorBeaconRun({
      express,
      cors,
      getEnvironmentVariables: () => ({
        GCLOUD_PROJECT: 'proj',
        DENDRITE_ENVIRONMENT: 't-123',
        PLAYWRIGHT_ORIGIN: 'https://playwright.example',
      }),
      fetchFn,
    });

    const handler = post.mock.calls[0][1];
    const response = createResponse();

    await handler({ method: 'POST', body: { message: 'boom' } }, response.api);

    expect(response.statusCode).toBe(500);
  });
});

describe('createErrorBeaconRun environment fallbacks', () => {
  it('uses fallback project environment variables and an empty access token', async () => {
    const post = jest.fn();
    const use = jest.fn();
    const express = Object.assign(
      jest.fn(() => ({ use, post })),
      {
        json: jest.fn(() => 'json-middleware'),
        text: jest.fn(() => 'text-middleware'),
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [accessTokenKey]: '' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

    createErrorBeaconRun({
      express,
      cors,
      getEnvironmentVariables: () => ({
        GOOGLE_CLOUD_PROJECT: 'proj',
        DENDRITE_ENVIRONMENT: 't-123',
        PLAYWRIGHT_ORIGIN: 'https://playwright.example',
      }),
      fetchFn,
    });

    const handler = post.mock.calls[0][1];
    const response = createResponse();

    await handler({ method: 'POST', body: { message: 'boom' } }, response.api);

    expect(fetchFn.mock.calls[1][0]).toContain('/projects/proj/events:report');
    expect(fetchFn.mock.calls[1][1].headers.Authorization).toBe('Bearer ');
    expect(response.statusCode).toBe(204);
  });

  it('uses the Google Cloud project fallback variable when earlier names are absent', async () => {
    const post = jest.fn();
    const use = jest.fn();
    const express = Object.assign(
      jest.fn(() => ({ use, post })),
      {
        json: jest.fn(() => 'json-middleware'),
        text: jest.fn(() => 'text-middleware'),
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [accessTokenKey]: 'token' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

    createErrorBeaconRun({
      express,
      cors,
      getEnvironmentVariables: () => ({
        GOOGLE_CLOUD_PROJECT: 'proj',
        DENDRITE_ENVIRONMENT: 't-123',
        PLAYWRIGHT_ORIGIN: 'https://playwright.example',
      }),
      fetchFn,
    });

    const handler = post.mock.calls[0][1];
    const response = createResponse();

    await handler({ method: 'POST', body: { message: 'boom' } }, response.api);

    expect(fetchFn.mock.calls[1][0]).toContain('/projects/proj/events:report');
    expect(response.statusCode).toBe(204);
  });

  it('falls back to an empty project id when no environment variables are present', async () => {
    const post = jest.fn();
    const use = jest.fn();
    const express = Object.assign(
      jest.fn(() => ({ use, post })),
      {
        json: jest.fn(() => 'json-middleware'),
        text: jest.fn(() => 'text-middleware'),
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [accessTokenKey]: 'token' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

    createErrorBeaconRun({
      express,
      cors,
      getEnvironmentVariables: () => ({
        DENDRITE_ENVIRONMENT: 't-123',
        PLAYWRIGHT_ORIGIN: 'https://playwright.example',
      }),
      fetchFn,
    });

    const handler = post.mock.calls[0][1];
    const response = createResponse();

    await handler({ method: 'POST', body: { message: 'boom' } }, response.api);

    expect(fetchFn.mock.calls[1][0]).toContain('/projects//events:report');
    expect(response.statusCode).toBe(204);
  });

  it('throws when the error beacon environment label is missing', () => {
    const post = jest.fn();
    const use = jest.fn();
    const express = Object.assign(
      jest.fn(() => ({ use, post })),
      {
        json: jest.fn(() => 'json-middleware'),
        text: jest.fn(() => 'text-middleware'),
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest.fn();

    expect(() =>
      createErrorBeaconRun({
        express,
        cors,
        getEnvironmentVariables: () => ({
          GCLOUD_PROJECT: 'proj',
        }),
        fetchFn,
      })
    ).toThrow(/DENDRITE_ENVIRONMENT is required for the errors function/);
  });

  it('throws when the error beacon environment label is not prod or t-*', () => {
    const post = jest.fn();
    const use = jest.fn();
    const express = Object.assign(
      jest.fn(() => ({ use, post })),
      {
        json: jest.fn(() => 'json-middleware'),
        text: jest.fn(() => 'text-middleware'),
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest.fn();

    expect(() =>
      createErrorBeaconRun({
        express,
        cors,
        getEnvironmentVariables: () => ({
          GCLOUD_PROJECT: 'proj',
          DENDRITE_ENVIRONMENT: 'dev',
          PLAYWRIGHT_ORIGIN: 'https://playwright.example',
        }),
        fetchFn,
      })
    ).toThrow(/DENDRITE_ENVIRONMENT must be prod or t-\*\. Received dev\./);
  });

  it('parses valid string bodies and discards malformed string bodies', async () => {
    const post = jest.fn();
    const use = jest.fn();
    const express = Object.assign(
      jest.fn(() => ({ use, post })),
      {
        json: jest.fn(() => 'json-middleware'),
        text: jest.fn(() => 'text-middleware'),
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ [accessTokenKey]: 'token' }),
      })
      .mockResolvedValueOnce({ ok: true, status: 204, json: async () => ({}) });

    createErrorBeaconRun({
      express,
      cors,
      getEnvironmentVariables: () => ({
        DENDRITE_ENVIRONMENT: 't-123',
        PLAYWRIGHT_ORIGIN: 'https://playwright.example',
      }),
      fetchFn,
    });

    const handler = post.mock.calls[0][1];
    const validResponse = createResponse();
    const validRequest = { method: 'POST', body: '{"message":"boom"}' };
    await handler(validRequest, validResponse.api);

    expect(validRequest.body).toEqual({ message: 'boom' });
    expect(validResponse.statusCode).toBe(204);

    const invalidResponse = createResponse();
    const invalidRequest = { method: 'POST', body: '{invalid' };
    await handler(invalidRequest, invalidResponse.api);

    expect(invalidRequest.body).toBeUndefined();
    expect(invalidResponse.statusCode).toBe(400);
  });

  it('uses an empty resolved environment when the validated value disappears', () => {
    const post = jest.fn();
    const use = jest.fn();
    const express = Object.assign(
      jest.fn(() => ({ use, post })),
      {
        json: jest.fn(() => 'json-middleware'),
        text: jest.fn(() => 'text-middleware'),
      }
    );
    let environmentReads = 0;
    const environmentVariables = {
      get DENDRITE_ENVIRONMENT() {
        environmentReads += 1;
        if (environmentReads <= 2) {
          return 't-123';
        }
        return undefined;
      },
      PLAYWRIGHT_ORIGIN: 'https://playwright.example',
    };

    expect(() =>
      createErrorBeaconRun({
        express,
        cors: jest.fn(() => 'cors-middleware'),
        getEnvironmentVariables: () => environmentVariables,
        fetchFn: jest.fn(),
      })
    ).not.toThrow();
  });
});

/**
 * Create a minimal response double for the handler tests.
 * @returns {{ statusCode: number, jsonBody: unknown, ended: boolean, body?: string, api: { status: (code: number) => { json: (body: Record<string, unknown>) => void, send: (body: string) => void, end: () => void } } }} Response double.
 */
function createResponse() {
  const response = {
    statusCode: 0,
    jsonBody: null,
    ended: false,
    api: null,
  };

  response.api = {
    status(code) {
      response.statusCode = code;
      return {
        json(body) {
          response.jsonBody = body;
        },
        send(body) {
          response.body = body;
        },
        end() {
          response.ended = true;
        },
      };
    },
  };

  return response;
}
