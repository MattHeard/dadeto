import { describe, expect, test } from '@jest/globals';
import {
  buildMemoryVectorResponse,
  buildMemoryVectorResponseFromRootResult,
  buildResolvedMemoryVectorResponse,
  buildResolvedMemoryVectorResponseFromPath,
  buildResolvedMemoryVectorResponseFromValue,
  memoryVector,
  memoryVectorTestOnly,
} from '../../../src/core/browser/toys/2026-05-28/memoryVector.js';

describe('memoryVector', () => {
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

    expect(JSON.parse(memoryVector('', env))).toEqual({
      memoryLocation: 'temporary',
      path: '',
      found: true,
      vector: [
        {
          bucket: 'sky',
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

    expect(JSON.parse(memoryVector('profile.name', env))).toEqual({
      memoryLocation: 'temporary',
      path: 'profile.name',
      found: true,
      vector: ['Ada'],
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
        memoryVector(
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
        memoryVector(
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
        memoryVector(
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
        memoryVector(
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
    expect(JSON.parse(memoryVector('[]', env))).toEqual({
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

    expect(JSON.parse(memoryVector('profile.missing', env))).toEqual({
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

    expect(JSON.parse(memoryVector('profile.name', env))).toEqual({
      memoryLocation: 'temporary',
      path: 'profile.name',
      found: false,
      vector: [],
      error: 'temporary storage unavailable',
    });
  });
});

describe('memoryVector helpers', () => {
  test('normalizes location and path values', () => {
    expect(memoryVectorTestOnly.normalizeMemoryLocation(' permanent ')).toBe(
      'permanent'
    );
    expect(memoryVectorTestOnly.normalizeMemoryLocation(123)).toBe('temporary');
    expect(memoryVectorTestOnly.normalizeMemoryPath(' items.0 ')).toBe(
      'items.0'
    );
    expect(memoryVectorTestOnly.normalizeMemoryPath(123)).toBe('');
  });

  test('parses raw strings, JSON strings, and bad object values', () => {
    expect(memoryVectorTestOnly.parseMemoryVectorRequest(undefined)).toEqual({
      memoryLocation: 'temporary',
      path: '',
    });
    expect(
      memoryVectorTestOnly.parseMemoryVectorRequest('  profile.name  ')
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile.name',
    });
    expect(
      memoryVectorTestOnly.parseMemoryVectorRequest(
        JSON.stringify('temporary.memory.values')
      )
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'temporary.memory.values',
    });
    expect(
      memoryVectorTestOnly.parseMemoryVectorRequest(
        JSON.stringify({ memoryLocation: 'envelope', key: 'temporary' })
      )
    ).toEqual({
      memoryLocation: 'envelope',
      path: 'temporary',
    });
    expect(memoryVectorTestOnly.parseMemoryVectorRequest('[]')).toEqual({
      memoryLocation: 'temporary',
      path: '',
      error: 'Input must be a JSON object or a string path.',
    });
  });

  test('returns root and path lookup errors for undefined helper results', () => {
    expect(
      memoryVectorTestOnly.buildMemoryVectorResponseFromRoot(
        { memoryLocation: 'temporary', path: 'profile' },
        undefined
      )
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile',
      found: false,
      vector: [],
      error: 'Error: Memory root lookup returned no value.',
    });

    expect(
      memoryVectorTestOnly.buildResolvedMemoryVectorResponseFromValue(
        { memoryLocation: 'temporary', path: 'profile' },
        undefined
      )
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile',
      found: false,
      vector: [],
      error: 'Error: Memory path resolution returned no value.',
    });
  });

  test('supports custom projection and path-error handlers in the shared helpers', () => {
    const request = { memoryLocation: 'temporary', path: 'profile' };
    const options = {
      projectToVector: value => ['projected', value],
      resolvePathError: (currentRequest, error) => ({
        memoryLocation: currentRequest.memoryLocation,
        path: currentRequest.path,
        found: false,
        vector: [],
        error: `custom:${error}`,
      }),
    };

    expect(
      buildMemoryVectorResponseFromRootResult(
        request,
        { error: 'root lookup failed' },
        options
      )
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile',
      found: false,
      vector: [],
      error: 'custom:root lookup failed',
    });

    expect(
      buildResolvedMemoryVectorResponseFromPath(
        request,
        { error: "Error: Path segment 'missing' not found at 'profile'." },
        options
      )
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile',
      found: false,
      vector: [],
      error: "custom:Error: Path segment 'missing' not found at 'profile'.",
    });

    expect(
      buildResolvedMemoryVectorResponseFromValue(
        request,
        { bucket: 'sky' },
        options
      )
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile',
      found: true,
      vector: ['projected', { bucket: 'sky' }],
    });
  });

  test('uses default helper fallbacks when no overrides are provided', () => {
    const request = { memoryLocation: 'temporary', path: 'profile' };
    const env = new Map([
      [
        'getData',
        () => ({
          temporary: {
            profile: {
              bucket: 'sky',
            },
          },
        }),
      ],
    ]);

    expect(buildMemoryVectorResponse(request, env)).toEqual({
      memoryLocation: 'temporary',
      path: 'profile',
      found: true,
      vector: [{ bucket: 'sky' }],
    });

    expect(
      buildMemoryVectorResponseFromRootResult(request, { error: 'boom' })
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile',
      found: false,
      vector: [],
      error: 'boom',
    });

    expect(
      buildResolvedMemoryVectorResponse(request, {
        profile: {
          bucket: 'sky',
        },
      })
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile',
      found: true,
      vector: [{ bucket: 'sky' }],
    });

    expect(
      buildResolvedMemoryVectorResponseFromPath(request, {
        error: 'missing profile',
      })
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile',
      found: false,
      vector: [],
      error: 'missing profile',
    });

    expect(
      memoryVectorTestOnly.buildResolvedMemoryVectorError(request, 'missing')
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile',
      found: false,
      vector: [],
      error: 'missing',
    });
  });

  test('projects scalars and arrays as vectors', () => {
    expect(memoryVectorTestOnly.projectToVector('tea')).toEqual(['tea']);
    expect(memoryVectorTestOnly.projectToVector([1, 2])).toEqual([1, 2]);
  });

  test('resolves temporary, permanent, and envelope roots and reports invalid roots', () => {
    expect(
      memoryVectorTestOnly.readTemporaryMemoryRoot(
        new Map([['getData', () => ({})]])
      )
    ).toEqual({ root: {} });

    expect(
      memoryVectorTestOnly.readTemporaryMemoryRoot(
        new Map([['getData', () => ({ temporary: { note: 'hello' } })]])
      )
    ).toEqual({ root: { note: 'hello' } });

    expect(
      memoryVectorTestOnly.readTemporaryMemoryRoot(
        new Map([['getData', () => null]])
      )
    ).toEqual({
      error: "Error: 'getData' did not return a valid object or array.",
    });

    expect(
      memoryVectorTestOnly.readPermanentMemoryRoot(
        new Map([['getLocalPermanentData', () => ({ saved: true })]])
      )
    ).toEqual({ root: { saved: true } });

    expect(
      memoryVectorTestOnly.readPermanentMemoryRoot(
        new Map([['getLocalPermanentData', () => 42]])
      )
    ).toEqual({
      error:
        "Error: 'getLocalPermanentData' did not return a valid object or array.",
    });

    expect(
      memoryVectorTestOnly.readEnvelopeMemoryRoot(
        new Map([['getData', () => ({ temporary: {} })]])
      )
    ).toEqual({ root: { temporary: {} } });

    expect(
      memoryVectorTestOnly.readEnvelopeMemoryRoot(
        new Map([['getData', () => 'nope']])
      )
    ).toEqual({
      error: "Error: 'getData' did not return a valid object or array.",
    });

    expect(memoryVectorTestOnly.readMemoryRoot('unknown', new Map())).toEqual({
      error:
        'Unsupported memoryLocation "unknown". Supported locations: temporary, permanent, envelope.',
    });
  });

  test('resolves paths and surfaces lookup failures', () => {
    expect(
      memoryVectorTestOnly.readMemoryPath(
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
      memoryVectorTestOnly.readMemoryPath(
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
      memoryVectorTestOnly.readMemoryPath(
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
      memoryVectorTestOnly.readMemoryPath(
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
