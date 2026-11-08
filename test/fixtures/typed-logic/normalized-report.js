import {
  createCheckCoverageReport,
  createCheckFullReport,
  mapCoverageMetrics,
} from '../../../src/logic/core/local/checkFullReport.js';
import { parseCheckFullReportEvidence } from '../../../src/logic/boundary/local/checkFullReport.js';

/**
 * Feed the old public-output fixtures through the actual new boundary and core.
 * This is a test adapter, not a production forwarding implementation.
 * @param {object} [input] Legacy workflow fixture.
 * @returns {object} Actual normalized report.
 */
export function createReportFromLegacyFixture(input = {}) {
  const {
    commitSha = '',
    workflowResult = 'unknown',
    changedPaths = [],
    deletedPaths = [],
    coverageThresholds = mapCoverageMetrics(() => 100),
  } = input;
  const parsed = parseCheckFullReportEvidence({
    coverageRunText: JSON.stringify(input.coverageRun) ?? '',
    coverageSummaryText: JSON.stringify(input.coverageSummary) ?? '',
    failureLog: input.failureLog ?? '',
  });
  if (!parsed.ok) throw parsed.error;
  return createCheckFullReport(
    { commitSha, workflowResult },
    parsed.evidence,
    createCheckCoverageReport(
      parsed.evidence.coverage,
      coverageThresholds,
      changedPaths,
      deletedPaths
    )
  );
}
