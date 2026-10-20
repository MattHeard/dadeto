import { createHash } from 'node:crypto';

import { describe, expect, it, jest } from '@jest/globals';
import { main } from '../../.github/scripts/write-gcp-function-endpoint-registry-evidence.js';

const registryUrl =
  'https://storage.googleapis.com/example-function-endpoints/function-endpoints.json';
const sourceCommitSha = 'a'.repeat(40);
const registryBody = JSON.stringify({
  schemaVersion: 1,
  environment: 'prod',
  functions: {
    objectMinuteRentalSearch: 'https://rental-search.example.run.app',
    getAuthorUuidV2: 'https://get-author-uuid.example.run.app',
  },
});
const registrySha256 = createHash('sha256')
  .update(registryBody, 'utf8')
  .digest('hex');

/**
 * Make a successful public registry response.
 * @param {string} body Serialized registry response body.
 * @param {Record<string, string>} headers Response header overrides.
 * @returns {Response} Mocked successful response.
 */
function makeResponse(body, headers = {}) {
  const normalizedHeaders = new Map(
    Object.entries({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-goog-generation': '1792337153100867',
      etag: '"registry-etag"',
      ...headers,
    }).map(([key, value]) => [key.toLowerCase(), value])
  );
  return {
    status: 200,
    headers: { get: name => normalizedHeaders.get(name.toLowerCase()) ?? null },
    text: jest.fn().mockResolvedValue(body),
  };
}

/**
 * Build a valid GCP evidence environment with optional overrides.
 * @param {Record<string, string | undefined>} overrides Environment overrides.
 * @returns {Record<string, string | undefined>} Workflow environment.
 */
function makeEnvironment(overrides = {}) {
  return {
    FUNCTION_ENDPOINT_REGISTRY_URL: registryUrl,
    FUNCTION_ENDPOINT_REGISTRY_EVIDENCE_PATH:
      '/runner/function-endpoint-registry.json',
    GITHUB_RUN_ID: '39250000000',
    SOURCE_COMMIT_SHA: sourceCommitSha,
    TERRAFORM_APPLY_COMPLETED_AT: '2026-10-19T13:00:00.000Z',
    TERRAFORM_APPLY_OUTCOME: 'success',
    ...overrides,
  };
}

describe('GCP function endpoint registry evidence writer', () => {
  it('writes validated apply and public registry identity without logging the contents', async () => {
    const writeFileFn = jest.fn().mockResolvedValue(undefined);
    const writeLine = jest.fn();
    const fetchFn = jest.fn().mockResolvedValue(makeResponse(registryBody));

    await expect(
      main({
        environment: makeEnvironment(),
        fetchFn,
        timeoutSignal: jest.fn(() => new AbortController().signal),
        writeFileFn,
        writeLine,
      })
    ).resolves.toBe(0);

    const [path, serializedEvidence, encoding] = writeFileFn.mock.calls[0];
    expect(path).toBe('/runner/function-endpoint-registry.json');
    expect(encoding).toBe('utf8');
    expect(JSON.parse(serializedEvidence)).toEqual({
      schemaVersion: 1,
      gcpProd: {
        runId: '39250000000',
        sourceCommitSha,
        terraformApply: 'success',
        completedAt: '2026-10-19T13:00:00.000Z',
        functionUrls: {
          objectMinuteRentalSearch: 'https://rental-search.example.run.app',
          getAuthorUuidV2: 'https://get-author-uuid.example.run.app',
        },
      },
      registryObject: {
        url: registryUrl,
        gcpProdRunId: '39250000000',
        sourceCommitSha,
        generation: '1792337153100867',
        etag: '"registry-etag"',
        body: registryBody,
        sha256: registrySha256,
        schemaVersion: 1,
        environment: 'prod',
        functions: {
          objectMinuteRentalSearch: 'https://rental-search.example.run.app',
          getAuthorUuidV2: 'https://get-author-uuid.example.run.app',
        },
      },
    });
    expect(writeLine).toHaveBeenCalledWith(
      'Captured GCP production endpoint registry evidence.'
    );
    expect(writeLine.mock.calls.flat().join(' ')).not.toContain(registryBody);
    expect(writeLine.mock.calls.flat().join(' ')).not.toContain(registryUrl);
  });

  it.each([
    ['missing run ID', { GITHUB_RUN_ID: undefined }, 'positive decimal string'],
    [
      'invalid source SHA',
      { SOURCE_COMMIT_SHA: 'bad' },
      '40-character hex SHA',
    ],
    [
      'failed Terraform apply',
      { TERRAFORM_APPLY_OUTCOME: 'failure' },
      'Terraform Apply must succeed',
    ],
    [
      'invalid Terraform Apply completion time',
      { TERRAFORM_APPLY_COMPLETED_AT: 'yesterday' },
      'valid ISO timestamp',
    ],
  ])(
    'rejects %s without fetching or writing evidence',
    async (_label, overrides, message) => {
      const fetchFn = jest.fn();
      const writeFileFn = jest.fn();

      await expect(
        main({
          environment: makeEnvironment(overrides),
          fetchFn,
          writeFileFn,
          writeLine: jest.fn(),
        })
      ).rejects.toThrow(message);
      expect(fetchFn).not.toHaveBeenCalled();
      expect(writeFileFn).not.toHaveBeenCalled();
    }
  );

  it('rejects malformed registry data without writing an artifact', async () => {
    const writeFileFn = jest.fn();

    await expect(
      main({
        environment: makeEnvironment(),
        fetchFn: jest.fn().mockResolvedValue(makeResponse('{')),
        timeoutSignal: jest.fn(() => new AbortController().signal),
        writeFileFn,
        writeLine: jest.fn(),
      })
    ).rejects.toThrow('Registry GET returned invalid JSON.');
    expect(writeFileFn).not.toHaveBeenCalled();
  });

  it('requires the output path before fetching the registry', async () => {
    const fetchFn = jest.fn();

    await expect(
      main({
        environment: makeEnvironment({
          FUNCTION_ENDPOINT_REGISTRY_EVIDENCE_PATH: undefined,
        }),
        fetchFn,
        writeFileFn: jest.fn(),
        writeLine: jest.fn(),
      })
    ).rejects.toThrow('FUNCTION_ENDPOINT_REGISTRY_EVIDENCE_PATH');
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
