const SQUARE_METERS_PER_HECTARE = 10_000;
const MINUTES_PER_HOUR = 60;
const SCENARIO_ADJUSTMENTS = {
  conservative: {
    coverage: 0.75,
    downtimePoints: 10,
    interventionRate: 1.25,
    operatingCost: 1.15,
    supervision: 1.25,
  },
  base: {
    coverage: 1,
    downtimePoints: 0,
    interventionRate: 1,
    operatingCost: 1,
    supervision: 1,
  },
  optimistic: {
    coverage: 1.25,
    downtimePoints: -10,
    interventionRate: 0.75,
    operatingCost: 0.85,
    supervision: 0.75,
  },
};

/**
 * @typedef {object} RoverBaseline
 * @property {number} laborHoursPerHectare Worker-hours per hectare.
 * @property {number} hourlyCostCents Labor cost in cents per worker-hour.
 * @property {'observed'|'assumed'} evidence Whether baseline figures are observed or estimated.
 */
/**
 * @typedef {object} RoverAssumptions
 * @property {number} machineCount Number of identical rovers working in parallel.
 * @property {number} effectiveCoverageSquareMetersPerHour Effective area per rover-hour.
 * @property {number} batteryRuntimeMinutes Operating minutes per battery cycle.
 * @property {number} chargeMinutes Charging minutes per cycle.
 * @property {number} downtimePercent Time unavailable, from 0 through less than 100.
 * @property {number} supervisionHoursPerMachineHour Worker-hours per rover-hour.
 * @property {number} interventionsPerMachineHour Expected intervention events per rover-hour.
 * @property {number} interventionMinutes Labor minutes per intervention event.
 * @property {number} operatorHourlyCostCents Operator cost in cents per worker-hour.
 * @property {number} operatingCostCentsPerMachineHour Operating cost in cents per rover-hour.
 * @property {number} upfrontCostCents Hypothetical purchase cost in cents.
 * @property {number} comparableJobs Number of comparable jobs used to spread purchase cost.
 */
/**
 * @typedef {object} RoverInput
 * @property {'weeding'} jobType Current modeled task.
 * @property {number} areaSquareMeters Field area.
 * @property {number} operatingWindowMinutes Available wall-clock work window.
 * @property {RoverBaseline} baseline Existing manual process.
 * @property {RoverAssumptions} rover Hypothetical rover fleet.
 * @property {Record<string, string>} [baselineReferences] Optional identifiers for future baseline entity links.
 */
/**
 * @typedef {object} RoverEstimate
 * @property {number} machineHours Total productive rover-hours across the fleet.
 * @property {number} elapsedHours Estimated wall-clock hours including charging and downtime.
 * @property {number} windowUtilizationPercent Elapsed time divided by the operating window; may exceed 100.
 * @property {boolean} fitsOperatingWindow Whether the job fits the supplied window.
 * @property {number} coveredAreaSquareMeters Area achievable inside the operating window.
 * @property {number} interventionCount Rounded-up whole intervention events.
 * @property {number} operatorHours Direct supervision and intervention labor.
 * @property {number} manualLaborHours Baseline worker-hours for this field.
 * @property {number} manualCostCents Rounded baseline labor cost.
 * @property {number} roverVariableCostCents Rounded rover operating and labor cost.
 * @property {number} roverAllInJobCostCents Variable cost plus allocated purchase cost.
 * @property {number} capitalCostPerJobCents Allocated hypothetical purchase cost.
 * @property {number} savingsBeforeCapitalCents Baseline cost minus rover variable cost.
 * @property {number} netSavingsAfterCapitalCents Baseline cost minus all-in rover job cost.
 * @property {number|null} breakEvenJobs Comparable jobs needed to recover purchase cost.
 */

/**
 * Validate all quantities before performing the deterministic estimate.
 * @param {RoverInput|null} input User assumptions.
 * @returns {string[]} Validation messages; empty means valid.
 */
