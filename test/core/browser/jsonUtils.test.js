import { parseJsonOrNull } from '../../../src/core/browser/jsonUtils.js';

describe('json utility facade', () => {
  it('re-exports the shared JSON parser behavior', () => {
    expect(parseJsonOrNull('{"value": 1}')).toEqual({ value: 1 });
    expect(parseJsonOrNull('not json')).toBeNull();
  });
});
