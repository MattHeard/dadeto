import base from '../../stryker.config.mjs';
import os from 'node:os';
import path from 'node:path';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: ['src/core/local/gcp-simulator/playwright-runner.js'],
  ignorePatterns: [
    '**',
    '!src/core/**',
    '!src/cloud/allow-effects.js',
    '!vendor/deepmerge/**',
    '!test/core/local/gcp-simulator/playwright-runner.test.js',
    '!test/core/local/gcp-simulator/playwright-runner.injection.test.js',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: {
      testMatch: [
        '<rootDir>/test/core/local/gcp-simulator/playwright-runner.test.js',
        '<rootDir>/test/core/local/gcp-simulator/playwright-runner.injection.test.js',
      ],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/playwright-runner.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: path.join(os.tmpdir(), 'dadeto-playwright-runner-stryker'),
};
