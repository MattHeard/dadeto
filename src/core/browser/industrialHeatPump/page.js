import { createHeatPumpPresentation } from '../../../logic/core/industrial-heat-pump/presentation.js';
import {
  INDUSTRIAL_HEAT_PUMP_SCENARIOS,
  createIndustrialHeatPumpScenarioExport,
} from '../../../logic/core/industrial-heat-pump/scenarios.js';

const FIELD_NAMES = /** @type {Array<keyof HeatPumpAssumptions>} */ (
  Object.keys(INDUSTRIAL_HEAT_PUMP_SCENARIOS.base.inputs)
);
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
  'calculation-not-finite':
    'These assumptions exceed the supported numeric range. Reduce the extreme values to calculate a screening result.',
  'finite-number-required': 'Enter a finite number.',
  'below-minimum': 'Use a value above the required minimum.',
  'above-maximum': 'This value exceeds the supported range.',
};

/** @typedef {import('../../../logic/core/industrial-heat-pump/industrial-heat-pump.js').HeatPumpAssumptions} HeatPumpAssumptions */
/** @typedef {import('../../../logic/core/industrial-heat-pump/industrial-heat-pump.js').HeatPumpPublicComparison} HeatPumpPublicComparison */
/** @typedef {import('../../../logic/core/industrial-heat-pump/industrial-heat-pump.js').HeatPumpPublicResult} HeatPumpPublicResult */
const presentation = createHeatPumpPresentation({
  number: value => Reflect.apply(FORMAT_NUMBER.format, FORMAT_NUMBER, [value]),
  currency: value =>
    Reflect.apply(FORMAT_CURRENCY.format, FORMAT_CURRENCY, [value]),
});

/**
 * Start the client-only interactive screening page.
 * @param {{documentObj:Document,calculateIndustrialHeatPumpReadiness:(input:unknown)=>HeatPumpPublicResult,downloadJson:(payload:Record<string,unknown>,filename:string)=>void,printPage:()=>void}} environment Browser document, calculation, and effect adapters.
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
  /** @type {{inputs:HeatPumpAssumptions,comparison:HeatPumpPublicComparison}|null} */
  let currentResult = null;

  /**
   * @param {Readonly<HeatPumpAssumptions>} inputs Assumption values to display.
   * @returns {void}
   */
  function setInputs(inputs) {
    for (const field of FIELD_NAMES) {
      const input = formInputs.get(field);
      if (input) input.value = String(inputs[field]);
    }
  }

  /**
   * @returns {HeatPumpAssumptions} Current form values as numeric inputs.
   */
  function readInputs() {
    return /** @type {HeatPumpAssumptions} */ (
      Object.fromEntries(
        FIELD_NAMES.map(field => {
          const input = formInputs.get(field);
          return [
            field,
            input?.value.trim() ? Number(input.value) : Number.NaN,
          ];
        })
      )
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
    const calculationIssue = errors.find(issue => issue.field === 'input');
    activeValidationSummary.textContent = calculationIssue
      ? ERROR_MESSAGES[calculationIssue.code]
      : errors.length
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
   * @param {HeatPumpAssumptions} inputs Current valid assumptions.
   * @param {HeatPumpPublicComparison} comparison Calculated screen result.
   * @returns {void}
   */
  function renderComparison(inputs, comparison) {
    for (const update of presentation.comparisonUpdates(inputs, comparison)) {
      switch (update.kind) {
        case 'text':
          setText(update.selector, update.value());
          break;
        case 'list':
          renderList(update.selector, update.items);
          break;
      }
    }
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
    const selectedScenario = getScenario(activeScenarioSelect.value);
    const scenarioName = selectedScenario?.label ?? 'Custom assumptions';
    downloadJson(
      createIndustrialHeatPumpScenarioExport({
        scenarioName,
        assumptions: currentResult.inputs,
        result: currentResult.comparison,
        industryGraphReferences: selectedScenario?.industryGraphReferences,
      }),
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

/**
 * @param {Record<string,number>} inputs Current assumptions.
 * @param {Record<string,any>} comparison Current comparison.
 * @returns {string} User-facing vendor conversation summary.
 */

/**
 * @param {number} value Annual energy amount.
 * @returns {string} Localized whole-kWh display.
 */

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
