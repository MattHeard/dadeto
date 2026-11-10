import { describeScenarioName } from './presentation.js';
import {
  INDUSTRIAL_HEAT_PUMP_SCENARIOS,
  createIndustrialHeatPumpScenarioExport,
} from './scenarios.js';

/** @typedef {import('./industrial-heat-pump.js').HeatPumpAssumptions} HeatPumpAssumptions */
/** @typedef {import('./industrial-heat-pump.js').HeatPumpPublicComparison} HeatPumpPublicComparison */
/** @typedef {import('./industrial-heat-pump.js').HeatPumpPublicResult} HeatPumpPublicResult */
/** @typedef {import('./industrial-heat-pump.js').HeatPumpIssue} HeatPumpIssue */
/**
 * @typedef {object} HeatPumpPageView
 * @property {()=>HeatPumpAssumptions} readInputs Current field reads.
 * @property {(inputs:Readonly<HeatPumpAssumptions>)=>void} setInputs Ordered field writes.
 * @property {(errors:HeatPumpIssue[])=>void} renderErrors Ordered validation effects.
 * @property {(inputs:HeatPumpAssumptions,comparison:HeatPumpPublicComparison)=>void} renderComparison Ordered comparison effects.
 * @property {()=>void} showResults Show the result panel.
 * @property {(disabled:boolean)=>void} disableExport Set export availability.
 * @property {()=>import('./scenarios.js').HeatPumpScenario|null} selectedScenario Read and parse the actual selector.
 * @property {(value:string)=>void} selectScenario Write the actual selector.
 * @property {(value:string)=>void} status Write page feedback.
 * @property {(value:string)=>void} exportStatus Write export feedback.
 */

/**
 * Coordinate screening workflow through actual view and download capabilities.
 * @param {{view:HeatPumpPageView,calculateIndustrialHeatPumpReadiness:(input:HeatPumpAssumptions)=>HeatPumpPublicResult,downloadJson:(payload:Record<string,unknown>,filename:string)=>void}} dependencies Typed computation and effect ports.
 * @returns {{handleInput:()=>void,handleScenarioChange:()=>void,handleReset:()=>void,handleExport:()=>void,initialize:()=>void}} Page actions over private current-result state.
 */
export function createHeatPumpPageWorkflow(dependencies) {
  const { view, calculateIndustrialHeatPumpReadiness, downloadJson } =
    dependencies;
  /** @type {{inputs:HeatPumpAssumptions,comparison:HeatPumpPublicComparison}|null} */
  let currentResult = null;
  /**
   * @returns {void}
   */
  function calculateAndRender() {
    const inputs = view.readInputs();
    const result = calculateIndustrialHeatPumpReadiness(inputs);
    view.renderErrors(result.valid ? [] : result.errors);
    if (!result.valid) {
      currentResult = null;
      view.showResults();
      view.status(
        'Correct the highlighted assumptions to see an updated comparison.'
      );
      view.disableExport(true);
      return;
    }
    currentResult = { inputs, comparison: result.comparison };
    view.renderComparison(inputs, result.comparison);
    view.disableExport(false);
    view.status('Results updated from the current assumptions.');
  }

  /**
   * @returns {void}
   */
  function handleInput() {
    view.selectScenario('custom');
    calculateAndRender();
  }

  /**
   * @returns {void}
   */
  function handleScenarioChange() {
    const scenario = view.selectedScenario();
    if (!scenario) return;
    view.setInputs(scenario.inputs);
    calculateAndRender();
    view.status(scenario.description);
  }

  /**
   * @returns {void}
   */
  function handleReset() {
    view.selectScenario('base');
    view.setInputs(INDUSTRIAL_HEAT_PUMP_SCENARIOS.base.inputs);
    calculateAndRender();
    view.status('The base example has been restored.');
  }

  /**
   * @returns {void}
   */
  function handleExport() {
    if (!currentResult) {
      view.status('Correct the scenario before exporting it.');
      return;
    }
    const selectedScenario = view.selectedScenario();
    const scenarioName = describeScenarioName(selectedScenario);
    downloadJson(
      createIndustrialHeatPumpScenarioExport({
        scenarioName,
        assumptions: currentResult.inputs,
        result: currentResult.comparison,
        industryGraphReferences: selectedScenario?.industryGraphReferences,
      }),
      'industrial-heat-pump-screening.json'
    );
    view.exportStatus(
      'Exported the current assumptions and screening result as JSON.'
    );
  }

  /** @returns {void} Initialize the original base scenario and feedback. */
  function initialize() {
    view.setInputs(INDUSTRIAL_HEAT_PUMP_SCENARIOS.base.inputs);
    calculateAndRender();
    view.status(INDUSTRIAL_HEAT_PUMP_SCENARIOS.base.description);
  }
  return {
    handleInput,
    handleScenarioChange,
    handleReset,
    handleExport,
    initialize,
  };
}
