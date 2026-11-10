import { HEAT_PUMP_FIELD_NAMES } from '../../logic/core/industrial-heat-pump/scenarios.js';
import { presentation } from './formatters.js';
import { writeHeatPumpText } from './write-text.js';
/**
 * @param {Document} documentObj Actual page document.
 * @param {ReturnType<import('./fields.js').createHeatPumpFieldEffects>['formInputs']} formInputs Captured receivers.
 * @returns {(errors:import('../../logic/core/industrial-heat-pump/industrial-heat-pump.js').HeatPumpIssue[])=>void} Ordered field feedback effects.
 */
export function createHeatPumpFieldErrorEffects(documentObj, formInputs) {
  return errors => {
    for (const field of HEAT_PUMP_FIELD_NAMES) {
      const input = formInputs.get(field);
      const error = documentObj.querySelector(`[data-error-for="${field}"]`);
      const issue = presentation.fieldError(field, errors);
      if (input) input.setAttribute('aria-invalid', String(issue.invalid));
      if (error) writeHeatPumpText(error, issue.message());
    }
  };
}
