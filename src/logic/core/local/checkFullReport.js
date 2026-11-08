import { isLogicJavaScriptPath } from './logic-source-paths.js';

export const COVERAGE_METRICS = /** @type {const} */ ([
  'statements',
  'branches',
  'functions',
  'lines',
]);

/** @typedef {typeof COVERAGE_METRICS[number]} CoverageMetric */
/** @typedef {Record<CoverageMetric, number>} MetricValues */
/** @typedef {{total: MetricValues, files: Array<{file: string, metrics: MetricValues}>}} CoverageData */
/** @typedef {{suites: null, tests: null, passed: null, failed: null, complete: false, completedShards: null, totalShards: null} | {suites: number, tests: number, passed: number | null, failed: number | null, complete: boolean, completedShards: number | null, totalShards: number | null}} TestSummary */
/** @typedef {{kind: 'heap'} | {kind: 'timeout'} | {kind: 'unit-failure'} | {kind: 'custom', message: string} | {kind: 'other', running: boolean}} FailureEvidence */
/** @typedef {{tests: TestSummary, runPresent: boolean} & ({coverage: CoverageData, failure: null} | {coverage: null, failure: FailureEvidence})} ReportEvidence */
/** @typedef {Record<CoverageMetric, {percentage: number, threshold: number, passed: boolean}>} CoverageResults */
/** @typedef {{coverageAvailable: true, coverage: CoverageResults} | {coverageAvailable: false, coverage: null}} CoverageState */
/** @typedef {{file: string, metrics: string[]}} BelowThresholdFile */
/** @typedef {{file: string, metrics: Record<string, number>}} ChangedFileCoverageEntry */
/** @typedef {CoverageState & {commitSha: string, workflowResult: string, tests: TestSummary, thresholds: MetricValues, belowThresholdMetrics: string[], belowThresholdFiles: BelowThresholdFile[], changedFileCoverage: ChangedFileCoverageEntry[], changedFileCoverageNote: string | null, coverageUnavailableReason: string | null, artifacts: {coverageSummary: string | null, coverageDetail: string | null, partialCoverage: string | null, testRun: string | null, fullCheckLog: string}}} CheckFullReport */

/**
 * Project the fixed schema without weakening its required named-key contract.
 * @template T
 * @param {(metric: CoverageMetric) => T} project Typed value projection.
 * @returns {Record<CoverageMetric, T>} Every schema key, in canonical order.
 */
export function mapCoverageMetrics(project) {
  return /** @type {Record<CoverageMetric, T>} */ (
    Object.fromEntries(
      COVERAGE_METRICS.map(metric => [metric, project(metric)])
    )
  );
}

/** @typedef {CoverageState & {thresholds: MetricValues, belowThresholdMetrics: string[], belowThresholdFiles: BelowThresholdFile[], changedFileCoverage: ChangedFileCoverageEntry[], changedFileCoverageNote: string | null}} CheckCoverageReport */

/**
 * Evaluate current coverage against explicit policy and requested change scope.
 * @param {CoverageData | null} coverageData Normalized measurements.
 * @param {MetricValues} coverageThresholds Required percentages.
 * @param {string[]} changedPaths All changed paths.
 * @param {string[]} deletedPaths Confirmed deleted paths.
 * @returns {CheckCoverageReport} Coverage projection in public field order.
 */
export function createCheckCoverageReport(
  coverageData,
  coverageThresholds,
  changedPaths,
  deletedPaths
) {
  const metrics = coverageData
    ? mapCoverageMetrics(metric => ({
        percentage: coverageData.total[metric],
        threshold: coverageThresholds[metric],
        passed: coverageData.total[metric] >= coverageThresholds[metric],
      }))
    : null;
  const belowThresholdMetrics = metrics
    ? Object.entries(metrics)
        .filter(([, value]) => !value.passed)
        .map(([metric]) => metric)
    : [];
  const belowThresholdFiles = coverageData
    ? coverageData.files
        .map(({ file, metrics: percentages }) => ({
          file,
          metrics: COVERAGE_METRICS.filter(
            metric => percentages[metric] < coverageThresholds[metric]
          ),
        }))
        .filter(entry => entry.metrics.length > 0)
    : [];
  const deleted = new Set(deletedPaths);
  const currentChangedPaths = changedPaths.filter(file => !deleted.has(file));
  const changedFileCoverage = changedCoverageEntries(
    coverageData,
    currentChangedPaths
  );
  /** @type {CoverageState} */
  const coverageState = metrics
    ? { coverageAvailable: true, coverage: metrics }
    : { coverageAvailable: false, coverage: null };

  return {
    ...coverageState,
    thresholds: coverageThresholds,
    belowThresholdMetrics,
    belowThresholdFiles,
    changedFileCoverage,
    changedFileCoverageNote: changedCoverageNote(
      currentChangedPaths,
      changedFileCoverage,
      deletedPaths
    ),
  };
}

