import { describe, expect, it, jest } from '@jest/globals';
import { createHash } from 'node:crypto';
import {
  fetchFunctionEndpointRegistry,
  main,
} from '../../.github/scripts/fetch-function-endpoint-registry.js';

const registryUrl =
  'https://storage.googleapis.com/example-function-endpoints/function-endpoints.json';
const validRegistry = {
  schemaVersion: 1,
  environment: 'prod',
  functions: {
    objectMinuteRentalSearch: 'https://search.example.run.app',
    getAuthorUuidV2: 'https://author.example.run.app',
  },
};

describe('Netlify production function endpoint registry fetch', () => {
  it('fetches anonymously, validates the public contract, and returns the search URL', async () => {
    const response = makeResponse(validRegistry);
    const fetchFn = jest.fn().mockResolvedValue(response);
    const timeoutSignal = jest.fn(() => 'timeout-signal');

    const result = await fetchFunctionEndpointRegistry({
      registryUrl,
      fetchFn,
      timeoutSignal,
    });

    expect(result).toEqual({
      registryUrl,
      registryHost: 'storage.googleapis.com',
      registryBody: JSON.stringify(validRegistry),
      registrySha256: createHash('sha256')
        .update(JSON.stringify(validRegistry), 'utf8')
        .digest('hex'),
      registryGeneration: '1740000000000000',
      registryEtag: '"registry-etag"',
      schemaVersion: 1,
      environment: 'prod',
      functions: validRegistry.functions,
      endpointUrl: 'https://search.example.run.app',
      functionKeys: ['getAuthorUuidV2', 'objectMinuteRentalSearch'],
    });
    expect(fetchFn).toHaveBeenCalledWith(registryUrl, {
      method: 'GET',
      redirect: 'error',
      headers: { Accept: 'application/json' },
      signal: 'timeout-signal',
    });
    expect(timeoutSignal).toHaveBeenCalledWith(15_000);
  });

  it.each([
    [403, 'allow anonymous object reads for the public registry'],
    [404, 'confirm the production registry object has been applied'],
  ])('reports actionable guidance for HTTP %i', async (status, guidance) => {
    await expect(
      fetchFunctionEndpointRegistry({
        registryUrl,
        fetchFn: jest
          .fn()
          .mockResolvedValue(makeResponse(validRegistry, status)),
      })
    ).rejects.toThrow(`Registry GET returned ${status}; ${guidance}.`);
  });

  it('reports network failures without leaking request details', async () => {
    await expect(
      fetchFunctionEndpointRegistry({
        registryUrl,
        fetchFn: jest
          .fn()
          .mockRejectedValue(new Error('private transport detail')),
      })
    ).rejects.toThrow(
      'Registry GET failed before a response was received; check public GCS access and network connectivity.'
    );
  });

  it('rejects malformed, non-JSON, and cacheable registry responses', async () => {
    await expect(
      fetchFunctionEndpointRegistry({
        registryUrl:
          'http://storage.googleapis.com/example/function-endpoints.json',
        fetchFn: jest.fn(),
      })
    ).rejects.toThrow('FUNCTION_ENDPOINT_REGISTRY_URL must be an HTTPS');

    await expect(
      fetchFunctionEndpointRegistry({
        registryUrl,
        fetchFn: jest
          .fn()
          .mockResolvedValue(
            makeResponse(validRegistry, 200, { 'content-type': 'text/plain' })
          ),
      })
    ).rejects.toThrow('Registry GET did not return application/json.');

    await expect(
      fetchFunctionEndpointRegistry({
        registryUrl,
        fetchFn: jest.fn().mockResolvedValue(
          makeResponse(validRegistry, 200, {
            'cache-control': 'public, max-age=60',
          })
        ),
      })
    ).rejects.toThrow('Registry response is missing Cache-Control: no-store.');
  });

  it.each([
    ['invalid JSON', '{', 'Registry GET returned invalid JSON.'],
    [
      'unsupported version',
      { ...validRegistry, schemaVersion: 2 },
      'Registry schemaVersion must be 1.',
    ],
    [
      'wrong environment',
      { ...validRegistry, environment: 'test' },
      'Registry environment must be prod.',
    ],
    [
      'missing search function',
      {
        ...validRegistry,
        functions: { getAuthorUuidV2: 'https://author.example.run.app' },
      },
      'Registry is missing the objectMinuteRentalSearch function key.',
    ],
    [
      'non-HTTPS endpoint',
      {
        ...validRegistry,
        functions: {
          ...validRegistry.functions,
          objectMinuteRentalSearch: 'http://search.example.run.app',
        },
      },
      'Registry URL for objectMinuteRentalSearch must use HTTPS.',
    ],
  ])(
    'rejects %s before writing production build settings',
    async (_label, body, message) => {
      const appendFileFn = jest.fn();
      const writeFileFn = jest.fn();
      const registryJson =
        typeof body === 'string' ? body : JSON.stringify(body);

      await expect(
        main({
          environment: {
            GITHUB_ENV: '/runner/github-env',
            FUNCTION_ENDPOINT_REGISTRY_URL: registryUrl,
            FUNCTION_ENDPOINT_REGISTRY_EVIDENCE_PATH:
              '/runner/temp/function-endpoint-registry-observation.json',
            GITHUB_RUN_ID: '123456789',
            GITHUB_SHA: 'a'.repeat(40),
          },
          fetchFn: jest.fn().mockResolvedValue(makeResponse(registryJson)),
          appendFileFn,
          writeFileFn,
          writeLine: jest.fn(),
        })
      ).rejects.toThrow(message);
      expect(appendFileFn).not.toHaveBeenCalled();
      expect(writeFileFn).not.toHaveBeenCalled();
    }
  );

  it('writes the build endpoint and registry observation only after validation succeeds', async () => {
    const appendFileFn = jest.fn().mockResolvedValue(undefined);
    const writeFileFn = jest.fn().mockResolvedValue(undefined);
    const writeLine = jest.fn();
    const evidencePath =
      '/runner/temp/function-endpoint-registry-observation.json';
    const registryJson = JSON.stringify(validRegistry);
    const registrySha256 = createHash('sha256')
      .update(registryJson, 'utf8')
      .digest('hex');

    await expect(
      main({
        environment: {
          GITHUB_ENV: '/runner/github-env',
          FUNCTION_ENDPOINT_REGISTRY_URL: registryUrl,
          FUNCTION_ENDPOINT_REGISTRY_EVIDENCE_PATH: evidencePath,
          GITHUB_RUN_ID: '123456789',
          GITHUB_SHA: 'a'.repeat(40),
        },
        fetchFn: jest.fn().mockResolvedValue(makeResponse(validRegistry)),
        appendFileFn,
        writeFileFn,
        writeLine,
        timeoutSignal: () => 'timeout-signal',
        now: () => '2026-10-19T00:00:00.000Z',
      })
    ).resolves.toBe(0);

    expect(appendFileFn).toHaveBeenCalledWith(
      '/runner/github-env',
      'DADETO_BUILD_TARGET=production\n' +
        'OBJECT_MINUTE_RENTAL_SEARCH_URL=https://search.example.run.app\n',
      'utf8'
    );
    const observation = {
      schemaVersion: 1,
      build: {
        runId: '123456789',
        sourceCommitSha: 'a'.repeat(40),
        observedAt: '2026-10-19T00:00:00.000Z',
      },
      registryObject: {
        url: registryUrl,
        body: registryJson,
        sha256: registrySha256,
        generation: '1740000000000000',
        etag: '"registry-etag"',
        schemaVersion: 1,
        environment: 'prod',
        functions: validRegistry.functions,
      },
    };
    expect(writeFileFn).toHaveBeenCalledWith(
      evidencePath,
      `${JSON.stringify(observation, null, 2)}\n`,
      'utf8'
    );
    expect(writeLine).toHaveBeenCalledWith(
      'Configured production endpoint from the public registry at storage.googleapis.com; validated keys: getAuthorUuidV2, objectMinuteRentalSearch.'
    );
    expect(writeLine.mock.calls.flat().join(' ')).not.toContain(registryJson);
  });
});

/**
 * Creates a minimal fetch response for registry validation tests.
 * @param {object|string} body Response payload returned by `text`.
 * @param {number} [status] HTTP response status.
 * @param {Record<string, string>} [headerOverrides] Additional response headers.
 * @returns {{status: number, headers: {get: (name: string) => string|null}, text: () => Promise<string>}} Mock response.
 */
function makeResponse(body, status = 200, headerOverrides = {}) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-goog-generation': '1740000000000000',
    etag: '"registry-etag"',
    ...headerOverrides,
  };
  return {
    status,
    headers: { get: name => headers[name.toLowerCase()] ?? null },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}
