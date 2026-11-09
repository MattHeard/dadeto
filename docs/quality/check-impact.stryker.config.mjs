import combined from './git-deletion-evidence.stryker.config.mjs';

// A complete-module diagnostic; final combined acceptance remains required.
export default {
  ...combined,
  mutate: [
    'src/logic/boundary/local/evidence-result.js',
    'src/logic/boundary/local/missed-coverage.js',
    'src/logic/core/local/coverage-records.js',
    'src/logic/core/local/impact-commands.js',
    'src/logic/boundary/local/impact-arguments.js',
    'src/core/local/checkImpactPlan.js',
    'src/logic/boundary/local/coverage-line.js',
    'src/logic/boundary/local/impact-paths.js',
  ],
  maxTestRunnerReuse: 10,
  jsonReporter: { fileName: 'reports/mutation/check-impact.json' },
  tempDirName: '.tmp/check-impact-stryker',
};