/**
 * Compose parsed evidence and evaluated coverage into the public workflow report.
 * @param {{commitSha: string, workflowResult: string}} revision Workflow revision.
 * @param {ReportEvidence} evidence Normalized evidence.
 * @param {CheckCoverageReport} coverageReport Evaluated coverage policy.
 * @returns {CheckFullReport} Report data for JSON, Markdown and Actions summary.
 */
export function createCheckFullReport(
  { commitSha, workflowResult },
  evidence,
  coverageReport
) {
  const coverageData = evidence.coverage;
  const report = {
    commitSha,
    workflowResult,
    tests: evidence.tests,
    ...coverageReport,
    coverageUnavailableReason: evidence.coverage
      ? null
      : explainCoverageUnavailable(workflowResult, evidence.failure),
    artifacts: {
      coverageSummary: coverageData
        ? 'reports/coverage/coverage-summary.json'
        : null,
      coverageDetail: coverageData
        ? 'reports/coverage/coverage-final.json'
        : null,
      partialCoverage:
        !coverageData && evidence.runPresent ? 'reports/coverage/work/' : null,
      testRun: evidence.runPresent
        ? 'reports/coverage/full-test-run.json'
        : null,
      fullCheckLog: 'reports/check-full.log',
    },
  };
  return report;
}

/**
 * Render a compact Actions summary from a full-check report.
 * @param {CheckFullReport} report Full-check data.
 * @returns {string} Markdown summary.
 */
export function renderCheckFullReportMarkdown(report) {
  const lines = [
    '# Full check report',
    '',
    `- Workflow result: **${report.workflowResult}**`,
    `- Commit: \`${report.commitSha || 'unavailable'}\``,
    '',
    '## Unit tests',
    '',
    formatTests(report.tests),
    '',
    '## Coverage',
    '',
  ];

  if (!report.coverageAvailable) {
    lines.push(`Coverage unavailable: ${report.coverageUnavailableReason}`);
  } else {
    lines.push('| Metric | Result | Required | Status |');
    lines.push('| --- | ---: | ---: | --- |');
    const coverage = report.coverage;
    for (const metric of COVERAGE_METRICS) {
      const value = coverage[metric];
      lines.push(
        `| ${metric} | ${value.percentage}% | ${value.threshold}% | ${value.passed ? 'Pass' : 'Below threshold'} |`
      );
    }
    if (report.belowThresholdMetrics.length > 0) {
      lines.push(
        '',
        `Metrics below threshold: ${report.belowThresholdMetrics.join(', ')}.`
      );
    }
    if (report.belowThresholdFiles.length > 0) {
      lines.push('', 'Files below threshold:');
      for (const file of report.belowThresholdFiles)
        lines.push(`- \`${file.file}\`: ${file.metrics.join(', ')}`);
    }
    if (
      report.belowThresholdMetrics.length === 0 &&
      report.belowThresholdFiles.length === 0
    )
      lines.push(
        '',
        'No global metrics or files are below the configured thresholds.'
      );
  }

  lines.push('', '## Changed-file coverage', '');
  if (report.changedFileCoverage.length > 0) {
    lines.push('| File | Statements | Branches | Functions | Lines |');
    lines.push('| --- | ---: | ---: | ---: | ---: |');
    for (const file of report.changedFileCoverage) {
      lines.push(
        `| \`${file.file}\` | ${file.metrics.statements}% | ${file.metrics.branches}% | ${file.metrics.functions}% | ${file.metrics.lines}% |`
      );
    }
    if (report.changedFileCoverageNote)
      lines.push('', report.changedFileCoverageNote);
  } else {
    lines.push(
      report.changedFileCoverageNote ??
        'No changed logic JavaScript files were available for a reliable coverage comparison.'
    );
  }

  lines.push('', '## Artifacts', '');
  lines.push(`- Full check log: \`${report.artifacts.fullCheckLog}\``);
  if (report.artifacts.coverageSummary) {
    lines.push(`- Coverage summary: \`${report.artifacts.coverageSummary}\``);
    lines.push(`- Coverage detail: \`${report.artifacts.coverageDetail}\``);
  } else {
    lines.push('- Coverage files were not produced.');
    if (report.artifacts.partialCoverage)
      lines.push(
        `- Partial shard output, if produced: \`${report.artifacts.partialCoverage}\``
      );
  }
  if (report.artifacts.testRun)
    lines.push(`- Unit test run: \`${report.artifacts.testRun}\``);
  return `${lines.join('\n')}\n`;
}

