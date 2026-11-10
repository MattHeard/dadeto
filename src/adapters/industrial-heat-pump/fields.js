import { HEAT_PUMP_FIELD_NAMES } from '../../logic/core/industrial-heat-pump/scenarios.js';
import { parseHeatPumpFieldValue } from '../../logic/boundary/industrial-heat-pump/presentation-input.js';
/** @typedef {import('../../logic/core/industrial-heat-pump/industrial-heat-pump.js').HeatPumpAssumptions} HeatPumpAssumptions */
/**
 * Capture field receivers once and bind their original reads/writes.
 * @param {HTMLFormElement} form Actual assumption form.
 * @returns {{formInputs:Map<keyof HeatPumpAssumptions,HTMLInputElement|null>,readInputs:()=>HeatPumpAssumptions,setInputs:(inputs:Readonly<HeatPumpAssumptions>)=>void}} Bound field capabilities.
 */
export function createHeatPumpFieldEffects(form) {
  const formInputs = new Map(
    HEAT_PUMP_FIELD_NAMES.map(field => [
      field,
      /** @type {HTMLInputElement|null} */ (
        form.querySelector(`[name="${field}"]`)
      ),
    ])
  );
  /** @returns {HeatPumpAssumptions} Original numeric field evidence, including NaN. */
  function readInputs() {
    return /** @type {HeatPumpAssumptions} */ (
      Object.fromEntries(
        HEAT_PUMP_FIELD_NAMES.map(field => {
          const parsed = parseHeatPumpFieldValue(formInputs.get(field));
          if (!parsed.ok) throw parsed.error;
          return [field, parsed.evidence];
        })
      )
    );
  }
  /**
   * @param {Readonly<HeatPumpAssumptions>} inputs Values to write in field order.
   * @returns {void} Write present controls only.
   */
  function setInputs(inputs) {
    for (const field of HEAT_PUMP_FIELD_NAMES) {
      const input = formInputs.get(field);
      if (input) input.value = String(inputs[field]);
    }
  }
  return { formInputs, readInputs, setInputs };
}
