import { describe, test, expect, jest } from '@jest/globals';
import {
  getEnvHelpers,
  ensureDend2,
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
