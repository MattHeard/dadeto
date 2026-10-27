import base from '../../stryker.config.mjs';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: ['src/core/local/logic-source-paths.js'],
  ignorePatterns: [
    '**',
    '!src/core/local/logic-source-paths.js',
    '!test/core/local/logic-source-paths.test.js',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: {
      testMatch: ['<rootDir>/test/core/local/logic-source-paths.test.js'],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/logic-source-paths.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: '.tmp/logic-source-paths-stryker',
};
