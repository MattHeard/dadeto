import { captureEvidenceResult } from '../local/evidence-result.js';

/** @typedef {import('../../core/industrial-heat-pump/industrial-heat-pump.js').HeatPumpAssumptions} HeatPumpAssumptions */
/** @typedef {import('../../core/industrial-heat-pump/industrial-heat-pump.js').HeatPumpIssue} HeatPumpIssue */
/** @typedef {[keyof HeatPumpAssumptions, number, (number | null)?, boolean?]} InputRule */
/** @type {InputRule[]} */
const RULES = [
  ['requiredSupplyTemperatureC', 0, 300],
  ['annualUsefulHeatKwh', 0, null, true],
  ['annualOperatingHours', 0, 8760, true],
  ['incumbentFuelPricePerKwh', 0],
  ['incumbentEfficiency', 0, 1, true],
  ['electricityPricePerKwh', 0],
  ['heatPumpCop', 0, null, true],
  ['heatPumpMaxTemperatureC', 0, 300],
  ['installedCost', 0],
  ['annualMaintenanceCost', 0],
  ['availableElectricalPowerKw', 0],
  ['targetPaybackYears', 0, null, true],
];

/**
 * Interpret all unknown input categories without coercion or new defaults.
 * Retain the original object and property-read order, including native failures.
 * @param {unknown} input Unparsed screening input.
 * @returns {{ok: true, evidence: {valid: true, assumptions: HeatPumpAssumptions} | {valid: false, errors: HeatPumpIssue[]}} | {ok: false, error: unknown}} Explicit acceptance, issues or original thrown value.
 */
export function parseIndustrialHeatPumpInput(input) {
  return captureEvidenceResult(() => {
    const errors = collectInputIssues(input);
    if (errors.length > 0) return { valid: false, errors };
    return {
      valid: true,
      assumptions: /** @type {HeatPumpAssumptions} */ (input),
    };
  });
}

/**
 * Interpret structural acceptance and ordered field diagnostics.
 * @param {unknown} input Unparsed scenario fields.
 * @returns {HeatPumpIssue[]} Existing stable input issues.
 */
function collectInputIssues(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return [{ field: 'input', code: 'object-required' }];
  const record = /** @type {Record<string, unknown>} */ (input);
  const errors = [];
  for (const rule of RULES) {
    const issue = readFieldIssue(record, rule);
    if (issue) errors.push(issue);
  }
  return errors;
}

/**
 * Interpret presence and numeric category before applying domain bounds.
 * @param {Record<string, unknown>} record Original untrusted object.
 * @param {InputRule} rule Ordered field policy.
 * @returns {HeatPumpIssue | undefined} First issue for this field.
 */
function readFieldIssue(record, rule) {
  const [field] = rule;
  if (!Object.hasOwn(record, field)) return { field, code: 'required' };
  if (typeof record[field] !== 'number' || !Number.isFinite(record[field]))
    return { field, code: 'finite-number-required' };
  return readRangeIssue(record, rule);
}

/**
 * Read numeric domain bounds in the original order without snapshotting getters.
 * @param {Record<string, unknown>} record Original untrusted object.
 * @param {InputRule} rule Ordered field policy.
 * @returns {HeatPumpIssue | undefined} Existing lower/upper bound diagnostic.
 */
function readRangeIssue(record, rule) {
  const [field, minimum, maximum, exclusive] = rule;
  if (
    exclusive
      ? /** @type {number} */ (record[field]) <= minimum
      : /** @type {number} */ (record[field]) < minimum
  )
    return { field, code: 'below-minimum' };
  if (
    maximum !== null &&
    maximum !== undefined &&
    /** @type {number} */ (record[field]) > maximum
  )
    return { field, code: 'above-maximum' };
  return undefined;
}
