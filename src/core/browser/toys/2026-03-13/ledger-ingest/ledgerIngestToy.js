import { parseJsonOrFallback } from '../../browserToysCore.js';
import { fixtures, importTransactions } from './core.js';

const DEFAULT_FIXTURE = 'happyPath';

/**
 * Resolve which fixture to run based on the parsed input.
 * @param {Record<string, unknown>} parsed Toy payload parsed from JSON.
 * @returns {keyof typeof fixtures} Key for an existing fixture.
 */
function resolveFixture(parsed) {
  const candidate = getFixtureCandidate(parsed);
  if (isKnownFixtureCandidate(candidate)) {
    return candidate;
  }
  return /** @type {keyof typeof fixtures} */ (DEFAULT_FIXTURE);
}

/**
 * Read the optional fixture key from the parsed payload.
 * @param {Record<string, unknown>} parsed Toy payload parsed from JSON.
 * @returns {unknown} Raw fixture candidate.
 */
function getFixtureCandidate(parsed) {
  return parsed && parsed.fixture;
}

/**
 * Determine whether the candidate is a known fixture key.
 * @param {unknown} candidate Raw fixture candidate.
 * @returns {candidate is keyof typeof fixtures} True when the fixture exists.
 */
function isKnownFixtureCandidate(candidate) {
  if (typeof candidate !== 'string') {
    return false;
  }

  return isKnownFixture(candidate);
}

/**
 * Determine whether a fixture key exists in the local fixture bundle.
 * @param {unknown} candidate Candidate fixture key.
 * @returns {candidate is keyof typeof fixtures} True when the fixture exists.
 */
function isKnownFixture(candidate) {
  return (
    typeof candidate === 'string' &&
    Object.prototype.hasOwnProperty.call(fixtures, candidate)
  );
}

/**
 * Recognize the direct JSON import shape produced by the CSV converter toy.
 * @param {unknown} candidate Parsed toy payload.
 * @returns {candidate is { source?: string, rawRecords: Record<string, unknown>[] }} True when the payload is import-ready JSON.
 */
function isImportInput(candidate) {
  if (!isImportInputObject(candidate)) {
    return false;
  }

  return hasRawRecordsArray(candidate);
}

/**
 * @param {unknown} candidate Parsed toy payload.
 * @returns {candidate is Record<string, unknown>} True when the candidate is an object-like payload.
 */
function isImportInputObject(candidate) {
  return candidate !== null && typeof candidate === 'object';
}

/**
 * Check whether the candidate payload has a rawRecords array.
 * @param {Record<string, unknown>} candidate Parsed toy payload.
 * @returns {boolean} True when rawRecords is an array.
 */
function hasRawRecordsArray(candidate) {
  return Array.isArray(
    /** @type {{ rawRecords?: unknown }} */ (candidate).rawRecords
  );
}

/**
 * Read the source label from an import-ready payload.
 * @param {{ source?: unknown }} parsed Import-ready payload.
 * @returns {string} Source label or the import default.
 */
function getImportSource(parsed) {
  return typeof parsed.source === 'string' ? parsed.source : 'jsonImport';
}

/**
 * Create the user-facing payload that keeps canonical rows, duplicates, errors, and summary data.
 * @param {string} inputLabel Human-readable label for the input path.
 * @param {ReturnType<typeof importTransactions>} result Core run output.
 * @param {'fixture' | 'json'} inputMode Input mode used for the run.
 * @returns {Record<string, unknown>} Minimal toy response.
 */
function buildResponsePayload(inputLabel, result, inputMode) {
  return {
    inputMode,
    fixture: inputLabel,
    canonicalTransactions: result.canonicalTransactions,
    duplicateReports: result.duplicateReports,
    errorReports: result.errorReports,
    summary: result.summary,
    policy: result.policy,
  };
}

/**
 * Ledger ingest toy that runs either a named fixture or a pasted import JSON payload.
 * @param {string} input Toy runner payload (JSON string).
 * @returns {string} JSON string containing the input label and key result buckets.
 */
export function ledgerIngestToy(input) {
  const parsed = /** @type {Record<string, unknown>} */ (
    parseJsonOrFallback(input, {})
  );
  if (isImportInput(parsed)) {
    const source = getImportSource(parsed);
    const result = importTransactions(
      /** @type {{ source: string, rawRecords: Record<string, unknown>[] }} */ ({
        source,
        rawRecords: /** @type {Record<string, unknown>[]} */ (parsed.rawRecords),
      })
    );
    return JSON.stringify(buildResponsePayload('jsonImport', result, 'json'));
  }

  const fixtureName = resolveFixture(parsed);
  const fixture = fixtures[fixtureName];
  const result = importTransactions(fixture.input);
  return JSON.stringify(buildResponsePayload(fixtureName, result, 'fixture'));
}

export const ledgerIngestToyTestOnly = {
  resolveFixture,
  isKnownFixture,
  isImportInput,
  buildResponsePayload,
};
