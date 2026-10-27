import base from '../../stryker.config.mjs';
import os from 'node:os';
import path from 'node:path';

// Full-module mutation evidence for this parser, not a repository-wide result.
export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: ['src/core/build/function-endpoint-lineage.js'],
  ignorePatterns: [
    '**',
    '!src/core/build/function-endpoint-lineage.js',
    '!src/core/build/function-endpoint-registry.js',
    '!src/core/local/logic-source-paths.js',
    '!test/core/functionEndpointLineage.test.js',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: {
      testMatch: ['<rootDir>/test/core/functionEndpointLineage.test.js'],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/function-endpoint-lineage.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: path.join(
    os.tmpdir(),
    'dadeto-function-endpoint-lineage-stryker'
  ),
};
