import { captureEvidenceResult } from './evidence-result.js';
import { COVERAGE_METRICS } from '../../core/local/checkFullReport.js';

/** @typedef {import('../../core/local/checkFullReport.js').MetricValues} MetricValues */
/** @typedef {import('../../core/local/checkFullReport.js').CoverageData} CoverageData */
/** @typedef {import('../../core/local/checkFullReport.js').TestSummary} TestSummary */
/** @typedef {import('../../core/local/checkFullReport.js').FailureEvidence} FailureEvidence */
/** @typedef {import('../../core/local/checkFullReport.js').ReportEvidence} ReportEvidence */
/** @typedef {{ok: true, evidence: ReportEvidence} | {ok: false, error: unknown}} ParsedReportEvidence */

/**
 * Interpret untrusted file text with the report adapter's established semantics.
 * Invalid JSON means unavailable evidence. Valid JSON with an invalid coverage
 * shape is an explicit failure, never successful default coverage. The outer
 * adapter propagates that failure. Every text input has a defined typed outcome.
 * @param {{coverageRunText: string, coverageSummaryText: string, failureLog: string}} input Untrusted text.
 * @returns {ParsedReportEvidence} Normalized evidence or the original shape error.
 */
export function parseCheckFullReportEvidence({
  coverageRunText,
  coverageSummaryText,
  failureLog,
}) {
  return captureEvidenceResult(() => {
    const coverage = parseCoverage(parseJsonText(coverageSummaryText));
    const run = parseJsonText(coverageRunText);
    const counts = { tests: parseTestCounts(run), runPresent: Boolean(run) };
    /** @type {ReportEvidence} */
    const evidence = coverage
      ? { ...counts, coverage, failure: null }
      : { ...counts, coverage: null, failure: parseFailure(run, failureLog) };
    return evidence;
  });
}

/**
 * Match the old adapter's unreadable/invalid-JSON null default.
 * @param {string} text Untrusted JSON text, empty when unreadable.
 * @returns {unknown} Decoded JSON value or null.
 */
function parseJsonText(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Box a decoded JSON value and read an unknown property without type gatekeeping.
 * Object always produces an object; its unknown-valued record type follows by
 * construction. Null and primitive candidates have no named report fields.
 * @param {unknown} value Decoded JSON value.
 * @param {string} key Requested field.
 * @returns {unknown} Untrusted property value.
 */
function readField(value, key) {
  return /** @type {Record<string, unknown>} */ (Object(value))[key];
}

/**
 * Preserve property-read failure semantics for invalid coverage shapes.
 * @param {unknown} value Coverage container.
 * @param {string} key Required property.
 * @returns {unknown} Untrusted property value.
 */
function readCoverageField(value, key) {
  if (value === null || value === undefined)
    throw new TypeError(
      `Cannot read properties of ${value} (reading '${key}')`
    );
  return readField(value, key);
}

/**
 * Parse a finite numeric value without coercion.
 * The numeric cast follows Number.isFinite's runtime proof.
 * @param {unknown} value Candidate count or percentage.
 * @returns {number | null} Finite value or unavailable.
 */
function parseFiniteNumber(value) {
  return Number.isFinite(value) ? /** @type {number} */ (value) : null;
}

/**
 * Parse all four metrics in the established short-circuit order.
 * @param {unknown} value Untrusted file/global metric record.
 * @returns {MetricValues | null} Complete finite percentages or unavailable.
 */
function parsePercentages(value) {
  /** @type {Array<[string, number]>} */
  const entries = [];
  for (const metric of COVERAGE_METRICS) {
    const percentage = parseFiniteNumber(
      readCoverageField(readCoverageField(value, metric), 'pct')
    );
    if (percentage === null) return null;
    entries.push([metric, percentage]);
  }
  // All four fixed keys and finite values were checked above.
  return /** @type {MetricValues} */ (Object.fromEntries(entries));
}

/**
 * Normalize measured files while keeping malformed shapes observable as errors.
 * @param {unknown} value Decoded coverage summary.
 * @returns {CoverageData | null} Available complete summary or unavailable.
 */
function parseCoverage(value) {
  if (value === null) return null;
  const total = parsePercentages(readCoverageField(value, 'total'));
  if (total === null) return null;
  /** @type {Array<{file: string, metrics: MetricValues}>} */
  const files = [];
  for (const [file, candidate] of Object.entries(
    /** @type {Record<string, unknown>} */ (value)
  )) {
    if (file === 'total' || candidate === null) continue;
    const metrics = parsePercentages(candidate);
    if (metrics) files.push({ file, metrics });
  }
  return { total, files };
}

/**
 * Preserve test-count correlation rather than independent nullable type guesses.
 * @param {unknown} run Decoded runner metadata.
 * @returns {TestSummary} Finite counts or a complete unavailable state.
 */
function parseTestCounts(run) {
  const suites = parseFiniteNumber(readField(run, 'testSuites'));
  const tests = parseFiniteNumber(readField(run, 'tests'));
  if (suites === null || tests === null)
    return {
      suites: null,
      tests: null,
      passed: null,
      failed: null,
      complete: false,
      completedShards: null,
      totalShards: null,
    };
  const completedShards = parseFiniteNumber(readField(run, 'completedShards'));
  const totalShards = parseFiniteNumber(readField(run, 'totalShards'));
  return {
    suites,
    tests,
    passed: parseFiniteNumber(readField(run, 'passed')),
    failed: parseFiniteNumber(readField(run, 'failed')),
    complete: totalShards !== null && completedShards === totalShards,
    completedShards,
    totalShards,
  };
}

/**
 * Classify untrusted failure text before it reaches trusted message selection.
 * @param {unknown} run Decoded metadata.
 * @param {string} failureLog Untrusted aggregate log.
 * @returns {FailureEvidence} Established precedence and custom-message semantics.
 */
function parseFailure(run, failureLog) {
  const reason = readField(run, 'failureReason');
  const evidence = `${reason}\n${failureLog}`.toLowerCase();
  if (
    /heap out of memory|javascript heap|heap limit|allocation failed/.test(
      evidence
    )
  )
    return { kind: 'heap' };
  if (/timed out|timeout|sigterm/.test(evidence)) return { kind: 'timeout' };
  if (
    /test suites?:.*failed|tests?:.*failed|coverage shard failed/.test(evidence)
  )
    return { kind: 'unit-failure' };
  if (reason) return { kind: 'custom', message: String(reason) };
  return { kind: 'other', running: readField(run, 'status') === 'running' };
}
