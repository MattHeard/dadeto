import { describe, expect, it } from '@jest/globals';
import { recordFromKeys } from '../../../../src/core/browser/game/neon-covenant/recordFromKeys.js';

describe('recordFromKeys', () => {
  it('creates one value for each key', () => {
    expect(
      recordFromKeys(['north', 'south'], key => ({ direction: key }))
    ).toEqual({
      north: { direction: 'north' },
      south: { direction: 'south' },
    });
  });
});
