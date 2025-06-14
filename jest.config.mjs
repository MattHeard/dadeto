const forceCoverageMatch = [];
if (process.env.STRYKER_TEST_ENV) {
  forceCoverageMatch.push("**/*.js");
}

const config = {
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  // Use node environment by default, but allow override for browser testing
  testEnvironment: 'node',
  // When running with Stryker, use the special Stryker environment
  ...(process.env.STRYKER_TEST_ENV && {
    testEnvironment: '@stryker-mutator/jest-runner/jest-env/node',
  }),
  testPathIgnorePatterns: ['<rootDir>/.stryker-tmp/'],
  collectCoverageFrom: [
    "src/**/*.js",
    "!**/node_modules/**",
    "!**/vendor/**",
    "!src/browser/main.js",
    "!src/browser/document.js",
    "!src/generator/copy.js"
  ],
  coverageDirectory: 'reports/coverage',
  // Ensure coverage is collected for all files, including those not tested
  collectCoverage: Boolean(process.env.STRYKER_TEST_ENV),
  // Ensure all files are included in coverage, even if not required
  forceCoverageMatch,
};

export default config;
