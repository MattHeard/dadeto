import { createLoadStaticConfig } from '../core/browser/load-static-config-core.js';

/**
 * Memoized static config loader wired with browser dependencies.
 */
const handle = createLoadStaticConfig({
  fetchFn: (input, init) => fetch(input, init),
  warn: (message, error) => console.warn(message, error),
});

export { handle };
export const loadStaticConfig = handle;
