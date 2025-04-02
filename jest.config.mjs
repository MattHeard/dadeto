export default {
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testEnvironment: 'node',
  testPathIgnorePatterns: ['<rootDir>/.stryker-tmp/'],
  collectCoverageFrom: [
    "src/**/*.js",
    "!**/node_modules/**",
    "!**/vendor/**"
  ],
  coverageDirectory: 'reports/coverage',
};
