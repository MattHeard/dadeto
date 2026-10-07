import './document.js';
import { createMainHandle } from '../core/browser/main.js';
import { initializeStaticJsonlTables } from '../core/browser/staticJsonlTable.js';
import { bindEffectBoundary, createEffectFetchFn } from './allow-effects.js';

initializeStaticJsonlTables(document);

const handle = createMainHandle({
  documentObj: document,
  windowObj: window,
  fetchFn: globalThis.fetch,
  bindEffectBoundary,
  effectFetchFn: createEffectFetchFn((input, init) =>
    globalThis.fetch(input, init)
  ),
  storageObj: localStorage,
});

handle();
