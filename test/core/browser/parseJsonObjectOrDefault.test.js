import { describe, expect, it } from '@jest/globals';
import { parseJsonObjectOrDefault } from '../../../src/core/browser/parseJsonObjectOrDefault.js';

describe('parseJsonObjectOrDefault', () => {
  it('returns parsed non-array objects', () => {
    const result = parseJsonObjectOrDefault('{"enabled":true,"count":2}');

    expect(result).toEqual({ enabled: true, count: 2 });
  });

  it.each(['not json', 'null', 'true', '42', '"text"', '[]', '[1,2]'])(
    'returns an empty object for non-object JSON: %s',
    input => {
      expect(parseJsonObjectOrDefault(input)).toEqual({});
    }
  );
});