export function validateRoverInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    return ['Provide a scenario object.'];

  const errors = [];
  if (input.jobType !== 'weeding') errors.push('Job type must be weeding.');
  checkPositive(input.areaSquareMeters, 'Area in square metres', errors);
  checkPositive(
    input.operatingWindowMinutes,
    'Operating window in minutes',
    errors
  );
  if (!input.baseline || typeof input.baseline !== 'object') {
    errors.push('Provide baseline labor assumptions.');
  } else {
    checkNonnegative(
      input.baseline.laborHoursPerHectare,
      'Baseline labor hours per hectare',
      errors
    );
    checkNonnegative(
      input.baseline.hourlyCostCents,
      'Baseline hourly labor cost in cents',
      errors
    );
    if (!['observed', 'assumed'].includes(input.baseline.evidence))
      errors.push('Baseline evidence must be observed or assumed.');
  }

  const rover = input.rover;
  if (!rover || typeof rover !== 'object') {
    errors.push('Provide hypothetical rover assumptions.');
    return errors;
  }
  checkPositiveInteger(rover.machineCount, 'Rover count', errors);
  checkPositive(
    rover.effectiveCoverageSquareMetersPerHour,
    'Effective coverage in square metres per rover-hour',
    errors
  );
  checkPositive(
    rover.batteryRuntimeMinutes,
    'Battery runtime in minutes',
    errors
  );
  checkNonnegative(rover.chargeMinutes, 'Charge time in minutes', errors);
  checkPercent(rover.downtimePercent, 'Downtime percent', errors);
  checkNonnegative(
    rover.supervisionHoursPerMachineHour,
    'Supervision worker-hours per rover-hour',
    errors
  );
  checkNonnegative(
    rover.interventionsPerMachineHour,
    'Interventions per rover-hour',
    errors
  );
  checkNonnegative(rover.interventionMinutes, 'Intervention minutes', errors);
  checkNonnegative(
    rover.operatorHourlyCostCents,
    'Operator hourly cost in cents',
    errors
  );
  checkNonnegative(
    rover.operatingCostCentsPerMachineHour,
    'Operating cost in cents per rover-hour',
    errors
  );
  checkNonnegative(rover.upfrontCostCents, 'Upfront cost in cents', errors);
  checkPositiveInteger(rover.comparableJobs, 'Comparable jobs', errors);
  if (input.baselineReferences !== undefined)
    checkReferences(input.baselineReferences, errors);
  return errors;
}

/**
 * Estimate duration, output and cost for one synthetic weeding job.
 * @param {RoverInput|null} input Explicit-unit assumptions.
 * @returns {RoverEstimate|{error: string, issues: string[]}} Estimate or clear validation errors.
 */
export function estimateRoverFeasibility(input) {
  const issues = validateRoverInput(input);
  if (issues.length) return { error: 'invalid-input', issues };
  return estimateValidInput(/** @type {RoverInput} */ (input));
}

/**
 * Run the same job under labeled sensitivity assumptions, not probability bounds.
 * @param {RoverInput|null} input Base assumptions.
 * @returns {Record<string, RoverEstimate|{error: string, issues: string[]}>|{error: string, issues: string[]}} Named scenario outputs.
 */
export function compareRoverScenarios(input) {
  const issues = validateRoverInput(input);
  if (issues.length) return { error: 'invalid-input', issues };
  const scenarioInput = /** @type {RoverInput} */ (input);
  return Object.fromEntries(
    Object.entries(SCENARIO_ADJUSTMENTS).map(([name, adjustment]) => {
      const downtimePercent = Math.min(
        99.9,
        Math.max(
          0,
          scenarioInput.rover.downtimePercent + adjustment.downtimePoints
        )
      );
      return [
        name,
        estimateValidInput({
          ...scenarioInput,
          rover: {
            ...scenarioInput.rover,
            effectiveCoverageSquareMetersPerHour:
              scenarioInput.rover.effectiveCoverageSquareMetersPerHour *
              adjustment.coverage,
            downtimePercent,
            interventionsPerMachineHour:
              scenarioInput.rover.interventionsPerMachineHour *
              adjustment.interventionRate,
            operatingCostCentsPerMachineHour:
              scenarioInput.rover.operatingCostCentsPerMachineHour *
              adjustment.operatingCost,
            supervisionHoursPerMachineHour:
              scenarioInput.rover.supervisionHoursPerMachineHour *
              adjustment.supervision,
          },
        }),
      ];
    })
  );
}

