/**
 * Inputs for the pre-migration report's externally visible JSON/Markdown contract.
 * No deletion metadata is supplied: new behavior has separate explicit fixtures.
 * @returns {Array<{name: string, input: object}>} Compatibility cases.
 */
export function reportContractCases() {
  const metrics = ['statements', 'branches', 'functions', 'lines'];
  const percentages = value =>
    Object.fromEntries(metrics.map(metric => [metric, { pct: value }]));
  const changed = [
    'src/core/a.js',
    'src/logic/core/b.js',
    'src/logic/boundary/c.js',
  ];
  const summaries = [
    null,
    { total: percentages(100) },
    { total: percentages(NaN) },
  ];
  for (const percentage of [0, 99, 100, 101]) {
    const summary = { total: percentages(percentage) };
    for (const [index, file] of changed.entries())
      summary[file] = percentages(percentage - index);
    summaries.push(summary);
  }
  const counts = [
    null,
    {},
    { status: 'running' },
    { status: 'failed', failureReason: 'runner failed' },
    { testSuites: 3, tests: 8, passed: 7, failed: 1 },
    { testSuites: 0, tests: 0, passed: 0, failed: 0 },
    { testSuites: NaN, tests: Infinity, passed: -Infinity, failed: null },
    { testSuites: 4, tests: 11, completedShards: 2, totalShards: 3 },
    { testSuites: 4, tests: 11, completedShards: 3, totalShards: 3 },
  ];
  const cases = [];
  for (const [summaryIndex, coverageSummary] of summaries.entries()) {
    for (const [countIndex, coverageRun] of counts.entries()) {
      cases.push({
        name: `summary-${summaryIndex}-counts-${countIndex}`,
        input: {
          commitSha: 'fixture-commit',
          workflowResult: 'success',
          coverageSummary,
          coverageRun,
          changedPaths: [
            ...changed,
            changed[0],
            'src/local/adapter.js',
            'test/a.test.js',
          ],
        },
      });
    }
  }
  for (const workflowResult of ['unknown', 'success', 'failure', 'cancelled']) {
    for (const failureLog of [
      '',
      'JAVASCRIPT HEAP out of memory',
      'heap limit',
      'allocation failed',
      'timed out',
      'TIMEOUT',
      'SIGTERM',
      'Test suites: 1 failed',
      'Tests: 1 failed',
      'coverage shard failed',
      'unclassified failure',
    ]) {
      cases.push({
        name: `${workflowResult}-${failureLog}`,
        input: { workflowResult, failureLog },
      });
    }
  }
  for (const metric of metrics) {
    const summary = percentages(100);
    summary[metric] = { pct: 97 };
    cases.push({
      name: `metric-${metric}`,
      input: {
        coverageSummary: { total: summary, [changed[0]]: summary },
        changedPaths: [changed[0]],
        coverageThresholds: {
          statements: 98,
          branches: 99,
          functions: 96,
          lines: 100,
        },
      },
    });
  }
  for (const changedPaths of [
    [],
    ['README.md'],
    ['src/local/adapter.js'],
    [changed[0]],
    [changed[1]],
    [changed[2]],
  ]) {
    cases.push({
      name: `paths-${changedPaths.join(',')}`,
      input: {
        coverageSummary: {
          total: percentages(100),
          [changed[0]]: percentages(100),
        },
        changedPaths,
      },
    });
  }
  return cases;
}

/**
 * Observe the public report and exact rendered Markdown together.
 * @param {object} implementation Report exports supplied independently.
 * @param {(input: object) => object} implementation.createCheckFullReport Report builder.
 * @param {(report: object) => string} implementation.renderCheckFullReportMarkdown Renderer.
 * @param {object} input Workflow evidence.
 * @returns {object} Public contract outcome.
 */
export function observeReportContract(implementation, input) {
  const report = implementation.createCheckFullReport(input);
  return {
    report,
    markdown: implementation.renderCheckFullReportMarkdown(report),
  };
}
