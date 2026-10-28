import base from '../../stryker.config.mjs';
import os from 'node:os';
import path from 'node:path';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: ['src/core/build/staticJsonlTable.js'],
  ignorePatterns: [
    '**',
    '!src/core/**',
    '!src/content/blog-data/**',
    '!src/build/generator.js',
    '!src/build/staticJsonlTable.js',
    '!test/generator/staticJsonlTable*.test.js',
    '!vendor/deepmerge/**',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: {
      testMatch: ['<rootDir>/test/generator/staticJsonlTable*.test.js'],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/static-table.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: path.join(os.tmpdir(), 'dadeto-static-table-stryker'),
};