/**
 * Calculate the speed where rover variable cost first beats manual labor cost.
 * @param {RoverInput|null} input Base assumptions.
 * @returns {number|null|{error: string, issues: string[]}} Required area per rover-hour, null if impossible.
 */
export function minimumBreakEvenCoverage(input) {
  const issues = validateRoverInput(input);
  if (issues.length) return { error: 'invalid-input', issues };
  const scenario = /** @type {RoverInput} */ (input);
  const targetCost = manualCost(scenario);
  let lower = 0.000001;
  let upper =
    Math.max(1, scenario.rover.effectiveCoverageSquareMetersPerHour) *
    1_000_000;
  const fastest = estimateValidInput({
    ...scenario,
    rover: { ...scenario.rover, effectiveCoverageSquareMetersPerHour: upper },
  });
  if (fastest.roverVariableCostCents >= targetCost) return null;

  for (let step = 0; step < 64; step++) {
    const middle = (lower + upper) / 2;
    const estimate = estimateValidInput({
      ...scenario,
      rover: {
        ...scenario.rover,
        effectiveCoverageSquareMetersPerHour: middle,
      },
    });
    if (estimate.roverVariableCostCents < targetCost) upper = middle;
    else lower = middle;
  }
  return upper;
}

/**
 * Find the highest rover operating charge per rover-hour that preserves baseline cost parity.
 * @param {RoverInput|null} input Base assumptions.
 * @returns {number|null|{error: string, issues: string[]}} Maximum cost in cents, or null when labor already exceeds baseline.
 */
export function maximumBreakEvenOperatingCost(input) {
  const issues = validateRoverInput(input);
  if (issues.length) return { error: 'invalid-input', issues };
  const scenario = /** @type {RoverInput} */ (input);
  const estimate = estimateValidInput({
    ...scenario,
    rover: { ...scenario.rover, operatingCostCentsPerMachineHour: 0 },
  });
  const allowed =
    manualCost(scenario) -
    estimate.operatorHours * scenario.rover.operatorHourlyCostCents;
  if (allowed < 0) return null;
  return Math.max(0, allowed / estimate.machineHours);
}

/**
 * @param {number} value Candidate quantity to validate.
 * @param {string} label Human-readable unit label.
 * @param {string[]} errors Collected validation issues.
 */
function checkPositive(value, label, errors) {
  if (!Number.isFinite(value) || value <= 0)
    errors.push(`${label} must be greater than zero.`);
}

/**
 * @param {number} value Candidate quantity to validate.
 * @param {string} label Human-readable unit label.
 * @param {string[]} errors Collected validation issues.
 */
function checkNonnegative(value, label, errors) {
  if (!Number.isFinite(value) || value < 0)
    errors.push(`${label} must be zero or greater.`);
}

/**
 * @param {number} value Candidate quantity to validate.
 * @param {string} label Human-readable unit label.
 * @param {string[]} errors Collected validation issues.
 */
function checkPositiveInteger(value, label, errors) {
  if (!Number.isInteger(value) || value <= 0)
    errors.push(`${label} must be a positive whole number.`);
}

/**
 * @param {number} value Candidate percentage to validate.
 * @param {string} label Human-readable label.
 * @param {string[]} errors Collected validation issues.
 */
function checkPercent(value, label, errors) {
  if (!Number.isFinite(value) || value < 0 || value >= 100)
    errors.push(`${label} must be at least zero and less than 100.`);
}

