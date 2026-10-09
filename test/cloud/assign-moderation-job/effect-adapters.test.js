import { describe, expect, jest, test } from '@jest/globals';
import { useMiddleware } from '../../../src/cloud/assign-moderation-job/effect-adapters.js';

describe('assign-moderation-job effect adapters', () => {
  test('uses the permission-aware seam to register middleware', () => {
    const allowEffects =
      /** @type {import('../../../types/allow-effects').AllowEffects} */ (
        /** @type {unknown} */ (Object.freeze({}))
      );
    const app = { use: jest.fn() };
    const middleware = jest.fn();

    useMiddleware(allowEffects, app, middleware);

    expect(app.use).toHaveBeenCalledTimes(1);
    expect(app.use).toHaveBeenCalledWith(middleware);
  });
});
