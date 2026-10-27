import base from '../../stryker.config.mjs';
import os from 'node:os';
import path from 'node:path';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: ['src/core/scripts/check-core-parse.js'],
  ignorePatterns: [
    '**',
    '!src/core/**',
    '!test/scripts/check-core-parse.test.js',
    '!test/scripts/check-core-parse-injection.test.js',
    '!classify-functions.js',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: {
      testMatch: [
        '<rootDir>/test/scripts/check-core-parse.test.js',
        '<rootDir>/test/scripts/check-core-parse-injection.test.js',
      ],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/parse-gate.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: path.join(os.tmpdir(), 'dadeto-parse-gate-stryker'),
};
