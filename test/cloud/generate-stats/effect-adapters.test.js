import { expect, it, jest } from '@jest/globals';
import {
  registerPostRoute,
  useMiddleware,
} from '../../../src/cloud/generate-stats/effect-adapters.js';

const allowEffects =
  /** @type {import('../../../types/allow-effects').AllowEffects} */ ({});

it('registers middleware on the supplied app', () => {
  const app = { use: jest.fn() };
  const middleware = jest.fn();

  useMiddleware(allowEffects, app, middleware);

  expect(app.use).toHaveBeenCalledWith(middleware);
});

it('registers a POST route on the supplied app', () => {
  const app = { post: jest.fn() };
  const handler = jest.fn();

  registerPostRoute(allowEffects, app, '/', handler);

  expect(app.post).toHaveBeenCalledWith('/', handler);
});
