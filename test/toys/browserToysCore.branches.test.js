import { describe, test, expect, jest } from '@jest/globals';
import {
  getEnvHelpers,
  ensureDend2,
  runToyWithFallback,
  runToyWithParsedJson,
  requireEnvHelper,
  getOptionalEnvHelper,
  parseToyRecord,
  createTemporaryToyEnvelope,
  uniqueByKey,
  parseJsonOrFallback,
  isPlainObject,
  isPlainPrototypeObject,
  toRecordOrNull,
  createOptions,
  cloneTemporaryDend2Data,
  appendPageAndOptions,
  appendPageAndSave,
  buildPageResponse,
  isValidStoryInput,
  isValidPageInput,
  buildEmptyDendritePageResponse,
  buildEmptyDendriteStoryResponse,
  persistDendritePage,
  persistDendriteStory,
} from '../../src/core/browser/toys/browserToysCore.js';

test.each([
  [undefined, false],
  [null, false],
  [false, false],
  [0, false],
  ['', false],
  [42, false],
  [() => {}, false],
  [[], false],
  [new Date(0), false],
  [Object.create(null), false],
  [{}, true],
  [{ constructor: null }, true],
])('prototype record policy accepts %p as %p', (value, expected) => {
  expect(isPlainPrototypeObject(value)).toBe(expected);
});

test('keyed uniqueness retains first identity and order while projecting every entry', () => {
  const values = [{ id: 'b' }, { id: 'a' }, { id: 'b' }];
  const keyFor = jest.fn(value => value.id);
  const result = uniqueByKey(values, keyFor);
  expect(result).toEqual([values[0], values[1]]);
  expect(result[0]).toBe(values[0]);
  expect(result[1]).toBe(values[1]);
  expect(keyFor.mock.calls).toEqual(values.map(value => [value]));
  expect(uniqueByKey([], value => value)).toEqual([]);
  expect(uniqueByKey([NaN, NaN, 0, -0], value => value)).toEqual([NaN, 0]);
  const sparse = new Array(2);
  const project = jest.fn(value => value);
  expect(uniqueByKey(sparse, project)).toEqual([undefined]);
  expect(project).toHaveBeenCalledTimes(2);
});

test('temporary toy envelopes retain the exact state under an own storage key', () => {
  const state = { inventory: ['tea'], progress: [] };
  for (const key of ['COZY1', 'CYBE1', '__proto__']) {
    const envelope = createTemporaryToyEnvelope(key, state);
    expect(Object.keys(envelope)).toEqual(['temporary']);
    expect(Object.keys(envelope.temporary)).toEqual([key]);
    expect(Object.hasOwn(envelope.temporary, key)).toBe(true);
    expect(envelope.temporary[key]).toBe(state);
    expect(Object.getPrototypeOf(envelope.temporary)).toBe(Object.prototype);
    expect(createTemporaryToyEnvelope(key, state)).not.toBe(envelope);
  }
});

describe('optional environment lookup', () => {
  test('keeps callable identity and performs a single lookup without invoking it', () => {
    const helper = jest.fn();
    const env = { get: jest.fn(() => helper) };
    expect(getOptionalEnvHelper(env, 'read')).toBe(helper);
    expect(env.get.mock.calls).toEqual([['read']]);
    expect(helper).not.toHaveBeenCalled();
  });
  test('returns null for non-callable entries and preserves required error text', () => {
    for (const value of [undefined, null, false, 0, '', {}, []]) {
      const env = new Map([['read', value]]);
      expect(getOptionalEnvHelper(env, 'read')).toBeNull();
      expect(() => requireEnvHelper(env, 'read')).toThrow(
        'Missing toy helper "read"'
      );
    }
  });
  test('does not swallow accessor errors in either lookup policy', () => {
    const failure = new Error('access denied');
    const env = {
      get: () => {
        throw failure;
      },
    };
    expect(() => getOptionalEnvHelper(env, 'read')).toThrow(failure);
    expect(() => requireEnvHelper(env, 'read')).toThrow(failure);
  });
});

