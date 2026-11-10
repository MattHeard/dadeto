import { presentation } from './formatters.js';
import { createHeatPumpDisplayEffects } from './display.js';
/**
 * @param {Document} documentObj Actual page document.
 * @param {import('./nodes.js').HeatPumpPageElements} elements Captured receivers.
 * @returns {import('../../logic/core/industrial-heat-pump/page-workflow.js').HeatPumpPageView['renderComparison']} Ordered comparison effects.
 */
export function createHeatPumpComparisonEffects(documentObj, elements) {
  const display = createHeatPumpDisplayEffects(documentObj);
  return (inputs, comparison) => {
    for (const update of presentation.comparisonUpdates(inputs, comparison)) {
      switch (update.kind) {
        case 'text':
          display.setText(update.selector, update.value());
          break;
        case 'list':
          display.renderList(update.selector, update.items);
          break;
      }
    }
    elements.validationSummary.hidden = true;
    elements.results.hidden = false;
  };
}
