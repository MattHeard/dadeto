import { describe, test, expect } from '@jest/globals';
import { getVisibleVariants } from '../../infra/cloud-functions/render-variant/visibility.js';

describe('getVisibleVariants', () => {
  test('excludes variants below visibility threshold', () => {
    const docs = [
      { data: () => ({ name: 'a', content: 'A', visibility: 0.6 }) },
      { data: () => ({ name: 'b', content: 'B', visibility: 0.4 }) },
    ];
    const variants = getVisibleVariants(docs);
    expect(variants).toEqual([{ name: 'a', content: 'A' }]);
  });
});
