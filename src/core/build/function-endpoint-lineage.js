import { parseFunctionEndpointRegistry } from './function-endpoint-registry.js';

const COMMIT_SHA_PATTERN = /^[a-f0-9]{40}$/i;
const REGISTRY_SHA256_PATTERN = /^[a-f0-9]{64}$/i;
const RUN_ID_PATTERN = /^[1-9]\d*$/;
const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/** @typedef {{ runId: string, sourceCommitSha: string, completedAt: string, functionUrls: Record<string, string> }} GcpProductionEvidence */
/** @typedef {{ url: string, gcpProdRunId: string, sourceCommitSha: string, generation: string | undefined, etag: string | undefined, sha256: string, schemaVersion: number, environment: string, functions: Record<string, string> }} RegistryObjectEvidence */

/** @typedef {{ buildRunId: string, deploymentId: string, deploymentUrl: string, sourceCommitSha: string, startedAt: string, registryUrl: string, registryGeneration: string | undefined, registryEtag: string | undefined, registrySha256: string }} NetlifyDeploymentEvidence */
/** @typedef {{ schemaVersion: 1, gcpProd: GcpProductionEvidence, registry: RegistryObjectEvidence, netlify: NetlifyDeploymentEvidence }} FunctionEndpointLineage */

/**
 * Parse and validate the evidence connecting a GCP apply, registry object, and
 * later Netlify deployment.
 * @param {string} lineageJson Serialized lineage record.
 * @param {{ expectedRegistryUrl?: string }} options Expected stable registry URL.
 * @param {(body: string) => string} sha256Utf8 Injected SHA-256 UTF-8 digest operation.
 * @returns {FunctionEndpointLineage} Validated, normalized lineage evidence.
 */
export function parseFunctionEndpointLineage(
  lineageJson,
  { expectedRegistryUrl } = {},
  sha256Utf8
) {
  const lineage = parseLineageJson(lineageJson);
  requireRecord(lineage, 'Lineage JSON must be an object.');
  requireVersion(lineage.schemaVersion);
  const stableRegistryUrl = requireStableRegistryUrl(expectedRegistryUrl);

  const gcpProd = parseGcpProductionEvidence(lineage.gcpProd);
  const registry = parseRegistryObject(
    lineage.registryObject,
    gcpProd,
    stableRegistryUrl,
    sha256Utf8
  );
  const netlify = parseNetlifyEvidence(lineage.netlify, gcpProd, registry);

  return { schemaVersion: 1, gcpProd, registry, netlify };
}

/**
 * Parse a serialized lineage record.
 * @param {string} lineageJson Serialized record.
 * @returns {unknown} Parsed JSON value.
 */
function parseLineageJson(lineageJson) {
  try {
    return JSON.parse(lineageJson);
  } catch {
    throw new Error('Lineage record must be valid JSON.');
  }
}

/**
 * Require the supported lineage schema version.
 * @param {unknown} version Candidate version.
 * @returns {void} Nothing when supported.
 */
function requireVersion(version) {
  if (version !== 1) {
    throw new Error('Lineage schemaVersion must be 1.');
  }
}

/**
 * Require the configured stable public registry URL.
 * @param {unknown} registryUrl Candidate URL.
 * @returns {string} Validated stable URL.
 */
function requireStableRegistryUrl(registryUrl) {
  const validatedUrl = requireNonEmptyString(
    registryUrl,
    'Expected registry URL is required.'
  );
  const parsedUrl = parseHttpsUrl(validatedUrl, 'Expected registry URL');
  if (
    parsedUrl.host !== 'storage.googleapis.com' ||
    parsedUrl.search !== '' ||
    parsedUrl.hash !== ''
  ) {
    throw new Error('Expected registry URL must be a stable public GCS URL.');
  }
  return validatedUrl;
}

/**
 * Validate successful GCP production apply evidence.
 * @param {unknown} value Candidate GCP evidence.
 * @returns {GcpProductionEvidence} Validated GCP evidence.
 */
function parseGcpProductionEvidence(value) {
  requireRecord(value, 'GCP production evidence must be an object.');
  const runId = requireRunId(value.runId, 'GCP production run ID');
  if (value.conclusion !== 'success' || value.terraformApply !== 'success') {
    throw new Error(
      'GCP production workflow and Terraform apply must succeed.'
    );
  }
  const sourceCommitSha = requireCommitSha(
    value.sourceCommitSha,
    'GCP source commit SHA'
  );
  const completedAt = requireTimestamp(
    value.completedAt,
    'GCP completion time'
  );
  const functionUrls = parseFunctionUrls(value.functionUrls);
  return { runId, sourceCommitSha, completedAt, functionUrls };
}

