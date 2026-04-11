import { describe, expect, it } from '@jest/globals';
import { parseIncomingOption } from '../../../../src/core/cloud/submit-new-page/submit-new-page-core.js';

describe('parseIncomingOption', () => {
  it('parses a valid incoming option string', () => {
    expect(parseIncomingOption('12-Alpha-34')).toEqual({
      pageNumber: 12,
      variantName: 'Alpha',
      optionNumber: 34,
    });
  });

  it('rejects variant tokens that start with a non-letter', () => {
    expect(parseIncomingOption('12-1Alpha-34')).toBeNull();
  });

  it('rejects three-part options with invalid numeric fields', () => {
    expect(parseIncomingOption('12-Alpha-3.4')).toBeNull();
    expect(parseIncomingOption('12-Alpha-xx')).toBeNull();
  });

  it('rejects malformed option strings with repeated separators', () => {
    expect(parseIncomingOption('12--Alpha-34')).toEqual({
      pageNumber: 12,
      variantName: 'Alpha',
      optionNumber: 34,
    });
    expect(parseIncomingOption('12___Alpha--34')).toEqual({
      pageNumber: 12,
      variantName: 'Alpha',
      optionNumber: 34,
    });
  });

  it('rejects option strings with too many parts', () => {
    expect(parseIncomingOption('12-Alpha-34-extra')).toBeNull();
  });
});
