import base from '../../stryker.config.mjs';
import os from 'node:os';
import path from 'node:path';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: ['src/core/cloud/billing/refund-request-core.js'],
  ignorePatterns: [
    '**',
    '!src/core/cloud/billing/refund-request-core.js',
    '!src/core/cloud/billing/authentication-core.js',
    '!src/core/local/logic-source-paths.js',
    '!test/core/cloud/billing/refund-request-core.test.js',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: {
      testMatch: [
        '<rootDir>/test/core/cloud/billing/refund-request-core.test.js',
      ],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/refund-request.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: path.join(os.tmpdir(), 'dadeto-refund-request-stryker'),
};
