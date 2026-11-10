import { createHeatPumpPageWorkflow } from '../../../logic/core/industrial-heat-pump/page-workflow.js';
import {
  parseHeatPumpFieldValue,
  parseHeatPumpScenario,
} from '../../../logic/boundary/industrial-heat-pump/presentation-input.js';
import { createHeatPumpPresentation } from '../../../logic/core/industrial-heat-pump/presentation.js';
import { HEAT_PUMP_FIELD_NAMES as FIELD_NAMES } from '../../../logic/core/industrial-heat-pump/scenarios.js';

const FORMAT_NUMBER = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 1,
});
const FORMAT_CURRENCY = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

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
          const parsed = parseHeatPumpFieldValue(input);
          if (!parsed.ok) throw parsed.error;
          return [field, parsed.evidence];
        })
      )
    );
  }

  /**
   * @param {import('../../../logic/core/industrial-heat-pump/industrial-heat-pump.js').HeatPumpIssue[]} errors Input validation errors.
   * @returns {void}
   */
  function renderErrors(errors) {
    for (const field of FIELD_NAMES) {
      const input = formInputs.get(field);
      const error = /** @type {HTMLElement|null} */ (
        documentObj.querySelector(`[data-error-for="${field}"]`)
      );
      const issue = presentation.fieldError(field, errors);
      if (input) input.setAttribute('aria-invalid', String(issue.invalid));
      if (error) writeText(error, issue.message());
    }
    const summary = presentation.errorSummary(errors);
    activeValidationSummary.hidden = summary.hidden();
    writeText(activeValidationSummary, summary.text());
    const overallStatus = summary.overallStatus();
    if (overallStatus !== null) setText('#overall-status', overallStatus);
    for (const selector of [
      '.feasibility-grid',
      '.comparison-grid',
      '.brief-card',
    ]) {
      const section = /** @type {HTMLElement|null} */ (
        documentObj.querySelector(selector)
      );
      if (section) section.hidden = summary.sectionHidden();
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
    if (element) writeText(element, value);
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

  const workflow = createHeatPumpPageWorkflow({
    calculateIndustrialHeatPumpReadiness,
    downloadJson,
    view: {
      readInputs,
      setInputs,
      renderErrors,
      renderComparison,
      showResults: () => {
        activeResults.hidden = false;
      },
      disableExport: value => {
        activeExportButton.disabled = value;
      },
      selectedScenario: () => parseHeatPumpScenario(activeScenarioSelect.value),
      selectScenario: value => {
        activeScenarioSelect.value = value;
      },
      status: value => {
        activePageStatus.textContent = value;
      },
      exportStatus: value => setText('#export-status', value),
    },
  });

  /**
   * @param {SubmitEvent} event Form submission.
   * @returns {void}
   */
  const handleSubmit = event => event.preventDefault();
  activeForm.addEventListener('input', workflow.handleInput);
  activeForm.addEventListener('change', workflow.handleInput);
  activeForm.addEventListener('submit', handleSubmit);
  activeScenarioSelect.addEventListener('change', workflow.handleScenarioChange);
  activeResetButton.addEventListener('click', workflow.handleReset);
  activeExportButton.addEventListener('click', workflow.handleExport);
  activePrintButton.addEventListener('click', printPage);

  workflow.initialize();

  return () => {
    activeForm.removeEventListener('input', workflow.handleInput);
    activeForm.removeEventListener('change', workflow.handleInput);
    activeForm.removeEventListener('submit', handleSubmit);
    activeScenarioSelect.removeEventListener('change', workflow.handleScenarioChange);
    activeResetButton.removeEventListener('click', workflow.handleReset);
    activeExportButton.removeEventListener('click', workflow.handleExport);
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
 * Preserve native textContent conversion and throwing assignment semantics.
 * Object.assign uses Set with Throw, including for an undefined message value.
 * @param {Element} element Actual DOM receiver.
 * @param {string | undefined} value Original message payload.
 * @returns {void}
 */
function writeText(element, value) {
  Object.assign(element, { textContent: value });
}
