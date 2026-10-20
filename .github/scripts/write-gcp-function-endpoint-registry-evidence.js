import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { fetchFunctionEndpointRegistry } from './fetch-function-endpoint-registry.js';

/**
 * Capture evidence for a successful production Terraform apply and its registry object.
 * @param {{ environment: Record<string, string | undefined>, fetchFn?: typeof fetch, timeoutSignal?: (milliseconds: number) => AbortSignal }} options Evidence inputs and runtime adapters.
 * @returns {Promise<Record<string, unknown>>} Public deployment evidence.
 */
export async function createGcpFunctionEndpointRegistryEvidence({
  environment,
  fetchFn = globalThis.fetch,
  timeoutSignal = AbortSignal.timeout,
}) {
  const runId = requireRunId(environment.GITHUB_RUN_ID);
  const sourceCommitSha = requireCommitSha(environment.SOURCE_COMMIT_SHA);
  if (environment.TERRAFORM_APPLY_OUTCOME !== 'success') {
    throw new Error('Terraform Apply must succeed before evidence is captured.');
  }
  const completedAt = requireApplyCompletedAt(
    environment.TERRAFORM_APPLY_COMPLETED_AT
  );

  const registry = await fetchFunctionEndpointRegistry({
    registryUrl: environment.FUNCTION_ENDPOINT_REGISTRY_URL,
    fetchFn,
    timeoutSignal,
  });
  return {
    schemaVersion: 1,
    gcpProd: {
      runId,
      sourceCommitSha,
      terraformApply: 'success',
      completedAt,
      functionUrls: registry.functions,
    },
    registryObject: {
      url: registry.registryUrl,
      gcpProdRunId: runId,
      sourceCommitSha,
      generation: registry.registryGeneration,
      etag: registry.registryEtag,
      body: registry.registryBody,
      sha256: registry.registrySha256,
      schemaVersion: registry.schemaVersion,
      environment: registry.environment,
      functions: registry.functions,
    },
  };
}

/**
 * Write a GCP production registry evidence artifact.
 * @param {{ environment?: Record<string, string | undefined>, writeFileFn?: typeof writeFile, writeLine?: (message: string) => void, fetchFn?: typeof fetch, timeoutSignal?: (milliseconds: number) => AbortSignal }} options Runtime dependencies.
 * @returns {Promise<number>} Process exit code.
 */
export async function main({
  environment = process.env,
  writeFileFn = writeFile,
  writeLine = console.log,
  fetchFn = globalThis.fetch,
  timeoutSignal = AbortSignal.timeout,
} = {}) {
  const evidencePath = requireEnvironmentValue(
    environment.FUNCTION_ENDPOINT_REGISTRY_EVIDENCE_PATH,
    'FUNCTION_ENDPOINT_REGISTRY_EVIDENCE_PATH'
  );
  const evidence = await createGcpFunctionEndpointRegistryEvidence({
    environment,
    fetchFn,
    timeoutSignal,
  });

  await writeFileFn(
    evidencePath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    'utf8'
  );
  writeLine('Captured GCP production endpoint registry evidence.');
  return 0;
}

/**
 * Require a non-empty workflow environment value.
 * @param {string | undefined} value Candidate value.
 * @param {string} name Environment variable name.
 * @returns {string} Validated value.
 */
function requireEnvironmentValue(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required workflow environment value: ${name}.`);
  }
  return value;
}

/**
 * Validate a positive GitHub Actions run ID.
 * @param {string | undefined} value Candidate run ID.
 * @returns {string} Validated run ID.
 */
function requireRunId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new Error('GITHUB_RUN_ID must be a positive decimal string.');
  }
  return value;
}

/**
 * Validate a Git commit SHA.
 * @param {string | undefined} value Candidate SHA.
 * @returns {string} Validated SHA.
 */
function requireCommitSha(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/i.test(value)) {
    throw new Error('SOURCE_COMMIT_SHA must be a 40-character hex SHA.');
  }
  return value;
}

/**
 * Validate the timestamp recorded immediately after Terraform Apply succeeds.
 * @param {string | undefined} value Candidate completion timestamp.
 * @returns {string} Validated completion timestamp.
 */
function requireApplyCompletedAt(value) {
  if (!isTimestamp(value)) {
    throw new Error(
      'TERRAFORM_APPLY_COMPLETED_AT must be a valid ISO timestamp.'
    );
  }
  return value;
}

/**
 * Check that an ISO timestamp parses as a finite date.
 * @param {unknown} value Candidate timestamp.
 * @returns {boolean} Whether the timestamp is valid.
 */
function isTimestamp(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value
    ) &&
    Number.isFinite(Date.parse(value))
  );
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  main()
    .then(exitCode => {
      process.exitCode = exitCode;
    })
    .catch(error => {
      console.error(`::error::${error.message}`);
      process.exitCode = 1;
    });
}
