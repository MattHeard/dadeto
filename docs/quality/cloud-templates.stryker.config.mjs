import base from '../../stryker.config.mjs';
import os from 'node:os';
import path from 'node:path';

export default {
  ...base,
  plugins: ['@stryker-mutator/jest-runner'],
  mutate: [
    'src/core/local/cloud-templates.js',
    'src/core/cloud/html-template.js',
    'src/core/cloud/templates.js',
  ],
  ignorePatterns: [
    '**',
    '!src/core/**',
    '!vendor/deepmerge/**',
    '!test/core/local/cloud-templates.test.js',
    '!test/core/cloud/html-template.test.js',
    '!jest.config.mjs',
    '!jest.mutation.config.mjs',
    '!.prettierrc',
    '!package.json',
  ],
  jest: {
    ...base.jest,
    config: {
      testMatch: [
        '<rootDir>/test/core/local/cloud-templates.test.js',
        '<rootDir>/test/core/cloud/html-template.test.js',
      ],
    },
  },
  reporters: ['progress', 'json'],
  jsonReporter: { fileName: 'reports/mutation/cloud-templates.json' },
  thresholds: { break: 100, high: 100, low: 100 },
  ignoreStatic: false,
  tempDirName: path.join(os.tmpdir(), 'dadeto-cloud-templates-stryker'),
};
