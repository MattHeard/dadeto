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
    const { map, fns } = buildEnv();
    const result = addDendritePage('not json', map);
    const parsed = JSON.parse(result);

    expect(parsed.pages).toHaveLength(0);
    expect(parsed.options).toHaveLength(0);
    expect(fns.setLocalTemporaryData).not.toHaveBeenCalled();
  });
});
