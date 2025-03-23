export default {
  mutate: ["src/**/*.js", "!**/*.html"],
  testRunner: "jest",
  coverageAnalysis: "perTest",
  reporters: ["html", "clear-text", "progress"],
  jest: {
    configFile: "jest.config.mjs"
  },
  tempDirName: ".stryker-tmp",
  disableTypeChecks: false
};