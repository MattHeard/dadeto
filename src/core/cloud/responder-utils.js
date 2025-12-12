import {
  assertFunctionDependencies,
  assertRandomUuidAndTimestamp,
} from './cloud-core.js';

/**
 * Wire a responder with shared dependency validation.
 * @param {object} params Helper configuration.
 * @param {object} params.dependencies Injectable services consumed by the handler.
 * @param {string[]} params.requiredFunctionNames Names of dependencies that must be functions.
 * @param {(dependencies: object) => Function} params.handlerFactory Builds the handler once validation passes.
 * @returns {Function} Initialized responder function.
 */
export function createResponder({
  dependencies,
  requiredFunctionNames,
  handlerFactory,
}) {
  const dependencyTuples = requiredFunctionNames.map(name => [
    name,
    dependencies[name],
  ]);
  assertFunctionDependencies(dependencyTuples);
  assertRandomUuidAndTimestamp(dependencies);

  return handlerFactory(dependencies);
}