/**
 * Validate the published registry object and its source relationship.
 * @param {unknown} value Candidate registry evidence.
 * @param {GcpProductionEvidence} gcpProd Validated GCP evidence.
 * @param {string} expectedRegistryUrl Configured stable URL.
 * @param {(body: string) => string} sha256Utf8 Injected digest operation.
 * @returns {RegistryObjectEvidence} Validated registry evidence.
 */
function parseRegistryObject(value, gcpProd, expectedRegistryUrl, sha256Utf8) {
  requireRecord(value, 'Registry object evidence must be an object.');
  const url = requireNonEmptyString(value.url, 'Registry object URL');
  if (url !== expectedRegistryUrl) {
    throw new Error(
      'Registry object URL does not match the stable registry URL.'
    );
  }
  if (
    requireRunId(value.gcpProdRunId, 'Registry GCP run ID') !== gcpProd.runId
  ) {
    throw new Error('Registry object is not linked to the successful GCP run.');
  }
  const sourceCommitSha = requireCommitSha(
    value.sourceCommitSha,
    'Registry source commit SHA'
  );
  if (sourceCommitSha !== gcpProd.sourceCommitSha) {
    throw new Error(
      'Registry source commit does not match the GCP source commit.'
    );
  }

  const generation = parseOptionalGeneration(value.generation);
  const etag = parseOptionalEtag(value.etag);
  const body = requireNonEmptyString(value.body, 'Registry object body');
  const contentSha256 = sha256Utf8(body);
  const document = parseFunctionEndpointRegistry(body);
  if (!sameStringMap(document.functions, gcpProd.functionUrls)) {
    throw new Error('Registry function URLs do not match the GCP deployment.');
  }

  return {
    url,
    gcpProdRunId: gcpProd.runId,
    sourceCommitSha,
    generation,
    etag,
    sha256: contentSha256,
    schemaVersion: document.schemaVersion,
    environment: document.environment,
    functions: document.functions,
  };
}

/**
 * Validate a later Netlify deployment's registry association.
 * @param {unknown} value Candidate Netlify evidence.
 * @param {GcpProductionEvidence} gcpProd Validated GCP evidence.
 * @param {RegistryObjectEvidence} registry Validated registry evidence.
 * @returns {NetlifyDeploymentEvidence} Validated Netlify evidence.
 */
function parseNetlifyEvidence(value, gcpProd, registry) {
  requireRecord(value, 'Netlify deployment evidence must be an object.');
  const buildRunId = requireRunId(value.buildRunId, 'Netlify build run ID');
  const deploymentId = requireNonEmptyString(
    value.deploymentId,
    'Netlify deployment ID'
  );
  const deploymentUrl = requireNonEmptyString(
    value.deploymentUrl,
    'Netlify deployment URL'
  );
  parseHttpsUrl(deploymentUrl, 'Netlify deployment URL');
  if (value.conclusion !== 'success') {
    throw new Error('Netlify build and deployment must succeed.');
  }
  const sourceCommitSha = requireCommitSha(
    value.sourceCommitSha,
    'Netlify source commit SHA'
  );
  const startedAt = requireTimestamp(value.startedAt, 'Netlify start time');
  if (Date.parse(startedAt) <= Date.parse(gcpProd.completedAt)) {
    throw new Error('Netlify build must start after the GCP apply completes.');
  }
  const registryUrl = requireNonEmptyString(
    value.registryUrl,
    'Netlify registry URL'
  );
  if (registryUrl !== registry.url) {
    throw new Error('Netlify build did not use the published registry URL.');
  }

  const registrySha256 = requireSha256(value.registrySha256);
  if (registrySha256 !== registry.sha256) {
    throw new Error('Netlify build consumed a different registry object.');
  }
  const registryGeneration = parseOptionalGeneration(value.registryGeneration);
  if (
    registryGeneration !== undefined &&
    registryGeneration !== registry.generation
  ) {
    throw new Error('Netlify build pinned an obsolete registry generation.');
  }
  const registryEtag = parseOptionalEtag(value.registryEtag);
  if (registryEtag !== undefined && registryEtag !== registry.etag) {
    throw new Error('Netlify build consumed a different registry ETag.');
  }

  return {
    buildRunId,
    deploymentId,
    deploymentUrl,
    sourceCommitSha,
    startedAt,
    registryUrl,
    registryGeneration,
    registryEtag,
    registrySha256,
  };
}

/**
 * Validate the deployed function URL map.
 * @param {unknown} value Candidate URL map.
 * @returns {Record<string, string>} Validated URLs.
 */
