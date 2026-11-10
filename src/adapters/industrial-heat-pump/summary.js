import { presentation } from './formatters.js';
import { writeHeatPumpText } from './write-text.js';
import { createHeatPumpDisplayEffects } from './display.js';
/**
 * @param {Document} documentObj Actual page document.
 * @param {import('./nodes.js').HeatPumpPageElements} elements Captured receivers.
 * @returns {(errors:import('../../logic/core/industrial-heat-pump/industrial-heat-pump.js').HeatPumpIssue[])=>void} Ordered summary/visibility effects.
 */
export function createHeatPumpSummaryEffects(documentObj, elements) {
  const display = createHeatPumpDisplayEffects(documentObj);
  return errors => {
    const summary = presentation.errorSummary(errors);
    elements.validationSummary.hidden = summary.hidden();
    writeHeatPumpText(elements.validationSummary, summary.text());
    const overallStatus = summary.overallStatus();
    if (overallStatus !== null)
      display.setText('#overall-status', overallStatus);
    for (const selector of [
      '.feasibility-grid',
      '.comparison-grid',
      '.brief-card',
    ]) {
      const section = /** @type {HTMLElement|null} */ (
        documentObj.querySelector(selector)
      );
      if (section) section.hidden = summary.sectionHidden();
    }
  };
}
