import { parseJsonOrFallback } from '../../browserToysCore.js';
import { fixtures, importTransactions } from './core.js';

const DEFAULT_FIXTURE = 'happyPath';

/**
 * Resolve which fixture to run based on the parsed input.
 * @param {Record<string, unknown>} parsed Toy payload parsed from JSON.
 * @returns {string} Key for an existing fixture.
 */
function resolveFixture(parsed) {
  const candidate = parsed?.fixture;
  if (isKnownFixture(candidate)) {
    return candidate;
  }
  return DEFAULT_FIXTURE;
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
  if (!candidate || typeof candidate !== 'object') {
    return false;
  }

  return Array.isArray(
    /** @type {{ rawRecords?: unknown }} */ (candidate).rawRecords
  );
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
  const parsed = parseJsonOrFallback(input, {});
  if (isImportInput(parsed)) {
    const result = importTransactions(
      /** @type {{ source?: string, rawRecords: Record<string, unknown>[] }} */ (
        parsed
      )
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
