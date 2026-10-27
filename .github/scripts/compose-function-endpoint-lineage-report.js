import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseFunctionEndpointLineage } from '../../src/core/build/function-endpoint-lineage.js';

/**
 * Compose GCP apply and Netlify deployment artifacts into validated lineage.
 * @param {{ gcpArtifactJson: string, netlifyObservationJson: string, gcpWorkflowRunJson: string, netlifyWorkflowRunJson: string, expectedRegistryUrl: string }} input Serialized artifacts and GitHub run metadata.
 * @returns {Record<string, unknown>} Validated lineage report with separated status claims.
 */
export function composeFunctionEndpointLineageReport({
  gcpArtifactJson,
  netlifyObservationJson,
  gcpWorkflowRunJson,
  netlifyWorkflowRunJson,
  expectedRegistryUrl,
}) {
  const gcpArtifact = parseObjectJson(
    gcpArtifactJson,
    'GCP evidence must be valid JSON.'
  );
  const netlifyArtifact = parseObjectJson(
    netlifyObservationJson,
    'Netlify observation must be valid JSON.'
  );
  const gcpWorkflowRun = parseObjectJson(
    gcpWorkflowRunJson,
    'GCP workflow run metadata must be valid JSON.'
  );
  const netlifyWorkflowRun = parseObjectJson(
    netlifyWorkflowRunJson,
    'Netlify workflow run metadata must be valid JSON.'
  );

  requireVersion(gcpArtifact.schemaVersion, 'GCP evidence');
  requireVersion(netlifyArtifact.schemaVersion, 'Netlify observation');

  const gcpProduction = requireRecord(
    gcpArtifact.gcpProd,
    'GCP production evidence must be an object.'
  );
  const gcpRegistry = requireRecord(
    gcpArtifact.registryObject,
    'GCP registry object evidence must be an object.'
  );
  const gcpRun = requireMatchingWorkflowRun(
    gcpWorkflowRun,
    gcpProduction,
    'GCP'
  );
  const netlifyBuild = requireRecord(
    netlifyArtifact.build,
    'Netlify build evidence must be an object.'
  );
  const netlifyRun = requireMatchingWorkflowRun(
    netlifyWorkflowRun,
    netlifyBuild,
    'Netlify'
  );
  const netlifyDeployment = requireRecord(
    netlifyArtifact.netlifyDeployment,
    'Netlify deployment identity must be an object.'
  );
  const netlifyRegistry = requireRecord(
    netlifyArtifact.registryObject,
    'Netlify registry observation must be an object.'
  );
  requireRegistryDigest(gcpRegistry, 'GCP');
  const netlifyRegistrySha256 = requireRegistryDigest(netlifyRegistry, 'Netlify');

  const lineage = {
    schemaVersion: 1,
    gcpProd: {
      ...gcpProduction,
      conclusion: gcpRun.conclusion,
    },
    registryObject: gcpRegistry,
    netlify: {
      buildRunId: netlifyRun.runId,
      deploymentId: netlifyDeployment.deploymentId,
      deploymentUrl: netlifyDeployment.deploymentUrl,
      conclusion: netlifyRun.conclusion,
      sourceCommitSha: netlifyBuild.sourceCommitSha,
      startedAt: netlifyRun.startedAt,
      registryUrl: netlifyRegistry.url,
      registryGeneration: netlifyRegistry.generation,
      registryEtag: netlifyRegistry.etag,
      registrySha256: netlifyRegistrySha256,
    },
  };

  const validatedLineage = parseFunctionEndpointLineage(
    JSON.stringify(lineage),
    { expectedRegistryUrl },
    sha256Utf8
  );
  return {
    schemaVersion: 1,
    status: {
      registryPublication: 'verified',
      netlifyBuildResolution: 'verified',
      endpointHealth: 'not-verified',
    },
    lineage: validatedLineage,
  };
}

/**
 * Read four evidence inputs and write a validated lineage report.
 * @param {{ argv?: string[], environment?: Record<string, string | undefined>, readFileFn?: typeof readFile, writeFileFn?: typeof writeFile, writeLine?: (message: string) => void }} options Runner dependencies.
 * @returns {Promise<number>} Process exit code.
 */
export async function main({
  argv = process.argv.slice(2),
  environment = process.env,
  readFileFn = readFile,
  writeFileFn = writeFile,
  writeLine = console.log,
} = {}) {
  if (argv.includes('--help')) {
    writeLine(
      'Compose GCP and Netlify workflow artifacts into validated endpoint lineage.'
    );
    writeLine(
      'Usage: node .github/scripts/compose-function-endpoint-lineage-report.js GCP_ARTIFACT NETLIFY_ARTIFACT GCP_RUN_JSON NETLIFY_RUN_JSON OUTPUT_JSON'
    );
    return 0;
  }
  if (argv.length !== 5) {
    throw new Error('Expected four evidence inputs and one report output path.');
  }
  const expectedRegistryUrl = requireEnvironmentValue(
    environment.FUNCTION_ENDPOINT_REGISTRY_URL,
    'FUNCTION_ENDPOINT_REGISTRY_URL'
  );
  const [gcpPath, netlifyPath, gcpRunPath, netlifyRunPath, outputPath] = argv;
  const [gcpArtifactJson, netlifyObservationJson, gcpWorkflowRunJson, netlifyWorkflowRunJson] =
    await Promise.all([
      readFileFn(gcpPath, 'utf8'),
      readFileFn(netlifyPath, 'utf8'),
      readFileFn(gcpRunPath, 'utf8'),
      readFileFn(netlifyRunPath, 'utf8'),
    ]);
  const report = composeFunctionEndpointLineageReport({
    gcpArtifactJson,
    netlifyObservationJson,
    gcpWorkflowRunJson,
    netlifyWorkflowRunJson,
    expectedRegistryUrl,
  });
  await writeFileFn(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeLine(
    'Validated GCP-to-Netlify registry lineage; endpoint health remains unverified.'
  );
  return 0;
}

/**
 * Parse JSON and require a non-array object.
 * @param {string} value Serialized JSON value.
 * @param {string} parseMessage Safe parse error.
 * @returns {Record<string, unknown>} Parsed object.
 */
function parseObjectJson(value, parseMessage) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(parseMessage);
  }
  return requireRecord(parsed, 'Evidence input must be an object.');
}

