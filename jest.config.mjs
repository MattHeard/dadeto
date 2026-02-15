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
  }),
  testPathIgnorePatterns: [
    '<rootDir>/.stryker-tmp/',
    '<rootDir>/test/e2e/',
    '<rootDir>/e2e/',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    // Cloud function bridge shims that only re-export their underlying implementation.
    '<rootDir>/src/core/cloud/(?:[^/]+/)+(?:cloud|common)-core\\.js$',
    '<rootDir>/src/core/cloud/(?:[^/]+/)+admin-config\\.js$',
    // Toy bridge modules that forward to shared object utility and validation helpers.
    '<rootDir>/src/core/browser/toys/\\d{4}-\\d{2}-\\d{2}/(?:objectUtils|validation)\\.js$',
  ],
  collectCoverageFrom: [
    'src/core/**/*.js',
    '!**/node_modules/**',
    '!**/vendor/**',
    '!src/browser/main.js',
    '!src/browser/document.js',
    '!src/build/copy.js',
  ],
  coverageDirectory: 'reports/coverage',
  // Ensure coverage is collected for all files, including those not tested
  collectCoverage: Boolean(process.env.STRYKER_TEST_ENV),
  // Ensure all files are included in coverage, even if not required
  forceCoverageMatch:
    (process.env.STRYKER_TEST_ENV && ['src/core/**/*.js']) || [],
};

export default config;
