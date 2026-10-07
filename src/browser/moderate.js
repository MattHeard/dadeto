import './document.js';
import { createModerateHandle } from '../core/browser/moderate.js';
import { bindEffectBoundary, createEffectFetchFn } from './allow-effects.js';

const handle = createModerateHandle({
  documentObj: document,
  fetchFn: (...args) => globalThis.fetch(...args),
  effectFetchFn: createEffectFetchFn((...args) => globalThis.fetch(...args)),
  bindEffectBoundary,
  sessionStorageObj: sessionStorage,
  globalObject: globalThis,
});

handle();

export { authedFetch } from '../core/browser/moderate.js';
