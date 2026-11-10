/**
 * @typedef {object} HeatPumpPageNodes
 * @property {HTMLFormElement|null} form Assumptions form.
 * @property {HTMLElement|null} results Results panel.
 * @property {HTMLSelectElement|null} scenarioSelect Preset selector.
 * @property {HTMLButtonElement|null} resetButton Reset control.
 * @property {HTMLButtonElement|null} exportButton Export control.
 * @property {HTMLButtonElement|null} printButton Print control.
 * @property {HTMLElement|null} pageStatus Page feedback.
 * @property {HTMLElement|null} validationSummary Validation feedback.
 */
/** @typedef {{[Key in keyof HeatPumpPageNodes]:NonNullable<HeatPumpPageNodes[Key]>}} HeatPumpPageElements */
/**
 * Query all required nodes in the original order before checking absence.
 * @param {Document} documentObj Actual page document.
 * @returns {HeatPumpPageNodes} Captured nullable platform nodes.
 */
export function readHeatPumpPageNodes(documentObj) {
  return {
    form: /** @type {HTMLFormElement|null} */ (
      documentObj.querySelector('#assumptions-form')
    ),
    results: /** @type {HTMLElement|null} */ (
      documentObj.querySelector('#results')
    ),
    scenarioSelect: /** @type {HTMLSelectElement|null} */ (
      documentObj.querySelector('#scenario-select')
    ),
    resetButton: /** @type {HTMLButtonElement|null} */ (
      documentObj.querySelector('#reset-button')
    ),
    exportButton: /** @type {HTMLButtonElement|null} */ (
      documentObj.querySelector('#export-button')
    ),
    printButton: /** @type {HTMLButtonElement|null} */ (
      documentObj.querySelector('#print-button')
    ),
    pageStatus: /** @type {HTMLElement|null} */ (
      documentObj.querySelector('#page-status')
    ),
    validationSummary: /** @type {HTMLElement|null} */ (
      documentObj.querySelector('#validation-summary')
    ),
  };
}
