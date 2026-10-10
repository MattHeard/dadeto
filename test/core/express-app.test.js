import { jest } from '@jest/globals';
import { createJsonExpressApp } from '../../src/core/express-app.js';

test('creates an app with the standard form and JSON parsers', () => {
  const app = { use: jest.fn() };
  const createApp = jest.fn(() => app);
  const json = jest.fn(() => 'json-parser');
  const urlencoded = jest.fn(options => ({ options, name: 'form-parser' }));
  const permission = Object.freeze({});
  const bindStartupEffectBoundary = jest.fn(handler => handler(permission));
  const useMiddleware = jest.fn((allowEffects, appInstance, middleware) =>
    appInstance.use(middleware)
  );

  expect(
    createJsonExpressApp({
      createApp,
      json,
      urlencoded,
      bindStartupEffectBoundary,
      useMiddleware,
    })
  ).toBe(app);
  expect(createApp).toHaveBeenCalledTimes(1);
  expect(urlencoded).toHaveBeenCalledWith({ extended: false });
  expect(json).toHaveBeenCalledWith();
  expect(bindStartupEffectBoundary).toHaveBeenCalledTimes(2);
  expect(useMiddleware).toHaveBeenNthCalledWith(
    1,
    permission,
    app,
    expect.objectContaining({ name: 'form-parser' })
  );
  expect(useMiddleware).toHaveBeenNthCalledWith(
    2,
    permission,
    app,
    'json-parser'
  );
  expect(app.use).toHaveBeenNthCalledWith(1, {
    options: { extended: false },
    name: 'form-parser',
  });
  expect(app.use).toHaveBeenNthCalledWith(2, 'json-parser');
});
