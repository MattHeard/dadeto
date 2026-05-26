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
const getTestEnvironmentOrigins = (environment, environmentVariables) => {
  if (isTestEnvironment(environment)) {
    return getPlaywrightOrigins(environmentVariables);
  }

  return productionOrigins;
};

/** @type {(environment: unknown, environmentVariables: Record<string, unknown>) => string[]} */
const getAllowedOriginsForEnvironment = (environment, environmentVariables) => {
  if (environment === 'prod') {
    return productionOrigins;
  }

  return getTestEnvironmentOrigins(environment, environmentVariables);
};

/**
 * @param {Record<string, unknown>} environmentVariables Environment variables.
 * @returns {string[]} Allowed origins for the environment.
 */
export const getAllowedOrigins = environmentVariables => {
  const environment = environmentVariables?.DENDRITE_ENVIRONMENT;

  return getAllowedOriginsForEnvironment(environment, environmentVariables);
};
