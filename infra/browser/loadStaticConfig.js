import { createLoadStaticConfig } from './load-static-config-core.js';

/**
 * Memoized static config loader wired with browser dependencies.
 */
export const loadStaticConfig = createLoadStaticConfig({
  fetchFn: (input, init) => fetch(input, init),
  warn: (message, error) => console.warn(message, error),
});
