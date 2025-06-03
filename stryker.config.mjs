export default {
  mutate: ["src/**/*.js", "!**/*.html"],
  testRunner: "jest",
  coverageAnalysis: "perTest",
  reporters: ["clear-text"],
  jest: {
    configFile: "jest.config.mjs"
  },
  tempDirName: ".stryker-tmp",
  disableTypeChecks: false
};