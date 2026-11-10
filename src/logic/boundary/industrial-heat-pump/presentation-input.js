import { captureEvidenceResult } from '../local/evidence-result.js';
import { INDUSTRIAL_HEAT_PUMP_SCENARIOS } from '../../core/industrial-heat-pump/scenarios.js';

/** @typedef {Readonly<{value: string}> | null | undefined} HeatPumpFieldSlot */

/**
 * Interpret the original nullable string-valued form slot without snapshotting it.
 * Blank/missing text maps to NaN; other nonblank text follows native Number.
 * Getter/trim/conversion failures remain exact explicit thrown-value evidence.
 * @param {HeatPumpFieldSlot} slot Unparsed field slot supplied by integration.
 * @returns {{ok: true, evidence: number} | {ok: false, error: unknown}} Numeric candidate or original failure.
 */
export function parseHeatPumpFieldValue(slot) {
  return captureEvidenceResult(() =>
    slot?.value.trim() ? Number(slot.value) : Number.NaN
  );
}

/**
 * Interpret exact selector text: only own preset keys are accepted, without trim.
 * @param {string} value Unparsed selector text.
 * @returns {import('../../core/industrial-heat-pump/scenarios.js').HeatPumpScenario | null} Original preset alias or custom/unknown selection.
 */
export function parseHeatPumpScenario(value) {
  return Object.hasOwn(INDUSTRIAL_HEAT_PUMP_SCENARIOS, value)
    ? INDUSTRIAL_HEAT_PUMP_SCENARIOS[
        /** @type {'base' | 'conservative' | 'optimistic'} */ (value)
      ]
    : null;
}
