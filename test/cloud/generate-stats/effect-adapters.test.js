import { expect, it, jest } from '@jest/globals';
import {
  logError,
  logWarning,
  registerPostRoute,
  sendHttpResponse,
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

it('sends a response through the supplied response boundary', () => {
  const response = { json: jest.fn(), send: jest.fn() };
  const res = { status: jest.fn(() => response) };

  sendHttpResponse(allowEffects, res, {
    status: 200,
    body: { ok: true },
    method: 'json',
  });

  expect(res.status).toHaveBeenCalledWith(200);
  expect(response.json).toHaveBeenCalledWith({ ok: true });
});

it('routes request error and warning logs through the supplied logger', () => {
  const logger = { error: jest.fn(), warn: jest.fn() };

  logError(allowEffects, logger, 'error message', { code: 'E' });
  logWarning(allowEffects, logger, 'warning message');

  expect(logger.error).toHaveBeenCalledWith('error message', { code: 'E' });
  expect(logger.warn).toHaveBeenCalledWith('warning message');
});
