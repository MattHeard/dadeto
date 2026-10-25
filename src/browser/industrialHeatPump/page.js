import { calculateIndustrialHeatPumpReadiness } from '../industrialHeatPumpReadiness.js';
import { startIndustrialHeatPumpReadinessPage as startCore } from '../../core/browser/industrialHeatPump/page.js';

/**
 * Bind the industrial heat-pump presenter to its calculation boundary.
 * @param {{documentObj:Document,windowObj:Window,downloadJson?:(payload:Record<string,unknown>,filename:string)=>void,printPage?:()=>void}} environment Browser objects and optional adapters.
 * @returns {() => void} Removes page listeners.
 */
export function startIndustrialHeatPumpReadinessPage(environment) {
  return startCore({
    documentObj: environment.documentObj,
    calculateIndustrialHeatPumpReadiness,
    downloadJson:
      environment.downloadJson ??
      ((payload, filename) =>
        downloadScenarioJson(payload, filename, environment.documentObj)),
    printPage: environment.printPage ?? (() => environment.windowObj.print()),
  });
}

/**
 * Download the portable screening result from the browser boundary.
 * @param {Record<string,unknown>} payload Current assumptions and results.
 * @param {string} filename Download filename.
 * @param {Document} documentObj Browser document.
 * @returns {void}
 */
function downloadScenarioJson(payload, filename, documentObj) {
  const objectUrl = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  );
  const anchor = documentObj.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}
