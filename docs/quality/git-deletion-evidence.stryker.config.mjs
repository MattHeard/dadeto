import base from '../../stryker.config.mjs';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: [
    'src/logic/boundary/local/git-changes.js',
    'src/core/local/checkImpactPlan.js',
    'src/logic/core/local/checkFullReport.js',
    'src/logic/boundary/local/checkFullReport.js',
  ],
  ignorePatterns: [
    '**',
    '!src/core/**',
    '!src/logic/core/**',
    '!src/logic/boundary/**',
    '!test/logic/boundary/local/git-changes.test.js',
    '!test/core/local/checkImpactPlan.test.js',
    '!test/core/local/checkFullReport.test.js',
    '!test/scripts/plan-check-impact.test.js',
    '!test/scripts/typed-logic-legacy-contract.test.js',
    '!test/fixtures/typed-logic/**',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: {
      testMatch: [
        '<rootDir>/test/logic/boundary/local/git-changes.test.js',
        '<rootDir>/test/core/local/checkImpactPlan.test.js',
        '<rootDir>/test/core/local/checkFullReport.test.js',
        '<rootDir>/test/scripts/plan-check-impact.test.js',
        '<rootDir>/test/scripts/typed-logic-legacy-contract.test.js',
      ],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/git-deletion-evidence.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: '.tmp/git-deletion-evidence-stryker',
};
