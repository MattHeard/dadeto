import base from '../../stryker.config.mjs';
import os from 'node:os';
import path from 'node:path';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: [
    'src/core/local/gcp-simulator/fake-storage.js',
    'src/core/local/gcp-simulator/simulator-entrypoint.js',
  ],
  ignorePatterns: [
    '**',
    '!src/core/**',
    '!src/local/gcp-simulator/fake-storage.js',
    '!src/local/allow-effects.js',
    '!vendor/deepmerge/**',
    '!test/core/local/gcp-simulator/fake-storage*.test.js',
    '!test/core/local/gcp-simulator/simulator-entrypoint.test.js',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: {
      testMatch: [
        '<rootDir>/test/core/local/gcp-simulator/fake-storage*.test.js',
        '<rootDir>/test/core/local/gcp-simulator/simulator-entrypoint.test.js',
      ],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/fake-storage.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: path.join(os.tmpdir(), 'dadeto-fake-storage-stryker'),
};
