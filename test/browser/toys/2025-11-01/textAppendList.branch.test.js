import { jest } from '@jest/globals';
import * as commonCore from '../../../../src/core/commonCore.js';
import { textAppendList } from '../../../../src/core/browser/toys/2025-11-01/textAppendList.js';

describe('textAppendList normalization fallback', () => {
  afterEach(() => jest.restoreAllMocks());

  test('treats undefined input as empty string', () => {
    const env = {
      get() {
        return undefined;
      },
    };

    expect(textAppendList(undefined, env)).toBe('\n');
  });

  test('appends normalized string when storage missing', () => {
    const env = {
      get() {
        return undefined;
      },
    };

    expect(textAppendList('fish', env)).toBe('fish\n');
  });
});

describe('textAppendList storage integration', () => {
  /**
   *
   * @param storageFn
   */
  function createStorageEnv(storageFn) {
    return {
      get(key) {
        if (key === 'setLocalPermanentData') {
          return storageFn;
        }
        return undefined;
      },
    };
  }

  test('appends existing entries even when persistence fails', () => {
    let callCount = 0;
    const storageFn = jest.fn(() => {
      callCount += 1;
      if (callCount === 1) {
        return { TEXT1: 'existing\n' };
      }
      throw new Error('persist failed');
    });

    const env = createStorageEnv(storageFn);
    const result = textAppendList('new', env);

    expect(result).toBe('existing\nnew\n');
    expect(storageFn).toHaveBeenCalled();
  });

  test('treats storage reads that throw as empty previous data', () => {
    const storageFn = jest.fn(() => {
      throw new Error('read failed');
    });

    const env = createStorageEnv(storageFn);
    const result = textAppendList('fresh', env);

    expect(result).toBe('fresh\n');
    expect(storageFn).toHaveBeenCalled();
  });
});
