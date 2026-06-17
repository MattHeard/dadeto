import './document.js';
import { createModerateHandle } from '../core/browser/moderate.js';

const handle = createModerateHandle({
  documentObj: document,
  fetchFn: (...args) => globalThis.fetch(...args),
  sessionStorageObj: sessionStorage,
  globalObject: globalThis,
});

handle();

export { authedFetch } from '../core/browser/moderate.js';
