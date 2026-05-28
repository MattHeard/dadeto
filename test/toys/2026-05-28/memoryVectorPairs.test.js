import { describe, expect, test } from '@jest/globals';
import {
  memoryVectorPairs,
  memoryVectorPairsTestOnly,
} from '../../../src/core/browser/toys/2026-05-28/memoryVectorPairs.js';

describe('memoryVectorPairs', () => {
  test('defaults to temporary storage with a blank input string', () => {
    const env = new Map([
      [
        'getData',
        () => ({
          temporary: {
            bucket: 'sky',
          },
        }),
      ],
    ]);

    expect(JSON.parse(memoryVectorPairs('', env))).toEqual({
      memoryLocation: 'temporary',
      path: '',
      found: true,
      vector: [
        {
          key: 'bucket',
          value: 'sky',
        },
      ],
    });
  });

  test('reads temporary storage by default and wraps scalar values in a vector', () => {
    const env = new Map([
      [
        'getData',
        () => ({
          temporary: {
            profile: {
              name: 'Ada',
            },
          },
        }),
      ],
    ]);

    expect(JSON.parse(memoryVectorPairs('profile.name', env))).toEqual({
      memoryLocation: 'temporary',
      path: 'profile.name',
      found: true,
      vector: ['Ada'],
    });
  });

  test('projects objects as vectors of key-value pairs', () => {
    const env = new Map([
      [
        'getData',
        () => ({
          temporary: {
            profile: {
              name: 'Ada',
              active: true,
            },
          },
        }),
      ],
    ]);

    expect(JSON.parse(memoryVectorPairs('profile', env))).toEqual({
      memoryLocation: 'temporary',
      path: 'profile',
      found: true,
      vector: [
        { key: 'name', value: 'Ada' },
        { key: 'active', value: true },
      ],
    });
  });

  test('accepts a JSON config that selects permanent storage and preserves arrays', () => {
    const env = new Map([
      [
        'getLocalPermanentData',
        () => ({
          inventory: {
            slots: [['tea', 'book'], ['blanket']],
          },
        }),
      ],
    ]);

    expect(
      JSON.parse(
        memoryVectorPairs(
          JSON.stringify({
            memoryLocation: 'permanent',
            key: 'inventory.slots',
          }),
          env
        )
      )
    ).toEqual({
      memoryLocation: 'permanent',
      path: 'inventory.slots',
      found: true,
      vector: [['tea', 'book'], ['blanket']],
    });
  });

  test('reads the full envelope when requested and resolves nested paths', () => {
    const env = new Map([
      [
        'getData',
        () => ({
          temporary: {
            memory: {
              values: [1, 2, 3],
            },
          },
          other: true,
        }),
      ],
    ]);

    expect(
      JSON.parse(
        memoryVectorPairs(
          JSON.stringify({
            memoryLocation: 'envelope',
            path: 'temporary.memory.values.1',
          }),
          env
        )
      )
    ).toEqual({
      memoryLocation: 'envelope',
      path: 'temporary.memory.values.1',
      found: true,
      vector: [2],
    });
  });

  test('returns a structured error for unsupported memory locations', () => {
    const env = new Map();
    expect(
      JSON.parse(
        memoryVectorPairs(
          JSON.stringify({
            memoryLocation: 'moon',
            path: 'anything',
          }),
          env
        )
      )
    ).toEqual({
      memoryLocation: 'moon',
      path: 'anything',
      found: false,
      vector: [],
      error:
        'Unsupported memoryLocation "moon". Supported locations: temporary, permanent, envelope.',
    });
  });

  test('returns a structured error when the requested helper is missing', () => {
    const env = new Map();
    expect(
      JSON.parse(
        memoryVectorPairs(
          JSON.stringify({
            memoryLocation: 'permanent',
            path: 'inventory',
          }),
          env
        )
      )
    ).toEqual({
      memoryLocation: 'permanent',
      path: 'inventory',
      found: false,
      vector: [],
      error: 'Missing toy helper "getLocalPermanentData"',
    });
  });

  test('returns a structured error for malformed JSON objects', () => {
    const env = new Map();
    expect(JSON.parse(memoryVectorPairs('[]', env))).toEqual({
      memoryLocation: 'temporary',
      path: '',
      found: false,
      vector: [],
      error: 'Input must be a JSON object or a string path.',
    });
  });

  test('returns a structured error when the requested path is missing', () => {
    const env = new Map([
      [
        'getData',
        () => ({
          temporary: {
            profile: {
              name: 'Ada',
            },
          },
        }),
      ],
    ]);

    expect(JSON.parse(memoryVectorPairs('profile.missing', env))).toEqual({
      memoryLocation: 'temporary',
      path: 'profile.missing',
      found: false,
      vector: [],
      error:
        "Error: Path segment 'missing' not found at 'profile.missing'. Available keys/indices: name",
    });
  });

  test('formats thrown string values into a readable error payload', () => {
    const env = new Map([
      [
        'getData',
        () => {
          throw 'temporary storage unavailable';
        },
      ],
    ]);

    expect(JSON.parse(memoryVectorPairs('profile.name', env))).toEqual({
      memoryLocation: 'temporary',
      path: 'profile.name',
      found: false,
      vector: [],
      error: 'temporary storage unavailable',
    });
  });
});

