/** @typedef {import('./industrial-heat-pump.js').HeatPumpAssumptions} HeatPumpAssumptions */
/** @typedef {import('./industrial-heat-pump.js').HeatPumpPublicComparison} HeatPumpPublicComparison */
/** @typedef {{number: (value: unknown) => string, currency: (value: unknown) => string}} HeatPumpPresentationFormats */
/** @typedef {{kind: 'text', selector: string, value: () => string} | {kind: 'list', selector: string, items: string[]}} HeatPumpPresentationUpdate */

const MEASUREMENTS_TO_CONFIRM = [
  'A measured supply and return temperature profile across a representative operating period.',
  'Hourly or daily process heat demand, including seasonal and production changes.',
  'Fuel invoices and the incumbent system efficiency or measured fuel-to-heat performance.',
  'Available electrical connection capacity and expected peak demand.',
  'Space, integration, maintenance, downtime, and backup-heat requirements.',
];

const INSTALLER_QUESTIONS = [
  'What site measurements and process shutdown windows are needed before a design can be assessed?',
  'How would the proposed system meet the required temperature across the measured load profile?',
  'What electrical upgrades, backup heat, controls, and commissioning tests might be required?',
  'Which performance values are measured at comparable operating conditions, and which are estimates?',
];

/**
 * Build ordered lazy text/list projections without DOM operations.
 * @param {HeatPumpPresentationFormats} formatters Injected native locale formatting ports.
 * @returns {{comparisonUpdates: (inputs: HeatPumpAssumptions, comparison: HeatPumpPublicComparison) => HeatPumpPresentationUpdate[]}} Build ordered lazy text/list projections without DOM operations.
 */
