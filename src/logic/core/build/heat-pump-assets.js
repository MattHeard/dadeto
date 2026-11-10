import { createAssetCopies } from './asset-copies.js';

/** @type {Array<[string, string]>} */
const HEAT_PUMP_ASSETS = [
  [
    'logic/core/industrial-heat-pump/page-workflow.js',
    'logic/core/industrial-heat-pump/page-workflow.js',
  ],
  [
    'logic/boundary/industrial-heat-pump/presentation-input.js',
    'logic/boundary/industrial-heat-pump/presentation-input.js',
  ],
  [
    'logic/core/industrial-heat-pump/presentation.js',
    'logic/core/industrial-heat-pump/presentation.js',
  ],
  [
    'browser/industrialHeatPumpReadiness.js',
    'browser/industrialHeatPumpReadiness.js',
  ],
  ['browser/industrialHeatPump/page.js', 'browser/industrialHeatPump/page.js'],
  [
    'browser/industrialHeatPump/scenarios.js',
    'browser/industrialHeatPump/scenarios.js',
  ],
  [
    'logic/boundary/industrial-heat-pump/input.js',
    'logic/boundary/industrial-heat-pump/input.js',
  ],
  [
    'logic/boundary/local/evidence-result.js',
    'logic/boundary/local/evidence-result.js',
  ],
  [
    'logic/core/industrial-heat-pump/industrial-heat-pump.js',
    'logic/core/industrial-heat-pump/industrial-heat-pump.js',
  ],
  [
    'logic/core/industrial-heat-pump/values.js',
    'logic/core/industrial-heat-pump/values.js',
  ],
  [
    'logic/core/industrial-heat-pump/comparison.js',
    'logic/core/industrial-heat-pump/comparison.js',
  ],
  [
    'logic/core/industrial-heat-pump/feasibility.js',
    'logic/core/industrial-heat-pump/feasibility.js',
  ],
  [
    'logic/core/industrial-heat-pump/thresholds.js',
    'logic/core/industrial-heat-pump/thresholds.js',
  ],
  [
    'logic/core/industrial-heat-pump/scenarios.js',
    'logic/core/industrial-heat-pump/scenarios.js',
  ],
  [
    'build/assets/industrial-heat-pump/values.js.txt',
    'core/industrialHeatPumpReadiness.js',
  ],
  [
    'build/assets/industrial-heat-pump/comparison.js.txt',
    'browser/industrialHeatPump/comparison.js',
  ],
  [
    'build/assets/industrial-heat-pump/feasibility.js.txt',
    'browser/industrialHeatPump/feasibility.js',
  ],
  [
    'build/assets/industrial-heat-pump/thresholds.js.txt',
    'browser/industrialHeatPump/thresholds.js',
  ],
  [
    'build/assets/industrial-heat-pump/validation.js.txt',
    'browser/industrialHeatPump/validation.js',
  ],
  [
    'build/assets/industrial-heat-pump/scenarios.js.txt',
    'core/browser/industrialHeatPump/scenarios.js',
  ],
];

/**
 * Include the screening domain and stable published compatibility URLs.
 * @param {string} srcDir Source root.
 * @param {string} outputDir Artifact root.
 * @param {(first: string, ...rest: string[]) => string} join Injected path join.
 * @returns {Array<{source: string, target: string}>} Complete domain copies.
 */
export function createHeatPumpAssetCopies(srcDir, outputDir, join) {
  return createAssetCopies(HEAT_PUMP_ASSETS, srcDir, outputDir, join);
}
