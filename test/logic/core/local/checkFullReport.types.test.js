import { expect, test } from '@jest/globals';
import path from 'node:path';
import ts from 'typescript';

const imports = `
import { createCheckFullReport, createCheckCoverageReport, mapCoverageMetrics } from '../../src/logic/core/local/checkFullReport.js';
import type { TestSummary, CoverageState, ReportEvidence, MetricValues } from '../../src/logic/core/local/checkFullReport.js';
import { parseCheckFullReportEvidence } from '../../src/logic/boundary/local/checkFullReport.js';
`;

/**
 * Compile real imported JSDoc contracts against one virtual caller.
 * @param {string} source Caller source.
 * @returns {string[]} Actual compiler diagnostics.
 */
function diagnostics(source) {
  const filename = path.resolve('test/fixtures/report-contract.ts');
  const options = {
    allowJs: true,
    checkJs: true,
    noEmit: true,
    strictNullChecks: true,
    noImplicitAny: true,
    skipLibCheck: true,
    types: [],
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (file, language, ...rest) =>
    file === filename
      ? ts.createSourceFile(
          file,
          imports + source,
          language,
          true,
          ts.ScriptKind.TS
        )
      : getSourceFile(file, language, ...rest);
  const program = ts.createProgram([filename], options, host);
  return ts
    .getPreEmitDiagnostics(program)
    .map(value => ts.flattenDiagnosticMessageText(value.messageText, '\n'));
}

test('the actual boundary result composes with the required trusted APIs without casts', () => {
  expect(
    diagnostics(`
const parsed = parseCheckFullReportEvidence({coverageRunText: '', coverageSummaryText: '', failureLog: ''});
if (!parsed.ok) throw parsed.error;
const coverage = createCheckCoverageReport(parsed.evidence.coverage, mapCoverageMetrics(() => 100), [], []);
const report = createCheckFullReport({commitSha: 'commit', workflowResult: 'success'}, parsed.evidence, coverage);
if (report.coverageAvailable) report.coverage.lines.percentage.toFixed(2);
if (report.tests.suites !== null) report.tests.tests.toFixed(0);
`)
  ).toEqual([]);
});

test.each([
  ['required normalized evidence', 'createCheckFullReport();'],
  [
    'correlated unknown counts',
    'const counts: TestSummary = {suites: null, tests: 3, passed: null, failed: null, complete: false, completedShards: null, totalShards: null};',
  ],
  [
    'coverage availability',
    'const coverage: CoverageState = {coverageAvailable: true, coverage: null};',
  ],
  [
    'required failure evidence',
    'const evidence: ReportEvidence = {tests: {suites: null, tests: null, passed: null, failed: null, complete: false, completedShards: null, totalShards: null}, runPresent: false, coverage: null, failure: null};',
  ],
  [
    'all four numeric thresholds',
    'const thresholds: MetricValues = {statements: 100, branches: 100, functions: 100};',
  ],
  [
    'numeric schema projection',
    'const thresholds: MetricValues = mapCoverageMetrics(() => "100");',
  ],
])('rejects a caller violating %s', (_name, source) => {
  expect(diagnostics(source).length).toBeGreaterThan(0);
});
