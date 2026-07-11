import { jest } from '@jest/globals';
import { createErrorBeaconRun } from '../../../../src/core/cloud/errors/run.js';

describe('createErrorBeaconRun', () => {
  it('wires the express app and POST handler', async () => {
    const post = jest.fn();
    const use = jest.fn();
    const express = Object.assign(
      jest.fn(() => ({ use, post })),
      {
        json: jest.fn(() => 'json-middleware'),
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
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
      type: ['application/json', 'application/*+json', 'text/plain'],
    });
    expect(cors).toHaveBeenCalledWith({
      methods: ['POST'],
      origin: expect.any(Function),
    });
    expect(use).toHaveBeenCalledTimes(2);
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
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
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
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
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
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
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

  it('uses fallback project environment variables and an empty access token', async () => {
    const post = jest.fn();
    const use = jest.fn();
    const express = Object.assign(
      jest.fn(() => ({ use, post })),
      {
        json: jest.fn(() => 'json-middleware'),
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: '' }),
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
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
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
      }
    );
    const cors = jest.fn(() => 'cors-middleware');
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
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
