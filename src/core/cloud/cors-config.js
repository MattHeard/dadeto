const productionOrigins = [
  'https://mattheard.net',
  'https://dendritestories.co.nz',
  'https://www.dendritestories.co.nz',
];

const getPlaywrightOrigins = environmentVariables => {
  const playwrightOrigin = environmentVariables?.PLAYWRIGHT_ORIGIN;
  return [playwrightOrigin].filter(Boolean);
};

const isTestEnvironment = environment =>
  typeof environment === 'string' && environment.startsWith('t-');

const getTestEnvironmentOrigins = (environment, environmentVariables) => {
  if (isTestEnvironment(environment)) {
    return getPlaywrightOrigins(environmentVariables);
  }

  return productionOrigins;
};

const getAllowedOriginsForEnvironment = (environment, environmentVariables) => {
  if (environment === 'prod') {
    return productionOrigins;
  }

  return getTestEnvironmentOrigins(environment, environmentVariables);
};

export const getAllowedOrigins = environmentVariables => {
  const environment = environmentVariables?.DENDRITE_ENVIRONMENT;

  return getAllowedOriginsForEnvironment(environment, environmentVariables);
};
