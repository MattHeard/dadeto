import { parseCheckFullReportEvidence } from '../../../src/logic/boundary/local/checkFullReport.js';
import {
  createCheckCoverageReport,
  createCheckFullReport,
  mapCoverageMetrics,
} from '../../../src/logic/core/local/checkFullReport.js';

/**
 * Compose the actual public boundary/core APIs for original raw-text fixtures.
 * @param {object} input Raw evidence fixture.
 * @returns {object} Actual public report; failures propagate like the adapter.
 */
export function buildReportJsonFixture(input) {
  const parsed = parseCheckFullReportEvidence(input);
  if (!parsed.ok) throw parsed.error;
  const scope = createCheckCoverageReport(
    parsed.evidence.coverage,
    mapCoverageMetrics(() => 100),
    ['src/core/a.js', 'src/logic/core/z.js', 'src/local/glue.js'],
    []
  );
  return createCheckFullReport(
    { commitSha: 'raw-fixture', workflowResult: input.workflowResult },
    parsed.evidence,
    scope
  );
}
