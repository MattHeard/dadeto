import { describe, expect, test } from '@jest/globals';
import {
  memoryScalarVectorWrite,
  memoryScalarVectorWriteTestOnly,
} from '../../../src/core/browser/toys/2026-05-28/memoryScalarVectorWrite.js';
import { memoryVectorPairs } from '../../../src/core/browser/toys/2026-05-28/memoryVectorPairs.js';

/**
 * Create a toy environment backed by a mutable temporary state object.
 * @param {Record<string, unknown>} initialTemporary Initial temporary memory.
 * @returns {{ env: Map<string, Function>, state: Record<string, unknown> }} Env and state.
 */
function createTemporaryEnv(initialTemporary = {}) {
  const state = { temporary: initialTemporary };
  return {
    env: new Map([
      ['getData', () => state],
      ['setLocalTemporaryData', nextState => Object.assign(state, nextState)],
    ]),
    state,
  };
}

/**
 * Create a toy environment backed by mutable permanent memory.
 * @param {Record<string, unknown>} initialPermanent Initial permanent memory.
 * @returns {{ env: Map<string, Function>, getPermanent: () => Record<string, unknown> }} Env and getter.
 */
function createPermanentEnv(initialPermanent = {}) {
  let permanent = initialPermanent;
  return {
    env: new Map([
      ['getLocalPermanentData', () => permanent],
      [
        'setLocalPermanentData',
        nextPermanent => {
          permanent = nextPermanent;
          return permanent;
        },
      ],
    ]),
    getPermanent: () => permanent,
  };
}

/**
 * Serialize a toy request as JSON.
 * @param {Record<string, unknown>} request Request object.
 * @returns {string} JSON request payload.
 */
function writeRequest(request) {
  return JSON.stringify(request);
}

describe('memoryScalarVectorWrite', () => {
  test('inserts a scalar into a missing nested temporary path', () => {
    const { env, state } = createTemporaryEnv();

    expect(
      JSON.parse(
        memoryScalarVectorWrite(
          writeRequest({ path: 'profile.name', value: 'Ada' }),
          env
        )
      )
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile.name',
      written: true,
      value: 'Ada',
    });
    expect(state.temporary).toEqual({ profile: { name: 'Ada' } });
    expect(JSON.parse(memoryVectorPairs('profile', env))).toEqual({
      memoryLocation: 'temporary',
      path: 'profile',
      found: true,
      vector: [{ key: 'name', value: 'Ada' }],
    });
  });

  test('updates an existing scalar without discarding sibling memory', () => {
    const { env, state } = createTemporaryEnv({
      profile: { name: 'Ada', city: 'London' },
    });

    expect(
      JSON.parse(
        memoryScalarVectorWrite(
          writeRequest({ path: 'profile.name', value: 'Grace' }),
          env
        )
      )
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile.name',
      written: true,
      value: 'Grace',
    });
    expect(state.temporary).toEqual({
      profile: { name: 'Grace', city: 'London' },
    });
  });

  test('inserts a vector into permanent memory and memo2 can read it', () => {
    const { env, getPermanent } = createPermanentEnv({ inventory: {} });

    expect(
      JSON.parse(
        memoryScalarVectorWrite(
          writeRequest({
            memoryLocation: 'permanent',
            key: 'inventory.slots',
            value: ['tea', 'book'],
          }),
          env
        )
      )
    ).toEqual({
      memoryLocation: 'permanent',
      path: 'inventory.slots',
      written: true,
      value: ['tea', 'book'],
    });
    expect(getPermanent()).toEqual({ inventory: { slots: ['tea', 'book'] } });
    expect(
      JSON.parse(
        memoryVectorPairs(
          writeRequest({
            memoryLocation: 'permanent',
            path: 'inventory.slots',
          }),
          env
        )
      )
    ).toEqual({
      memoryLocation: 'permanent',
      path: 'inventory.slots',
      found: true,
      vector: ['tea', 'book'],
    });
  });

  test('creates nested arrays when numeric segments imply array containers', () => {
    const { env, state } = createTemporaryEnv();

    memoryScalarVectorWrite(
      writeRequest({ path: 'matrix.0.1', value: 42 }),
      env
    );

    expect(state.temporary).toEqual({ matrix: [[undefined, 42]] });
    expect(JSON.parse(memoryVectorPairs('matrix.0.1', env))).toEqual({
      memoryLocation: 'temporary',
      path: 'matrix.0.1',
      found: true,
      vector: [42],
    });
  });

  test('starts temporary memory when getData is unavailable', () => {
    let savedState;
    const env = new Map([
      [
        'setLocalTemporaryData',
        nextState => {
          savedState = nextState;
        },
      ],
    ]);

    expect(
      JSON.parse(
        memoryScalarVectorWrite(
          writeRequest({ path: 'profile.name', value: 'Ada' }),
          env
        )
      )
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile.name',
      written: true,
      value: 'Ada',
    });
    expect(savedState).toEqual({ temporary: { profile: { name: 'Ada' } } });
  });

  test('replaces invalid temporary roots with object containers', () => {
    const { env, state } = createTemporaryEnv('not-an-object');

    memoryScalarVectorWrite(
      writeRequest({ path: 'profile.name', value: 'Ada' }),
      env
    );

    expect(state.temporary).toEqual({ profile: { name: 'Ada' } });
  });

  test('formats non-error thrown values from persistence helpers', () => {
    const env = new Map([
      ['getData', () => ({ temporary: {} })],
      [
        'setLocalTemporaryData',
        () => {
          throw 'string failure';
        },
      ],
    ]);

    expect(
      JSON.parse(
        memoryScalarVectorWrite(
          writeRequest({ path: 'profile.name', value: 'Ada' }),
          env
        )
      )
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'profile.name',
      written: false,
      error: 'string failure',
    });
  });

  test('writes into the full envelope when requested', () => {
    const { env, state } = createTemporaryEnv({ existing: true });

    memoryScalarVectorWrite(
      writeRequest({
        memoryLocation: 'envelope',
        path: 'scratch.answer',
        value: true,
      }),
      env
    );

    expect(state).toEqual({
      temporary: { existing: true },
      scratch: { answer: true },
    });
    expect(
      JSON.parse(
        memoryVectorPairs(
          writeRequest({ memoryLocation: 'envelope', path: 'scratch' }),
          env
        )
      )
    ).toEqual({
      memoryLocation: 'envelope',
      path: 'scratch',
      found: true,
      vector: [{ key: 'answer', value: true }],
    });
  });

  test('rejects malformed requests', () => {
    const env = new Map();

    expect(JSON.parse(memoryScalarVectorWrite('{', env))).toEqual({
      memoryLocation: 'temporary',
      path: '',
      written: false,
      error: 'Input must be a JSON object write request.',
    });
    expect(JSON.parse(memoryScalarVectorWrite('[]', env))).toEqual({
      memoryLocation: 'temporary',
      path: '',
      written: false,
      error: 'Input must be a JSON object write request.',
    });
    expect(
      JSON.parse(memoryScalarVectorWrite(writeRequest({ value: 'Ada' }), env))
    ).toEqual({
      memoryLocation: 'temporary',
      path: '',
      written: false,
      error: 'A non-empty path or key is required.',
    });
    expect(
      JSON.parse(memoryScalarVectorWrite(writeRequest({ path: 'a' }), env))
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'a',
      written: false,
      error: 'A value property is required.',
    });
    expect(
      JSON.parse(
        memoryScalarVectorWrite(
          writeRequest({ path: 'a', value: { nested: true } }),
          env
        )
      )
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'a',
      written: false,
      error: 'Value must be a scalar or vector array.',
    });
  });

  test('returns structured errors for unsupported locations and missing helpers', () => {
    expect(
      JSON.parse(
        memoryScalarVectorWrite(
          writeRequest({ memoryLocation: 'moon', path: 'a', value: 1 }),
          new Map()
        )
      )
    ).toEqual({
      memoryLocation: 'moon',
      path: 'a',
      written: false,
      error:
        'Unsupported memoryLocation "moon". Supported locations: temporary, permanent, envelope.',
    });
    expect(
      JSON.parse(
        memoryScalarVectorWrite(
          writeRequest({ memoryLocation: 'permanent', path: 'a', value: 1 }),
          new Map()
        )
      )
    ).toEqual({
      memoryLocation: 'permanent',
      path: 'a',
      written: false,
      error: 'Missing toy helper "setLocalPermanentData"',
    });
  });

  test('reports array segment type mismatches', () => {
    const { env } = createTemporaryEnv({ matrix: [] });

    expect(
      JSON.parse(
        memoryScalarVectorWrite(
          writeRequest({ path: 'matrix.left', value: 1 }),
          env
        )
      )
    ).toEqual({
      memoryLocation: 'temporary',
      path: 'matrix.left',
      written: false,
      error: 'Cannot write non-numeric segment "left" into an array.',
    });
  });
});

