import { readHeatPumpPageNodes } from './nodes.js';
/**
 * Preserve the page's no-op behavior when a required platform node is absent.
 * @param {Document} documentObj Actual page document.
 * @returns {import('./nodes.js').HeatPumpPageElements|null} Available integration nodes.
 */
export function getHeatPumpPageElements(documentObj) {
  const nodes = readHeatPumpPageNodes(documentObj);
  if (
    !nodes.form ||
    !nodes.results ||
    !nodes.scenarioSelect ||
    !nodes.resetButton ||
    !nodes.exportButton ||
    !nodes.printButton ||
    !nodes.pageStatus ||
    !nodes.validationSummary
  )
    return null;
  return /** @type {import('./nodes.js').HeatPumpPageElements} */ (nodes);
}
