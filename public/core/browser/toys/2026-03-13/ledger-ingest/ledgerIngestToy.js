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
  if (
    typeof candidate === 'string' &&
    Object.prototype.hasOwnProperty.call(fixtures, candidate)
  ) {
    return candidate;
  }
  return DEFAULT_FIXTURE;
}

/**
 * Create the user-facing payload that keeps canonical rows, duplicates, errors, and summary data.
 * @param {string} fixtureName Expedition fixture key.
 * @param {ReturnType<typeof importTransactions>} result Core run output.
 * @returns {Record<string, unknown>} Minimal toy response.
 */
function buildResponsePayload(fixtureName, result) {
  return {
    fixture: fixtureName,
    canonicalTransactions: result.canonicalTransactions,
    duplicateReports: result.duplicateReports,
    errorReports: result.errorReports,
    summary: result.summary,
    policy: result.policy,
  };
}

/**
 * Ledger ingest toy that runs a selected fixture and exposes canonical rows, duplicates, and errors.
 * @param {string} input Toy runner payload (JSON string).
 * @param {Map<string, unknown>} env Toy environment helpers (unused).
 * @returns {string} JSON string containing the fixture name and key result buckets.
 */
export function ledgerIngestToy(input, env) {
  void env;

  const parsed = parseJsonOrFallback(input, {});
  const fixtureName = resolveFixture(parsed);
  const fixture = fixtures[fixtureName];
  const result = importTransactions(fixture.input);
  return JSON.stringify(buildResponsePayload(fixtureName, result));
}
