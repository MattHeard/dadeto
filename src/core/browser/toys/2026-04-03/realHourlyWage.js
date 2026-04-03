import { parseJsonOrFallback } from '../browserToysCore.js';
import {
  isNonNullObject,
  numberOrZero,
  whenOrNull,
} from '../../../commonCore.js';

const HOUR_FIELDS = [
  'commuteHours',
  'prepHours',
  'recoveryHours',
  'adminHours',
  'overtimeHours',
  'otherWorkHours',
];

const EXPENSE_FIELDS = [
  'directWorkExpenses',
  'commuteExpenses',
  'foodExpenses',
  'clothingExpenses',
  'otherWorkExpenses',
];

const VALIDATION_ERROR = 'Invalid real hourly wage input';

/**
 * Determine whether a value is a non-negative finite number.
 * @param {unknown} value Candidate value.
 * @returns {boolean} True when the value is valid.
 */
function isValidRealHourlyWageNumber(value) {
  return [typeof value === 'number', Number.isFinite(value), value >= 0].every(
    Boolean
  );
}

/**
 * Return an error string when the value is not a non-negative finite number.
 * @param {unknown} value Candidate value.
 * @param {string} label Field label used in the error message.
 * @returns {string | null} Error message or null when the value is valid.
 */
function getInvalidNumberError(value, label) {
  return whenOrNull(!isValidRealHourlyWageNumber(value), () => {
    return `${label} must be a non-negative finite number`;
  });
}

/**
 * Return an error string when the candidate is not an object.
 * @param {unknown} candidate Candidate value.
 * @param {string} label Field label used in the error message.
 * @returns {string | null} Error message or null when the candidate is valid.
 */
function getObjectValidationError(candidate, label) {
  return whenOrNull(!isNonNullObject(candidate), () => {
    return `${label} must be an object`;
  });
}

/**
 * Get the first invalid required field in a section.
 * @param {Record<string, unknown>} candidate Section object.
 * @param {string} sectionLabel Section label used in errors.
 * @param {string[]} requiredFields Fields that must be present and valid.
 * @returns {string | null} Error message or null when all required fields are valid.
 */
function getRequiredFieldValidationError(
  candidate,
  sectionLabel,
  requiredFields
) {
  return firstNonNullError(
    requiredFields.map(field =>
      getInvalidNumberError(candidate[field], `${sectionLabel}.${field}`)
    )
  );
}

/**
 * Return the first non-null error from a list of candidates.
 * @param {Array<string | null>} errors Error candidates to inspect.
 * @returns {string | null} The first error string or null.
 */
function firstNonNullError(errors) {
  return errors.find(error => error !== null) ?? null;
}

/**
 * Collect validation issues for the period and overhead sections.
 * @param {unknown} candidate Parsed payload.
 * @returns {Array<string | null>} Section validation errors.
 */
function getInputSectionValidationErrors(candidate) {
  return (
    whenOrNull(isNonNullObject(candidate), () => [
      firstNonNullError([
        getObjectValidationError(candidate.period, 'period'),
        getRequiredFieldValidationError(
          /** @type {Record<string, unknown>} */ (candidate.period),
          'period',
          ['paidWorkHours', 'grossIncome', 'netIncome']
        ),
      ]),
      firstNonNullError([
        getObjectValidationError(candidate.overhead, 'overhead'),
        getRequiredFieldValidationError(
          /** @type {Record<string, unknown>} */ (candidate.overhead),
          'overhead',
          []
        ),
      ]),
    ]) ?? [null, null]
  );
}

/**
 * Collect validation issues for the full input payload.
 * @param {unknown} candidate Parsed payload.
 * @returns {string | null} Error message or null when the payload is valid.
 */
function getInputValidationError(candidate) {
  return firstNonNullError([
    getObjectValidationError(candidate, 'root payload'),
    ...getInputSectionValidationErrors(candidate),
  ]);
}

/**
 * Validate and normalize the user supplied calculation input.
 * @param {unknown} candidate Parsed payload.
 * @returns {{ value?: RealHourlyWageInput, error?: string }} Normalized input or validation error.
 */
function normalizeRealHourlyWageInput(candidate) {
  const validationError = getInputValidationError(candidate);
  if (validationError !== null) {
    return { error: `${VALIDATION_ERROR}: ${validationError}` };
  }

  /** @type {RealHourlyWageInput} */
  const value = {
    period: {
      paidWorkHours: /** @type {Record<string, number>} */ (candidate.period)
        .paidWorkHours,
      grossIncome: /** @type {Record<string, number>} */ (candidate.period)
        .grossIncome,
      netIncome: /** @type {Record<string, number>} */ (candidate.period)
        .netIncome,
    },
    overhead: pickKnownNumbers(
      /** @type {Record<string, unknown>} */ (candidate.overhead),
      [...HOUR_FIELDS, ...EXPENSE_FIELDS]
    ),
  };

  return { value };
}

/**
 * Format the toy output for a normalized or invalid calculation result.
 * @param {{ value?: RealHourlyWageInput, error?: string }} normalized Parsed calculation state.
 * @returns {string} JSON string representing the final toy output.
 */
