import { jest } from '@jest/globals';
import { applyBaseCleanupHandlers } from '../../../src/core/browser/browser-core.js';

test('applyBaseCleanupHandlers defaults optional extra handlers', () => {
  const dom = {
    hide: jest.fn(),
    disable: jest.fn(),
    querySelector: jest.fn(() => null),
    removeChild: jest.fn(),
  };

  expect(() => applyBaseCleanupHandlers({ container: {}, dom })).not.toThrow();
  expect(dom.querySelector).toHaveBeenCalled();
});
