import { expect, it, jest } from '@jest/globals';
import {
  registerPostRoute,
  useMiddleware,
} from '../../../src/cloud/errors/effect-adapters.js';
import { logDebug, logError } from '../../../src/cloud/errors/log-adapters.js';
import {
  respondEmpty,
  respondJson,
  respondText,
} from '../../../src/cloud/errors/response-adapters.js';

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

it('sends JSON, text, and empty responses', () => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
    end: jest.fn(),
  };

  respondJson(allowEffects, response, 400, { error: 'bad request' });
  respondText(allowEffects, response, 405, 'POST only');
  respondEmpty(allowEffects, response, 204);

  expect(response.status).toHaveBeenNthCalledWith(1, 400);
  expect(response.status).toHaveBeenNthCalledWith(2, 405);
  expect(response.status).toHaveBeenNthCalledWith(3, 204);
  expect(response.json).toHaveBeenCalledWith({ error: 'bad request' });
  expect(response.send).toHaveBeenCalledWith('POST only');
  expect(response.end).toHaveBeenCalledTimes(1);
});

it('routes debug and error messages through the supplied logger', () => {
  const logger = { debug: jest.fn(), error: jest.fn() };
  const error = new Error('forwarding failed');

  logDebug(allowEffects, logger, 'startup', { env: 'prod' });
  logError(allowEffects, logger, 'report failed', error);

  expect(logger.debug).toHaveBeenCalledWith('startup', { env: 'prod' });
  expect(logger.error).toHaveBeenCalledWith('report failed', error);
});
