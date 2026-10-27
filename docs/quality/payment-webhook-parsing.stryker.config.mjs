import base from '../../stryker.config.mjs';
import os from 'node:os';
import path from 'node:path';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: ['src/core/cloud/payment-webhook/parsing.js'],
  ignorePatterns: [
    '**',
    '!src/core/**',
    '!test/core/cloud/payment-webhook/parsing.test.js',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: {
      testMatch: ['<rootDir>/test/core/cloud/payment-webhook/parsing.test.js'],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/payment-webhook-parsing.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: path.join(os.tmpdir(), 'dadeto-payment-webhook-parsing-stryker'),
};
