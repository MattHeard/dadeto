import { INDUSTRIAL_HEAT_PUMP_SCENARIOS } from './scenarios.js';

const FIELD_NAMES = Object.keys(INDUSTRIAL_HEAT_PUMP_SCENARIOS.base.inputs);
const FORMAT_NUMBER = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 1,
});
const FORMAT_CURRENCY = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** @type {Record<string,string>} */
const ERROR_MESSAGES = {
  required: 'Enter a value.',
  'finite-number-required': 'Enter a finite number.',
  'below-minimum': 'Use a value above the required minimum.',
  'above-maximum': 'This value exceeds the supported range.',
};

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
 * Start the client-only interactive screening page.
 * @param {{documentObj:Document,calculateIndustrialHeatPumpReadiness:(input:unknown)=>Record<string,any>,downloadJson:(payload:Record<string,unknown>,filename:string)=>void,printPage:()=>void}} environment Browser document, calculation, and effect adapters.
 * @returns {()=>void} Removes listeners created by the page.
 */
export function startIndustrialHeatPumpReadinessPage(environment) {
  const {
    documentObj,
    calculateIndustrialHeatPumpReadiness,
    downloadJson,
    printPage,
  } = environment;
  const form = documentObj.querySelector('#assumptions-form');
  const results = /** @type {HTMLElement|null} */ (
    documentObj.querySelector('#results')
  );
  const scenarioSelect = documentObj.querySelector('#scenario-select');
  const resetButton = /** @type {HTMLButtonElement|null} */ (
    documentObj.querySelector('#reset-button')
  );
  const exportButton = /** @type {HTMLButtonElement|null} */ (
    documentObj.querySelector('#export-button')
  );
  const printButton = /** @type {HTMLButtonElement|null} */ (
    documentObj.querySelector('#print-button')
  );
  const pageStatus = /** @type {HTMLElement|null} */ (
    documentObj.querySelector('#page-status')
  );
  const validationSummary = /** @type {HTMLElement|null} */ (
    documentObj.querySelector('#validation-summary')
  );
  if (
    !form ||
    !results ||
    !scenarioSelect ||
    !resetButton ||
    !exportButton ||
    !printButton ||
    !pageStatus ||
    !validationSummary
  )
    return () => {};

  const activeForm = /** @type {HTMLFormElement} */ (form);
  const activeResults = results;
  const activeScenarioSelect = /** @type {HTMLSelectElement} */ (
    scenarioSelect
  );
  const activePageStatus = /** @type {HTMLElement} */ (pageStatus);
  const activeValidationSummary = /** @type {HTMLElement} */ (
    validationSummary
  );
  const activeExportButton = /** @type {HTMLButtonElement} */ (exportButton);
  const activeResetButton = /** @type {HTMLButtonElement} */ (resetButton);
  const activePrintButton = /** @type {HTMLButtonElement} */ (printButton);
  const formInputs = collectFormInputs(activeForm);
  /** @type {{inputs:Record<string,number>,comparison:Record<string,any>}|null} */
  let currentResult = null;

  /**
   * @param {Readonly<Record<string,number>>} inputs Assumption values to display.
   * @returns {void}
   */
  function setInputs(inputs) {
    for (const field of FIELD_NAMES) {
      const input = formInputs.get(field);
      if (input) input.value = String(inputs[field]);
    }
  }

  /**
   * @returns {Record<string,number>} Current form values as numeric inputs.
   */
  function readInputs() {
    return Object.fromEntries(
      FIELD_NAMES.map(field => {
        const input = formInputs.get(field);
        return [field, input?.value.trim() ? Number(input.value) : Number.NaN];
      })
    );
  }

  /**
   * @param {Array<{field:string,code:string}>} errors Input validation errors.
   * @returns {void}
   */
  function renderErrors(errors) {
    for (const field of FIELD_NAMES) {
      const input = formInputs.get(field);
      const error = /** @type {HTMLElement|null} */ (
        documentObj.querySelector(`[data-error-for="${field}"]`)
      );
      const issue = errors.find(item => item.field === field);
      if (input) input.setAttribute('aria-invalid', String(Boolean(issue)));
      if (error) error.textContent = issue ? ERROR_MESSAGES[issue.code] : '';
    }
    activeValidationSummary.hidden = errors.length === 0;
    activeValidationSummary.textContent = errors.length
      ? `${errors.length} assumption${errors.length === 1 ? '' : 's'} need attention. Results are hidden until corrected.`
      : '';
    if (errors.length > 0)
      setText(
        '#overall-status',
        'Results are hidden until assumptions are corrected.'
      );
    for (const selector of [
      '.feasibility-grid',
      '.comparison-grid',
      '.brief-card',
    ]) {
      const section = /** @type {HTMLElement|null} */ (
        documentObj.querySelector(selector)
      );
      if (section) section.hidden = errors.length > 0;
    }
  }

  /**
   * @param {Record<string,number>} inputs Current valid assumptions.
   * @param {Record<string,any>} comparison Calculated screen result.
   * @returns {void}
   */
  function renderComparison(inputs, comparison) {
    setText('#overall-status', summarizeComparison(comparison));
    setText(
      '#temperature-status',
      comparison.feasibility.temperature.status === 'within-limit'
        ? 'Within assumed limit'
        : 'Above assumed limit'
    );
    setText(
      '#temperature-detail',
      `${FORMAT_NUMBER.format(inputs.requiredSupplyTemperatureC)} °C required · ${FORMAT_NUMBER.format(inputs.heatPumpMaxTemperatureC)} °C assumed maximum`
    );
    setText(
      '#power-status',
      comparison.feasibility.electricalPower.status === 'within-limit'
        ? 'Within assumed capacity'
        : 'Capacity may be short'
    );
    setText(
      '#power-detail',
      `${FORMAT_NUMBER.format(comparison.requiredElectricalPowerKw)} kW average required · ${FORMAT_NUMBER.format(inputs.availableElectricalPowerKw)} kW available`
    );
    setText(
      '#economics-status',
      comparison.feasibility.economics.status === 'positive-operating-savings'
        ? 'Positive annual savings'
        : 'No positive annual savings'
    );
    setText(
      '#economics-detail',
      `Target payback: ${comparison.feasibility.targetPayback.status === 'meets-target' ? 'met in this arithmetic' : comparison.feasibility.targetPayback.status === 'exceeds-target' ? 'not met in this arithmetic' : 'not applicable'}`
    );

    setText('#fuel-input', `${formatEnergy(comparison.incumbentFuelKwh)} kWh`);
    setText(
      '#electricity-input',
      `${formatEnergy(comparison.heatPumpElectricityKwh)} kWh`
    );
    setText(
      '#fuel-cost',
      FORMAT_CURRENCY.format(comparison.annualCosts.incumbentFuel)
    );
    setText(
      '#electricity-cost',
      FORMAT_CURRENCY.format(comparison.annualCosts.heatPumpElectricity)
    );
    setText(
      '#maintenance-cost',
      FORMAT_CURRENCY.format(comparison.annualCosts.heatPumpMaintenance)
    );
    setText(
      '#annual-savings',
      FORMAT_CURRENCY.format(comparison.annualOperatingSavings)
    );
    setText(
      '#simple-payback',
      comparison.simplePayback.status === 'available'
        ? `${FORMAT_NUMBER.format(comparison.simplePayback.years)} years`
        : 'Not applicable — no positive operating savings'
    );
    setText(
      '#minimum-cop',
      comparison.thresholds.minimumCopForTargetPayback.status === 'available'
        ? FORMAT_NUMBER.format(
            comparison.thresholds.minimumCopForTargetPayback.value
          )
        : 'Not achievable from these assumptions'
    );
    setText(
      '#maximum-installed-cost',
      comparison.thresholds.maximumInstalledCostForTargetPayback.status ===
        'available'
        ? FORMAT_CURRENCY.format(
            comparison.thresholds.maximumInstalledCostForTargetPayback.value
          )
        : 'Not achievable from these assumptions'
    );
    setText('#brief-summary', buildBriefSummary(inputs, comparison));
    renderList('#missing-measurements', MEASUREMENTS_TO_CONFIRM);
    renderList('#commissioning-questions', INSTALLER_QUESTIONS);
    activeValidationSummary.hidden = true;
    activeResults.hidden = false;
  }

  /**
   * @param {string} selector Result element selector.
   * @param {string} value Display text.
   * @returns {void}
   */
  function setText(selector, value) {
    const element = documentObj.querySelector(selector);
    if (element) element.textContent = value;
  }

  /**
   * @param {string} selector List selector.
   * @param {string[]} items Brief items.
   * @returns {void}
   */
  function renderList(selector, items) {
    const list = documentObj.querySelector(selector);
    if (!list) return;
    list.replaceChildren(
      ...items.map(item => {
        const entry = documentObj.createElement('li');
        entry.textContent = item;
        return entry;
      })
    );
  }

  /**
   * @returns {void}
   */
  function calculateAndRender() {
    const inputs = readInputs();
    const result = calculateIndustrialHeatPumpReadiness(inputs);
    renderErrors(result.valid ? [] : result.errors);
    if (!result.valid) {
      currentResult = null;
      activeResults.hidden = false;
      activePageStatus.textContent =
        'Correct the highlighted assumptions to see an updated comparison.';
      activeExportButton.disabled = true;
      return;
    }
    currentResult = { inputs, comparison: result.comparison };
    renderComparison(inputs, result.comparison);
    activeExportButton.disabled = false;
    activePageStatus.textContent =
      'Results updated from the current assumptions.';
  }

  /**
   * @returns {void}
   */
  function handleInput() {
    activeScenarioSelect.value = 'custom';
    calculateAndRender();
  }

  /**
   * @returns {void}
   */
  function handleScenarioChange() {
    const scenario = getScenario(activeScenarioSelect.value);
    if (!scenario) return;
    setInputs(scenario.inputs);
    calculateAndRender();
    activePageStatus.textContent = scenario.description;
  }

  /**
   * @returns {void}
   */
  function handleReset() {
    activeScenarioSelect.value = 'base';
    setInputs(INDUSTRIAL_HEAT_PUMP_SCENARIOS.base.inputs);
    calculateAndRender();
    activePageStatus.textContent = 'The base example has been restored.';
  }

  /**
   * @returns {void}
   */
  function handleExport() {
    if (!currentResult) {
      activePageStatus.textContent =
        'Correct the scenario before exporting it.';
      return;
    }
    const scenarioName =
      getScenario(activeScenarioSelect.value)?.label ?? 'Custom assumptions';
    downloadJson(
      {
        schemaVersion: 1,
        scenarioName,
        assumptions: currentResult.inputs,
        result: currentResult.comparison,
        disclosure:
          'Hypothetical user-supplied screening calculation; not engineering advice or evidence of commercially available equipment.',
      },
      'industrial-heat-pump-screening.json'
    );
    setText(
      '#export-status',
      'Exported the current assumptions and screening result as JSON.'
    );
  }

  /**
   * @param {SubmitEvent} event Form submission.
   * @returns {void}
   */
  const handleSubmit = event => event.preventDefault();
  activeForm.addEventListener('input', handleInput);
  activeForm.addEventListener('change', handleInput);
  activeForm.addEventListener('submit', handleSubmit);
  activeScenarioSelect.addEventListener('change', handleScenarioChange);
  activeResetButton.addEventListener('click', handleReset);
  activeExportButton.addEventListener('click', handleExport);
  activePrintButton.addEventListener('click', printPage);

  setInputs(INDUSTRIAL_HEAT_PUMP_SCENARIOS.base.inputs);
  calculateAndRender();
  activePageStatus.textContent =
    INDUSTRIAL_HEAT_PUMP_SCENARIOS.base.description;

  return () => {
    activeForm.removeEventListener('input', handleInput);
    activeForm.removeEventListener('change', handleInput);
    activeForm.removeEventListener('submit', handleSubmit);
    activeScenarioSelect.removeEventListener('change', handleScenarioChange);
    activeResetButton.removeEventListener('click', handleReset);
    activeExportButton.removeEventListener('click', handleExport);
    activePrintButton.removeEventListener('click', printPage);
  };
}

