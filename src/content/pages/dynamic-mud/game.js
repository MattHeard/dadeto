import { startDynamicMudBrowserPage } from '/browser/dynamicMud.js';

const dispose = startDynamicMudBrowserPage({
  documentObj: document,
  windowObj: window,
});
window.addEventListener('pagehide', dispose, { once: true });
