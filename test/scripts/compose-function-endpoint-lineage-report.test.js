import { createHash } from 'node:crypto';

import { describe, expect, it, jest } from '@jest/globals';
import {
  composeFunctionEndpointLineageReport,
  main,
} from '../../.github/scripts/compose-function-endpoint-lineage-report.js';

const registryUrl =
  'https://storage.googleapis.com/example-function-endpoints/function-endpoints.json';
const gcpSha = 'a'.repeat(40);
const netlifySha = 'b'.repeat(40);
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
 * Create serialized GCP and Netlify artifacts with matching GitHub run metadata.
 * @returns {Record<string, string>} Default report inputs.
 */
function makeInputs() {
  return {
    expectedRegistryUrl: registryUrl,
    gcpArtifactJson: JSON.stringify({
      schemaVersion: 1,
      gcpProd: {
        runId: '5001',
        sourceCommitSha: gcpSha,
        terraformApply: 'success',
        completedAt: '2026-10-19T12:00:00Z',
        functionUrls: {
          objectMinuteRentalSearch: 'https://rental-search.example.run.app',
          getAuthorUuidV2: 'https://get-author-uuid.example.run.app',
        },
      },
      registryObject: {
        url: registryUrl,
        gcpProdRunId: '5001',
        sourceCommitSha: gcpSha,
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
    }),
    netlifyObservationJson: JSON.stringify({
      schemaVersion: 1,
      build: {
        runId: '6002',
        sourceCommitSha: netlifySha,
        observedAt: '2026-10-19T13:01:00Z',
      },
      registryObject: {
        url: registryUrl,
        body: registryBody,
        sha256: registrySha256,
        generation: '1792337153100867',
        etag: '"registry-etag"',
        schemaVersion: 1,
        environment: 'prod',
        functions: {
          objectMinuteRentalSearch: 'https://rental-search.example.run.app',
          getAuthorUuidV2: 'https://get-author-uuid.example.run.app',
        },
      },
      netlifyDeployment: {
        deploymentId: 'netlify-deploy-123',
        deploymentUrl: 'https://deploy-123.netlify.app',
        siteUrl: 'https://rental-search.netlify.app',
      },
    }),
    gcpWorkflowRunJson: JSON.stringify({
      id: 5001,
      ['head_sha']: gcpSha,
      conclusion: 'success',
      ['run_started_at']: '2026-10-19T10:00:00Z',
    }),
    netlifyWorkflowRunJson: JSON.stringify({
      id: 6002,
      ['head_sha']: netlifySha,
      conclusion: 'success',
      ['run_started_at']: '2026-10-19T13:00:00Z',
    }),
  };
}

/**
 * Update one nested field in a serialized JSON input.
 * @param {Record<string, string>} input Existing report inputs.
 * @param {string} key Input JSON property to replace.
 * @param {string[]} path Nested property path.
 * @param {unknown} value Replacement value.
 * @returns {Record<string, string>} Updated report inputs.
 */
function updateJsonInput(input, key, path, value) {
  const document = JSON.parse(input[key]);
  let cursor = document;
  for (const part of path.slice(0, -1)) cursor = cursor[part];
  cursor[path.at(-1)] = value;
  return { ...input, [key]: JSON.stringify(document) };
}

describe('composeFunctionEndpointLineageReport', () => {
  it('validates captured artifacts against successful workflow runs and marks health unverified', () => {
    const input = makeInputs();
    const report = composeFunctionEndpointLineageReport(input);

    expect(report).toMatchObject({
      schemaVersion: 1,
      status: {
        registryPublication: 'verified',
        netlifyBuildResolution: 'verified',
        endpointHealth: 'not-verified',
      },
      lineage: {
        gcpProd: { runId: '5001', sourceCommitSha: gcpSha },
        registry: {
          url: registryUrl,
          generation: '1792337153100867',
          environment: 'prod',
        },
        netlify: {
          buildRunId: '6002',
          deploymentId: 'netlify-deploy-123',
          deploymentUrl: 'https://deploy-123.netlify.app',
        },
      },
    });
    expect(JSON.stringify(report)).not.toContain(registryBody);
  });

  it.each([
    [
      'GCP evidence',
      'gcpArtifactJson',
      '{',
      'GCP evidence must be valid JSON.',
    ],
    [
      'Netlify observation',
      'netlifyObservationJson',
      '{',
      'Netlify observation must be valid JSON.',
    ],
    [
      'GCP workflow run metadata',
      'gcpWorkflowRunJson',
      '{',
      'GCP workflow run metadata must be valid JSON.',
    ],
    [
      'Netlify workflow run metadata',
      'netlifyWorkflowRunJson',
      '{',
      'Netlify workflow run metadata must be valid JSON.',
    ],
  ])('rejects malformed %s JSON', (_label, key, value, error) => {
    const input = { ...makeInputs(), [key]: value };
    expect(() => composeFunctionEndpointLineageReport(input)).toThrow(error);
  });

  it.each([
    {
      label: 'GCP artifact schema',
      key: 'gcpArtifactJson',
      path: ['schemaVersion'],
      value: 2,
      error: 'GCP evidence schemaVersion must be 1.',
    },
    {
      label: 'Netlify artifact schema',
      key: 'netlifyObservationJson',
      path: ['schemaVersion'],
      value: 2,
      error: 'Netlify observation schemaVersion must be 1.',
    },
    {
      label: 'GCP run identity',
      key: 'gcpWorkflowRunJson',
      path: ['id'],
      value: 7000,
      error: 'GCP workflow run ID does not match its artifact.',
    },
    {
      label: 'Netlify run identity',
      key: 'netlifyWorkflowRunJson',
      path: ['head_sha'],
      value: 'c'.repeat(40),
      error: 'Netlify workflow SHA does not match its artifact.',
    },
    {
      label: 'failed GCP conclusion',
      key: 'gcpWorkflowRunJson',
      path: ['conclusion'],
      value: 'failure',
      error: 'GCP workflow conclusion must be success.',
    },
    {
      label: 'failed Netlify conclusion',
      key: 'netlifyWorkflowRunJson',
      path: ['conclusion'],
      value: 'cancelled',
      error: 'Netlify workflow conclusion must be success.',
    },
    {
      label: 'malformed Netlify start time',
      key: 'netlifyWorkflowRunJson',
      path: ['run_started_at'],
      value: 'yesterday',
      error: 'Netlify workflow start time must be a valid ISO timestamp.',
    },
    {
      label: 'mismatched published registry',
      key: 'gcpArtifactJson',
      path: ['registryObject', 'url'],
      value: 'https://storage.googleapis.com/other/registry.json',
      error: 'Registry object URL does not match the stable registry URL.',
    },
    {
      label: 'different Netlify registry digest',
      key: 'netlifyObservationJson',
      path: ['registryObject', 'sha256'],
      value: '0'.repeat(64),
      error: 'Netlify build consumed a different registry object.',
    },
  ])('rejects $label', ({ key, path, value, error }) => {
    const input = updateJsonInput(makeInputs(), key, path, value);
    expect(() => composeFunctionEndpointLineageReport(input)).toThrow(error);
  });

  it('writes a validated report without logging artifact contents', async () => {
    const inputs = makeInputs();
    const files = new Map([
      ['/gcp.json', inputs.gcpArtifactJson],
      ['/netlify.json', inputs.netlifyObservationJson],
      ['/gcp-run.json', inputs.gcpWorkflowRunJson],
      ['/netlify-run.json', inputs.netlifyWorkflowRunJson],
    ]);
    const readFileFn = jest.fn(async path => files.get(path));
    const writeFileFn = jest.fn().mockResolvedValue(undefined);
    const writeLine = jest.fn();

    await expect(
      main({
        argv: [
          '/gcp.json',
          '/netlify.json',
          '/gcp-run.json',
          '/netlify-run.json',
          '/report.json',
        ],
        environment: { FUNCTION_ENDPOINT_REGISTRY_URL: registryUrl },
        readFileFn,
        writeFileFn,
        writeLine,
      })
    ).resolves.toBe(0);

    expect(readFileFn).toHaveBeenCalledTimes(4);
    expect(JSON.parse(writeFileFn.mock.calls[0][1]).status.endpointHealth).toBe(
      'not-verified'
    );
    expect(writeFileFn.mock.calls[0][0]).toBe('/report.json');
    expect(writeLine).toHaveBeenCalledWith(
      'Validated GCP-to-Netlify registry lineage; endpoint health remains unverified.'
    );
    expect(writeLine.mock.calls.flat().join(' ')).not.toContain(registryBody);
  });

  it('supports help and rejects missing paths or registry configuration', async () => {
    const writeLine = jest.fn();
    await expect(main({ argv: ['--help'], writeLine })).resolves.toBe(0);
    await expect(main({ argv: [], writeLine })).rejects.toThrow(
      'Expected four evidence inputs and one report output path.'
    );
    await expect(
      main({
        argv: ['a', 'b', 'c', 'd', 'e'],
        environment: {},
        writeLine,
      })
    ).rejects.toThrow('FUNCTION_ENDPOINT_REGISTRY_URL');
  });
});
