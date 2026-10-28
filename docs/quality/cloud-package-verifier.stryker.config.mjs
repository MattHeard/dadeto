import base from '../../stryker.config.mjs';
import os from 'node:os';
import path from 'node:path';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: ['src/core/local/cloud-function-package-closure.js'],
  ignorePatterns: [
    '**',
    '!src/core/**',
    '!src/local/verify-cloud-function-packages.js',
    '!src/local/allow-effects.js',
    '!vendor/deepmerge/**',
    '!test/core/local/cloudFunctionPackageClosure*.test.js',
    '!test/local/verifyCloudFunctionPackages.test.js',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: {
      testMatch: [
        '<rootDir>/test/core/local/cloudFunctionPackageClosure*.test.js',
        '<rootDir>/test/local/verifyCloudFunctionPackages.test.js',
      ],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/cloud-package-verifier.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: path.join(os.tmpdir(), 'dadeto-cloud-package-verifier-stryker'),
};