function parseFunctionUrls(value) {
  requireRecord(value, 'GCP function URL evidence must be an object.');
  /** @type {Record<string, string>} */
  const functionUrls = {};
  for (const [name, url] of Object.entries(value)) {
    const validatedUrl = requireNonEmptyString(
      url,
      `GCP function URL for ${name}`
    );
    parseHttpsUrl(validatedUrl, `GCP function URL for ${name}`);
    functionUrls[name] = validatedUrl;
  }
  return functionUrls;
}

/**
 * Validate an optional GCS generation number.
 * @param {unknown} value Candidate generation.
 * @returns {string | undefined} Validated generation.
 */
function parseOptionalGeneration(value) {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new Error('Registry generation must be a decimal string.');
  }
  return value;
}

/**
 * Validate an optional GCS ETag.
 * @param {unknown} value Candidate ETag.
 * @returns {string | undefined} Validated ETag.
 */
function parseOptionalEtag(value) {
  if (value === undefined) {
    return undefined;
  }
  return requireNonEmptyString(value, 'Registry ETag');
}

/**
 * Validate and normalize a registry body digest.
 * @param {unknown} value Candidate digest.
 * @returns {string} Normalized digest.
 */
function requireSha256(value) {
  return requirePattern(
    value,
    REGISTRY_SHA256_PATTERN,
    'Registry SHA-256 must be a 64-character hex digest.'
  ).toLowerCase();
}

/**
 * Validate and normalize a Git commit SHA.
 * @param {unknown} value Candidate SHA.
 * @param {string} label Diagnostic label.
 * @returns {string} Normalized SHA.
 */
function requireCommitSha(value, label) {
  return requirePattern(
    value,
    COMMIT_SHA_PATTERN,
    `${label} must be a 40-character hex SHA.`
  ).toLowerCase();
}

/**
 * Require a numeric GitHub Actions run ID.
 * @param {unknown} value Candidate run ID.
 * @param {string} label Diagnostic label.
 * @returns {string} Validated run ID.
 */
function requireRunId(value, label) {
  return requirePattern(
    value,
    RUN_ID_PATTERN,
    `${label} must be a positive decimal string.`
  );
}

/**
 * Require a string timestamp accepted by the JavaScript date parser.
 * @param {unknown} value Candidate timestamp.
 * @param {string} label Diagnostic label.
 * @returns {string} Validated timestamp.
 */
function requireTimestamp(value, label) {
  const timestamp = parseTimestampText(value);
  if (timestamp === null || !Number.isFinite(Date.parse(timestamp.input))) {
    throw new Error(`${label} must be a valid timestamp.`);
  }
  return timestamp.input;
}

/**
 * Parse the accepted timestamp text format before calendar interpretation.
 * @param {unknown} value Untrusted timestamp candidate.
 * @returns {{ input: string } | null} Native format match retaining original text, or an invalid-format outcome.
 */
function parseTimestampText(value) {
  if (typeof value !== 'string') {
    return null;
  }
  return TIMESTAMP_PATTERN.exec(value);
}

/**
 * Require a non-empty string.
 * @param {unknown} value Candidate string.
 * @param {string} label Diagnostic label.
 * @returns {string} Validated string.
 */
function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

/**
 * Require an HTTPS URL without embedded credentials.
 * @param {string} value Candidate URL.
 * @param {string} label Diagnostic label.
 * @returns {URL} Parsed URL.
 */
function parseHttpsUrl(value, label) {
  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid HTTPS URL.`);
  }
  if (
    parsedUrl.protocol !== 'https:' ||
    parsedUrl.username !== '' ||
    parsedUrl.password !== ''
  ) {
    throw new Error(`${label} must be a valid HTTPS URL.`);
  }
  return parsedUrl;
}

/**
 * Assert that a value is a plain JSON object.
 * @param {unknown} value Candidate object.
 * @param {string} message Error message.
 * @returns {asserts value is Record<string, unknown>} Nothing when valid.
 */
function requireRecord(value, message) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
}

/**
 * Compare two string maps without relying on property insertion order.
 * @param {Record<string, string>} left First map.
 * @param {Record<string, string>} right Second map.
 * @returns {boolean} Whether the maps have the same keys and values.
 */
function sameStringMap(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(key => left[key] === right[key])
  );
}

/**
 * Require a string matching a validation pattern.
 * @param {unknown} value Candidate string.
 * @param {RegExp} pattern Validation pattern.
 * @param {string} message Error message.
 * @returns {string} Validated string.
 */
function requirePattern(value, pattern, message) {
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new Error(message);
  }
  return value;
}

/** Focused access to the pure format stage used by lineage parsing. */
export const functionEndpointLineageTestOnly = { parseTimestampText };