describe('record request boundary', () => {
  test('property getter failures produce fresh schema fallbacks', () => {
    const record = Object.defineProperty({}, 'items', {
      get() {
        throw new Error('denied');
      },
    });
    const parse = jest.spyOn(JSON, 'parse').mockReturnValue(record);
    try {
      expect(parseToyRecord('{}', value => value.items, ['items'])).toEqual({
        items: [],
      });
    } finally {
      parse.mockRestore();
    }
  });
  test('normalizes only records and builds fresh fallback values', () => {
    const normalize = jest.fn(record => ({ items: record.items }));
    const fallback = ['items'];
    expect(parseToyRecord('{"items":[1]}', normalize, fallback)).toEqual({
      items: [1],
    });
    for (const input of ['{', 'null', '[]', '0', 'false', '"text"']) {
      const first = parseToyRecord(input, normalize, fallback);
      const second = parseToyRecord(input, normalize, fallback);
      expect(first).toEqual({ items: [] });
      expect(second.items).not.toBe(first.items);
    }
    expect(normalize).toHaveBeenCalledTimes(1);
    expect(parseToyRecord('{}', normalize, fallback)).toEqual({
      items: undefined,
    });
  });
  test('keeps normalization and property access inside the failure boundary', () => {
    const fallback = ['failed'];
    expect(
      parseToyRecord(
        '{}',
        () => {
          throw new Error('bad record');
        },
        fallback
      )
    ).toEqual({ failed: [] });
  });
});

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
  test('JSON fallback defaults to null and preserves valid parsed values', () => {
    expect(parseJsonOrFallback('invalid JSON')).toBeNull();
    expect(parseJsonOrFallback('null')).toBeNull();
    expect(parseJsonOrFallback('{"items":[]}')).toEqual({ items: [] });
  });
  test('returns early when TRAN1 already contains a valid structure', () => {
    const tran1 = { stories: [], pages: [], options: [] };
    const data = {
      temporary: {
        TRAN1: tran1,
        get DEND2() {
          throw new Error('valid primary data must not read legacy storage');
        },
      },
    };
    ensureDend2(data);
    expect(data.temporary.TRAN1).toBe(tran1);
  });

  test('migrates valid legacy data and replaces invalid structures', () => {
    const legacy = { stories: [{}], pages: [], options: [] };
    const migrated = { temporary: { DEND2: legacy } };
    ensureDend2(migrated);
    expect(migrated.temporary.TRAN1).toBe(legacy);
    expect(migrated.temporary.TRAN1.stories).toBe(legacy.stories);
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
    expect(
      runToyWithFallback('input', () => undefined, 'fallback')
    ).toBeUndefined();
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

describe('browser toy persistence and payload helpers', () => {
  test('validates payloads and builds empty responses', () => {
    expect(isValidStoryInput({ title: 'T', content: 'C' })).toBe(true);
    expect(isValidStoryInput({ title: '', content: 'C' })).toBe(false);
    expect(isValidStoryInput(null)).toBe(false);
    expect(isValidPageInput({ optionId: 'O', content: 'C' })).toBe(true);
    expect(isValidPageInput({ optionId: 'O', content: '' })).toBe(false);
    expect(isValidPageInput(null)).toBe(false);
    expect(JSON.parse(buildEmptyDendritePageResponse())).toEqual({
      pages: [],
      options: [],
    });
    expect(JSON.parse(buildEmptyDendriteStoryResponse())).toEqual({
      stories: [],
      pages: [],
      options: [],
    });
    expect(buildPageResponse(undefined, [{ id: 'o' }])).toEqual({
      pages: [],
      options: [{ id: 'o' }],
    });
    expect(buildPageResponse({ id: 'p' }, [])).toEqual({
      pages: [{ id: 'p' }],
      options: [],
    });
  });

  test('clones, appends, saves, and persists page data', () => {
    const source = {
      temporary: { DEND2: { stories: [], pages: [], options: [] } },
    };
    const saved = jest.fn();
    const cloned = cloneTemporaryDend2Data(() => source);
    expect(cloned).not.toBe(source);
    appendPageAndOptions(cloned, { id: 'p' }, [{ id: 'o' }]);
    expect(cloned.temporary.TRAN1.pages).toEqual([{ id: 'p' }]);
    appendPageAndSave(cloned, {
      page: { id: 'p2' },
      opts: [],
      setLocalTemporaryData: saved,
    });
    expect(saved).toHaveBeenCalledWith(cloned);

    let uuid = 0;
    const env = new Map([
      ['getUuid', () => `id-${++uuid}`],
      ['getData', () => source],
      ['setLocalTemporaryData', saved],
    ]);
    const pageResult = JSON.parse(
      persistDendritePage(
        { optionId: 'O', content: 'C', firstOption: 'One' },
        env
      )
    );
    expect(pageResult.pages[0]).toMatchObject({ optionId: 'O', content: 'C' });
    const storyResult = JSON.parse(
      persistDendriteStory(
        { title: 'T', content: 'C', firstOption: 'One' },
        env
      )
    );
    expect(storyResult.stories[0]).toEqual({ id: 'id-3', title: 'T' });
    expect(storyResult.pages[0]).toMatchObject({
      id: 'id-4',
      storyId: 'id-3',
      content: 'C',
    });
    expect(storyResult.options[0]).toMatchObject({
      content: 'One',
      pageId: 'id-4',
    });
    const persisted = saved.mock.lastCall[0];
    expect(persisted.temporary.TRAN1.stories).toContainEqual({
      id: 'id-3',
      title: 'T',
    });
    expect(persisted.temporary.TRAN1.pages).toContainEqual({
      id: 'id-4',
      storyId: 'id-3',
      content: 'C',
    });
    expect(saved).toHaveBeenCalled();
  });
});
