/**
 * Raw JSON categories observed at the actual file boundary before migration.
 * @returns {Array<{name: string, coverageRunText: string, coverageSummaryText: string, workflowResult: string, failureLog: string}>} Cases.
 */
export function reportJsonContractCases() {
  const metrics = pct =>
    Object.fromEntries(
      ['statements', 'branches', 'functions', 'lines'].map(key => [
        key,
        { pct },
      ])
    );
  const runners = [
    '',
    '{',
    'null',
    'false',
    'true',
    '0',
    '7',
    '""',
    '"text"',
    '[]',
    '{}',
    '1e400',
    '{"testSuites":2,"tests":3}',
    '{"testSuites":0,"tests":0,"completedShards":0,"totalShards":0}',
    '{"testSuites":2,"tests":1e400}',
    '{"testSuites":"2","tests":3}',
    '{"status":"running"}',
    ...[
      'heap limit',
      'timeout',
      'Test suite: 1 failed',
      'Test: 2 failed',
      'test',
      0,
      false,
      true,
      [1, null],
      { value: 1 },
      { toString: 17 },
    ].map(failureReason => JSON.stringify({ failureReason })),
  ];
  const summaries = [
    '',
    '{',
    'null',
    'false',
    '1e400',
    '"text"',
    '[]',
    '{}',
    '{"total":{"statements":{"pct":null}}}',
    '{"total":{"statements":{"pct":100}}}',
    JSON.stringify({ total: metrics(100) }),
    JSON.stringify({
      total: metrics(100),
      'src/core/a.js': metrics(98),
      'src/logic/core/z.js': metrics(100),
      'src/local/glue.js': metrics(99),
    }),
    JSON.stringify({ total: metrics(100), bad: {} }),
    JSON.stringify({
      total: metrics(100),
      nullish: null,
      invalid: metrics(null),
    }),
  ];
  const cases = [];
  for (const [runIndex, coverageRunText] of runners.entries())
    for (const [summaryIndex, coverageSummaryText] of summaries.entries())
      for (const workflowResult of ['failure', 'success'])
        cases.push({
          name: `run-${runIndex}-summary-${summaryIndex}-${workflowResult}`,
          coverageRunText,
          coverageSummaryText,
          workflowResult,
          failureLog: runIndex % 2 ? ' failed' : '',
        });
  return cases;
}

/**
 * Capture complete public JSON/Markdown or the outward failure class/message.
 * @param {(input: object) => object} build Actual pipeline under observation.
 * @param {(report: object) => string} render Actual renderer.
 * @param {object} input Raw evidence.
 * @returns {object} Externally visible outcome.
 */
export function observeReportJson(build, render, input) {
  try {
    const report = build(input);
    return { report, markdown: render(report) };
  } catch (error) {
    return { error: { name: error.name, message: error.message } };
  }
}
