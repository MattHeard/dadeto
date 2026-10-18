import { describe, expect, it, jest } from '@jest/globals';
import {
  main,
  runGetAuthorUuidV2Smoke,
} from '../../scripts/smoke-get-author-uuid-v2.js';

const origin = 'https://mattheard.net';
const endpointUrl = 'https://get-author-uuid-v2-abc.europe-west1.run.app';
const token = 'sensitive-firebase-token';
const uuid = 'sensitive-author-uuid';

/**
 * @param {number} status Response status.
 * @param {unknown} body Optional JSON body.
 * @param {Record<string, string>} headers Response headers.
 * @returns {Response} Mock response.
 */
function response(status, body, headers = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers,
  });
}

/** @returns {jest.Mock} Sequential mock for the expected smoke request flow. */
function successfulFetch() {
  return jest
    .fn()
    .mockResolvedValueOnce(
      response(204, undefined, {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': 'Authorization',
      })
    )
    .mockResolvedValueOnce(
      response(200, { uuid }, { 'content-type': 'application/json' })
    )
    .mockResolvedValueOnce(
      response(200, { uuid }, { 'content-type': 'application/json' })
    )
    .mockResolvedValueOnce(response(401))
    .mockResolvedValueOnce(response(401));
}

describe('get-author-uuid-v2 production smoke runner', () => {
  it('sends no requests unless explicitly invoked with --execute', async () => {
    const fetchFn = jest.fn();
    const output = [];

    await expect(
      main({ argv: [], fetchFn, writeLine: line => output.push(line) })
    ).resolves.toBe(0);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(output.join('\n')).toContain('No requests sent');
  });

  it('checks CORS, stable authenticated UUID, and both unauthorized cases without printing secrets', async () => {
    const fetchFn = successfulFetch();
    const output = [];

    await expect(
      main({
        argv: ['--execute'],
        environment: {
          GET_AUTHOR_UUID_SMOKE_URL: endpointUrl,
          GET_AUTHOR_UUID_SMOKE_ORIGIN: origin,
          GET_AUTHOR_UUID_SMOKE_TOKEN: token,
        },
        fetchFn,
        writeLine: line => output.push(line),
      })
    ).resolves.toBe(0);

    expect(fetchFn).toHaveBeenCalledTimes(5);
    expect(fetchFn.mock.calls[0][1]).toMatchObject({
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization',
      },
    });
    expect(fetchFn.mock.calls[1][1].headers.Authorization).toBe(
      `Bearer ${token}`
    );
    expect(fetchFn.mock.calls[3][1].headers).not.toHaveProperty(
      'Authorization'
    );
    expect(fetchFn.mock.calls[4][1].headers.Authorization).toBe(
      'Bearer invalid-smoke-token'
    );
    expect(output.join('\n')).toContain('uuidStable');
    expect(output.join('\n')).not.toContain(token);
    expect(output.join('\n')).not.toContain(uuid);
  });

  it('rejects an invalid origin or endpoint before sending requests', async () => {
    const fetchFn = jest.fn();
    const baseOptions = { endpointUrl, origin, token, fetchFn };

    await expect(
      runGetAuthorUuidV2Smoke({ ...baseOptions, origin: 'https://example.com' })
    ).rejects.toThrow('must exactly match a configured production origin');
    await expect(
      runGetAuthorUuidV2Smoke({
        ...baseOptions,
        endpointUrl: 'http://localhost:8080',
      })
    ).rejects.toThrow('must be an HTTPS Cloud Functions or Cloud Run URL');
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('stops when the preflight response does not allow the configured origin', async () => {
    const fetchFn = jest.fn().mockResolvedValue(
      response(204, undefined, {
        'access-control-allow-origin': 'https://wrong.example',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': 'Authorization',
      })
    );

    await expect(
      runGetAuthorUuidV2Smoke({ endpointUrl, origin, token, fetchFn })
    ).rejects.toThrow('unexpected access-control-allow-origin');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