/**
 * Capture the page's current assumption inputs once for its listener lifetime.
 * @param {HTMLFormElement} form Form containing named assumption fields.
 * @returns {Map<string,HTMLInputElement|null>} Inputs by assumption key.
 */
function collectFormInputs(form) {
  return new Map(
    FIELD_NAMES.map(field => [
      field,
      /** @type {HTMLInputElement|null} */ (
        form.querySelector(`[name="${field}"]`)
      ),
    ])
  );
}

/**
 * @param {Record<string,any>} comparison Current comparison.
 * @returns {string} Plain-language first-screen result.
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
 * @param {Record<string,number>} inputs Current assumptions.
 * @param {Record<string,any>} comparison Current comparison.
 * @returns {string} User-facing vendor conversation summary.
 */
function buildBriefSummary(inputs, comparison) {
  return `Hypothetical food-process screen: ${FORMAT_NUMBER.format(inputs.annualUsefulHeatKwh)} kWh/year of useful heat at ${FORMAT_NUMBER.format(inputs.requiredSupplyTemperatureC)} °C, using assumed COP ${FORMAT_NUMBER.format(inputs.heatPumpCop)} and ${FORMAT_NUMBER.format(inputs.electricityPricePerKwh)} €/kWh electricity. The comparison estimates ${FORMAT_CURRENCY.format(comparison.annualOperatingSavings)} annual operating savings under these assumptions; simple payback is ${comparison.simplePayback.status === 'available' ? `${FORMAT_NUMBER.format(comparison.simplePayback.years)} years` : 'not applicable'}.`;
}

/**
 * @param {number} value Annual energy amount.
 * @returns {string} Localized whole-kWh display.
 */
function formatEnergy(value) {
  return FORMAT_NUMBER.format(value);
}

/**
 * @param {string} value Selected preset key.
 * @returns {Record<string,any>|null} Preset definition or null for custom input.
 */
function getScenario(value) {
  return Object.hasOwn(INDUSTRIAL_HEAT_PUMP_SCENARIOS, value)
    ? INDUSTRIAL_HEAT_PUMP_SCENARIOS[
        /** @type {'base'|'conservative'|'optimistic'} */ (value)
      ]
    : null;
}
