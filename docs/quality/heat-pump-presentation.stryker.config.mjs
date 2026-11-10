import domain from './heat-pump.stryker.config.mjs';

export default {
  ...domain,
  mutate: [
    ...domain.mutate,
    'src/logic/boundary/industrial-heat-pump/presentation-input.js',
    'src/logic/core/industrial-heat-pump/presentation.js',
    'src/adapters/industrial-heat-pump/comparison.js',
    'src/adapters/industrial-heat-pump/display.js',
    'src/adapters/industrial-heat-pump/elements.js',
    'src/adapters/industrial-heat-pump/field-errors.js',
    'src/adapters/industrial-heat-pump/fields.js',
    'src/adapters/industrial-heat-pump/formatters.js',
    'src/adapters/industrial-heat-pump/listeners.js',
    'src/adapters/industrial-heat-pump/nodes.js',
    'src/adapters/industrial-heat-pump/page.js',
    'src/adapters/industrial-heat-pump/summary.js',
    'src/adapters/industrial-heat-pump/view.js',
    'src/adapters/industrial-heat-pump/write-text.js',
  ],
  jsonReporter: {fileName: 'reports/mutation/heat-pump-presentation.json'},
  tempDirName: '.tmp/heat-pump-presentation-stryker',
};
