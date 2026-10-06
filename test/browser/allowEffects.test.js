import { jest } from '@jest/globals';
import { createEffectFetchFn } from '../../src/browser/allow-effects.js';

test('createEffectFetchFn forwards URL and request options to native fetch', async () => {
  const response = { ok: true, status: 200 };
  const fetchFn = jest.fn(async () => response);
  const effectFetchFn = createEffectFetchFn(fetchFn);
  const permission = Object.freeze({});
  const init = { method: 'POST' };

  await expect(effectFetchFn(permission, '/stats', init)).resolves.toBe(
    response
  );
  expect(fetchFn).toHaveBeenCalledWith('/stats', init);
});
