const productionOrigins = [
  'https://mattheard.net',
  'https://dendritestories.co.nz',
  'https://www.dendritestories.co.nz',
];

/** @type {(environmentVariables: Record<string, unknown>) => string[]} */
const getPlaywrightOrigins = environmentVariables => {
  const playwrightOrigin = environmentVariables?.PLAYWRIGHT_ORIGIN;

  if (typeof playwrightOrigin === 'string' && playwrightOrigin.length > 0) {
    return [playwrightOrigin];
  }

  return [];
};

/** @type {(environment: unknown) => boolean} */
const isTestEnvironment = environment =>
  typeof environment === 'string' && environment.startsWith('t-');

/** @type {(environment: unknown, environmentVariables: Record<string, unknown>) => string[]} */
const getTestEnvironmentOrigins = (_environment, environmentVariables) =>
  getPlaywrightOrigins(environmentVariables);

/** @type {(environment: unknown, environmentVariables: Record<string, unknown>) => string[]} */
const getAllowedOriginsForEnvironment = (environment, environmentVariables) => {
  if (environment === 'prod') {
    return productionOrigins;
  }

  if (isTestEnvironment(environment)) {
    return getTestEnvironmentOrigins(environment, environmentVariables);
  }

  throw new Error(
    `Unsupported DENDRITE_ENVIRONMENT value: ${String(environment)}. Expected prod or t-*.`
  );
};

/**
 * @param {Record<string, unknown>} environmentVariables Environment variables.
 * @returns {string[]} Allowed origins for the environment.
 */
export const getAllowedOrigins = environmentVariables => {
  const environment = environmentVariables?.DENDRITE_ENVIRONMENT;

  if (typeof environment !== 'string' || environment.trim() === '') {
    throw new Error(
      'DENDRITE_ENVIRONMENT is required to resolve allowed origins.'
    );
  }

  return getAllowedOriginsForEnvironment(environment, environmentVariables);
};
