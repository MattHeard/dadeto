import jestConfig from './jest.config.mjs';

const configuredHeapMb = Number(
  process.env.DADETO_STRYKER_HEAP_MB ?? 1024
);
const strykerHeapMb =
  Number.isInteger(configuredHeapMb) && configuredHeapMb >= 256
    ? configuredHeapMb
    : 1024;

const jestExcludes = (jestConfig.collectCoverageFrom || [])
  .filter(p => p.startsWith('!'))
  .map(p => p.slice(1));

export default {
  plugins: [
    '@stryker-mutator/jest-runner',
    './src/local/stryker-survivor-reporter.js',
  ],
  concurrency: 1,
  maxTestRunnerReuse: 1,
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
    `--max-old-space-size=${strykerHeapMb}`,
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
