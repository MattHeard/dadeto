/**
 * Helper utilities shared by browser toys.
 * @param {Map<string, Function>} env Environment map that exposes helpers.
 * @returns {{getUuid: Function, getData: Function, setLocalTemporaryData: Function}} Accessors.
 */
export function getEnvHelpers(env) {
  const getter = env.get.bind(env);
  return {
    getUuid: getter('getUuid'),
    getData: getter('getData'),
    setLocalTemporaryData: getter('setLocalTemporaryData'),
  };
}
