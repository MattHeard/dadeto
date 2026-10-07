import { createLoadStaticConfig } from '../core/browser/load-static-config-core.js';
import { bindEffectBoundary, createEffectFetchFn } from './allow-effects.js';

/**
 * Memoized static config loader wired with browser dependencies.
 */
const handle = createLoadStaticConfig({
  fetchFn: createEffectFetchFn((input, init) => fetch(input, init)),
  bindEffectBoundary,
  warn: (message, error) => console.warn(message, error),
});

export { handle };
export const loadStaticConfig = handle;
