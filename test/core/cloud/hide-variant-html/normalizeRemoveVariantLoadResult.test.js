import { jest } from '@jest/globals';
import { normalizeRemoveVariantLoadResult } from '../../../../src/core/cloud/hide-variant-html/hide-variant-html-core.js';

describe('normalizeRemoveVariantLoadResult', () => {
  it('should return null for page and variant when loadResult is null', () => {
    expect(normalizeRemoveVariantLoadResult(null)).toEqual({
      page: null,
      variant: null,
    });
  });

  it('should return the loadResult as page and null as variant when loadResult is not an object', () => {
    expect(normalizeRemoveVariantLoadResult('test')).toEqual({
      page: 'test',
      variant: null,
    });
  });

  it('should return page and variant when they are present in loadResult', () => {
    const loadResult = { page: { id: 1 }, variant: { id: 2 } };
    expect(normalizeRemoveVariantLoadResult(loadResult)).toEqual({
      page: { id: 1 },
      variant: { id: 2 },
    });
  });

  it('should return page and null variant when variant is missing from loadResult', () => {
    const loadResult = { page: { id: 1 } };
    expect(normalizeRemoveVariantLoadResult(loadResult)).toEqual({
      page: { id: 1 },
      variant: null,
    });
  });

  it('should return null page and variant when page is missing from loadResult', () => {
    const loadResult = { variant: { id: 2 } };
    expect(normalizeRemoveVariantLoadResult(loadResult)).toEqual({
      page: null,
      variant: { id: 2 },
    });
  });

  it('should return the loadResult as page and undefined as variant when neither page nor variant are in loadResult', () => {
    const loadResult = { id: 3 };
    expect(normalizeRemoveVariantLoadResult(loadResult)).toEqual({
      page: { id: 3 },
      variant: undefined,
    });
  });
});
