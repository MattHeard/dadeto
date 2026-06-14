import {
  buildGraphPlotFromJson,
} from '../../graphPlotCore.js';

/**
 * Create a graph plotting payload from JSON input.
 * @param {string} input JSON payload describing the graph.
 * @param {{ get?: (name: string) => (() => number) | undefined }} env Toy environment helpers.
 * @returns {string} JSON graph payload for the canvas presenter.
 */
export function graphPlot(input, env) {
  const getRandomNumber = env.get?.('getRandomNumber') || (() => 0.5);
  return JSON.stringify(buildGraphPlotFromJson(input, getRandomNumber));
}
