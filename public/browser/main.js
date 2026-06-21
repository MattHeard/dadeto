import './document.js';
import { createMainHandle } from '../core/browser/main.js';

const handle = createMainHandle({
  documentObj: document,
  windowObj: window,
  fetchFn: globalThis.fetch,
  storageObj: localStorage,
});

handle();
