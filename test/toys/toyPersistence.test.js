import { describe, expect, it, jest } from '@jest/globals';
import {
  createRectShape,
  getStorageAccessor,
  parseObjectRecord,
  persistState,
  readPersistedState,
  runToy,
} from '../../src/core/browser/toys/toyPersistence.js';

describe('toyPersistence', () => {
  it('parses and preserves object records', () => {
    expect(parseObjectRecord({ foo: 'bar' })).toEqual({ foo: 'bar' });
    expect(parseObjectRecord([1, 2, 3])).toBeNull();
    expect(parseObjectRecord('{"foo":"bar"}')).toEqual({ foo: 'bar' });
  });

  it('resolves storage accessors and persists state conditionally', () => {
    const setter = jest.fn();
    const env = {
      get: name => (name === 'setLocalPermanentData' ? setter : null),
    };
    expect(getStorageAccessor(env)).toBe(setter);
    expect(getStorageAccessor(null)).toBeNull();

    persistState(null, 'KEY', { value: 1 });
    expect(setter).not.toHaveBeenCalled();

    persistState(setter, 'KEY', { value: 1 });
    expect(setter).toHaveBeenCalledWith({ KEY: { value: 1 } });
  });

  it('runs a toy with persisted state support', () => {
    const storageValue = { current: { KEY: { value: 2 } } };
    const setLocalPermanentData = jest.fn(next => {
      storageValue.current = { ...(storageValue.current || {}), ...next };
      return storageValue.current;
    });
    const env = new Map([['setLocalPermanentData', setLocalPermanentData]]);
    const output = runToy(JSON.stringify({ value: 3 }), env, {
      storageKey: 'KEY',
      normalizeState: value => {
        if (!value || typeof value !== 'object') {
          return null;
        }
        return value;
      },
      buildNextState: (persisted, input) => ({
        persisted,
        input,
      }),
      toCanvasPayload: state => JSON.stringify(state),
    });

    expect(JSON.parse(output)).toEqual({
      persisted: { value: 2 },
      input: { value: 3 },
    });
    expect(
      readPersistedState(
        () => ({ KEY: { value: 2 } }),
        'KEY',
        value => {
          if (!value || typeof value !== 'object') {
            return null;
          }
          return value;
        }
      )
    ).toEqual({ value: 2 });
  });

  it('creates rectangle shapes', () => {
    expect(
      createRectShape({ x: 1, y: 2, width: 3, height: 4, fill: '#fff' })
    ).toEqual({
      type: 'rect',
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      fill: '#fff',
    });
  });
});
