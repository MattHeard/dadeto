import { startIndustrialHeatPumpReadinessPage } from '/browser/industrialHeatPump/page.js';

const dispose = startIndustrialHeatPumpReadinessPage({
  documentObj: document,
  windowObj: window,
});

window.addEventListener('pagehide', dispose, { once: true });
