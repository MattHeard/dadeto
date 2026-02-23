import { jest } from '@jest/globals';
import * as commonCore from '../../../src/core/commonCore.js';
import { markVariantDirtyTestUtils } from '../../../src/core/cloud/mark-variant-dirty/mark-variant-dirty-core.js';

describe('markVariantDirtyTestUtils', () => {
  afterEach(() => jest.restoreAllMocks());

  test('resolveVariantName returns empty string for undefined input', () => {
    expect(markVariantDirtyTestUtils.resolveVariantName(undefined)).toBe('');
  });

  test('resolveVariantName returns candidate when string provided', () => {
    expect(markVariantDirtyTestUtils.resolveVariantName('foo')).toBe('foo');
  });

  test('resolveVariantName falls back when input is not a string', () => {
    expect(markVariantDirtyTestUtils.resolveVariantName(42)).toBe('');
  });
});
