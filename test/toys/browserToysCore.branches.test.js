import { describe, test, expect, jest } from '@jest/globals';
import {
  getEnvHelpers,
  ensureDend2,
  runToyWithFallback,
  runToyWithParsedJson,
} from '../../src/core/browser/toys/browserToysCore.js';

describe('getEnvHelpers', () => {
  test('throws when a required helper is missing from env', () => {
    const env = new Map([
      ['getData', jest.fn()],
      ['setLocalTemporaryData', jest.fn()],
      // getUuid intentionally omitted
    ]);
    expect(() => getEnvHelpers(env)).toThrow('Missing toy helper "getUuid"');
  });
});

describe('ensureDend2', () => {
  test('returns early when TRAN1 already contains a valid structure', () => {
    const tran1 = { stories: [], pages: [], options: [] };
    const data = { temporary: { TRAN1: tran1 } };
    ensureDend2(data);
    expect(data.temporary.TRAN1).toBe(tran1);
  });
});

describe('runToy helpers', () => {
  test('runToyWithFallback returns the handler result or fallback', () => {
    expect(runToyWithFallback('input', value => value.toUpperCase())).toBe(
      'INPUT'
    );
    expect(
      runToyWithFallback(
        'input',
        () => {
          throw new Error('boom');
        },
        JSON.stringify({})
      )
    ).toBe(JSON.stringify({}));
  });

  test('runToyWithParsedJson parses JSON before calling the handler', () => {
    expect(
      runToyWithParsedJson('{"title":"Draft"}', parsed => parsed.title)
    ).toBe('Draft');
    expect(runToyWithParsedJson('not-json', () => 'unreachable')).toBe(
      JSON.stringify({})
    );
  });
});
