import { describe, expect, test } from '@jest/globals';
import { memoryObjectListAppend } from '../../../src/core/browser/toys/2026-08-18/memoryObjectListAppend.js';

const request = (extra = {}) =>
  JSON.stringify({ path: 'items', object: { id: 'A1' }, ...extra });

describe('memoryObjectListAppend', () => {
  test.each(['temporary', 'permanent', 'envelope'])('appends to %s memory', memoryLocation => {
    let permanent = {};
    const state = { temporary: {} };
    const env = new Map([
      ['getData', () => state],
      ['setLocalTemporaryData', next => Object.assign(state, next)],
      ['getLocalPermanentData', () => permanent],
      ['setLocalPermanentData', next => { permanent = next; }],
    ]);
    const result = JSON.parse(memoryObjectListAppend(request({ memoryLocation }), env));
    expect(result).toMatchObject({ appended: true, length: 1 });
    expect((memoryLocation === 'permanent' ? permanent : memoryLocation === 'envelope' ? state : state.temporary).items).toEqual([{ id: 'A1' }]);
  });

  test('rejects non-object values', () => {
    const result = JSON.parse(memoryObjectListAppend(JSON.stringify({ path: 'items', object: [] }), new Map()));
    expect(result).toMatchObject({ appended: false });
  });
});
