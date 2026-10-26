import base from '../../../stryker.config.mjs';

export default {
  ...base,
  mutate: ['src/core/browser/game/agricultural-rover/agricultural-rover.js'],
  // Generated build output is unnecessary for these model tests.
  ignorePatterns: ['/public', '/.tmp'],
  maxTestRunnerReuse: 10,
  concurrency: 1,
  reporters: ['json', 'progress'],
  jsonReporter: { fileName: 'reports/mutation/agricultural-rover.json' },
};
