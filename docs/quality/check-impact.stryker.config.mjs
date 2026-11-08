import combined from './git-deletion-evidence.stryker.config.mjs';

// A complete-module diagnostic; final combined acceptance remains required.
export default {
  ...combined,
  mutate: ['src/core/local/checkImpactPlan.js'],
  maxTestRunnerReuse: 10,
  jsonReporter: { fileName: 'reports/mutation/check-impact.json' },
  tempDirName: '.tmp/check-impact-stryker',
};
