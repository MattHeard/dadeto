/**
 * Fetch implementation bound to the Cloud Functions global scope.
 * Binding ensures the experimental Node.js fetch retains its context.
 * @type {typeof fetch}
 */
export const fetchFn = globalThis.fetch.bind(globalThis);

