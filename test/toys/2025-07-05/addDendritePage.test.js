import { jest } from '@jest/globals';
import { addDendritePage } from '../../../src/core/browser/toys/2025-07-05/addDendritePage.js';

describe('addDendritePage', () => {
  const buildEnv = () => {
    const data = { temporary: { DEND2: { pages: [], options: [] } } };
    const getUuid = jest.fn(() => 'page-uuid');
    const getData = jest.fn(() => data);
    const setLocalTemporaryData = jest.fn();

    const map = new Map();
    map.set('getUuid', getUuid);
    map.set('getData', getData);
    map.set('setLocalTemporaryData', setLocalTemporaryData);

    return { map, fns: { getUuid, getData, setLocalTemporaryData } };
  };

  it('stores parsed page and options when input is valid', () => {
    const { map, fns } = buildEnv();
    const payload = JSON.stringify({
      optionId: 'opt-1',
      content: 'hello',
      firstOption: 'foo',
      secondOption: 'bar',
    });

    const result = addDendritePage(payload, map);
    const parsed = JSON.parse(result);

    expect(parsed.pages).toHaveLength(1);
    expect(parsed.pages[0]).toMatchObject({
      id: 'page-uuid',
      optionId: 'opt-1',
      content: 'hello',
    });
    expect(parsed.options).toHaveLength(2);
    expect(fns.setLocalTemporaryData).toHaveBeenCalled();
  });

  it('returns an empty payload when JSON is invalid', () => {
    const { map } = buildEnv();
    const result = addDendritePage('not json', map);
    expect(result).toBe(JSON.stringify({ pages: [], options: [] }));
  });

  it('returns an empty payload when env helpers are missing', () => {
    const map = new Map();
    map.set('getUuid', null);
    map.set('getData', null);
    map.set('setLocalTemporaryData', null);

    const result = addDendritePage('{}', map);
    expect(result).toBe(JSON.stringify({ pages: [], options: [] }));
  });

  it('returns an empty payload when callables are invalid but input is well-formed', () => {
    const map = new Map();
    map.set('getUuid', undefined);
    map.set(
      'getData',
      jest.fn(() => ({
        temporary: { DEND2: { pages: [], options: [] } },
      }))
    );
    map.set('setLocalTemporaryData', jest.fn());

    const payload = JSON.stringify({
      optionId: 'opt-2',
      content: 'hello again',
    });

    const result = addDendritePage(payload, map);
    expect(result).toBe(JSON.stringify({ pages: [], options: [] }));
  });
});
