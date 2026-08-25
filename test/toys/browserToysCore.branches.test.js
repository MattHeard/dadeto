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
