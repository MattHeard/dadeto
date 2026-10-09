import { expect, it, jest } from '@jest/globals';
import {
  registerPostRoute,
  useMiddleware,
} from '../../../src/cloud/errors/effect-adapters.js';

const allowEffects =
  /** @type {import('../../../types/allow-effects').AllowEffects} */ ({});

it('registers middleware on the supplied app', () => {
  const middleware = jest.fn();
  const app = { use: jest.fn() };

  useMiddleware(allowEffects, app, middleware);

  expect(app.use).toHaveBeenCalledWith(middleware);
});

it('registers the POST handler at the supplied path', () => {
  const handler = jest.fn();
  const app = { post: jest.fn() };

  registerPostRoute(allowEffects, app, '/errors', handler);

  expect(app.post).toHaveBeenCalledWith('/errors', handler);
});
