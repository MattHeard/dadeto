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
      /outside the src\/core coverage/
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
});
