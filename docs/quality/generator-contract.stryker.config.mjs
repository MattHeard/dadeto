import base from './generator-typing.stryker.config.mjs';
import os from 'node:os';
import path from 'node:path';

export default {
  ...base,
  maxTestRunnerReuse: 10,
  jest: {
    ...base.jest,
    config: {
      testMatch: [
        '<rootDir>/test/generator/typedGeneratorContract.test.js',
        '<rootDir>/test/generator/isNonEmptyArray.test.js',
      ],
    },
  },
  jsonReporter: { fileName: 'reports/mutation/generator-contract.json' },
  tempDirName: path.join(os.tmpdir(), 'dadeto-generator-contract-stryker'),
};
