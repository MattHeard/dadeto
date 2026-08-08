const config = {
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleNameMapper: {
    '\\./firestore\\.js$': '<rootDir>/src/cloud/firestore.js',
    '^https://www\\.gstatic\\.com/firebasejs/12\\.0\\.0/(.*)$':
      '<rootDir>/test/mocks/$1',
    '^firebase-admin/app$': '<rootDir>/test/mocks/firebase-admin-app.js',
    '^firebase-admin/firestore$':
      '<rootDir>/test/mocks/firebase-admin-firestore.js',
    '^firebase-admin/auth$': '<rootDir>/test/mocks/firebase-admin-auth.js',
    '^firebase-functions$': '<rootDir>/test/mocks/firebase-functions.js',
    '^firebase-functions/v1$': '<rootDir>/test/mocks/firebase-functions.js',
    '^@google-cloud/storage$': '<rootDir>/test/mocks/google-cloud-storage.js',
  },
  // Use node environment by default, but allow override for browser testing
  testEnvironment: 'node',
  // When running with Stryker, use the special Stryker environment
  ...(process.env.STRYKER_TEST_ENV && {
    testEnvironment: '@stryker-mutator/jest-runner/jest-env/node',
    maxWorkers: 1,
  }),
  testPathIgnorePatterns: [
    '<rootDir>/.stryker-tmp/',
    '<rootDir>/.worktrees/',
    '<rootDir>/test/e2e/',
    '<rootDir>/e2e/',
    '<rootDir>/test/synthetic/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/infra/cloud-functions/'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
  ],
  collectCoverageFrom: process.env.DADETO_COVERAGE_SHARD ? [] : ['src/core/**/*.js'],
  coverageDirectory: 'reports/coverage',
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  // Ensure coverage is collected for all files, including those not tested
  collectCoverage: Boolean(process.env.STRYKER_TEST_ENV),
  // Ensure all files are included in coverage, even if not required
  forceCoverageMatch:
    (process.env.STRYKER_TEST_ENV && ['src/core/**/*.js']) || [],
};

export default config;
