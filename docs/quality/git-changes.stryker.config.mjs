import base from '../../stryker.config.mjs';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: ['src/logic/boundary/local/git-changes.js'],
  ignorePatterns: [
    '**',
    '!src/logic/boundary/local/git-changes.js',
    '!src/logic/core/local/logic-source-paths.js',
    '!test/logic/boundary/local/git-changes.test.js',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: { testMatch: ['<rootDir>/test/logic/boundary/local/git-changes.test.js'] },
  },
  maxTestRunnerReuse: 10,
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/git-changes.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: '.tmp/git-changes-stryker',
};
