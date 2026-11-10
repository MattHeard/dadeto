import presentation from './heat-pump-presentation.stryker.config.mjs';

export default {
  ...presentation,
  mutate: [
    ...presentation.mutate,
    'src/logic/core/industrial-heat-pump/page-workflow.js',
  ],
  jsonReporter: {fileName: 'reports/mutation/heat-pump-workflow.json'},
  tempDirName: '.tmp/heat-pump-workflow-stryker',
};
