import { isAllowedOrigin } from '../../../../src/core/cloud/get-moderation-variant/cors.js';

describe('isAllowedOrigin', () => {
  it('allows requests without an origin', () => {
    expect(isAllowedOrigin(undefined, ['https://example.com'])).toBe(true);
    expect(isAllowedOrigin(null, ['https://example.com'])).toBe(true);
  });

  it('allows origins included in the whitelist', () => {
    const origins = ['https://alpha.example', 'https://beta.example'];

    expect(isAllowedOrigin('https://alpha.example', origins)).toBe(true);
  });

  it('rejects origins missing from the whitelist', () => {
    const origins = ['https://alpha.example'];

    expect(isAllowedOrigin('https://beta.example', origins)).toBe(false);
  });

  it('rejects origins when the whitelist is not an array', () => {
    expect(isAllowedOrigin('https://alpha.example', undefined)).toBe(false);
    expect(isAllowedOrigin('https://alpha.example', null)).toBe(false);
  });
});
