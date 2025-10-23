import { getAllowedOrigins } from '../../src/cloud/cors-config.js';

const productionOrigins = [
  'https://mattheard.net',
  'https://dendritestories.co.nz',
  'https://www.dendritestories.co.nz',
];

describe('getAllowedOrigins', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DENDRITE_ENVIRONMENT;
    delete process.env.PLAYWRIGHT_ORIGIN;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns production origins when environment is prod', () => {
    process.env.DENDRITE_ENVIRONMENT = 'prod';

    expect(getAllowedOrigins(process.env)).toEqual(productionOrigins);
  });

  it('returns playwright origin for t- environments when defined', () => {
    process.env.DENDRITE_ENVIRONMENT = 't-example';
    process.env.PLAYWRIGHT_ORIGIN = 'http://playwright.test';

    expect(getAllowedOrigins(process.env)).toEqual(['http://playwright.test']);
  });

  it('returns an empty list when playwright origin is missing for t- environments', () => {
    process.env.DENDRITE_ENVIRONMENT = 't-example';

    expect(getAllowedOrigins(process.env)).toEqual([]);
  });
});