/**
 * @param {TestSummary} tests Normalized, correlated test counts.
 * @returns {string} Human-readable test counts.
 */
function formatTests(tests) {
  if (tests.suites === null)
    return 'Test and suite counts unavailable; see the full check log.';
  const passed =
    tests.passed === null ? 'unknown passed' : `${tests.passed} passed`;
  const failed =
    tests.failed === null ? 'unknown failed' : `${tests.failed} failed`;
  const progress = tests.complete
    ? 'Complete unit suite'
    : `Partial counts (${tests.completedShards ?? 0}/${tests.totalShards ?? '?'} shards completed)`;
  return `${progress}: ${tests.suites} suites; ${tests.tests} tests (${passed}, ${failed}).`;
}

/**
 * Explain absence using parsed failure categories and meaningful workflow state.
 * @param {string} workflowResult Workflow state supplied by the caller.
 * @param {FailureEvidence} failure Parsed failure evidence.
 * @returns {string} Coverage availability reason.
 */
function explainCoverageUnavailable(workflowResult, failure) {
  if (failure.kind === 'heap')
    return 'The test process exhausted its JavaScript heap before producing the complete coverage summary.';
  if (failure.kind === 'timeout')
    return 'The test or aggregate check timed out before producing the complete coverage summary.';
  if (failure.kind === 'unit-failure')
    return 'The unit test process failed before producing the complete coverage summary.';
  if (failure.kind === 'custom') return failure.message;
  if (workflowResult === 'success')
    return 'The full check completed without a readable coverage summary.';
  if (failure.running)
    return 'The aggregate process timed out or was terminated before the unit coverage run wrote its completion record.';
  if (workflowResult === 'cancelled')
    return 'The full-check workflow was cancelled before the coverage summary was produced.';
  return 'The full check failed before the coverage summary was produced; see the full check log for the failure details.';
}

/**
 * Project requested current logic paths from normalized finite file measurements.
 * @param {CoverageData | null} coverage Available normalized coverage.
 * @param {string[]} paths Current changed paths.
 * @returns {ChangedFileCoverageEntry[]} Sorted measured entries.
 */
function changedCoverageEntries(coverage, paths) {
  if (!coverage) return [];
  const files = new Map(
    coverage.files.map(entry => [entry.file, entry.metrics])
  );
  return [...new Set(paths)]
    .filter(isLogicJavaScriptPath)
    .sort()
    .flatMap(file => {
      const metrics = files.get(file);
      return metrics ? [{ file, metrics }] : [];
    });
}

/**
 * Explain changed files omitted from Istanbul coverage.
 * @param {string[]} changedPaths Changed repository paths.
 * @param {ChangedFileCoverageEntry[]} fileCoverage Reliable file coverage entries.
 * @returns {string | null} Note or null when at least one changed logic file was measured.
 */
function currentCoverageNote(changedPaths, fileCoverage) {
  const changedCoreFiles = changedPaths.filter(isLogicJavaScriptPath);
  const measuredFiles = new Set(fileCoverage.map(file => file.file));
  const missingFiles = changedCoreFiles.filter(
    file => !measuredFiles.has(file)
  );
  if (missingFiles.length > 0)
    return `Changed logic files are absent from the coverage summary: ${missingFiles.map(file => `\`${file}\``).join(', ')}.`;
  if (fileCoverage.length > 0) return null;
  if (
    changedPaths.some(file => file.startsWith('src/') && file.endsWith('.js'))
  )
    return 'Changed JavaScript files are outside the logic coverage collection (src/core, src/logic/core, src/logic/boundary), so changed-file coverage is unavailable.';
  return 'No changed logic JavaScript files were available for a reliable coverage comparison.';
}

/**
 * Keep confirmed deletions visible without calling them missing current coverage.
 * @param {string[]} changedPaths Surviving changed paths.
 * @param {ChangedFileCoverageEntry[]} fileCoverage Measured current files.
 * @param {string[]} deletedPaths Git-confirmed deleted paths.
 * @returns {string | null} Current coverage and deletion evidence.
 */
function changedCoverageNote(changedPaths, fileCoverage, deletedPaths) {
  const notes = [currentCoverageNote(changedPaths, fileCoverage)];
  const deletedLogic = [...new Set(deletedPaths)]
    .filter(isLogicJavaScriptPath)
    .sort();
  if (deletedLogic.length > 0)
    notes.push(
      `Deleted logic files have no current source to measure: ${deletedLogic.map(file => `\`${file}\``).join(', ')}.`
    );
  return notes.filter(Boolean).join('\n\n') || null;
}
