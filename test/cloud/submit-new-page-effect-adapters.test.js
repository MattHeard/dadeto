import { jest } from '@jest/globals';
import { createAllowEffects } from '../../src/cloud/allow-effects.js';
import {
  ensureSubmitNewPageFirebase,
  registerSubmitNewPageEndpoint,
  registerSubmitNewPagePost,
  useSubmitNewPageMiddleware,
} from '../../src/cloud/submit-new-page/effect-adapters.js';
import { sendSubmitNewPageResponse } from '../../src/cloud/submit-new-page/request-effect-adapter.js';

const permission = createAllowEffects();

test('initializes Firebase through the startup permission adapter', () => {
  const ensureFirebaseApp = jest.fn();

  ensureSubmitNewPageFirebase(permission, ensureFirebaseApp);

  expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);
});

test('registers middleware through the permission adapter', () => {
  const app = { use: jest.fn() };

  useSubmitNewPageMiddleware(permission, app, 'middleware');

  expect(app.use).toHaveBeenCalledWith('middleware');
});

test('registers POST routes through the permission adapter', () => {
  const app = { post: jest.fn() };
  const handler = jest.fn();

  registerSubmitNewPagePost(permission, app, '/', handler);

  expect(app.post).toHaveBeenCalledWith('/', handler);
});

test('writes HTTP responses through the permission adapter', () => {
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };

  sendSubmitNewPageResponse(permission, response, 202, { accepted: true });

  expect(response.status).toHaveBeenCalledWith(202);
  expect(response.json).toHaveBeenCalledWith({ accepted: true });
});

test('registers the HTTPS endpoint through the startup permission adapter', () => {
  const registered = { endpoint: true };
  const endpoint = jest.fn(() => registered);
  const functions = {
    region: jest.fn(() => ({ https: { onRequest: endpoint } })),
  };
  const app = {};

  expect(registerSubmitNewPageEndpoint(permission, functions, app)).toBe(
    registered
  );
  expect(functions.region).toHaveBeenCalledWith('europe-west1');
  expect(endpoint).toHaveBeenCalledWith(app);
});
