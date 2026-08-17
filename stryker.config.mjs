import jestConfig from './jest.config.mjs';

const jestExcludes = (jestConfig.collectCoverageFrom || [])
  .filter(p => p.startsWith('!'))
  .map(p => p.slice(1));

export default {
  plugins: [
    '@stryker-mutator/jest-runner',
    './src/local/stryker-survivor-reporter.js',
  ],
  concurrency: 1,
  mutate: [
    'src/core/**/*.js',
    '!**/*.html',
    '!src/build/styles.js',
    '!src/browser/contentsMenuToggle.js',
    '!src/browser/variantMenuToggle.js',
    ...jestExcludes,
  ],
  testRunner: 'jest',
  testRunnerNodeArgs: [
    '--experimental-vm-modules',
    '--max-old-space-size=2048',
  ],
  coverageAnalysis: 'perTest',
  timeoutMS: 10_000,
  reporters: ['json', 'progress', 'survivor'],
  jest: {
    configFile: 'jest.config.mjs',
  },
  tempDirName: '.stryker-tmp',
  disableTypeChecks: false,
  ignoreStatic: true,
};
