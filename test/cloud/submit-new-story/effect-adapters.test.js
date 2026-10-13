import { jest } from '@jest/globals';
import {
  forwardSubmitNewStoryCorsError,
  logSubmitNewStory,
  registerSubmitNewStoryEndpoint,
  saveSubmitNewStory,
  sendSubmitNewStoryResponse,
} from '../../../src/cloud/submit-new-story/effect-adapters.js';
import {
  bindSubmitNewStoryCorsErrorBoundary,
  ensureSubmitNewStoryFirebase,
} from '../../../src/cloud/submit-new-story/startup-effect-adapter.js';
import { createAllowEffects } from '../../../src/cloud/allow-effects.js';

const permission = createAllowEffects();

test('submission persistence receives the invocation permission', async () => {
  const set = jest.fn().mockResolvedValue();
  const db = { collection: jest.fn(() => ({ doc: jest.fn(() => ({ set })) })) };

  await saveSubmitNewStory(permission, db, 'story-1', { title: 'Story' });

  expect(db.collection).toHaveBeenCalledWith('storyFormSubmissions');
  expect(set).toHaveBeenCalledWith({ title: 'Story' });
});

test('response and logging adapters invoke their injected effects', () => {
  const json = jest.fn();
  const response = { status: jest.fn(() => ({ json })) };
  const logger = jest.fn();

  sendSubmitNewStoryResponse(permission, response, 201, { ok: true });
  logSubmitNewStory(permission, logger, 'event');

  expect(response.status).toHaveBeenCalledWith(201);
  expect(json).toHaveBeenCalledWith({ ok: true });
  expect(logger).toHaveBeenCalledWith('event');
});

test('startup adapters initialize Firebase and register the endpoint', () => {
  const ensure = jest.fn();
  const app = { use: jest.fn(), post: jest.fn() };
  const onRequest = jest.fn(() => 'endpoint');
  const options = {
    express: jest.fn(() => app),
    middleware: ['cors'],
    route: { method: 'post', path: '/', handler: jest.fn() },
    functions: { region: jest.fn(() => ({ https: { onRequest } })) },
  };

  ensureSubmitNewStoryFirebase(permission, ensure);
  const result = registerSubmitNewStoryEndpoint(permission, options);

  expect(ensure).toHaveBeenCalledTimes(1);
  expect(app.use).toHaveBeenCalledWith('cors');
  expect(app.post).toHaveBeenCalledWith('/', options.route.handler);
  expect(result.handle).toBe('endpoint');
});

test('CORS forwarding and middleware binding keep invocation capabilities at the boundary', async () => {
  const next = jest.fn();
  const handler = jest.fn((allowEffects, args) =>
    forwardSubmitNewStoryCorsError(allowEffects, args.next, args.error)
  );
  const middleware = bindSubmitNewStoryCorsErrorBoundary(handler);
  const error = new Error('cors');

  await middleware(error, {}, {}, next);

  expect(handler).toHaveBeenCalledWith(expect.objectContaining({}), {
    error,
    req: {},
    res: {},
    next,
  });
  expect(next).toHaveBeenCalledWith(error);
});