function formatRealHourlyWageResult(normalized) {
  const renderers = [
    renderInvalidRealHourlyWageResult,
    renderValidRealHourlyWageResult,
  ];
  return renderers[Number(Boolean(normalized.value))](normalized);
}

/**
 * Format the toy output for invalid input.
 * @param {{ error?: string }} normalized Parsed calculation state.
 * @returns {string} JSON string representing the error payload.
 */
function renderInvalidRealHourlyWageResult(normalized) {
  return JSON.stringify({
    error: normalized.error || VALIDATION_ERROR,
  });
}

/**
 * Format the toy output for valid input.
 * @param {{ value: RealHourlyWageInput }} normalized Parsed calculation state.
 * @returns {string} JSON string representing the wage report.
 */
function renderValidRealHourlyWageResult(normalized) {
  return JSON.stringify(calculateRealHourlyWage(normalized.value));
}

/**
 * Build a record with one value per known key.
 * @param {Record<string, unknown>} source Source object.
 * @param {string[]} keys Ordered keys to collect.
 * @returns {Record<string, number>} Number record with zero defaults.
 */
function pickKnownNumbers(source, keys) {
  return keys.reduce((record, key) => {
    record[key] = numberOrZero(source[key]);
    return record;
  }, /** @type {Record<string, number>} */ ({}));
}

/**
 * Sum the numeric values in a record.
 * @param {Record<string, number>} record Record to total.
 * @param {string[]} keys Ordered keys to include.
 * @returns {number} Sum of the requested values.
 */
function sumKnownNumbers(record, keys) {
  return keys.reduce((total, key) => total + numberOrZero(record[key]), 0);
}

/**
 * Divide two numbers when the denominator is non-zero.
 * @param {number} numerator Value being divided.
 * @param {number} denominator Divisor.
 * @returns {number | null} Division result or null when the divisor is zero.
 */
function divideOrNull(numerator, denominator) {
  return whenOrNull(denominator !== 0, () => numerator / denominator);
}

/**
 * Calculate the real hourly wage for a normalized input payload.
 * @param {RealHourlyWageInput} input Normalized wage input.
 * @returns {RealHourlyWageOutput} Derived wage report.
 */
export function calculateRealHourlyWage(input) {
  const directHoursByType = pickKnownNumbers(input.overhead, HOUR_FIELDS);
  const expensesByType = pickKnownNumbers(input.overhead, EXPENSE_FIELDS);
  const paidWorkHours = numberOrZero(input.period.paidWorkHours);
  const overheadHours = sumKnownNumbers(directHoursByType, HOUR_FIELDS);
  const totalWorkRelatedHours = paidWorkHours + overheadHours;
  const totalWorkRelatedExpenses = sumKnownNumbers(
    expensesByType,
    EXPENSE_FIELDS
  );
  const adjustedNetIncome =
    numberOrZero(input.period.netIncome) - totalWorkRelatedExpenses;

  return {
    nominalHourlyWage: divideOrNull(
      numberOrZero(input.period.grossIncome),
      paidWorkHours
    ),
    realHourlyWage: divideOrNull(adjustedNetIncome, totalWorkRelatedHours),
    totalWorkRelatedHours,
    totalWorkRelatedExpenses,
    adjustedNetIncome,
    breakdown: {
      paidWorkHours,
      overheadHours,
      totalHours: totalWorkRelatedHours,
      directHoursByType,
      expensesByType,
    },
  };
}

/**
 * Render the calculation result or a readable validation error.
 * @param {string} input Toy input string.
 * @returns {string} JSON string representing the wage report or an error payload.
 */
export function realHourlyWageToy(input) {
  const parsed = parseJsonOrFallback(input);
  const normalized = normalizeRealHourlyWageInput(parsed);
  return formatRealHourlyWageResult(normalized);
}

/**
 * @typedef {object} RealHourlyWageInput
 * @property {{
 *   paidWorkHours: number,
 *   grossIncome: number,
 *   netIncome: number,
 * }} period Work period totals.
 * @property {{
 *   commuteHours?: number,
 *   prepHours?: number,
 *   recoveryHours?: number,
 *   adminHours?: number,
 *   overtimeHours?: number,
 *   otherWorkHours?: number,
 *   directWorkExpenses?: number,
 *   commuteExpenses?: number,
 *   foodExpenses?: number,
 *   clothingExpenses?: number,
 *   otherWorkExpenses?: number,
 * }} overhead Work overhead buckets.
 */

/**
 * @typedef {object} RealHourlyWageOutput
 * @property {number | null} nominalHourlyWage Hourly wage before overhead adjustments.
 * @property {number | null} realHourlyWage Hourly wage after overhead adjustments.
 * @property {number} totalWorkRelatedHours Paid hours plus overhead hours.
 * @property {number} totalWorkRelatedExpenses Work-related expense total.
 * @property {number} adjustedNetIncome Net income after overhead expenses.
 * @property {{
 *   paidWorkHours: number,
 *   overheadHours: number,
 *   totalHours: number,
 *   directHoursByType: Record<string, number>,
 *   expensesByType: Record<string, number>,
 * }} breakdown Totals broken down by category.
 */

export const realHourlyWageToyTestOnly = {
  normalizeRealHourlyWageInput,
  pickKnownNumbers,
  sumKnownNumbers,
  divideOrNull,
};
