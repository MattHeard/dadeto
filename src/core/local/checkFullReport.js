import { isLogicJavaScriptPath } from './logic-source-paths.js';

const COVERAGE_METRICS = /** @type {const} */ ([
  'statements',
  'branches',
  'functions',
  'lines',
]);

/** @typedef {{pct: number, covered: number, total: number, skipped: number}} CoverageMetricSummary */
/** @typedef {{statements: CoverageMetricSummary, branches: CoverageMetricSummary, functions: CoverageMetricSummary, lines: CoverageMetricSummary}} CoverageFileSummary */
/** @typedef {Record<string, CoverageFileSummary> & {total: CoverageFileSummary}} CoverageSummary */
/** @typedef {{testSuites?: number | null, tests?: number | null, passed?: number | null, failed?: number | null, completedShards?: number | null, totalShards?: number | null, failureReason?: string | null, status?: string}} CoverageRunMetadata */
/** @typedef {{suites: number | null, tests: number | null, passed: number | null, failed: number | null, complete: boolean, completedShards: number | null, totalShards: number | null}} TestSummary */
/** @typedef {{file: string, metrics: string[]}} BelowThresholdFile */
/** @typedef {{file: string, metrics: Record<string, number>}} ChangedFileCoverageEntry */
/** @typedef {{commitSha: string, workflowResult: string, tests: TestSummary, coverageAvailable: boolean, coverage: Record<string, {percentage: number, threshold: number, passed: boolean}> | null, thresholds: Record<string, number>, belowThresholdMetrics: string[], belowThresholdFiles: BelowThresholdFile[], changedFileCoverage: ChangedFileCoverageEntry[], changedFileCoverageNote: string | null, coverageUnavailableReason: string | null, artifacts: {coverageSummary: string | null, coverageDetail: string | null, partialCoverage: string | null, testRun: string | null, fullCheckLog: string}}} CheckFullReport */

/**
 * Build a truthful report for the authoritative full-check workflow.
 * @param {{ commitSha?: string, workflowResult?: string, coverageRun?: CoverageRunMetadata | null, coverageSummary?: CoverageSummary | null, changedPaths?: string[], failureLog?: string, coverageThresholds?: Record<string, number> }} input Workflow evidence.
 * @returns {CheckFullReport} Report data for JSON, Markdown, and the Actions summary.
 */
