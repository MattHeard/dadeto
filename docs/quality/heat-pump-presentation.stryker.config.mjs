import domain from './heat-pump.stryker.config.mjs';

export default {
  ...domain,
  reporters: ['progress', 'json', 'event-recorder'],
  eventReporter: {baseDir: 'reports/mutation/heat-pump-presentation-events'},
  mutate: [
    ...domain.mutate,
    'src/logic/boundary/industrial-heat-pump/presentation-input.js',
    'src/logic/core/industrial-heat-pump/presentation.js',
    'src/core/browser/industrialHeatPump/page.js',
  ],
  jsonReporter: {fileName: 'reports/mutation/heat-pump-presentation.json'},
  tempDirName: '.tmp/heat-pump-presentation-stryker',
};
