export default {
  coverageReporters: ['html', 'text', 'text-summary'],
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
    "!**/vendor/**",
    "!src/browser/main.js",
    "!src/browser/document.js",
    "!src/generator/copy.js"
  ],
  coverageDirectory: 'reports/coverage',
};
