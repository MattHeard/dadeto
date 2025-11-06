import { describe, test, expect } from '@jest/globals';
import { getVisibleVariants } from '../../src/core/cloud/render-variant/render-variant-core.js';

describe('getVisibleVariants', () => {
  test('excludes variants below visibility threshold', () => {
    const docs = [
      { data: () => ({ name: 'a', content: 'A', visibility: 0.6 }) },
      { data: () => ({ name: 'b', content: 'B', visibility: 0.4 }) },
    ];
    const variants = getVisibleVariants(docs);
    expect(variants).toEqual([{ name: 'a', content: 'A' }]);
  });

  test('defaults missing visibility to 1.0', () => {
    const docs = [
      { data: () => ({ name: 'a', content: 'A' }) },
      { data: () => ({ name: 'b', content: 'B', visibility: 0.4 }) },
    ];
    const variants = getVisibleVariants(docs);
    expect(variants).toEqual([{ name: 'a', content: 'A' }]);
  });

  test('includes variants exactly at the threshold and normalizes fields', () => {
    const docs = [
      {
        data: () => ({ name: undefined, content: undefined, visibility: 0.5 }),
      },
      { data: () => ({ name: 'c', content: 'C', visibility: 0.49 }) },
    ];

    expect(getVisibleVariants(docs)).toEqual([{ name: '', content: '' }]);
  });
});
