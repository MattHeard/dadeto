import {
  buildGraphPlotPayload,
  createGraphPlotFallbackPayload,
  normalizeGraphPlotPayload,
  parseGraphPlot,
} from '../../graphPlotCore.js';

/**
 * Create a graph plotting payload from JSON input.
 * @param {string} input JSON payload describing the graph.
 * @param {Map<string, Function>} env Toy environment helpers.
 * @returns {string} JSON graph payload for the canvas presenter.
 */
export function graphPlot(input, env) {
  const parsed = parseGraphPlot(input) || createGraphPlotFallbackPayload();
  const getRandomNumber = env.get('getRandomNumber') || (() => 0.5);
  const normalized = normalizeGraphPlotPayload(parsed, getRandomNumber);

  return JSON.stringify(buildGraphPlotPayload(normalized));
}