export function createCheckFullReport({
  commitSha = '',
  workflowResult = 'unknown',
  coverageRun = null,
  coverageSummary = null,
  changedPaths = [],
  failureLog = '',
  coverageThresholds = {
    statements: 100,
    branches: 100,
    functions: 100,
    lines: 100,
  },
} = {}) {
  const coverageData = isCoverageSummary(coverageSummary)
    ? coverageSummary
    : null;
  const metrics = coverageData
    ? Object.fromEntries(
        COVERAGE_METRICS.map(metric => [
          metric,
          {
            percentage: coverageData.total[metric].pct,
            threshold: coverageThresholds[metric],
            passed:
              coverageData.total[metric].pct >= coverageThresholds[metric],
          },
        ])
      )
    : null;
  const belowThresholdMetrics = metrics
    ? Object.entries(metrics)
        .filter(([, value]) => !value.passed)
        .map(([metric]) => metric)
    : [];
  const belowThresholdFiles = coverageData
    ? Object.entries(coverageData)
        .filter(([file, summary]) => file !== 'total' && isSummary(summary))
        .map(([file, summary]) => ({
          file,
          metrics: COVERAGE_METRICS.filter(
            metric => summary[metric].pct < coverageThresholds[metric]
          ),
        }))
        .filter(entry => entry.metrics.length > 0)
    : [];
  const changedFileCoverage = coverageData
    ? [...new Set(changedPaths)]
        .filter(isLogicJavaScriptPath)
        .filter(file => isSummary(coverageData[file]))
        .sort()
        .map(file => ({
          file,
          metrics: Object.fromEntries(
            COVERAGE_METRICS.map(metric => [
              metric,
              coverageData[file][metric].pct,
            ])
          ),
        }))
    : [];

  const report = {
    commitSha,
    workflowResult,
    tests: summarizeTests(coverageRun),
    coverageAvailable: coverageData !== null,
    coverage: metrics,
    thresholds: coverageThresholds,
    belowThresholdMetrics,
    belowThresholdFiles,
    changedFileCoverage,
    changedFileCoverageNote: changedCoverageNote(
      changedPaths,
      changedFileCoverage
    ),
    coverageUnavailableReason: coverageData
      ? null
      : explainCoverageUnavailable({ workflowResult, coverageRun, failureLog }),
    artifacts: {
      coverageSummary: coverageData
        ? 'reports/coverage/coverage-summary.json'
        : null,
      coverageDetail: coverageData
        ? 'reports/coverage/coverage-final.json'
        : null,
      partialCoverage:
        !coverageData && coverageRun ? 'reports/coverage/work/' : null,
      testRun: coverageRun ? 'reports/coverage/full-test-run.json' : null,
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
    const coverage = /** @type {NonNullable<CheckFullReport['coverage']>} */ (
      report.coverage
    );
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
 * @param {CoverageFileSummary | null | undefined} summary Coverage entry.
 * @returns {summary is CoverageFileSummary} True when all configured metrics have percentages.
 */
function isSummary(summary) {
  return (
    summary !== null && summary !== undefined && hasMetricPercentages(summary)
  );
}

/**
 * Check whether the summary includes every global coverage metric.
 * @param {CoverageSummary | null} summary Candidate coverage summary.
 * @returns {summary is CoverageSummary} True when complete coverage data exists.
 */
function isCoverageSummary(summary) {
  return summary !== null && hasMetricPercentages(summary.total);
}

/**
 * Check whether all coverage metrics have finite percentages.
 * @param {CoverageFileSummary} summary Candidate coverage entry.
 * @returns {boolean} True when every required percentage is available.
 */
function hasMetricPercentages(summary) {
  return COVERAGE_METRICS.every(metric => Number.isFinite(summary[metric].pct));
}

/**
 * Summarize partial or complete Jest shard counts.
 * @param {CoverageRunMetadata | null} run Coverage runner metadata.
 * @returns {TestSummary} Test counts.
 */
function summarizeTests(run) {
  if (!run || !Number.isFinite(run.testSuites) || !Number.isFinite(run.tests))
    return {
      suites: null,
      tests: null,
      passed: null,
      failed: null,
      complete: false,
      completedShards: null,
      totalShards: null,
    };
  return {
    suites: /** @type {number} */ (run.testSuites),
    tests: /** @type {number} */ (run.tests),
    passed: Number.isFinite(run.passed)
      ? /** @type {number} */ (run.passed)
      : null,
    failed: Number.isFinite(run.failed)
      ? /** @type {number} */ (run.failed)
      : null,
    complete:
      Number.isFinite(run.totalShards) &&
      run.completedShards === run.totalShards,
    completedShards: Number.isFinite(run.completedShards)
      ? /** @type {number} */ (run.completedShards)
      : null,
    totalShards: Number.isFinite(run.totalShards)
      ? /** @type {number} */ (run.totalShards)
      : null,
  };
}

/**
 * @param {{ suites: number | null, tests: number | null, passed: number | null, failed: number | null, complete: boolean, completedShards: number | null, totalShards: number | null }} tests Test counts.
 * @returns {string} Human-readable test counts.
 */
function formatTests(tests) {
  if (tests.suites === null || tests.tests === null)
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
 * Explain missing coverage without turning it into a zero or a pass.
 * @param {{ workflowResult: string, coverageRun: CoverageRunMetadata | null, failureLog: string }} input Failure evidence.
 * @returns {string} Coverage availability reason.
 */
function explainCoverageUnavailable({
  workflowResult,
  coverageRun,
  failureLog,
}) {
  const evidence =
    `${coverageRun?.failureReason ?? ''}\n${failureLog}`.toLowerCase();
  if (
    /heap out of memory|javascript heap|heap limit|allocation failed/.test(
      evidence
    )
  )
    return 'The test process exhausted its JavaScript heap before producing the complete coverage summary.';
  if (/timed out|timeout|sigterm/.test(evidence))
    return 'The test or aggregate check timed out before producing the complete coverage summary.';
  if (
    /test suites?:.*failed|tests?:.*failed|coverage shard failed/.test(evidence)
  )
    return 'The unit test process failed before producing the complete coverage summary.';
  if (coverageRun?.failureReason) return String(coverageRun.failureReason);
  if (workflowResult === 'success')
    return 'The full check completed without a readable coverage summary.';
  if (coverageRun?.status === 'running')
    return 'The aggregate process timed out or was terminated before the unit coverage run wrote its completion record.';
  if (workflowResult === 'cancelled')
    return 'The full-check workflow was cancelled before the coverage summary was produced.';
  return 'The full check failed before the coverage summary was produced; see the full check log for the failure details.';
}

/**
 * Explain changed files omitted from Istanbul coverage.
 * @param {string[]} changedPaths Changed repository paths.
 * @param {ChangedFileCoverageEntry[]} fileCoverage Reliable file coverage entries.
 * @returns {string | null} Note or null when at least one changed logic file was measured.
 */
function changedCoverageNote(changedPaths, fileCoverage) {
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