/**
 * Require schema version 1 for a captured artifact.
 * @param {unknown} value Candidate version.
 * @param {string} label Artifact label.
 * @returns {void} Nothing when supported.
 */
function requireVersion(value, label) {
  if (value !== 1) {
    throw new Error(`${label} schemaVersion must be 1.`);
  }
}

/**
 * Require a JSON object.
 * @param {unknown} value Candidate value.
 * @param {string} message Safe validation error.
 * @returns {Record<string, unknown>} Validated object.
 */
function requireRecord(value, message) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
  return value;
}

/**
 * Verify GitHub workflow metadata belongs to the captured source artifact.
 * @param {Record<string, unknown>} metadata GitHub Actions workflow-run JSON.
 * @param {Record<string, unknown>} artifact Captured build identity.
 * @param {string} label Workflow label for static error messages.
 * @returns {{ runId: string, conclusion: string, startedAt: string }} Validated run identity.
 */
function requireMatchingWorkflowRun(metadata, artifact, label) {
  const runId = requirePositiveRunId(metadata.id, `${label} workflow run ID`);
  if (String(artifact.runId) !== runId) {
    throw new Error(`${label} workflow run ID does not match its artifact.`);
  }
  const headSha = requireCommitSha(metadata.head_sha, `${label} workflow SHA`);
  const sourceCommitSha = requireCommitSha(
    artifact.sourceCommitSha,
    `${label} artifact source SHA`
  );
  if (headSha !== sourceCommitSha) {
    throw new Error(`${label} workflow SHA does not match its artifact.`);
  }
  if (metadata.conclusion !== 'success') {
    throw new Error(`${label} workflow conclusion must be success.`);
  }
  const startedAt = requireTimestamp(
    metadata.run_started_at,
    `${label} workflow start time`
  );
  return { runId, conclusion: metadata.conclusion, startedAt };
}

/**
 * Require a positive decimal run ID from GitHub's numeric API field.
 * @param {unknown} value Candidate ID.
 * @param {string} label Field label.
 * @returns {string} Normalized decimal ID.
 */
function requirePositiveRunId(value, label) {
  const normalized =
    typeof value === 'number' && Number.isSafeInteger(value)
      ? String(value)
      : value;
  if (typeof normalized !== 'string' || !/^[1-9]\d*$/.test(normalized)) {
    throw new Error(`${label} must be a positive decimal string.`);
  }
  return normalized;
}

/**
 * Require a commit SHA.
 * @param {unknown} value Candidate SHA.
 * @param {string} label Field label.
 * @returns {string} Lowercase-normalized SHA.
 */
function requireCommitSha(value, label) {
  if (typeof value !== 'string' || !/^[a-f0-9]{40}$/i.test(value)) {
    throw new Error(`${label} must be a 40-character hex SHA.`);
  }
  return value.toLowerCase();
}

/**
 * Require an ISO timestamp with an explicit timezone.
 * @param {unknown} value Candidate timestamp.
 * @param {string} label Field label.
 * @returns {string} Validated timestamp.
 */
function requireTimestamp(value, label) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value
    ) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new Error(`${label} must be a valid ISO timestamp.`);
  }
  return value;
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
 * Hash exact UTF-8 registry bytes at the CI integration boundary.
 * @param {string} body Captured registry content.
 * @returns {string} Lowercase hexadecimal SHA-256 digest.
 */
function sha256Utf8(body) {
  return createHash('sha256').update(body, 'utf8').digest('hex');
}

/**
 * Verify that a captured registry digest identifies its exact body.
 * @param {Record<string, unknown>} registry Registry artifact section.
 * @param {string} label Artifact label for static diagnostics.
 * @returns {string} Validated SHA-256 digest.
 */
function requireRegistryDigest(registry, label) {
  const body = registry.body;
  const digest = registry.sha256;
  if (typeof body !== 'string' || body.trim() === '') {
    throw new Error(`${label} registry body must be a non-empty string.`);
  }
  if (typeof digest !== 'string' || !/^[a-f0-9]{64}$/i.test(digest)) {
    throw new Error(`${label} registry digest must be 64 hex characters.`);
  }
  const actualDigest = sha256Utf8(body);
  if (digest.toLowerCase() !== actualDigest) {
    throw new Error(
      `${label} registry digest does not match its captured body.`
    );
  }
  return actualDigest;
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
