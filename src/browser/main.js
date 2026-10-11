import './document.js';
import { createMainHandle } from '../core/browser/main.js';
import { initializeStaticJsonlTables } from '../core/browser/staticJsonlTable.js';
import { bindEffectBoundary, createEffectFetchFn } from './allow-effects.js';

initializeStaticJsonlTables(document);

const fetchFn = createEffectFetchFn(globalThis.fetch.bind(globalThis));
const handle = createMainHandle(window, fetchFn, bindEffectBoundary);

handle();
