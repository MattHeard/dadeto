const productionOrigins = [
  'https://mattheard.net',
  'https://dendritestories.co.nz',
  'https://www.dendritestories.co.nz',
];

export const getAllowedOrigins = () => {
  const environment = process.env.DENDRITE_ENVIRONMENT;
  const playwrightOrigin = process.env.PLAYWRIGHT_ORIGIN;

  if (environment === 'prod') {
    return productionOrigins;
  }

  if (typeof environment === 'string' && environment.startsWith('t-')) {
    return playwrightOrigin ? [playwrightOrigin] : [];
  }

  return productionOrigins;
};

export const allowedOrigins = getAllowedOrigins();

const config = { allowedOrigins };

export default config;
