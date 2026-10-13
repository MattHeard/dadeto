import { jest } from '@jest/globals';
import { initializeRenderVariantFirebase } from '../../../src/cloud/render-variant/firebase-startup-effect-adapter.js';
import { registerVariantWriteTrigger } from '../../../src/cloud/render-variant/trigger-effect-adapter.js';
import { sendTreeVisibilityResponse } from '../../../src/cloud/render-variant/tree-visibility-effect-adapters.js';

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

test('writes tree-visibility HTTP responses through the permission adapter', () => {
  const permission = Object.freeze({ invocation: true });
  const json = jest.fn();
  const response = { status: jest.fn(() => ({ json })) };

  sendTreeVisibilityResponse(permission, response, { processed: 1, failed: 0 });

  expect(response.status).toHaveBeenCalledWith(200);
  expect(json).toHaveBeenCalledWith({ processed: 1, failed: 0 });
});
