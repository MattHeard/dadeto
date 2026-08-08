import { parseJsonObject } from '../../../src/core/browser/jsonValueHelpers.js';

describe('JSON value helper facade', () => {
  it('forwards object parsing and rejects invalid or non-object values', () => {
    expect(parseJsonObject('{"value": 1}')).toEqual({ value: 1 });
    expect(parseJsonObject('[1, 2]')).toEqual([1, 2]);
    expect(parseJsonObject('invalid')).toBeNull();
  });
});
