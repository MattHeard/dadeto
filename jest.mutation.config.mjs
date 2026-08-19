import baseConfig from './jest.config.mjs';

export default {
  ...baseConfig,
  collectCoverage: false,
  coverageDirectory: undefined,
  maxWorkers: 1,
  modulePathIgnorePatterns: ['<rootDir>/.stryker-tmp/'],
  workerIdleMemoryLimit: '512MB',
};
