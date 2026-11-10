import packaging from './wgs84.stryker.config.mjs';

export default {
  ...packaging,
  mutate: [
    ...packaging.mutate,
    'src/logic/boundary/industrial-heat-pump/input.js',
    'src/logic/boundary/local/evidence-result.js',
    'src/logic/core/industrial-heat-pump/industrial-heat-pump.js',
    'src/logic/core/industrial-heat-pump/values.js',
    'src/logic/core/industrial-heat-pump/comparison.js',
    'src/logic/core/industrial-heat-pump/feasibility.js',
    'src/logic/core/industrial-heat-pump/thresholds.js',
    'src/logic/core/industrial-heat-pump/scenarios.js',
    'src/browser/industrialHeatPumpReadiness.js',
  ],
  ignorePatterns: [
    ...packaging.ignorePatterns,
    '!test/logic/core/industrial-heat-pump/**',
    '!test/logic/boundary/industrial-heat-pump/**',
    '!test/core/industrialHeatPumpReadiness.test.js',
    '!test/browser/industrialHeatPumpPage.test.js',
    '!src/content/pages/industrial-heat-pump-readiness/index.html',
    '!src/content/pages/industrial-heat-pump-readiness/app.js',
    '!test/fixtures/industrialHeatPumpReadiness.js',
    '!test/fixtures/typed-logic/**',
  ],
  jest: {
    ...packaging.jest,
    config: {
      testMatch: [
        ...packaging.jest.config.testMatch,
        '<rootDir>/test/logic/core/industrial-heat-pump/**/*.test.js',
        '<rootDir>/test/logic/boundary/industrial-heat-pump/**/*.test.js',
        '<rootDir>/test/core/industrialHeatPumpReadiness.test.js',
        '<rootDir>/test/browser/industrialHeatPumpPage.test.js',
      ],
    },
  },
  jsonReporter: {fileName: 'reports/mutation/heat-pump.json'},
  tempDirName: '.tmp/heat-pump-stryker',
};
