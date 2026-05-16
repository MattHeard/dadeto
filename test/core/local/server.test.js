import {
  getWriterUrl,
  isWriterHttpsEnabled,
  isWriterRequestLogEnabled,
  shouldSetResponseLocation,
} from '../../../src/core/local/server.js';

describe('core local server helpers', () => {
  test('reads feature flags and startup URL from injected env', () => {
    const env = {
      WRITER_HTTPS: 'yes',
      WRITER_REQUEST_LOG: 'on',
    };

    expect(isWriterHttpsEnabled(env)).toBe(true);
    expect(isWriterRequestLogEnabled(env)).toBe(true);
    expect(getWriterUrl(4321, env)).toBe('https://localhost:4321/writer/');
  });

  test('falls back to http when the https flag is not enabled', () => {
    expect(isWriterHttpsEnabled({ WRITER_HTTPS: 'nope' })).toBe(false);
    expect(getWriterUrl(4321, { WRITER_HTTPS: 'nope' })).toBe(
      'http://localhost:4321/writer/'
    );
  });

  test('decides whether response locations should be set', () => {
    expect(shouldSetResponseLocation('/foo')).toBe(true);
    expect(shouldSetResponseLocation('')).toBe(false);
  });
});
