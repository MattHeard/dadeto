import { describe, expect, jest, test } from '@jest/globals';
import { memoryObjectListAppend } from '../../../src/core/browser/toys/2026-08-18/memoryObjectListAppend.js';

const request = (extra = {}) =>
  JSON.stringify({ path: 'items', object: { id: 'A1' }, ...extra });

describe('memoryObjectListAppend', () => {
  test.each(['temporary', 'permanent', 'envelope'])(
    'appends to %s memory',
    memoryLocation => {
      let permanent = {};
      const state = { temporary: {} };
      const env = new Map([
        ['getData', () => state],
        ['setLocalTemporaryData', next => Object.assign(state, next)],
        ['getLocalPermanentData', () => permanent],
        [
          'setLocalPermanentData',
          next => {
            permanent = next;
          },
        ],
      ]);
      const result = JSON.parse(
        memoryObjectListAppend(request({ memoryLocation }), env)
      );
      expect(result).toMatchObject({ appended: true, length: 1 });
      expect(
        (memoryLocation === 'permanent'
          ? permanent
          : memoryLocation === 'envelope'
            ? state
            : state.temporary
        ).items
      ).toEqual([{ id: 'A1' }]);
    }
  );

  test('rejects non-object values', () => {
    const result = JSON.parse(
      memoryObjectListAppend(
        JSON.stringify({ path: 'items', object: [] }),
        new Map()
      )
    );
    expect(result).toMatchObject({ appended: false });
    expect(JSON.parse(memoryObjectListAppend('', new Map()))).toMatchObject({
      appended: false,
    });
    expect(JSON.parse(memoryObjectListAppend('null', new Map()))).toMatchObject(
      { appended: false }
    );
  });

  test('reports exact request validation errors', () => {
    for (const [payload, message] of [
      [JSON.stringify({ path: 'items', object: [] }), 'An object property containing a JSON object is required.'],
      [JSON.stringify({ path: 'items', object: null }), 'An object property containing a JSON object is required.'],
      [JSON.stringify({ path: 'items', object: 'value' }), 'An object property containing a JSON object is required.'],
      [JSON.stringify({ path: '', object: {} }), 'A path is required.'],
      [JSON.stringify({ path: 'items', object: {}, memoryLocation: 'unknown' }), 'Unsupported memory location.'],
    ]) {
      expect(JSON.parse(memoryObjectListAppend(payload, new Map()))).toEqual({
        appended: false,
        error: message,
      });
    }
  });

  test('creates nested lists and rejects an existing non-list path', () => {
    const state = { temporary: { items: [{ id: 'old' }], bad: 1 } };
    const setLocalTemporaryData = jest.fn(next => Object.assign(state, next));
    const env = new Map([
      ['getData', () => state],
      ['setLocalTemporaryData', setLocalTemporaryData],
    ]);

    const nested = JSON.parse(
      memoryObjectListAppend(request({ path: 'items', object: { id: 'new' } }), env)
    );
    expect(nested).toMatchObject({ appended: true, path: 'items', length: 2 });
    expect(state.temporary.items).toEqual([{ id: 'old' }, { id: 'new' }]);

    expect(JSON.parse(memoryObjectListAppend(request({ path: 'bad' }), env))).toEqual({
      appended: false,
      error: 'Path is not a list: bad',
    });
    expect(setLocalTemporaryData).toHaveBeenCalledTimes(1);
  });

  test('uses the temporary default and clones envelope fallback data', () => {
    const state = {};
    const setLocalTemporaryData = jest.fn(next => Object.assign(state, next));
    const env = new Map([
      ['getData', () => undefined],
      ['setLocalTemporaryData', setLocalTemporaryData],
    ]);
    const result = JSON.parse(memoryObjectListAppend(request(), env));
    expect(result).toMatchObject({ memoryLocation: 'temporary', length: 1 });
    expect(state.temporary.items).toEqual([{ id: 'A1' }]);
    expect(setLocalTemporaryData).toHaveBeenCalledTimes(1);
  });

  test('normalizes truthy and padded paths without losing the requested value', () => {
    const state = { temporary: {} };
    const env = new Map([
      ['getData', () => state],
      ['setLocalTemporaryData', next => Object.assign(state, next)],
    ]);
    expect(
      JSON.parse(memoryObjectListAppend(request({ path: '  items  ' }), env))
    ).toMatchObject({ path: 'items', appended: true });
    expect(
      JSON.parse(memoryObjectListAppend(request({ path: 7 }), env))
    ).toMatchObject({ path: '7', appended: true });
  });

  test('uses the dedicated permanent and envelope helpers', () => {
    const permanent = {};
    const envelope = { temporary: {} };
    const getPermanent = jest.fn(() => permanent);
    const setPermanent = jest.fn(next => Object.assign(permanent, next));
    const getData = jest.fn(() => envelope);
    const setTemporary = jest.fn(next => Object.assign(envelope, next));
    const env = new Map([
      ['getLocalPermanentData', getPermanent],
      ['setLocalPermanentData', setPermanent],
      ['getData', getData],
      ['setLocalTemporaryData', setTemporary],
    ]);

    expect(JSON.parse(memoryObjectListAppend(request({ memoryLocation: 'permanent' }), env))).toMatchObject({
      memoryLocation: 'permanent',
      appended: true,
    });
    expect(setPermanent).toHaveBeenCalledTimes(1);
    expect(JSON.parse(memoryObjectListAppend(request({ memoryLocation: 'envelope' }), env))).toMatchObject({
      memoryLocation: 'envelope',
      appended: true,
    });
    expect(setTemporary).toHaveBeenCalledTimes(1);
    expect(getPermanent).toHaveBeenCalledTimes(1);
    expect(getData).toHaveBeenCalledTimes(1);

    const distinctEnvelope = {
      temporary: { items: [{ id: 'temporary' }] },
      items: [{ id: 'envelope' }],
    };
    const distinctEnv = new Map([
      ['getData', () => distinctEnvelope],
      ['setLocalTemporaryData', next => Object.assign(distinctEnvelope, next)],
    ]);
    expect(
      JSON.parse(memoryObjectListAppend(request({ memoryLocation: 'envelope' }), distinctEnv))
    ).toMatchObject({ appended: true, memoryLocation: 'envelope', length: 2 });
    expect(distinctEnvelope.items).toHaveLength(2);
    expect(distinctEnvelope.temporary.items).toHaveLength(1);

    const emptyPermanent = new Map([
      ['getLocalPermanentData', () => null],
      ['setLocalPermanentData', setPermanent],
    ]);
    expect(
      JSON.parse(memoryObjectListAppend(request({ memoryLocation: 'permanent' }), emptyPermanent))
    ).toMatchObject({ appended: true, length: 1 });
    expect(envelope.items).toEqual([{ id: 'A1' }]);
  });
});
