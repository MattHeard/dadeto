import { describe, test, expect, jest } from '@jest/globals';
import {
  getEnvHelpers,
  ensureDend2,
  runToyWithFallback,
  runToyWithParsedJson,
  requireEnvHelper,
  parseJsonOrFallback,
  isPlainObject,
  toRecordOrNull,
  createOptions,
} from '../../src/core/browser/toys/browserToysCore.js';

describe('getEnvHelpers', () => {
  test('throws when a required helper is missing from env', () => {
    const env = new Map([
      ['getData', jest.fn()],
      ['setLocalTemporaryData', jest.fn()],
      // getUuid intentionally omitted
    ]);
    expect(() => getEnvHelpers(env)).toThrow('Missing toy helper "getUuid"');
  });

  test('returns each required helper when all are functions', () => {
    const helpers = {
      getUuid: jest.fn(() => 'uuid'),
      getData: jest.fn(() => ({})),
      setLocalTemporaryData: jest.fn(),
    };
    const result = getEnvHelpers(new Map(Object.entries(helpers)));
    expect(result.getUuid).toBe(helpers.getUuid);
    expect(result.getData).toBe(helpers.getData);
    expect(result.setLocalTemporaryData).toBe(helpers.setLocalTemporaryData);
    expect(
      requireEnvHelper(new Map([['helper', helpers.getUuid]]), 'helper')
    ).toBe(helpers.getUuid);
  });
});

describe('ensureDend2', () => {
  test('returns early when TRAN1 already contains a valid structure', () => {
    const tran1 = { stories: [], pages: [], options: [] };
    const data = { temporary: { TRAN1: tran1 } };
    ensureDend2(data);
    expect(data.temporary.TRAN1).toBe(tran1);
  });

  test('migrates valid legacy data and replaces invalid structures', () => {
    const legacy = { stories: [{}], pages: [], options: [] };
    const migrated = { temporary: { DEND2: legacy } };
    ensureDend2(migrated);
    expect(migrated.temporary.TRAN1).toBe(legacy);
    const invalid = { temporary: { TRAN1: { stories: [] } } };
    ensureDend2(invalid);
    expect(invalid.temporary.TRAN1).toEqual({
      stories: [],
      pages: [],
      options: [],
    });
    const empty = {};
    ensureDend2(empty);
    expect(empty.temporary.TRAN1).toEqual({
      stories: [],
      pages: [],
      options: [],
    });
  });
});

describe('browser toy value helpers', () => {
  test('validates records and parses with fallbacks', () => {
    expect(parseJsonOrFallback('{"ok":true}', {})).toEqual({ ok: true });
    expect(parseJsonOrFallback('bad', { fallback: true })).toEqual({
      fallback: true,
    });
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(toRecordOrNull({ id: 1 }, value => isPlainObject(value))).toEqual({
      id: 1,
    });
    expect(toRecordOrNull('no', value => isPlainObject(value))).toBeNull();
    expect(
      createOptions(
        { firstOption: 'One', secondOption: '', thirdOption: 3 },
        () => 'id',
        'page'
      )
    ).toEqual([{ id: 'id', content: 'One', pageId: 'page' }]);
    const withoutPage = createOptions({ firstOption: 'One' }, () => 'id');
    expect(withoutPage).toEqual([{ id: 'id', content: 'One' }]);
    expect(Object.hasOwn(withoutPage[0], 'pageId')).toBe(false);
  });
});

describe('runToy helpers', () => {
  test('runToyWithFallback returns the handler result or fallback', () => {
    expect(runToyWithFallback('input', value => value.toUpperCase())).toBe(
      'INPUT'
    );
    expect(
      runToyWithFallback(
        'input',
        () => {
          throw new Error('boom');
        },
        JSON.stringify({})
      )
    ).toBe(JSON.stringify({}));
  });

  test('runToyWithParsedJson parses JSON before calling the handler', () => {
    expect(
      runToyWithParsedJson('{"title":"Draft"}', parsed => parsed.title)
    ).toBe('Draft');
    expect(runToyWithParsedJson('not-json', () => 'unreachable')).toBe(
      JSON.stringify({})
    );
  });
});
