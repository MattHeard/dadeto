import { jest } from '@jest/globals';

describe('cloud submit-new-page entrypoint', () => {
  it('passes the core submit factory into the runtime adapter', async () => {
    const createHandleSubmit = jest.fn();
    const createSubmitNewPageApp = jest.fn(() => ({ app: true }));
    const createSubmitNewPageRequestHandler = jest.fn(() => 'handler');
    const createSubmitNewPageRuntime = jest.fn(() => 'core-handler');
    const functions = {
      region: jest.fn(() => ({
        https: { onRequest: jest.fn(() => 'handle') },
      })),
    };
    const express = jest.fn();
    const cors = jest.fn();
    const createFirebaseAppManager = jest.fn();
    const getFirestoreInstance = jest.fn();
    const getAuth = jest.fn();
    const crypto = {};
    const FieldValue = {};
    const helpers = {
      parseIncomingOption: jest.fn(),
      findExistingOption: jest.fn(),
      findExistingPage: jest.fn(),
    };

    await jest.unstable_mockModule(
      '../../src/cloud/submit-new-page/submit-new-page-gcf.js',
      () => ({
        functions,
        FieldValue,
        getAuth,
        express,
        cors,
        crypto,
        createFirebaseAppManager,
        getFirestoreInstance,
        getEnvironmentVariables: jest.fn(() => ({})),
      })
    );
    await jest.unstable_mockModule(
      '../../src/cloud/submit-new-page/submit-new-page-core.js',
      () => ({
        createHandleSubmit,
        createSubmitNewPageApp,
        createSubmitNewPageRequestHandler,
      })
    );
    await jest.unstable_mockModule(
      '../../src/cloud/submit-new-page/runtime.js',
      () => ({ createSubmitNewPageRuntime })
    );
    await jest.unstable_mockModule(
      '../../src/cloud/submit-new-page/cors-config.js',
      () => ({ getAllowedOrigins: jest.fn(() => []) })
    );
    await jest.unstable_mockModule(
      '../../src/cloud/submit-new-page/helpers.js',
      () => helpers
    );
    await jest.unstable_mockModule('firebase-admin/app', () => ({
      initializeApp: jest.fn(),
    }));

    const module = await import('../../src/cloud/submit-new-page/index.js');

    expect(createSubmitNewPageRuntime).toHaveBeenCalledWith(
      expect.objectContaining({
        createHandleSubmit,
        createFirebaseAppManager,
        getFirestoreInstance,
        getAuth,
        FieldValue,
        ...helpers,
      })
    );
    expect(module.handle).toBe('handle');
  });
});
