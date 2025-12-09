import { deepMerge } from '../../src/core/browser/browser-core.js';
import { isNonNullObject } from '../../src/core/common-core.js';

describe('state helpers', () => {
  describe('isNonNullObject', () => {
    it('returns true for objects and arrays', () => {
      expect(isNonNullObject({})).toBe(true);
      expect(isNonNullObject([])).toBe(true);
    });

    it('returns false for nullish or primitive values', () => {
      expect(isNonNullObject(null)).toBe(false);
      expect(isNonNullObject(undefined)).toBe(false);
      expect(isNonNullObject(0)).toBe(false);
      expect(isNonNullObject('text')).toBe(false);
    });
  });

  describe('deepMerge', () => {
    it('merges nested objects recursively without mutating inputs', () => {
      const target = {
        config: {
          logging: { level: 'info', enabled: true },
          flags: { debug: false },
        },
      };
      const source = {
        config: {
          logging: { level: 'debug' },
          flags: { verbose: true },
        },
      };

      const result = deepMerge(target, source);

      expect(result).toEqual({
        config: {
          logging: { level: 'debug', enabled: true },
          flags: { debug: false, verbose: true },
        },
      });
      expect(result).not.toBe(target);
      expect(target.config.logging.level).toBe('info');
      expect(target.config.flags).toEqual({ debug: false });
    });

    it('replaces arrays and primitive values from the source', () => {
      const target = {
        data: {
          count: 1,
          items: ['a'],
        },
        version: 1,
      };
      const source = {
        data: {
          count: 2,
          items: ['b'],
        },
        version: 2,
        added: true,
      };

      const result = deepMerge(target, source);

      expect(result.data.items).toEqual(['b']);
      expect(result.data.count).toBe(2);
      expect(result.added).toBe(true);
      expect(result.version).toBe(2);
    });
  });
});
