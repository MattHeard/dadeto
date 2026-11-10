import { createHeatPumpPageWorkflow } from '../../logic/core/industrial-heat-pump/page-workflow.js';
import { getHeatPumpPageElements } from './elements.js';
import { createHeatPumpFieldEffects } from './fields.js';
import { createHeatPumpPageView } from './view.js';
import { bindHeatPumpPageListeners } from './listeners.js';
/**
 * Compose the page workflow with genuine platform adapters.
 * @param {{documentObj:Document,calculateIndustrialHeatPumpReadiness:(input:unknown)=>import('../../logic/core/industrial-heat-pump/industrial-heat-pump.js').HeatPumpPublicResult,downloadJson:(payload:Record<string,unknown>,filename:string)=>void,printPage:()=>void}} environment Actual browser capabilities.
 * @returns {()=>void} Removes page listeners or preserves the missing-page no-op.
 */
export function startIndustrialHeatPumpReadinessPage(environment) {
  const {
    documentObj,
    calculateIndustrialHeatPumpReadiness,
    downloadJson,
    printPage,
  } = environment;
  const elements = getHeatPumpPageElements(documentObj);
  if (elements === null) return () => {};
  const fields = createHeatPumpFieldEffects(elements.form);
  const workflow = createHeatPumpPageWorkflow({
    calculateIndustrialHeatPumpReadiness,
    downloadJson,
    view: createHeatPumpPageView(documentObj, elements, fields),
  });
  return bindHeatPumpPageListeners(elements, workflow, printPage);
}
