import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Attach Netlify CLI deployment metadata to a registry observation.
 * @param {{ deploymentJson: string, observationJson: string }} input Serialized inputs.
 * @returns {string} Updated JSON artifact.
 */
export function attachNetlifyDeploymentEvidence({
  deploymentJson,
  observationJson,
}) {
  const deployment = parseJson(
    deploymentJson,
    'Netlify CLI output must be valid JSON.'
  );
  requireRecord(deployment, 'Netlify CLI output must be an object.');

  const observation = parseJson(
    observationJson,
    'Registry observation must be valid JSON.'
  );
  requireRecord(observation, 'Registry observation must be an object.');
  if (
    observation.schemaVersion !== 1 ||
    !isRecord(observation.build) ||
    !isRecord(observation.registryObject)
  ) {
    throw new Error('Registry observation has an unsupported shape.');
  }
  if (observation.netlifyDeployment !== undefined) {
    throw new Error('Registry observation already has Netlify deployment data.');
  }

  const deploymentId = requireNonEmptyString(
    deployment.deploy_id,
    'Netlify deploy_id'
  );
  const deploymentUrl = requireHttpsUrl(deployment.deploy_url, 'deploy_url');
  const siteUrl = requireHttpsUrl(deployment.url, 'url');

  const updatedObservation = {
    ...observation,
    netlifyDeployment: {
      deploymentId,
      deploymentUrl,
      siteUrl,
    },
  };
  return `${JSON.stringify(updatedObservation, null, 2)}\n`;
}

/**
 * Read the deploy JSON and registry observation, then update the observation in place.
 * @param {{ argv?: string[], readFileFn?: typeof readFile, writeFileFn?: typeof writeFile, writeLine?: (message: string) => void }} options Runner dependencies.
 * @returns {Promise<number>} Process exit code.
 */
export async function main({
  argv = process.argv.slice(2),
  readFileFn = readFile,
  writeFileFn = writeFile,
  writeLine = console.log,
} = {}) {
  if (argv.includes('--help')) {
    writeLine(
      'Attach Netlify CLI deployment identity to a function endpoint registry observation.'
    );
    return 0;
  }
  if (argv.length !== 2) {
    throw new Error(
      'Expected paths to the Netlify deployment JSON and registry observation JSON.'
    );
  }

  const [deploymentPath, observationPath] = argv;
  const [deploymentJson, observationJson] = await Promise.all([
    readFileFn(deploymentPath, 'utf8'),
    readFileFn(observationPath, 'utf8'),
  ]);
  const updatedObservation = attachNetlifyDeploymentEvidence({
    deploymentJson,
    observationJson,
  });
  await writeFileFn(observationPath, updatedObservation, 'utf8');
  writeLine('Attached Netlify deployment identity to registry observation.');
  return 0;
}

/**
 * Parse JSON with a safe, non-content-bearing error.
 * @param {string} value Serialized JSON.
 * @param {string} message Safe error message.
 * @returns {unknown} Parsed JSON value.
 */
function parseJson(value, message) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(message);
  }
}

/**
 * Require a non-array object.
 * @param {unknown} value Candidate value.
 * @param {string} message Safe error message.
 * @returns {void} Nothing when the value is an object.
 */
function requireRecord(value, message) {
  if (!isRecord(value)) {
    throw new Error(message);
  }
}

/**
 * Check whether a value is a non-array object.
 * @param {unknown} value Candidate value.
 * @returns {value is Record<string, unknown>} Whether the value is a record.
 */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Require a trimmed non-empty string.
 * @param {unknown} value Candidate value.
 * @param {string} name Field name.
 * @returns {string} Validated string.
 */
function requireNonEmptyString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Netlify ${name} must be a non-empty string.`);
  }
  return value;
}

/**
 * Require an absolute HTTPS URL without embedded credentials.
 * @param {unknown} value Candidate URL.
 * @param {string} name Field name.
 * @returns {string} Validated URL.
 */
function requireHttpsUrl(value, name) {
  const urlString = requireNonEmptyString(value, name);
  let url;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(`Netlify ${name} must be an HTTPS URL.`);
  }
  if (url.protocol !== 'https:' || url.username !== '' || url.password !== '') {
    throw new Error(`Netlify ${name} must be an HTTPS URL.`);
  }
  return url.href;
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
