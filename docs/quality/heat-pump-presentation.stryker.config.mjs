import domain from './heat-pump.stryker.config.mjs';

export default {
  ...domain,
  mutate: [
    ...domain.mutate,
    'src/logic/core/industrial-heat-pump/presentation.js',
    'src/core/browser/industrialHeatPump/page.js',
  ],
  jsonReporter: {fileName: 'reports/mutation/heat-pump-presentation.json'},
  tempDirName: '.tmp/heat-pump-presentation-stryker',
};