describe('memoryScalarVectorWrite helpers', () => {
  test('parses JSON object requests', () => {
    expect(
      memoryScalarVectorWriteTestOnly.parseMemoryWriteRequest(
        writeRequest({ memoryLocation: ' permanent ', key: ' a.b ', value: 1 })
      )
    ).toEqual({ memoryLocation: 'permanent', path: 'a.b', value: 1 });
  });

  test('recognizes scalar and vector values', () => {
    expect(memoryScalarVectorWriteTestOnly.isScalarOrVector(null)).toBe(true);
    expect(memoryScalarVectorWriteTestOnly.isScalarOrVector('Ada')).toBe(true);
    expect(memoryScalarVectorWriteTestOnly.isScalarOrVector([1, 2])).toBe(true);
    expect(memoryScalarVectorWriteTestOnly.isScalarOrVector({ a: 1 })).toBe(
      false
    );
  });

  test('writes through primitive intermediate values by replacing containers', () => {
    expect(
      memoryScalarVectorWriteTestOnly.writePathValue(
        { profile: 'Ada' },
        { path: 'profile.name', value: 'Grace' }
      )
    ).toEqual({ profile: { name: 'Grace' } });
  });

  test('guards envelope persistence shape', () => {
    expect(() =>
      memoryScalarVectorWriteTestOnly.ensureEnvelopeCanBePersisted([])
    ).toThrow(
      'Envelope writes must preserve an object with a temporary property.'
    );
  });

  test('creates a writable root when an existing root is primitive', () => {
    expect(
      memoryScalarVectorWriteTestOnly.writePathValue('Ada', {
        path: '0.name',
        value: 'Grace',
      })
    ).toEqual([{ name: 'Grace' }]);
  });

  test('creates array or object containers from upcoming path segments', () => {
    expect(
      memoryScalarVectorWriteTestOnly.createContainerForSegment('0')
    ).toEqual([]);
    expect(
      memoryScalarVectorWriteTestOnly.createContainerForSegment('name')
    ).toEqual({});
  });
});