export function createHeatPumpPresentation(formatters) {
  /**
   * Preserve formatting evaluation interleaved with the consumer DOM writes.
   * @param {HeatPumpAssumptions} inputs Interpreted numeric assumptions.
   * @param {HeatPumpPublicComparison} comparison Known public comparison structure with opaque legacy projection slots.
   * @returns {HeatPumpPresentationUpdate[]} Preserve formatting evaluation interleaved with the consumer DOM writes.
   */
  function comparisonUpdates(inputs, comparison) {
    return [
      {
        kind: 'text',
        selector: '#overall-status',
        value: () => summarizeComparison(comparison),
      },
      {
        kind: 'text',
        selector: '#temperature-status',
        value: () =>
          comparison.feasibility.temperature.status === 'within-limit'
            ? 'Within assumed limit'
            : 'Above assumed limit',
      },
      {
        kind: 'text',
        selector: '#temperature-detail',
        value: () =>
          `${formatters.number(inputs.requiredSupplyTemperatureC)} °C required · ${formatters.number(inputs.heatPumpMaxTemperatureC)} °C assumed maximum`,
      },
      {
        kind: 'text',
        selector: '#power-status',
        value: () =>
          comparison.feasibility.electricalPower.status === 'within-limit'
            ? 'Within assumed capacity'
            : 'Capacity may be short',
      },
      {
        kind: 'text',
        selector: '#power-detail',
        value: () =>
          `${formatters.number(comparison.requiredElectricalPowerKw)} kW average required · ${formatters.number(inputs.availableElectricalPowerKw)} kW available`,
      },
      {
        kind: 'text',
        selector: '#economics-status',
        value: () =>
          comparison.feasibility.economics.status ===
          'positive-operating-savings'
            ? 'Positive annual savings'
            : 'No positive annual savings',
      },
      {
        kind: 'text',
        selector: '#economics-detail',
        value: () =>
          `Target payback: ${comparison.feasibility.targetPayback.status === 'meets-target' ? 'met in this arithmetic' : comparison.feasibility.targetPayback.status === 'exceeds-target' ? 'not met in this arithmetic' : 'not applicable'}`,
      },
      {
        kind: 'text',
        selector: '#fuel-input',
        value: () => `${formatEnergy(comparison.incumbentFuelKwh)} kWh`,
      },
      {
        kind: 'text',
        selector: '#electricity-input',
        value: () => `${formatEnergy(comparison.heatPumpElectricityKwh)} kWh`,
      },
      {
        kind: 'text',
        selector: '#fuel-cost',
        value: () => formatters.currency(comparison.annualCosts.incumbentFuel),
      },
      {
        kind: 'text',
        selector: '#electricity-cost',
        value: () =>
          formatters.currency(comparison.annualCosts.heatPumpElectricity),
      },
      {
        kind: 'text',
        selector: '#maintenance-cost',
        value: () =>
          formatters.currency(comparison.annualCosts.heatPumpMaintenance),
      },
      {
        kind: 'text',
        selector: '#annual-savings',
        value: () => formatters.currency(comparison.annualOperatingSavings),
      },
      {
        kind: 'text',
        selector: '#simple-payback',
        value: () =>
          comparison.simplePayback.status === 'available'
            ? `${formatters.number(comparison.simplePayback.years)} years`
            : 'Not applicable — no positive operating savings',
      },
      {
        kind: 'text',
        selector: '#minimum-cop',
        value: () =>
          formatThreshold(
            comparison.thresholds.minimumCopForTargetPayback,
            value => formatters.number(value)
          ),
      },
      {
        kind: 'text',
        selector: '#maximum-installed-cost',
        value: () =>
          formatThreshold(
            comparison.thresholds.maximumInstalledCostForTargetPayback,
            value => formatters.currency(value)
          ),
      },
      {
        kind: 'text',
        selector: '#brief-summary',
        value: () => buildBriefSummary(inputs, comparison),
      },
      {
        kind: 'list',
        selector: '#missing-measurements',
        items: MEASUREMENTS_TO_CONFIRM,
      },
      {
        kind: 'list',
        selector: '#commissioning-questions',
        items: INSTALLER_QUESTIONS,
      },
    ];
  }

  /**
   * Describe the hypothetical vendor conversation.
   * @param {HeatPumpAssumptions} inputs Interpreted numeric assumptions.
   * @param {HeatPumpPublicComparison} comparison Public comparison and domain states.
   * @returns {string} Describe the hypothetical vendor conversation.
   */
  function buildBriefSummary(inputs, comparison) {
    return `Hypothetical food-process screen: ${formatters.number(inputs.annualUsefulHeatKwh)} kWh/year of useful heat at ${formatters.number(inputs.requiredSupplyTemperatureC)} °C, using assumed COP ${formatters.number(inputs.heatPumpCop)} and ${formatters.number(inputs.electricityPricePerKwh)} €/kWh electricity. The comparison estimates ${formatters.currency(comparison.annualOperatingSavings)} annual operating savings under these assumptions; simple payback is ${comparison.simplePayback.status === 'available' ? `${formatters.number(comparison.simplePayback.years)} years` : 'not applicable'}.`;
  }

  /**
   * Format the original localized whole-kWh display.
   * @param {number} value Annual energy amount.
   * @returns {string} Format the original localized whole-kWh display.
   */
  function formatEnergy(value) {
    return formatters.number(value);
  }
  return { comparisonUpdates };
}

/**
 * Summarize independent screening constraints in their original order.
 * @param {HeatPumpPublicComparison} comparison Public independent screening states.
 * @returns {string} Summarize independent screening constraints in their original order.
 */
function summarizeComparison(comparison) {
  const constraints = [];
  if (comparison.feasibility.temperature.status !== 'within-limit')
    constraints.push('temperature exceeds the assumed limit');
  if (comparison.feasibility.electricalPower.status !== 'within-limit')
    constraints.push('electrical capacity may be insufficient');
  if (comparison.feasibility.economics.status !== 'positive-operating-savings')
    constraints.push('the assumptions show no positive operating savings');
  return constraints.length
    ? `Review needed: ${constraints.join('; ')}.`
    : 'The current assumptions pass these three screening checks. This does not establish site or equipment suitability.';
}

/**
 * Format the shared available/unachievable threshold domain state.
 * @param {import('./industrial-heat-pump.js').HeatPumpThreshold} threshold Computed threshold state.
 * @param {(value: number) => string} formatValue Bound locale formatting operation.
 * @returns {string} Original available value or unavailable message.
 */
function formatThreshold(threshold, formatValue) {
  return threshold.status === 'available'
    ? formatValue(threshold.value)
    : 'Not achievable from these assumptions';
}
