/**
 * Register all listeners before initializing; retain original failure/disposal order.
 * @param {import('./nodes.js').HeatPumpPageElements} elements Actual receivers.
 * @param {ReturnType<import('../../logic/core/industrial-heat-pump/page-workflow.js').createHeatPumpPageWorkflow>} workflow Bound page actions.
 * @param {()=>void} printPage Actual print effect.
 * @returns {()=>void} Removes the same listener identities.
 */
export function bindHeatPumpPageListeners(elements, workflow, printPage) {
  /** @param {SubmitEvent} event Original native submit event. */
  const handleSubmit = event => event.preventDefault();
  elements.form.addEventListener('input', workflow.handleInput);
  elements.form.addEventListener('change', workflow.handleInput);
  elements.form.addEventListener('submit', handleSubmit);
  elements.scenarioSelect.addEventListener(
    'change',
    workflow.handleScenarioChange
  );
  elements.resetButton.addEventListener('click', workflow.handleReset);
  elements.exportButton.addEventListener('click', workflow.handleExport);
  elements.printButton.addEventListener('click', printPage);
  workflow.initialize();
  return () => {
    elements.form.removeEventListener('input', workflow.handleInput);
    elements.form.removeEventListener('change', workflow.handleInput);
    elements.form.removeEventListener('submit', handleSubmit);
    elements.scenarioSelect.removeEventListener(
      'change',
      workflow.handleScenarioChange
    );
    elements.resetButton.removeEventListener('click', workflow.handleReset);
    elements.exportButton.removeEventListener('click', workflow.handleExport);
    elements.printButton.removeEventListener('click', printPage);
  };
}
