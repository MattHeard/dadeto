import base from '../../stryker.config.mjs';
import os from 'node:os';
import path from 'node:path';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: ['src/core/build/generator.js'],
  ignorePatterns: [
    '**',
    '!src/core/**',
    '!src/logic/core/**',
    '!src/logic/boundary/**',
    '!src/build/**',
    '!src/content/blog-data/**',
    '!src/content/pages/**',
    '!test/generator/**',
    '!test/core/generator.test.js',
    '!test/fixtures/generator-typing/**',
    '!infra/dendrite.css',
    '!vendor/deepmerge/**',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: {
      testMatch: [
        '<rootDir>/test/generator/**/*.test.js',
        '<rootDir>/test/core/generator.test.js',
      ],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/generator-typing.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: path.join(os.tmpdir(), 'dadeto-generator-typing-stryker'),
};