describe('memoryVectorPairs helpers', () => {
  test('normalizes location and path values', () => {
    expect(
      memoryVectorPairsTestOnly.normalizeMemoryLocation(' permanent ')
    ).toBe('permanent');
    expect(memoryVectorPairsTestOnly.normalizeMemoryLocation(123)).toBe(
      'temporary'
    );
    expect(memoryVectorPairsTestOnly.normalizeMemoryPath(' items.0 ')).toBe(
      'items.0'
    );
    expect(memoryVectorPairsTestOnly.normalizeMemoryPath(123)).toBe('');
  });

  test('parses raw strings, JSON strings, and bad object values', () => {
    expect(
      memoryVectorPairsTestOnly.parseMemoryVectorRequest(undefined)
    ).toEqual({
      memoryLocation: 'temporary',
      path: '',
    });
    expect(
      memoryVectorPairsTestOnly.parseMemoryVectorRequest('  profile.name  ')
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile.name',
    });
    expect(
      memoryVectorPairsTestOnly.parseMemoryVectorRequest(
        JSON.stringify('temporary.memory.values')
      )
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'temporary.memory.values',
    });
    expect(
      memoryVectorPairsTestOnly.parseMemoryVectorRequest(
        JSON.stringify({ memoryLocation: 'envelope', key: 'temporary' })
      )
    ).toEqual({
      memoryLocation: 'envelope',
      path: 'temporary',
    });
    expect(memoryVectorPairsTestOnly.parseMemoryVectorRequest('[]')).toEqual({
      memoryLocation: 'temporary',
      path: '',
      error: 'Input must be a JSON object or a string path.',
    });
  });

  test('projects scalars, arrays, and objects as vectors', () => {
    expect(memoryVectorPairsTestOnly.projectToVector('tea')).toEqual(['tea']);
    expect(memoryVectorPairsTestOnly.projectToVector([1, 2])).toEqual([1, 2]);
    expect(
      memoryVectorPairsTestOnly.projectToVector({
        bucket: 'sky',
        count: 2,
      })
    ).toEqual([
      { key: 'bucket', value: 'sky' },
      { key: 'count', value: 2 },
    ]);
  });

  test('resolves temporary, permanent, and envelope roots and reports invalid roots', () => {
    expect(
      memoryVectorPairsTestOnly.readTemporaryMemoryRoot(
        new Map([['getData', () => ({})]])
      )
    ).toEqual({ root: {} });

    expect(
      memoryVectorPairsTestOnly.readTemporaryMemoryRoot(
        new Map([['getData', () => ({ temporary: { note: 'hello' } })]])
      )
    ).toEqual({ root: { note: 'hello' } });

    expect(
      memoryVectorPairsTestOnly.readTemporaryMemoryRoot(
        new Map([['getData', () => null]])
      )
    ).toEqual({
      error: "Error: 'getData' did not return a valid object or array.",
    });

    expect(
      memoryVectorPairsTestOnly.readPermanentMemoryRoot(
        new Map([['getLocalPermanentData', () => ({ saved: true })]])
      )
    ).toEqual({ root: { saved: true } });

    expect(
      memoryVectorPairsTestOnly.readPermanentMemoryRoot(
        new Map([['getLocalPermanentData', () => 42]])
      )
    ).toEqual({
      error:
        "Error: 'getLocalPermanentData' did not return a valid object or array.",
    });

    expect(
      memoryVectorPairsTestOnly.readEnvelopeMemoryRoot(
        new Map([['getData', () => ({ temporary: {} })]])
      )
    ).toEqual({ root: { temporary: {} } });

    expect(
      memoryVectorPairsTestOnly.readEnvelopeMemoryRoot(
        new Map([['getData', () => 'nope']])
      )
    ).toEqual({
      error: "Error: 'getData' did not return a valid object or array.",
    });

    expect(
      memoryVectorPairsTestOnly.readMemoryRoot('unknown', new Map())
    ).toEqual({
      error:
        'Unsupported memoryLocation "unknown". Supported locations: temporary, permanent, envelope.',
    });
  });

  test('resolves paths and surfaces lookup failures', () => {
    expect(
      memoryVectorPairsTestOnly.readMemoryPath(
        {
          user: {
            name: 'Ada',
            nickname: undefined,
            tags: ['tea', 'books'],
          },
        },
        'user.name'
      )
    ).toEqual({ value: 'Ada' });

    expect(
      memoryVectorPairsTestOnly.readMemoryPath(
        {
          user: {
            name: 'Ada',
            nickname: undefined,
            tags: ['tea', 'books'],
          },
        },
        'user.tags'
      )
    ).toEqual({ value: ['tea', 'books'] });

    expect(
      memoryVectorPairsTestOnly.readMemoryPath(
        {
          user: {
            name: 'Ada',
          },
        },
        'user.missing'
      )
    ).toEqual({
      error:
        "Error: Path segment 'missing' not found at 'user.missing'. Available keys/indices: name",
    });

    expect(
      memoryVectorPairsTestOnly.readMemoryPath(
        {
          user: {
            name: 'Ada',
            nickname: undefined,
            tags: ['tea', 'books'],
          },
        },
        'user.nickname'
      )
    ).toEqual({ value: undefined });
  });
});
