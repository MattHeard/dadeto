import { startDynamicMudPage } from '/core/browser/game/dynamic-mud/page.js';

const dispose = startDynamicMudPage({ documentObj: document });
window.addEventListener('pagehide', dispose, { once: true });
