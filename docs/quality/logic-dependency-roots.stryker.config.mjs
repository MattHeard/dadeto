import base from '../../stryker.config.mjs';

// Focused changed-line evidence; the global mutation configuration is unchanged.
export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: [
    'src/core/scripts/check-depcruise.js:78-85',
    'src/core/scripts/check-depcruise.js:210-212',
    'src/core/scripts/check-depcruise.js:524-530',
  ],
  ignorePatterns: [
    '**',
    '!src/core/**',
    '!src/local/check-depcruise-scope.js',
    '!test/core/scripts/check-depcruise.test.js',
    '!test/scripts/logic-dependency-roots.test.js',
    '!dependency-cruiser.config.cjs',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: {
      testMatch: [
        '<rootDir>/test/core/scripts/check-depcruise.test.js',
        '<rootDir>/test/scripts/logic-dependency-roots.test.js',
      ],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/logic-dependency-roots.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: '.tmp/logic-dependency-roots-stryker',
};