/**
 * @param {Record<string, string>} references Optional baseline entity identifiers.
 * @param {string[]} errors Collected validation issues.
 */
function checkReferences(references, errors) {
  if (
    !references ||
    typeof references !== 'object' ||
    Array.isArray(references)
  ) {
    errors.push('Baseline references must be a field-to-id object.');
    return;
  }
  const allowed = new Set([
    'sector',
    'subsector',
    'organization',
    'offering',
    'process',
    'input',
    'output',
  ]);
  for (const [field, value] of Object.entries(references)) {
    if (!allowed.has(field) || typeof value !== 'string')
      errors.push(
        `Baseline reference ${field} must be an optional supported identifier.`
      );
  }
}

/**
 * Estimate one previously validated scenario.
 * @param {RoverInput} input Explicit-unit assumptions.
 * @returns {RoverEstimate} Deterministic cost and capacity result.
 */
function estimateValidInput(input) {
  const machineHours =
    input.areaSquareMeters / input.rover.effectiveCoverageSquareMetersPerHour;
  const chargeDuty =
    input.rover.batteryRuntimeMinutes /
    (input.rover.batteryRuntimeMinutes + input.rover.chargeMinutes);
  const availableShare = 1 - input.rover.downtimePercent / 100;
  const elapsedHours =
    machineHours / (input.rover.machineCount * chargeDuty * availableShare);
  const elapsedMinutes = elapsedHours * MINUTES_PER_HOUR;
  const interventionCount = Math.ceil(
    machineHours * input.rover.interventionsPerMachineHour
  );
  const operatorHours =
    machineHours * input.rover.supervisionHoursPerMachineHour +
    (interventionCount * input.rover.interventionMinutes) / MINUTES_PER_HOUR;
  const manualLaborHours =
    (input.areaSquareMeters / SQUARE_METERS_PER_HECTARE) *
    input.baseline.laborHoursPerHectare;
  const manualCostCents = manualCost(input);
  const roverVariableCostCents = Math.round(
    machineHours * input.rover.operatingCostCentsPerMachineHour +
      operatorHours * input.rover.operatorHourlyCostCents
  );
  const capitalCostPerJobCents = Math.ceil(
    input.rover.upfrontCostCents / input.rover.comparableJobs
  );
  const roverAllInJobCostCents =
    roverVariableCostCents + capitalCostPerJobCents;
  const savingsBeforeCapitalCents = manualCostCents - roverVariableCostCents;
  const availableMachineHours =
    (input.operatingWindowMinutes / MINUTES_PER_HOUR) *
    input.rover.machineCount *
    chargeDuty *
    availableShare;

  return {
    machineHours,
    elapsedHours,
    windowUtilizationPercent:
      (elapsedMinutes / input.operatingWindowMinutes) * 100,
    fitsOperatingWindow: elapsedMinutes <= input.operatingWindowMinutes,
    coveredAreaSquareMeters: Math.min(
      input.areaSquareMeters,
      availableMachineHours * input.rover.effectiveCoverageSquareMetersPerHour
    ),
    interventionCount,
    operatorHours,
    manualLaborHours,
    manualCostCents,
    roverVariableCostCents,
    roverAllInJobCostCents,
    capitalCostPerJobCents,
    savingsBeforeCapitalCents,
    netSavingsAfterCapitalCents: manualCostCents - roverAllInJobCostCents,
    breakEvenJobs:
      savingsBeforeCapitalCents > 0
        ? Math.ceil(input.rover.upfrontCostCents / savingsBeforeCapitalCents)
        : null,
  };
}

/**
 * @param {RoverInput} input Scenario assumptions.
 * @returns {number} Rounded baseline cost in cents.
 */
function manualCost(input) {
  return Math.round(
    (input.areaSquareMeters / SQUARE_METERS_PER_HECTARE) *
      input.baseline.laborHoursPerHectare *
      input.baseline.hourlyCostCents
  );
}
