import {
  assertFunctionDependencies,
  assertRandomUuidAndTimestamp,
} from './cloud-core.js';

/**
 * @typedef {{ randomUUID: unknown; getServerTimestamp: unknown } & Record<string, unknown>} DependencyMap
 * @typedef {(dependencies: DependencyMap) => Function} HandlerFactory
 */

/**
 * Wire a responder with shared dependency validation.
 * @param {object} params Helper configuration.
 * @param {DependencyMap} params.dependencies Injectable services consumed by the handler.
 * @param {string[]} params.requiredFunctionNames Names of dependencies that must be functions.
 * @param {HandlerFactory} params.handlerFactory Builds the handler once validation passes.
 * @returns {Function} Initialized responder function.
 */
export function createResponder({
  dependencies,
  requiredFunctionNames,
  handlerFactory,
}) {
  const dependencyTuples = /** @type {[string, unknown][]} */ (
    requiredFunctionNames.map(name => [name, dependencies[name]])
  );
  assertFunctionDependencies(dependencyTuples);
  assertRandomUuidAndTimestamp(dependencies);

  return handlerFactory(dependencies);
}
