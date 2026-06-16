import { createMainHandle } from '../core/browser/main.js';

const handle = createMainHandle({
  documentObj: document,
  windowObj: window,
  fetchFn: fetch,
  storageObj: localStorage,
});

handle();
