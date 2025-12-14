import { assertFunction } from '../common-core.js';

/**
 * Create an async handler that delegates to the provided execution function.
 * @param {object} options Collaborators required by the handler factory.
 * @param {(params: Record<string, unknown>) => unknown} options.execute Function invoked with the mapped parameters.
 * @param {(...args: unknown[]) => Record<string, unknown>} options.mapParams Mapper that converts handler arguments into the expected parameter bag.
 * @returns {(...args: unknown[]) => Promise<unknown>} Async handler that forwards the mapped parameters to the execution function.
 */
export function createAsyncDomainHandler({ execute, mapParams }) {
  assertFunction(execute, 'execute');
  assertFunction(mapParams, 'mapParams');

  return async function asyncDomainHandler(...args) {
    return execute(mapParams(...args));
  };
}
