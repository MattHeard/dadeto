export default {
  mutate: ["src/**/*.js", "!**/*.html"],
  testRunner: "jest",
  coverageAnalysis: "perTest",
  reporters: ["clear-text"],
  jest: {
    configFile: "jest.config.mjs",
    enableFindRelatedTests: true,
    projectType: "custom"
  },
  tempDirName: ".stryker-tmp",
  disableTypeChecks: false,
  testRunnerNodeArgs: ["--experimental-vm-modules"],
  commandRunner: {
    command: "STRYKER_TEST_ENV=true node --experimental-vm-modules"
  }
};