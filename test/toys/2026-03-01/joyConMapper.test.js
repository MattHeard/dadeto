import { describe, expect, test, jest } from '@jest/globals';
import { joyConMapperToy } from '../../../src/core/browser/toys/2026-03-01/joyConMapper.js';

/**
 * Build a mapper toy environment for the storage-based tests.
 * @param {{ stored?: unknown, setLocalPermanentData?: jest.Mock }} [root0] Environment overrides.
 * @param {unknown} [root0.stored] Stored permanent data fixture.
 * @param {jest.Mock} [root0.setLocalPermanentData] Permanent data writer stub.
 * @returns {Map<string, unknown>} Toy environment map.
 */
function createEnv({ stored, setLocalPermanentData } = {}) {
  let getLocalPermanentData;
  if (stored) getLocalPermanentData = jest.fn(() => stored);
  return new Map([
    ['getLocalPermanentData', getLocalPermanentData],
    ['setLocalPermanentData', setLocalPermanentData],
  ]);
}

describe('joyConMapperToy', () => {
test('returns default state for invalid input and missing storage helpers', () => {
    const output = JSON.parse(joyConMapperToy('', new Map()));

    expect(output).toEqual({
      storageKey: 'JOYMAP1',
      mappings: {},
      skippedControls: [],
    });
  });

  test('rejects non-string input and malformed capture payloads', () => {
    expect(JSON.parse(joyConMapperToy(null, new Map()))).toEqual({
      storageKey: 'JOYMAP1',
      mappings: {},
      skippedControls: [],
    });
    expect(JSON.parse(joyConMapperToy(JSON.stringify({ action: 'capture' }), new Map()))).toEqual({
      storageKey: 'JOYMAP1',
      mappings: {},
      skippedControls: [],
    });
    expect(JSON.parse(joyConMapperToy(JSON.stringify({ action: 'capture', capture: { key: 'Z' } }), new Map()))).toEqual({
      storageKey: 'JOYMAP1', mappings: {}, skippedControls: [],
    });
    expect(JSON.parse(joyConMapperToy(JSON.stringify({ action: 'capture', currentControlKey: 'BTN_A' }), new Map()))).toEqual({
      storageKey: 'JOYMAP1', mappings: {}, skippedControls: [],
    });
  });

  test('captures mappings and removes skipped controls for captured key', () => {
    const setLocalPermanentData = jest.fn();
    const env = createEnv({
      stored: {
        JOYMAP1: {
          mappings: { existing: { key: 'old' } },
          skippedControls: ['BTN_A', 'BTN_B'],
        },
      },
      setLocalPermanentData,
    });

    const output = JSON.parse(
      joyConMapperToy(
        JSON.stringify({
          action: 'capture',
          currentControlKey: 'BTN_A',
          capture: { key: 'KeyZ' },
        }),
        env
      )
    );

    expect(output.mappings.BTN_A).toEqual({ key: 'KeyZ' });
    expect(output.mappings.existing).toEqual({ key: 'old' });
    expect(output.skippedControls).toEqual(['BTN_B']);
    expect(setLocalPermanentData).toHaveBeenCalledWith({
      JOYMAP1: {
        mappings: output.mappings,
        skippedControls: ['BTN_B'],
      },
    });
  });

  test('skip action appends unique skipped control keys', () => {
    const env = createEnv({
      stored: {
        JOYMAP1: {
          mappings: {},
          skippedControls: ['BTN_X'],
        },
      },
      setLocalPermanentData: jest.fn(),
    });

    const first = JSON.parse(
      joyConMapperToy(
        JSON.stringify({ action: 'skip', skippedControlKey: 'BTN_Y' }),
        env
      )
    );
    const second = JSON.parse(
      joyConMapperToy(
        JSON.stringify({ action: 'skip', skippedControlKey: 'BTN_X' }),
        env
      )
    );

    expect(first.skippedControls).toEqual(['BTN_X', 'BTN_Y']);
    expect(second.skippedControls).toEqual(['BTN_X']);
  });

  test('reset action clears mappings and skipped controls', () => {
    const env = createEnv({
      stored: {
        JOYMAP1: {
          mappings: { BTN_A: { key: 'A' } },
          skippedControls: ['BTN_A'],
        },
      },
      setLocalPermanentData: jest.fn(),
    });

    const output = JSON.parse(
      joyConMapperToy(JSON.stringify({ action: 'reset' }), env)
    );

    expect(output).toEqual({
      storageKey: 'JOYMAP1',
      mappings: {},
      skippedControls: [],
    });
  });

  test('action names take precedence over capture fields', () => {
    const output = JSON.parse(
      joyConMapperToy(
        JSON.stringify({ action: 'reset', currentControlKey: 'BTN_A', capture: { key: 'A' } }),
        createEnv({ stored: { JOYMAP1: { mappings: { old: true }, skippedControls: ['old'] } } })
      )
    );
    expect(output).toEqual({ storageKey: 'JOYMAP1', mappings: {}, skippedControls: [] });
  });

  test('unknown actions and malformed stored state fall back safely', () => {
    const env = createEnv({
      stored: {
        JOYMAP1: {
          mappings: 99,
          skippedControls: 'not-array',
        },
      },
      setLocalPermanentData: jest.fn(),
    });

    const output = JSON.parse(
      joyConMapperToy(JSON.stringify({ action: 'noop', skippedControlKey: 'SHOULD_NOT_APPEAR', something: true }), env)
    );

    expect(output).toEqual({
      storageKey: 'JOYMAP1',
      mappings: {},
      skippedControls: [],
    });
  });

  test('normalizes array mappings to the empty mapping object', () => {
    const output = JSON.parse(
      joyConMapperToy(
        JSON.stringify({ action: 'noop' }),
        createEnv({ stored: { JOYMAP1: { mappings: [], skippedControls: [] } } })
      )
    );
    expect(output.mappings).toEqual({});
  });

  test('normalizes null permanent data root to empty state', () => {
    const env = new Map([
      ['getLocalPermanentData', () => null],
      ['setLocalPermanentData', jest.fn()],
    ]);

    const output = JSON.parse(
      joyConMapperToy(JSON.stringify({ action: 'noop' }), env)
    );

    expect(output).toEqual({
      storageKey: 'JOYMAP1',
      mappings: {},
      skippedControls: [],
    });
  });

  test('skip action ignores missing skippedControlKey values', () => {
    const env = createEnv({
      stored: {
        JOYMAP1: {
          mappings: {},
          skippedControls: ['BTN_A'],
        },
      },
      setLocalPermanentData: jest.fn(),
    });

    const output = JSON.parse(
      joyConMapperToy(JSON.stringify({ action: 'skip' }), env)
    );

    expect(output.skippedControls).toEqual(['BTN_A']);
  });
});
