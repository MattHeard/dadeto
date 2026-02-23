import { fishingGame } from '../../../../src/core/browser/toys/2025-03-29/fishingGame.js';

describe('fishingGame fallback branches', () => {
  const createEnv = deps => ({
    get(key) {
      return deps[key];
    },
  });

  test('uses winter night mood when the time context is invalid', () => {
    const env = createEnv({
      getCurrentTime: () => NaN,
      getRandomNumber: () => 0.5,
    });

    const result = fishingGame('worm', env);
    expect(result).toContain('crisp, icy waters');
  });

  test('falls back to the default outcome when no check matches', () => {
    const originalFind = Array.prototype.find;
    const env = createEnv({
      getCurrentTime: () => Date.now(),
      getRandomNumber: () => 0.5,
    });

    Array.prototype.find = function (...args) {
      if (
        Array.isArray(this) &&
        this.length > 0 &&
        typeof this[0]?.check === 'function'
      ) {
        return undefined;
      }
      return originalFind.apply(this, args);
    };

    try {
      const result = fishingGame('worm', env);
      expect(result).toContain('legendary golden fish');
    } finally {
      Array.prototype.find = originalFind;
    }
  });
});
