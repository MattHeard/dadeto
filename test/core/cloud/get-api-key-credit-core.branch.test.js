import { getApiKeyCreditTestUtils } from '../../../src/core/cloud/get-api-key-credit/get-api-key-credit-core.js';

describe('getApiKeyCreditTestUtils', () => {
  test('mapCreditToResponse returns not found for null', () => {
    const result = getApiKeyCreditTestUtils.mapCreditToResponse(null);
    expect(result.status).toBe(404);
  });

  test('mapCreditToResponse returns internal error for undefined', () => {
    const result = getApiKeyCreditTestUtils.mapCreditToResponse(undefined);
    expect(result.status).toBe(500);
  });

  test('mapCreditToResponse returns credit payload for numbers', () => {
    const result = getApiKeyCreditTestUtils.mapCreditToResponse(5);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ credit: 5 });
  });

  test('getSpecialCreditResponse falls back to success when number is supplied', () => {
    const result = getApiKeyCreditTestUtils.getSpecialCreditResponse(0);
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ credit: 0 });
  });

  test('getSpecialCreditResponse returns not found for null', () => {
    const result = getApiKeyCreditTestUtils.getSpecialCreditResponse(null);
    expect(result.status).toBe(404);
    expect(result.body).toBe('Not found');
  });

  test('getSpecialCreditResponse returns internal error for undefined', () => {
    const result = getApiKeyCreditTestUtils.getSpecialCreditResponse(undefined);
    expect(result.status).toBe(500);
    expect(result.body).toBe('Internal error');
  });
});
