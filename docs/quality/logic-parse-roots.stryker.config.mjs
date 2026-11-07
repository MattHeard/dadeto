import base from '../../stryker.config.mjs';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: [
    'src/core/scripts/check-core-parse.js',
    'src/core/scripts/classification-signals.js',
  ],
  ignorePatterns: [
    '**',
    '!src/core/**',
    '!classify-functions.js',
    '!test/scripts/check-core-parse*.test.js',
    '!test/scripts/classification-signals.test.js',
    '!test/classify-functions.test.js',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  maxTestRunnerReuse: 10,
  jest: {
    ...base.jest,
    config: {
      testMatch: [
        '<rootDir>/test/scripts/check-core-parse*.test.js',
        '<rootDir>/test/scripts/classification-signals.test.js',
        '<rootDir>/test/classify-functions.test.js',
      ],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/logic-parse-roots.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: '/tmp/dadeto-logic-parse-roots-stryker',
};
