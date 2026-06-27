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
  ],
  modulePathIgnorePatterns: ['<rootDir>/infra/cloud-functions/'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/src/core/local/gcp-simulator/server.js',
    '<rootDir>/src/local/gcp-simulator/server.js',
    '<rootDir>/src/core/scripts/check-overexposed-exports.js',
  ],
  collectCoverageFrom: [
    'src/core/**/*.js',
    '!src/core/browser/document.js',
    '!src/core/browser/main.js',
    '!src/core/browser/moderate.js',
    '!src/core/browser/presenters/realtimeVoicePrototype.js',
    '!src/core/browser/toys.js',
    '!src/core/browser/jsonUtils.js',
    '!src/core/build/full-width.js',
    '!src/core/build/generator.js',
    '!src/core/build/head.js',
    '!src/core/build/navbar.js',
    '!src/core/build/styles.js',
    '!src/core/build/title.js',
    '!src/core/build/copy-cloud.js',
    '!src/core/fs.js',
    '!src/core/local/symphony/launch.js',
    '!src/core/local/symphony/tuiRenderer.js',
    '!src/core/path.js',
    '!src/core/browser/jsonValueHelpers.js',
    '!src/core/cloud/firestore-helpers.js',
    '!src/core/cloud/**/common-core.js',
    '!src/core/cloud/**/admin-config.js',
    '!src/core/cloud/**/helpers.js',
    '!src/core/cloud/get-moderation-variant/cors.js',
    '!src/core/cloud/assign-moderation-job/**',
    '!src/core/cloud/generate-stats/**',
    '!src/core/cloud/payment-webhook/**',
    '!src/core/generate-stats-core.js',
    '!src/core/get-api-key-credit-v2.js',
    '!src/core/process-new-page-core.js',
    '!src/core/process-new-story-core.js',
    '!src/core/render-contents-core.js',
    '!src/core/render-variant-core.js',
    '!src/core/submit-new-page-core.js',
    '!src/core/submit-new-story-core.js',
    '!src/core/submit-shared.js',
    '!src/core/scripts/check-core-parse.js',
    '!**/node_modules/**',
    '!**/vendor/**',
  ],
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
