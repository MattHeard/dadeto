import base from '../../stryker.config.mjs';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: [
    'src/core/local/non-core-thin/status.js',
    'src/core/build/entrypoint-pattern.js',
  ],
  ignorePatterns: [
    '**',
    '!src/**',
    '!test/core/local/non-core-thin/**',
    '!test/fixtures/logic-thin-legacy-cases.js',
    '!test/core/entrypoint-pattern.test.js',
    '!non-core-thin-exemptions.json',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  maxTestRunnerReuse: 10,
  jest: {
    ...base.jest,
    config: {
      testMatch: [
        '<rootDir>/test/core/local/non-core-thin/*.test.js',
        '<rootDir>/test/core/entrypoint-pattern.test.js',
      ],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/logic-thin-roots.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: '/tmp/dadeto-logic-thin-roots-stryker',
};
