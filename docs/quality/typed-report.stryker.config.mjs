import base from '../../stryker.config.mjs';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: ['src/logic/core/local/checkFullReport.js', 'src/logic/boundary/local/checkFullReport.js'],
  ignorePatterns: [
    '**', '!src/core/**', '!src/logic/core/**', '!src/logic/boundary/**',
    '!test/core/local/checkFullReport.test.js',
    '!test/logic/boundary/local/checkFullReport*.test.js',
    '!test/scripts/typed-logic-legacy-contract.test.js',
    '!test/fixtures/typed-logic/**',
    '!jest.config.mjs', '!jest.mutation.config.mjs', '!package.json',
  ],
  jest: {
    ...base.jest,
    config: { testMatch: ['<rootDir>/test/core/local/checkFullReport.test.js', '<rootDir>/test/logic/boundary/local/checkFullReport*.test.js', '<rootDir>/test/scripts/typed-logic-legacy-contract.test.js'] },
  },
  maxTestRunnerReuse: 10,
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/typed-report.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: '.tmp/typed-report-stryker',
};
