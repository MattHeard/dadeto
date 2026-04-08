import jestConfig from './jest.config.mjs';

const jestExcludes = (jestConfig.collectCoverageFrom || [])
  .filter(p => p.startsWith('!'))
  .map(p => p.slice(1));

export default {
  mutate: [
    'src/**/*.js',
    '!**/*.html',
    '!src/build/styles.js',
    '!src/browser/contentsMenuToggle.js',
    '!src/browser/variantMenuToggle.js',
    ...jestExcludes,
  ],
  testRunner: 'jest',
  testRunnerNodeArgs: ['--experimental-vm-modules'],
  coverageAnalysis: 'perTest',
  reporters: ['clear-text'],
  jest: {
    configFile: 'jest.config.mjs',
  },
  tempDirName: '.stryker-tmp',
  disableTypeChecks: false,
  ignoreStatic: true,
};
