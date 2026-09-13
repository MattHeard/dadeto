import './document.js';
import { createMainHandle } from '../core/browser/main.js';
import { initializeStaticJsonlTables } from '../core/browser/staticJsonlTable.js';

initializeStaticJsonlTables(document);

const handle = createMainHandle({
  documentObj: document,
  windowObj: window,
  fetchFn: globalThis.fetch,
  storageObj: localStorage,
});

handle();
