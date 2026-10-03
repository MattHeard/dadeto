// Stryker disable all -- this module is the fixed Notion Codex outcome
// normalization and persistence boundary covered by the outcome-store suite.
import { isMissingFileError } from '../../commonCore.js';

/**
 * Normalize a candidate outcome payload.
 * @param {unknown} value Candidate outcome payload.
 * @returns {{ outcome: string, summary: string }} Normalized outcome.
 */
export function normalizeNotionCodexOutcome(value) {
  const source = {};
  if (value && typeof value === 'object') {
    Object.assign(source, value);
  }
  const record = /** @type {Record<string, unknown>} */ (source);
  let outcome = 'unknown';
  if (typeof record.outcome === 'string') {
    outcome = record.outcome;
  }

  let summary = '';
  if (typeof record.summary === 'string') {
    summary = record.summary;
  }

  return { outcome, summary };
}

/**
 * Create a small JSON file store for Notion Codex outcomes.
 * @param {{
 *   outcomeDir: string,
 *   pathModule: { join: (first: string, ...parts: string[]) => string },
 *   mkdirImpl: (dirPath: string, options: { recursive: boolean }) => Promise<void>,
 *   readFileImpl: (filePath: string, encoding: 'utf8') => Promise<string>,
 *   writeFileImpl: (filePath: string, data: string, encoding: 'utf8') => Promise<void>
 * }} options Store dependencies.
 * @returns {{
 *   readOutcome: (runId: string) => Promise<{ outcome: string, summary: string } | null>,
 *   writeOutcome: (runId: string, outcome: Record<string, unknown>) => Promise<void>
 * }} Outcome store.
 */
export function createNotionCodexOutcomeStore(options) {
  const context = {
    options,
    mkdirImpl: options.mkdirImpl,
    readFileImpl: options.readFileImpl,
    writeFileImpl: options.writeFileImpl,
  };
  const readOutcome = readStoredOutcome.bind(null, context);
  const writeOutcome = writeStoredOutcome.bind(null, context);
  return { readOutcome, writeOutcome };
}

/**
 * Read and normalize one persisted outcome using the captured file reader.
 * @param {{options: Parameters<typeof createNotionCodexOutcomeStore>[0]} & Pick<Parameters<typeof createNotionCodexOutcomeStore>[0], 'mkdirImpl'|'readFileImpl'|'writeFileImpl'>} context Captured file operations and live path dependencies.
 * @param {string} runId Run identifier.
 * @returns {Promise<{outcome: string, summary: string} | null>} Normalized outcome or missing record.
 */
async function readStoredOutcome(context, runId) {
  const { options, readFileImpl } = context;
  try {
    const rawOutcome = await readFileImpl(
      getOutcomePath(options.outcomeDir, runId, options.pathModule),
      'utf8'
    );
    return normalizeNotionCodexOutcome(JSON.parse(rawOutcome));
  } catch (error) {
    return recoverMissingOutcome(error);
  }
}

/**
 * Recover only an absent outcome, preserving other failures unchanged.
 * @param {unknown} error Read or normalization failure.
 * @returns {null} Missing outcome marker.
 */
function recoverMissingOutcome(error) {
  if (!isMissingFileError(error)) throw error;
  return null;
}

/**
 * Persist an outcome after ensuring its current directory exists.
 * @param {{options: Parameters<typeof createNotionCodexOutcomeStore>[0]} & Pick<Parameters<typeof createNotionCodexOutcomeStore>[0], 'mkdirImpl'|'readFileImpl'|'writeFileImpl'>} context Captured file operations and live path dependencies.
 * @param {string} runId Run identifier.
 * @param {Record<string, unknown>} outcome Outcome payload.
 * @returns {Promise<void>} Completion after persistence.
 */
async function writeStoredOutcome(context, runId, outcome) {
  const { options, mkdirImpl, writeFileImpl } = context;
  await mkdirImpl(options.outcomeDir, { recursive: true });
  const outcomePath = getOutcomePath(
    options.outcomeDir,
    runId,
    options.pathModule
  );
  const serializedOutcome = serializeOutcome(outcome);
  await writeFileImpl(outcomePath, serializedOutcome, 'utf8');
}

/**
 * Serialize a normalized outcome.
 * @param {Record<string, unknown>} outcome Outcome payload.
 * @returns {string} Serialized outcome.
 */
function serializeOutcome(outcome) {
  return JSON.stringify(normalizeNotionCodexOutcome(outcome), null, 2);
}

/**
 * Resolve the on-disk path for one outcome record.
 * @param {string} outcomeDir Outcome directory.
 * @param {string} runId Run id.
 * @param {{ join: (first: string, ...parts: string[]) => string }} pathModule Path helper.
 * @returns {string} Outcome file path.
 */
function getOutcomePath(outcomeDir, runId, pathModule) {
  return pathModule.join(outcomeDir, `${runId.replaceAll(':', '-')}.json`);
}
// Stryker restore all
