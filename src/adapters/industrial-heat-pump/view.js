import { parseHeatPumpScenario } from '../../logic/boundary/industrial-heat-pump/presentation-input.js';
import { createHeatPumpFieldErrorEffects } from './field-errors.js';
import { createHeatPumpSummaryEffects } from './summary.js';
import { createHeatPumpComparisonEffects } from './comparison.js';
import { createHeatPumpDisplayEffects } from './display.js';
/**
 * @param {Document} documentObj Actual page document.
 * @param {import('./nodes.js').HeatPumpPageElements} elements Captured receivers.
 * @param {ReturnType<import('./fields.js').createHeatPumpFieldEffects>} fields Bound field effects.
 * @returns {import('../../logic/core/industrial-heat-pump/page-workflow.js').HeatPumpPageView} Actual platform view capability.
 */
export function createHeatPumpPageView(documentObj, elements, fields) {
  const fieldErrors = createHeatPumpFieldErrorEffects(
    documentObj,
    fields.formInputs
  );
  const summary = createHeatPumpSummaryEffects(documentObj, elements);
  const display = createHeatPumpDisplayEffects(documentObj);
  return {
    readInputs: fields.readInputs,
    setInputs: fields.setInputs,
    renderErrors: errors => {
      fieldErrors(errors);
      summary(errors);
    },
    renderComparison: createHeatPumpComparisonEffects(documentObj, elements),
    showResults: () => {
      elements.results.hidden = false;
    },
    disableExport: value => {
      elements.exportButton.disabled = value;
    },
    selectedScenario: () =>
      parseHeatPumpScenario(elements.scenarioSelect.value),
    selectScenario: value => {
      elements.scenarioSelect.value = value;
    },
    status: value => {
      elements.pageStatus.textContent = value;
    },
    exportStatus: value => display.setText('#export-status', value),
  };
}
