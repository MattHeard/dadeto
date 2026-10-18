import { describe, expect, it, jest } from '@jest/globals';
import {
  main,
  runFunctionEndpointRegistrySmoke,
} from '../../scripts/smoke-function-endpoint-registry.js';

const registryUrl =
  'https://storage.googleapis.com/dadeto-function-endpoints/function-endpoints.json';
const rentalUrl = 'https://rental-search-abc.run.app';
const authorUrl = 'https://get-author-uuid-abc.run.app';

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

/**
 * @returns {{ schemaVersion: number, environment: string, functions: Record<string, string> }} Valid fixture manifest.
 */
function validManifest() {
  return {
    schemaVersion: 1,
    environment: 'prod',
    functions: {
      objectMinuteRentalSearch: rentalUrl,
      getAuthorUuidV2: authorUrl,
    },
  };
}

/**
 * @param {unknown} body Registry response body.
 * @returns {Response} Successful mock response.
 */
function successfulResponse(body = validManifest()) {
  return response(200, body, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, no-store',
  });
}

describe('function endpoint registry smoke runner', () => {
  it('sends no requests unless explicitly invoked with --execute', async () => {
    const fetchFn = jest.fn();
    const output = [];

    await expect(
      main({ argv: [], fetchFn, writeLine: line => output.push(line) })
    ).resolves.toBe(0);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(output.join('\n')).toContain('No requests sent');
  });

  it('validates a public manifest and prints only status, keys, and hosts', async () => {
    const fetchFn = jest.fn().mockResolvedValue(successfulResponse());
    const output = [];

    await expect(
      main({
        argv: ['--execute'],
        environment: { FUNCTION_ENDPOINT_REGISTRY_URL: registryUrl },
        fetchFn,
        writeLine: line => output.push(line),
      })
    ).resolves.toBe(0);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      registryUrl,
      expect.objectContaining({
        method: 'GET',
        redirect: 'error',
        headers: { Accept: 'application/json' },
      })
    );
    const result = JSON.parse(output[0].replace(/^.*?: /, ''));
    expect(result).toMatchObject({
      registryHost: 'storage.googleapis.com',
      status: 200,
      schemaVersion: 1,
      environment: 'prod',
      functionKeys: ['getAuthorUuidV2', 'objectMinuteRentalSearch'],
      functionHosts: {
        getAuthorUuidV2: 'get-author-uuid-abc.run.app',
        objectMinuteRentalSearch: 'rental-search-abc.run.app',
      },
      cacheControl: 'public, no-store',
    });
    expect(output.join('\n')).not.toContain(rentalUrl);
    expect(output.join('\n')).not.toContain(authorUrl);
  });

  it.each([
    ['invalid URL', 'not a URL'],
    ['non-GCS host', 'https://example.com/bucket/function-endpoints.json'],
    [
      'HTTP URL',
      'http://storage.googleapis.com/bucket/function-endpoints.json',
    ],
    ['wrong object path', 'https://storage.googleapis.com/bucket/other.json'],
    [
      'URL query',
      'https://storage.googleapis.com/bucket/function-endpoints.json?token=secret',
    ],
  ])('rejects %s before sending a request', async (_name, invalidUrl) => {
    const fetchFn = jest.fn();

    await expect(
      runFunctionEndpointRegistrySmoke({ registryUrl: invalidUrl, fetchFn })
    ).rejects.toThrow(/must be|must be a stable/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it.each([
    [
      403,
      validManifest(),
      { 'content-type': 'application/json', 'cache-control': 'no-store' },
      'returned 403',
    ],
    [
      200,
      validManifest(),
      { 'content-type': 'text/plain', 'cache-control': 'no-store' },
      'did not return application/json',
    ],
    [
      200,
      validManifest(),
      { 'content-type': 'application/json' },
      'missing Cache-Control: no-store',
    ],
    [
      200,
      undefined,
      { 'content-type': 'application/json', 'cache-control': 'no-store' },
      'invalid JSON',
    ],
  ])(
    'rejects an invalid response with a safe diagnostic',
    async (status, body, headers, message) => {
      const fetchFn = jest
        .fn()
        .mockResolvedValue(response(status, body, headers));

      await expect(
        runFunctionEndpointRegistrySmoke({ registryUrl, fetchFn })
      ).rejects.toThrow(message);
    }
  );

  it.each([
    [{ ...validManifest(), schemaVersion: 2 }, 'schemaVersion must be 1'],
    [{ ...validManifest(), environment: 'test' }, 'environment must be prod'],
    [{ ...validManifest(), functions: [] }, 'functions must be an object'],
    [
      { ...validManifest(), functions: { getAuthorUuidV2: authorUrl } },
      'missing the objectMinuteRentalSearch function key',
    ],
    [
      {
        ...validManifest(),
        functions: { ...validManifest().functions, extraFunction: 'not a URL' },
      },
      'URL for extraFunction is invalid',
    ],
    [
      {
        ...validManifest(),
        functions: {
          ...validManifest().functions,
          extraFunction: 'http://internal.test',
        },
      },
      'URL for extraFunction must use HTTPS',
    ],
  ])('rejects an invalid manifest: %s', async (manifest, message) => {
    const fetchFn = jest.fn().mockResolvedValue(successfulResponse(manifest));

    await expect(
      runFunctionEndpointRegistrySmoke({ registryUrl, fetchFn })
    ).rejects.toThrow(message);
  });

  it('sanitizes fetch failures instead of reporting request details', async () => {
    const fetchFn = jest
      .fn()
      .mockRejectedValue(new Error(`${registryUrl} private response detail`));

    await expect(
      runFunctionEndpointRegistrySmoke({ registryUrl, fetchFn })
    ).rejects.toThrow('Registry GET failed before a response was received.');
  });
});
