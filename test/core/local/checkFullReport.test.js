import {
  createCheckFullReport,
  renderCheckFullReportMarkdown,
} from '../../../src/core/local/checkFullReport.js';

const completeMetrics = {
  statements: { pct: 100 },
  branches: { pct: 100 },
  functions: { pct: 100 },
  lines: { pct: 100 },
};

describe('createCheckFullReport', () => {
  it('uses unavailable defaults when the workflow supplied no evidence', () => {
    const report = createCheckFullReport();

    expect(report).toMatchObject({
      commitSha: '',
      workflowResult: 'unknown',
      tests: {
        suites: null,
        tests: null,
        passed: null,
        failed: null,
        complete: false,
        completedShards: null,
        totalShards: null,
      },
      coverageAvailable: false,
      coverage: null,
      changedFileCoverage: [],
      changedFileCoverageNote:
        'No changed logic JavaScript files were available for a reliable coverage comparison.',
      coverageUnavailableReason:
        'The full check failed before the coverage summary was produced; see the full check log for the failure details.',
      artifacts: {
        coverageSummary: null,
        coverageDetail: null,
        partialCoverage: null,
        testRun: null,
        fullCheckLog: 'reports/check-full.log',
      },
    });

    const markdown = renderCheckFullReportMarkdown(report);
    expect(markdown).toContain('Commit: `unavailable`');
    expect(markdown).toContain(
      'Test and suite counts unavailable; see the full check log.'
    );
    expect(markdown).toContain('Coverage unavailable: The full check failed');
    expect(markdown).toContain('- Coverage files were not produced.');
  });

  it('reports complete coverage, counts, thresholds, and changed-file coverage', () => {
    const report = createCheckFullReport({
      commitSha: 'abc123',
      workflowResult: 'success',
      coverageRun: {
        testSuites: 12,
        tests: 85,
        passed: 85,
        failed: 0,
      },
      coverageSummary: {
        total: completeMetrics,
        'src/core/local/example.js': completeMetrics,
      },
      changedPaths: ['src/core/local/example.js'],
    });

    expect(report).toMatchObject({
      commitSha: 'abc123',
      workflowResult: 'success',
      tests: { suites: 12, tests: 85, passed: 85, failed: 0 },
      coverageAvailable: true,
      coverage: {
        branches: { percentage: 100, threshold: 100, passed: true },
        lines: { percentage: 100, threshold: 100, passed: true },
      },
      changedFileCoverage: [
        {
          file: 'src/core/local/example.js',
          metrics: {
            statements: 100,
            branches: 100,
            functions: 100,
            lines: 100,
          },
        },
      ],
      coverageUnavailableReason: null,
    });
    expect(renderCheckFullReportMarkdown(report)).toContain(
      '| branches | 100% | 100% | Pass |'
    );
  });

  it('does not turn missing coverage after heap exhaustion into zero coverage', () => {
    const report = createCheckFullReport({
      workflowResult: 'failure',
      coverageRun: {
        status: 'failed',
        testSuites: 4,
        tests: 22,
        passed: 21,
        failed: 1,
        failureReason: 'Coverage shard exhausted the JavaScript heap.',
      },
      failureLog: 'FATAL ERROR: Reached heap limit Allocation failed',
    });

    expect(report.coverageAvailable).toBe(false);
    expect(report.coverage).toBeNull();
    expect(report.coverageUnavailableReason).toMatch(/heap/i);
    expect(renderCheckFullReportMarkdown(report)).toContain(
      'Coverage unavailable: The test process exhausted its JavaScript heap'
    );
    expect(renderCheckFullReportMarkdown(report)).not.toContain(
      '| branches | 0%'
    );
  });

  it('reports a failed test and changed files outside the coverage boundary', () => {
    const report = createCheckFullReport({
      workflowResult: 'failure',
      coverageRun: {
        status: 'failed',
        failureReason: 'Unit test shard failed.',
      },
      coverageSummary: {
        total: completeMetrics,
      },
      changedPaths: ['src/local/run-check-impact.js'],
      failureLog: 'Test Suites: 1 failed, 2 passed, 3 total',
    });

    expect(report.coverageAvailable).toBe(true);
    expect(report.changedFileCoverage).toEqual([]);
    expect(report.changedFileCoverageNote).toMatch(
      /outside the logic coverage/
    );
  });

  it('lists global metrics and files below their configured thresholds', () => {
    const report = createCheckFullReport({
      workflowResult: 'failure',
      coverageSummary: {
        total: {
          ...completeMetrics,
          branches: { pct: 99 },
        },
        'src/core/uncovered.js': {
          ...completeMetrics,
          lines: { pct: 50 },
        },
      },
    });

    expect(report.belowThresholdMetrics).toEqual(['branches']);
    expect(report.belowThresholdFiles).toEqual([
      { file: 'src/core/uncovered.js', metrics: ['lines'] },
    ]);
  });

  it('renders below-threshold details and changed-file omissions', () => {
    const report = createCheckFullReport({
      workflowResult: 'failure',
      coverageRun: {
        testSuites: 1,
        tests: 2,
        completedShards: 1,
        totalShards: 2,
      },
      coverageSummary: {
        total: {
          ...completeMetrics,
          branches: { pct: 99 },
        },
        'src/core/measured.js': {
          ...completeMetrics,
          lines: { pct: 50 },
        },
      },
      changedPaths: ['src/core/missing.js', 'src/core/measured.js'],
    });

    expect(report).toMatchObject({
      tests: {
        suites: 1,
        tests: 2,
        passed: null,
        failed: null,
        complete: false,
        completedShards: 1,
        totalShards: 2,
      },
      belowThresholdMetrics: ['branches'],
      belowThresholdFiles: [
        { file: 'src/core/measured.js', metrics: ['lines'] },
      ],
      changedFileCoverage: [
        {
          file: 'src/core/measured.js',
          metrics: {
            statements: 100,
            branches: 100,
            functions: 100,
            lines: 50,
          },
        },
      ],
      changedFileCoverageNote:
        'Changed logic files are absent from the coverage summary: `src/core/missing.js`.',
    });

    const markdown = renderCheckFullReportMarkdown(report);
    expect(markdown).toContain('Below threshold');
    expect(markdown).toContain('Metrics below threshold: branches.');
    expect(markdown).toContain('Files below threshold:');
    expect(markdown).toContain('`src/core/measured.js`: lines');
    expect(markdown).toContain('Partial counts (1/2 shards completed)');
    expect(markdown).toContain('unknown passed');
    expect(markdown).toContain('unknown failed');
    expect(markdown).toContain('Changed logic files are absent');
  });

  it('renders completed test counts and all coverage-unavailable explanations', () => {
    const complete = createCheckFullReport({
      workflowResult: 'success',
      coverageRun: {
        testSuites: 2,
        tests: 9,
        passed: 9,
        failed: 0,
        completedShards: 2,
        totalShards: 2,
      },
      coverageSummary: { total: completeMetrics },
    });
    expect(renderCheckFullReportMarkdown(complete)).toContain(
      'Complete unit suite: 2 suites; 9 tests (9 passed, 0 failed).'
    );

    const explanations = [
      [
        { workflowResult: 'failure', failureLog: 'The check timed out.' },
        'timed out before producing',
      ],
      [
        {
          workflowResult: 'failure',
          failureLog: 'Test Suites: 1 failed, 0 passed, 1 total',
        },
        'unit test process failed',
      ],
      [
        {
          workflowResult: 'failure',
          coverageRun: { failureReason: 'The report parser was unavailable.' },
        },
        'The report parser was unavailable.',
      ],
      [
        { workflowResult: 'success' },
        'completed without a readable coverage summary',
      ],
      [
        { workflowResult: 'failure', coverageRun: { status: 'running' } },
        'aggregate process timed out or was terminated',
      ],
      [{ workflowResult: 'cancelled' }, 'workflow was cancelled'],
      [
        { workflowResult: 'failure' },
        'failed before the coverage summary was produced',
      ],
    ];

    for (const [input, expected] of explanations) {
      expect(createCheckFullReport(input).coverageUnavailableReason).toContain(
        expected
      );
    }
  });

  it('uses the markdown fallback when a report omits its changed-file note', () => {
    const report = createCheckFullReport();
    report.changedFileCoverageNote = null;

    expect(renderCheckFullReportMarkdown(report)).toContain(
      'No changed logic JavaScript files were available for a reliable coverage comparison.'
    );
  });
});

describe('logic migration changed-file coverage', () => {
  it.each(['src/core/', 'src/logic/core/', 'src/logic/boundary/'])(
    'reports measured and missing JavaScript under %s',
    root => {
      const measured = `${root}measured.js`,
        missing = `${root}missing.js`;
      const report = createCheckFullReport({
        coverageSummary: {
          total: completeMetrics,
          [measured]: completeMetrics,
        },
        changedPaths: [measured, missing, measured],
      });
      expect(report.changedFileCoverage.map(entry => entry.file)).toEqual([
        measured,
      ]);
      expect(report.changedFileCoverageNote).toContain(
        `absent from the coverage summary: \`${missing}\``
      );
    }
  );
  it.each(['src/coreish/', 'src/logic/coreish/', 'src/logic/boundaryish/'])(
    'does not claim coverage for lookalike %s',
    root => {
      const file = `${root}example.js`;
      const report = createCheckFullReport({
        coverageSummary: { total: completeMetrics, [file]: completeMetrics },
        changedPaths: [file],
      });
      expect(report.changedFileCoverage).toEqual([]);
      expect(report.changedFileCoverageNote).toContain('outside the');
    }
  );
});
