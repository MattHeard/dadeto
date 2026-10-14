import { jest } from '@jest/globals';
import { initializeRenderVariantFirebase } from '../../../src/cloud/render-variant/firebase-startup-effect-adapter.js';
import { registerVariantWriteTrigger } from '../../../src/cloud/render-variant/trigger-effect-adapter.js';
import {
  createTreeVisibilityRegistrationAdapters,
  sendTreeVisibilityResponse,
} from '../../../src/cloud/render-variant/tree-visibility-effect-adapters.js';

const startupPermission = Object.freeze({ startup: true });
await jest.unstable_mockModule(
  '../../../src/core/cloud/render-variant/run.js',
  () => ({
    runRenderVariant: jest.fn(() => ({
      renderVariant: 'trigger',
      render: jest.fn(),
    })),
  })
);
await jest.unstable_mockModule('../../../src/cloud/allow-effects.js', () => ({
  createEffectStartupBoundary: handler => handler(startupPermission),
}));
const { createRenderVariantStartup } = await import(
  '../../../src/cloud/render-variant/startup-effect-adapter.js'
);

test('initializes Firebase through the startup permission adapter', () => {
  const permission = Object.freeze({ startup: true });
  const ensureFirebaseApp = jest.fn();

  initializeRenderVariantFirebase(permission, ensureFirebaseApp);

  expect(ensureFirebaseApp).toHaveBeenCalledTimes(1);
});

test('registers the write trigger through the startup permission adapter', () => {
  const permission = Object.freeze({ startup: true });
  const onWrite = jest.fn(() => 'trigger');
  const functions = {
    region: jest.fn(() => ({
      firestore: {
        document: jest.fn(() => ({ onWrite })),
      },
    })),
  };
  const handler = jest.fn();

  const trigger = registerVariantWriteTrigger(permission, {
    functions,
    region: 'europe-west1',
    documentPath: 'stories/{storyId}/pages/{pageId}/variants/{variantId}',
    handler,
  });

  expect(trigger).toBe('trigger');
  expect(functions.region).toHaveBeenCalledWith('europe-west1');
  expect(onWrite).toHaveBeenCalledWith(expect.any(Function));
  onWrite.mock.calls[0][0]('change');
  expect(handler).toHaveBeenCalledWith('change');
});

test('binds Functions SDK registration adapters to token-first callbacks', () => {
  const permission = Object.freeze({ startup: true });
  const scheduleHandler = jest.fn(async () => null);
  const httpHandler = jest.fn();
  const onRun = jest.fn(() => 'scheduled');
  const onRequest = jest.fn(() => 'http');
  const schedule = jest.fn(() => ({ onRun }));
  const functions = {
    region: jest.fn(() => ({
      pubsub: { schedule },
      https: { onRequest },
    })),
  };
  const { registerScheduled, registerHttp } =
    createTreeVisibilityRegistrationAdapters(functions);

  expect(registerScheduled(permission, scheduleHandler)).toBe('scheduled');
  expect(registerHttp(permission, httpHandler)).toBe('http');
  expect(functions.region).toHaveBeenNthCalledWith(1, 'europe-west1');
  expect(functions.region).toHaveBeenNthCalledWith(2, 'europe-west1');
  expect(schedule).toHaveBeenCalledWith('every 24 hours');
  expect(onRun).toHaveBeenCalledWith(scheduleHandler);
  expect(onRequest).toHaveBeenCalledWith(httpHandler);
});

test('composes token-first adapters with the Functions SDK at startup', () => {
  const schedule = jest.fn(() => ({
    onRun: handler => ({ scheduledHandler: handler }),
  }));
  const onRequest = jest.fn(handler => ({ httpHandler: handler }));
  const functions = {
    region: jest.fn(() => ({
      pubsub: { schedule },
      https: { onRequest },
    })),
  };
  const runtime = createRenderVariantStartup({
    ensureFirebaseApp: jest.fn(),
    getFirestoreInstance: jest.fn(() => ({})),
    bindEffectBoundary: jest.fn(),
    sendTreeVisibilityResponse: jest.fn(),
    logError: jest.fn(),
    functions,
  });

  expect(functions.region).toHaveBeenCalledTimes(2);
  expect(schedule).toHaveBeenCalledWith('every 24 hours');
  expect(onRequest).toHaveBeenCalledWith(expect.any(Function));
  expect(runtime.regenerationHandles.scheduled.scheduledHandler).toEqual(
    expect.any(Function)
  );
  expect(runtime.regenerationHandles.http.httpHandler).toEqual(
    expect.any(Function)
  );
});

test('writes tree-visibility HTTP responses through the permission adapter', () => {
  const permission = Object.freeze({ invocation: true });
  const json = jest.fn();
  const response = { status: jest.fn(() => ({ json })) };

  sendTreeVisibilityResponse(permission, response, { processed: 1, failed: 0 });

  expect(response.status).toHaveBeenCalledWith(200);
  expect(json).toHaveBeenCalledWith({ processed: 1, failed: 0 });
});
