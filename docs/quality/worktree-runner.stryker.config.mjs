import base from '../../stryker.config.mjs';
import os from 'node:os';
import path from 'node:path';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: ['src/core/scripts/run-stryker-worktree-core.js'],
  ignorePatterns: [
    '**',
    '!src/core/**',
    '!src/adapters/**',
    '!src/local/allow-effects.js',
    '!test/core/scripts/run-stryker-worktree-core*.test.js',
    '!test/helpers/worktree-completion.js',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: {
      testMatch: [
        '<rootDir>/test/core/scripts/run-stryker-worktree-core*.test.js',
      ],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/worktree-runner.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: path.join(os.tmpdir(), 'dadeto-worktree-runner-stryker'),
};
